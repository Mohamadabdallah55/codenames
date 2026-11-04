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
  GameSettings,
  ServerGameState,
  TeamColor,
  applyInvalidCluePenalty,
  createGameRound,
  endTurn,
  generateDynamicPin,
  giveClue,
  restartCurrentRound,
  revealCard,
  sanitizeStateForRole,
  undoLastAction,
} from './src/game/rules';
import { WordEntry, buildValidatedWordBank, parseImportedWordsJson } from './src/data/words';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

const rooms = new Map<string, ServerGameState>();

function loadPersistedRooms() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, ServerGameState>;
      for (const [roomId, state] of Object.entries(parsed)) {
        if (state && state.roomId && Array.isArray(state.cards) && state.cards.length === 25) {
          if (!state.roundSeed) {
            state.roundSeed = `${state.roomId}-R${state.roundNumber}-${state.spymasterPin}`;
          }
          rooms.set(roomId, state);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load persisted rooms:', err);
  }
  if (!rooms.has('ELITE-1')) {
    rooms.set('ELITE-1', createGameRound({ roomId: 'ELITE-1' }));
  }
}

function savePersistedRooms() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized: Record<string, ServerGameState> = {};
    for (const [id, state] of rooms.entries()) {
      serialized[id] = state;
    }
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(serialized), 'utf-8');
  } catch (err) {
    console.error('Failed to save persisted rooms:', err);
  }
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

function normalizeRequestedRole(rawRole?: string): ClientRole {
  if (rawRole === 'spymaster_red' || rawRole === 'red_captain') return 'spymaster_red';
  if (rawRole === 'spymaster_blue' || rawRole === 'blue_captain') return 'spymaster_blue';
  if (rawRole === 'referee') return 'referee';
  return 'audience';
}

function resolveAuthorizedRole(
  room: ServerGameState,
  requestedRoleRaw: string = 'audience',
  pin?: string
): { authorized: boolean; role: ClientRole } {
  const requestedRole = normalizeRequestedRole(requestedRoleRaw);
  if (requestedRole === 'audience') {
    return { authorized: true, role: 'audience' };
  }
  const cleanPin = (pin || '').trim();
  if (requestedRole === 'referee') {
    // Accept the room's dynamic refereePin or tournament organizer master code 1446
    if (cleanPin === room.refereePin || cleanPin === '1446') {
      return { authorized: true, role: 'referee' };
    }
    return { authorized: false, role: 'audience' };
  }
  if (requestedRole === 'spymaster_red' || requestedRole === 'spymaster_blue') {
    // Accept the current round's dynamic spymasterPin, refereePin, or master code
    if (
      cleanPin === room.spymasterPin ||
      cleanPin === room.refereePin ||
      cleanPin === '2026' ||
      cleanPin === '1446'
    ) {
      return { authorized: true, role: requestedRole };
    }
    return { authorized: false, role: 'audience' };
  }
  return { authorized: true, role: 'audience' };
}

interface ConnectedClient {
  ws: WebSocket;
  roomId: string;
  role: ClientRole;
  pin?: string;
  joined: boolean;
}

const clients = new Set<ConnectedClient>();

