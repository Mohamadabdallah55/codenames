import {
  OFFICIAL_WORD_BANK,
  WordCategory,
  WordEntry,
  buildValidatedWordBank,
  normalizeArabicWord,
} from '../data/words';

export type TeamColor = 'red' | 'blue';
export type CardColor = 'red' | 'blue' | 'neutral' | 'black';
export type EliteTeamCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type ClientRole = 'audience' | 'spymaster_red' | 'spymaster_blue' | 'referee';
export type LanguageMode = 'ar' | 'ar_en';
export type WinReason = 'all_cards_revealed' | 'opponent_completed_cards' | 'black_card';

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
  color: CardColor | null;
  secretColor?: CardColor;
  revealed: boolean;
  revealedBy?: TeamColor;
  revealedAtTurn?: number;
}

export interface GameEventLog {
  id: string;
  timestamp: number;
  turn: number;
  team: TeamColor;
  type: 'round_start' | 'clue' | 'reveal' | 'end_turn' | 'penalty' | 'undo' | 'pause' | 'gameover';
  message: string;
  cardColor?: CardColor;
}

export interface MatchRecord {
  id: string;
  roomId: string;
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
}

export interface GameSettings {
  timerEnabled: boolean;
  timerDurationSeconds: number;
  soundEnabled: boolean;
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
  cards: ServerCard[];
  redRemaining: number;
  blueRemaining: number;
  currentClue: ClueState | null;
  winner: TeamColor | null;
  loser: TeamColor | null;
  winReason: WinReason | null;
  eventLog: GameEventLog[];
  timerRemainingSeconds: number;
}

export interface ServerGameState {
  roomId: string;
  roundSeed: string; // Deterministic seed for this specific round so QR codes work even on static GitHub Pages!
  refereePin: string; // Unique per room/match
  spymasterPin: string; // Unique per game/round!
  roundNumber: number;
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
  winner: TeamColor | null;
  loser: TeamColor | null;
  winReason: WinReason | null;
  startedAt: number;
  endedAt: number | null;
  timerRemainingSeconds: number;
  settings: GameSettings;
  customWords: WordEntry[];
  usedWordsHistory: string[];
  eventLog: GameEventLog[];
  matchHistory: MatchRecord[];
  redWinsCount: number;
  blueWinsCount: number;
  undoStack: UndoSnapshot[];
}

export interface ClientGameState {
  roomId: string;
  roundSeed: string;
  role: ClientRole;
  refereePin?: string;
  spymasterPin?: string; // Sent to Referee and Spymasters so they can show QR code
  roundNumber: number;
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
  winner: TeamColor | null;
  loser: TeamColor | null;
  winReason: WinReason | null;
  startedAt: number;
  endedAt: number | null;
  timerRemainingSeconds: number;
  settings: GameSettings;
  customWordsCount: number;
  eventLog: GameEventLog[];
  matchHistory: MatchRecord[];
  redWinsCount: number;
  blueWinsCount: number;
  canUndo: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  timerEnabled: true,
  timerDurationSeconds: 90,
  soundEnabled: true,
  languageMode: 'ar',
  fontScale: 'large',
  projectorHighContrast: false,
  requireClueBeforeGuess: false,
  plusOneRule: true,
  allowAudienceClickInLocalMode: true,
};

/**
 * Creates a deterministic 32-bit PRNG from any string seed (xfnv1a + mulberry32).
 * Enables zero-server static QR synchronization (e.g., on GitHub Pages) as well as reproducible rounds.
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
 * Generates a random 4-digit numeric PIN (1000..9999) for each game/round.
 */
export function generateDynamicPin(rng: () => number = Math.random): string {
  const num = Math.floor(1000 + rng() * 9000);
  return String(num);
}

/**
 * Cryptographically strong or custom seeded Fisher-Yates shuffle
 */
export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[i] = tmp;
  }
  return arr;
}

export function getOpponentTeam(team: TeamColor): TeamColor {
  return team === 'red' ? 'blue' : 'red';
}

export function getTeamLabel(
  state: Pick<ServerGameState, 'redTeamName' | 'blueTeamName'>,
  team: TeamColor
): string {
  return team === 'red' ? state.redTeamName : state.blueTeamName;
}

