import {
  ALL_WORD_CATEGORIES,
  OFFICIAL_WORD_BANK,
  WORD_PACKS_CATALOG,
  WordAgeGroup,
  WordCategory,
  WordDifficulty,
  WordEntry,
  WordPackId,
  buildValidatedWordBank,
  filterWordPoolByCriteria,
  normalizeArabicWord,
} from '../data/words';

export { ALL_WORD_CATEGORIES, WORD_PACKS_CATALOG };
export type { WordAgeGroup, WordCategory, WordDifficulty, WordPackId };

export type TeamColor = 'red' | 'blue';
export type CardColor = 'red' | 'blue' | 'neutral' | 'black';
export type EliteTeamCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type ClientRole = 'audience' | 'spymaster_red' | 'spymaster_blue' | 'referee';
export type LanguageMode = 'ar' | 'ar_en';
export type GameMode =
  | 'classic'
  | 'quick'
  | 'junior'
  | 'family'
  | 'cooperative'
  | 'tournament';

export type WinReason =
  | 'all_cards_revealed'
  | 'opponent_completed_cards'
  | 'black_card'
  | 'out_of_turns';

export interface GameModeMeta {
  id: GameMode;
  nameAr: string;
  nameEn: string;
  badge: string;
  descriptionAr: string;
  boardSize: 16 | 25;
  gridCols: 4 | 5;
  defaultPacks: WordPackId[];
  defaultTimerSeconds: number;
}

export const GAME_MODES_CATALOG: Record<GameMode, GameModeMeta> = {
  classic: {
    id: 'classic',
    nameAr: 'الوضع الكلاسيكي',
    nameEn: 'Classic',
    badge: '5×5 · 25 بطاقة',
    descriptionAr: 'القواعد الرسمية الكاملة: 9 للفريق البادئ، 8 للثاني، 7 محايدة، وبطاقة سوداء واحدة.',
    boardSize: 25,
    gridCols: 5,
    defaultPacks: ['elite_classic'],
    defaultTimerSeconds: 90,
  },
  quick: {
    id: 'quick',
    nameAr: 'المباراة السريعة',
    nameEn: 'Quick Match',
    badge: '4×4 · 16 بطاقة',
    descriptionAr: 'لوحة مصغرة متوازنة (6 للبادئ، 5 للثاني، 4 محايدة، 1 سوداء) مع مؤقت 60 ثانية لجولات سريعة وحماسية.',
    boardSize: 16,
    gridCols: 4,
    defaultPacks: ['elite_classic', 'family_masjid'],
    defaultTimerSeconds: 60,
  },
  junior: {
    id: 'junior',
    nameAr: 'وضع الأشبال',
    nameEn: 'Junior',
    badge: '4×4 · كلمات مرسومة',
    descriptionAr: 'كلمات بسيطة وملموسة مع رسومات هندسية توضيحية على البطاقات، مصممة خصيصًا للأشبال والناشئين.',
    boardSize: 16,
    gridCols: 4,
    defaultPacks: ['junior_kids'],
    defaultTimerSeconds: 90,
  },
  family: {
    id: 'family',
    nameAr: 'الوضع العائلي',
    nameEn: 'Family',
    badge: '5×5 · لجميع الأعمار',
    descriptionAr: 'مستوى مختلط يجمع بين البساطة والثقافة العامة ليناسب العائلة ورواد مسجد ابن تيمية من مختلف الأعمار.',
    boardSize: 25,
    gridCols: 5,
    defaultPacks: ['family_masjid', 'nature_creatures'],
    defaultTimerSeconds: 120,
  },
  cooperative: {
    id: 'cooperative',
    nameAr: 'الوضع التعاوني',
    nameEn: 'Cooperative',
    badge: 'فريق موحد · 15 هدفًا',
    descriptionAr: 'يلعب الجميع كفريق واحد لاكتشاف 15 بطاقة مستهدفة خلال 9 أدوار فقط قبل نفاد المحاولات أو كشف السوداء!',
    boardSize: 25,
    gridCols: 5,
    defaultPacks: ['elite_classic', 'family_masjid'],
    defaultTimerSeconds: 120,
  },
  tournament: {
    id: 'tournament',
    nameAr: 'وضع البطولة الرسمية',
    nameEn: 'Tournament',
    badge: '5×5 · دوري النخبة',
    descriptionAr: 'قواعد البطولة الصارمة (إلزام التلميح قبل الكشف + مؤقت 90 ثانية + احتساب النقاط والترتيب التلقائي).',
    boardSize: 25,
    gridCols: 5,
    defaultPacks: ['elite_classic', 'science_space', 'history_heritage'],
    defaultTimerSeconds: 90,
  },
};

export interface EliteTeamInfo {
  code: EliteTeamCode;
  name: string;
}

export const ELITE_CLASH_TEAMS: Record<EliteTeamCode, EliteTeamInfo> = {
  A: { code: 'A', name: 'الفريق A — الصقور' },
  B: { code: 'B', name: 'الفريق B — الفرسان' },
  C: { code: 'C', name: 'الفريق C — الرواد' },
  D: { code: 'D', name: 'الفريق D — النخبة' },
  E: { code: 'E', name: 'الفريق E — القمم' },
  F: { code: 'F', name: 'الفريق F — الأمجاد' },
};

export interface ClueState {
  word: string;
  count: number | 'unlimited';
  team: TeamColor;
  guessesAllowed: number | null;
  guessesMade: number;
  declaredAt: number;
}

export interface ServerCard {
  index: number;
  wordId: string;
  wordAr: string;
  wordEn: string;
  category: WordCategory;
  subCategory?: string;
  iconType?: WordEntry['iconType'];
  relatedWords?: string[];
  secretColor: CardColor;
  revealed: boolean;
  revealedBy?: TeamColor;
  revealedAtTurn?: number;
}

export interface PublicCard {
  index: number;
  wordId: string;
  wordAr: string;
  wordEn: string;
  category: WordCategory;
  subCategory?: string;
  iconType?: WordEntry['iconType'];
  relatedWords?: string[];
  color: CardColor | null;
  secretColor?: CardColor;
  revealed: boolean;
  revealedBy?: TeamColor;
  revealedAtTurn?: number;
}

export type BroadcastBannerType =
  | 'clue_declared'
  | 'card_revealed'
  | 'turn_transition'
  | 'near_victory'
  | 'time_up'
  | 'victory_celebration';

export interface BroadcastBannerEvent {
  id: string;
  type: BroadcastBannerType;
  timestamp: number;
  team: TeamColor;
  teamName: string;
  titleAr: string;
  subtitleAr: string;
  cardWord?: string;
  cardColor?: CardColor;
  clueWord?: string;
  clueCount?: number | 'unlimited';
  remainingCount?: number;
}

export interface GameEventLog {
  id: string;
  timestamp: number;
  turn: number;
  team: TeamColor;
  type:
    | 'round_start'
    | 'clue'
    | 'reveal'
    | 'end_turn'
    | 'penalty'
    | 'undo'
    | 'pause'
    | 'time_up'
    | 'gameover';
  message: string;
  cardColor?: CardColor;
}

export interface MatchRecord {
  id: string;
  roomId: string;
  tournamentId?: string;
  gameMode: GameMode;
  roundNumber: number;
  redTeamCode: EliteTeamCode;
  redTeamName: string;
  blueTeamCode: EliteTeamCode;
  blueTeamName: string;
  startingTeam: TeamColor;
  winner: TeamColor;
  loser: TeamColor;
  winReason: WinReason;
  winReasonAr: string;
  turnsCount: number;
  durationSeconds: number;
  completedAt: string;
  redRemaining: number;
  blueRemaining: number;
  cluesCount?: number;
}

