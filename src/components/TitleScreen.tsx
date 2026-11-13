import React, { useState, useEffect } from 'react';
import { GAME_MODES_CATALOG, GameMode } from '../game/rules';

interface TitleScreenProps {
  roomId: string;
  activeMode?: GameMode;
  onChangeRoomId: (roomId: string) => void;
  onStartAudience: () => void;
  onRequestProtectedRole: (
    role: 'spymaster_red' | 'spymaster_blue' | 'referee',
    pin: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onClaimOrganizer: () => Promise<{
    ok: boolean;
    refereePin?: string;
    spymasterPin?: string;
    error?: string;
  }>;
}

const PREVIEW_CARDS = [
  { word: 'شيفرة', color: 'red', revealed: true },
  { word: 'مجرّة', color: 'ivory', revealed: false },
  { word: 'بوصلة', color: 'blue', revealed: true },
  { word: 'متاهة', color: 'ivory', revealed: false },
  { word: 'مرصد', color: 'black', revealed: true },
  { word: 'طيف', color: 'ivory', revealed: false },
  { word: 'قافلة', color: 'neutral', revealed: true },
  { word: 'أرشيف', color: 'red', revealed: true },
  { word: 'ميثاق', color: 'ivory', revealed: false },
] as const;

export const TitleScreen: React.FC<TitleScreenProps> = ({
  roomId,
  activeMode = 'classic',
  onChangeRoomId,
  onStartAudience,
  onRequestProtectedRole,
  onClaimOrganizer,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [flippedPreview, setFlippedPreview] = useState<Record<number, boolean>>({});
  const [authModalRole, setAuthModalRole] = useState<
    'spymaster_red' | 'spymaster_blue' | 'referee' | null
  >(null);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimingOrganizer, setClaimingOrganizer] = useState(false);

  // Listen for Enter or Space on title screen when no modal/input is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (authModalRole) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onStartAudience();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalRole, onStartAudience]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx * 10, y: -ny * 10 });
  };

