import React, { useEffect, useState } from 'react';
import { BroadcastBannerEvent, ClientGameState } from '../game/rules';

interface BroadcastMotionSystemProps {
  gameState: ClientGameState;
  onDismiss: () => void;
}

/**
 * 60fps TV Broadcast Motion Graphics System for Projector / Audience screens.
 * Handles:
 * - Card Reveal Stinger (`card_revealed`)
 * - Turn Transition Lower-Third (`turn_transition`)
 * - Match-Point / Near Victory Alert (`near_victory`)
 * - Time-Up Alert (`time_up`)
 * (Full-screen Clue Spotlight is handled by `CinematicClueOverlay`, and Victory by `StatusModal`.)
 */
export const BroadcastMotionSystem: React.FC<BroadcastMotionSystemProps> = React.memo(
  ({ gameState, onDismiss }) => {
    const banner: BroadcastBannerEvent | null = gameState.activeBroadcast;
    const [visibleId, setVisibleId] = useState<string | null>(null);

    useEffect(() => {
      if (!banner || !gameState.settings.broadcastEffectsEnabled) {
        setVisibleId(null);
        return;
      }
      // Clue declared has its own full-stage CinematicClueOverlay, and gameover has StatusModal
      if (banner.type === 'clue_declared' || banner.type === 'victory_celebration') {
        setVisibleId(null);
        return;
      }

      setVisibleId(banner.id);
      const durationMs =
        banner.type === 'near_victory' || banner.type === 'time_up' ? 3800 : 2700;
      const timer = setTimeout(() => {
        setVisibleId((curr) => (curr === banner.id ? null : curr));
      }, durationMs);
      return () => clearTimeout(timer);
    }, [banner, gameState.settings.broadcastEffectsEnabled]);

    if (!banner || visibleId !== banner.id) return null;

    const isRed = banner.team === 'red';
    const isNearVictory = banner.type === 'near_victory';
    const isTimeUp = banner.type === 'time_up';

    let accentClasses = isRed
      ? 'from-red-950/95 via-stone-950/95 to-red-950/95 border-red-400 text-red-100 shadow-[0_16px_50px_rgba(220,38,38,0.45)]'
      : 'from-blue-950/95 via-stone-950/95 to-blue-950/95 border-blue-400 text-blue-100 shadow-[0_16px_50px_rgba(37,99,235,0.45)]';

    if (isNearVictory) {
      accentClasses =
        'from-amber-950/95 via-stone-950/95 to-red-950/95 border-amber-400 text-amber-100 shadow-[0_20px_60px_rgba(245,158,11,0.5)]';
    } else if (isTimeUp) {
      accentClasses =
        'from-red-950/95 via-stone-950/95 to-stone-900/95 border-red-500 text-red-100 shadow-[0_20px_60px_rgba(239,68,68,0.5)]';
    }

    return (
      <div
        data-testid="tv-broadcast-banner"
        data-broadcast-type={banner.type}
        className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-4"
      >
        <div
          onClick={() => {
            setVisibleId(null);
            onDismiss();
          }}
          className={`pointer-events-auto animate-clue-spotlight w-full max-w-2xl rounded-2xl bg-gradient-to-r border-2 px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer select-none ${accentClasses}`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shrink-0 border ${
                isNearVictory
                  ? 'bg-amber-500 text-stone-950 border-amber-200'
                  : isTimeUp
                  ? 'bg-red-600 text-white border-red-300'
                  : isRed
                  ? 'bg-red-600 text-white border-red-300'
                  : 'bg-blue-600 text-white border-blue-300'
              }`}
            >
              {isNearVictory ? '★' : isTimeUp ? '⏱' : isRed ? '◇' : '○'}
            </div>

            <div className="min-w-0 text-right">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-amber-300">
                  {banner.type === 'near_victory'
                    ? 'إنذار اقتراب الحسم · MATCH POINT'
                    : banner.type === 'time_up'
                    ? 'انتهاء وقت الدور · TIME EXPIRED'
                    : banner.type === 'turn_transition'
                    ? 'تحول المبادرة · TURN TRANSITION'
                    : 'كشف بطاقة · CARD REVEAL'}
                </span>
              </div>
              <div className="text-base sm:text-xl font-black text-white truncate">
                {banner.titleAr}
              </div>
              <div className="text-xs sm:text-sm text-stone-300 font-semibold truncate">
                {banner.subtitleAr}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVisibleId(null);
              onDismiss();
            }}
            className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-200 border border-amber-300/30 text-xs font-bold shrink-0 cursor-pointer"
          >
            تخطي ✕
          </button>
        </div>
      </div>
    );
  }
);
