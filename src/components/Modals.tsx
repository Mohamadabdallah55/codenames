import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ClientGameState,
  ClientRole,
  GAME_MODES_CATALOG,
  GameSettings,
  getWinReasonArabic,
} from '../game/rules';
import { soundFX } from '../utils/sound';

interface RoomShareModalProps {
  roomId: string;
  gameState: ClientGameState;
  sessionToken?: string;
  pin?: string;
  onClose: () => void;
  onSwitchRole: (role: ClientRole, pin?: string) => Promise<{ ok: boolean; error?: string }>;
  onClaimOrganizer: (keepAudienceState?: boolean) => Promise<{
    ok: boolean;
    refereePin?: string;
    spymasterPin?: string;
    error?: string;
  }>;
  onRegeneratePin: () => Promise<{ ok: boolean; spymasterPin?: string }>;
}

export const RoomShareModal: React.FC<RoomShareModalProps> = ({
  roomId,
  gameState,
  sessionToken,
  pin,
  onClose,
  onSwitchRole,
  onClaimOrganizer,
  onRegeneratePin,
}) => {
  const [qrTab, setQrTab] = useState<'spymaster_red' | 'spymaster_blue' | 'referee' | 'audience'>(
    'spymaster_red'
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [authorizedQr, setAuthorizedQr] = useState<boolean>(
    Boolean(sessionToken || gameState.role !== 'audience')
  );
  const [refereeClaimed, setRefereeClaimed] = useState<boolean>(true);
  const [liveSpymasterPin, setLiveSpymasterPin] = useState<string>(gameState.spymasterPin || '');
  const [liveRefereePin, setLiveRefereePin] = useState<string>(gameState.refereePin || '');
  const [pinInput, setPinInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<ClientRole>(
    gameState.role === 'audience' ? 'referee' : gameState.role
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  // Fetch protected QR info with current credentials (never falls back to hardcoded PINs)
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (sessionToken) params.set('sessionToken', sessionToken);
    if (pin) params.set('pin', pin);

    fetch(`/api/rooms/${encodeURIComponent(roomId)}/qr-info?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.ok) return;
        setRefereeClaimed(Boolean(data.refereeClaimed));
        if (data.authorized) {
          setAuthorizedQr(true);
          if (data.spymasterPin) setLiveSpymasterPin(data.spymasterPin);
          if (data.refereePin) setLiveRefereePin(data.refereePin);
        } else {
          setAuthorizedQr(false);
          setLiveSpymasterPin('');
          setLiveRefereePin('');
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthorizedQr(Boolean(gameState.spymasterPin || gameState.refereePin));
      });
    return () => {
      active = false;
    };
  }, [roomId, sessionToken, pin, gameState.spymasterPin, gameState.refereePin, gameState.roundNumber]);

  const baseUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const buildTargetUrl = (
    targetRole: 'spymaster_red' | 'spymaster_blue' | 'referee' | 'audience'
  ) => {
    const params = new URLSearchParams();
    params.set('room', roomId);
    params.set('round', String(gameState.roundNumber));
    params.set('start', gameState.startingTeam);

    if (targetRole === 'audience') {
      params.set('autostart', '1');
    } else if (targetRole === 'referee') {
      params.set('role', 'referee');
      if (authorizedQr && liveRefereePin) params.set('pin', liveRefereePin);
    } else {
      params.set('role', targetRole);
      if (authorizedQr && liveSpymasterPin) params.set('pin', liveSpymasterPin);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const activeTargetUrl = buildTargetUrl(qrTab);
  const isTabLocked =
    qrTab !== 'audience' &&
    (!authorizedQr || (qrTab === 'referee' && !liveRefereePin));

  // Generate real scannable QR Code image whenever target URL changes and is unlocked
  useEffect(() => {
    let active = true;
    if (isTabLocked) {
      setQrDataUrl('');
      return;
    }
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
  }, [activeTargetUrl, isTabLocked]);

  const handleCopyUrl = () => {
    if (isTabLocked) return;
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

  const handleClaimClick = async (enterRefereePanel = false) => {
    setClaiming(true);
    setAuthError(null);
    const keepAudience = enterRefereePanel ? false : gameState.role === 'audience';
    const res = await onClaimOrganizer(keepAudience);
    setClaiming(false);
    if (res.ok) {
      setAuthorizedQr(true);
      setRefereeClaimed(true);
      if (res.refereePin) setLiveRefereePin(res.refereePin);
      if (res.spymasterPin) setLiveSpymasterPin(res.spymasterPin);
      if (enterRefereePanel) {
        onClose();
      } else {
        setQrTab('spymaster_red');
      }
    } else {
      setAuthError(res.error || 'تعذر تفعيل صلاحية المنظم.');
    }
  };

  const handleRoleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (selectedRole === 'audience') {
      await onSwitchRole('audience');
      onClose();
      return;
    }
    const pinToUse =
      pinInput.trim() ||
      (selectedRole === 'referee' ? liveRefereePin : liveSpymasterPin);

    if (!pinToUse) {
      // Automatically claim organizer credentials and switch to the requested role seamlessly
      setClaiming(true);
      const claimRes = await onClaimOrganizer(false);
      setClaiming(false);
      if (!claimRes.ok) {
        setAuthError(claimRes.error || 'تعذر تفعيل صلاحية الحكم.');
        return;
      }
      if (
        (selectedRole === 'spymaster_red' || selectedRole === 'spymaster_blue') &&
        claimRes.spymasterPin
      ) {
        await onSwitchRole(selectedRole, claimRes.spymasterPin);
      }
      onClose();
      return;
    }

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
              روابط ورموز الدخول المحمية للقادة والحكم وشاشة الجمهور
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

        {/* Protected or Scannable QR Code Card */}
        {isTabLocked ? (
          <div
            data-testid="qr-locked-notice"
            className="p-5 rounded-2xl bg-stone-950 border border-amber-400/30 space-y-3 text-center"
          >
            <div className="text-sm font-extrabold text-amber-200">
              🔒 باركود القادة والحكم محمي لمنع كشف المفتاح السري للجمهور
            </div>
            <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
              اضغط الزر أدناه لتفعيل صلاحية الحكم أو المنظم وإظهار باركود القادة ورمز الجولة السري فورًا.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                data-testid="modal-claim-organizer-btn"
                disabled={claiming}
                onClick={() => handleClaimClick(false)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs cursor-pointer shadow-lg"
              >
                {claiming
                  ? 'جارٍ التفعيل...'
                  : 'تفعيل صلاحية الحكم وإظهار QR القادة'}
              </button>
              <button
                type="button"
                data-testid="modal-open-referee-panel-btn"
                disabled={claiming}
                onClick={() => handleClaimClick(true)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-400/40 font-extrabold text-xs cursor-pointer"
              >
                فتح لوحة تحكم الحكم الكاملة
              </button>
            </div>
            {refereeClaimed && (
              <span className="sr-only">الغرفة مفعلة</span>
            )}
          </div>
        ) : (
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
                      تغيير الرمز وإلغاء الجلسات
                    </button>
                  )}
                </div>
              )}

              <p className="text-[11px] text-stone-400 leading-relaxed">
                يتغير رمز القائد تلقائيًا مع كل جولة جديدة ويُلغي صلاحية جلسات القادة السابقة فورًا لمنع أي كشف غير مصرح به.
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
        )}

        {/* Direct Role Switcher on Current Device */}
        <form
          onSubmit={handleRoleSwitch}
          className="p-3.5 rounded-xl bg-stone-950 border border-amber-200/15 space-y-2.5"
        >
          <div className="text-xs font-extrabold text-amber-200">
            تبديل الواجهة على هذا الجهاز (يتطلب رمز الغرفة السري):
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
                if (authorizedQr && liveSpymasterPin) setPinInput(liveSpymasterPin);
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
                if (authorizedQr && liveSpymasterPin) setPinInput(liveSpymasterPin);
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
                if (authorizedQr && liveRefereePin) setPinInput(liveRefereePin);
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
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={
                  selectedRole === 'referee'
                    ? 'أدخل رمز الحكم السري'
                    : 'أدخل رمز القائد للجولة'
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
  canEditSettings: boolean;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  canEditSettings,
  onUpdateSettings,
  onToggleFullscreen,
  onClose,
}) => {
  const [localVolume, setLocalVolume] = useState<number>(
    settings.soundVolume ?? soundFX.getVolume()
  );

  const handleVolumeChange = (nextVol: number) => {
    setLocalVolume(nextVol);
    soundFX.setVolume(nextVol);
    if (canEditSettings) {
      onUpdateSettings({ soundVolume: nextVol });
    }
  };

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
            إعدادات العرض والصوت والمباراة
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

          {/* Sound & Master Volume Controls */}
          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span>المؤثرات الصوتية</span>
              <button
                type="button"
                onClick={() => {
                  const next = !settings.soundEnabled;
                  soundFX.setMuted(!next);
                  if (canEditSettings) {
                    onUpdateSettings({ soundEnabled: next });
                  }
                }}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300'
                }`}
              >
                {settings.soundEnabled ? 'مفعّلة' : 'صامت'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>مستوى الصوت ({Math.round(localVolume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={localVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-40 accent-amber-500 cursor-pointer"
                aria-label="مستوى الصوت"
              />
            </div>
          </div>

          {canEditSettings ? (
            <>
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
                <span>مؤثرات البث التلفزيوني (TV Motion Graphics)</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      broadcastEffectsEnabled: !settings.broadcastEffectsEnabled,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    settings.broadcastEffectsEnabled
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {settings.broadcastEffectsEnabled ? 'مفعّلة' : 'معطّلة'}
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
                    onClick={() =>
                      onUpdateSettings({ timerEnabled: !settings.timerEnabled })
                    }
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
                          onClick={() =>
                            onUpdateSettings({ timerDurationSeconds: sec })
                          }
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
                <span>قاعدة التخمين الإضافي (+1)</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ plusOneRule: !settings.plusOneRule })
                  }
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    settings.plusOneRule
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {settings.plusOneRule ? 'مفعّلة (+1)' : 'معطّلة'}
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-400 text-[11px]">
              تعديل إعدادات المباراة متاح فقط من لوحة تحكم الحكم المعتمد.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatusModalProps {
  gameState: ClientGameState;
  canControlMatch: boolean;
  onResume: () => void;
  onNewRound: () => void;
  onUndo: () => void;
  onBackToTitle: () => void;
  onClose?: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  canControlMatch,
  onResume,
  onNewRound,
  onUndo,
  onBackToTitle,
  onClose,
}) => {
  if (gameState.status !== 'paused' && gameState.status !== 'gameover') {
    return null;
  }

  const isGameOver = gameState.status === 'gameover';
  const winnerName =
    gameState.winner === 'red' ? gameState.redTeamName : gameState.blueTeamName;
  const loserName =
    gameState.loser === 'red' ? gameState.redTeamName : gameState.blueTeamName;
  const modeMeta =
    GAME_MODES_CATALOG[gameState.settings.gameMode] ||
    GAME_MODES_CATALOG.classic;
  const revealedTotal = gameState.cards.filter((c) => c.revealed).length;

  return (
    <div
      data-testid={isGameOver ? 'gameover-modal' : 'pause-modal'}
      className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-stone-900 border-2 border-amber-300/35 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden my-auto">
        {onClose && (
          <button type="button" onClick={onClose} aria-label="العودة إلى أدوات الحكم"
            className="absolute top-3 end-3 z-10 h-11 w-11 rounded-xl border border-stone-700 bg-stone-950 text-xl text-amber-200 hover:bg-stone-800 cursor-pointer">
            <span aria-hidden="true">×</span>
          </button>
        )}
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
                نهاية الجولة #{gameState.roundNumber} · {modeMeta.nameAr}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {gameState.settings.gameMode === 'cooperative' && gameState.winner === 'blue'
                  ? 'انتهت المهمة التعاونية بالخسارة'
                  : `الفائز: ${winnerName}`}
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

            {/* Post-Match Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">عدد الأدوار</div>
                <div className="text-xl font-mono font-extrabold text-amber-300 tabular-nums">
                  {gameState.turnsCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">البطاقات المكشوفة</div>
                <div className="text-xl font-mono font-extrabold text-white tabular-nums">
                  {revealedTotal} / {gameState.cards.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">البطاقات المتبقية</div>
                <div className="text-sm font-mono font-extrabold tabular-nums flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-red-400">أحمر {gameState.redRemaining}</span>
                  {gameState.settings.gameMode !== 'cooperative' && (
                    <>
                      <span className="text-stone-600">·</span>
                      <span className="text-blue-400">أزرق {gameState.blueRemaining}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div className="text-[11px] text-stone-400">انتصارات الجلسة</div>
                <div className="text-xl font-mono font-extrabold text-amber-300 tabular-nums">
                  {gameState.redWinsCount} - {gameState.blueWinsCount}
                </div>
              </div>
            </div>

            {/* Clue Timeline Summary */}
            {gameState.clueHistory.length > 0 && (
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-right space-y-1.5">
                <div className="text-[11px] font-bold text-stone-400">
                  ملخص التلميحات المعلنة في الجولة ({gameState.clueHistory.length}):
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {gameState.clueHistory.map((clue, idx) => (
                    <span
                      key={`${clue.word}-${idx}`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        clue.team === 'red'
                          ? 'bg-red-950/80 border-red-500/40 text-red-200'
                          : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
                      }`}
                    >
                      {clue.word} ({clue.count === 'unlimited' ? '∞' : clue.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {canControlMatch && (
                <button
                  type="button"
                  data-start="true"
                  onClick={onNewRound}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
                >
                  بدء جولة جديدة (برمز جديد)
                </button>
              )}
              {canControlMatch && gameState.canUndo && (
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
              تم إيقاف المؤقت واللعب مؤقتًا بواسطة الحكم.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {canControlMatch && (
                <button
                  type="button"
                  onClick={onResume}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
                >
                  استئناف اللعب
                </button>
              )}
              {canControlMatch && (
                <button
                  type="button"
                  onClick={onNewRound}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm cursor-pointer"
                >
                  جولة جديدة
                </button>
              )}
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

interface CinematicClueOverlayProps {
  gameState: ClientGameState;
  onDismiss: () => void;
}

export const CinematicClueOverlay: React.FC<CinematicClueOverlayProps> = ({
  gameState,
  onDismiss,
}) => {
  const clue = gameState.currentClue;
  if (!clue) return null;

  const isRed = clue.team === 'red';
  const teamName = isRed ? gameState.redTeamName : gameState.blueTeamName;
  const countDisplay = clue.count === 'unlimited' ? '∞' : String(clue.count);
  const guessesRemaining =
    clue.guessesAllowed === null
      ? 'غير محدود (∞)'
      : `${Math.max(0, clue.guessesAllowed - clue.guessesMade)} محاولات متاحة`;

  return (
    <div
      data-testid="cinematic-clue-overlay"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="إعلان التلميح السينمائي"
      className="fixed inset-0 z-50 bg-stone-950/88 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-pointer select-none"
    >
      {/* Ambient Radial Team Spotlight Glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute w-[520px] h-[520px] sm:w-[760px] sm:h-[760px] rounded-full blur-3xl opacity-35 ${
          isRed ? 'bg-red-600' : 'bg-blue-600'
        }`}
      />

      <div
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className={`animate-clue-spotlight relative w-full max-w-3xl rounded-3xl border-2 p-6 sm:p-9 shadow-[0_30px_90px_rgba(0,0,0,0.92)] overflow-hidden text-right ${
          isRed
            ? 'bg-gradient-to-b from-[#2A1212] via-[#1C1412] to-[#14110F] border-red-500/80'
            : 'bg-gradient-to-b from-[#101D38] via-[#141824] to-[#121318] border-blue-500/80'
        }`}
      >
        {/* Top Accent Strip */}
        <div
          className={`absolute top-0 inset-x-0 h-2 ${
            isRed
              ? 'bg-gradient-to-r from-red-700 via-amber-400 to-red-600'
              : 'bg-gradient-to-r from-blue-700 via-amber-400 to-blue-600'
          }`}
        />

        {/* Header: Spymaster Transmission Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-extrabold text-xl border ${
                isRed
                  ? 'bg-red-600 text-white border-red-300 shadow-[0_0_20px_rgba(220,38,38,0.6)]'
                  : 'bg-blue-600 text-white border-blue-300 shadow-[0_0_20px_rgba(37,99,235,0.6)]'
              }`}
            >
              {isRed ? '◇' : '○'}
            </span>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                إشارة مشفّرة من قائد الفريق · الدور #{gameState.turnsCount}
              </div>
              <div className="text-base sm:text-xl font-black text-white">
                {teamName}
              </div>
            </div>
          </div>

          <span className="px-3 py-1 rounded-xl bg-stone-900/90 border border-amber-400/30 text-amber-200 text-xs font-mono font-bold">
            ELITE CLASH · التلميح الرسمي
          </span>
        </div>

        {/* Center Stage: Giant Physical Dossier Clue Plate + Monumental Number Stamp */}
        <div className="codenames-card-ivory rounded-2xl p-5 sm:p-8 border-2 border-[#D5C7AD] flex flex-col sm:flex-row items-center justify-between gap-6 relative">
          {/* Top Dossier Ring Hole & Label */}
          <div className="flex-1 text-center sm:text-right w-full">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono font-bold text-stone-500 uppercase tracking-widest mb-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-stone-400 bg-stone-200" />
              <span>الكلمة المفتاحية المعلنة · CLUE WORD</span>
            </div>
            <div
              data-testid="cinematic-clue-word"
              className="text-4xl sm:text-6xl lg:text-7xl font-black text-stone-950 tracking-tight leading-tight break-words"
            >
              {clue.word}
            </div>
          </div>

          {/* Number Seal Stamp */}
          <div
            className={`animate-clue-stamp shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 flex flex-col items-center justify-center shadow-2xl ${
              isRed
                ? 'bg-gradient-to-b from-red-600 to-red-800 border-red-200 text-white'
                : 'bg-gradient-to-b from-blue-600 to-blue-800 border-blue-200 text-white'
            }`}
          >
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider opacity-90">
              عدد البطاقات
            </span>
            <span
              data-testid="cinematic-clue-count"
              className="text-5xl sm:text-6xl font-mono font-black tabular-nums leading-none mt-1"
            >
              {countDisplay}
            </span>
          </div>
        </div>

        {/* Footer: Guessing Rules & Dismiss Button */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 text-stone-200">
            <span className="px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 font-extrabold">
              {guessesRemaining}
            </span>
            <span className="text-stone-300 font-semibold">
              {clue.count === 0
                ? 'تلميح صفري: تجنّب الكلمات المرتبطة بهذه الكلمة!'
                : 'ناقش مع فريقك واختر البطاقات المرتبطة بالتلميح'}
            </span>
          </div>

          <button
            type="button"
            data-testid="dismiss-cinematic-clue-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm cursor-pointer shadow-lg"
          >
            بدء التخمين على اللوحة ←
          </button>
        </div>

        {/* Auto-dismiss Countdown Progress Strip */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-stone-900">
          <div
            className={`h-full w-full animate-clue-progress ${
              isRed ? 'bg-red-500' : 'bg-blue-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