  const handleClaimOrganizerClick = async () => {
    setClaimingOrganizer(true);
    setAuthError(null);
    const res = await onClaimOrganizer();
    if (!res.ok) {
      setClaimingOrganizer(false);
      setAuthError(
        res.error ||
          'تعذر تفعيل صلاحية الحكم. اضغط «غرفة جديدة» أو أعد المحاولة.'
      );
      return;
    }
    // If user wanted Captain view, switch directly into Captain view using the newly issued spymasterPin
    if (
      (authModalRole === 'spymaster_red' || authModalRole === 'spymaster_blue') &&
      res.spymasterPin
    ) {
      await onRequestProtectedRole(authModalRole, res.spymasterPin);
    }
    setClaimingOrganizer(false);
    setAuthModalRole(null);
    setPinInput('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authModalRole) return;
    if (!pinInput.trim()) {
      await handleClaimOrganizerClick();
      return;
    }
    setSubmitting(true);
    setAuthError(null);
    const res = await onRequestProtectedRole(authModalRole, pinInput.trim());
    setSubmitting(false);
    if (!res.ok) {
      setAuthError(res.error || 'رمز الدخول غير صحيح.');
    } else {
      setAuthModalRole(null);
      setPinInput('');
    }
  };

  const handleCreateFreshRoom = () => {
    const suffix = Math.floor(10 + Math.random() * 89);
    const nextRoom = `ELITE-${suffix}`;
    onChangeRoomId(nextRoom);
    setAuthError(null);
  };

  const openAuthModal = (role: 'spymaster_red' | 'spymaster_blue' | 'referee') => {
    setAuthModalRole(role);
    setPinInput('');
    setAuthError(null);
  };

  const currentModeMeta =
    GAME_MODES_CATALOG[activeMode] || GAME_MODES_CATALOG.classic;

  return (
    <main className="relative w-screen h-screen overflow-hidden tabletop-felt flex flex-col justify-between p-6 md:p-10 select-none">
      {/* Subtle geometric board frame lines */}
      <div className="pointer-events-none fixed inset-4 border border-amber-200/10 rounded-2xl" />

      {/* Top Tournament Identity Row */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-amber-100/80 text-sm font-semibold">
          <svg className="w-6 h-6 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="rgba(245, 158, 11, 0.15)"
            />
          </svg>
          <span>دوري صراع النخبة — مسجد ابن تيمية</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-300/90 font-mono">ELITE CLASH</span>
        </div>

        <div className="flex items-center gap-2 bg-stone-900/90 border border-amber-200/15 rounded-xl px-3 py-1.5">
          <label htmlFor="room-id-input" className="text-xs text-stone-400">
            رمز الغرفة:
          </label>
          <input
            id="room-id-input"
            type="text"
            value={roomId}
            onChange={(e) => onChangeRoomId(e.target.value.toUpperCase())}
            className="w-24 bg-transparent text-amber-300 font-mono font-bold text-sm text-center focus:outline-none border-b border-amber-400/30 focus:border-amber-400"
            aria-label="رمز الغرفة"
          />
        </div>
      </div>

      {/* Main stage: game logo and interactive preview */}
      <div
        className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 max-w-7xl w-full mx-auto my-auto py-4"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        {/* Game logo and actions */}
        <div className="lg:col-span-7 flex flex-col items-start text-right space-y-5">
          <img
            src="/codenames-logo.svg"
            alt="CODE NAMES"
            width={500}
            height={112}
            className="w-full max-w-xl h-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          />

          <p className="text-stone-300 text-base md:text-lg max-w-xl leading-relaxed">
            منصة المسابقات الذهنية المتكاملة لـ 6 أنماط لعب رسمية (الكلاسيكي، السريع 4×4، الناشئين بالرسوم، العائلي، التعاوني، ونظام البطولات) مع أكثر من 600 كلمة عربية محكمة في 8 حزم متخصصة.
          </p>

          {/* Active Game Mode Summary Pill */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-200/90 bg-stone-900/85 border border-amber-300/20 rounded-xl px-3.5 py-2">
            <span className="font-extrabold text-amber-400">الطور النشط في الغرفة:</span>
            <span className="font-bold text-white">{currentModeMeta.nameAr}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-stone-300">{currentModeMeta.badge}</span>
          </div>

          {/* Primary Start CTA & Role Actions (<= 3 Menu Actions) */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartAudience();
              }}
              className="px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-base md:text-lg shadow-[0_4px_0_#B45309] active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              تشغيل شاشة اللعب (الجمهور / البروجكتر)
            </button>

            <button
              type="button"
              data-testid="open-spymaster-auth-btn"
              onClick={() => openAuthModal('spymaster_red')}
              className="px-5 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-100 border border-amber-200/20 font-bold text-sm md:text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              دخول القائد (المفتاح السري)
            </button>

            <button
              type="button"
              data-testid="open-referee-auth-btn"
              onClick={() => openAuthModal('referee')}
              className="px-5 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-100 border border-amber-200/20 font-bold text-sm md:text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              لوحة تحكم الحكم
            </button>
          </div>
        </div>

        {/* Left Column: Interactive Centerpiece (Tactile 3x3 Tabletop Card Preview) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div
            style={{
              transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
              transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="w-full max-w-md p-5 rounded-2xl bg-stone-900/90 border border-amber-200/20 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3 text-xs text-stone-400">
              <span>معاينة تفاعلية للبطاقات الورقية (انقر لتجربة الكشف)</span>
              <span className="font-mono text-amber-300 tabular-nums">9 / 8 / 7 / 1</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {PREVIEW_CARDS.map((card, idx) => {
                const isRevealed = flippedPreview[idx] ?? card.revealed;
                const colorClass = !isRevealed
                  ? 'codenames-card-ivory'
                  : card.color === 'red'
                  ? 'codenames-card-red'
                  : card.color === 'blue'
                  ? 'codenames-card-blue'
                  : card.color === 'black'
                  ? 'codenames-card-black'
                  : 'codenames-card-neutral';

                return (
                  <button
                    key={card.word}
                    type="button"
                    onClick={() =>
                      setFlippedPreview((prev) => ({
                        ...prev,
                        [idx]: !isRevealed,
                      }))
                    }
                    className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center relative transition-transform duration-150 cursor-pointer ${colorClass}`}
                    aria-label={`معاينة بطاقة ${card.word}`}
                  >
                    <span className="text-[10px] opacity-60 font-mono absolute top-1.5 right-2 tabular-nums">
                      0{idx + 1}
                    </span>
                    <span className="font-extrabold text-base md:text-lg tracking-tight">
                      {card.word}
                    </span>
                    {isRevealed && card.color === 'black' && (
                      <span className="text-[10px] text-red-400 font-bold mt-0.5">
                        ⚠ سوداء
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Control-Hint Line */}
      <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 pt-2">
        <span>Enter أو Space لبدء شاشة العرض · F ملء الشاشة · P إيقاف مؤقت · M كتم الصوت</span>
        <span className="font-mono tabular-nums">600+ كلمة عربية محكمة · 6 أطوار لعب · حماية جلسات كاملة</span>
      </div>

      {/* Role Authentication Modal */}
      {authModalRole && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <form
            onSubmit={handleAuthSubmit}
            className="w-full max-w-md bg-stone-900 border border-amber-200/25 rounded-2xl p-6 shadow-2xl space-y-4 text-right"
          >
            <div className="flex items-center justify-between">
              <h2 id="auth-modal-title" className="text-xl font-extrabold text-amber-100">
                {authModalRole === 'referee'
                  ? 'دخول لوحة الحكم والمنظم'
                  : 'دخول شاشة القائد (المفتاح السري)'}
              </h2>
              <button
                type="button"
                onClick={() => setAuthModalRole(null)}
                className="text-stone-400 hover:text-white text-sm px-2 py-1 cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            {authModalRole !== 'referee' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAuthModalRole('spymaster_red')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-sm border transition-colors cursor-pointer ${
                    authModalRole === 'spymaster_red'
                      ? 'bg-red-700 text-white border-red-400'
                      : 'bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  القائد الأحمر
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModalRole('spymaster_blue')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-sm border transition-colors cursor-pointer ${
                    authModalRole === 'spymaster_blue'
                      ? 'bg-blue-700 text-white border-blue-400'
                      : 'bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  القائد الأزرق
                </button>
              </div>
            )}

            {/* One-Click Organizer Claim for Unclaimed Rooms (Works for both Referee and Captain) */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-amber-400/30 space-y-2">
              <div className="text-xs font-bold text-amber-200">
                بدء مباراة جديدة في الغرفة ({roomId})؟
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                إذا كنت المنظم وتفتح هذه الغرفة لأول مرة، اضغط الزر أدناه للدخول المباشر وإصدار رموز الغرفة والباركود السري.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="claim-organizer-btn"
                  disabled={claimingOrganizer}
                  onClick={handleClaimOrganizerClick}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-extrabold text-xs cursor-pointer transition-colors"
                >
                  {claimingOrganizer
                    ? 'جارٍ التفعيل...'
                    : authModalRole === 'referee'
                    ? 'تفعيل صلاحية الحكم والدخول المباشر'
                    : 'تفعيل الغرفة والدخول المباشر كقائد'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateFreshRoom}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  غرفة جديدة
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="role-pin-input" className="block text-xs text-stone-300 mb-1.5">
                {authModalRole === 'referee'
                  ? 'أو أدخل رمز دخول الحكم الخاص بالغرفة:'
                  : 'أو أدخل رمز القائد السري لهذه الجولة (من شاشة الحكم أو QR):'}
              </label>
              <input
                id="role-pin-input"
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="أدخل الرمز السري المكون من 4 أرقام"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-amber-200 font-mono text-center text-lg focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {authError && (
              <p data-testid="auth-error-msg" className="text-xs text-red-400 font-semibold">
                {authError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAuthModalRole(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-sm font-semibold hover:bg-stone-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                data-testid="submit-auth-pin-btn"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
              >
                {submitting ? 'جارٍ التحقق...' : 'تأكيد الدخول بالرمز'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};