function broadcastRoomState(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const client of clients) {
    if (client.joined && client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
      const { authorized, role } = resolveAuthorizedRole(room, client.role, client.pin);
      const payload = sanitizeStateForRole(room, role);
      client.ws.send(JSON.stringify({ type: 'state_sync', state: payload, authOk: authorized }));
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
    | 'undo'
    | 'toggle_pause'
    | 'new_round'
    | 'restart_round'
    | 'update_settings'
    | 'update_teams'
    | 'reset_timer'
    | 'add_custom_words'
    | 'import_words_json'
    | 'clear_custom_words';
  role?: ClientRole;
  pin?: string;
  word?: string;
  count?: number | 'unlimited';
  cardIndex?: number;
  actingTeam?: TeamColor;
  redTeamCode?: EliteTeamCode;
  redTeamName?: string;
  blueTeamCode?: EliteTeamCode;
  blueTeamName?: string;
  startingTeam?: TeamColor | 'random';
  settings?: Partial<GameSettings>;
  customWordsText?: string;
  jsonContent?: string;
}

function executeRoomAction(
  roomId: string,
  body: RoomActionPayload
): { ok: boolean; error?: string; meta?: Record<string, unknown> } {
  const room = getOrCreateRoom(roomId);
  const { role } = resolveAuthorizedRole(room, body.role || 'audience', body.pin);

  switch (body.action) {
    case 'give_clue': {
      if (role === 'audience' && !room.settings.allowAudienceClickInLocalMode) {
        return { ok: false, error: 'فقط القائد أو الحكم يمكنه إدخال التلميح.' };
      }
      const actingTeam =
        role === 'spymaster_red'
          ? 'red'
          : role === 'spymaster_blue'
          ? 'blue'
          : body.actingTeam;
      const res = giveClue(room, body.word || '', body.count ?? 1, actingTeam);
      if (!res.ok) return { ok: false, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'reveal_card': {
      const idx = Number(body.cardIndex);
      const isReferee = role === 'referee';
      if (!isReferee && !room.settings.allowAudienceClickInLocalMode) {
        return { ok: false, error: 'الكشف متاح للحكم فقط في هذا الوضع.' };
      }
      const res = revealCard(room, idx, {
        actingTeam: body.actingTeam,
        forceByReferee: isReferee,
      });
      if (!res.ok) return { ok: false, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'end_turn': {
      const res = endTurn(room, body.actingTeam);
      if (!res.ok) return { ok: false, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'penalty_invalid_clue': {
      const res = applyInvalidCluePenalty(room);
      if (!res.ok) return { ok: false, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'regenerate_pin': {
      const newSpymasterPin = generateDynamicPin();
      const now = Date.now();
      const updated: ServerGameState = {
        ...room,
        spymasterPin: newSpymasterPin,
        eventLog: [
          {
            id: `evt_${now}_pin`,
            timestamp: now,
            turn: room.turnsCount,
            team: room.currentTurn,
            type: 'round_start',
            message: `تم توليد رمز سري جديد للقادة في هذه الجولة: ${newSpymasterPin}`,
          },
          ...room.eventLog,
        ],
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true, meta: { spymasterPin: newSpymasterPin } };
    }

    case 'undo': {
      const res = undoLastAction(room);
      if (!res.ok) return { ok: false, error: res.error };
      rooms.set(room.roomId, res.state);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'toggle_pause': {
      if (room.status === 'gameover') {
        return { ok: false, error: 'الجولة منتهية بالفعل.' };
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
      const updated = restartCurrentRound(room);
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'new_round': {
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

      // Generate a fresh dynamic Spymaster PIN specifically for the new round!
      const freshSpymasterPin = generateDynamicPin();

      const nextRound = createGameRound({
        roomId: room.roomId,
        refereePin: room.refereePin,
        spymasterPin: freshSpymasterPin,
        redTeamCode: redCode,
        redTeamName: redName,
        blueTeamCode: blueCode,
        blueTeamName: blueName,
        startingTeam: startTeam,
        customWords: room.customWords,
        usedWordsHistory: room.usedWordsHistory,
        settings: room.settings,
        roundNumber: room.roundNumber + 1,
        matchHistory: room.matchHistory,
        redWinsCount: room.redWinsCount,
        blueWinsCount: room.blueWinsCount,
      });

      // Keep existing connected spymasters synced with the new round's PIN if they were already authorized
      for (const client of clients) {
        if (
          client.roomId === room.roomId &&
          (client.role === 'spymaster_red' || client.role === 'spymaster_blue')
        ) {
          client.pin = freshSpymasterPin;
        }
      }

      rooms.set(room.roomId, nextRound);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true, meta: { spymasterPin: freshSpymasterPin } };
    }

    case 'update_teams': {
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
      const nextSettings: GameSettings = {
        ...room.settings,
        ...(body.settings || {}),
      };
      const updated: ServerGameState = {
        ...room,
        settings: nextSettings,
        timerRemainingSeconds:
          body.settings?.timerDurationSeconds !== undefined
            ? body.settings.timerDurationSeconds
            : room.timerRemainingSeconds,
      };
      rooms.set(room.roomId, updated);
      savePersistedRooms();
      broadcastRoomState(room.roomId);
      return { ok: true };
    }

    case 'reset_timer': {
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
      const rawText = body.customWordsText || '';
      const tokens = rawText
        .split(/[\n,،;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (tokens.length === 0) {
        return { ok: false, error: 'يرجى كتابة كلمة واحدة على الأقل.' };
      }
      const combined = buildValidatedWordBank([
        ...room.customWords.map((w) => ({ ar: w.ar, en: w.en, category: w.category })),
        ...tokens.map((t) => ({ ar: t, en: '', category: 'المفاهيم المجردة' as const })),
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
      const parsed = parseImportedWordsJson(body.jsonContent || '');
      if (parsed.error) {
        return { ok: false, error: parsed.error };
      }
      const combined = buildValidatedWordBank([
        ...room.customWords.map((w) => ({ ar: w.ar, en: w.en, category: w.category })),
        ...parsed.entries.map((w: WordEntry) => ({ ar: w.ar, en: w.en, category: w.category })),
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

    case 'clear_custom_words': {
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
      return { ok: false, error: 'إجراء غير معروف.' };
  }
}

async function startServer() {
  loadPersistedRooms();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Verify role & PIN endpoint
  app.post('/api/rooms/:roomId/auth', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);
    const requestedRole = (req.body?.role || 'audience') as ClientRole;
    const pin = req.body?.pin as string | undefined;
    const authResult = resolveAuthorizedRole(room, requestedRole, pin);
    if (!authResult.authorized) {
      res.status(403).json({
        ok: false,
        error: `رمز الدخول غير صحيح لهذه الجولة. اطلب رمز الجولة الحالي أو امسح رمز QR للقائد.`,
      });
      return;
    }
    res.json({
      ok: true,
      role: authResult.role,
      pin: requestedRole === 'referee' ? room.refereePin : room.spymasterPin,
      state: sanitizeStateForRole(room, authResult.role),
    });
  });

  // Get dynamic room invite/QR metadata (returns roundSeed & current game PINs for QR modal without exposing card colors)
  app.get('/api/rooms/:roomId/qr-info', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);
    res.json({
      ok: true,
      roomId: room.roomId,
      roundNumber: room.roundNumber,
      roundSeed: room.roundSeed,
      startingTeam: room.startingTeam,
      spymasterPin: room.spymasterPin,
      refereePin: room.refereePin,
    });
  });

  // Get sanitized room state
  app.get('/api/rooms/:roomId', (req, res) => {
    const room = getOrCreateRoom(req.params.roomId);
    const requestedRole = (req.query.role as ClientRole) || 'audience';
    const pin = req.query.pin as string | undefined;
    const { role } = resolveAuthorizedRole(room, requestedRole, pin);
    res.json({
      ok: true,
      state: sanitizeStateForRole(room, role),
    });
  });

  // Perform game action via REST API
  app.post('/api/rooms/:roomId/action', (req, res) => {
    const roomId = (req.params.roomId || 'ELITE-1').trim().toUpperCase();
    const result = executeRoomAction(roomId, req.body as RoomActionPayload);
    const room = getOrCreateRoom(roomId);
    const requestedRole = (req.body?.role as ClientRole) || 'audience';
    const pin = req.body?.pin as string | undefined;
    const { role } = resolveAuthorizedRole(room, requestedRole, pin);
    if (!result.ok) {
      res.status(400).json({
        ok: false,
        error: result.error,
        state: sanitizeStateForRole(room, role),
      });
      return;
    }
    res.json({
      ok: true,
      meta: result.meta,
      state: sanitizeStateForRole(room, role),
    });
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
          const auth = resolveAuthorizedRole(room, msg.role || 'audience', msg.pin);
          client.roomId = room.roomId;
          client.role = auth.role;
          client.pin = msg.pin;
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
          broadcastRoomState(roomId);
        } else {
          const ended = endTurn(room);
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

startServer();
