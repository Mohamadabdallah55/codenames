import crypto from 'crypto';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  ClientRole,
  ELITE_CLASH_TEAMS,
  EliteTeamCode,
  GameMode,
  GameSettings,
  MatchRecord,
  ServerGameState,
  TeamColor,
  TournamentCompetition,
  applyInvalidCluePenalty,
  computeTournamentStandings,
  createGameRound,
  endTurn,
  generateDynamicPin,
  giveClue,
  restartCurrentRound,
  revealCard,
  sanitizeStateForRole,
  undoLastAction,
} from './src/game/rules';
import {
  OFFICIAL_WORD_BANK,
  WORD_PACKS_CATALOG,
  WordCategory,
  WordEntry,
  buildValidatedWordBank,
  parseImportedWordsJson,
} from './src/data/words';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_MASTER_PIN = (process.env.ADMIN_MASTER_PIN || '').trim();
const DATA_DIR = path.resolve(process.cwd(), '.data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const TOURNAMENTS_FILE = path.join(DATA_DIR, 'tournaments.json');

const rooms = new Map<string, ServerGameState>();
const tournaments = new Map<string, TournamentCompetition>();

// Secure Revocable Session Store
interface AuthSession {
  token: string;
  roomId: string;
  role: ClientRole;
  revokedVersion: number;
  issuedAt: number;
  expiresAt: number;
}

const sessions = new Map<string, AuthSession>();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Rate Limiter State
interface RateBucket {
  count: number;
  resetAt: number;
}
const authRateLimits = new Map<string, RateBucket>();
const actionRateLimits = new Map<string, RateBucket>();

function checkRateLimit(
  store: Map<string, RateBucket>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function createSessionToken(room: ServerGameState, role: ClientRole): string {
  const token = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  sessions.set(token, {
    token,
    roomId: room.roomId,
    role,
    revokedVersion: room.sessionRevokedVersion || 1,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  return token;
}

function scrubLegacyRoomSecurity(state: ServerGameState): ServerGameState {
  const forbiddenPins = new Set(['1446', '2026', '0000', '1234']);
  let refereePin = state.refereePin;
  let spymasterPin = state.spymasterPin;
  if (!refereePin || forbiddenPins.has(refereePin)) {
    refereePin = generateDynamicPin();
  }
  if (!spymasterPin || forbiddenPins.has(spymasterPin)) {
    spymasterPin = generateDynamicPin();
  }

  const cleanedLogs = (state.eventLog || []).map((evt) => ({
    ...evt,
    message: evt.message
      .replace(/رمز القائد لهذه الجولة:\s*\d+/g, '')
      .replace(/تم توليد رمز سري جديد للقادة في هذه الجولة:\s*\d+/g, 'تم توليد رمز سري جديد للقادة في هذه الجولة.')
      .replace(/\s+—\s*$/g, ''),
  }));

  return {
    ...state,
    refereePin,
    spymasterPin,
    refereeClaimed: false,
    sessionRevokedVersion: state.sessionRevokedVersion || 1,
    gameMode: state.gameMode || state.settings?.gameMode || 'classic',
    boardSize: state.boardSize || (state.cards?.length === 16 ? 16 : 25),
    gridCols: state.gridCols || (state.cards?.length === 16 ? 4 : 5),
    coopTurnsRemaining: state.coopTurnsRemaining ?? 9,
    coopMaxTurns: state.coopMaxTurns ?? 9,
    clueHistory: state.clueHistory || [],
    activeBroadcast: state.activeBroadcast || null,
    disabledWordIds: state.disabledWordIds || [],
    settings: {
      ...state.settings,
      allowAudienceClickInLocalMode: true,
      requireClueBeforeGuess: false,
    },
    eventLog: cleanedLogs,
  };
}

function loadPersistedData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, ServerGameState>;
      for (const [roomId, state] of Object.entries(parsed)) {
        if (
          state &&
          state.roomId &&
          Array.isArray(state.cards) &&
          (state.cards.length === 25 || state.cards.length === 16)
        ) {
          rooms.set(roomId, scrubLegacyRoomSecurity(state));
        }
      }
    }
    if (fs.existsSync(TOURNAMENTS_FILE)) {
      const rawT = fs.readFileSync(TOURNAMENTS_FILE, 'utf-8');
      const parsedT = JSON.parse(rawT) as Record<string, TournamentCompetition>;
      for (const [tId, comp] of Object.entries(parsedT)) {
        if (comp && comp.id) {
          tournaments.set(tId, comp);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load persisted data:', err);
  }

  if (!rooms.has('ELITE-1')) {
    rooms.set('ELITE-1', createGameRound({ roomId: 'ELITE-1' }));
  }

  if (tournaments.size === 0) {
    const defaultComp: TournamentCompetition = {
      id: 'tour_elite_clash_main',
      name: 'دوري صراع النخبة — مسجد ابن تيمية',
      organizer: 'مسجد ابن تيمية',
      createdAt: new Date().toISOString(),
      gameMode: 'tournament',
      teamNames: Object.values(ELITE_CLASH_TEAMS).map((t) => t.name),
      matches: [],
    };
    tournaments.set(defaultComp.id, defaultComp);
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

async function flushPersistedDataNow(): Promise<void> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serializedRooms: Record<string, ServerGameState> = {};
    for (const [id, state] of rooms.entries()) {
      serializedRooms[id] = state;
    }
    const tmpRooms = `${ROOMS_FILE}.tmp`;
    await fs.promises.writeFile(tmpRooms, JSON.stringify(serializedRooms), 'utf-8');
    await fs.promises.rename(tmpRooms, ROOMS_FILE);

    const serializedTournaments: Record<string, TournamentCompetition> = {};
    for (const [id, comp] of tournaments.entries()) {
      serializedTournaments[id] = comp;
    }
    const tmpTournaments = `${TOURNAMENTS_FILE}.tmp`;
    await fs.promises.writeFile(tmpTournaments, JSON.stringify(serializedTournaments), 'utf-8');
    await fs.promises.rename(tmpTournaments, TOURNAMENTS_FILE);
  } catch (err) {
    console.error('Failed to flush persisted data:', err);
  }
}

function savePersistedRooms() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    flushPersistedDataNow().catch(() => {});
  }, 300);
}

function getOrCreateRoom(roomId: string): ServerGameState {
  const cleanId = (roomId || 'ELITE-1').trim().toUpperCase();
  let room = rooms.get(cleanId);
  if (!room) {
    room = createGameRound({ roomId: cleanId });
    rooms.set(cleanId, room);
    savePersistedRooms();
  }
  return room;
}

export function getOrCreateRoomForTest(roomId: string): ServerGameState {
  return getOrCreateRoom(roomId);
}

function normalizeRequestedRole(rawRole?: string): ClientRole {
  if (rawRole === 'spymaster_red' || rawRole === 'red_captain') return 'spymaster_red';
  if (rawRole === 'spymaster_blue' || rawRole === 'blue_captain') return 'spymaster_blue';
  if (rawRole === 'referee') return 'referee';
  return 'audience';
}

/**
 * Resolves and validates authorization strictly via revocable sessionToken or current dynamic room PIN.
 * Zero hardcoded PINs exist in the codebase.
 */
export function resolveAuthorizedRole(
  room: ServerGameState,
  requestedRoleRaw: string = 'audience',
  pin?: string,
  sessionToken?: string
): { authorized: boolean; role: ClientRole } {
  const requestedRole = normalizeRequestedRole(requestedRoleRaw);
  if (requestedRole === 'audience') {
    return { authorized: true, role: 'audience' };
  }

  // 1. Check revocable session token first
  if (sessionToken) {
    const sess = sessions.get(sessionToken.trim());
    if (sess && sess.roomId === room.roomId && Date.now() < sess.expiresAt) {
      if (sess.role === 'referee') {
        // Referee session can act as referee or inspect spymaster views
        return { authorized: true, role: requestedRole };
      }
      if (
        (requestedRole === 'spymaster_red' || requestedRole === 'spymaster_blue') &&
        (sess.role === 'spymaster_red' || sess.role === 'spymaster_blue') &&
        sess.revokedVersion === (room.sessionRevokedVersion || 1)
      ) {
        return { authorized: true, role: requestedRole };
      }
    }
  }

  // 2. Check dynamic room PIN (or optional env ADMIN_MASTER_PIN if configured by operator)
  const cleanPin = (pin || '').trim();
  if (!cleanPin) {
    return { authorized: false, role: 'audience' };
  }

  const isMasterOverride =
    ADMIN_MASTER_PIN.length >= 4 && cleanPin === ADMIN_MASTER_PIN;

  if (requestedRole === 'referee') {
    if (cleanPin === room.refereePin || isMasterOverride) {
      return { authorized: true, role: 'referee' };
    }
    return { authorized: false, role: 'audience' };
  }

  if (requestedRole === 'spymaster_red' || requestedRole === 'spymaster_blue') {
    if (
      cleanPin === room.spymasterPin ||
      cleanPin === room.refereePin ||
      isMasterOverride
    ) {
      return { authorized: true, role: requestedRole };
    }
    return { authorized: false, role: 'audience' };
  }

  return { authorized: false, role: 'audience' };
}

interface ConnectedClient {
  ws: WebSocket;
  roomId: string;
  role: ClientRole;
  pin?: string;
  sessionToken?: string;
  joined: boolean;
}

const clients = new Set<ConnectedClient>();

function broadcastRoomState(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const client of clients) {
    if (client.joined && client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
      const { authorized, role } = resolveAuthorizedRole(
        room,
        client.role,
        client.pin,
        client.sessionToken
      );
      const payload = sanitizeStateForRole(room, role);
      client.ws.send(
        JSON.stringify({
          type: 'state_sync',
          state: payload,
          authOk: authorized,
        })
      );
    }
  }
}

