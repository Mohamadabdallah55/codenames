import React, { useState, useEffect } from 'react';
import { ClientRole } from '../game/rules';

interface TitleScreenProps {
  roomId: string;
  onChangeRoomId: (roomId: string) => void;
  onStartAudience: () => void;
  onRequestProtectedRole: (role: 'spymaster_red' | 'spymaster_blue' | 'referee', pin: string) => Promise<{ ok: boolean; error?: string }>;
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
  onChangeRoomId,
  onStartAudience,
  onRequestProtectedRole,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [flippedPreview, setFlippedPreview] = useState<Record<number, boolean>>({});
  const [authModalRole, setAuthModalRole] = useState<'spymaster_red' | 'spymaster_blue' | 'referee' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authModalRole) return;
    setSubmitting(true);
    setAuthError(null);
    const res = await onRequestProtectedRole(authModalRole, pinInput);
    setSubmitting(false);
    if (!res.ok) {
      setAuthError(res.error || 'رمز الدخول غير صحيح.');
    } else {
      setAuthModalRole(null);
      setPinInput('');
    }
  };

  const openAuthModal = (role: 'spymaster_red' | 'spymaster_blue' | 'referee', defaultPinHint: string) => {
    setAuthModalRole(role);
    setPinInput(defaultPinHint);
    setAuthError(null);
  };

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

      {/* Main Split Stage: 40%+ Calm Negative Space with SVG Title Lockup + Interactive Tactile Centerpiece */}
      <div
        className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 max-w-7xl w-full mx-auto my-auto py-4"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        {/* Right Column (RTL Primary): Bespoke SVG Emblem, Title Lockup & Actions */}
        <div className="lg:col-span-7 flex flex-col items-start text-right space-y-6">
          {/* Custom Inline SVG Title Lockup & Geometric Emblem */}
          <div className="w-full max-w-xl" dir="ltr">
            <svg
              direction="ltr"
              viewBox="0 0 620 155"
              className="w-full h-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
              role="img"
              aria-label="CODE NAMES — ELITE CLASH"
            >
              {/* Diegetic Board Plaque Frame */}
              <rect
                x="4"
                y="8"
                width="612"
                height="138"
                rx="16"
                fill="#1E1B18"
                stroke="#D6C5A9"
                strokeWidth="2"
                strokeOpacity="0.35"
              />
              {/* Red & Blue Team Corner Accents */}
              <path d="M20 8 H160 L145 16 H20 Z" fill="#DC2626" />
              <path d="M460 8 H600 L600 16 H475 Z" fill="#2563EB" />
              <path d="M20 146 H145 L160 138 H20 Z" fill="#2563EB" />
              <path d="M475 146 H600 L600 138 H460 Z" fill="#DC2626" />

              {/* Geometric Key-Card Crest on Right Side */}
              <g transform="translate(505, 33)">
                <rect x="0" y="0" width="88" height="88" rx="12" fill="#F7F3E8" stroke="#A89984" strokeWidth="2" />
                <rect x="8" y="8" width="20" height="20" rx="4" fill="#DC2626" />
                <rect x="34" y="8" width="20" height="20" rx="4" fill="#2563EB" />
                <rect x="60" y="8" width="20" height="20" rx="4" fill="#D6CBB5" />
                <rect x="8" y="34" width="20" height="20" rx="4" fill="#2563EB" />
                <rect x="34" y="34" width="20" height="20" rx="4" fill="#18181B" />
                <rect x="60" y="34" width="20" height="20" rx="4" fill="#DC2626" />
                <rect x="8" y="60" width="20" height="20" rx="4" fill="#D6CBB5" />
                <rect x="34" y="60" width="20" height="20" rx="4" fill="#DC2626" />
                <rect x="60" y="60" width="20" height="20" rx="4" fill="#2563EB" />
              </g>

              {/* Main Display Title Typography Centered in Plaque Left/Middle Area */}
              <text
                x="255"
                y="64"
                textAnchor="middle"
                fill="#FBF8F1"
                fontFamily="Changa, Cairo, sans-serif"
                fontWeight="800"
                fontSize="44"
                letterSpacing="2"
              >
                CODE NAMES
              </text>
              <text
                x="255"
                y="102"
                textAnchor="middle"
                fill="#F59E0B"
                fontFamily="Cairo, sans-serif"
                fontWeight="800"
                fontSize="23"
              >
                ELITE CLASH — دوري صراع النخبة
              </text>
              <text
                x="255"
                y="129"
                textAnchor="middle"
                fill="#A8A29E"
                fontFamily="Cairo, sans-serif"
                fontWeight="600"
                fontSize="14"
              >
                مسجد ابن تيمية · التحدي الذهني الجماعي للفرق (A — F)
              </text>
            </svg>
          </div>

          <p className="text-stone-300 text-base md:text-lg max-w-xl leading-relaxed">
            شبكة من 25 كلمة عربية أصيلة، فريقان متنافسان (الأحمر والأزرق)، وقائدان يملكان المفتاح السري. اربط الكلمات بتلميح ذكي من كلمة واحدة ورقم، واحذر من البطاقة السوداء القاتلة.
          </p>

          {/* Primary Start CTA & Role Actions (<= 3 Menu Actions) */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
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
              onClick={() => openAuthModal('spymaster_red', '2026')}
              className="px-5 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-100 border border-amber-200/20 font-bold text-sm md:text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              دخول القائد (المفتاح السري)
            </button>

            <button
              type="button"
              onClick={() => openAuthModal('referee', '1446')}
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
        <span className="font-mono tabular-nums">500+ كلمة عربية محكمة · مزامنة لحظية WebSocket</span>
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
                {authModalRole === 'referee' ? 'دخول لوحة الحكم' : 'دخول شاشة القائد (المفتاح السري)'}
              </h2>
              <button
                type="button"
                onClick={() => setAuthModalRole(null)}
                className="text-stone-400 hover:text-white text-sm px-2 py-1"
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

            <div>
              <label htmlFor="role-pin-input" className="block text-xs text-stone-300 mb-1.5">
                {authModalRole === 'referee'
                  ? 'رمز دخول الحكم (الافتراضي: 1446):'
                  : 'رمز دخول القائد السري (الافتراضي: 2026):'}
              </label>
              <input
                id="role-pin-input"
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="أدخل الرمز السري"
                className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-amber-200 font-mono text-center text-lg focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-xs text-red-400 font-semibold">{authError}</p>
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
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
              >
                {submitting ? 'جارٍ التحقق...' : 'تأكيد الدخول'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};
