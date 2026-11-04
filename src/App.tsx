import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClientGameState,
  ClientRole,
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
} from './game/rules';
import { TitleScreen } from './components/TitleScreen';
import { GameBoard } from './components/GameBoard';
import { SpymasterView } from './components/SpymasterView';
import { RefereeView } from './components/RefereeView';
import { RoomShareModal, SettingsModal, StatusModal } from './components/Modals';
import { soundFX } from './utils/sound';
import { RoomActionPayload } from '../server';

const SESSION_STORAGE_KEY = 'elite_clash_codenames_session_v2';

interface SavedSession {
  roomId: string;
  role: ClientRole;
  pin?: string;
  seed?: string;
  roundNumber?: number;
  startingTeam?: TeamColor;
  started: boolean;
}

function normalizeClientRoleParam(raw: string | null): ClientRole | null {
  if (!raw) return null;
  if (raw === 'spymaster_red' || raw === 'red_captain') return 'spymaster_red';
  if (raw === 'spymaster_blue' || raw === 'blue_captain') return 'spymaster_blue';
  if (raw === 'referee') return 'referee';
  if (raw === 'audience') return 'audience';
  return null;
}

function getInitialSession(): SavedSession {
  if (typeof window === 'undefined') {
    return { roomId: 'ELITE-1', role: 'audience', started: false };
  }
  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get('room')?.trim().toUpperCase();
  const urlRole = normalizeClientRoleParam(params.get('role'));
  const urlPin = params.get('pin') || undefined;
  const urlSeed = params.get('seed') || undefined;
  const urlRound = params.get('round') ? Number(params.get('round')) : undefined;
  const urlStart = params.get('start') as TeamColor | null;
  const autostart = params.get('autostart') === '1';

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSession;
      return {
        roomId: urlRoom || parsed.roomId || 'ELITE-1',
        role: urlRole || (autostart ? 'audience' : parsed.role || 'audience'),
        pin: urlRole ? urlPin ?? parsed.pin : autostart ? undefined : urlPin ?? parsed.pin,
        seed: urlSeed || parsed.seed,
        roundNumber: urlRound || parsed.roundNumber || 1,
        startingTeam: urlStart === 'red' || urlStart === 'blue' ? urlStart : parsed.startingTeam,
        started: autostart || Boolean(urlRole) || Boolean(parsed.started),
      };
    }
  } catch {
    // ignore storage errors
  }

  return {
    roomId: urlRoom || 'ELITE-1',
    role: urlRole || 'audience',
    pin: urlPin,
    seed: urlSeed,
    roundNumber: urlRound || 1,
    startingTeam: urlStart === 'red' || urlStart === 'blue' ? urlStart : undefined,
    started: autostart || Boolean(urlRole),
  };
}

