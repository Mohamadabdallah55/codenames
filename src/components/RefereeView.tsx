import React, { useState } from 'react';
import {
  ClientGameState,
  ELITE_CLASH_TEAMS,
  EliteTeamCode,
  TeamColor,
} from '../game/rules';
import { GameBoard } from './GameBoard';
import { RoomActionPayload } from '../../server';

interface RefereeViewProps {
  gameState: ClientGameState;
  onDispatchAction: (payload: RoomActionPayload) => Promise<{
    ok: boolean;
    error?: string;
    meta?: Record<string, unknown>;
  }>;
  onOpenQrModal: () => void;
  onExitToAudience: () => void;
}

export const RefereeView: React.FC<RefereeViewProps> = ({
  gameState,
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
  const [customWordsInput, setCustomWordsInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [activeRefTab, setActiveRefTab] = useState<
    'controls' | 'board' | 'teams' | 'words' | 'history'
  >('controls');

  const showTempFeedback = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

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
      redTeamCode: redCode,
      redTeamName: customRedName,
      blueTeamCode: blueCode,
      blueTeamName: customBlueName,
      startingTeam: nextStartingTeam,
    });
    if (res.ok) {
      const newPin = res.meta?.spymasterPin;
      showTempFeedback(
        'ok',
        `بدأت جولة جديدة بـ 25 كلمة فريدة${newPin ? ` — رمز القائد الجديد: ${newPin}` : ''}`
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
        `تم توليد رمز جديد للقائد: ${res.meta?.spymasterPin || ''}`
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

  const handleAddCustomWords = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onDispatchAction({
      action: 'add_custom_words',
      customWordsText: customWordsInput,
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

  return (
    <div
      data-testid="referee-view"
      className="w-full h-full flex flex-col lg:flex-row gap-4 overflow-y-auto lg:overflow-hidden p-2 sm:p-4"
    >
      {/* Right Column: Referee Control Panel */}
      <aside className="w-full lg:w-96 shrink-0 flex flex-col gap-3 bg-stone-900/95 border border-amber-200/20 rounded-2xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 className="text-base font-extrabold text-amber-300">
              لوحة تحكم الحكم — ELITE CLASH
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              الغرفة: {gameState.roomId} · رمز القائد للجولة:{' '}
              <span className="text-amber-300 font-extrabold">
                {gameState.spymasterPin || '----'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
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
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
            >
              الجمهور
            </button>
          </div>
        </div>

        {/* Interactive Segmented Tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
          <button
            type="button"
            onClick={() => setActiveRefTab('controls')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeRefTab === 'controls'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            التحكم
          </button>
          <button
            type="button"
            onClick={() => setActiveRefTab('board')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeRefTab === 'board'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            اللوحة
          </button>
          <button
            type="button"
            onClick={() => setActiveRefTab('teams')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeRefTab === 'teams'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            الفرق
          </button>
          <button
            type="button"
            onClick={() => setActiveRefTab('words')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeRefTab === 'words'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            الكلمات
          </button>
          <button
            type="button"
            onClick={() => setActiveRefTab('history')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeRefTab === 'history'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            السجل
          </button>
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

        {/* TAB 1: LIVE MATCH CONTROLS */}
        {activeRefTab === 'controls' && (
          <div className="space-y-3">
            {/* Dynamic Round PIN & QR Quick Bar */}
            <div className="p-2.5 rounded-xl bg-stone-950 border border-amber-400/25 flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-400">رمز القائد لهذه الجولة: </span>
                <span className="font-mono font-extrabold text-amber-300 text-sm">
                  {gameState.spymasterPin}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRegeneratePin}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold cursor-pointer"
                >
                  رمز جديد
                </button>
                <button
                  type="button"
                  onClick={onOpenQrModal}
                  className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold cursor-pointer"
                >
                  عرض QR
                </button>
              </div>
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
                title="ينهي دور الفريق المخالف فورًا ويكشف بطاقة لصالح الفريق المنافس وفق القواعد الرسمية"
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
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
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

        {/* TAB: COMPACT 5x5 BOARD FOR MOBILE PHONE REFEREE */}
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
                canClickCards={gameState.status === 'playing'}
                showSecretKeyOverlay={showSecretOnRefBoard}
                onCardClick={handleCardRevealByRef}
                compact={true}
              />
            </div>
          </div>
        )}

        {/* TAB 2: ELITE CLASH TEAMS (A - F) */}
        {activeRefTab === 'teams' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
              <div className="font-bold text-red-400">◇ الفريق الأحمر</div>
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
                aria-label="اسم الفريق الأحمر"
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
              <div className="font-bold text-blue-400">○ الفريق الأزرق</div>
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
                aria-label="اسم الفريق الأزرق"
                className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-bold text-stone-300">
                الفريق البادئ للجولة القادمة (9 بطاقات)
              </div>
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
                  الأحمر (9)
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
                  الأزرق (9)
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

        {/* TAB 3: CUSTOM WORDS & JSON IMPORT */}
        {activeRefTab === 'words' && (
          <div className="space-y-3 text-xs">
            <form
              onSubmit={handleAddCustomWords}
              className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200">إضافة كلمات مخصصة</span>
                <span className="font-mono text-stone-400">
                  المخصصة حاليًا: {gameState.customWordsCount}
                </span>
              </div>
              <textarea
                rows={4}
                value={customWordsInput}
                onChange={(e) => setCustomWordsInput(e.target.value)}
                placeholder="أدخل الكلمات مفصولة بفاصلة أو سطر جديد..."
                className="w-full p-2.5 rounded-lg bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold cursor-pointer"
              >
                فحص وإضافة لبنك الكلمات
              </button>
            </form>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="font-bold text-stone-200">استيراد كلمات من ملف JSON</div>
              <p className="text-[11px] text-stone-400">
                يدعم مصفوفة نصوص عربية أو كائنات تحتوي على خاصية ar و en مع إزالة التشكيل والتكرار آليًا.
              </p>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileUpload}
                className="w-full text-xs text-stone-300 file:ml-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stone-800 file:text-amber-300 file:font-bold hover:file:bg-stone-700"
              />
            </div>

            {gameState.customWordsCount > 0 && (
              <button
                type="button"
                onClick={() => onDispatchAction({ action: 'clear_custom_words' })}
                className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-red-300 font-bold cursor-pointer"
              >
                مسح الكلمات المخصصة والعودة للبنك الأصلي (540+ كلمة)
              </button>
            )}
          </div>
        )}

        {/* TAB 4: TOURNAMENT MATCH HISTORY */}
        {activeRefTab === 'history' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-200">
                نتائج مباريات البطولة ({gameState.matchHistory.length})
              </span>
              {gameState.matchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(gameState.matchHistory, null, 2)],
                      { type: 'application/json' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `elite-clash-matches-${gameState.roomId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
                >
                  تصدير JSON
                </button>
              )}
            </div>

            {gameState.matchHistory.length === 0 ? (
              <div className="p-6 text-center text-stone-500 bg-stone-950 rounded-xl border border-stone-800">
                لم تنتهِ أي جولة بعد في هذه الجلسة.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {gameState.matchHistory.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-amber-300">الجولة {m.roundNumber}</span>
                      <span className="font-mono text-[11px] text-stone-400">
                        {m.turnsCount} أدوار · {m.durationSeconds}ث
                      </span>
                    </div>
                    <div className="text-stone-200">
                      الفائز:{' '}
                      <span
                        className={
                          m.winner === 'red'
                            ? 'text-red-400 font-extrabold'
                            : 'text-blue-400 font-extrabold'
                        }
                      >
                        {m.winner === 'red' ? m.redTeamName : m.blueTeamName}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400">
                      السبب: {m.winReasonAr}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Left Main Area: Interactive Referee 5x5 Board (Tap any card to reveal) */}
      <div className="flex-1 min-h-[420px] flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-900/90 border border-amber-200/15 text-xs">
          <span className="text-stone-300 font-semibold">
            انقر على أي بطاقة أدناه لكشفها فورًا على شاشة الجمهور
          </span>
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
            canClickCards={gameState.status === 'playing'}
            showSecretKeyOverlay={showSecretOnRefBoard}
            onCardClick={handleCardRevealByRef}
          />
        </div>
      </div>
    </div>
  );
};
