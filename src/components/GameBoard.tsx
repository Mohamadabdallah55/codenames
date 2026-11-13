import React from 'react';
import { CardColor, GameMode, GameSettings, PublicCard } from '../game/rules';
import { WordEntry } from '../data/words';

interface GameBoardProps {
  cards: PublicCard[];
  settings: GameSettings;
  gameMode?: GameMode;
  canClickCards: boolean;
  showSecretKeyOverlay: boolean;
  onCardClick: (index: number) => void;
  compact?: boolean;
}

function getSecretBadgeInfo(color: CardColor): {
  label: string;
  symbol: string;
  barClass: string;
  borderClass: string;
  badgeClass: string;
} {
  switch (color) {
    case 'red':
      return {
        label: 'أحمر',
        symbol: '◇',
        barClass: 'bg-red-600',
        borderClass: 'ring-2 ring-red-600/90',
        badgeClass: 'bg-red-700 text-white',
      };
    case 'blue':
      return {
        label: 'أزرق',
        symbol: '○',
        barClass: 'bg-blue-600',
        borderClass: 'ring-2 ring-blue-600/90',
        badgeClass: 'bg-blue-700 text-white',
      };
    case 'black':
      return {
        label: 'سوداء ⚠',
        symbol: '✕',
        barClass: 'bg-stone-950',
        borderClass: 'ring-3 ring-amber-400',
        badgeClass: 'bg-stone-950 text-amber-300 border border-amber-400/60',
      };
    case 'neutral':
    default:
      return {
        label: 'محايد',
        symbol: '·',
        barClass: 'bg-stone-400',
        borderClass: 'ring-1 ring-stone-400/70',
        badgeClass: 'bg-stone-600 text-stone-100',
      };
  }
}

function renderJuniorCardIcon(iconType?: WordEntry['iconType'], isLightText?: boolean) {
  const strokeColor = isLightText ? 'currentColor' : '#B45309';
  switch (iconType) {
    case 'nature':
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
          <path d="M12 2C7 7 5 11 5 15a7 7 0 0 0 14 0c0-4-2-8-7-13z" />
          <path d="M12 22v-8" />
        </svg>
      );
    case 'tool':
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
          <circle cx="8" cy="15" r="4" />
          <path d="M10.85 12.15L19 4" />
          <path d="M18 5l2 2" />
          <path d="M15 8l2 2" />
        </svg>
      );
    case 'sport':
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 6 15M12 3a9 9 0 0 0-6 15M3.6 9h16.8M3.6 15h16.8" />
        </svg>
      );
    case 'food':
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
          <path d="M12 6c-4.5 0-8 3-8 7.5S7.5 21 12 21s8-3 8-7.5S16.5 6 12 6z" />
          <path d="M12 6V2m0 4c2-2 4-2 5-1" />
        </svg>
      );
    case 'science':
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
          <path d="M9 3h6m-5 0v5.2L5.2 17A2 2 0 0 0 7 20h10a2 2 0 0 0 1.8-3L14 8.2V3" />
        </svg>
      );
    case 'star':
    default:
      return (
        <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
          <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.5 5.8 21 7 14 2 9.3 9 8.5 12 2" />
        </svg>
      );
  }
}

