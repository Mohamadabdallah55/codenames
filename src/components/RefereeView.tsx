import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowRight, BookOpen, ChevronDown, Clock3, Eye, EyeOff, Gamepad2, Grid3X3,
  KeyRound, ListChecks, Maximize2, MessageSquarePlus, Monitor, MousePointer2,
  Pause, Play, Plus, QrCode, RotateCcw, Settings2, ShieldCheck, SkipForward,
  SlidersHorizontal, Sparkles, TriangleAlert, Trophy, Undo2, Users,
  Volume2, VolumeX, Wifi, WifiOff,
} from 'lucide-react';
import './referee.css';
import {
  ALL_WORD_CATEGORIES,
  ClientGameState,
  ELITE_CLASH_TEAMS,
  EliteTeamCode,
  GAME_MODES_CATALOG,
  GameMode,
  TeamColor,
  TournamentCompetition,
  TournamentStandingRow,
  WORD_PACKS_CATALOG,
  WordAgeGroup,
  WordCategory,
  WordDifficulty,
  WordPackId,
} from '../game/rules';
import { WordEntry } from '../data/words';
import { GameBoard } from './GameBoard';
import { RoomActionPayload } from '../../server';

interface RefereeViewProps {
  gameState: ClientGameState;
  sessionToken?: string;
  pin?: string;
  onDispatchAction: (payload: RoomActionPayload) => Promise<{
    ok: boolean;
    error?: string;
    meta?: Record<string, unknown>;
  }>;
  onOpenQrModal: () => void;
  onExitToAudience: () => void;
  wsConnected: boolean;
  onOpenSettings: () => void;
  onToggleSound: () => void;
  onReplayClue: () => void;
  onShowRoundStatus: () => void;
}

interface WordCatalogItem extends WordEntry {
  isCustom?: boolean;
}

interface TournamentWithStandings extends TournamentCompetition {
  standings: TournamentStandingRow[];
}

const REFEREE_TABS = [
  { id: 'controls', label: 'التحكم', icon: SlidersHorizontal },
  { id: 'modes', label: 'الأوضاع', icon: Gamepad2 },
  { id: 'board', label: 'اللوحة', icon: Grid3X3 },
  { id: 'teams', label: 'الفرق', icon: Users },
  { id: 'words', label: 'الكلمات', icon: BookOpen },
  { id: 'tournament', label: 'البطولة', icon: Trophy },
] as const;

