import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ClientGameState,
  ClientRole,
  GameSettings,
  getWinReasonArabic,
} from '../game/rules';

interface RoomShareModalProps {
  roomId: string;
  gameState: ClientGameState;
  onClose: () => void;
  onSwitchRole: (role: ClientRole, pin?: string) => Promise<{ ok: boolean; error?: string }>;
  onRegeneratePin: () => Promise<{ ok: boolean; spymasterPin?: string }>;
}

export const RoomShareModal: React.FC<RoomShareModalProps> = ({
  roomId,
  gameState,
  onClose,
  onSwitchRole,
  onRegeneratePin,
}) => {
  const [qrTab, setQrTab] = useState<'spymaster_red' | 'spymaster_blue' | 'referee' | 'audience'>('spymaster_red');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [liveSpymasterPin, setLiveSpymasterPin] = useState<string>(gameState.spymasterPin || '');
  const [liveRefereePin, setLiveRefereePin] = useState<string>(gameState.refereePin || '');
  const [liveRoundSeed, setLiveRoundSeed] = useState<string>(gameState.roundSeed || '');
  const [pinInput, setPinInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<ClientRole>('spymaster_red');
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fetch current dynamic game PINs and seed when modal opens
  useEffect(() => {
    let active = true;
    fetch(`/api/rooms/${encodeURIComponent(roomId)}/qr-info`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.ok) return;
        setLiveSpymasterPin(data.spymasterPin || '');
        setLiveRefereePin(data.refereePin || '');
        setLiveRoundSeed(data.roundSeed || gameState.roundSeed);
      })
      .catch(() => {
        if (!active) return;
        setLiveSpymasterPin(gameState.spymasterPin || '2026');
        setLiveRefereePin(gameState.refereePin || '1446');
        setLiveRoundSeed(gameState.roundSeed);
      });
    return () => {
      active = false;
    };
  }, [roomId, gameState.spymasterPin, gameState.refereePin, gameState.roundSeed]);

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const buildTargetUrl = (targetRole: 'spymaster_red' | 'spymaster_blue' | 'referee' | 'audience') => {
    const params = new URLSearchParams();
    params.set('room', roomId);
    params.set('round', String(gameState.roundNumber));
    if (liveRoundSeed) {
      params.set('seed', liveRoundSeed);
    }
    params.set('start', gameState.startingTeam);

    if (targetRole === 'audience') {
      params.set('autostart', '1');
    } else if (targetRole === 'referee') {
      params.set('role', 'referee');
      if (liveRefereePin) params.set('pin', liveRefereePin);
    } else {
      params.set('role', targetRole);
      if (liveSpymasterPin) params.set('pin', liveSpymasterPin);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const activeTargetUrl = buildTargetUrl(qrTab);

  // Generate real scannable QR Code image whenever target URL changes
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(activeTargetUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#161412',
        light: '#FBF8F1',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeTargetUrl]);

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(activeTargetUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateClick = async () => {
    const res = await onRegeneratePin();
    if (res.ok && res.spymasterPin) {
      setLiveSpymasterPin(res.spymasterPin);
    }
  };

  const handleRoleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const pinToUse =
      pinInput.trim() ||
      (selectedRole === 'referee' ? liveRefereePin : liveSpymasterPin);
    const res = await onSwitchRole(selectedRole, pinToUse);
    if (!res.ok) {
      setAuthError(res.error || 'رمز الدخول غير صحيح.');
    } else {
      onClose();
    }
  };

  return (
    <div
      data-testid="qr-share-modal"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-xl bg-stone-900 border border-amber-200/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-right my-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <h2 id="share-modal-title" className="text-lg font-extrabold text-amber-200">
              باركود القائد والحكم (QR) · الجولة #{gameState.roundNumber}
            </h2>
            <p className="text-xs text-stone-400">
              امسح الكود بكاميرا هاتف القائد لفتح المفتاح السري لهذه الجولة مباشرةً
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        {/* Select Which QR Code to Display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setQrTab('spymaster_red')}
            className={`py-2 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              qrTab === 'spymaster_red'
                ? 'bg-red-600 text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            ◇ QR القائد الأحمر
          </button>
          <button
            type="button"
            onClick={() => setQrTab('spymaster_blue')}
            className={`py-2 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              qrTab === 'spymaster_blue'
                ? 'bg-blue-600 text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            ○ QR القائد الأزرق
          </button>
          <button
            type="button"
            onClick={() => setQrTab('referee')}
            className={`py-2 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              qrTab === 'referee'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            QR هاتف الحكم
          </button>
          <button
            type="button"
            onClick={() => setQrTab('audience')}
            className={`py-2 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
              qrTab === 'audience'
                ? 'bg-stone-700 text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            QR شاشة الجمهور
          </button>
        </div>

        {/* Scannable QR Code Card + Dynamic Per-Game PIN Readout */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-stone-950 border border-stone-800">
          <div className="shrink-0 p-3 rounded-2xl bg-[#FBF8F1] border-2 border-amber-400/60 shadow-lg">
            {qrDataUrl ? (
              <img
                data-testid="spymaster-qr-image"
                src={qrDataUrl}
                alt={`رمز استجابة سريعة QR لـ ${qrTab}`}
                referrerPolicy="no-referrer"
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-stone-800 text-xs font-bold">
                جارٍ توليد QR...
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 text-right w-full">
            <div className="space-y-1">
              <div className="text-xs text-stone-400">
                {qrTab === 'spymaster_red'
                  ? 'باركود الدخول المباشر للقائد الأحمر'
                  : qrTab === 'spymaster_blue'
                  ? 'باركود الدخول المباشر للقائد الأزرق'
                  : qrTab === 'referee'
                  ? 'باركود لوحة تحكم الحكم'
                  : 'باركود شاشة المشاهدين'}
              </div>
              <div className="text-sm font-extrabold text-white">
                الغرفة: <span className="font-mono text-amber-300">{roomId}</span> · الجولة #{gameState.roundNumber}
              </div>
            </div>

            {qrTab !== 'audience' && (
              <div className="p-3 rounded-xl bg-stone-900 border border-amber-400/30 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-stone-400">
                    {qrTab === 'referee'
                      ? 'رمز الحكم الخاص بهذه الغرفة:'
                      : 'رمز القائد الخاص بهذه الجولة فقط:'}
                  </div>
                  <div
                    data-testid="dynamic-game-pin"
                    className="text-2xl font-mono font-extrabold text-amber-300 tracking-widest tabular-nums"
                  >
                    {qrTab === 'referee' ? liveRefereePin : liveSpymasterPin}
                  </div>
                </div>

                {qrTab !== 'referee' && (
                  <button
                    type="button"
                    onClick={handleRegenerateClick}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-bold border border-amber-200/20 cursor-pointer"
                  >
                    تغيير الرمز
                  </button>
                )}
              </div>
            )}

            <p className="text-[11px] text-stone-400 leading-relaxed">
              يتغير رمز القائد تلقائيًا مع كل جولة جديدة لمنع دخول قادة الجولات السابقة، كما يتضمن الباركود البذرة الرقمية للجولة ليعمل حتى على الاستضافات الثابتة (مثل GitHub Pages).
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs cursor-pointer"
              >
                {copiedLink ? 'تم نسخ الرابط ✓' : 'نسخ رابط الدخول المباشر'}
              </button>
              <a
                href="/assets/aistudio/CN_rulebook_EN_30_4eed9759.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs whitespace-nowrap"
              >
                كتيب القواعد PDF
              </a>
            </div>
          </div>
        </div>

        {/* Direct Role Switcher on Current Device */}
        <form
          onSubmit={handleRoleSwitch}
          className="p-3.5 rounded-xl bg-stone-950 border border-amber-200/15 space-y-2.5"
        >
          <div className="text-xs font-extrabold text-amber-200">
            أو تبديل الواجهة على هذا الجهاز الآن:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('audience');
                setPinInput('');
              }}
              className={`py-2 px-2 rounded-lg font-bold cursor-pointer ${
                selectedRole === 'audience'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              الجمهور
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('spymaster_red');
                setPinInput(liveSpymasterPin);
              }}
              className={`py-2 px-2 rounded-lg font-bold cursor-pointer ${
                selectedRole === 'spymaster_red'
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              ◇ القائد الأحمر
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('spymaster_blue');
                setPinInput(liveSpymasterPin);
              }}
              className={`py-2 px-2 rounded-lg font-bold cursor-pointer ${
                selectedRole === 'spymaster_blue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              ○ القائد الأزرق
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('referee');
                setPinInput(liveRefereePin);
              }}
              className={`py-2 px-2 rounded-lg font-bold cursor-pointer ${
                selectedRole === 'referee'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              لوحة الحكم
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedRole !== 'audience' && (
              <input
                type="text"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={
                  selectedRole === 'referee'
                    ? `رمز الحكم (${liveRefereePin})`
                    : `رمز القائد للجولة (${liveSpymasterPin})`
                }
                aria-label="رمز الدخول لتبديل الواجهة"
                className="flex-1 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-amber-200 font-mono text-center text-sm"
              />
            )}
            <button
              type="submit"
              className="flex-1 py-2 px-5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-400/30 font-extrabold text-xs cursor-pointer"
            >
              انتقال للواجهة المختارة
            </button>
          </div>

          {authError && <p className="text-xs text-red-400 font-semibold">{authError}</p>}
        </form>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onToggleFullscreen,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-md bg-stone-900 border border-amber-200/25 rounded-2xl p-6 shadow-2xl space-y-4 text-right text-xs">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h2 id="settings-modal-title" className="text-lg font-extrabold text-amber-200">
            إعدادات العرض والمباراة
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-800 text-stone-300 font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <span>تفعيل وضع ملء الشاشة (Full Screen)</span>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold cursor-pointer"
            >
              تبديل ملء الشاشة
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <span>وضع تباين البروجكتر العالي</span>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  projectorHighContrast: !settings.projectorHighContrast,
                })
              }
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                settings.projectorHighContrast
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              {settings.projectorHighContrast ? 'مفعّل' : 'عادي'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <span>حجم خط الكلمات على البطاقات</span>
            <div className="flex gap-1">
              {(['normal', 'large', 'xlarge'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onUpdateSettings({ fontScale: scale })}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    settings.fontScale === scale
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {scale === 'normal' ? 'عادي' : scale === 'large' ? 'كبير' : 'ضخم'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <span>لغة البطاقات</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ languageMode: 'ar' })}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                  settings.languageMode === 'ar'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                عربي فقط
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ languageMode: 'ar_en' })}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                  settings.languageMode === 'ar_en'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                عربي / إنجليزي
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span>مؤقت الدور</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ timerEnabled: !settings.timerEnabled })}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                  settings.timerEnabled
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {settings.timerEnabled ? 'مفعّل' : 'معطّل'}
              </button>
            </div>
            {settings.timerEnabled && (
              <div className="flex items-center justify-between pt-1">
                <span>مدة المؤقت (ثانية)</span>
                <div className="flex gap-1 font-mono">
                  {[60, 90, 120, 180].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateSettings({ timerDurationSeconds: sec })}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                        settings.timerDurationSeconds === sec
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <span>المؤثرات الصوتية</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              {settings.soundEnabled ? 'مفعّلة' : 'صامت'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <span>قاعدة التخمين الإضافي (+1)</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ plusOneRule: !settings.plusOneRule })}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                settings.plusOneRule
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              {settings.plusOneRule ? 'مفعّلة (+1)' : 'معطّلة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatusModalProps {
  gameState: ClientGameState;
  onResume: () => void;
  onNewRound: () => void;
  onUndo: () => void;
  onBackToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  onResume,
  onNewRound,
  onUndo,
  onBackToTitle,
}) => {
  if (gameState.status !== 'paused' && gameState.status !== 'gameover') {
    return null;
  }

  const isGameOver = gameState.status === 'gameover';
  const winnerName =
    gameState.winner === 'red' ? gameState.redTeamName : gameState.blueTeamName;
  const loserName =
    gameState.loser === 'red' ? gameState.redTeamName : gameState.blueTeamName;

  return (
    <div
      data-testid={isGameOver ? 'gameover-modal' : 'pause-modal'}
      className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-stone-900 border-2 border-amber-300/35 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden">
        {isGameOver && (
          <div
            className={`h-2 w-full absolute top-0 inset-x-0 ${
              gameState.winner === 'red' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          />
        )}

        {isGameOver ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 mx-auto">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-300 uppercase">
                نهاية الجولة {gameState.roundNumber} · ELITE CLASH
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                الفائز: {winnerName}
              </h2>
              {gameState.winReason && (
                <p className="text-sm text-stone-300">
                  {getWinReasonArabic(gameState.winReason)}
                </p>
              )}
              {gameState.winReason === 'black_card' && (
                <p className="text-xs text-red-400 font-bold">
                  خسر {loserName} فورًا بسبب كشف البطاقة السوداء!
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">عدد الأدوار</div>
                <div className="text-xl font-mono font-extrabold text-amber-300 tabular-nums">
                  {gameState.turnsCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">البطاقات المتبقية</div>
                <div className="text-base sm:text-lg font-mono font-extrabold tabular-nums flex items-center justify-center gap-2 mt-0.5">
                  <span className="text-red-400">أحمر {gameState.redRemaining}</span>
                  <span className="text-stone-600">·</span>
                  <span className="text-blue-400">أزرق {gameState.blueRemaining}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">انتصارات الجلسة</div>
                <div className="text-xl font-mono font-extrabold text-amber-300 tabular-nums">
                  {gameState.redWinsCount} - {gameState.blueWinsCount}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                data-start="true"
                onClick={onNewRound}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
              >
                بدء جولة جديدة (برمز جديد)
              </button>
              {gameState.canUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm cursor-pointer"
                >
                  تراجع عن آخر حركة
                </button>
              )}
              <button
                type="button"
                onClick={onBackToTitle}
                className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm cursor-pointer"
              >
                شاشة البداية
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold text-amber-200">
              الجولة متوقفة مؤقتًا
            </h2>
            <p className="text-sm text-stone-300">
              تم إيقاف المؤقت واللعب مؤقتًا. يمكنك استئناف اللعب أو بدء جولة جديدة.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onResume}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
              >
                استئناف اللعب
              </button>
              <button
                type="button"
                onClick={onNewRound}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm cursor-pointer"
              >
                جولة جديدة
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm cursor-pointer"
              >
                شاشة البداية
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