export interface TournamentStandingRow {
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  cardsRevealed: number;
  blackCardLosses: number;
}

export interface TournamentCompetition {
  id: string;
  name: string;
  organizer: string;
  createdAt: string;
  gameMode: GameMode;
  teamNames: string[];
  matches: MatchRecord[];
}

export interface GameSettings {
  gameMode: GameMode;
  selectedPacks: WordPackId[];
  selectedCategories: WordCategory[];
  ageFilter: WordAgeGroup | 'any';
  difficultyFilter: WordDifficulty | 'any';
  timerEnabled: boolean;
  timerDurationSeconds: number;
  soundEnabled: boolean;
  soundVolume: number;
  broadcastEffectsEnabled: boolean;
  languageMode: LanguageMode;
  fontScale: 'normal' | 'large' | 'xlarge';
  projectorHighContrast: boolean;
  requireClueBeforeGuess: boolean;
  plusOneRule: boolean;
  allowAudienceClickInLocalMode: boolean;
}

export interface UndoSnapshot {
  status: 'playing' | 'paused' | 'gameover';
  currentTurn: TeamColor;
  turnsCount: number;
  coopTurnsRemaining: number;
  cards: ServerCard[];
  redRemaining: number;
  blueRemaining: number;
  currentClue: ClueState | null;
  winner: TeamColor | null;
  loser: TeamColor | null;
  winReason: WinReason | null;
  eventLog: GameEventLog[];
  timerRemainingSeconds: number;
  activeBroadcast: BroadcastBannerEvent | null;
}

export interface ServerGameState {
  roomId: string;
  roundSeed: string; // Server-private entropy seed; NEVER sent to audience
  refereePin: string;
  spymasterPin: string;
  refereeClaimed?: boolean;
  sessionRevokedVersion: number;
  roundNumber: number;
  gameMode: GameMode;
  boardSize: 16 | 25;
  gridCols: 4 | 5;
  coopTurnsRemaining: number;
  coopMaxTurns: number;
  status: 'playing' | 'paused' | 'gameover';
  redTeamCode: EliteTeamCode;
  redTeamName: string;
  blueTeamCode: EliteTeamCode;
  blueTeamName: string;
  startingTeam: TeamColor;
  currentTurn: TeamColor;
  turnsCount: number;
  cards: ServerCard[];
  redTotal: number;
  blueTotal: number;
  redRemaining: number;
  blueRemaining: number;
  currentClue: ClueState | null;
  clueHistory: ClueState[];
  activeBroadcast: BroadcastBannerEvent | null;
  winner: TeamColor | null;
  loser: TeamColor | null;
  winReason: WinReason | null;
  startedAt: number;
  endedAt: number | null;
  timerRemainingSeconds: number;
  settings: GameSettings;
  customWords: WordEntry[];
  disabledWordIds: string[];
  usedWordsHistory: string[];
  eventLog: GameEventLog[];
  matchHistory: MatchRecord[];
  redWinsCount: number;
  blueWinsCount: number;
  undoStack: UndoSnapshot[];
}

export interface ClientGameState {
  roomId: string;
  roundSeed?: string; // Only sent to authorized referee/spymaster, undefined for audience
  role: ClientRole;
  refereePin?: string;
  spymasterPin?: string;
  refereeClaimed?: boolean;
  roundNumber: number;
  gameMode: GameMode;
  boardSize: 16 | 25;
  gridCols: 4 | 5;
  coopTurnsRemaining: number;
  coopMaxTurns: number;
  status: 'playing' | 'paused' | 'gameover';
  redTeamCode: EliteTeamCode;
  redTeamName: string;
  blueTeamCode: EliteTeamCode;
  blueTeamName: string;
  startingTeam: TeamColor;
  currentTurn: TeamColor;
  turnsCount: number;
  cards: PublicCard[];
  redTotal: number;
  blueTotal: number;
  redRemaining: number;
  blueRemaining: number;
  currentClue: ClueState | null;
  clueHistory: ClueState[];
  activeBroadcast: BroadcastBannerEvent | null;
  winner: TeamColor | null;
  loser: TeamColor | null;
  winReason: WinReason | null;
  startedAt: number;
  endedAt: number | null;
  timerRemainingSeconds: number;
  settings: GameSettings;
  customWordsCount: number;
  disabledWordsCount: number;
  activePoolCount: number;
  eventLog: GameEventLog[];
  matchHistory: MatchRecord[];
  redWinsCount: number;
  blueWinsCount: number;
  canUndo: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gameMode: 'classic',
  selectedPacks: ['elite_classic'],
  selectedCategories: [],
  ageFilter: 'any',
  difficultyFilter: 'any',
  timerEnabled: true,
  timerDurationSeconds: 90,
  soundEnabled: true,
  soundVolume: 0.85,
  broadcastEffectsEnabled: true,
  languageMode: 'ar',
  fontScale: 'large',
  projectorHighContrast: false,
  requireClueBeforeGuess: false,
  plusOneRule: true,
  allowAudienceClickInLocalMode: true,
};

/**
 * Creates a deterministic 32-bit PRNG from any string seed (xfnv1a + mulberry32).
 */
export function createSeededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let a = h >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a dynamic 4-digit PIN (1000..9999) for each round/room, avoiding legacy default PINs.
 */