function broadcastTimerTick(roomId: string, timerRemainingSeconds: number) {
  const msg = JSON.stringify({
    type: 'timer_tick',
    roomId,
    timerRemainingSeconds,
  });
  for (const client of clients) {
    if (client.joined && client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

export interface RoomActionPayload {
  action:
    | 'give_clue'
    | 'reveal_card'
    | 'end_turn'
    | 'penalty_invalid_clue'
    | 'regenerate_pin'
    | 'revoke_sessions'
    | 'skip_broadcast'
    | 'undo'
    | 'toggle_pause'
    | 'new_round'
    | 'restart_round'
    | 'update_settings'
    | 'update_teams'
    | 'reset_timer'
    | 'add_custom_words'
    | 'import_words_json'
    | 'clear_custom_words'
    | 'toggle_word_status';
  role?: ClientRole;
  pin?: string;
  sessionToken?: string;
  word?: string;
  count?: number | 'unlimited';
  cardIndex?: number;
  actingTeam?: TeamColor;
  gameMode?: GameMode;
  redTeamCode?: EliteTeamCode;
  redTeamName?: string;
  blueTeamCode?: EliteTeamCode;
  blueTeamName?: string;
  startingTeam?: TeamColor | 'random';
  settings?: Partial<GameSettings>;
  customWordsText?: string;
  customCategory?: WordCategory;
  jsonContent?: string;
  wordId?: string;
}

export function executeRoomAction(
  roomId: string,
  body: RoomActionPayload
): { ok: boolean; statusCode?: number; error?: string; meta?: Record<string, unknown> } {
  const room = getOrCreateRoom(roomId);
  const directAuth = resolveAuthorizedRole(
    room,
    body.role || 'audience',
    body.pin,
    body.sessionToken
  );
  // If the organizer/referee is viewing the Audience screen (body.role === 'audience') but holds valid Referee credentials, honor their Referee authority for actions!
  const refAuth = resolveAuthorizedRole(
    room,
    'referee',
    body.pin,
    body.sessionToken
  );
  const authorized = directAuth.authorized || refAuth.authorized;
  const role: ClientRole = refAuth.authorized ? 'referee' : directAuth.role;

  const isBoardInteraction =
    body.action === 'reveal_card' ||
    body.action === 'end_turn' ||
    body.action === 'skip_broadcast';

  // Reject any privileged action that claimed a non-audience role with invalid credentials
  if (
    body.role &&
    body.role !== 'audience' &&
    !authorized &&
    !(isBoardInteraction && room.settings.allowAudienceClickInLocalMode)
  ) {
    return {
      ok: false,
      statusCode: 403,
      error: 'غير مصرح لك بتنفيذ هذا الإجراء: رمز الدخول أو الجلسة غير صالحة أو تم إلغاؤها.',
    };
  }

  switch (body.action) {
    case 'give_clue': {
      const canGiveClue =
        role === 'referee' || role === 'spymaster_red' || role === 'spymaster_blue';
      if (!canGiveClue) {
        return {
          ok: false,
          statusCode: 403,
          error: 'إعلان التلميح متاح لقائد الفريق أو الحكم المعتمد فقط.',
        };
      }

      // Enforce that Red Captain can only give clue on Red's turn (and Blue Captain on Blue's turn)
      if (room.gameMode !== 'cooperative') {
        if (role === 'spymaster_red' && room.currentTurn !== 'red') {
          return {
            ok: false,
            statusCode: 403,
            error: 'ليس دور الفريق الأحمر الآن لإعلان التلميح.',
          };
        }
        if (role === 'spymaster_blue' && room.currentTurn !== 'blue') {
          return {
            ok: false,
            statusCode: 403,
            error: 'ليس دور الفريق الأزرق الآن لإعلان التلميح.',
          };
        }
      }

      const actingTeam =
        role === 'spymaster_red'
          ? 'red'
          : role === 'spymaster_blue'
          ? 'blue'
          : body.actingTeam || room.currentTurn;

      const res = giveClue(room, body.word || '', body.count ?? 1, actingTeam);
      if (!res.ok) return { ok: false, statusCode: 400, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'reveal_card': {
      const idx = Number(body.cardIndex);
      const isReferee = role === 'referee';
      const canAudienceReveal = room.settings.allowAudienceClickInLocalMode;

      if (!isReferee && !canAudienceReveal) {
        return {
          ok: false,
          statusCode: 403,
          error: 'كشف البطاقات متاح للحكم فقط (يمكن للحكم تفعيل نقر شاشة العرض من الإعدادات).',
        };
      }

      const prevMatchesLen = room.matchHistory.length;
      const res = revealCard(room, idx, {
        actingTeam: body.actingTeam,
        forceByReferee: isReferee,
      });
      if (!res.ok) return { ok: false, statusCode: 400, error: res.error };

      // If match just finished, also record it in active tournament
      if (res.state.matchHistory.length > prevMatchesLen) {
        const latestMatch = res.state.matchHistory[0];
        const mainTour = tournaments.get('tour_elite_clash_main');
        if (mainTour && latestMatch) {
          mainTour.matches = [latestMatch, ...mainTour.matches];
          if (!mainTour.teamNames.includes(latestMatch.redTeamName)) {
            mainTour.teamNames.push(latestMatch.redTeamName);
          }
          if (!mainTour.teamNames.includes(latestMatch.blueTeamName)) {
            mainTour.teamNames.push(latestMatch.blueTeamName);
          }
        }
      }

      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'end_turn': {
      const canEndTurn =
        role === 'referee' ||
        (role === 'spymaster_red' && room.currentTurn === 'red') ||
        (role === 'spymaster_blue' && room.currentTurn === 'blue') ||
        room.settings.allowAudienceClickInLocalMode;

      if (!canEndTurn) {
        return {
          ok: false,
          statusCode: 403,
          error: 'إنهاء الدور متاح للحكم أو قائد الفريق النشط فقط.',
        };
      }
      const res = endTurn(room, body.actingTeam, 'manual');
      if (!res.ok) return { ok: false, statusCode: 400, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'skip_broadcast': {
      if (role !== 'referee' && role !== 'audience') {
        return { ok: false, statusCode: 403, error: 'غير مصرح.' };
      }
      const updated: ServerGameState = {
        ...room,
        activeBroadcast: null,
      };
      rooms.set(room.roomId, updated);
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'penalty_invalid_clue': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'تطبيق عقوبة التلميح المخالف متاح للحكم فقط.',
        };
      }
      const res = applyInvalidCluePenalty(room);
      if (!res.ok) return { ok: false, statusCode: 400, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'regenerate_pin':
    case 'revoke_sessions': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'توليد رمز جديد أو إلغاء جلسات القادة متاح للحكم فقط.',
        };
      }
      const newSpymasterPin = generateDynamicPin();
      const nextRevokedVersion = (room.sessionRevokedVersion || 1) + 1;
      const now = Date.now();
      const updated: ServerGameState = {
        ...room,
        spymasterPin: newSpymasterPin,
        sessionRevokedVersion: nextRevokedVersion,
        eventLog: [
          {
            id: `evt_${now}_pin`,
            timestamp: now,
            turn: room.turnsCount,
            team: room.currentTurn,
            type: 'round_start',
            // SECURITY: Do NOT include the new PIN in public eventLog!
            message: 'قام الحكم بتدوير رمز القادة وإلغاء الجلسات السابقة.',
          },
          ...room.eventLog,
        ],
      };

      // Downgrade any connected spymaster sockets that were using the old revoked PIN/session
      for (const client of clients) {
        if (
          client.roomId === room.roomId &&
          (client.role === 'spymaster_red' || client.role === 'spymaster_blue')
        ) {
          client.role = 'audience';
          client.pin = undefined;
          client.sessionToken = undefined;
        }
      }

      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true, meta: { spymasterPin: newSpymasterPin } };
    }

    case 'undo': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'التراجع عن الحركات (Undo) متاح للحكم فقط.',
        };
      }
      const res = undoLastAction(room);
      if (!res.ok) return { ok: false, statusCode: 400, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'toggle_pause': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'إيقاف أو استئناف المباراة متاح للحكم فقط.',
        };
      }
      if (room.status === 'gameover') {
        return { ok: false, statusCode: 400, error: 'الجولة منتهية بالفعل.' };
      }
      const nextStatus = room.status === 'paused' ? 'playing' : 'paused';
      const now = Date.now();
      const updated: ServerGameState = {
        ...room,
        status: nextStatus,
        eventLog: [
          {
            id: `evt_${now}_pause`,
            timestamp: now,
            turn: room.turnsCount,
            team: room.currentTurn,
            type: 'pause',
            message: nextStatus === 'paused' ? 'أوقف الحكم الجولة مؤقتًا.' : 'استأنف الحكم الجولة.',
          },
          ...room.eventLog,
        ],
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'restart_round': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'إعادة الجولة متاحة للحكم فقط.',
        };
      }
      const updated = restartCurrentRound(room);
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'new_round': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'بدء جولة جديدة متاح للحكم فقط.',
        };
      }
      const redCode = body.redTeamCode || room.redTeamCode;
      const blueCode = body.blueTeamCode || room.blueTeamCode;
      const redName =
        body.redTeamName?.trim() ||
        (body.redTeamCode ? ELITE_CLASH_TEAMS[redCode].name : room.redTeamName);
      const blueName =
        body.blueTeamName?.trim() ||
        (body.blueTeamCode ? ELITE_CLASH_TEAMS[blueCode].name : room.blueTeamName);
      const startTeam =
        body.startingTeam === 'red' || body.startingTeam === 'blue'
          ? body.startingTeam
          : undefined;

      const nextMode = body.gameMode || body.settings?.gameMode || room.gameMode;
      const freshSpymasterPin = generateDynamicPin();
      const nextRevokedVersion = (room.sessionRevokedVersion || 1) + 1;

      const nextRound = createGameRound({
        roomId: room.roomId,
        refereePin: room.refereePin,
        spymasterPin: freshSpymasterPin,
        refereeClaimed: room.refereeClaimed,
        sessionRevokedVersion: nextRevokedVersion,
        gameMode: nextMode,
        redTeamCode: redCode,
        redTeamName: redName,
        blueTeamCode: blueCode,
        blueTeamName: blueName,
        startingTeam: startTeam,
        customWords: room.customWords,
        disabledWordIds: room.disabledWordIds,
        usedWordsHistory: room.usedWordsHistory,
        settings: {
          ...room.settings,
          ...(body.settings || {}),
          gameMode: nextMode,
        },
        roundNumber: room.roundNumber + 1,
        matchHistory: room.matchHistory,
        redWinsCount: room.redWinsCount,
        blueWinsCount: room.blueWinsCount,
      });

      // Keep already-authenticated spymasters in the room synced with the new round's PIN & session version
      for (const client of clients) {
        if (
          client.roomId === room.roomId &&
          (client.role === 'spymaster_red' || client.role === 'spymaster_blue')
        ) {
          client.pin = freshSpymasterPin;
          if (client.sessionToken) {
            const sess = sessions.get(client.sessionToken);
            if (sess) {
              sess.revokedVersion = nextRevokedVersion;
            }
          }
        }
      }

      rooms.set(room.roomId, nextRound);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true, meta: { spymasterPin: freshSpymasterPin } };
    }

    case 'update_teams': {
      if (role !== 'referee') {
        return {
          ok: false,
          statusCode: 403,
          error: 'تعديل أسماء الفرق متاح للحكم فقط.',
        };
      }
      const redCode = body.redTeamCode || room.redTeamCode;
      const blueCode = body.blueTeamCode || room.blueTeamCode;
      const redName = body.redTeamName?.trim() || ELITE_CLASH_TEAMS[redCode].name;
      const blueName = body.blueTeamName?.trim() || ELITE_CLASH_TEAMS[blueCode].name;
      const updated: ServerGameState = {
        ...room,
        redTeamCode: redCode,
        redTeamName: redName,
        blueTeamCode: blueCode,
        blueTeamName: blueName,
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'update_settings': {
      // Allow display-only local settings or referee full settings
      const requestedSettings = body.settings || {};
      const isDisplayOnly = Object.keys(requestedSettings).every((k) =>
        ['soundEnabled', 'soundVolume', 'fontScale', 'projectorHighContrast', 'languageMode'].includes(k)
      );

      if (role !== 'referee' && !isDisplayOnly) {
        return {
          ok: false,
          statusCode: 403,
          error: 'تغيير قواعد وأوضاع المباراة متاح للحكم فقط.',
        };
      }

      const nextSettings: GameSettings = {
        ...room.settings,
        ...requestedSettings,
      };

      // If gameMode or word packs changed, start a fresh round with the new mode/packs if requested by referee
      if (
        role === 'referee' &&
        requestedSettings.gameMode &&
        requestedSettings.gameMode !== room.gameMode
      ) {
        const rebuilt = createGameRound({
          roomId: room.roomId,
          refereePin: room.refereePin,
          spymasterPin: room.spymasterPin,
          refereeClaimed: room.refereeClaimed,
          sessionRevokedVersion: room.sessionRevokedVersion,
          gameMode: requestedSettings.gameMode,
          redTeamCode: room.redTeamCode,
          redTeamName: room.redTeamName,
          blueTeamCode: room.blueTeamCode,
          blueTeamName: room.blueTeamName,
          customWords: room.customWords,
          disabledWordIds: room.disabledWordIds,
          usedWordsHistory: room.usedWordsHistory,
          settings: nextSettings,
          roundNumber: room.roundNumber,
          matchHistory: room.matchHistory,
          redWinsCount: room.redWinsCount,
          blueWinsCount: room.blueWinsCount,
        });
        rooms.set(room.roomId, rebuilt);
        savePersistedRooms();
        broadcastRoomState(room.roomId);
        return { ok: true };
      }

      const updated: ServerGameState = {
        ...room,
        settings: nextSettings,
        timerRemainingSeconds:
          requestedSettings.timerDurationSeconds !== undefined
            ? requestedSettings.timerDurationSeconds
            : room.timerRemainingSeconds,
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'reset_timer': {
      if (role !== 'referee') {
        return { ok: false, statusCode: 403, error: 'إعادة ضبط المؤقت متاحة للحكم فقط.' };
      }
      const updated: ServerGameState = {
        ...room,
        timerRemainingSeconds: room.settings.timerDurationSeconds,
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'add_custom_words': {
      if (role !== 'referee') {
        return { ok: false, statusCode: 403, error: 'إدارة الكلمات متاحة للحكم فقط.' };
      }
      const rawText = body.customWordsText || '';
      const category: WordCategory = body.customCategory || 'المفاهيم المجردة';
      const tokens = rawText
        .split(/[\n,،;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (tokens.length === 0) {
        return { ok: false, statusCode: 400, error: 'يرجى كتابة كلمة واحدة على الأقل.' };
      }
      const combined = buildValidatedWordBank([
        ...room.customWords,
        ...tokens.map((t) => ({
          ar: t,
          en: '',
          category,
          subCategory: 'مضاف يدويًا',
        })),
      ]);
      const updated: ServerGameState = {
        ...room,
        customWords: combined.words,
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return {
        ok: true,
        meta: {
          addedCount: combined.words.length - room.customWords.length,
          duplicatesRemoved: combined.duplicatesRemoved,
        },
      };
    }

    case 'import_words_json': {
      if (role !== 'referee') {
        return { ok: false, statusCode: 403, error: 'استيراد الكلمات متاح للحكم فقط.' };
      }
      const parsed = parseImportedWordsJson(body.jsonContent || '');
      if (parsed.error) {
        return { ok: false, statusCode: 400, error: parsed.error };
      }
      const combined = buildValidatedWordBank([
        ...room.customWords,
        ...parsed.entries,
      ]);
      const updated: ServerGameState = {
        ...room,
        customWords: combined.words,
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return {
        ok: true,
        meta: {
          totalCustom: combined.words.length,
          duplicatesRemoved: [
            ...parsed.duplicatesRemoved,
            ...combined.duplicatesRemoved,
          ],
        },
      };
    }

    case 'toggle_word_status': {
      if (role !== 'referee') {
        return { ok: false, statusCode: 403, error: 'مراجعة الكلمات متاحة للحكم فقط.' };
      }
      const targetId = (body.wordId || '').trim();
      if (!targetId) {
        return { ok: false, statusCode: 400, error: 'معرف الكلمة مطلوب.' };
      }
      const currentDisabled = new Set(room.disabledWordIds || []);
      if (currentDisabled.has(targetId)) {
        currentDisabled.delete(targetId);
      } else {
        currentDisabled.add(targetId);
      }
      const updated: ServerGameState = {
        ...room,
        disabledWordIds: Array.from(currentDisabled),
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true, meta: { disabledCount: updated.disabledWordIds.length } };
    }

    case 'clear_custom_words': {
      if (role !== 'referee') {
        return { ok: false, statusCode: 403, error: 'مسح الكلمات المخصصة متاح للحكم فقط.' };
      }
      const updated: ServerGameState = {
        ...room,
        customWords: [],
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    default:
      return { ok: false, statusCode: 400, error: 'إجراء غير معروف.' };
  }
}

async function startServer() {
  loadPersistedData();

  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Helper to extract bearer token from header or query/body
  const extractToken = (req: express.Request): string | undefined => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return (req.body?.sessionToken || req.query?.sessionToken || req.query?.token) as
      | string
      | undefined;
  };

  // 1. Authenticate Role & Issue Revocable Session Token (with Rate Limiting)
  app.post('/api/rooms/:roomId/auth', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const room = getOrCreateRoom(req.params.roomId);
    const requestedRole = normalizeRequestedRole(req.body?.role);
    const pin = req.body?.pin as string | undefined;
    const existingToken = extractToken(req);

    if (requestedRole === 'audience') {
      res.json({
        ok: true,
        role: 'audience',
        state: sanitizeStateForRole(room, 'audience'),
      });
      return;
    }

    const rateCheck = checkRateLimit(authRateLimits, `${clientIp}:${room.roomId}`, 8, 60_000);
    if (!rateCheck.allowed) {
      res.status(429).json({
        ok: false,
        error: `تم تجاوز الحد المسموح لمحاولات الدخول. يرجى الانتظار ${rateCheck.retryAfterSec} ثانية.`,
      });
      return;
    }

    const authResult = resolveAuthorizedRole(room, requestedRole, pin, existingToken);
    if (!authResult.authorized) {
      res.status(403).json({
        ok: false,
        error: 'رمز الدخول غير صحيح لهذه الغرفة أو انتهت صلاحية الجلسة.',
      });
      return;
    }

    // Clear rate limit bucket on successful auth
    authRateLimits.delete(`${clientIp}:${room.roomId}`);
    if (authResult.role === 'referee' && !room.refereeClaimed) {
      room.refereeClaimed = true;
      rooms.set(room.roomId, room);
      savePersistedRooms();
    }

    const sessionToken = createSessionToken(room, authResult.role);

    res.json({
      ok: true,
      role: authResult.role,
      sessionToken,
      pin: authResult.role === 'referee' ? room.refereePin : room.spymasterPin,
      state: sanitizeStateForRole(room, authResult.role),
    });
  });

  // 2. Claim Organizer / Referee Credentials for Room
  app.post('/api/rooms/:roomId/claim-organizer', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);

    room.refereeClaimed = true;
    if (req.body?.enableAudienceClick !== false) {
      room.settings = {
        ...room.settings,
        allowAudienceClickInLocalMode: true,
      };
    }
    rooms.set(room.roomId, room);
    savePersistedRooms();

    const sessionToken = createSessionToken(room, 'referee');
    const returnRole: ClientRole =
      req.body?.keepAudienceState === true ? 'audience' : 'referee';

    // Update any connected WebSocket for this room if it matches the existing token
    const existingToken = extractToken(req);
    for (const client of clients) {
      if (
        client.roomId === room.roomId &&
        existingToken &&
        client.sessionToken === existingToken
      ) {
        client.sessionToken = sessionToken;
        client.pin = room.refereePin;
      }
    }

    broadcastRoomState(room.roomId);

    res.json({
      ok: true,
      role: returnRole,
      sessionToken,
      refereePin: room.refereePin,
      spymasterPin: room.spymasterPin,
      state: sanitizeStateForRole(room, returnRole),
    });
  });

  // 3. Protected QR & Invite Metadata Endpoint (NEVER leaks PINs or roundSeed to unauthenticated callers)
  app.get('/api/rooms/:roomId/qr-info', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);
    const token = extractToken(req);
    const pin = (req.query.pin || req.headers['x-auth-pin']) as string | undefined;
    const requestedRole = (req.query.role as string) || 'referee';

    const refAuth = resolveAuthorizedRole(room, 'referee', pin, token);
    const spyAuth = resolveAuthorizedRole(room, 'spymaster_red', pin, token);
    const isPrivileged = refAuth.authorized || spyAuth.authorized || requestedRole === 'audience_ check_only' && false;

    if (!isPrivileged) {
      // Unauthenticated Audience caller: return ONLY public room metadata, ZERO secrets!
      res.json({
        ok: true,
        authorized: false,
        roomId: room.roomId,
        roundNumber: room.roundNumber,
        gameMode: room.gameMode,
        startingTeam: room.startingTeam,
        refereeClaimed: Boolean(room.refereeClaimed),
      });
      return;
    }

    res.json({
      ok: true,
      authorized: true,
      canSeeRefereePin: refAuth.authorized,
      roomId: room.roomId,
      roundNumber: room.roundNumber,
      gameMode: room.gameMode,
      startingTeam: room.startingTeam,
      spymasterPin: room.spymasterPin,
      refereePin: refAuth.authorized ? room.refereePin : undefined,
      refereeClaimed: Boolean(room.refereeClaimed),
    });
  });

  // 4. Get Sanitized Room State
  app.get('/api/rooms/:roomId', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);
    const requestedRole = (req.query.role as ClientRole) || 'audience';
    const pin = req.query.pin as string | undefined;
    const token = extractToken(req);
    const { authorized, role } = resolveAuthorizedRole(room, requestedRole, pin, token);
    res.json({
      ok: true,
      authorized,
      authOk: authorized,
      state: sanitizeStateForRole(room, role),
    });
  });

  // 5. Perform Game Action via REST API (with Rate Limiting & Strict Role Enforcement)
  app.post('/api/rooms/:roomId/action', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const roomId = (req.params.roomId || 'ELITE-1').trim().toUpperCase();

    const rateCheck = checkRateLimit(actionRateLimits, `${clientIp}:${roomId}`, 50, 10_000);
    if (!rateCheck.allowed) {
      res.status(429).json({
        ok: false,
        error: 'طلبات سريعة جدًا، يرجى التمهل قليلًا.',
      });
      return;
    }

    const token = extractToken(req);
    const payload: RoomActionPayload = {
      ...(req.body as RoomActionPayload),
      sessionToken: token,
    };

    const result = executeRoomAction(roomId, payload);
    const room = getOrCreateRoom(roomId);
    const { role: resolvedRole } = resolveAuthorizedRole(
      room,
      req.body?.role || 'audience',
      req.body?.pin,
      token
    );

    if (!result.ok) {
      res.status(result.statusCode || 400).json({
        ok: false,
        error: result.error,
        state: sanitizeStateForRole(room, resolvedRole),
      });
      return;
    }
    res.json({
      ok: true,
      meta: result.meta,
      state: sanitizeStateForRole(room, resolvedRole),
    });
  });

  // 6. Word Bank Catalog & Review Endpoint
  app.get('/api/rooms/:roomId/words', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);
    const disabledSet = new Set(room.disabledWordIds || []);
    const allWords = [
      ...room.customWords.map((w) => ({
        ...w,
        isCustom: true,
        status: disabledSet.has(w.id) ? ('disabled' as const) : ('approved' as const),
      })),
      ...OFFICIAL_WORD_BANK.map((w) => ({
        ...w,
        isCustom: false,
        status: disabledSet.has(w.id) ? ('disabled' as const) : ('approved' as const),
      })),
    ];
    res.json({
      ok: true,
      packs: WORD_PACKS_CATALOG,
      words: allWords,
      disabledWordIds: room.disabledWordIds || [],
    });
  });

  // 7. Tournaments & Standings Management Endpoints
  app.get('/api/tournaments', (_req, res) => {
    const list = Array.from(tournaments.values()).map((t) => ({
      ...t,
      standings: computeTournamentStandings(t.matches),
    }));
    res.json({
      ok: true,
      tournaments: list,
    });
  });

  app.post('/api/tournaments', (req, res) => {
    const roomId = (req.body?.roomId || 'ELITE-1').trim().toUpperCase();
    const room = getOrCreateRoom(roomId);
    const token = extractToken(req);
    const auth = resolveAuthorizedRole(room, 'referee', req.body?.pin, token);
    if (!auth.authorized) {
      res.status(403).json({
        ok: false,
        error: 'إدارة البطولات متاحة للحكم فقط.',
      });
      return;
    }

    const subAction = req.body?.subAction as string;
    if (subAction === 'create') {
      const name = String(req.body?.name || '').trim() || 'بطولة جديدة';
      const organizer = String(req.body?.organizer || 'مسجد ابن تيمية').trim();
      const teamNamesRaw = Array.isArray(req.body?.teamNames)
        ? (req.body.teamNames as string[]).map((s) => s.trim()).filter(Boolean)
        : Object.values(ELITE_CLASH_TEAMS).map((t) => t.name);

      const id = `tour_${Date.now()}`;
      const comp: TournamentCompetition = {
        id,
        name,
        organizer,
        createdAt: new Date().toISOString(),
        gameMode: req.body?.gameMode || 'tournament',
        teamNames: teamNamesRaw.length >= 2 ? teamNamesRaw : ['الفريق الأول', 'الفريق الثاني'],
        matches: [],
      };
      tournaments.set(id, comp);
      savePersistedRooms();
    } else if (subAction === 'add_team') {
      const tourId = String(req.body?.tournamentId || 'tour_elite_clash_main');
      const teamName = String(req.body?.teamName || '').trim();
      const comp = tournaments.get(tourId);
      if (comp && teamName && !comp.teamNames.includes(teamName)) {
        comp.teamNames.push(teamName);
        savePersistedRooms();
      }
    } else if (subAction === 'clear_matches') {
      const tourId = String(req.body?.tournamentId || 'tour_elite_clash_main');
      const comp = tournaments.get(tourId);
      if (comp) {
        comp.matches = [];
        savePersistedRooms();
      }
    }

    const list = Array.from(tournaments.values()).map((t) => ({
      ...t,
      standings: computeTournamentStandings(t.matches),
    }));
    res.json({ ok: true, tournaments: list });
  });

  // 8. Safe Backup & Restore Endpoints (Referee-only)
  app.get('/api/admin/backup', (req, res) => {
    const roomId = String(req.query.roomId || 'ELITE-1').trim().toUpperCase();
    const room = getOrCreateRoom(roomId);
    const token = extractToken(req);
    const auth = resolveAuthorizedRole(room, 'referee', req.query.pin as string | undefined, token);
    if (!auth.authorized) {
      res.status(403).json({
        ok: false,
        error: 'تصدير النسخة الاحتياطية الكاملة متاح للحكم فقط.',
      });
      return;
    }

    const roomsObj: Record<string, ServerGameState> = {};
    for (const [id, r] of rooms.entries()) {
      roomsObj[id] = r;
    }
    const tournamentsObj: Record<string, TournamentCompetition> = {};
    for (const [id, t] of tournaments.entries()) {
      tournamentsObj[id] = t;
    }

    res.json({
      ok: true,
      backupVersion: '2.0',
      exportedAt: new Date().toISOString(),
      platform: 'CODE NAMES — ELITE CLASH',
      rooms: roomsObj,
      tournaments: tournamentsObj,
    });
  });

  app.post('/api/admin/restore', async (req, res) => {
    const roomId = String(req.body?.roomId || 'ELITE-1').trim().toUpperCase();
    const room = getOrCreateRoom(roomId);
    const token = extractToken(req);
    const auth = resolveAuthorizedRole(room, 'referee', req.body?.pin, token);
    if (!auth.authorized) {
      res.status(403).json({
        ok: false,
        error: 'استرجاع النسخة الاحتياطية متاح للحكم فقط.',
      });
      return;
    }

    const backupData = req.body?.backup;
    if (!backupData || typeof backupData !== 'object') {
      res.status(400).json({ ok: false, error: 'بيانات النسخة الاحتياطية غير صالحة.' });
      return;
    }

    try {
      // Save automatic pre-restore safety snapshot
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const snapshotPath = path.join(BACKUPS_DIR, `pre-restore-${Date.now()}.json`);
      const currentRooms: Record<string, ServerGameState> = {};
      for (const [id, r] of rooms.entries()) currentRooms[id] = r;
      await fs.promises.writeFile(snapshotPath, JSON.stringify({ rooms: currentRooms }), 'utf-8');

      if (backupData.rooms && typeof backupData.rooms === 'object') {
        for (const [rId, rState] of Object.entries(backupData.rooms as Record<string, ServerGameState>)) {
          if (rState && rState.roomId && Array.isArray(rState.cards)) {
            rooms.set(rId, scrubLegacyRoomSecurity(rState));
            broadcastRoomState(rId);
          }
        }
      }
      if (backupData.tournaments && typeof backupData.tournaments === 'object') {
        for (const [tId, tComp] of Object.entries(
          backupData.tournaments as Record<string, TournamentCompetition>
        )) {
          if (tComp && tComp.id) {
            tournaments.set(tId, tComp);
          }
        }
      }
      await flushPersistedDataNow();
      res.json({ ok: true, message: 'تم استرجاع النسخة الاحتياطية ومزامنة الغرف بنجاح.' });
    } catch {
      res.status(500).json({ ok: false, error: 'حدث خطأ أثناء استرجاع النسخة الاحتياطية.' });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: ConnectedClient = {
      ws,
      roomId: 'ELITE-1',
      role: 'audience',
      joined: false,
    };
    clients.add(client);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'join') {
          const roomId = String(msg.roomId || 'ELITE-1').trim().toUpperCase();
          const room = getOrCreateRoom(roomId);
          const auth = resolveAuthorizedRole(
            room,
            msg.role || 'audience',
            msg.pin,
            msg.sessionToken
          );
          client.roomId = room.roomId;
          client.role = auth.role;
          client.pin = msg.pin;
          client.sessionToken = msg.sessionToken;
          client.joined = true;
          ws.send(
            JSON.stringify({
              type: 'state_sync',
              state: sanitizeStateForRole(room, auth.role),
              authOk: auth.authorized,
            })
          );
        } else if (msg.type === 'action') {
          const roomId = client.roomId || 'ELITE-1';
          const result = executeRoomAction(roomId, {
            ...msg.payload,
            role: client.role,
            pin: client.pin,
            sessionToken: client.sessionToken,
          });
          if (!result.ok) {
            ws.send(
              JSON.stringify({
                type: 'action_error',
                error: result.error,
              })
            );
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });
  });

  // Server-authoritative 1-second countdown timer for active rooms
  setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.status === 'playing' && room.settings.timerEnabled) {
        const hasActiveClient = Array.from(clients).some((c) => c.joined && c.roomId === roomId);
        if (!hasActiveClient) continue;

        if (room.timerRemainingSeconds > 1) {
          room.timerRemainingSeconds -= 1;
          broadcastTimerTick(roomId, room.timerRemainingSeconds);
        } else {
          const ended = endTurn(room, undefined, 'time_up');
          if (ended.ok) {
            rooms.set(roomId, ended.state);
            savePersistedRooms();
            broadcastRoomState(roomId);
          }
        }
      }
    }
  }, 1000);

  const distPath = path.resolve(process.cwd(), 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (hasBuiltDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CODE NAMES — ELITE CLASH server running on http://0.0.0.0:${PORT}`);
  });
}

// Only auto-start HTTP listener when executed as server entry point (allows importing helpers in tests)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
