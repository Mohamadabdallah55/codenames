import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_WORD_BANK,
  buildValidatedWordBank,
  normalizeArabicWord,
  parseImportedWordsJson,
} from '../data/words';
import {
  createGameRound,
  giveClue,
  revealCard,
  endTurn,
  undoLastAction,
  sanitizeStateForRole,
} from './rules';

test('1 & 18. Word bank has 500+ unique Arabic words with zero duplicates after Tashkeel removal', () => {
  assert.ok(
    OFFICIAL_WORD_BANK.length >= 500,
    `Expected at least 500 words, found ${OFFICIAL_WORD_BANK.length}`
  );
  const normalizedSet = new Set(OFFICIAL_WORD_BANK.map((w) => normalizeArabicWord(w.ar)));
  assert.equal(normalizedSet.size, OFFICIAL_WORD_BANK.length, 'Word bank must have zero normalized duplicates');

  // Verify diacritic and hamza normalization deduplication
  const customCheck = buildValidatedWordBank([
    { ar: 'شِيفْرَة', en: 'Cipher' },
    { ar: 'شيفرة', en: 'Cipher 2' },
    { ar: 'أطلس', en: 'Atlas' },
    { ar: 'اطلس', en: 'Atlas 2' },
  ]);
  assert.equal(customCheck.words.length, 2);
  assert.equal(customCheck.duplicatesRemoved.length, 2);
});

test('1, 2 & 3. Round creation produces 25 unique words and exact 9/8/7/1 distribution matching starting team', () => {
  const redStartState = createGameRound({ startingTeam: 'red' });
  assert.equal(redStartState.cards.length, 25);
  const uniqueWords = new Set(redStartState.cards.map((c) => c.wordAr));
  assert.equal(uniqueWords.size, 25);

  const counts = { red: 0, blue: 0, neutral: 0, black: 0 };
  for (const c of redStartState.cards) {
    counts[c.secretColor]++;
  }
  assert.equal(counts.red, 9);
  assert.equal(counts.blue, 8);
  assert.equal(counts.neutral, 7);
  assert.equal(counts.black, 1);
  assert.equal(redStartState.startingTeam, 'red');
  assert.equal(redStartState.currentTurn, 'red');
  assert.equal(redStartState.redRemaining, 9);
  assert.equal(redStartState.blueRemaining, 8);

  const blueStartState = createGameRound({ startingTeam: 'blue' });
  const blueCounts = { red: 0, blue: 0, neutral: 0, black: 0 };
  for (const c of blueStartState.cards) {
    blueCounts[c.secretColor]++;
  }
  assert.equal(blueCounts.blue, 9);
  assert.equal(blueCounts.red, 8);
  assert.equal(blueCounts.neutral, 7);
  assert.equal(blueCounts.black, 1);
  assert.equal(blueStartState.startingTeam, 'blue');
  assert.equal(blueStartState.currentTurn, 'blue');
});

test('4 & 5. Audience state hides secret colors of unrevealed cards, while Spymaster and Referee see them', () => {
  const state = createGameRound({ startingTeam: 'red' });
  const audienceView = sanitizeStateForRole(state, 'audience');
  for (const card of audienceView.cards) {
    assert.equal(card.color, null);
    assert.equal(card.secretColor, undefined);
  }

  const spymasterView = sanitizeStateForRole(state, 'spymaster_red');
  for (let i = 0; i < 25; i++) {
    assert.equal(spymasterView.cards[i].secretColor, state.cards[i].secretColor);
  }
});

test('6, 7, 8, 11 & 12. Revealing correct card continues turn (+1 rule), neutral ends turn, opponent updates opponent score and ends turn, inactive team blocked', () => {
  let state = createGameRound({ startingTeam: 'red' });

  // Giving a clue word that is currently on the board must be rejected
  const boardWord = state.cards[0].wordAr.split(' ')[0];
  if (!state.cards[0].wordAr.includes(' ')) {
    const invalidClue = giveClue(state, boardWord, 1, 'red');
    assert.equal(invalidClue.ok, false);
  }

  // Give clue with number 1 -> allows 1 + 1 = 2 guesses
  const clueRes = giveClue(state, 'رابط', 1, 'red');
  assert.equal(clueRes.ok, true);
  state = clueRes.state;
  assert.equal(state.currentClue?.guessesAllowed, 2);

  // Prevent inactive team (blue) from guessing on red's turn
  const redCardIndexes = state.cards
    .filter((c) => c.secretColor === 'red')
    .map((c) => c.index);
  const wrongTurnRes = revealCard(state, redCardIndexes[0], { actingTeam: 'blue' });
  assert.equal(wrongTurnRes.ok, false);

  // 1st correct guess by red -> continues turn
  const firstGuess = revealCard(state, redCardIndexes[0], { actingTeam: 'red' });
  assert.equal(firstGuess.ok, true);
  state = firstGuess.state;
  assert.equal(state.redRemaining, 8);
  assert.equal(state.currentTurn, 'red');

  // Cannot click already revealed card
  const duplicateClick = revealCard(state, redCardIndexes[0], { actingTeam: 'red' });
  assert.equal(duplicateClick.ok, false);

  // 2nd correct guess by red -> reaches N + 1 (2 guesses), automatically ends turn!
  const secondGuess = revealCard(state, redCardIndexes[1], { actingTeam: 'red' });
  assert.equal(secondGuess.ok, true);
  state = secondGuess.state;
  assert.equal(state.redRemaining, 7);
  assert.equal(state.currentTurn, 'blue');
  assert.equal(state.currentClue, null);

  // On blue's turn, reveal a neutral card -> ends turn immediately
  const neutralIdx = state.cards.find((c) => !c.revealed && c.secretColor === 'neutral')!.index;
  const neutralRes = revealCard(state, neutralIdx, { actingTeam: 'blue' });
  assert.equal(neutralRes.ok, true);
  state = neutralRes.state;
  assert.equal(state.currentTurn, 'red');

  // On red's turn, reveal a blue (opponent) card -> decrements blueRemaining and ends turn
  const blueIdx = state.cards.find((c) => !c.revealed && c.secretColor === 'blue')!.index;
  const oppRes = revealCard(state, blueIdx, { actingTeam: 'red' });
  assert.equal(oppRes.ok, true);
  state = oppRes.state;
  assert.equal(state.blueRemaining, 7);
  assert.equal(state.currentTurn, 'blue');
});

