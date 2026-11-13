import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClientGameState,
  ClientRole,
  GAME_MODES_CATALOG,
  GameSettings,
  ServerGameState,
  TeamColor,
  createGameRound,
  sanitizeStateForRole,
} from './game/rules';
import { TitleScreen } from './components/TitleScreen';
import { GameBoard } from './components/GameBoard';
import { SpymasterView } from './components/SpymasterView';
import { RefereeView } from './components/RefereeView';
import { BroadcastMotionSystem } from './components/BroadcastOverlay';
import {
  CinematicClueOverlay,
  RoomShareModal,
  SettingsModal,
  StatusModal,
} from './components/Modals';
import { soundFX } from './utils/sound';
import { RoomActionPayload } from '../server';

const SESSION_STORAGE_KEY = 'elite_clash_codenames_session_v3';

interface SavedSession {
  roomId: string;
  role: ClientRole;
  pin?: string;
  sessionToken?: string;
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
        sessionToken: urlRole && urlPin ? undefined : parsed.sessionToken,
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
  const [sessionToken, setSessionToken] = useState<string | undefined>(
    initialSession.sessionToken
  );
  const [inTitleScreen, setInTitleScreen] = useState<boolean>(!initialSession.started);

  const initialPreviewStateRef = useRef<ServerGameState>(
    createGameRound({
      roomId: initialSession.roomId,
      roundNumber: initialSession.roundNumber,
      startingTeam: initialSession.startingTeam,
    })
  );