export const GameBoard: React.FC<GameBoardProps> = React.memo(
  ({
    cards,
    settings,
    gameMode = 'classic',
    canClickCards,
    showSecretKeyOverlay,
    onCardClick,
    compact = false,
  }) => {
    const is16Grid = cards.length === 16;
    const isJunior = gameMode === 'junior' || settings.gameMode === 'junior';

    const getWordFontSizeClass = (word: string) => {
      const len = word.length;
      if (compact) {
        if (len > 11) return 'text-xs sm:text-sm md:text-base';
        return 'text-sm sm:text-base md:text-lg';
      }
      if (is16Grid) {
        if (len > 11) return 'text-base sm:text-xl md:text-2xl lg:text-3xl';
        return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
      }
      if (settings.fontScale === 'xlarge') {
        if (len > 11) return 'text-base sm:text-xl md:text-2xl lg:text-3xl';
        if (len > 8) return 'text-lg sm:text-2xl md:text-3xl lg:text-4xl';
        return 'text-xl sm:text-2xl md:text-3xl lg:text-[2.4rem]';
      }
      if (settings.fontScale === 'large') {
        if (len > 11) return 'text-sm sm:text-lg md:text-xl lg:text-2xl';
        if (len > 8) return 'text-base sm:text-xl md:text-2xl lg:text-3xl';
        return 'text-lg sm:text-xl md:text-2xl lg:text-[2.1rem]';
      }
      if (len > 11) return 'text-xs sm:text-base md:text-lg lg:text-xl';
      return 'text-base sm:text-lg md:text-xl lg:text-2xl';
    };

    return (
      <div
        data-testid="codenames-board-grid"
        data-grid-size={cards.length}
        className={`w-full h-full grid ${
          is16Grid ? 'grid-cols-4 grid-rows-4' : 'grid-cols-5 grid-rows-5'
        } ${compact ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-3 lg:gap-3.5'}`}
      >
        {cards.map((card) => {
          const revealedColor = card.revealed ? card.color : null;
          const secretOverlayColor =
            showSecretKeyOverlay && card.secretColor ? card.secretColor : null;

          const isUnrevealedBlackOverlay =
            !card.revealed && secretOverlayColor === 'black';

          let cardSurfaceClass = 'codenames-card-ivory';
          if (card.revealed && revealedColor === 'red') {
            cardSurfaceClass = 'codenames-card-red';
          } else if (card.revealed && revealedColor === 'blue') {
            cardSurfaceClass = 'codenames-card-blue';
          } else if (card.revealed && revealedColor === 'neutral') {
            cardSurfaceClass = 'codenames-card-neutral';
          } else if (
            (card.revealed && revealedColor === 'black') ||
            isUnrevealedBlackOverlay
          ) {
            cardSurfaceClass = 'codenames-card-black';
          }

          const secretInfo = secretOverlayColor ? getSecretBadgeInfo(secretOverlayColor) : null;
          const isInteractive = canClickCards && !card.revealed;

          return (
            <button
              key={card.index}
              type="button"
              data-testid={`board-card-${card.index}`}
              data-revealed={card.revealed ? 'true' : 'false'}
              data-revealed-color={card.revealed && card.color ? card.color : undefined}
              disabled={!isInteractive}
              onClick={() => {
                if (isInteractive) {
                  onCardClick(card.index);
                }
              }}
              aria-label={`بطاقة ${card.index + 1}: ${card.wordAr}${
                card.revealed
                  ? ` (مكشوفة - ${
                      revealedColor === 'red'
                        ? 'أحمر'
                        : revealedColor === 'blue'
                        ? 'أزرق'
                        : revealedColor === 'black'
                        ? 'سوداء'
                        : 'محايدة'
                    })`
                  : ''
              }`}
              className={`relative rounded-xl sm:rounded-2xl flex flex-col justify-between p-1.5 sm:p-2.5 select-none transition-transform duration-150 overflow-hidden ${cardSurfaceClass} ${
                !card.revealed && secretInfo ? secretInfo.borderClass : ''
              } ${isInteractive ? 'cursor-pointer' : 'cursor-default'} ${
                card.revealed && showSecretKeyOverlay ? 'opacity-65' : ''
              } ${
                settings.projectorHighContrast && !card.revealed
                  ? 'border-2 border-stone-900'
                  : ''
              }`}
            >
              {/* Top Secret Color Strip for Spymaster / Referee when unrevealed */}
              {!card.revealed && secretInfo && (
                <div
                  className={`w-full h-1.5 sm:h-2 absolute top-0 inset-x-0 ${secretInfo.barClass}`}
                />
              )}

              {/* Authentic Tabletop Dossier Top Strip */}
              <div className="w-full flex items-center justify-between px-1 sm:px-1.5 z-10 pointer-events-none">
                <span
                  className={`font-mono text-[10px] sm:text-xs font-bold tabular-nums ${
                    card.revealed || isUnrevealedBlackOverlay
                      ? 'text-white/80'
                      : 'text-stone-600'
                  }`}
                >
                  {String(card.index + 1).padStart(2, '0')}
                </span>

                {!card.revealed && !secretInfo && !compact && (
                  <div className="flex items-center gap-1.5 opacity-45">
                    <span className="hidden md:inline-block text-[10px] font-bold text-stone-600 rotate-180 select-none">
                      {card.wordAr}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full border border-stone-500/80 bg-stone-300/50 inline-block" />
                  </div>
                )}

                {!card.revealed && secretInfo && (
                  <span
                    className={`text-[9px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${secretInfo.badgeClass}`}
                  >
                    <span>{secretInfo.symbol}</span>
                    <span>{secretInfo.label}</span>
                  </span>
                )}

                {card.revealed && (
                  <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-black/30 text-white/95 flex items-center gap-1">
                    <span>
                      {revealedColor === 'red'
                        ? '◇ الأحمر'
                        : revealedColor === 'blue'
                        ? '○ الأزرق'
                        : revealedColor === 'black'
                        ? '✕ سوداء ⚠'
                        : 'محايدة'}
                    </span>
                  </span>
                )}
              </div>

              {/* Authentic Lower White/Ivory Word Plate */}
              <div
                className={`w-full flex-1 flex flex-col items-center justify-center rounded-lg sm:rounded-xl px-1.5 py-1 my-0.5 transition-colors ${
                  !card.revealed && !isUnrevealedBlackOverlay
                    ? 'bg-[#FAF8F2] border border-[#D8CBB3] shadow-inner'
                    : ''
                }`}
              >
                {isJunior && !compact && (
                  <div className="mb-0.5">
                    {renderJuniorCardIcon(
                      card.iconType,
                      card.revealed || isUnrevealedBlackOverlay
                    )}
                  </div>
                )}

                <span
                  className={`font-extrabold text-center leading-tight tracking-tight break-words max-w-full px-0.5 ${getWordFontSizeClass(
                    card.wordAr
                  )} ${isUnrevealedBlackOverlay ? 'text-amber-300' : ''}`}
                >
                  {card.wordAr}
                </span>

                {settings.languageMode === 'ar_en' && card.wordEn && (
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-semibold mt-0.5 truncate max-w-full ${
                      card.revealed || isUnrevealedBlackOverlay
                        ? 'text-white/80'
                        : 'text-stone-500'
                    }`}
                  >
                    {card.wordEn}
                  </span>
                )}

                {card.revealed && revealedColor === 'black' && (
                  <div className="mt-1 flex items-center gap-1 text-red-400 text-[10px] sm:text-xs font-extrabold">
                    <svg
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2L1 21h22L12 2zm0 4.5l7.53 13H4.47L12 6.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                    </svg>
                    <span>البطاقة السوداء</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  },
  (prev, next) =>
    prev.cards === next.cards &&
    prev.canClickCards === next.canClickCards &&
    prev.showSecretKeyOverlay === next.showSecretKeyOverlay &&
    prev.compact === next.compact &&
    prev.gameMode === next.gameMode &&
    prev.settings.fontScale === next.settings.fontScale &&
    prev.settings.languageMode === next.settings.languageMode &&
    prev.settings.projectorHighContrast === next.settings.projectorHighContrast
);
