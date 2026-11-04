import React, { useState } from 'react';
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

export const SpymasterView: React.FC<SpymasterViewProps> = ({
  gameState,
  spymasterTeam,
  onSwitchSpymasterTeam,
  onGiveClue,
  onOpenQrModal,
  onExitToAudience,
}) => {
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState<number | 'unlimited'>(2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isMyTeamTurn = gameState.currentTurn === spymasterTeam;
  const redWordsUnrevealed = gameState.cards.filter(
    (c) => !c.revealed && c.secretColor === 'red'
  );
  const blueWordsUnrevealed = gameState.cards.filter(
    (c) => !c.revealed && c.secretColor === 'blue'
  );
  const blackCard = gameState.cards.find((c) => c.secretColor === 'black');

  const handleClueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const res = await onGiveClue(clueWord, clueCount);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'تعذر إرسال التلميح.');
    } else {
      setClueWord('');
    }
  };

  const edgeIndicatorColor =
    gameState.startingTeam === 'red'
      ? 'bg-red-500 shadow-[0_0_8px_#EF4444]'
      : 'bg-blue-500 shadow-[0_0_8px_#3B82F6]';

  return (
    <div
      data-testid="spymaster-view"
      className="w-full h-full flex flex-col lg:flex-row gap-4 overflow-y-auto lg:overflow-hidden p-2 sm:p-4"
    >
      {/* Right Column: Authentic Codenames Spymaster Key Card & Quick Lists */}
      <aside className="w-full lg:w-92 shrink-0 flex flex-col gap-3 bg-stone-900/95 border border-amber-200/20 rounded-2xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 className="text-base font-extrabold text-amber-200">
              بطاقة المفتاح السري للقائد
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              رمز الجولة الحالي: <span className="text-amber-300 font-bold">{gameState.spymasterPin || '----'}</span>
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSwitchSpymasterTeam('red')}
            className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
              spymasterTeam === 'red'
                ? 'bg-red-700 text-white border-red-400'
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
          >
            ◇ القائد الأحمر ({gameState.redRemaining})
          </button>
          <button
            type="button"
            onClick={() => onSwitchSpymasterTeam('blue')}
            className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
              spymasterTeam === 'blue'
                ? 'bg-blue-700 text-white border-blue-400'
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
          >
            ○ القائد الأزرق ({gameState.blueRemaining})
          </button>
        </div>

        {/* Authentic Codenames Physical Key-Card Frame (Matches attached 43333.jpg & 444444.jpg) */}
        <div className="flex flex-col items-center">
          <div className="relative p-4 rounded-2xl bg-[#4A3B31] border-4 border-[#635144] shadow-2xl w-full max-w-[260px]">
            {/* 4-Edge Starting Team Indicator Lights (Top, Bottom, Left, Right) */}
            <div
              className={`w-10 h-1.5 rounded-full mx-auto mb-2 ${edgeIndicatorColor}`}
              title={`الفريق البادئ: ${gameState.startingTeam === 'red' ? 'الأحمر' : 'الأزرق'}`}
            />
            <div
              className={`w-1.5 h-10 rounded-full absolute left-1.5 top-1/2 -translate-y-1/2 ${edgeIndicatorColor}`}
            />
            <div
              className={`w-1.5 h-10 rounded-full absolute right-1.5 top-1/2 -translate-y-1/2 ${edgeIndicatorColor}`}
            />

            <div
              data-testid="spymaster-key-matrix"
              className="grid grid-cols-5 gap-1.5 aspect-square w-full bg-[#1C1917] p-2.5 rounded-xl border-2 border-stone-950"
            >
              {gameState.cards.map((card) => {
                const c = card.secretColor;
                const tileClass =
                  c === 'red'
                    ? 'bg-[#D92D20] border-[#F97066] text-red-200'
                    : c === 'blue'
                    ? 'bg-[#1570EF] border-[#53B1FD] text-blue-200'
                    : c === 'black'
                    ? 'bg-[#141414] border-stone-600 text-stone-200'
                    : 'bg-[#D8C7A6] border-[#E7DAC1] text-stone-700';

                return (
                  <div
                    key={card.index}
                    className={`rounded-md border flex items-center justify-center text-xs font-mono font-extrabold relative select-none ${tileClass} ${
                      card.revealed ? 'opacity-25 scale-95' : 'opacity-100'
                    }`}
                    title={`${card.wordAr} (${c})`}
                  >
                    {card.revealed
                      ? '✓'
                      : c === 'red'
                      ? '◇'
                      : c === 'blue'
                      ? '○'
                      : c === 'black'
                      ? '✕'
                      : ''}
                  </div>
                );
              })}
            </div>

            <div
              className={`w-10 h-1.5 rounded-full mx-auto mt-2 ${edgeIndicatorColor}`}
            />
          </div>
          {/* Translucent Plastic Key Card Stand Base */}
          <div className="w-32 h-3 bg-white/15 border border-white/25 rounded-b-xl backdrop-blur-xs -mt-0.5 shadow-md" />
        </div>

        {/* Clue Submission Form for Active Spymaster */}
        <form
          onSubmit={handleClueSubmit}
          className="p-3 rounded-xl bg-stone-950/90 border border-amber-200/15 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-200">
              إعلان التلميح (
              {gameState.currentTurn === 'red'
                ? gameState.redTeamName
                : gameState.blueTeamName}
              )
            </span>
            {!isMyTeamTurn && (
              <span className="text-[11px] text-stone-400">بانتظار دور فريقك</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={clueWord}
              onChange={(e) => setClueWord(e.target.value)}
              placeholder="كلمة التلميح الواحدة..."
              aria-label="كلمة التلميح"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <select
              value={String(clueCount)}
              onChange={(e) =>
                setClueCount(
                  e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value)
                )
              }
              aria-label="عدد كلمات التلميح"
              className="w-20 px-2 py-2 rounded-lg bg-stone-900 border border-stone-700 text-sm font-mono font-bold text-amber-300 focus:outline-none"
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
          </div>

          {errorMsg && <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting || !isMyTeamTurn || gameState.status !== 'playing'}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-extrabold text-xs cursor-pointer transition-colors"
          >
            {submitting ? 'جارٍ الإعلان...' : 'إعلان التلميح على الشاشة الرئيسية'}
          </button>
        </form>

        {/* Unrevealed Words Quick Summary by Color */}
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30">
            <div className="font-bold text-red-300 mb-1">
              ◇ كلمات الأحمر المتبقية ({redWordsUnrevealed.length}):
            </div>
            <div className="text-stone-200 leading-relaxed">
              {redWordsUnrevealed.map((c) => c.wordAr).join(' · ') || 'تم كشفها جميعًا'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30">
            <div className="font-bold text-blue-300 mb-1">
              ○ كلمات الأزرق المتبقية ({blueWordsUnrevealed.length}):
            </div>
            <div className="text-stone-200 leading-relaxed">
              {blueWordsUnrevealed.map((c) => c.wordAr).join(' · ') || 'تم كشفها جميعًا'}
            </div>
          </div>

          {blackCard && (
            <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-400/40 flex items-center justify-between">
              <span className="text-amber-300 font-bold">✕ البطاقة السوداء:</span>
              <span className="font-extrabold text-white text-sm">{blackCard.wordAr}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Left Main Area: Synchronized 5x5 Secret Key Board */}
      <div className="flex-1 min-h-[420px] flex flex-col">
        <GameBoard
          cards={gameState.cards}
          settings={gameState.settings}
          canClickCards={false}
          showSecretKeyOverlay={true}
          onCardClick={() => {}}
        />
      </div>
    </div>
  );
};