export function generateDynamicPin(rng: () => number = Math.random): string {
  const forbidden = new Set(['1446', '2026', '0000', '1234', '1111']);
  for (let attempt = 0; attempt < 20; attempt++) {
    const num = Math.floor(1000 + rng() * 9000);
    const pin = String(num);
    if (!forbidden.has(pin)) return pin;
  }
  return '5839';
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function getOpponentTeam(team: TeamColor): TeamColor {
  return team === 'red' ? 'blue' : 'red';
}

export function getTeamLabel(
  state: Pick<ServerGameState, 'redTeamName' | 'blueTeamName' | 'gameMode'>,
  team: TeamColor
): string {
  if (state.gameMode === 'cooperative') {
    return team === 'red' ? state.redTeamName || 'الفريق التعاوني الموحد' : 'تحدي اللوحة';
  }
  return team === 'red' ? state.redTeamName : state.blueTeamName;
}

export function getWinReasonArabic(reason: WinReason): string {
  switch (reason) {
    case 'all_cards_revealed':
      return 'كشف جميع بطاقات الفريق بنجاح';
    case 'opponent_completed_cards':
      return 'اكتمال بطاقات الفريق بعد اختيار المنافس لبطاقتهم الأخيرة';
    case 'black_card':
      return 'اختيار البطاقة السوداء القاتلة';
    case 'out_of_turns':
      return 'نفاد عدد الأدوار المتاحة في الوضع التعاوني قبل إتمام جميع الأهداف';
  }
}

export interface CreateRoundOptions {
  roomId?: string;
  roundSeed?: string;
  refereePin?: string;
  spymasterPin?: string;
  refereeClaimed?: boolean;
  sessionRevokedVersion?: number;
  gameMode?: GameMode;
  redTeamCode?: EliteTeamCode;
  redTeamName?: string;
  blueTeamCode?: EliteTeamCode;
  blueTeamName?: string;
  startingTeam?: TeamColor;
  customWords?: WordEntry[];
  disabledWordIds?: string[];
  usedWordsHistory?: string[];
  settings?: Partial<GameSettings>;
  roundNumber?: number;
  matchHistory?: MatchRecord[];
  redWinsCount?: number;
  blueWinsCount?: number;
  rng?: () => number;
}

/**
 * Generates a fresh game round adhering strictly to the active GameMode:
 * - `classic` / `family` / `tournament`: 25 cards (5x5) -> 9 starting, 8 second, 7 neutral, 1 black
 * - `quick` / `junior`: 16 cards (4x4) -> 6 starting, 5 second, 4 neutral, 1 black
 * - `cooperative`: 25 cards (5x5) -> 15 target ('red'), 0 'blue', 9 'neutral', 1 'black' with 9 turns budget
 * - Never leaks PINs or secret seeds to audience event logs!
 */
export function createGameRound(options: CreateRoundOptions = {}): ServerGameState {
  const roomId = (options.roomId || 'ELITE-1').trim().toUpperCase();
  const roundNumber = options.roundNumber || 1;

  const baseRng = options.rng || Math.random;
  const spymasterPin = options.spymasterPin || generateDynamicPin(baseRng);
  const refereePin = options.refereePin || generateDynamicPin(baseRng);

  // High-entropy private seed that cannot be guessed from public roomId/roundNumber
  const randomEntropy = `${Math.floor(baseRng() * 1e9).toString(36)}_${Math.floor(baseRng() * 1e9).toString(36)}`;
  const roundSeed = options.roundSeed || `${roomId}-R${roundNumber}-${randomEntropy}`;
  const rng = options.rng || createSeededRng(roundSeed);

  const requestedMode: GameMode =
    options.gameMode || options.settings?.gameMode || DEFAULT_GAME_SETTINGS.gameMode;
  const modeMeta = GAME_MODES_CATALOG[requestedMode] || GAME_MODES_CATALOG.classic;

  const mergedSettings: GameSettings = {
    ...DEFAULT_GAME_SETTINGS,
    ...(options.settings || {}),
    gameMode: requestedMode,
  };

  if (options.settings?.timerDurationSeconds === undefined) {
    mergedSettings.timerDurationSeconds = modeMeta.defaultTimerSeconds;
  }
  if (!options.settings?.selectedPacks || options.settings.selectedPacks.length === 0) {
    mergedSettings.selectedPacks = modeMeta.defaultPacks;
  }

  const boardSize = modeMeta.boardSize;
  const gridCols = modeMeta.gridCols;

  const redTeamCode = options.redTeamCode || 'A';
  const blueTeamCode = options.blueTeamCode || 'B';
  const redTeamName =
    options.redTeamName ||
    (requestedMode === 'cooperative' ? 'فريق النخبة التعاوني' : ELITE_CLASH_TEAMS[redTeamCode].name);
  const blueTeamName =
    options.blueTeamName ||
    (requestedMode === 'cooperative' ? 'تحدي اللوحة' : ELITE_CLASH_TEAMS[blueTeamCode].name);

  const startingTeam: TeamColor =
    requestedMode === 'cooperative'
      ? 'red'
      : options.startingTeam || (rng() < 0.5 ? 'red' : 'blue');
  const secondTeam: TeamColor = getOpponentTeam(startingTeam);

  const customWords = options.customWords || [];
  const disabledWordIds = options.disabledWordIds || [];
  const disabledSet = new Set(disabledWordIds);

  const fullBank = buildValidatedWordBank([
    ...customWords,
    ...OFFICIAL_WORD_BANK,
  ]).words.filter((w) => !disabledSet.has(w.id) && w.status !== 'disabled');

  let filteredPool = filterWordPoolByCriteria(fullBank, {
    packIds: mergedSettings.selectedPacks,
    categories:
      mergedSettings.selectedCategories.length > 0
        ? mergedSettings.selectedCategories
        : undefined,
    ageGroup:
      requestedMode === 'junior'
        ? 'junior'
        : mergedSettings.ageFilter,
    difficulty:
      requestedMode === 'junior'
        ? 'easy'
        : mergedSettings.difficultyFilter,
    onlyApproved: true,
  });

  if (filteredPool.length < boardSize) {
    // Fallback to full approved bank if user's filter combination is narrower than boardSize
    filteredPool = fullBank;
  }

  const previousUsed = new Set(options.usedWordsHistory || []);
  let availablePool = filteredPool.filter((w) => !previousUsed.has(normalizeArabicWord(w.ar)));

  let updatedHistory = [...(options.usedWordsHistory || [])];
  if (availablePool.length < boardSize) {
    const lastBoardOnly = new Set(updatedHistory.slice(-boardSize));
    availablePool = filteredPool.filter((w) => !lastBoardOnly.has(normalizeArabicWord(w.ar)));
    if (availablePool.length < boardSize) {
      availablePool = filteredPool;
    }
    updatedHistory = updatedHistory.slice(-boardSize);
  }

  const shuffledWords = shuffleArray(availablePool, rng).slice(0, boardSize);
  const newBoardNormalized = shuffledWords.map((w) => normalizeArabicWord(w.ar));
  updatedHistory = [...updatedHistory, ...newBoardNormalized].slice(-250);

  // Build exact color distribution according to GameMode
  let colorDeck: CardColor[] = [];
  let redTotal = 9;
  let blueTotal = 8;

  if (requestedMode === 'cooperative') {
    redTotal = 15;
    blueTotal = 0;
    colorDeck = [
      ...Array(15).fill('red'),
      ...Array(9).fill('neutral'),
      'black',
    ];
  } else if (boardSize === 16) {
    // Quick Match & Junior Mode (4x4 = 16 cards: 6 starting, 5 second, 4 neutral, 1 black)
    const startCount = 6;
    const secondCount = 5;
    const neutralCount = 4;
    redTotal = startingTeam === 'red' ? startCount : secondCount;
    blueTotal = startingTeam === 'blue' ? startCount : secondCount;
    colorDeck = [
      ...Array(startCount).fill(startingTeam),
      ...Array(secondCount).fill(secondTeam),
      ...Array(neutralCount).fill('neutral'),
      'black',
    ];
  } else {
    // Classic, Family, Tournament (5x5 = 25 cards: 9 starting, 8 second, 7 neutral, 1 black)
    redTotal = startingTeam === 'red' ? 9 : 8;
    blueTotal = startingTeam === 'blue' ? 9 : 8;
    colorDeck = [
      ...Array(9).fill(startingTeam),
      ...Array(8).fill(secondTeam),
      ...Array(7).fill('neutral'),
      'black',
    ];
  }

  const shuffledColors = shuffleArray(colorDeck, rng);

  const cards: ServerCard[] = shuffledWords.map((word, index) => ({
    index,
    wordId: word.id,
    wordAr: word.ar,
    wordEn: word.en,
    category: word.category,
    subCategory: word.subCategory,
    iconType: word.iconType,
    relatedWords: word.relatedWords,
    secretColor: shuffledColors[index],
    revealed: false,
  }));

  const now = Date.now();
  const coopMaxTurns = 9;

  return {
    roomId,
    roundSeed,
    refereePin,
    spymasterPin,
    refereeClaimed: options.refereeClaimed ?? false,
    sessionRevokedVersion: options.sessionRevokedVersion ?? 1,
    roundNumber,
    gameMode: requestedMode,
    boardSize,
    gridCols,
    coopTurnsRemaining: coopMaxTurns,
    coopMaxTurns,
    status: 'playing',
    redTeamCode,
    redTeamName,
    blueTeamCode,
    blueTeamName,
    startingTeam,
    currentTurn: startingTeam,
    turnsCount: 1,
    cards,
    redTotal,
    blueTotal,
    redRemaining: redTotal,
    blueRemaining: blueTotal,
    currentClue: null,
    clueHistory: [],
    activeBroadcast: null,
    winner: null,
    loser: null,
    winReason: null,
    startedAt: now,
    endedAt: null,
    timerRemainingSeconds: mergedSettings.timerDurationSeconds,
    settings: mergedSettings,
    customWords,
    disabledWordIds,
    usedWordsHistory: updatedHistory,
    eventLog: [
      {
        id: `evt_${now}_start`,
        timestamp: now,
        turn: 1,
        team: startingTeam,
        type: 'round_start',
        // SECURITY: Never include spymasterPin or refereePin in public eventLog messages!
        message:
          requestedMode === 'cooperative'
            ? `بدأت الجولة التعاونية #${roundNumber} — المطلوب كشف 15 بطاقة خلال ${coopMaxTurns} أدوار.`
            : `بدأت الجولة #${roundNumber} (${modeMeta.nameAr}) — البداية لصالح ${
                startingTeam === 'red' ? redTeamName : blueTeamName
              } (${startingTeam === 'red' ? redTotal : blueTotal} بطاقات).`,
      },
    ],
    matchHistory: options.matchHistory || [],
    redWinsCount: options.redWinsCount || 0,
    blueWinsCount: options.blueWinsCount || 0,
    undoStack: [],
  };
}

function pushUndoSnapshot(state: ServerGameState): UndoSnapshot[] {
  const snapshot: UndoSnapshot = {
    status: state.status,
    currentTurn: state.currentTurn,
    turnsCount: state.turnsCount,
    coopTurnsRemaining: state.coopTurnsRemaining,
    cards: state.cards.map((c) => ({ ...c })),
    redRemaining: state.redRemaining,
    blueRemaining: state.blueRemaining,
    currentClue: state.currentClue ? { ...state.currentClue } : null,
    winner: state.winner,
    loser: state.loser,
    winReason: state.winReason,
    eventLog: [...state.eventLog],
    timerRemainingSeconds: state.timerRemainingSeconds,
    activeBroadcast: state.activeBroadcast,
  };
  return [...state.undoStack.slice(-19), snapshot];
}

export interface ActionResult {
  ok: boolean;
  state: ServerGameState;
  error?: string;
}

/**
 * Declares a Spymaster clue (single word + number: 0, 'unlimited', or 1..9).
 */
export function giveClue(
  state: ServerGameState,
  word: string,
  count: number | 'unlimited',
  actingTeam?: TeamColor
): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'الجولة متوقفة أو منتهية حاليًا.' };
  }

  if (actingTeam && actingTeam !== state.currentTurn && state.gameMode !== 'cooperative') {
    return { ok: false, state, error: 'ليس دور هذا الفريق لإعطاء التلميح.' };
  }

  const trimmedWord = word.trim().replace(/\s+/g, ' ');
  if (!trimmedWord) {
    return { ok: false, state, error: 'يرجى إدخال كلمة التلميح.' };
  }

  if (trimmedWord.includes(' ')) {
    return { ok: false, state, error: 'يجب أن يتكون التلميح من كلمة واحدة فقط دون مسافات.' };
  }

  const normalizedClue = normalizeArabicWord(trimmedWord);
  const matchingBoardCard = state.cards.find(
    (c) => !c.revealed && normalizeArabicWord(c.wordAr) === normalizedClue
  );
  if (matchingBoardCard) {
    return {
      ok: false,
      state,
      error: `لا يمكن استخدام كلمة "${matchingBoardCard.wordAr}" لأنها موجودة على اللوحة ولم تُكشف بعد.`,
    };
  }

  let guessesAllowed: number | null = null;
  if (count === 0 || count === 'unlimited') {
    guessesAllowed = null;
  } else {
    const numericCount = Math.max(1, Math.min(9, Math.floor(Number(count))));
    guessesAllowed = state.settings.plusOneRule ? numericCount + 1 : numericCount;
  }

  const undoStack = pushUndoSnapshot(state);
  const now = Date.now();
  const teamName = getTeamLabel(state, state.currentTurn);
  const countLabel = count === 'unlimited' ? '∞ (غير محدود)' : String(count);

  const clue: ClueState = {
    word: trimmedWord,
    count,
    team: state.currentTurn,
    guessesAllowed,
    guessesMade: 0,
    declaredAt: now,
  };

  const broadcast: BroadcastBannerEvent = {
    id: `bc_${now}_clue`,
    type: 'clue_declared',
    timestamp: now,
    team: state.currentTurn,
    teamName,
    titleAr: `تلميح القائد · ${teamName}`,
    subtitleAr: `الكلمة المفتاحية: «${trimmedWord}» — العدد: ${countLabel}`,
    clueWord: trimmedWord,
    clueCount: count,
  };

  return {
    ok: true,
    state: {
      ...state,
      currentClue: clue,
      clueHistory: [clue, ...state.clueHistory],
      activeBroadcast: state.settings.broadcastEffectsEnabled ? broadcast : null,
      undoStack,
      eventLog: [
        {
          id: `evt_${now}_clue`,
          timestamp: now,
          turn: state.turnsCount,
          team: state.currentTurn,
          type: 'clue',
          message: `تلميح قائد ${teamName}: «${trimmedWord} — ${countLabel}»`,
        },
        ...state.eventLog,
      ],
    },
  };
}