export default function App() {
  const initialSession = getInitialSession();
  const [roomId, setRoomId] = useState<string>(initialSession.roomId);
  const [role, setRole] = useState<ClientRole>(initialSession.role);
  const [pin, setPin] = useState<string | undefined>(initialSession.pin);
  const [inTitleScreen, setInTitleScreen] = useState<boolean>(!initialSession.started);

  // Local authoritative state fallback (used when deployed on static hosting like GitHub Pages without Node backend)
  const localServerStateRef = useRef<ServerGameState>(
    createGameRound({
      roomId: initialSession.roomId,
      roundSeed: initialSession.seed,
      spymasterPin: initialSession.pin,
      roundNumber: initialSession.roundNumber,
      startingTeam: initialSession.startingTeam,
    })
  );

  const [gameState, setGameState] = useState<ClientGameState>(() =>
    sanitizeStateForRole(localServerStateRef.current, initialSession.role)
  );
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [quickClueWord, setQuickClueWord] = useState<string>('');
  const [quickClueCount, setQuickClueCount] = useState<number | 'unlimited'>(2);
  const [actionBannerError, setActionBannerError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const prevLogIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const toSave: SavedSession = {
        roomId,
        role,
        pin,
        seed: gameState.roundSeed,
        roundNumber: gameState.roundNumber,
        startingTeam: gameState.startingTeam,
        started: !inTitleScreen,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [roomId, role, pin, gameState.roundSeed, gameState.roundNumber, gameState.startingTeam, inTitleScreen]);

  useEffect(() => {
    if (inTitleScreen) {
      document.body.dataset.state = 'title';
    } else if (gameState.status === 'paused') {
      document.body.dataset.state = 'paused';
    } else if (gameState.status === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [inTitleScreen, gameState.status]);

  // Trigger procedural Web Audio feedback when new events arrive
  useEffect(() => {
    const latestEvent = gameState.eventLog[0];
    if (!latestEvent) return;
    if (prevLogIdRef.current === null) {
      prevLogIdRef.current = latestEvent.id;
      return;
    }
    if (prevLogIdRef.current === latestEvent.id) return;
    prevLogIdRef.current = latestEvent.id;

    const soundOn = gameState.settings.soundEnabled;
    if (latestEvent.type === 'clue') {
      soundFX.playClueDeclared(soundOn);
    } else if (latestEvent.type === 'gameover') {
      if (latestEvent.cardColor === 'black') {
        soundFX.playBlackCardReveal(soundOn);
      } else {
        soundFX.playVictory(soundOn);
      }
    } else if (latestEvent.type === 'reveal' || latestEvent.type === 'penalty') {
      soundFX.playCardFlip(soundOn);
      if (latestEvent.cardColor === 'neutral') {
        soundFX.playNeutralReveal(soundOn);
      } else if (latestEvent.cardColor === gameState.currentTurn) {
        soundFX.playCorrectReveal(soundOn);
      } else {
        soundFX.playOpponentReveal(soundOn);
      }
    }
  }, [gameState.eventLog, gameState.currentTurn, gameState.settings.soundEnabled]);

  const fetchRoomStateHttp = useCallback(
    async (targetRoom = roomId, targetRole = role, targetPin = pin) => {
      try {
        const q = new URLSearchParams({
          role: targetRole,
          ...(targetPin ? { pin: targetPin } : {}),
        });
        const res = await fetch(`/api/rooms/${encodeURIComponent(targetRoom)}?${q.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.ok && data.state) {
          setGameState(data.state);
        }
      } catch {
        // Static hosting (GitHub Pages) fallback: use deterministic localServerStateRef
        setGameState(sanitizeStateForRole(localServerStateRef.current, targetRole));
      }
    },
    [roomId, role, pin]
  );

  // Connect WebSocket for instant multi-device synchronization
  useEffect(() => {
    fetchRoomStateHttp(roomId, role, pin);

    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          ws.send(
            JSON.stringify({
              type: 'join',
              roomId,
              role,
              pin,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(String(event.data));
            if (msg.type === 'state_sync' && msg.state) {
              setGameState(msg.state);
              if (msg.state.role && msg.state.role !== role) {
                setRole(msg.state.role);
              }
            } else if (msg.type === 'action_error' && msg.error) {
              setActionBannerError(msg.error);
              setTimeout(() => setActionBannerError(null), 4000);
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 2500);
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, role, pin, fetchRoomStateHttp]);

  // Execute action on server with automatic static-hosting fallback
  const dispatchAction = useCallback(
    async (
      payload: RoomActionPayload
    ): Promise<{ ok: boolean; error?: string; meta?: Record<string, unknown> }> => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            role,
            pin,
          }),
        });
        const data = await res.json();
        if (data?.state) {
          setGameState(data.state);
        }
        if (!res.ok || !data?.ok) {
          const errText = data?.error || 'تعذر تنفيذ الإجراء.';
          setActionBannerError(errText);
          setTimeout(() => setActionBannerError(null), 4000);
          return { ok: false, error: errText };
        }
        return { ok: true, meta: data.meta };
      } catch {
        // Offline / GitHub Pages static fallback execution
        const local = localServerStateRef.current;
        if (payload.action === 'give_clue') {
          const r = giveClue(local, payload.word || '', payload.count ?? 1);
          if (!r.ok) return { ok: false, error: r.error };
          localServerStateRef.current = r.state;
        } else if (payload.action === 'reveal_card') {
          const r = revealCard(local, Number(payload.cardIndex), { forceByReferee: role === 'referee' });
          if (!r.ok) return { ok: false, error: r.error };
          localServerStateRef.current = r.state;
        } else if (payload.action === 'end_turn') {
          const r = endTurn(local);
          if (!r.ok) return { ok: false, error: r.error };
          localServerStateRef.current = r.state;
        } else if (payload.action === 'penalty_invalid_clue') {
          const r = applyInvalidCluePenalty(local);
          if (!r.ok) return { ok: false, error: r.error };
          localServerStateRef.current = r.state;
        } else if (payload.action === 'undo') {
          const r = undoLastAction(local);
          if (!r.ok) return { ok: false, error: r.error };
          localServerStateRef.current = r.state;
        } else if (payload.action === 'restart_round') {
          localServerStateRef.current = restartCurrentRound(local);
        } else if (payload.action === 'new_round') {
          const freshPin = generateDynamicPin();
          localServerStateRef.current = createGameRound({
            roomId: local.roomId,
            spymasterPin: freshPin,
            refereePin: local.refereePin,
            roundNumber: local.roundNumber + 1,
            settings: local.settings,
          });
        } else if (payload.action === 'regenerate_pin') {
          const freshPin = generateDynamicPin();
          localServerStateRef.current = { ...local, spymasterPin: freshPin };
          setGameState(sanitizeStateForRole(localServerStateRef.current, role));
          return { ok: true, meta: { spymasterPin: freshPin } };
        }
        setGameState(sanitizeStateForRole(localServerStateRef.current, role));
        return { ok: true };
      }
    },
    [roomId, role, pin]
  );

  const authenticateRole = useCallback(
    async (
      targetRole: ClientRole,
      targetPin?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (targetRole === 'audience') {
        setRole('audience');
        setPin(undefined);
        setInTitleScreen(false);
        await fetchRoomStateHttp(roomId, 'audience', undefined);
        return { ok: true };
      }
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: targetRole,
            pin: targetPin,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          return { ok: false, error: data?.error || 'رمز الدخول غير صحيح.' };
        }
        setRole(data.role);
        setPin(data.pin || targetPin);
        setGameState(data.state);
        setInTitleScreen(false);
        return { ok: true };
      } catch {
        // Static hosting fallback auth
        setRole(targetRole);
        setPin(targetPin);
        setGameState(sanitizeStateForRole(localServerStateRef.current, targetRole));
        setInTitleScreen(false);
        return { ok: true };
      }
    },
    [roomId, fetchRoomStateHttp]
  );

  const handleRegeneratePin = useCallback(async () => {
    const res = await dispatchAction({ action: 'regenerate_pin' });
    return {
      ok: res.ok,
      spymasterPin: res.meta?.spymasterPin as string | undefined,
    };
  }, [dispatchAction]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (inTitleScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (showShareModal) {
          setShowShareModal(false);
          return;
        }
        if (showSettingsModal) {
          setShowSettingsModal(false);
          return;
        }
        if (gameState.status !== 'gameover') {
          e.preventDefault();
          dispatchAction({ action: 'toggle_pause' });
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        dispatchAction({
          action: 'update_settings',
          settings: { soundEnabled: !gameState.settings.soundEnabled },
        });
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    inTitleScreen,
    showShareModal,
    showSettingsModal,
    gameState.status,
    gameState.settings.soundEnabled,
    dispatchAction,
    toggleFullscreen,
  ]);

  const handleQuickClueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await dispatchAction({
      action: 'give_clue',
      word: quickClueWord,
      count: quickClueCount,
    });
    if (res.ok) {
      setQuickClueWord('');
    }
  };

  if (inTitleScreen) {
    return (
      <TitleScreen
        roomId={roomId}
        onChangeRoomId={(nextId) => setRoomId(nextId || 'ELITE-1')}
        onStartAudience={() => {
          setRole('audience');
          setPin(undefined);
          setInTitleScreen(false);
        }}
        onRequestProtectedRole={authenticateRole}
      />
    );
  }

  const isRedTurn = gameState.currentTurn === 'red';
  const activeTeamName = isRedTurn ? gameState.redTeamName : gameState.blueTeamName;
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <main className="w-screen h-screen overflow-hidden tabletop-felt flex flex-col justify-between select-none">
      {/* Unified Top Perimeter HUD Dock */}
      <div className="shrink-0 w-full bg-stone-950/95 border-b border-amber-200/15 px-3 py-2 sm:px-5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4 z-20">
        {/* Right Zone: Red & Blue Team Score Counters */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            data-testid="red-team-hud"
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
              isRedTurn
                ? 'bg-red-950/90 border-red-500 shadow-[0_0_16px_rgba(220,38,38,0.35)]'
                : 'bg-stone-900/80 border-red-900/40 opacity-80'
            }`}
          >
            <div className="text-right">
              <div className="text-[10px] text-red-300 font-bold leading-none">
                {gameState.startingTeam === 'red' ? '◇ الأحمر · البادئ' : '◇ الفريق الأحمر'}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[115px] sm:max-w-[160px]">
                {gameState.redTeamName}
              </div>
            </div>
            <span
              data-testid="red-remaining-count"
              className="text-2xl sm:text-3xl font-mono font-extrabold text-red-400 tabular-nums px-1"
            >
              {gameState.redRemaining}
            </span>
          </div>

          <div
            data-testid="blue-team-hud"
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
              !isRedTurn
                ? 'bg-blue-950/90 border-blue-500 shadow-[0_0_16px_rgba(37,99,235,0.35)]'
                : 'bg-stone-900/80 border-blue-900/40 opacity-80'
            }`}
          >
            <div className="text-right">
              <div className="text-[10px] text-blue-300 font-bold leading-none">
                {gameState.startingTeam === 'blue' ? '○ الأزرق · البادئ' : '○ الفريق الأزرق'}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[115px] sm:max-w-[160px]">
                {gameState.blueTeamName}
              </div>
            </div>
            <span
              data-testid="blue-remaining-count"
              className="text-2xl sm:text-3xl font-mono font-extrabold text-blue-400 tabular-nums px-1"
            >
              {gameState.blueRemaining}
            </span>
          </div>
        </div>

        {/* Center Zone: Current Turn Indicator & Active Clue Readout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            data-testid="active-turn-banner"
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2.5 ${
              isRedTurn
                ? 'bg-red-900/35 border-red-500/50 text-red-100'
                : 'bg-blue-900/35 border-blue-500/50 text-blue-100'
            }`}
          >
            <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
              الدور الآن: {activeTeamName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs text-amber-300 tabular-nums whitespace-nowrap">
              دور #{gameState.turnsCount}
            </span>
          </div>

          {gameState.currentClue ? (
            <div
              data-testid="current-clue-banner"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center gap-2"
            >
              <span className="text-xs text-amber-200 font-semibold">التلميح:</span>
              <span className="text-sm sm:text-base font-extrabold text-white">
                {gameState.currentClue.word}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-stone-950 font-mono font-extrabold text-xs sm:text-sm tabular-nums">
                {gameState.currentClue.count === 'unlimited'
                  ? '∞'
                  : gameState.currentClue.count}
              </span>
              <span className="text-[11px] font-mono text-stone-300 tabular-nums">
                (متبقي:{' '}
                {gameState.currentClue.guessesAllowed === null
                  ? '∞'
                  : Math.max(
                      0,
                      gameState.currentClue.guessesAllowed -
                        gameState.currentClue.guessesMade
                    )}
                )
              </span>
            </div>
          ) : (
            <span
              data-testid="waiting-clue-label"
              className="hidden xl:inline-block text-xs text-stone-400"
            >
              بانتظار إعلان التلميح أو اختيار البطاقات
            </span>
          )}
        </div>

        {/* Left Zone: Timer, QR Modal Button & Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {gameState.settings.timerEnabled && (
            <div
              data-testid="turn-timer"
              className={`px-3 py-1.5 rounded-xl bg-stone-900 border font-mono font-extrabold text-sm sm:text-base tabular-nums ${
                gameState.timerRemainingSeconds <= 15
                  ? 'border-red-500 text-red-400'
                  : 'border-stone-700 text-amber-300'
              }`}
            >
              {formatTimer(gameState.timerRemainingSeconds)}
            </div>
          )}

          {/* QR & Role Switcher Button */}
          <button
            type="button"
            data-testid="open-qr-modal-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setShowShareModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-200/25 text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>
              {role === 'audience'
                ? 'باركود القائد (QR)'
                : role === 'referee'
                ? 'وضع الحكم · QR'
                : role === 'spymaster_red'
                ? 'القائد الأحمر · QR'
                : 'القائد الأزرق · QR'}
            </span>
          </button>

          {role === 'audience' && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                dispatchAction({ action: 'end_turn' });
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
            >
              إنهاء الدور
            </button>
          )}

          <button
            type="button"
            aria-label="الإعدادات"
            onClick={(e) => {
              e.currentTarget.blur();
              setShowSettingsModal(true);
            }}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            aria-label={gameState.settings.soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
            onClick={(e) => {
              e.currentTarget.blur();
              dispatchAction({
                action: 'update_settings',
                settings: { soundEnabled: !gameState.settings.soundEnabled },
              });
            }}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
          >
            {gameState.settings.soundEnabled ? (
              <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>

          <button
            type="button"
            aria-label="إيقاف مؤقت"
            onClick={(e) => {
              e.currentTarget.blur();
              dispatchAction({ action: 'toggle_pause' });
            }}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {actionBannerError && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-xl bg-red-950 border border-red-400 text-red-200 text-xs sm:text-sm font-bold shadow-xl"
        >
          {actionBannerError}
        </div>
      )}

      {/* Main Viewport Area */}
      <div className="flex-1 w-full min-h-0 flex flex-col">
        {role === 'audience' && (
          <div className="flex-1 w-full h-full flex flex-col p-2 sm:p-4 lg:p-5 gap-2">
            <div className="flex-1 min-h-0">
              <GameBoard
                cards={gameState.cards}
                settings={gameState.settings}
                canClickCards={
                  gameState.status === 'playing' &&
                  gameState.settings.allowAudienceClickInLocalMode
                }
                showSecretKeyOverlay={false}
                onCardClick={(cardIndex) =>
                  dispatchAction({ action: 'reveal_card', cardIndex })
                }
              />
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-stone-950/90 border border-stone-800/80 text-xs">
              <form
                onSubmit={handleQuickClueSubmit}
                className="flex items-center gap-2"
              >
                <span className="text-stone-400 font-semibold hidden sm:inline">
                  إعلان تلميح سريع:
                </span>
                <input
                  type="text"
                  value={quickClueWord}
                  onChange={(e) => setQuickClueWord(e.target.value)}
                  placeholder="كلمة التلميح..."
                  aria-label="كلمة التلميح السريع"
                  className="w-32 sm:w-44 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
                <select
                  value={String(quickClueCount)}
                  onChange={(e) =>
                    setQuickClueCount(
                      e.target.value === 'unlimited'
                        ? 'unlimited'
                        : Number(e.target.value)
                    )
                  }
                  aria-label="رقم التلميح السريع"
                  className="px-2 py-1 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-mono font-bold text-xs"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="0">0</option>
                  <option value="unlimited">∞</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                >
                  إعلان
                </button>
              </form>

              <div className="flex items-center gap-2 text-stone-400">
                <button
                  type="button"
                  disabled={!gameState.canUndo}
                  onClick={() => dispatchAction({ action: 'undo' })}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-35 text-stone-300 font-semibold cursor-pointer"
                >
                  تراجع (Undo)
                </button>
                <button
                  type="button"
                  onClick={() => dispatchAction({ action: 'new_round' })}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 font-semibold cursor-pointer"
                >
                  جولة جديدة
                </button>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] tabular-nums">
                  {wsConnected ? 'متصل لحظيًا' : 'وضع البذرة الرقمية الثابت'} · الغرفة {gameState.roomId}
                </span>
              </div>
            </div>
          </div>
        )}

        {(role === 'spymaster_red' || role === 'spymaster_blue') && (
          <SpymasterView
            gameState={gameState}
            spymasterTeam={role === 'spymaster_red' ? 'red' : 'blue'}
            onSwitchSpymasterTeam={(team: TeamColor) =>
              setRole(team === 'red' ? 'spymaster_red' : 'spymaster_blue')
            }
            onGiveClue={(word, count) =>
              dispatchAction({ action: 'give_clue', word, count })
            }
            onOpenQrModal={() => setShowShareModal(true)}
            onExitToAudience={() => {
              setRole('audience');
              setPin(undefined);
            }}
          />
        )}

        {role === 'referee' && (
          <RefereeView
            gameState={gameState}
            onDispatchAction={dispatchAction}
            onOpenQrModal={() => setShowShareModal(true)}
            onExitToAudience={() => {
              setRole('audience');
              setPin(undefined);
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showShareModal && (
        <RoomShareModal
          roomId={roomId}
          gameState={gameState}
          onClose={() => setShowShareModal(false)}
          onSwitchRole={authenticateRole}
          onRegeneratePin={handleRegeneratePin}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={gameState.settings}
          onUpdateSettings={(partial: Partial<GameSettings>) =>
            dispatchAction({ action: 'update_settings', settings: partial })
          }
          onToggleFullscreen={toggleFullscreen}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      <StatusModal
        gameState={gameState}
        onResume={() => dispatchAction({ action: 'toggle_pause' })}
        onNewRound={() => dispatchAction({ action: 'new_round' })}
        onUndo={() => dispatchAction({ action: 'undo' })}
        onBackToTitle={() => setInTitleScreen(true)}
      />
    </main>
  );
}