export function getWinReasonArabic(reason: WinReason): string {
  switch (reason) {
    case 'all_cards_revealed':
      return 'كشف جميع بطاقات الفريق بنجاح';
    case 'opponent_completed_cards':
      return 'اكتمال بطاقات الفريق بعد اختيار المنافس لبطاقتهم الأخيرة';
    case 'black_card':
      return 'اختيار الفريق المنافس للبطاقة السوداء القاتلة';
  }
}

export interface CreateRoundOptions {
  roomId?: string;
  roundSeed?: string;
  refereePin?: string;
  spymasterPin?: string;
  redTeamCode?: EliteTeamCode;
  redTeamName?: string;
  blueTeamCode?: EliteTeamCode;
  blueTeamName?: string;
  startingTeam?: TeamColor;
  customWords?: WordEntry[];
  usedWordsHistory?: string[];
  settings?: Partial<GameSettings>;
  roundNumber?: number;
  matchHistory?: MatchRecord[];
  redWinsCount?: number;
  blueWinsCount?: number;
  rng?: () => number;
}

/**
 * Generates a fresh 25-card round adhering strictly to Codenames rules:
 * - Dynamic per-game Spymaster PIN and Referee PIN
 * - 25 unique Arabic words not repeated from recent consecutive rounds
 * - Starting team gets 9 cards, second team gets 8 cards, 7 neutral, 1 black
 */