/**
 * Reveals a card at `cardIndex` and applies all mode-specific Codenames rules.
 */
export function revealCard(
  state: ServerGameState,
  cardIndex: number,
  options: { actingTeam?: TeamColor; forceByReferee?: boolean } = {}
): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'لا يمكن كشف البطاقات والجولة متوقفة أو منتهية.' };
  }

  if (
    options.actingTeam &&
    options.actingTeam !== state.currentTurn &&
    state.gameMode !== 'cooperative'
  ) {
    return { ok: false, state, error: 'لا يمكن للفريق غير النشط إجراء تخمين في هذا الدور.' };
  }

  if (
    state.settings.requireClueBeforeGuess &&
    !state.currentClue &&
    !options.forceByReferee
  ) {
    return { ok: false, state, error: 'يجب إعلان التلميح أولًا قبل اختيار البطاقات.' };
  }

  const card = state.cards[cardIndex];
  if (!card) {
    return { ok: false, state, error: 'رقم البطاقة غير صالح.' };
  }

  if (card.revealed) {
    return { ok: false, state, error: 'هذه البطاقة مكشوفة بالفعل.' };
  }

  const undoStack = pushUndoSnapshot(state);
  const now = Date.now();
  const activeTeam = state.currentTurn;
  const opponentTeam = getOpponentTeam(activeTeam);
  const activeTeamName = getTeamLabel(state, activeTeam);

  const updatedCards = state.cards.map((c, idx) =>
    idx === cardIndex
      ? {
          ...c,
          revealed: true,
          revealedBy: activeTeam,
          revealedAtTurn: state.turnsCount,
        }
      : c
  );

  let redRemaining = state.redRemaining;
  let blueRemaining = state.blueRemaining;
  if (card.secretColor === 'red') {
    redRemaining = Math.max(0, redRemaining - 1);
  } else if (card.secretColor === 'blue') {
    blueRemaining = Math.max(0, blueRemaining - 1);
  }

  let nextStatus: ServerGameState['status'] = state.status;
  let nextTurn: TeamColor = state.currentTurn;
  let nextTurnsCount = state.turnsCount;
  let nextCoopTurns = state.coopTurnsRemaining;
  let nextClue: ClueState | null = state.currentClue
    ? { ...state.currentClue, guessesMade: state.currentClue.guessesMade + 1 }
    : null;
  let winner: TeamColor | null = null;
  let loser: TeamColor | null = null;
  let winReason: WinReason | null = null;
  let endedAt: number | null = state.endedAt;
  let nextTimer = state.timerRemainingSeconds;
  let logMessage = '';
  let broadcast: BroadcastBannerEvent | null = null;

  if (card.secretColor === 'black') {
    nextStatus = 'gameover';
    winner = opponentTeam;
    loser = activeTeam;
    winReason = 'black_card';
    endedAt = now;
    logMessage = `كشف ${activeTeamName} البطاقة السوداء «${card.wordAr}»! انتهت الجولة.`;
    broadcast = {
      id: `bc_${now}_black`,
      type: 'victory_celebration',
      timestamp: now,
      team: opponentTeam,
      teamName: getTeamLabel(state, opponentTeam),
      titleAr: `البطاقة السوداء القاتلة! «${card.wordAr}»`,
      subtitleAr:
        state.gameMode === 'cooperative'
          ? 'انتهت المهمة التعاونية بكشف البطاقة السوداء!'
          : `فوز فوري لصالح ${getTeamLabel(state, opponentTeam)}`,
      cardWord: card.wordAr,
      cardColor: 'black',
    };
  } else if (state.gameMode === 'cooperative') {
    // Cooperative mode logic
    if (card.secretColor === 'red') {
      if (redRemaining === 0) {
        nextStatus = 'gameover';
        winner = 'red';
        loser = 'blue';
        winReason = 'all_cards_revealed';
        endedAt = now;
        logMessage = `أنجز ${activeTeamName} المهمة التعاونية وكشف جميع الـ 15 بطاقة بنجاح!`;
        broadcast = {
          id: `bc_${now}_coop_win`,
          type: 'victory_celebration',
          timestamp: now,
          team: 'red',
          teamName: activeTeamName,
          titleAr: `انتصار تعاوني باهر!`,
          subtitleAr: `تم كشف جميع البطاقات المستهدفة قبل نفاد الأدوار!`,
          cardWord: card.wordAr,
          cardColor: 'red',
        };
      } else {
        logMessage = `إصابة صحيحة للفريق التعاوني: «${card.wordAr}» — متبقي ${redRemaining} أهداف.`;
        if (redRemaining === 1) {
          broadcast = {
            id: `bc_${now}_near_coop`,
            type: 'near_victory',
            timestamp: now,
            team: 'red',
            teamName: activeTeamName,
            titleAr: `نقطة الحسم! بطاقة واحدة متبقية للفوز!`,
            subtitleAr: `كُشفت «${card.wordAr}» بنجاح — بقي هدف واحد فقط!`,
            cardWord: card.wordAr,
            cardColor: 'red',
            remainingCount: 1,
          };
        } else {
          broadcast = {
            id: `bc_${now}_rev_coop`,
            type: 'card_revealed',
            timestamp: now,
            team: 'red',
            teamName: activeTeamName,
            titleAr: `إجابة صحيحة: «${card.wordAr}»`,
            subtitleAr: `بطاقة مستهدفة · متبقي ${redRemaining} بطاقات`,
            cardWord: card.wordAr,
            cardColor: 'red',
          };
        }
      }
    } else {
      // Neutral card in Cooperative mode costs 1 turn
      nextCoopTurns = Math.max(0, nextCoopTurns - 1);
      nextClue = null;
      nextTimer = state.settings.timerDurationSeconds;
      if (nextCoopTurns === 0 && redRemaining > 0) {
        nextStatus = 'gameover';
        winner = 'blue';
        loser = 'red';
        winReason = 'out_of_turns';
        endedAt = now;
        logMessage = `كشف الفريق بطاقة محايدة «${card.wordAr}» ونفدت جميع الأدوار الـ ${state.coopMaxTurns}!`;
        broadcast = {
          id: `bc_${now}_coop_out`,
          type: 'victory_celebration',
          timestamp: now,
          team: 'blue',
          teamName: 'تحدي اللوحة',
          titleAr: `انتهت الأدوار المتاحة!`,
          subtitleAr: `بقي ${redRemaining} أهداف غير مكشوفة بعد نفاد الأدوار.`,
          cardWord: card.wordAr,
          cardColor: 'neutral',
        };
      } else {
        nextTurnsCount += 1;
        logMessage = `بطاقة محايدة «${card.wordAr}» — انتهى الدور التعاوني (الأدوار المتبقية: ${nextCoopTurns}).`;
        broadcast = {
          id: `bc_${now}_coop_neu`,
          type: 'turn_transition',
          timestamp: now,
          team: 'red',
          teamName: activeTeamName,
          titleAr: `بطاقة محايدة «${card.wordAr}»`,
          subtitleAr: `انتقل للدور التعاوني التالي · الأدوار المتبقية: ${nextCoopTurns}`,
          cardWord: card.wordAr,
          cardColor: 'neutral',
        };
      }
    }
  } else if (card.secretColor === activeTeam) {
    const activeRemaining = activeTeam === 'red' ? redRemaining : blueRemaining;
    if (activeRemaining === 0) {
      nextStatus = 'gameover';
      winner = activeTeam;
      loser = opponentTeam;
      winReason = 'all_cards_revealed';
      endedAt = now;
      logMessage = `كشف ${activeTeamName} بطاقته الأخيرة «${card.wordAr}» وفاز بالجولة!`;
      broadcast = {
        id: `bc_${now}_win`,
        type: 'victory_celebration',
        timestamp: now,
        team: activeTeam,
        teamName: activeTeamName,
        titleAr: `انتصار ${activeTeamName}!`,
        subtitleAr: `اكتمل كشف جميع بطاقات الفريق بالكلمة الحاسمة «${card.wordAr}»`,
        cardWord: card.wordAr,
        cardColor: activeTeam,
      };
    } else {
      if (
        nextClue &&
        nextClue.guessesAllowed !== null &&
        nextClue.guessesMade >= nextClue.guessesAllowed
      ) {
        nextTurn = opponentTeam;
        nextTurnsCount += 1;
        nextClue = null;
        nextTimer = state.settings.timerDurationSeconds;
        logMessage = `إجابة صحيحة لـ ${activeTeamName}: «${card.wordAr}» — استُنفدت التخمينات المتاحة وانتقل الدور.`;
        broadcast = {
          id: `bc_${now}_turn_max`,
          type: 'turn_transition',
          timestamp: now,
          team: opponentTeam,
          teamName: getTeamLabel(state, opponentTeam),
          titleAr: `إجابة صحيحة «${card.wordAr}» · اكتملت المحاولات`,
          subtitleAr: `انتقل الدور الآن إلى ${getTeamLabel(state, opponentTeam)}`,
          cardWord: card.wordAr,
          cardColor: activeTeam,
        };
      } else {
        logMessage = `إجابة صحيحة لـ ${activeTeamName}: «${card.wordAr}» — يستمر الدور.`;
        if (activeRemaining === 1) {
          broadcast = {
            id: `bc_${now}_matchpoint`,
            type: 'near_victory',
            timestamp: now,
            team: activeTeam,
            teamName: activeTeamName,
            titleAr: `اقتراب الفوز · بطاقة واحدة متبقية لـ ${activeTeamName}!`,
            subtitleAr: `كُشفت «${card.wordAr}» بنجاح — الفريق على بُعد كلمة واحدة من الحسم!`,
            cardWord: card.wordAr,
            cardColor: activeTeam,
            remainingCount: 1,
          };
        } else {
          broadcast = {
            id: `bc_${now}_rev_ok`,
            type: 'card_revealed',
            timestamp: now,
            team: activeTeam,
            teamName: activeTeamName,
            titleAr: `بطاقة صحيحة: «${card.wordAr}»`,
            subtitleAr: `يستمر دور ${activeTeamName} · متبقي ${activeRemaining}`,
            cardWord: card.wordAr,
            cardColor: activeTeam,
          };
        }
      }
    }
  } else if (card.secretColor === 'neutral') {
    nextTurn = opponentTeam;
    nextTurnsCount += 1;
    nextClue = null;
    nextTimer = state.settings.timerDurationSeconds;
    logMessage = `كشف ${activeTeamName} بطاقة محايدة «${card.wordAr}» — انتقل الدور إلى ${getTeamLabel(state, opponentTeam)}.`;
    broadcast = {
      id: `bc_${now}_rev_neu`,
      type: 'turn_transition',
      timestamp: now,
      team: opponentTeam,
      teamName: getTeamLabel(state, opponentTeam),
      titleAr: `بطاقة محايدة: «${card.wordAr}»`,
      subtitleAr: `انتهى الدور وانتقلت المبادرة إلى ${getTeamLabel(state, opponentTeam)}`,
      cardWord: card.wordAr,
      cardColor: 'neutral',
    };
  } else {
    const opponentRemaining = opponentTeam === 'red' ? redRemaining : blueRemaining;
    if (opponentRemaining === 0) {
      nextStatus = 'gameover';
      winner = opponentTeam;
      loser = activeTeam;
      winReason = 'opponent_completed_cards';
      endedAt = now;
      logMessage = `كشف ${activeTeamName} البطاقة الأخيرة للمنافس «${card.wordAr}»! فاز ${getTeamLabel(state, opponentTeam)} بالجولة.`;
      broadcast = {
        id: `bc_${now}_opp_win`,
        type: 'victory_celebration',
        timestamp: now,
        team: opponentTeam,
        teamName: getTeamLabel(state, opponentTeam),
        titleAr: `فوز ${getTeamLabel(state, opponentTeam)}!`,
        subtitleAr: `اكتملت بطاقات الفريق بعد كشف «${card.wordAr}»`,
        cardWord: card.wordAr,
        cardColor: opponentTeam,
      };
    } else {
      nextTurn = opponentTeam;
      nextTurnsCount += 1;
      nextClue = null;
      nextTimer = state.settings.timerDurationSeconds;
      logMessage = `كشف ${activeTeamName} بطاقة للمنافس «${card.wordAr}» — احتُسبت للمنافس وانتقل الدور.`;
      broadcast = {
        id: `bc_${now}_rev_opp`,
        type: opponentRemaining === 1 ? 'near_victory' : 'turn_transition',
        timestamp: now,
        team: opponentTeam,
        teamName: getTeamLabel(state, opponentTeam),
        titleAr:
          opponentRemaining === 1
            ? `بطاقة للمنافس «${card.wordAr}» · بقيت بطاقة واحدة لـ ${getTeamLabel(state, opponentTeam)}!`
            : `بطاقة للمنافس: «${card.wordAr}»`,
        subtitleAr: `نقطة لصالح ${getTeamLabel(state, opponentTeam)} وانتقال الدور فورًا`,
        cardWord: card.wordAr,
        cardColor: opponentTeam,
        remainingCount: opponentRemaining,
      };
    }
  }

  let matchHistory = state.matchHistory;
  let redWinsCount = state.redWinsCount;
  let blueWinsCount = state.blueWinsCount;

  if (nextStatus === 'gameover' && winner && loser && winReason) {
    if (winner === 'red') redWinsCount += 1;
    if (winner === 'blue') blueWinsCount += 1;

    const durationSeconds = Math.max(1, Math.round((now - state.startedAt) / 1000));
    const record: MatchRecord = {
      id: `match_${now}_${state.roundNumber}`,
      roomId: state.roomId,
      gameMode: state.gameMode,
      roundNumber: state.roundNumber,
      redTeamCode: state.redTeamCode,
      redTeamName: state.redTeamName,
      blueTeamCode: state.blueTeamCode,
      blueTeamName: state.blueTeamName,
      startingTeam: state.startingTeam,
      winner,
      loser,
      winReason,
      winReasonAr: getWinReasonArabic(winReason),
      turnsCount: state.turnsCount,
      durationSeconds,
      completedAt: new Date(now).toISOString(),
      redRemaining,
      blueRemaining,
      cluesCount: state.clueHistory.length,
    };
    matchHistory = [record, ...state.matchHistory];
  }

  return {
    ok: true,
    state: {
      ...state,
      status: nextStatus,
      currentTurn: nextTurn,
      turnsCount: nextTurnsCount,
      coopTurnsRemaining: nextCoopTurns,
      cards: updatedCards,
      redRemaining,
      blueRemaining,
      currentClue: nextClue,
      activeBroadcast: state.settings.broadcastEffectsEnabled ? broadcast : null,
      winner,
      loser,
      winReason,
      endedAt,
      timerRemainingSeconds: nextTimer,
      undoStack,
      matchHistory,
      redWinsCount,
      blueWinsCount,
      eventLog: [
        {
          id: `evt_${now}_reveal_${cardIndex}`,
          timestamp: now,
          turn: state.turnsCount,
          team: activeTeam,
          type: nextStatus === 'gameover' ? 'gameover' : 'reveal',
          cardColor: card.secretColor,
          message: logMessage,
        },
        ...state.eventLog,
      ],
    },
  };
}