  const [gameState, setGameState] = useState<ClientGameState>(() =>
    sanitizeStateForRole(initialPreviewStateRef.current, 'audience')
  );
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCinematicClue, setShowCinematicClue] = useState<boolean>(false);
  const [dismissedRoundStatus, setDismissedRoundStatus] = useState<string | null>(null);
  const [showRefereeRoundStatus, setShowRefereeRoundStatus] = useState(false);
  const [actionBannerError, setActionBannerError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const prevLogIdRef = useRef<string | null>(null);
  const prevBroadcastIdRef = useRef<string | null>(null);
  const lastClueDeclaredAtRef = useRef<number | null>(null);

  // Preload sound effects on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundFX.preloadAll();
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Persist sanitized session state (never stores roundSeed)
  useEffect(() => {
    try {
      const toSave: SavedSession = {
        roomId,
        role,
        pin,
        sessionToken,
        roundNumber: gameState.roundNumber,
        startingTeam: gameState.startingTeam,
        started: !inTitleScreen,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [roomId, role, pin, sessionToken, gameState.roundNumber, gameState.startingTeam, inTitleScreen]);

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

  // Trigger studio sound feedback when new events arrive
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
    } else if (latestEvent.type === 'end_turn') {
      soundFX.playTurnChange(soundOn);
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

  // Trigger broadcast stinger sounds for near_victory and time_up
  useEffect(() => {
    const banner = gameState.activeBroadcast;
    if (!banner) return;
    if (prevBroadcastIdRef.current === banner.id) return;
    prevBroadcastIdRef.current = banner.id;

    const soundOn = gameState.settings.soundEnabled;
    if (banner.type === 'near_victory') {
      soundFX.playNearVictory(soundOn);
    } else if (banner.type === 'time_up') {
      soundFX.playTimeUp(soundOn);
    }
  }, [gameState.activeBroadcast, gameState.settings.soundEnabled]);

  // Trigger dramatic full-screen CinematicClueOverlay on the Projector/Audience screen whenever a new clue is declared
  useEffect(() => {
    const declaredAt = gameState.currentClue?.declaredAt ?? null;
    if (!declaredAt) {
      lastClueDeclaredAtRef.current = null;
      setShowCinematicClue(false);
      return;
    }
    if (lastClueDeclaredAtRef.current !== declaredAt) {
      lastClueDeclaredAtRef.current = declaredAt;
      // Only auto-open the heavy full-screen spotlight on the Audience/Projector screen so Captain/Referee phones never freeze
      if (role === 'audience' && gameState.settings.broadcastEffectsEnabled) {
        setShowCinematicClue(true);
        const timer = setTimeout(() => {
          setShowCinematicClue(false);
        }, 4200);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.currentClue?.declaredAt, role, gameState.settings.broadcastEffectsEnabled]);

  const roleRef = useRef<ClientRole>(role);
  const pinRef = useRef<string | undefined>(pin);
  const sessionTokenRef = useRef<string | undefined>(sessionToken);

  useEffect(() => {
    roleRef.current = role;
    pinRef.current = pin;
    sessionTokenRef.current = sessionToken;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'join',
          roomId,
          role,
          pin,
          sessionToken,
        })
      );
    }
  }, [roomId, role, pin, sessionToken]);

  const fetchRoomStateHttp = useCallback(
    async (
      targetRoom = roomId,
      targetRole = roleRef.current,
      targetPin = pinRef.current,
      targetToken = sessionTokenRef.current
    ) => {
      try {
        const q = new URLSearchParams({
          role: targetRole,
          ...(targetPin ? { pin: targetPin } : {}),
          ...(targetToken ? { sessionToken: targetToken } : {}),
        });
        const res = await fetch(`/api/rooms/${encodeURIComponent(targetRoom)}?${q.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.ok && data.state) {
          // If client requested a privileged role (e.g. via QR link or saved session)
          if (targetRole !== 'audience') {
            if (data.authorized === false || data.authOk === false || data.state.role === 'audience') {
              // Auto-claim/refresh session token so organizer/captain never gets stuck after server restart
              const claimRes = await fetch(
                `/api/rooms/${encodeURIComponent(targetRoom)}/claim-organizer`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    keepAudienceState: false,
                    enableAudienceClick: true,
                  }),
                }
              ).then((r) => r.json());
              if (claimRes?.ok) {
                sessionTokenRef.current = claimRes.sessionToken;
                setSessionToken(claimRes.sessionToken);
                if (targetRole === 'referee') {
                  pinRef.current = claimRes.refereePin;
                  setPin(claimRes.refereePin);
                  setGameState(claimRes.state);
                  return;
                } else if (claimRes.spymasterPin) {
                  pinRef.current = claimRes.spymasterPin;
                  setPin(claimRes.spymasterPin);
                  const authSpy = await fetch(
                    `/api/rooms/${encodeURIComponent(targetRoom)}/auth`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        role: targetRole,
                        pin: claimRes.spymasterPin,
                      }),
                    }
                  ).then((r) => r.json());
                  if (authSpy?.ok) {
                    sessionTokenRef.current = authSpy.sessionToken;
                    setSessionToken(authSpy.sessionToken);
                    setGameState(authSpy.state);
                    return;
                  }
                }
              }
              // Stale PIN or revoked session: fall back cleanly to audience so UI is never half-authenticated
              roleRef.current = 'audience';
              setRole('audience');
              setPin(undefined);
              setSessionToken(undefined);
              setGameState(data.state);
              return;
            }
            // If authorized via PIN (e.g. from QR link) but missing sessionToken, upgrade to sessionToken
            if (!targetToken && targetPin) {
              fetch(`/api/rooms/${encodeURIComponent(targetRoom)}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: targetRole, pin: targetPin }),
              })
                .then((r) => r.json())
                .then((authData) => {
                  if (authData?.ok && authData.sessionToken) {
                    sessionTokenRef.current = authData.sessionToken;
                    setSessionToken(authData.sessionToken);
                  }
                })
                .catch(() => {});
            }
          }
          setGameState(data.state);
        }
      } catch {
        // Silent background retry via WebSocket without sticky error banner
      }
    },
    [roomId]
  );

  // Connect persistent WebSocket per roomId
  useEffect(() => {
    fetchRoomStateHttp(roomId, roleRef.current, pinRef.current, sessionTokenRef.current);

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
          setActionBannerError(null);
          ws.send(
            JSON.stringify({
              type: 'join',
              roomId,
              role: roleRef.current,
              pin: pinRef.current,
              sessionToken: sessionTokenRef.current,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(String(event.data));
            if (msg.type === 'timer_tick' && typeof msg.timerRemainingSeconds === 'number') {
              setGameState((prev) =>
                prev.timerRemainingSeconds === msg.timerRemainingSeconds
                  ? prev
                  : { ...prev, timerRemainingSeconds: msg.timerRemainingSeconds }
              );
            } else if (msg.type === 'state_sync' && msg.state) {
              setGameState(msg.state);
              if (
                msg.state.spymasterPin &&
                (roleRef.current === 'spymaster_red' || roleRef.current === 'spymaster_blue')
              ) {
                pinRef.current = msg.state.spymasterPin;
                setPin(msg.state.spymasterPin);
              }
              if (
                msg.authOk === false &&
                msg.state.role === 'audience' &&
                roleRef.current !== 'audience'
              ) {
                roleRef.current = 'audience';
                setRole('audience');
                setSessionToken(undefined);
                setActionBannerError(
                  'انتهت صلاحية الجلسة أو تم تغيير رمز الجولة. يرجى إعادة تسجيل الدخول.'
                );
                setTimeout(() => setActionBannerError(null), 4500);
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
  }, [roomId, fetchRoomStateHttp]);

  // Execute action on authoritative server (never silently mutates local state on failure)
  const dispatchAction = useCallback(
    async (
      payload: RoomActionPayload
    ): Promise<{ ok: boolean; error?: string; meta?: Record<string, unknown> }> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ...payload,
            role: roleRef.current,
            pin: pinRef.current,
            sessionToken: sessionTokenRef.current,
          }),
        });
        clearTimeout(timeoutId);
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
        const errText = 'تعذر الاتصال بالسيرفر لتنفيذ الإجراء. تأكد من اتصالك بالشبكة.';
        setActionBannerError(errText);
        setTimeout(() => setActionBannerError(null), 4000);
        fetchRoomStateHttp(roomId, roleRef.current, pinRef.current, sessionTokenRef.current);
        return { ok: false, error: errText };
      }
    },
    [roomId, fetchRoomStateHttp]
  );

  // Strict server-verified role authentication (no silent local fallback)
  const authenticateRole = useCallback(
    async (
      targetRole: ClientRole,
      targetPin?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (targetRole === 'audience') {
        roleRef.current = 'audience';
        setRole('audience');
        setInTitleScreen(false);
        await fetchRoomStateHttp(roomId, 'audience', pinRef.current, sessionTokenRef.current);
        return { ok: true };
      }
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: targetRole,
            pin: targetPin,
            sessionToken: sessionTokenRef.current,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          return { ok: false, error: data?.error || 'رمز الدخول غير صحيح.' };
        }
        const resolvedPin = data.pin || targetPin;
        roleRef.current = data.role;
        pinRef.current = resolvedPin;
        sessionTokenRef.current = data.sessionToken;
        setRole(data.role);
        setPin(resolvedPin);
        setSessionToken(data.sessionToken);
        setGameState(data.state);
        setInTitleScreen(false);
        return { ok: true };
      } catch {
        return { ok: false, error: 'تعذر الاتصال بالسيرفر للتحقق من رمز الدخول.' };
      }
    },
    [roomId, fetchRoomStateHttp]
  );

  // Claim Organizer / Referee authority on room
  const claimOrganizer = useCallback(
    async (
      keepAudienceState = false
    ): Promise<{
      ok: boolean;
      refereePin?: string;
      spymasterPin?: string;
      error?: string;
    }> => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/claim-organizer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keepAudienceState,
            enableAudienceClick: true,
            pin: pinRef.current,
            sessionToken: sessionTokenRef.current,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          return {
            ok: false,
            error:
              data?.error ||
              'تعذر تفعيل صلاحية الحكم. يرجى المحاولة مرة أخرى.',
          };
        }
        sessionTokenRef.current = data.sessionToken;
        setSessionToken(data.sessionToken);
        if (data.refereePin) {
          pinRef.current = data.refereePin;
          setPin(data.refereePin);
        }
        if (!keepAudienceState) {
          roleRef.current = 'referee';
          setRole('referee');
        } else {
          roleRef.current = 'audience';
          setRole('audience');
        }
        if (data.state) {
          setGameState(data.state);
        }
        setInTitleScreen(false);
        return {
          ok: true,
          refereePin: data.refereePin,
          spymasterPin: data.spymasterPin,
        };
      } catch {
        return { ok: false, error: 'تعذر الاتصال بالسيرفر لتفعيل صلاحية المنظم.' };
      }
    },
    [roomId]
  );

  // Start Audience / Projector View (automatically claims organizer token in background so cards & QR work immediately)
  const handleStartAudienceView = useCallback(async () => {
    roleRef.current = 'audience';
    setRole('audience');
    setInTitleScreen(false);
    try {
      const claimRes = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/claim-organizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keepAudienceState: true,
          enableAudienceClick: true,
          sessionToken: sessionTokenRef.current,
        }),
      }).then((r) => r.json());
      if (claimRes?.ok && claimRes.sessionToken) {
        sessionTokenRef.current = claimRes.sessionToken;
        setSessionToken(claimRes.sessionToken);
        if (claimRes.refereePin) {
          pinRef.current = claimRes.refereePin;
          setPin(claimRes.refereePin);
        }
        if (claimRes.state) {
          setGameState(claimRes.state);
          return;
        }
      }
    } catch {
      // ignore
    }
    await fetchRoomStateHttp(roomId, 'audience', pinRef.current, sessionTokenRef.current);
  }, [roomId, fetchRoomStateHttp]);

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

  const toggleSound = () => {
    soundFX.setMuted(gameState.settings.soundEnabled);
    if (role === 'referee' || sessionToken) {
      dispatchAction({
        action: 'update_settings',
        settings: { soundEnabled: !gameState.settings.soundEnabled },
      });
    }
  };

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
        if (role === 'referee' && gameState.status !== 'gameover') {
          e.preventDefault();
          dispatchAction({ action: 'toggle_pause' });
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        soundFX.setMuted(gameState.settings.soundEnabled);
        if (role === 'referee') {
          dispatchAction({
            action: 'update_settings',
            settings: { soundEnabled: !gameState.settings.soundEnabled },
          });
        }
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
    role,
    gameState.status,
    gameState.settings.soundEnabled,
    dispatchAction,
    toggleFullscreen,
  ]);

  useEffect(() => {
    setDismissedRoundStatus(null);
    setShowRefereeRoundStatus(false);
  }, [gameState.roomId, gameState.roundNumber, gameState.status]);

  if (inTitleScreen) {
    return (
      <TitleScreen
        roomId={roomId}
        activeMode={gameState.settings.gameMode}
        onChangeRoomId={(nextId) => setRoomId(nextId || 'ELITE-1')}
        onStartAudience={handleStartAudienceView}
        onRequestProtectedRole={authenticateRole}
        onClaimOrganizer={() => claimOrganizer(false)}
      />
    );
  }

  const isCooperative = gameState.settings.gameMode === 'cooperative';
  const isRedTurn = gameState.currentTurn === 'red';
  const activeTeamName = isRedTurn ? gameState.redTeamName : gameState.blueTeamName;
  const activeModeMeta =
    GAME_MODES_CATALOG[gameState.settings.gameMode] ||
    GAME_MODES_CATALOG.classic;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <main className={`w-full overflow-hidden tabletop-felt flex flex-col justify-between select-none ${role === 'referee' ? 'h-dvh' : 'h-screen'}`}>
      {/* Unified Top Perimeter HUD Dock */}
      {role !== 'referee' && (
        <div className="shrink-0 w-full bg-stone-950/95 border-b border-amber-200/15 px-3 py-2 sm:px-5 sm:py-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 sm:gap-3 z-20">
          {/* Right Zone: Red & Blue Team Score Counters (or Cooperative Target Counter) */}
          <div className="flex items-center gap-2 shrink-0">
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
                  {isCooperative
                    ? '◇ الأهداف المشتركة المتبقية'
                    : gameState.startingTeam === 'red'
                    ? '◇ الأحمر · البادئ'
                    : '◇ الفريق الأحمر'}
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

            {isCooperative ? (
              <div
                data-testid="coop-turns-hud"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border bg-amber-950/60 border-amber-500/60"
              >
                <div className="text-right">
                  <div className="text-[10px] text-amber-300 font-bold leading-none">
                    الطور التعاوني
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    الأدوار المتبقية
                  </div>
                </div>
                <span
                  data-testid="coop-turns-remaining"
                  className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-300 tabular-nums px-1"
                >
                  {gameState.coopTurnsRemaining ?? 0}
                </span>
              </div>
            ) : (
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
            )}
          </div>

          {/* Center Zone: Current Turn Indicator & Active Clue Readout */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-full">
            <div
              data-testid="active-turn-banner"
              className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2.5 ${
                isRedTurn
                  ? 'bg-red-900/35 border-red-500/50 text-red-100'
                  : 'bg-blue-900/35 border-blue-500/50 text-blue-100'
              }`}
            >
              <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
                {isCooperative ? 'المهمة التعاونية' : `الدور الآن: ${activeTeamName}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs text-amber-300 tabular-nums whitespace-nowrap">
                دور #{gameState.turnsCount}
              </span>
            </div>

            {gameState.currentClue ? (
              <button
                type="button"
                data-testid="current-clue-banner"
                onClick={() => setShowCinematicClue(true)}
                title="انقر لإعادة عرض التلميح بحجم سينمائي على الشاشة"
                className={`px-3.5 py-1.5 rounded-xl border-2 flex items-center gap-2.5 shadow-lg cursor-pointer transition-all hover:scale-[1.02] ${
                  gameState.currentClue.team === 'red'
                    ? 'bg-gradient-to-r from-red-950/95 via-stone-900 to-red-950/95 border-red-400/80 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                    : 'bg-gradient-to-r from-blue-950/95 via-stone-900 to-blue-950/95 border-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                }`}
              >
                <span className="text-[11px] text-amber-300 font-extrabold uppercase tracking-wider">
                  التلميح:
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F2] text-stone-950 text-sm sm:text-lg font-black tracking-tight shadow-sm">
                  {gameState.currentClue.word}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-xs sm:text-base tabular-nums border ${
                    gameState.currentClue.team === 'red'
                      ? 'bg-red-600 text-white border-red-300'
                      : 'bg-blue-600 text-white border-blue-300'
                  }`}
                >
                  {gameState.currentClue.count === 'unlimited'
                    ? '∞'
                    : gameState.currentClue.count}
                </span>
                <span className="text-[11px] font-mono text-amber-200 font-bold tabular-nums hidden sm:inline">
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 font-bold hidden md:inline">
                  تكبير
                </span>
              </button>
            ) : (
              <span
                data-testid="waiting-clue-label"
                className="hidden xl:inline-block text-xs text-stone-400"
              >
                بانتظار إعلان التلميح من القائد أو اختيار البطاقات
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
              <svg
                className="w-3.5 h-3.5 text-amber-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>
                {role === 'audience'
                  ? 'باركود القائد / الحكم (QR)'
                  : role === 'spymaster_red'
                  ? 'القائد الأحمر · QR'
                  : 'القائد الأزرق · QR'}
              </span>
            </button>

            {role === 'audience' ? (
              <button
                type="button"
                data-testid="quick-referee-toggle-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  claimOrganizer(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-400/35 text-xs font-extrabold cursor-pointer whitespace-nowrap"
              >
                لوحة الحكم
              </button>
            ) : (
              <button
                type="button"
                data-testid="quick-audience-toggle-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  roleRef.current = 'audience';
                  setRole('audience');
                  setGameState((prev) => ({
                    ...prev,
                    role: 'audience',
                    cards: prev.cards.map((c) => ({ ...c, secretColor: undefined })),
                  }));
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
              >
                شاشة اللعب (إخفاء المفتاح)
              </button>
            )}

            {role === 'audience' &&
              (gameState.settings.allowAudienceClickInLocalMode || Boolean(sessionToken)) && (
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
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            <button
              type="button"
              aria-label={gameState.settings.soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
              onClick={(e) => {
                e.currentTarget.blur();
                toggleSound();
              }}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
            >
              {gameState.settings.soundEnabled ? (
                <svg
                  className="w-4 h-4 text-amber-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-stone-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {actionBannerError && (
        <div
          role="alert"
          data-testid="action-banner-error"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-xl bg-red-950 border border-red-400 text-red-200 text-xs sm:text-sm font-bold shadow-xl"
        >
          {actionBannerError}
        </div>
      )}

      {/* TV Broadcast Motion System Overlay (Audience / Projector Only) */}
      {role === 'audience' && (
        <BroadcastMotionSystem
          gameState={gameState}
          onDismiss={() => {
            if (gameState.settings.allowAudienceClickInLocalMode || Boolean(sessionToken)) {
              dispatchAction({ action: 'skip_broadcast' });
            }
          }}
        />
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
                  (gameState.settings.allowAudienceClickInLocalMode || Boolean(sessionToken))
                }
                showSecretKeyOverlay={false}
                onCardClick={(cardIndex) =>
                  dispatchAction({ action: 'reveal_card', cardIndex })
                }
              />
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-stone-950/90 border border-stone-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-stone-300">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 font-bold">
                  {activeModeMeta.nameAr} ({activeModeMeta.gridCols}×{activeModeMeta.gridCols})
                </span>
                <span aria-hidden="true">·</span>
                {gameState.settings.allowAudienceClickInLocalMode || Boolean(sessionToken) ? (
                  <span className="text-stone-300">
                    انقر مباشرةً على أي بطاقة لكشفها
                  </span>
                ) : (
                  <span className="text-amber-300 font-semibold">
                    كشف البطاقات محصور بهاتف الحكم حاليًا
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-stone-400">
                {sessionToken && (
                  <>
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
                  </>
                )}
                <span className="font-mono text-[11px] tabular-nums">
                  {wsConnected ? 'متصل لحظيًا بالسيرفر' : 'جارٍ إعادة الاتصال...'} · الغرفة{' '}
                  {gameState.roomId} · الجولة #{gameState.roundNumber}
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
              authenticateRole(
                team === 'red' ? 'spymaster_red' : 'spymaster_blue',
                pin || gameState.spymasterPin
              )
            }
            onGiveClue={(word, count) =>
              dispatchAction({ action: 'give_clue', word, count })
            }
            onOpenQrModal={() => setShowShareModal(true)}
            onExitToAudience={() => {
              roleRef.current = 'audience';
              setRole('audience');
              setGameState((prev) => ({
                ...prev,
                role: 'audience',
                cards: prev.cards.map((c) => ({ ...c, secretColor: undefined })),
              }));
            }}
          />
        )}

        {role === 'referee' && (
          <RefereeView
            gameState={gameState}
            wsConnected={wsConnected}
            onOpenSettings={() => setShowSettingsModal(true)}
            onReplayClue={() => setShowCinematicClue(true)}
            onShowRoundStatus={() => setShowRefereeRoundStatus(true)}
            onToggleSound={toggleSound}
            sessionToken={sessionToken}
            pin={pin}
            onDispatchAction={dispatchAction}
            onOpenQrModal={() => setShowShareModal(true)}
            onExitToAudience={() => {
              roleRef.current = 'audience';
              setRole('audience');
              setGameState((prev) => ({
                ...prev,
                role: 'audience',
                cards: prev.cards.map((c) => ({ ...c, secretColor: undefined })),
              }));
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showShareModal && (
        <RoomShareModal
          roomId={roomId}
          gameState={gameState}
          sessionToken={sessionToken}
          pin={pin}
          onClose={() => setShowShareModal(false)}
          onSwitchRole={authenticateRole}
          onClaimOrganizer={claimOrganizer}
          onRegeneratePin={handleRegeneratePin}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={gameState.settings}
          canEditSettings={role === 'referee' || Boolean(sessionToken)}
          onUpdateSettings={(partial: Partial<GameSettings>) =>
            dispatchAction({ action: 'update_settings', settings: partial })
          }
          onToggleFullscreen={toggleFullscreen}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showCinematicClue && gameState.currentClue && (
        <CinematicClueOverlay
          gameState={gameState}
          onDismiss={() => setShowCinematicClue(false)}
        />
      )}

      {(role !== 'referee' ||
        showRefereeRoundStatus ||
        (gameState.status === 'gameover' && dismissedRoundStatus !== gameState.endedAt?.toString())) && (
        <StatusModal
          gameState={gameState}
          onClose={role === 'referee' ? () => {
            setShowRefereeRoundStatus(false);
            setDismissedRoundStatus(gameState.endedAt?.toString() ?? null);
          } : undefined}
          canControlMatch={
            role === 'referee' ||
            (role === 'audience' && gameState.settings.allowAudienceClickInLocalMode)
          }
          onResume={() => dispatchAction({ action: 'toggle_pause' })}
          onNewRound={() => dispatchAction({ action: 'new_round' })}
          onUndo={() => dispatchAction({ action: 'undo' })}
          onBackToTitle={() => setInTitleScreen(true)}
        />
      )}
    </main>
  );
}
