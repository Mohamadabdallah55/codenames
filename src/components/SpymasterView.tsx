import React, { useState, useMemo, useEffect } from 'react';
import { ClientGameState, TeamColor } from '../game/rules';
import { GameBoard } from './GameBoard';

interface SpymasterViewProps {
  gameState: ClientGameState;
  spymasterTeam: TeamColor;
  onSwitchSpymasterTeam: (team: TeamColor) => void;
  onGiveClue: (
    word: string,
    count: number | 'unlimited'
  ) => Promise<{ ok: boolean; error?: string }>;
  onOpenQrModal: () => void;
  onExitToAudience: () => void;
}

const CLUE_COUNT_OPTIONS: Array<number | 'unlimited'> = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  0,
  'unlimited',
];

function getDraftStorageKey(roomId: string): string {
  return `elite_clash_captain_draft_${roomId}`;
}

export const SpymasterView: React.FC<SpymasterViewProps> = React.memo(
  ({
    gameState,
    spymasterTeam,
    onSwitchSpymasterTeam,
    onGiveClue,
    onOpenQrModal,
    onExitToAudience,
  }) => {
    const draftKey = getDraftStorageKey(gameState.roomId);

    // Restore Captain's draft clue from sessionStorage so reconnections or reloads NEVER lose typed text
    const [clueWord, setClueWord] = useState<string>(() => {
      if (typeof window === 'undefined') return '';
      try {
        return sessionStorage.getItem(`${draftKey}_word`) || '';
      } catch {
        return '';
      }
    });

    const [clueCount, setClueCount] = useState<number | 'unlimited'>(() => {
      if (typeof window === 'undefined') return 2;
      try {
        const raw = sessionStorage.getItem(`${draftKey}_count`);
        if (raw === 'unlimited') return 'unlimited';
        if (raw !== null && !Number.isNaN(Number(raw))) return Number(raw);
      } catch {
        // ignore
      }
      return 2;
    });

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [mobileTab, setMobileTab] = useState<'key' | 'board'>('key');
    const [plannedWords, setPlannedWords] = useState<string[]>([]);

    useEffect(() => {
      try {
        sessionStorage.setItem(`${draftKey}_word`, clueWord);
        sessionStorage.setItem(`${draftKey}_count`, String(clueCount));
      } catch {
        // ignore
      }
    }, [draftKey, clueWord, clueCount]);

    const isRedTurn = gameState.currentTurn === 'red';
    const isCoop = gameState.gameMode === 'cooperative';
    const isMyTeamTurn = isCoop || spymasterTeam === gameState.currentTurn;
    const activeTeamName = isRedTurn ? gameState.redTeamName : gameState.blueTeamName;
    const is16Grid = gameState.cards.length === 16;

    const { redWordsUnrevealed, blueWordsUnrevealed, blackCard, semanticSuggestions } = useMemo(() => {
      const red = gameState.cards.filter((c) => !c.revealed && c.secretColor === 'red');
      const blue = gameState.cards.filter((c) => !c.revealed && c.secretColor === 'blue');
      const black = gameState.cards.find((c) => c.secretColor === 'black');

      // Find shared categories or semantic links among active team's remaining words
      const activeList = isRedTurn ? red : blue;
      const catCounts = new Map<string, string[]>();
      for (const c of activeList) {
        const list = catCounts.get(c.category) || [];
        list.push(c.wordAr);
        catCounts.set(c.category, list);
      }
      const clusters = Array.from(catCounts.entries())
        .filter(([, words]) => words.length >= 2)
        .map(([cat, words]) => `${cat} (${words.join('، ')})`);

      return {
        redWordsUnrevealed: red,
        blueWordsUnrevealed: blue,
        blackCard: black,
        semanticSuggestions: clusters.slice(0, 2),
      };
    }, [gameState.cards, isRedTurn]);

    const togglePlannedWord = (wordAr: string) => {
      setPlannedWords((prev) => {
        const exists = prev.includes(wordAr);
        const next = exists ? prev.filter((w) => w !== wordAr) : [...prev, wordAr];
        if (next.length >= 1 && next.length <= 9) {
          setClueCount(next.length);
        }
        return next;
      });
    };

    const handleClueSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);
      setSuccessMsg(null);

      if (!isMyTeamTurn) {
        setErrorMsg(`الدور الآن لفريق ${activeTeamName}. انتظر دور فريقك أو بدّل شارة القائد.`);
        return;
      }

      const trimmed = clueWord.trim();
      if (!trimmed) {
        setErrorMsg('يرجى كتابة كلمة التلميح أولًا.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await onGiveClue(trimmed, clueCount);
        if (!res.ok) {
          setErrorMsg(res.error || 'تعذر إرسال التلميح.');
        } else {
          setClueWord('');
          setPlannedWords([]);
          try {
            sessionStorage.removeItem(`${draftKey}_word`);
          } catch {
            // ignore
          }
          setSuccessMsg(
            `✓ تم إعلان التلميح «${trimmed} — ${
              clueCount === 'unlimited' ? '∞' : clueCount
            }» على الشاشة!`
          );
          setTimeout(() => setSuccessMsg(null), 3500);
        }
      } finally {
        setSubmitting(false);
      }
    };

    const edgeIndicatorColor =
      gameState.startingTeam === 'red'
        ? 'bg-red-500 shadow-[0_0_10px_#EF4444]'
        : 'bg-blue-500 shadow-[0_0_10px_#3B82F6]';

    return (
      <div
        data-testid="spymaster-view"
        className="w-full h-full flex flex-col lg:flex-row gap-3 lg:gap-4 overflow-y-auto lg:overflow-hidden p-2 sm:p-4"
      >
        {/* Mobile View Mode Switcher */}
        <div className="flex lg:hidden grid-cols-2 gap-2 shrink-0 bg-stone-950/90 p-1.5 rounded-xl border border-stone-800">
          <button
            type="button"
            onClick={() => setMobileTab('key')}
            className={`flex-1 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
              mobileTab === 'key'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-300 hover:bg-stone-900'
            }`}
          >
            إعلان التلميح والمفتاح السري
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('board')}
            className={`flex-1 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
              mobileTab === 'board'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-300 hover:bg-stone-900'
            }`}
          >
            لوحة الـ {gameState.cards.length} كلمة كاملة
          </button>
        </div>

        {/* Right Column: Fast Clue Composer + Authentic Codenames Spymaster Key Card */}
        <aside
          className={`w-full lg:w-[400px] shrink-0 flex-col gap-3 bg-stone-900/95 border border-amber-200/20 rounded-2xl p-3.5 sm:p-4 overflow-y-auto ${
            mobileTab === 'board' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-200">
                لوحة القائد والمفتاح السري
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                رمز الجولة الحالي:{' '}
                <span className="text-amber-300 font-bold">
                  {gameState.spymasterPin || '----'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenQrModal}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-bold text-amber-200 cursor-pointer"
              >
                QR القائد
              </button>
              <button
                type="button"
                onClick={onExitToAudience}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
              >
                الجمهور
              </button>
            </div>
          </div>

          {/* Team Role Toggle */}
          {!isCoop && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSwitchSpymasterTeam('red')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs border transition-colors cursor-pointer ${
                  spymasterTeam === 'red'
                    ? 'bg-gradient-to-r from-red-700 to-red-600 text-white border-red-300 shadow-md'
                    : 'bg-stone-800 text-stone-400 border-stone-700'
                }`}
              >
                ◇ القائد الأحمر ({gameState.redRemaining})
              </button>
              <button
                type="button"
                onClick={() => onSwitchSpymasterTeam('blue')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs border transition-colors cursor-pointer ${
                  spymasterTeam === 'blue'
                    ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white border-blue-300 shadow-md'
                    : 'bg-stone-800 text-stone-400 border-stone-700'
                }`}
              >
                ○ القائد الأزرق ({gameState.blueRemaining})
              </button>
            </div>
          )}

          {/* TOP-PRIORITY: Instant Zero-Lag Clue Composer */}
          <form
            onSubmit={handleClueSubmit}
            className={`p-3.5 rounded-2xl border-2 space-y-3 shadow-lg ${
              isRedTurn
                ? 'bg-gradient-to-b from-red-950/60 to-stone-950 border-red-500/60'
                : 'bg-gradient-to-b from-blue-950/60 to-stone-950 border-blue-500/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    isRedTurn ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                />
                <span>إرسال تلميح الدور ({activeTeamName})</span>
              </span>
              {gameState.currentClue && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 font-mono font-bold">
                  الحالي: {gameState.currentClue.word} (
                  {gameState.currentClue.count === 'unlimited'
                    ? '∞'
                    : gameState.currentClue.count}
                  )
                </span>
              )}
            </div>

            {!isMyTeamTurn && (
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-200 font-bold">
                الدور الآن لفريق {activeTeamName}. يمكنك تجهيز تلميحك في الخانة أدناه وسيُحفظ تلقائيًا لحين دورك!
              </div>
            )}

            {/* Clue Word Input */}
            <div>
              <input
                type="text"
                data-testid="spymaster-clue-input"
                dir="rtl"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={clueWord}
                onChange={(e) => {
                  setClueWord(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="اكتب كلمة التلميح الواحدة هنا..."
                aria-label="كلمة التلميح"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border-2 border-stone-700 focus:border-amber-400 text-base font-extrabold text-white placeholder:text-stone-500 focus:outline-none"
              />
            </div>

            {/* 1-Tap Tactile Number Selector Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-stone-300 font-bold">
                <span>اختر عدد الكلمات المرتبطة بالتلميح:</span>
                <span className="font-mono text-amber-300">
                  الرقم المختار: {clueCount === 'unlimited' ? '∞ (غير محدود)' : clueCount}
                </span>
              </div>
              <div
                role="group"
                aria-label="عدد كلمات التلميح"
                className="grid grid-cols-6 sm:grid-cols-11 gap-1"
              >
                {CLUE_COUNT_OPTIONS.map((opt) => {
                  const active = clueCount === opt;
                  const label = opt === 'unlimited' ? '∞' : String(opt);
                  return (
                    <button
                      key={String(opt)}
                      type="button"
                      onClick={() => setClueCount(opt)}
                      className={`py-2 rounded-lg font-mono font-black text-xs sm:text-sm cursor-pointer border transition-all ${
                        active
                          ? 'bg-amber-400 text-stone-950 border-amber-200 shadow scale-105'
                          : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-2 rounded-lg bg-red-950/90 border border-red-400 text-xs text-red-200 font-bold"
              >
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="p-2 rounded-lg bg-emerald-950/90 border border-emerald-400 text-xs text-emerald-200 font-bold"
              >
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              data-testid="spymaster-submit-clue-btn"
              disabled={submitting || gameState.status !== 'playing' || !isMyTeamTurn}
              className={`w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer transition-all shadow-lg disabled:opacity-40 ${
                isRedTurn
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-stone-950 hover:brightness-110'
                  : 'bg-gradient-to-r from-blue-500 via-amber-400 to-blue-500 text-stone-950 hover:brightness-110'
              }`}
            >
              {submitting
                ? 'جارٍ الإرسال الفوري...'
                : !isMyTeamTurn
                ? `بانتظار انتهاء دور ${activeTeamName}...`
                : `إعلان التلميح على الشاشة الرئيسية (${clueWord.trim() || '...'} — ${
                    clueCount === 'unlimited' ? '∞' : clueCount
                  })`}
            </button>
          </form>

          {/* Authentic Codenames Physical Key-Card Frame */}
          <div className="flex flex-col items-center">
            <div className="relative p-3.5 rounded-2xl bg-[#4A3B31] border-4 border-[#6B5647] shadow-2xl w-full max-w-[275px]">
              <div
                className={`w-10 h-1.5 rounded-full mx-auto mb-2 ${edgeIndicatorColor}`}
                title={`الفريق البادئ: ${
                  gameState.startingTeam === 'red' ? 'الأحمر' : 'الأزرق'
                }`}
              />
              <div
                className={`w-1.5 h-10 rounded-full absolute left-1.5 top-1/2 -translate-y-1/2 ${edgeIndicatorColor}`}
              />
              <div
                className={`w-1.5 h-10 rounded-full absolute right-1.5 top-1/2 -translate-y-1/2 ${edgeIndicatorColor}`}
              />

              <div
                data-testid="spymaster-key-matrix"
                className={`grid ${
                  is16Grid ? 'grid-cols-4' : 'grid-cols-5'
                } gap-1.5 aspect-square w-full bg-[#181512] p-2 rounded-xl border-2 border-stone-950`}
              >
                {gameState.cards.map((card) => {
                  const c = card.secretColor;
                  const tileClass =
                    c === 'red'
                      ? 'bg-gradient-to-b from-[#F43F5E] to-[#BE123C] border-[#FDA4AF] text-white'
                      : c === 'blue'
                      ? 'bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] border-[#93C5FD] text-white'
                      : c === 'black'
                      ? 'bg-[#09090B] border-amber-400/80 text-amber-300'
                      : 'bg-[#D8C7A6] border-[#EDE2CC] text-stone-800';

                  return (
                    <div
                      key={card.index}
                      className={`rounded-md border flex flex-col items-center justify-center p-0.5 text-[10px] font-extrabold relative select-none leading-tight ${tileClass} ${
                        card.revealed ? 'opacity-20 scale-90' : 'opacity-100'
                      }`}
                      title={`${card.wordAr} (${c})`}
                    >
                      <span>
                        {card.revealed
                          ? '✓'
                          : c === 'red'
                          ? '◇'
                          : c === 'blue'
                          ? '○'
                          : c === 'black'
                          ? '✕'
                          : ''}
                      </span>
                      <span className="text-[8px] font-bold truncate max-w-full opacity-95">
                        {card.wordAr}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className={`w-10 h-1.5 rounded-full mx-auto mt-2 ${edgeIndicatorColor}`}
              />
            </div>
            <div className="w-32 h-3 bg-white/15 border border-white/25 rounded-b-xl -mt-0.5 shadow-md" />
          </div>

          {/* Semantic Cluster Assistant for Captains */}
          {semanticSuggestions.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-200 space-y-1">
              <div className="font-extrabold text-amber-300">
                روابط دلالية مقترحة بين كلمات فريقك:
              </div>
              {semanticSuggestions.map((s) => (
                <div key={s} className="text-stone-300">
                  · {s}
                </div>
              ))}
            </div>
          )}

          {/* Interactive Unrevealed Words Helper */}
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-red-950/45 border border-red-500/35">
              <div className="flex items-center justify-between font-bold text-red-300 mb-1.5">
                <span>
                  ◇ {isCoop ? 'الأهداف التعاونية المتبقية' : 'كلمات الأحمر المتبقية'} (
                  {redWordsUnrevealed.length}):
                </span>
                <span className="text-[10px] text-stone-400">انقر لتحديد كلمات التلميح</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {redWordsUnrevealed.map((c) => {
                  const selected = plannedWords.includes(c.wordAr);
                  return (
                    <button
                      key={c.index}
                      type="button"
                      onClick={() => togglePlannedWord(c.wordAr)}
                      className={`px-2 py-1 rounded-lg font-bold text-xs cursor-pointer border transition-all ${
                        selected
                          ? 'bg-red-600 text-white border-amber-300 shadow scale-105'
                          : 'bg-red-950/80 text-red-100 border-red-800/60 hover:bg-red-900/60'
                      }`}
                    >
                      {c.wordAr}
                    </button>
                  );
                })}
                {redWordsUnrevealed.length === 0 && (
                  <span className="text-stone-400">تم كشفها جميعًا</span>
                )}
              </div>
            </div>

            {!isCoop && (
              <div className="p-2.5 rounded-xl bg-blue-950/45 border border-blue-500/35">
                <div className="flex items-center justify-between font-bold text-blue-300 mb-1.5">
                  <span>○ كلمات الأزرق المتبقية ({blueWordsUnrevealed.length}):</span>
                  <span className="text-[10px] text-stone-400">انقر لتحديد كلمات التلميح</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {blueWordsUnrevealed.map((c) => {
                    const selected = plannedWords.includes(c.wordAr);
                    return (
                      <button
                        key={c.index}
                        type="button"
                        onClick={() => togglePlannedWord(c.wordAr)}
                        className={`px-2 py-1 rounded-lg font-bold text-xs cursor-pointer border transition-all ${
                          selected
                            ? 'bg-blue-600 text-white border-amber-300 shadow scale-105'
                            : 'bg-blue-950/80 text-blue-100 border-blue-800/60 hover:bg-blue-900/60'
                        }`}
                      >
                        {c.wordAr}
                      </button>
                    );
                  })}
                  {blueWordsUnrevealed.length === 0 && (
                    <span className="text-stone-400">تم كشفها جميعًا</span>
                  )}
                </div>
              </div>
            )}

            {blackCard && (
              <div className="p-2.5 rounded-xl bg-stone-950 border-2 border-red-500/60 flex items-center justify-between">
                <span className="text-amber-300 font-extrabold text-xs">
                  ✕ البطاقة السوداء (تجنّبها تمامًا):
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-red-600/25 border border-red-400/50 font-black text-white text-sm">
                  {blackCard.wordAr}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* Left Main Area: Synchronized Secret Key Board */}
        <div
          className={`flex-1 min-h-[420px] flex-col ${
            mobileTab === 'key' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <GameBoard
            cards={gameState.cards}
            settings={gameState.settings}
            gameMode={gameState.gameMode}
            canClickCards={false}
            showSecretKeyOverlay={true}
            onCardClick={() => {}}
          />
        </div>
      </div>
    );
  },
  (prev, next) =>
    // CRITICAL PERFORMANCE GUARD: Never re-render SpymasterView when only timerRemainingSeconds ticks!
    prev.spymasterTeam === next.spymasterTeam &&
    prev.gameState.roundNumber === next.gameState.roundNumber &&
    prev.gameState.status === next.gameState.status &&
    prev.gameState.currentTurn === next.gameState.currentTurn &&
    prev.gameState.turnsCount === next.gameState.turnsCount &&
    prev.gameState.redRemaining === next.gameState.redRemaining &&
    prev.gameState.blueRemaining === next.gameState.blueRemaining &&
    prev.gameState.spymasterPin === next.gameState.spymasterPin &&
    prev.gameState.currentClue?.declaredAt === next.gameState.currentClue?.declaredAt &&
    prev.gameState.cards === next.gameState.cards
);