/**
 * Official Rulebook p.7: Penalty for Invalid Clue.
 */
export function applyInvalidCluePenalty(state: ServerGameState): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'الجولة ليست في حالة لعب نشط.' };
  }

  const undoStack = pushUndoSnapshot(state);
  const now = Date.now();
  const offendingTeam = state.currentTurn;
  const opponentTeam = state.gameMode === 'cooperative' ? 'red' : getOpponentTeam(offendingTeam);

  const bonusCard =
    state.gameMode === 'cooperative'
      ? undefined
      : state.cards.find((c) => !c.revealed && c.secretColor === opponentTeam);

  let updatedCards = state.cards;
  let redRemaining = state.redRemaining;
  let blueRemaining = state.blueRemaining;
  let nextStatus: ServerGameState['status'] = 'playing';
  let winner: TeamColor | null = null;
  let loser: TeamColor | null = null;
  let winReason: WinReason | null = null;
  let endedAt: number | null = state.endedAt;

  if (bonusCard) {
    updatedCards = state.cards.map((c) =>
      c.index === bonusCard.index
        ? {
            ...c,
            revealed: true,
            revealedBy: opponentTeam,
            revealedAtTurn: state.turnsCount,
          }
        : c
    );
    if (opponentTeam === 'red') redRemaining = Math.max(0, redRemaining - 1);
    if (opponentTeam === 'blue') blueRemaining = Math.max(0, blueRemaining - 1);

    const oppRem = opponentTeam === 'red' ? redRemaining : blueRemaining;
    if (oppRem === 0) {
      nextStatus = 'gameover';
      winner = opponentTeam;
      loser = offendingTeam;
      winReason = 'opponent_completed_cards';
      endedAt = now;
    }
  }

  const broadcast: BroadcastBannerEvent = {
    id: `bc_${now}_penalty`,
    type: 'turn_transition',
    timestamp: now,
    team: opponentTeam,
    teamName: getTeamLabel(state, opponentTeam),
    titleAr: `عقوبة تلميح مخالف على ${getTeamLabel(state, offendingTeam)}`,
    subtitleAr: bonusCard
      ? `كُشفت بطاقة «${bonusCard.wordAr}» لصالح ${getTeamLabel(state, opponentTeam)} وانتقل الدور`
      : 'انتهى الدور فورًا بسبب مخالفة شروط التلميح',
    cardWord: bonusCard?.wordAr,
    cardColor: opponentTeam,
  };

  return {
    ok: true,
    state: {
      ...state,
      status: nextStatus,
      currentTurn: opponentTeam,
      turnsCount: state.turnsCount + 1,
      cards: updatedCards,
      redRemaining,
      blueRemaining,
      currentClue: null,
      activeBroadcast: state.settings.broadcastEffectsEnabled ? broadcast : null,
      winner,
      loser,
      winReason,
      endedAt,
      timerRemainingSeconds: state.settings.timerDurationSeconds,
      undoStack,
      eventLog: [
        {
          id: `evt_${now}_penalty`,
          timestamp: now,
          turn: state.turnsCount,
          team: offendingTeam,
          type: 'penalty',
          message: `عقوبة تلميح مخالف على ${getTeamLabel(state, offendingTeam)} — انتهى الدور فورًا${
            bonusCard ? ` وكُشفت بطاقة «${bonusCard.wordAr}» لصالح ${getTeamLabel(state, opponentTeam)}` : ''
          }.`,
        },
        ...state.eventLog,
      ],
    },
  };
}