export function createGameRound(options: CreateRoundOptions = {}): ServerGameState {
  const roomId = (options.roomId || 'ELITE-1').trim().toUpperCase();
  const roundNumber = options.roundNumber || 1;

  // Dynamic per-game PINs: if not explicitly passed, generate a fresh 4-digit PIN for this game!
  const spymasterPin = options.spymasterPin || generateDynamicPin(options.rng || Math.random);
  const refereePin = options.refereePin || generateDynamicPin(options.rng || Math.random);

  const roundSeed =
    options.roundSeed ||
    `${roomId}-R${roundNumber}-${spymasterPin}-${Math.floor((options.rng || Math.random)() * 100000)}`;

  // Use deterministic RNG seeded by roundSeed (unless custom rng explicitly passed for unit test)
  const rng = options.rng || createSeededRng(roundSeed);

  const redTeamCode = options.redTeamCode || 'A';
  const blueTeamCode = options.blueTeamCode || 'B';
  const redTeamName = options.redTeamName || ELITE_CLASH_TEAMS[redTeamCode].name;
  const blueTeamName = options.blueTeamName || ELITE_CLASH_TEAMS[blueTeamCode].name;
  const startingTeam: TeamColor =
    options.startingTeam || (rng() < 0.5 ? 'red' : 'blue');
  const secondTeam: TeamColor = getOpponentTeam(startingTeam);

  const customWords = options.customWords || [];
  const combinedPool = buildValidatedWordBank([
    ...customWords.map((w) => ({ ar: w.ar, en: w.en, category: w.category })),
    ...OFFICIAL_WORD_BANK.map((w) => ({ ar: w.ar, en: w.en, category: w.category })),
  ]).words;

  const previousUsed = new Set(options.usedWordsHistory || []);
  let availablePool = combinedPool.filter((w) => !previousUsed.has(normalizeArabicWord(w.ar)));

  let updatedHistory = [...(options.usedWordsHistory || [])];
  if (availablePool.length < 25) {
    const lastBoardOnly = new Set(updatedHistory.slice(-25));
    availablePool = combinedPool.filter((w) => !lastBoardOnly.has(normalizeArabicWord(w.ar)));
    updatedHistory = updatedHistory.slice(-25);
  }

  const shuffledWords = shuffleArray(availablePool, rng).slice(0, 25);
  const newBoardNormalized = shuffledWords.map((w) => normalizeArabicWord(w.ar));
  updatedHistory = [...updatedHistory, ...newBoardNormalized].slice(-250);

  // Build exact 9 / 8 / 7 / 1 color distribution
  const colorDeck: CardColor[] = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('neutral'),
    'black',
  ];
  const shuffledColors = shuffleArray(colorDeck, rng);

  const cards: ServerCard[] = shuffledWords.map((word, index) => ({
    index,
    wordId: word.id,
    wordAr: word.ar,
    wordEn: word.en,
    category: word.category,
    secretColor: shuffledColors[index],
    revealed: false,
  }));

  const redTotal = startingTeam === 'red' ? 9 : 8;
  const blueTotal = startingTeam === 'blue' ? 9 : 8;
  const mergedSettings: GameSettings = {
    ...DEFAULT_GAME_SETTINGS,
    ...(options.settings || {}),
  };

  const now = Date.now();

  return {
    roomId,
    roundSeed,
    refereePin,
    spymasterPin,
    roundNumber,
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
    winner: null,
    loser: null,
    winReason: null,
    startedAt: now,
    endedAt: null,
    timerRemainingSeconds: mergedSettings.timerDurationSeconds,
    settings: mergedSettings,
    customWords,
    usedWordsHistory: updatedHistory,
    eventLog: [
      {
        id: `evt_${now}_start`,
        timestamp: now,
        turn: 1,
        team: startingTeam,
        type: 'round_start',
        message: `بدأت الجولة ${roundNumber} — البداية لصالح ${
          startingTeam === 'red' ? redTeamName : blueTeamName
        } (9 بطاقات) — رمز القائد لهذه الجولة: ${spymasterPin}`,
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
    cards: state.cards.map((c) => ({ ...c })),
    redRemaining: state.redRemaining,
    blueRemaining: state.blueRemaining,
    currentClue: state.currentClue ? { ...state.currentClue } : null,
    winner: state.winner,
    loser: state.loser,
    winReason: state.winReason,
    eventLog: [...state.eventLog],
    timerRemainingSeconds: state.timerRemainingSeconds,
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

  if (actingTeam && actingTeam !== state.currentTurn) {
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

  return {
    ok: true,
    state: {
      ...state,
      currentClue: clue,
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
 * Reveals a card at `cardIndex` (0..24) and applies all Codenames rules.
 */
export function revealCard(
  state: ServerGameState,
  cardIndex: number,
  options: { actingTeam?: TeamColor; forceByReferee?: boolean } = {}
): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'لا يمكن كشف البطاقات والجولة متوقفة أو منتهية.' };
  }

  if (options.actingTeam && options.actingTeam !== state.currentTurn) {
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
  let nextClue: ClueState | null = state.currentClue
    ? { ...state.currentClue, guessesMade: state.currentClue.guessesMade + 1 }
    : null;
  let winner: TeamColor | null = null;
  let loser: TeamColor | null = null;
  let winReason: WinReason | null = null;
  let endedAt: number | null = state.endedAt;
  let nextTimer = state.timerRemainingSeconds;
  let logMessage = '';

  if (card.secretColor === 'black') {
    nextStatus = 'gameover';
    winner = opponentTeam;
    loser = activeTeam;
    winReason = 'black_card';
    endedAt = now;
    logMessage = `كشف ${activeTeamName} البطاقة السوداء «${card.wordAr}»! انتهت الجولة بفوز ${getTeamLabel(state, opponentTeam)}.`;
  } else if (card.secretColor === activeTeam) {
    const activeRemaining = activeTeam === 'red' ? redRemaining : blueRemaining;
    if (activeRemaining === 0) {
      nextStatus = 'gameover';
      winner = activeTeam;
      loser = opponentTeam;
      winReason = 'all_cards_revealed';
      endedAt = now;
      logMessage = `كشف ${activeTeamName} بطاقته الأخيرة «${card.wordAr}» وفاز بالجولة!`;
    } else {
      if (nextClue && nextClue.guessesAllowed !== null && nextClue.guessesMade >= nextClue.guessesAllowed) {
        nextTurn = opponentTeam;
        nextTurnsCount += 1;
        nextClue = null;
        nextTimer = state.settings.timerDurationSeconds;
        logMessage = `إجابة صحيحة لـ ${activeTeamName}: «${card.wordAr}» — استُنفدت التخمينات المتاحة وانتقل الدور.`;
      } else {
        logMessage = `إجابة صحيحة لـ ${activeTeamName}: «${card.wordAr}» — يستمر الدور.`;
      }
    }
  } else if (card.secretColor === 'neutral') {
    nextTurn = opponentTeam;
    nextTurnsCount += 1;
    nextClue = null;
    nextTimer = state.settings.timerDurationSeconds;
    logMessage = `كشف ${activeTeamName} بطاقة محايدة «${card.wordAr}» — انتقل الدور إلى ${getTeamLabel(state, opponentTeam)}.`;
  } else {
    const opponentRemaining = opponentTeam === 'red' ? redRemaining : blueRemaining;
    if (opponentRemaining === 0) {
      nextStatus = 'gameover';
      winner = opponentTeam;
      loser = activeTeam;
      winReason = 'opponent_completed_cards';
      endedAt = now;
      logMessage = `كشف ${activeTeamName} البطاقة الأخيرة للمنافس «${card.wordAr}»! فاز ${getTeamLabel(state, opponentTeam)} بالجولة.`;
    } else {
      nextTurn = opponentTeam;
      nextTurnsCount += 1;
      nextClue = null;
      nextTimer = state.settings.timerDurationSeconds;
      logMessage = `كشف ${activeTeamName} بطاقة للمنافس «${card.wordAr}» — احتُسبت للمنافس وانتقل الدور.`;
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
      cards: updatedCards,
      redRemaining,
      blueRemaining,
      currentClue: nextClue,
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
 * Ends the offending team's turn immediately and awards 1 free unrevealed word to the opposing team!
 */
export function applyInvalidCluePenalty(state: ServerGameState): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'الجولة ليست في حالة لعب نشط.' };
  }

  const undoStack = pushUndoSnapshot(state);
  const now = Date.now();
  const offendingTeam = state.currentTurn;
  const opponentTeam = getOpponentTeam(offendingTeam);

  // Find an unrevealed card belonging to opponentTeam to cover as penalty bonus
  const bonusCard = state.cards.find(
    (c) => !c.revealed && c.secretColor === opponentTeam
  );

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
 * Ends the active team's turn early and switches to the opponent team.
 */
export function endTurn(state: ServerGameState, actingTeam?: TeamColor): ActionResult {
  if (state.status !== 'playing') {
    return { ok: false, state, error: 'الجولة ليست في حالة لعب نشط.' };
  }

  if (actingTeam && actingTeam !== state.currentTurn) {
    return { ok: false, state, error: 'ليس دور هذا الفريق لإنهاء الدور.' };
  }

  const undoStack = pushUndoSnapshot(state);
  const now = Date.now();
  const prevTeam = state.currentTurn;
  const nextTurn = getOpponentTeam(prevTeam);

  return {
    ok: true,
    state: {
      ...state,
      currentTurn: nextTurn,
      turnsCount: state.turnsCount + 1,
      currentClue: null,
      timerRemainingSeconds: state.settings.timerDurationSeconds,
      undoStack,
      eventLog: [
        {
          id: `evt_${now}_endturn`,
          timestamp: now,
          turn: state.turnsCount,
          team: prevTeam,
          type: 'end_turn',
          message: `أنهى ${getTeamLabel(state, prevTeam)} دوره — انتقل الدور إلى ${getTeamLabel(state, nextTurn)}.`,
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
      cards: previous.cards.map((c) => ({ ...c })),
      redRemaining: previous.redRemaining,
      blueRemaining: previous.blueRemaining,
      currentClue: previous.currentClue ? { ...previous.currentClue } : null,
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
 * Resets the current round with the exact same 25 words and secret colors (unrevealing all cards).
 */
export function restartCurrentRound(state: ServerGameState): ServerGameState {
  const now = Date.now();
  return {
    ...state,
    status: 'playing',
    currentTurn: state.startingTeam,
    turnsCount: 1,
    cards: state.cards.map((c) => ({
      ...c,
      revealed: false,
      revealedBy: undefined,
      revealedAtTurn: undefined,
    })),
    redRemaining: state.redTotal,
    blueRemaining: state.blueTotal,
    currentClue: null,
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
        message: `تمت إعادة الجولة ${state.roundNumber} من البداية.`,
      },
    ],
  };
}

/**
 * Strips secret key information for Audience view so unrevealed card colors are NEVER sent over the network.
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
      color: card.revealed ? card.secretColor : null,
      revealed: card.revealed,
      revealedBy: card.revealedBy,
      revealedAtTurn: card.revealedAtTurn,
    };

    if (canSeeSecretKey) {
      base.secretColor = card.secretColor;
    }

    return base;
  });

  return {
    roomId: state.roomId,
    roundSeed: state.roundSeed,
    role,
    refereePin: role === 'referee' ? state.refereePin : undefined,
    spymasterPin: canSeeSecretKey ? state.spymasterPin : undefined,
    roundNumber: state.roundNumber,
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
    winner: state.winner,
    loser: state.loser,
    winReason: state.winReason,
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    timerRemainingSeconds: state.timerRemainingSeconds,
    settings: state.settings,
    customWordsCount: state.customWords.length,
    eventLog: state.eventLog.slice(0, 40),
    matchHistory: state.matchHistory,
    redWinsCount: state.redWinsCount,
    blueWinsCount: state.blueWinsCount,
    canUndo: state.undoStack.length > 0,
  };
}