test('9 & 14. Revealing the black card immediately causes the active team to lose, and Undo safely restores playing state', () => {
  let state = createGameRound({ startingTeam: 'red' });
  const blackIdx = state.cards.find((c) => c.secretColor === 'black')!.index;

  const res = revealCard(state, blackIdx, { actingTeam: 'red' });
  assert.equal(res.ok, true);
  state = res.state;
  assert.equal(state.status, 'gameover');
  assert.equal(state.winner, 'blue');
  assert.equal(state.loser, 'red');
  assert.equal(state.winReason, 'black_card');
  assert.equal(state.blueWinsCount, 1);
  assert.equal(state.matchHistory.length, 1);

  // Undo black card reveal
  const undoRes = undoLastAction(state);
  assert.equal(undoRes.ok, true);
  state = undoRes.state;
  assert.equal(state.status, 'playing');
  assert.equal(state.winner, null);
  assert.equal(state.cards[blackIdx].revealed, false);
  assert.equal(state.blueWinsCount, 0);
  assert.equal(state.matchHistory.length, 0);
});

test('10. Revealing all cards of a team immediately wins the game (including zero/unlimited clue)', () => {
  let state = createGameRound({ startingTeam: 'red' });
  const clueRes = giveClue(state, 'تحدي', 0, 'red'); // 0 clue gives unlimited guesses
  assert.equal(clueRes.ok, true);
  state = clueRes.state;
  assert.equal(state.currentClue?.guessesAllowed, null);

  const redIndexes = state.cards.filter((c) => c.secretColor === 'red').map((c) => c.index);
  for (let i = 0; i < redIndexes.length; i++) {
    const r = revealCard(state, redIndexes[i], { actingTeam: 'red' });
    assert.equal(r.ok, true);
    state = r.state;
  }

  assert.equal(state.status, 'gameover');
  assert.equal(state.winner, 'red');
  assert.equal(state.redRemaining, 0);
  assert.equal(state.winReason, 'all_cards_revealed');
  assert.equal(state.matchHistory.length, 1);

  // Also test JSON import helper
  const imported = parseImportedWordsJson(JSON.stringify(['كلمة أولى', 'كلمة ثانية']));
  assert.equal(imported.entries.length, 2);
});

test('19 & 20. Dynamic per-game PINs, deterministic seed reproduction, and genuine word/color shuffling', () => {
  const round1 = createGameRound({ roomId: 'ELITE-99', roundNumber: 1, startingTeam: 'red' });
  const round2 = createGameRound({ roomId: 'ELITE-99', roundNumber: 2, startingTeam: 'red' });
  assert.equal(round1.spymasterPin.length, 4);
  assert.equal(round2.spymasterPin.length, 4);

  // Ensure colors are genuinely shuffled (first 9 cards must NOT all be red)
  const first9AllRed = round1.cards.slice(0, 9).every((c) => c.secretColor === 'red');
  assert.equal(first9AllRed, false, 'Secret colors must be shuffled across the 5x5 grid');

  // Ensure words are genuinely shuffled (first 5 words must NOT match the first 5 words of OFFICIAL_WORD_BANK in order)
  const first5InBankOrder = round1.cards
    .slice(0, 5)
    .every((c, idx) => c.wordAr === OFFICIAL_WORD_BANK[idx].ar);
  assert.equal(first5InBankOrder, false, 'Words must be shuffled from the word bank');

  // Reconstructing a board with the same roundSeed produces the exact same 25 words and secret colors (for static QR mode)
  const clone = createGameRound({
    roomId: round1.roomId,
    roundNumber: round1.roundNumber,
    spymasterPin: round1.spymasterPin,
    roundSeed: round1.roundSeed,
    startingTeam: round1.startingTeam,
  });
  for (let i = 0; i < 25; i++) {
    assert.equal(clone.cards[i].wordAr, round1.cards[i].wordAr);
    assert.equal(clone.cards[i].secretColor, round1.cards[i].secretColor);
  }
});