/**
 * Ends the active team's turn early (or when timer expires).
 */
export function endTurn(
  state: ServerGameState,
  actingTeam?: TeamColor,
  reason: 'manual' | 'time_up' = 'manual'
): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'الجولة ليست في حالة لعب نشط.' };
  }

  if (actingTeam && actingTeam !== state.currentTurn && state.gameMode !== 'cooperative') {
    return { ok: false, state, error: 'ليس دور هذا الفريق لإنهاء الدور.' };
  }

  const undoStack = pushUndoSnapshot(state);
  const now = Date.now();
  const prevTeam = state.currentTurn;

  if (state.gameMode === 'cooperative') {
    const nextCoopTurns = Math.max(0, state.coopTurnsRemaining - 1);
    if (nextCoopTurns === 0 && state.redRemaining > 0) {
      return {
        ok: true,
        state: {
          ...state,
          status: 'gameover',
          coopTurnsRemaining: 0,
          currentClue: null,
          winner: 'blue',
          loser: 'red',
          winReason: 'out_of_turns',
          endedAt: now,
          undoStack,
          activeBroadcast: state.settings.broadcastEffectsEnabled
            ? {
                id: `bc_${now}_coop_end`,
                type: 'victory_celebration',
                timestamp: now,
                team: 'blue',
                teamName: 'تحدي اللوحة',
                titleAr: 'انتهت جميع الأدوار المتاحة!',
                subtitleAr: `بقي ${state.redRemaining} بطاقات مستهدفة دون كشف.`,
              }
            : null,
          eventLog: [
            {
              id: `evt_${now}_coop_over`,
              timestamp: now,
              turn: state.turnsCount,
              team: 'red',
              type: 'gameover',
              message: `انتهت الأدوار المتاحة في الوضع التعاوني وبقي ${state.redRemaining} أهداف.`,
            },
            ...state.eventLog,
          ],
        },
      };
    }

    return {
      ok: true,
      state: {
        ...state,
        turnsCount: state.turnsCount + 1,
        coopTurnsRemaining: nextCoopTurns,
        currentClue: null,
        timerRemainingSeconds: state.settings.timerDurationSeconds,
        undoStack,
        activeBroadcast: state.settings.broadcastEffectsEnabled
          ? {
              id: `bc_${now}_coop_turn`,
              type: reason === 'time_up' ? 'time_up' : 'turn_transition',
              timestamp: now,
              team: 'red',
              teamName: state.redTeamName,
              titleAr:
                reason === 'time_up'
                  ? 'انتهى وقت الدور التعاوني!'
                  : `بداية الدور التعاوني #${state.turnsCount + 1}`,
              subtitleAr: `الأدوار المتبقية لإتمام المهمة: ${nextCoopTurns}`,
            }
          : null,
        eventLog: [
          {
            id: `evt_${now}_coop_next`,
            timestamp: now,
            turn: state.turnsCount,
            team: 'red',
            type: reason === 'time_up' ? 'time_up' : 'end_turn',
            message:
              reason === 'time_up'
                ? `انتهى وقت الدور — الأدوار التعاونية المتبقية: ${nextCoopTurns}.`
                : `انتقل الفريق إلى الدور التالي — الأدوار المتبقية: ${nextCoopTurns}.`,
          },
          ...state.eventLog,
        ],
      },
    };
  }

  const nextTurn = getOpponentTeam(prevTeam);
  const nextTeamName = getTeamLabel(state, nextTurn);

  const broadcast: BroadcastBannerEvent = {
    id: `bc_${now}_${reason}`,
    type: reason === 'time_up' ? 'time_up' : 'turn_transition',
    timestamp: now,
    team: nextTurn,
    teamName: nextTeamName,
    titleAr:
      reason === 'time_up'
        ? `انتهى الوقت! انتقل الدور إلى ${nextTeamName}`
        : `انتقال الدور إلى ${nextTeamName}`,
    subtitleAr: `الدور #${state.turnsCount + 1} · بانتظار تلميح قائد ${nextTeamName}`,
  };

  return {
    ok: true,
    state: {
      ...state,
      currentTurn: nextTurn,
      turnsCount: state.turnsCount + 1,
      currentClue: null,
      activeBroadcast: state.settings.broadcastEffectsEnabled ? broadcast : null,
      timerRemainingSeconds: state.settings.timerDurationSeconds,
      undoStack,
      eventLog: [
        {
          id: `evt_${now}_endturn`,
          timestamp: now,
          turn: state.turnsCount,
          team: prevTeam,
          type: reason === 'time_up' ? 'time_up' : 'end_turn',
          message:
            reason === 'time_up'
              ? `انتهى الوقت المخصص لـ ${getTeamLabel(state, prevTeam)} — انتقل الدور تلقائيًا إلى ${nextTeamName}.`
              : `أنهى ${getTeamLabel(state, prevTeam)} دوره — انتقل الدور إلى ${nextTeamName}.`,
        },
        ...state.eventLog,
      ],
    },
  };
}

