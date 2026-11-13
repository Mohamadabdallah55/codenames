import React, { useState, useEffect, useMemo } from 'react';
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
}

interface WordCatalogItem extends WordEntry {
  isCustom?: boolean;
}

interface TournamentWithStandings extends TournamentCompetition {
  standings: TournamentStandingRow[];
}

export const RefereeView: React.FC<RefereeViewProps> = ({
  gameState,
  sessionToken,
  pin,
  onDispatchAction,
  onOpenQrModal,
  onExitToAudience,
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
  const [activeRefTab, setActiveRefTab] = useState<
    'controls' | 'modes' | 'board' | 'teams' | 'words' | 'tournament'
  >('controls');

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
      const newPin = res.meta?.spymasterPin;
      showTempFeedback(
        'ok',
        `بدأت جولة جديدة (${GAME_MODES_CATALOG[selectedMode].nameAr})${
          newPin ? ` — رمز القائد الجديد: ${newPin}` : ''
        }`
      );
    }
  };

  const handleRegeneratePin = async () => {
    const res = await onDispatchAction({
      action: 'regenerate_pin',
    });
    if (res.ok) {
      showTempFeedback(
        'ok',
        `تم تدوير الرمز وإلغاء جلسات القادة السابقة. الرمز الجديد: ${res.meta?.spymasterPin || ''}`
      );
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

  const [collapseSidebar, setCollapseSidebar] = useState(false);

  return (
    <div
      data-testid="referee-view"
      className="w-full h-full flex flex-col md:flex-row gap-3 overflow-y-auto md:overflow-hidden p-2 sm:p-4"
    >
      {/* Right Column: Referee & Platform Admin Suite */}
      {!collapseSidebar && (
        <aside className="w-full md:w-[360px] lg:w-[420px] shrink-0 flex flex-col gap-3 bg-stone-900/95 border border-amber-200/20 rounded-2xl p-3.5 sm:p-4 md:overflow-y-auto">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-300">
                لوحة تحكم الحكم والإدارة — ELITE CLASH
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                رمز الحكم: <span className="text-amber-200 font-bold">{gameState.refereePin || '----'}</span> · رمز القائد:{' '}
                <span className="text-amber-300 font-extrabold">
                  {gameState.spymasterPin || '----'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenQrModal}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-extrabold cursor-pointer"
              >
                QR القائد
              </button>
              <button
                type="button"
                onClick={onExitToAudience}
                title="إخفاء المفتاح السري والعودة لشاشة اللعب الكاملة مع بقاء صلاحية النقر"
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-amber-200 border border-amber-300/30 cursor-pointer"
              >
                شاشة اللعب
              </button>
            </div>
          </div>

        {/* 6 Interactive Segmented Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
          {[
            { id: 'controls', label: 'التحكم' },
            { id: 'modes', label: 'الأوضاع' },
            { id: 'board', label: 'اللوحة' },
            { id: 'teams', label: 'الفرق' },
            { id: 'words', label: 'الكلمات' },
            { id: 'tournament', label: 'البطولة' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRefTab(tab.id as typeof activeRefTab)}
              className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeRefTab === tab.id
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`px-3 py-2 rounded-xl text-xs font-bold ${
              feedback.type === 'ok'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                : 'bg-red-950/90 text-red-300 border border-red-500/40'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* TAB 1: LIVE MATCH & TV BROADCAST CONTROLS */}
        {activeRefTab === 'controls' && (
          <div className="space-y-3">
            {/* Security & Session Rotation Bar */}
            <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-400/25 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-400">رمز القائد للجولة: </span>
                <span className="font-mono font-extrabold text-amber-300 text-sm">
                  {gameState.spymasterPin}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRegeneratePin}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold cursor-pointer"
                  title="يلغي جلسات القادة السابقة فورًا ويولد رمزًا جديدًا"
                >
                  تدوير الرمز وإلغاء الجلسات
                </button>
                <button
                  type="button"
                  onClick={onOpenQrModal}
                  className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold cursor-pointer"
                >
                  QR
                </button>
              </div>
            </div>

            {/* TV Broadcast Motion Graphics Controls */}
            <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-stone-300 font-bold">مؤثرات البث التلفزيوني:</span>
                <button
                  type="button"
                  onClick={() =>
                    onDispatchAction({
                      action: 'update_settings',
                      settings: {
                        broadcastEffectsEnabled: !gameState.settings.broadcastEffectsEnabled,
                      },
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    gameState.settings.broadcastEffectsEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {gameState.settings.broadcastEffectsEnabled ? 'مفعّلة' : 'معطّلة'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => onDispatchAction({ action: 'skip_broadcast' })}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
              >
                تخطي المؤثر الحالي ⏭
              </button>
            </div>

            {/* Audience Direct Click Permission Toggle */}
            <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">
                السماح بكشف البطاقات من شاشة الجمهور مباشرةً:
              </span>
              <button
                type="button"
                onClick={() =>
                  onDispatchAction({
                    action: 'update_settings',
                    settings: {
                      allowAudienceClickInLocalMode:
                        !gameState.settings.allowAudienceClickInLocalMode,
                    },
                  })
                }
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                  gameState.settings.allowAudienceClickInLocalMode
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {gameState.settings.allowAudienceClickInLocalMode ? 'مسموح' : 'مقفل (الحكم فقط)'}
              </button>
            </div>

            {/* Clue Form */}
            <form
              onSubmit={handleGiveClue}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5"
            >
              <div className="text-xs font-bold text-amber-200">
                إدخال تلميح القائد (
                {gameState.currentTurn === 'red'
                  ? gameState.redTeamName
                  : gameState.blueTeamName}
                )
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clueWord}
                  onChange={(e) => setClueWord(e.target.value)}
                  placeholder="كلمة التلميح..."
                  aria-label="كلمة التلميح للحكم"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <select
                  value={String(clueCount)}
                  onChange={(e) =>
                    setClueCount(
                      e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value)
                    )
                  }
                  aria-label="رقم التلميح للحكم"
                  className="w-20 px-2 py-2 rounded-lg bg-stone-900 border border-stone-700 text-sm font-mono font-bold text-amber-300"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                  <option value="unlimited">∞</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs cursor-pointer"
              >
                إعلان التلميح
              </button>
            </form>

            {/* Primary Turn & Match Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDispatchAction({ action: 'end_turn' })}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold text-xs border border-amber-200/20 cursor-pointer"
              >
                إنهاء الدور الحالي
              </button>

              <button
                type="button"
                disabled={!gameState.canUndo}
                onClick={() => onDispatchAction({ action: 'undo' })}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-100 font-bold text-xs border border-stone-700 cursor-pointer"
              >
                تراجع آمن (Undo)
              </button>

              <button
                type="button"
                onClick={() => onDispatchAction({ action: 'penalty_invalid_clue' })}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-red-300 font-bold text-xs border border-red-500/30 cursor-pointer"
              >
                عقوبة تلميح مخالف
              </button>

              <button
                type="button"
                onClick={() => onDispatchAction({ action: 'toggle_pause' })}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs border border-stone-700 cursor-pointer"
              >
                {gameState.status === 'paused' ? 'استئناف الجولة' : 'إيقاف مؤقت'}
              </button>

              <button
                type="button"
                onClick={() => onDispatchAction({ action: 'restart_round' })}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 cursor-pointer"
              >
                إعادة الجولة نفسها
              </button>

              <button
                type="button"
                onClick={handleStartNewRound}
                className="py-2.5 px-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs cursor-pointer"
              >
                جولة جديدة (برمز جديد)
              </button>
            </div>

            {/* Toggle Secret Key on Referee Board */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <span className="text-xs text-stone-300 font-semibold">
                إظهار ألوان المفتاح السري للحكم
              </span>
              <button
                type="button"
                onClick={() => setShowSecretOnRefBoard((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  showSecretOnRefBoard
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {showSecretOnRefBoard ? 'ظاهر للحكم' : 'مخفي'}
              </button>
            </div>

            {/* Live Match Event Log */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="text-xs font-bold text-stone-400">
                سجل أحداث المباراة المباشر
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {gameState.eventLog.map((evt) => (
                  <div
                    key={evt.id}
                    className="text-xs text-stone-300 border-b border-stone-900 pb-1 leading-relaxed"
                  >
                    <span className="font-mono text-[10px] text-amber-400/80 ml-1.5">
                      [دور {evt.turn}]
                    </span>
                    <span>{evt.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 6 GAME MODES & WORD PACKS MIXER */}
        {activeRefTab === 'modes' && (
          <div className="space-y-3 text-xs">
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
                      <div className="font-extrabold text-xs text-amber-300">{m.nameAr}</div>
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
              <div className="flex items-center justify-between">
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
                          active ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-500'
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

        {/* TAB 3: COMPACT BOARD FOR MOBILE PHONE REFEREE */}
        {activeRefTab === 'board' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-300">
              <span>انقر على أي بطاقة لكشفها فورًا:</span>
              <button
                type="button"
                onClick={() => setShowSecretOnRefBoard((v) => !v)}
                className="px-2.5 py-1 rounded bg-stone-800 text-amber-300 font-bold"
              >
                {showSecretOnRefBoard ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
              </button>
            </div>
            <div className="h-[430px]">
              <GameBoard
                cards={gameState.cards}
                settings={gameState.settings}
                gameMode={gameState.gameMode}
                canClickCards={gameState.status === 'playing'}
                showSecretKeyOverlay={showSecretOnRefBoard}
                onCardClick={handleCardRevealByRef}
                compact={true}
              />
            </div>
          </div>
        )}

        {/* TAB 4: FREE TEAM NAMES & ELITE CLASH PRESETS */}
        {activeRefTab === 'teams' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
              <div className="font-bold text-red-400">
                ◇ الفريق الأول (الأحمر) — اسم حر أو من فرق النخبة
              </div>
              <div className="grid grid-cols-6 gap-1">
                {(['A', 'B', 'C', 'D', 'E', 'F'] as EliteTeamCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
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
              <div className="grid grid-cols-6 gap-1">
                {(['A', 'B', 'C', 'D', 'E', 'F'] as EliteTeamCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
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
          <div className="space-y-3 text-xs">
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
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200">إضافة كلمات جديدة للبنك</span>
                <span className="font-mono text-stone-400">
                  المخصصة: {gameState.customWordsCount}
                </span>
              </div>
              <select
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
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={wordSearch}
                  onChange={(e) => setWordSearch(e.target.value)}
                  placeholder="ابحث عن كلمة..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
                />
                <select
                  value={wordCategoryFilter}
                  onChange={(e) => setWordCategoryFilter(e.target.value)}
                  className="w-32 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs"
                >
                  <option value="all">كل الفئات</option>
                  {ALL_WORD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
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
                            isDisabled ? 'line-through text-stone-500' : 'text-white'
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
                onChange={handleJsonFileUpload}
                className="w-full text-xs text-stone-300 file:ml-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stone-800 file:text-amber-300 file:font-bold hover:file:bg-stone-700"
              />
            </div>
          </div>
        )}

        {/* TAB 6: PERMANENT TOURNAMENT MANAGEMENT, STATS & BACKUP/RESTORE */}
        {activeRefTab === 'tournament' && (
          <div className="space-y-3 text-xs">
            {/* Create Independent Tournament */}
            <form
              onSubmit={handleCreateTournament}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
            >
              <div className="font-bold text-amber-200">إنشاء مسابقة / بطولة مستقلة:</div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="اسم البطولة (مثال: دوري الأشبال الرمضاني)..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white"
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
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newFreeTeamName}
                  onChange={(e) => setNewFreeTeamName(e.target.value)}
                  placeholder="اسم الفريق الجديد..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-white"
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
              <div className="flex items-center justify-between">
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
                  onChange={handleRestoreBackupUpload}
                  className="w-full text-xs text-stone-300 file:ml-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-stone-800 file:text-amber-300 file:font-bold"
                />
              </div>
            </div>
          </div>
        )}
        </aside>
      )}

      {/* Left Main Area: Interactive Referee Board */}
      <div className="flex-1 min-h-[420px] flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-amber-200/15 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapseSidebar((v) => !v)}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
            >
              {collapseSidebar ? 'إظهار لوحة التحكم ⚙' : 'تكبير اللوحة بالكامل ⛶'}
            </button>
            <button
              type="button"
              onClick={() => setShowSecretOnRefBoard((v) => !v)}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold cursor-pointer"
            >
              {showSecretOnRefBoard ? 'إخفاء ألوان المفتاح' : 'إظهار ألوان المفتاح'}
            </button>
            <span className="text-stone-300 font-semibold hidden sm:inline">
              انقر على أي بطاقة أدناه لكشفها فورًا ({GAME_MODES_CATALOG[gameState.gameMode]?.nameAr})
            </span>
          </div>
          <span className="font-mono text-amber-300">
            الدور الحالي:{' '}
            {gameState.currentTurn === 'red'
              ? gameState.redTeamName
              : gameState.blueTeamName}
          </span>
        </div>

        <div className="flex-1">
          <GameBoard
            cards={gameState.cards}
            settings={gameState.settings}
            gameMode={gameState.gameMode}
            canClickCards={gameState.status === 'playing'}
            showSecretKeyOverlay={showSecretOnRefBoard}
            onCardClick={handleCardRevealByRef}
          />
        </div>
      </div>
    </div>
  );
};