export const RefereeView: React.FC<RefereeViewProps> = ({
  gameState,
  sessionToken,
  pin,
  onDispatchAction,
  onOpenQrModal,
  onExitToAudience,
  wsConnected,
  onOpenSettings,
  onToggleSound,
  onReplayClue,
  onShowRoundStatus,
}) => {
  const [showSecretOnRefBoard, setShowSecretOnRefBoard] = useState(true);
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState<number | 'unlimited'>(2);
  const [redCode, setRedCode] = useState<EliteTeamCode>(gameState.redTeamCode);
  const [blueCode, setBlueCode] = useState<EliteTeamCode>(gameState.blueTeamCode);
  const [customRedName, setCustomRedName] = useState(gameState.redTeamName);
  const [customBlueName, setCustomBlueName] = useState(gameState.blueTeamName);
  const [nextStartingTeam, setNextStartingTeam] = useState<TeamColor | 'random'>('random');

  // Modes & Word Packs state
  const [selectedMode, setSelectedMode] = useState<GameMode>(gameState.gameMode || 'classic');
  const [selectedPacks, setSelectedPacks] = useState<WordPackId[]>(
    gameState.settings.selectedPacks || ['elite_classic']
  );
  const [selectedCategories, setSelectedCategories] = useState<WordCategory[]>(
    gameState.settings.selectedCategories || []
  );
  const [ageFilter, setAgeFilter] = useState<WordAgeGroup | 'any'>(
    gameState.settings.ageFilter || 'any'
  );
  const [difficultyFilter, setDifficultyFilter] = useState<WordDifficulty | 'any'>(
    gameState.settings.difficultyFilter || 'any'
  );

  // Word Bank Management state
  const [customWordsInput, setCustomWordsInput] = useState('');
  const [customWordCategory, setCustomWordCategory] = useState<WordCategory>('المفاهيم المجردة');
  const [wordCatalog, setWordCatalog] = useState<WordCatalogItem[]>([]);
  const [wordSearch, setWordSearch] = useState('');
  const [wordCategoryFilter, setWordCategoryFilter] = useState<string>('all');

  // Tournaments & Admin state
  const [tournamentsList, setTournamentsList] = useState<TournamentWithStandings[]>([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newFreeTeamName, setNewFreeTeamName] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [activeRefTab, setActiveRefTab] = useState<(typeof REFEREE_TABS)[number]['id']>('controls');
  const [expandedBoard, setExpandedBoard] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const closeBoardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expandedBoard) return;
    closeBoardRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setExpandedBoard(false);
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => {
      window.removeEventListener('keydown', handleEscape, true);
      returnFocusRef.current?.focus();
    };
  }, [expandedBoard]);

  const showTempFeedback = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Load Word Catalog when Words tab opens
  useEffect(() => {
    if (activeRefTab !== 'words') return;
    fetch(`/api/rooms/${encodeURIComponent(gameState.roomId)}/words`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.words)) {
          setWordCatalog(data.words);
        }
      })
      .catch(() => {});
  }, [activeRefTab, gameState.roomId, gameState.customWordsCount, gameState.disabledWordsCount]);

  // Load Tournaments when Tournament tab opens
  useEffect(() => {
    if (activeRefTab !== 'tournament') return;
    fetch('/api/tournaments')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.tournaments)) {
          setTournamentsList(data.tournaments);
        }
      })
      .catch(() => {});
  }, [activeRefTab, gameState.matchHistory.length]);

  const filteredCatalog = useMemo(() => {
    return wordCatalog
      .filter((w) => {
        if (wordCategoryFilter !== 'all' && w.category !== wordCategoryFilter) return false;
        if (wordSearch.trim()) {
          const q = wordSearch.trim().toLowerCase();
          return w.ar.includes(q) || (w.en || '').toLowerCase().includes(q);
        }
        return true;
      })
      .slice(0, 80);
  }, [wordCatalog, wordCategoryFilter, wordSearch]);

  const handleGiveClue = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onDispatchAction({
      action: 'give_clue',
      word: clueWord,
      count: clueCount,
    });
    if (!res.ok) {
      showTempFeedback('err', res.error || 'تعذر إعلان التلميح');
    } else {
      setClueWord('');
      showTempFeedback('ok', 'تم إعلان التلميح على شاشة الجمهور');
    }
  };

  const handleCardRevealByRef = async (cardIndex: number) => {
    const res = await onDispatchAction({
      action: 'reveal_card',
      cardIndex,
    });
    if (!res.ok && res.error) {
      showTempFeedback('err', res.error);
    }
  };

  const handleStartNewRound = async () => {
    const res = await onDispatchAction({
      action: 'new_round',
      gameMode: selectedMode,
      redTeamCode: redCode,
      redTeamName: customRedName,
      blueTeamCode: blueCode,
      blueTeamName: customBlueName,
      startingTeam: nextStartingTeam,
      settings: {
        gameMode: selectedMode,
        selectedPacks,
        selectedCategories,
        ageFilter,
        difficultyFilter,
      },
    });
    if (res.ok) {
      setShowPins(false);
      showTempFeedback('ok', `بدأت جولة جديدة (${GAME_MODES_CATALOG[selectedMode].nameAr})`);
    }
  };

  const handleRegeneratePin = async () => {
    const res = await onDispatchAction({
      action: 'regenerate_pin',
    });
    if (res.ok) {
      showTempFeedback('ok', 'تم تغيير رمز القائد وإلغاء جلسات القادة السابقة.');
    }
  };

  const handleUpdateTeamsImmediate = async () => {
    const res = await onDispatchAction({
      action: 'update_teams',
      redTeamCode: redCode,
      redTeamName: customRedName,
      blueTeamCode: blueCode,
      blueTeamName: customBlueName,
    });
    if (res.ok) {
      showTempFeedback('ok', 'تم تحديث أسماء الفريقين فورًا');
    }
  };

  const togglePackSelection = (packId: WordPackId) => {
    setSelectedPacks((prev) => {
      if (prev.includes(packId)) {
        return prev.length > 1 ? prev.filter((p) => p !== packId) : prev;
      }
      return [...prev, packId];
    });
  };

  const toggleCategorySelection = (cat: WordCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomWords = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onDispatchAction({
      action: 'add_custom_words',
      customWordsText: customWordsInput,
      customCategory: customWordCategory,
    });
    if (!res.ok) {
      showTempFeedback('err', res.error || 'تعذر إضافة الكلمات');
    } else {
      setCustomWordsInput('');
      const added = res.meta?.addedCount ?? 0;
      showTempFeedback('ok', `تمت إضافة ${added} كلمة مخصصة بنجاح بعد فحص التكرار.`);
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = String(reader.result || '');
      const res = await onDispatchAction({
        action: 'import_words_json',
        jsonContent: content,
      });
      if (!res.ok) {
        showTempFeedback('err', res.error || 'ملف JSON غير صالح');
      } else {
        showTempFeedback(
          'ok',
          `تم استيراد الكلمات بنجاح (إجمالي الكلمات المخصصة: ${res.meta?.totalCustom ?? 0})`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          roomId: gameState.roomId,
          pin,
          sessionToken,
          subAction: 'create',
          name: newTournamentName.trim(),
          organizer: 'مسجد ابن تيمية',
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setTournamentsList(data.tournaments);
        setNewTournamentName('');
        showTempFeedback('ok', 'تم إنشاء المسابقة الجديدة بنجاح');
      }
    } catch {
      showTempFeedback('err', 'تعذر إنشاء المسابقة');
    }
  };

  const handleAddFreeTeamToTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreeTeamName.trim()) return;
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          roomId: gameState.roomId,
          pin,
          sessionToken,
          subAction: 'add_team',
          tournamentId: tournamentsList[0]?.id || 'tour_elite_clash_main',
          teamName: newFreeTeamName.trim(),
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setTournamentsList(data.tournaments);
        setNewFreeTeamName('');
        showTempFeedback('ok', 'تمت إضافة الفريق لقائمة المسابقة');
      }
    } catch {
      showTempFeedback('err', 'تعذر إضافة الفريق');
    }
  };

  const handleExportFullBackup = async () => {
    try {
      const q = new URLSearchParams({
        roomId: gameState.roomId,
        ...(pin ? { pin } : {}),
        ...(sessionToken ? { token: sessionToken } : {}),
      });
      const res = await fetch(`/api/admin/backup?${q.toString()}`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        showTempFeedback('err', data?.error || 'تعذر تصدير النسخة الاحتياطية');
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elite-clash-full-backup-${gameState.roomId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showTempFeedback('ok', 'تم تصدير النسخة الاحتياطية الكاملة بنجاح');
    } catch {
      showTempFeedback('err', 'تعذر تصدير النسخة الاحتياطية');
    }
  };

  const handleRestoreBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({
            roomId: gameState.roomId,
            pin,
            sessionToken,
            backup: parsed,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          showTempFeedback('ok', 'تم استرجاع النسخة الاحتياطية ومزامنة البيانات بنجاح!');
        } else {
          showTempFeedback('err', data?.error || 'تعذر استرجاع النسخة الاحتياطية');
        }
      } catch {
        showTempFeedback('err', 'ملف النسخة الاحتياطية غير صالح');
      }
    };
    reader.readAsText(file);
  };

  const activeTeamName = gameState.currentTurn === 'red' ? gameState.redTeamName : gameState.blueTeamName;
  const cooperative = gameState.gameMode === 'cooperative';
  const modeName = (GAME_MODES_CATALOG[gameState.gameMode] || GAME_MODES_CATALOG.classic).nameAr;
  const timerSeconds = gameState.timerRemainingSeconds;
  const timerLabel = [Math.floor(timerSeconds / 60), timerSeconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  const clue = gameState.currentClue;
  const guessesRemaining = clue?.guessesAllowed == null
    ? '∞'
    : Math.max(0, clue.guessesAllowed - clue.guessesMade);
  const toggleSecret = () => setShowSecretOnRefBoard((value) => !value);
  const selectTab = (tab: typeof activeRefTab) => {
    if (tab === activeRefTab) return;
    setActiveRefTab(tab);
    setShowPins(false);
    panelRef.current?.scrollTo({ top: 0 });
  };
  const expandBoard = (event: React.MouseEvent<HTMLButtonElement>) => {
    returnFocusRef.current = event.currentTarget;
    setShowPins(false);
    setExpandedBoard(true);
  };

  return (
    <div className="referee-workspace" data-testid="referee-view"
      data-tab={activeRefTab} data-expanded={expandedBoard}>
      <div className="referee-shell" inert={expandedBoard}>
        <header className="referee-header">
          <div className="referee-identity">
            <span className="referee-identity-icon"><ShieldCheck aria-hidden="true" /></span>
            <div>
              <span className="referee-brand" lang="en">ELITE CLASH</span>
              <h1>لوحة الحكم</h1>
            </div>
          </div>
          <div className="referee-header-actions">
            <button type="button" className="referee-icon-button" onClick={onOpenSettings}
              aria-label="الإعدادات" title="الإعدادات"><Settings2 /></button>
            <button type="button" className="referee-icon-button" onClick={onToggleSound}
              aria-pressed={gameState.settings.soundEnabled}
              aria-label={gameState.settings.soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
              title={gameState.settings.soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}>
              {gameState.settings.soundEnabled ? <Volume2 /> : <VolumeX />}
            </button>
            <button type="button" className="referee-button referee-audience-button" onClick={onExitToAudience}
              title="الانتقال إلى شاشة اللعب وإخفاء المفتاح السري">
              <Monitor /> شاشة اللعب
            </button>
          </div>
        </header>

        <nav aria-label="أقسام لوحة الحكم" className="referee-tabs">
          {REFEREE_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-current={activeRefTab === id ? 'page' : undefined}
              onClick={() => selectTab(id)}>
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <aside className="referee-sidebar" aria-label="أدوات الحكم" inert={expandedBoard}>
        <div ref={panelRef} className="referee-panel">
          {feedback && (
            <div role="status" className="referee-feedback" data-type={feedback.type}>
              {feedback.text}
            </div>
          )}
          {activeRefTab === 'controls' && (
            <div className="referee-controls">
              <section className="referee-match" aria-labelledby="referee-match-title">
                <div className="referee-match-heading">
                  <div>
                    <p className="referee-caption">
                      الجولة {gameState.roundNumber} · {modeName}
                    </p>
                    <h2 id="referee-match-title">ملخص المباراة</h2>
                  </div>
                  <div className="referee-match-meta">
                    {gameState.status === 'playing' ? (
                      <span className="referee-status" data-status="playing">جارية</span>
                    ) : (
                      <button type="button" className="referee-status" data-status={gameState.status}
                        onClick={onShowRoundStatus}>
                        {gameState.status === 'paused' ? 'متوقفة مؤقتًا' : 'انتهت الجولة'}
                        <ChevronDown size={13} />
                      </button>
                    )}
                    <span className="referee-timer" data-urgent={gameState.settings.timerEnabled && gameState.timerRemainingSeconds <= 15}>
                      <Clock3 size={15} aria-hidden="true" />
                      <span data-testid="turn-timer" dir={gameState.settings.timerEnabled ? 'ltr' : undefined}>
                        {gameState.settings.timerEnabled ? timerLabel : 'المؤقت معطّل'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="referee-teams">
                  <div className="referee-score" data-team="red" data-turn={gameState.currentTurn === 'red'}>
                    <div>
                      <div className="referee-team-label">{cooperative ? 'الأهداف المشتركة' : 'الفريق الأحمر'}</div>
                      <strong data-testid="red-team-hud">{gameState.redTeamName}</strong>
                    </div>
                    <div className="referee-score-count">
                      <b data-testid="red-remaining-count">{gameState.redRemaining}</b>
                      <span>متبقية</span>
                    </div>
                  </div>
                  <div className="referee-score" data-team={cooperative ? 'coop' : 'blue'} data-turn={!cooperative && gameState.currentTurn === 'blue'}>
                    <div>
                      <div className="referee-team-label">{cooperative ? 'المهمة التعاونية' : 'الفريق الأزرق'}</div>
                      <strong data-testid={cooperative ? 'coop-turns-hud' : 'blue-team-hud'}>
                        {cooperative ? 'ميزانية الأدوار' : gameState.blueTeamName}
                      </strong>
                    </div>
                    <div className="referee-score-count">
                      <b data-testid={cooperative ? 'coop-turns-remaining' : 'blue-remaining-count'}>
                        {cooperative ? gameState.coopTurnsRemaining : gameState.blueRemaining}
                      </b>
                      <span>{cooperative ? 'أدوار متبقية' : 'متبقية'}</span>
                    </div>
                  </div>
                </div>

                <div className="referee-turn" data-testid="active-turn-banner">
                  <span><b>الدور الآن</b> {cooperative ? 'المهمة التعاونية' : activeTeamName}</span>
                  <span className="referee-caption">الدور {gameState.turnsCount}</span>
                </div>

                {clue ? (
                  <button type="button" className="referee-current-clue" data-testid="current-clue-banner"
                    onClick={onReplayClue} title="إعادة عرض التلميح بحجم سينمائي">
                    <span>
                      <span className="referee-caption">التلميح الحالي</span>
                      <strong>{clue.word} <b className="referee-clue-count">{clue.count === 'unlimited' ? '∞' : clue.count}</b></strong>
                    </span>
                    <span>المحاولات <b>{guessesRemaining}</b></span>
                    <Maximize2 size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <p className="referee-clue-empty" data-testid="waiting-clue-label">بانتظار التلميح</p>
                )}
              </section>

              <details className="referee-group referee-clue-form">
                <summary><MessageSquarePlus aria-hidden="true" /><span>إدخال تلميح</span><ChevronDown aria-hidden="true" /></summary>
                <form onSubmit={handleGiveClue} className="referee-group-body">
                  <p className="referee-caption">{activeTeamName}</p>
                  <div className="referee-form-row">
                    <input type="text" value={clueWord} onChange={(e) => setClueWord(e.target.value)}
                      placeholder="كلمة التلميح…" aria-label="كلمة التلميح للحكم" />
                    <select value={String(clueCount)}
                      onChange={(e) => setClueCount(e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value))}
                      aria-label="رقم التلميح للحكم">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                        <option key={n} value={String(n)}>{n}</option>
                      ))}
                      <option value="unlimited">∞</option>
                    </select>
                  </div>
                  <button type="submit" className="referee-button referee-button-gold">إعلان التلميح</button>
                </form>
              </details>

              <details className="referee-group">
                <summary><RotateCcw aria-hidden="true" /><span>إدارة الجولة</span><ChevronDown aria-hidden="true" /></summary>
                <div className="referee-group-body referee-action-list">
                  <button type="button" className="referee-button referee-button-danger"
                    onClick={() => onDispatchAction({ action: 'penalty_invalid_clue' })}>
                    <TriangleAlert /> عقوبة تلميح مخالف
                  </button>
                  <button type="button" className="referee-button" onClick={() => onDispatchAction({ action: 'restart_round' })}>
                    <RotateCcw /> إعادة الجولة نفسها
                  </button>
                  <button type="button" className="referee-button" onClick={handleStartNewRound}>
                    <Plus /> جولة جديدة (برمز جديد)
                  </button>
                </div>
              </details>

              <details className="referee-group" onToggle={(e) => {
                if (!e.currentTarget.open) setShowPins(false);
              }}>
                <summary><ShieldCheck aria-hidden="true" /><span>الربط والأمان</span><ChevronDown aria-hidden="true" /></summary>
                <div className="referee-group-body referee-action-list">
                  <button type="button" className="referee-button" onClick={onOpenQrModal}>
                    <QrCode /> QR القائد
                  </button>
                  <button type="button" className="referee-button" aria-expanded={showPins}
                    onClick={() => setShowPins((value) => !value)}>
                    {showPins ? <EyeOff /> : <Eye />}
                    {showPins ? 'إخفاء رموز الدخول' : 'إظهار رموز الدخول'}
                  </button>
                  {showPins && (
                    <dl className="referee-pins" data-testid="referee-pins">
                      <div><dt>رمز الحكم</dt><dd dir="ltr">{gameState.refereePin || '—'}</dd></div>
                      <div><dt>رمز القائد</dt><dd dir="ltr">{gameState.spymasterPin || '—'}</dd></div>
                    </dl>
                  )}
                  <button type="button" className="referee-button" onClick={handleRegeneratePin}
                    title="يلغي جلسات القادة السابقة فورًا ويولد رمزًا جديدًا">
                    <KeyRound /> تدوير الرمز وإلغاء الجلسات
                  </button>
                </div>
              </details>

              <details className="referee-group">
                <summary><Monitor aria-hidden="true" /><span>العرض والمؤثرات</span><ChevronDown aria-hidden="true" /></summary>
                <div className="referee-group-body referee-action-list">
                  <button type="button" className="referee-button referee-switch"
                    aria-pressed={gameState.settings.broadcastEffectsEnabled}
                    onClick={() => onDispatchAction({
                      action: 'update_settings',
                      settings: { broadcastEffectsEnabled: !gameState.settings.broadcastEffectsEnabled },
                    })}>
                    <Sparkles /> <span>مؤثرات البث</span>
                    <b>{gameState.settings.broadcastEffectsEnabled ? 'مفعّلة' : 'معطّلة'}</b>
                  </button>
                  <button type="button" className="referee-button" onClick={() => onDispatchAction({ action: 'skip_broadcast' })}>
                    <SkipForward /> تخطي المؤثر الحالي
                  </button>
                  <button type="button" className="referee-button referee-switch"
                    aria-pressed={gameState.settings.allowAudienceClickInLocalMode}
                    onClick={() => onDispatchAction({
                      action: 'update_settings',
                      settings: { allowAudienceClickInLocalMode: !gameState.settings.allowAudienceClickInLocalMode },
                    })}>
                    <MousePointer2 /> <span>الكشف من شاشة الجمهور</span>
                    <b>{gameState.settings.allowAudienceClickInLocalMode ? 'مسموح' : 'الحكم فقط'}</b>
                  </button>
                  <button type="button" className="referee-button referee-switch" aria-pressed={showSecretOnRefBoard}
                    onClick={toggleSecret}>
                    {showSecretOnRefBoard ? <Eye /> : <EyeOff />} <span>ألوان المفتاح السري</span>
                    <b>{showSecretOnRefBoard ? 'ظاهرة' : 'مخفية'}</b>
                  </button>
                </div>
              </details>

              <details className="referee-group">
                <summary><ListChecks aria-hidden="true" /><span>سجل الأحداث</span><ChevronDown aria-hidden="true" /></summary>
                <ol className="referee-group-body referee-event-log" aria-label="سجل أحداث المباراة">
                  {gameState.eventLog.map((evt) => (
                    <li key={evt.id}>
                      <span>دور {evt.turn}</span>
                      <span>{evt.message}</span>
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          )}
        {/* TAB 2: 6 GAME MODES & WORD PACKS MIXER */}
        {activeRefTab === 'modes' && (
          <div className="referee-admin space-y-3">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-extrabold text-amber-200">
                1. اختر وضع اللعب (6 أوضاع مستقلة):
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(GAME_MODES_CATALOG) as GameMode[]).map((mKey) => {
                  const m = GAME_MODES_CATALOG[mKey];
                  const active = selectedMode === mKey;
                  return (
                    <button
                      key={mKey}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedMode(mKey);
                        setSelectedPacks(m.defaultPacks);
                      }}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <div className="font-extrabold text-sm text-amber-300">{m.nameAr}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{m.badge}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed pt-1">
                {GAME_MODES_CATALOG[selectedMode].descriptionAr}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="font-extrabold text-amber-200">
                  2. خلط حزم الكلمات ({selectedPacks.length} مختارة):
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPacks(WORD_PACKS_CATALOG.map((p) => p.id))}
                  className="text-[11px] text-amber-300 hover:underline cursor-pointer"
                >
                  تحديد الكل
                </button>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {WORD_PACKS_CATALOG.map((pack) => {
                  const active = selectedPacks.includes(pack.id);
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePackSelection(pack.id)}
                      className={`w-full p-2 rounded-xl border text-right flex items-center justify-between gap-2 cursor-pointer ${
                        active
                          ? 'bg-stone-800 border-amber-400/70 text-white'
                          : 'bg-stone-900/60 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{pack.nameAr}</div>
                        <div className="text-[10px] text-stone-400">{pack.descriptionAr}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          active ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {active ? 'مفعّل ✓' : 'إضافة'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category & Age/Difficulty Filters */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-extrabold text-amber-200">
                3. تصفية حسب الفئة والعمر والصعوبة:
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_WORD_CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategorySelection(cat)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                        active
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : 'bg-stone-900 text-stone-400 border-stone-800'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-stone-400 mb-1">الفئة العمرية:</label>
                  <select
                    aria-label="الفئة العمرية"
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value as WordAgeGroup | 'any')}
                    className="w-full px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
                  >
                    <option value="any">جميع الأعمار</option>
                    <option value="junior">الأشبال (8–12)</option>
                    <option value="youth">الشباب (13–17)</option>
                    <option value="adult">المتقدمون (18+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-400 mb-1">مستوى الصعوبة:</label>
                  <select
                    aria-label="مستوى الصعوبة"
                    value={difficultyFilter}
                    onChange={(e) =>
                      setDifficultyFilter(e.target.value as WordDifficulty | 'any')
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
                  >
                    <option value="any">جميع المستويات</option>
                    <option value="easy">سهل وواضح</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">متقدم / عميق</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartNewRound}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm cursor-pointer shadow-lg"
            >
              تطبيق الوضع والحزم وبدء جولة جديدة الآن
            </button>
          </div>
        )}

        {/* TAB 4: FREE TEAM NAMES & ELITE CLASH PRESETS */}
        {activeRefTab === 'teams' && (
          <div className="referee-admin space-y-3">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
              <div className="font-bold text-red-400">
                ◇ الفريق الأول (الأحمر) — اسم حر أو من فرق النخبة
              </div>
              <div className="grid grid-cols-3 min-[380px]:grid-cols-6 gap-1.5">
                {(['A', 'B', 'C', 'D', 'E', 'F'] as EliteTeamCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={redCode === code}
                    onClick={() => {
                      setRedCode(code);
                      setCustomRedName(ELITE_CLASH_TEAMS[code].name);
                    }}
                    className={`py-1.5 rounded-lg font-mono font-bold cursor-pointer ${
                      redCode === code
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customRedName}
                onChange={(e) => setCustomRedName(e.target.value)}
                placeholder="اكتب أي اسم حر للفريق الأحمر..."
                aria-label="اسم الفريق الأحمر"
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
              <div className="font-bold text-blue-400">
                ○ الفريق الثاني (الأزرق) — اسم حر أو من فرق النخبة
              </div>
              <div className="grid grid-cols-3 min-[380px]:grid-cols-6 gap-1.5">
                {(['A', 'B', 'C', 'D', 'E', 'F'] as EliteTeamCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={blueCode === code}
                    onClick={() => {
                      setBlueCode(code);
                      setCustomBlueName(ELITE_CLASH_TEAMS[code].name);
                    }}
                    className={`py-1.5 rounded-lg font-mono font-bold cursor-pointer ${
                      blueCode === code
                        ? 'bg-blue-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customBlueName}
                onChange={(e) => setCustomBlueName(e.target.value)}
                placeholder="اكتب أي اسم حر للفريق الأزرق..."
                aria-label="اسم الفريق الأزرق"
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-bold text-stone-300">الفريق البادئ للجولة القادمة</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  aria-pressed={nextStartingTeam === 'random'}
                  onClick={() => setNextStartingTeam('random')}
                  className={`py-1.5 rounded-lg font-bold cursor-pointer ${
                    nextStartingTeam === 'random'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  عشوائي
                </button>
                <button
                  type="button"
                  aria-pressed={nextStartingTeam === 'red'}
                  onClick={() => setNextStartingTeam('red')}
                  className={`py-1.5 rounded-lg font-bold cursor-pointer ${
                    nextStartingTeam === 'red'
                      ? 'bg-red-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  الأحمر
                </button>
                <button
                  type="button"
                  aria-pressed={nextStartingTeam === 'blue'}
                  onClick={() => setNextStartingTeam('blue')}
                  className={`py-1.5 rounded-lg font-bold cursor-pointer ${
                    nextStartingTeam === 'blue'
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  الأزرق
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpdateTeamsImmediate}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold cursor-pointer"
              >
                حفظ الأسماء الحالية
              </button>
              <button
                type="button"
                onClick={handleStartNewRound}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold cursor-pointer"
              >
                بدء جولة بهذه الفرق
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: WORD LIBRARY REVIEW, IMPORT & DEDUP PANEL */}
        {activeRefTab === 'words' && (
          <div className="referee-admin space-y-3">
            <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <span>إجمالي الكلمات المعتمدة النشطة:</span>
              <span className="font-mono font-extrabold text-amber-300 text-sm tabular-nums">
                {gameState.activePoolCount} كلمة
              </span>
            </div>

            <form
              onSubmit={handleAddCustomWords}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="font-bold text-amber-200">إضافة كلمات جديدة للبنك</span>
                <span className="font-mono text-stone-400">
                  المخصصة: {gameState.customWordsCount}
                </span>
              </div>
              <select
                aria-label="فئة الكلمات الجديدة"
                value={customWordCategory}
                onChange={(e) => setCustomWordCategory(e.target.value as WordCategory)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
              >
                {ALL_WORD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <textarea
                rows={3}
                value={customWordsInput}
                onChange={(e) => setCustomWordsInput(e.target.value)}
                placeholder="أدخل الكلمات مفصولة بفاصلة أو سطر جديد..."
                className="w-full p-2.5 rounded-lg bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold cursor-pointer"
              >
                فحص التكرار وإضافة لبنك الكلمات
              </button>
            </form>

            {/* Word Review & Approval Browser */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-bold text-amber-200">
                مراجعة الكلمات واعتمادها أو استبعادها:
              </div>
              <div className="referee-form-row">
                <input
                  type="text"
                  value={wordSearch}
                  onChange={(e) => setWordSearch(e.target.value)}
                  placeholder="ابحث عن كلمة..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
                />
                <select
                  aria-label="تصفية الكلمات حسب الفئة"
                  value={wordCategoryFilter}
                  onChange={(e) => setWordCategoryFilter(e.target.value)}
                  className="w-32 max-w-[48%] px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
                >
                  <option value="all">كل الفئات</option>
                  {ALL_WORD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pe-1">
                {filteredCatalog.map((w) => {
                  const isDisabled = w.status === 'disabled';
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800"
                    >
                      <div>
                        <span
                          className={`font-bold ${
                            isDisabled ? 'line-through text-stone-400' : 'text-white'
                          }`}
                        >
                          {w.ar}
                        </span>
                        <span className="text-[10px] text-stone-400 mr-2">
                          ({w.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onDispatchAction({
                            action: 'toggle_word_status',
                            wordId: w.id,
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          isDisabled
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isDisabled ? 'مستبعدة (تفعيل)' : 'معتمدة ✓'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-bold text-stone-200">استيراد كلمات من ملف JSON</div>
              <input
                type="file"
                accept=".json,application/json"
                aria-label="استيراد كلمات من ملف JSON"
                onChange={handleJsonFileUpload}
                className="w-full text-xs text-stone-300 file:ml-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stone-800 file:text-amber-300 file:font-bold hover:file:bg-stone-700"
              />
            </div>
          </div>
        )}

        {/* TAB 6: PERMANENT TOURNAMENT MANAGEMENT, STATS & BACKUP/RESTORE */}
        {activeRefTab === 'tournament' && (
          <div className="referee-admin space-y-3">
            {/* Create Independent Tournament */}
            <form
              onSubmit={handleCreateTournament}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
            >
              <div className="font-bold text-amber-200">إنشاء مسابقة / بطولة مستقلة:</div>
              <div className="referee-form-row">
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="اسم البطولة (مثال: دوري الأشبال الرمضاني)..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-extrabold cursor-pointer"
                >
                  إنشاء
                </button>
              </div>
            </form>

            {/* Add Free Team Name to Active Tournament */}
            <form
              onSubmit={handleAddFreeTeamToTournament}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
            >
              <div className="font-bold text-stone-200">إضافة فريق باسم حر للبطولة:</div>
              <div className="referee-form-row">
                <input
                  type="text"
                  value={newFreeTeamName}
                  onChange={(e) => setNewFreeTeamName(e.target.value)}
                  placeholder="اسم الفريق الجديد..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                >
                  إضافة
                </button>
              </div>
            </form>

            {/* Standings Table */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="font-extrabold text-amber-300">
                  جدول الترتيب والنقاط ({tournamentsList[0]?.name || 'دوري صراع النخبة'})
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  المباريات: {gameState.matchHistory.length}
                </span>
              </div>

              {tournamentsList[0]?.standings && tournamentsList[0].standings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="text-stone-400 border-b border-stone-800">
                        <th className="py-1">الفريق</th>
                        <th className="py-1 text-center">لعب</th>
                        <th className="py-1 text-center">فوز</th>
                        <th className="py-1 text-center">بطاقات</th>
                        <th className="py-1 text-center">نقاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournamentsList[0].standings.map((row, idx) => (
                        <tr key={row.teamName} className="border-b border-stone-900">
                          <td className="py-1.5 font-bold text-white">
                            {idx + 1}. {row.teamName}
                          </td>
                          <td className="py-1.5 text-center font-mono tabular-nums">
                            {row.played}
                          </td>
                          <td className="py-1.5 text-center font-mono text-emerald-400 tabular-nums">
                            {row.wins}
                          </td>
                          <td className="py-1.5 text-center font-mono text-stone-300 tabular-nums">
                            {row.cardsRevealed}
                          </td>
                          <td className="py-1.5 text-center font-mono font-extrabold text-amber-300 tabular-nums">
                            {row.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-stone-400 text-center py-3">
                  سيظهر جدول الترتيب تلقائيًا فور انتهاء الجولة الأولى.
                </div>
              )}
            </div>

            {/* Safe Backup & Restore Section */}
            <div className="p-3 rounded-xl bg-stone-950 border border-amber-400/25 space-y-2">
              <div className="font-extrabold text-amber-200">
                النسخ الاحتياطي والاسترجاع الآمن (Backup & Restore):
              </div>
              <button
                type="button"
                onClick={handleExportFullBackup}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold cursor-pointer"
              >
                تصدير نسخة احتياطية شاملة (JSON)
              </button>
              <div className="pt-1">
                <label className="block text-[11px] text-stone-400 mb-1">
                  استرجاع بيانات من نسخة احتياطية محفوظة:
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  aria-label="استرجاع بيانات من نسخة احتياطية"
                  onChange={handleRestoreBackupUpload}
                  className="w-full text-xs text-stone-300 file:ml-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-stone-800 file:text-amber-300 file:font-bold"
                />
              </div>
            </div>
          </div>
        )}
        </div>

        {activeRefTab === 'controls' && (
          <div className="referee-quick-actions" aria-label="إجراءات المباراة الأساسية">
            <button type="button" className="referee-button referee-button-gold"
              onClick={() => onDispatchAction({ action: 'end_turn' })}
              disabled={gameState.status !== 'playing'}>
              <SkipForward /> إنهاء الدور
            </button>
            <button type="button" className="referee-button"
              onClick={() => onDispatchAction({ action: 'undo' })} disabled={!gameState.canUndo}>
              <Undo2 /> تراجع
            </button>
            <button type="button" className="referee-button"
              onClick={() => onDispatchAction({ action: 'toggle_pause' })}
              disabled={gameState.status === 'gameover'}>
              {gameState.status === 'paused' ? <Play /> : <Pause />}
              {gameState.status === 'paused' ? 'استئناف الجولة' : 'إيقاف مؤقت'}
            </button>
            <button type="button" className="referee-button" onClick={expandBoard}>
              <Maximize2 /> عرض اللوحة كاملة
            </button>
          </div>
        )}
        <div className="referee-connection" data-connected={wsConnected}>
          {wsConnected ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          <span role="status">{wsConnected ? 'متصل لحظيًا' : 'جارٍ إعادة الاتصال…'}</span>
          <span className="referee-room" dir="ltr">{gameState.roomId}</span>
        </div>
      </aside>

      <section className="referee-board"
        aria-labelledby={expandedBoard ? undefined : 'referee-board-title'}
        aria-label={expandedBoard ? 'عرض اللوحة كاملة' : undefined}>
        <div className="referee-board-heading">
          {expandedBoard ? (
            <button ref={closeBoardRef} type="button" className="referee-button referee-button-gold"
              onClick={() => setExpandedBoard(false)}>
              <ArrowRight /> العودة إلى أدوات الحكم
            </button>
          ) : (
            <div>
              <p className="referee-caption"><bdi>{gameState.gridCols} × {gameState.gridCols}</bdi> · {modeName}</p>
              <h2 id="referee-board-title">لوحة البطاقات</h2>
            </div>
          )}
          <div className="referee-board-tools">
            <button type="button" className="referee-button" aria-pressed={showSecretOnRefBoard} onClick={toggleSecret}>
              {showSecretOnRefBoard ? <EyeOff /> : <Eye />}
              {showSecretOnRefBoard ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            </button>
            {!expandedBoard && (
              <button type="button" className="referee-icon-button" onClick={expandBoard}
                aria-label="عرض اللوحة كاملة" title="عرض اللوحة كاملة"><Maximize2 /></button>
            )}
          </div>
        </div>

        <div className="referee-board-frame">
          <GameBoard
            cards={gameState.cards}
            settings={gameState.settings}
            gameMode={gameState.gameMode}
            canClickCards={gameState.status === 'playing'}
            showSecretKeyOverlay={showSecretOnRefBoard}
            onCardClick={handleCardRevealByRef}
          />
        </div>
        <div className="referee-board-footer">
          <span>{gameState.status === 'playing' ? 'انقر على البطاقة لكشفها' : 'كشف البطاقات متوقف'}</span>
          <span><b>الدور الآن</b> {cooperative ? 'المهمة التعاونية' : activeTeamName}</span>
        </div>
      </section>
    </div>
  );
};