/**
 * Safely reverts the last action (clue, reveal, penalty, or endTurn) without corrupting match state.
 */
export function undoLastAction(state: ServerGameState): ActionResult {
  if (state.undoStack.length === 0) {
    return { ok: false, state, error: 'لا توجد إجراءات سابقة للتراجع عنها.' };
  }

  const previous = state.undoStack[state.undoStack.length - 1];
  const remainingUndoStack = state.undoStack.slice(0, -1);
  const now = Date.now();

  let matchHistory = state.matchHistory;
  let redWinsCount = state.redWinsCount;
  let blueWinsCount = state.blueWinsCount;
  if (state.status === 'gameover' && previous.status !== 'gameover') {
    if (state.winner === 'red') redWinsCount = Math.max(0, redWinsCount - 1);
    if (state.winner === 'blue') blueWinsCount = Math.max(0, blueWinsCount - 1);
    matchHistory = state.matchHistory.slice(1);
  }

  return {
    ok: true,
    state: {
      ...state,
      status: previous.status,
      currentTurn: previous.currentTurn,
      turnsCount: previous.turnsCount,
      coopTurnsRemaining: previous.coopTurnsRemaining,
      cards: previous.cards.map((c) => ({ ...c })),
      redRemaining: previous.redRemaining,
      blueRemaining: previous.blueRemaining,
      currentClue: previous.currentClue ? { ...previous.currentClue } : null,
      activeBroadcast: null,
      winner: previous.winner,
      loser: previous.loser,
      winReason: previous.winReason,
      endedAt: null,
      timerRemainingSeconds: previous.timerRemainingSeconds,
      matchHistory,
      redWinsCount,
      blueWinsCount,
      undoStack: remainingUndoStack,
      eventLog: [
        {
          id: `evt_${now}_undo`,
          timestamp: now,
          turn: previous.turnsCount,
          team: previous.currentTurn,
          type: 'undo',
          message: 'تم التراجع الآمن عن آخر إجراء بأمر الحكم.',
        },
        ...previous.eventLog,
      ],
    },
  };
}

/**
 * Resets the current round with the exact same words and secret colors (unrevealing all cards).
 */
export function restartCurrentRound(state: ServerGameState): ServerGameState {
  const now = Date.now();
  return {
    ...state,
    status: 'playing',
    currentTurn: state.startingTeam,
    turnsCount: 1,
    coopTurnsRemaining: state.coopMaxTurns,
    cards: state.cards.map((c) => ({
      ...c,
      revealed: false,
      revealedBy: undefined,
      revealedAtTurn: undefined,
    })),
    redRemaining: state.redTotal,
    blueRemaining: state.blueTotal,
    currentClue: null,
    clueHistory: [],
    activeBroadcast: null,
    winner: null,
    loser: null,
    winReason: null,
    startedAt: now,
    endedAt: null,
    timerRemainingSeconds: state.settings.timerDurationSeconds,
    undoStack: [],
    eventLog: [
      {
        id: `evt_${now}_restart`,
        timestamp: now,
        turn: 1,
        team: state.startingTeam,
        type: 'round_start',
        message: `تمت إعادة الجولة #${state.roundNumber} من البداية.`,
      },
    ],
  };
}

/**
 * Computes Tournament Standings from a list of MatchRecords.
 */
export function computeTournamentStandings(matches: readonly MatchRecord[]): TournamentStandingRow[] {
  const map = new Map<string, TournamentStandingRow>();

  const ensureTeam = (name: string): TournamentStandingRow => {
    let row = map.get(name);
    if (!row) {
      row = {
        teamName: name,
        played: 0,
        wins: 0,
        losses: 0,
        points: 0,
        cardsRevealed: 0,
        blackCardLosses: 0,
      };
      map.set(name, row);
    }
    return row;
  };

  for (const m of matches) {
    if (m.gameMode === 'cooperative') continue;
    const redRow = ensureTeam(m.redTeamName);
    const blueRow = ensureTeam(m.blueTeamName);

    redRow.played += 1;
    blueRow.played += 1;

    const redTotal = m.startingTeam === 'red' ? 9 : 8;
    const blueTotal = m.startingTeam === 'blue' ? 9 : 8;
    redRow.cardsRevealed += Math.max(0, redTotal - m.redRemaining);
    blueRow.cardsRevealed += Math.max(0, blueTotal - m.blueRemaining);

    if (m.winner === 'red') {
      redRow.wins += 1;
      redRow.points += 3;
      blueRow.losses += 1;
      if (m.winReason === 'black_card') blueRow.blackCardLosses += 1;
    } else {
      blueRow.wins += 1;
      blueRow.points += 3;
      redRow.losses += 1;
      if (m.winReason === 'black_card') redRow.blackCardLosses += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.cardsRevealed - a.cardsRevealed;
  });
}

/**
 * Strips ALL secret key information, seeds, and PINs for Audience view so unrevealed card colors
 * can NEVER be reconstructed or inspected from network payloads.
 */
export function sanitizeStateForRole(state: ServerGameState, role: ClientRole): ClientGameState {
  const canSeeSecretKey =
    role === 'spymaster_red' || role === 'spymaster_blue' || role === 'referee';

  const publicCards: PublicCard[] = state.cards.map((card) => {
    const base: PublicCard = {
      index: card.index,
      wordId: card.wordId,
      wordAr: card.wordAr,
      wordEn: card.wordEn,
      category: card.category,
      subCategory: card.subCategory,
      iconType: card.iconType,
      color: card.revealed ? card.secretColor : null,
      revealed: card.revealed,
      revealedBy: card.revealedBy,
      revealedAtTurn: card.revealedAtTurn,
    };

    if (canSeeSecretKey) {
      base.secretColor = card.secretColor;
      base.relatedWords = card.relatedWords;
    }

    return base;
  });

  // Also scrub any accidental digit sequences matching current PINs from public event logs
  const safeLogs = state.eventLog.slice(0, 40).map((evt) => {
    if (canSeeSecretKey) return evt;
    return {
      ...evt,
      message: evt.message
        .replace(new RegExp(state.spymasterPin, 'g'), '****')
        .replace(new RegExp(state.refereePin, 'g'), '****'),
    };
  });

  return {
    roomId: state.roomId,
    // SECURITY: Never send roundSeed to audience
    roundSeed: canSeeSecretKey ? state.roundSeed : undefined,
    role,
    refereePin: role === 'referee' ? state.refereePin : undefined,
    spymasterPin: canSeeSecretKey ? state.spymasterPin : undefined,
    refereeClaimed: state.refereeClaimed,
    roundNumber: state.roundNumber,
    gameMode: state.gameMode || 'classic',
    boardSize: state.boardSize || 25,
    gridCols: state.gridCols || 5,
    coopTurnsRemaining: state.coopTurnsRemaining ?? 9,
    coopMaxTurns: state.coopMaxTurns ?? 9,
    status: state.status,
    redTeamCode: state.redTeamCode,
    redTeamName: state.redTeamName,
    blueTeamCode: state.blueTeamCode,
    blueTeamName: state.blueTeamName,
    startingTeam: state.startingTeam,
    currentTurn: state.currentTurn,
    turnsCount: state.turnsCount,
    cards: publicCards,
    redTotal: state.redTotal,
    blueTotal: state.blueTotal,
    redRemaining: state.redRemaining,
    blueRemaining: state.blueRemaining,
    currentClue: state.currentClue,
    clueHistory: state.clueHistory || [],
    activeBroadcast: state.activeBroadcast || null,
    winner: state.winner,
    loser: state.loser,
    winReason: state.winReason,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    timerRemainingSeconds: state.timerRemainingSeconds,
    settings: state.settings,
    customWordsCount: state.customWords.length,
    disabledWordsCount: (state.disabledWordIds || []).length,
    activePoolCount: OFFICIAL_WORD_BANK.length + state.customWords.length - (state.disabledWordIds || []).length,
    eventLog: safeLogs,
    matchHistory: state.matchHistory,
    redWinsCount: state.redWinsCount,
    blueWinsCount: state.blueWinsCount,
    canUndo: state.undoStack.length > 0,
  };
}
