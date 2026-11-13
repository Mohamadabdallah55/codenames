import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_MODES_CATALOG,
  applyInvalidCluePenalty,
  computeTournamentStandings,
  createGameRound,
  endTurn,
  generateDynamicPin,
  giveClue,
  restartCurrentRound,
  revealCard,
  sanitizeStateForRole,
  shuffleArray,
  undoLastAction,
} from './rules';
import {
  OFFICIAL_WORD_BANK,
  WORD_PACKS_CATALOG,
  filterWordPoolByCriteria,
  normalizeArabicWord,
} from '../data/words';

process.env.NODE_ENV = 'test';

test('Word Bank & Packs: contains 600+ unique Arabic words with semantic clusters and pack metadata', () => {
  assert.ok(
    OFFICIAL_WORD_BANK.length >= 600,
    `Expected >= 600 words, got ${OFFICIAL_WORD_BANK.length}`
  );
  assert.equal(WORD_PACKS_CATALOG.length, 8);

  const normalizedSet = new Set(OFFICIAL_WORD_BANK.map((w) => normalizeArabicWord(w.ar)));
  assert.equal(normalizedSet.size, OFFICIAL_WORD_BANK.length, 'Zero duplicate normalized words');

  // Every word has relatedWords and packIds
  for (const w of OFFICIAL_WORD_BANK) {
    assert.ok(w.ar.length >= 2);
    assert.ok(Array.isArray(w.packIds) && w.packIds.length >= 1);
    assert.ok(Array.isArray(w.relatedWords));
  }

  // Filtering by junior pack returns kid-appropriate easy words
  const juniorPool = filterWordPoolByCriteria(OFFICIAL_WORD_BANK, {
    packIds: ['junior_kids'],
    ageGroup: 'junior',
    difficulty: 'easy',
  });
  assert.ok(juniorPool.length >= 80, `Expected >= 80 junior words, got ${juniorPool.length}`);
});

test('Security: sanitizeStateForRole strips secretColor, roundSeed, and PINs from audience view', () => {
  const round = createGameRound({ roomId: 'SEC-TEST', startingTeam: 'red' });
  const audienceState = sanitizeStateForRole(round, 'audience');

  assert.equal(audienceState.roundSeed, undefined, 'roundSeed must NEVER be sent to audience');
  assert.equal(audienceState.spymasterPin, undefined, 'spymasterPin must NEVER be sent to audience');
  assert.equal(audienceState.refereePin, undefined, 'refereePin must NEVER be sent to audience');

  // Verify eventLog does not leak PINs
  for (const evt of audienceState.eventLog) {
    assert.equal(evt.message.includes(round.spymasterPin), false, 'eventLog must not contain spymasterPin');
    assert.equal(evt.message.includes(round.refereePin), false, 'eventLog must not contain refereePin');
  }

  // Verify unrevealed cards have zero color information
  for (const card of audienceState.cards) {
    assert.equal(card.revealed, false);
    assert.equal(card.color, null);
    assert.equal(card.secretColor, undefined);
  }

  // Spymaster receives secretColor and spymasterPin, but NOT refereePin
  const spyState = sanitizeStateForRole(round, 'spymaster_red');
  assert.equal(spyState.spymasterPin, round.spymasterPin);
  assert.equal(spyState.refereePin, undefined);
  assert.ok(spyState.cards.every((c) => typeof c.secretColor === 'string'));
});

test('Security: generateDynamicPin never produces legacy hardcoded PINs 1446 or 2026', () => {
  for (let i = 0; i < 200; i++) {
    const pin = generateDynamicPin();
    assert.notEqual(pin, '1446');
    assert.notEqual(pin, '2026');
    assert.equal(pin.length, 4);
  }
});

test('Game Modes: all 6 independent modes initialize with correct board dimensions and card distributions', () => {
  // 1. Classic Mode (5x5 = 25 cards: 9/8/7/1)
  const classic = createGameRound({ gameMode: 'classic', startingTeam: 'red' });
  assert.equal(classic.boardSize, 25);
  assert.equal(classic.gridCols, 5);
  assert.equal(classic.cards.length, 25);
  assert.equal(classic.cards.filter((c) => c.secretColor === 'red').length, 9);
  assert.equal(classic.cards.filter((c) => c.secretColor === 'blue').length, 8);
  assert.equal(classic.cards.filter((c) => c.secretColor === 'neutral').length, 7);
  assert.equal(classic.cards.filter((c) => c.secretColor === 'black').length, 1);

  // 2. Quick Match Mode (4x4 = 16 cards: 6/5/4/1)
  const quick = createGameRound({ gameMode: 'quick', startingTeam: 'blue' });
  assert.equal(quick.boardSize, 16);
  assert.equal(quick.gridCols, 4);
  assert.equal(quick.cards.length, 16);
  assert.equal(quick.cards.filter((c) => c.secretColor === 'blue').length, 6);
  assert.equal(quick.cards.filter((c) => c.secretColor === 'red').length, 5);
  assert.equal(quick.cards.filter((c) => c.secretColor === 'neutral').length, 4);
  assert.equal(quick.cards.filter((c) => c.secretColor === 'black').length, 1);
  assert.equal(quick.settings.timerDurationSeconds, 60);

  // 3. Junior Mode (4x4 = 16 cards with icons and easy words)
  const junior = createGameRound({ gameMode: 'junior', startingTeam: 'red' });
  assert.equal(junior.boardSize, 16);
  assert.equal(junior.gridCols, 4);
  assert.ok(junior.cards.every((c) => Boolean(c.iconType)));

  // 4. Family Mode (5x5 = 25 cards, 120s timer)
  const family = createGameRound({ gameMode: 'family', startingTeam: 'red' });
  assert.equal(family.boardSize, 25);
  assert.equal(family.settings.timerDurationSeconds, 120);

  // 5. Cooperative Mode (5x5 = 25 cards: 15 target red, 0 blue, 9 neutral, 1 black, 9 turns)
  const coop = createGameRound({ gameMode: 'cooperative' });
  assert.equal(coop.boardSize, 25);
  assert.equal(coop.redTotal, 15);
  assert.equal(coop.blueTotal, 0);
  assert.equal(coop.coopTurnsRemaining, 9);
  assert.equal(coop.cards.filter((c) => c.secretColor === 'red').length, 15);
  assert.equal(coop.cards.filter((c) => c.secretColor === 'neutral').length, 9);
  assert.equal(coop.cards.filter((c) => c.secretColor === 'black').length, 1);

  // 6. Tournament Mode (5x5 = 25 cards, 90s timer, direct screen click enabled)
  const tour = createGameRound({ gameMode: 'tournament', startingTeam: 'red' });
  assert.equal(tour.boardSize, 25);
  assert.equal(tour.settings.allowAudienceClickInLocalMode, true);
  assert.equal(Object.keys(GAME_MODES_CATALOG).length, 6);
});

test('Cooperative Mode: revealing neutral cards or ending turns consumes turn budget and triggers out_of_turns loss at 0', () => {
  let state = createGameRound({ gameMode: 'cooperative' });
  assert.equal(state.coopTurnsRemaining, 9);

  // Reveal 1 target card -> continues turn without losing coopTurnsRemaining
  const targetIdx = state.cards.findIndex((c) => c.secretColor === 'red');
  const r1 = revealCard(state, targetIdx, { forceByReferee: true });
  assert.equal(r1.ok, true);
  state = r1.state;
  assert.equal(state.redRemaining, 14);
  assert.equal(state.coopTurnsRemaining, 9);

  // Exhaust 9 turns via endTurn
  for (let t = 0; t < 9; t++) {
    const ended = endTurn(state);
    assert.equal(ended.ok, true);
    state = ended.state;
  }

  assert.equal(state.coopTurnsRemaining, 0);
  assert.equal(state.status, 'gameover');
  assert.equal(state.winner, 'blue');
  assert.equal(state.winReason, 'out_of_turns');
});

test('Simultaneous / duplicate card reveal & Undo restores full state including gameover revert', () => {
  let state = createGameRound({ gameMode: 'classic', startingTeam: 'red' });
  const clueRes = giveClue(state, 'شعاع', 2, 'red');
  assert.equal(clueRes.ok, true);
  state = clueRes.state;
  assert.equal(state.activeBroadcast?.type, 'clue_declared');

  const redCardIdx = state.cards.findIndex((c) => c.secretColor === 'red');
  const rev1 = revealCard(state, redCardIdx);
  assert.equal(rev1.ok, true);
  state = rev1.state;

  // Attempting to reveal the same card again (e.g. concurrent tap) fails cleanly
  const revDuplicate = revealCard(state, redCardIdx);
  assert.equal(revDuplicate.ok, false);

  // Reveal black card -> gameover
  const blackIdx = state.cards.findIndex((c) => c.secretColor === 'black');
  const revBlack = revealCard(state, blackIdx);
  assert.equal(revBlack.ok, true);
  state = revBlack.state;
  assert.equal(state.status, 'gameover');
  assert.equal(state.winner, 'blue');
  assert.equal(state.blueWinsCount, 1);

  // Undo reverts gameover and decrements blueWinsCount back to 0
  const undone = undoLastAction(state);
  assert.equal(undone.ok, true);
  state = undone.state;
  assert.equal(state.status, 'playing');
  assert.equal(state.winner, null);
  assert.equal(state.blueWinsCount, 0);
  assert.equal(state.cards[blackIdx].revealed, false);
});

test('Server Authorization & Role Enforcement: rejects unauthorized actions and revokes sessions on PIN rotation', async () => {
  const { executeRoomAction, resolveAuthorizedRole } = await import('../../server');
  const roomId = 'AUTH-TEST-ROOM';

  // Audience cannot give a clue
  const unauthClue = executeRoomAction(roomId, {
    action: 'give_clue',
    role: 'audience',
    word: 'اختبار',
    count: 2,
  });
  assert.equal(unauthClue.ok, false);
  assert.equal(unauthClue.statusCode, 403);

  // Audience cannot reveal a card when allowAudienceClickInLocalMode is locked (false) by the Referee
  const { getOrCreateRoomForTest } = await import('../../server');
  const room = getOrCreateRoomForTest(roomId);
  room.settings.allowAudienceClickInLocalMode = false;

  const unauthReveal = executeRoomAction(roomId, {
    action: 'reveal_card',
    role: 'audience',
    cardIndex: 0,
  });
  assert.equal(unauthReveal.ok, false);
  assert.equal(unauthReveal.statusCode, 403);

  // Audience or fake referee with legacy PIN '1446' or '2026' is strictly rejected
  const fakePinAttempt = executeRoomAction(roomId, {
    action: 'new_round',
    role: 'referee',
    pin: '1446',
  });
  assert.equal(fakePinAttempt.ok, false);
  assert.equal(fakePinAttempt.statusCode, 403);

  const fakeSpymasterAttempt = executeRoomAction(roomId, {
    action: 'give_clue',
    role: 'spymaster_red',
    pin: '2026',
    word: 'اختبار',
    count: 2,
  });
  assert.equal(fakeSpymasterAttempt.ok, false);
  assert.equal(fakeSpymasterAttempt.statusCode, 403);
});

test('Tournament Standings & Penalty Logic work accurately', () => {
  let state = createGameRound({ gameMode: 'tournament', startingTeam: 'red' });
  const penRes = applyInvalidCluePenalty(state);
  assert.equal(penRes.ok, true);
  assert.equal(penRes.state.currentTurn, 'blue');
  assert.equal(penRes.state.blueRemaining, state.blueRemaining - 1);

  const restarted = restartCurrentRound(penRes.state);
  assert.equal(restarted.turnsCount, 1);
  assert.equal(restarted.blueRemaining, state.blueTotal);

  const standings = computeTournamentStandings([
    {
      id: 'm1',
      roomId: 'R1',
      gameMode: 'tournament',
      roundNumber: 1,
      redTeamCode: 'A',
      redTeamName: 'الصقور',
      blueTeamCode: 'B',
      blueTeamName: 'الفرسان',
      startingTeam: 'red',
      winner: 'red',
      loser: 'blue',
      winReason: 'all_cards_revealed',
      winReasonAr: 'كشف جميع البطاقات',
      turnsCount: 5,
      durationSeconds: 180,
      completedAt: new Date().toISOString(),
      redRemaining: 0,
      blueRemaining: 3,
    },
  ]);
  assert.equal(standings.length, 2);
  assert.equal(standings[0].teamName, 'الصقور');
  assert.equal(standings[0].points, 3);
  assert.equal(standings[0].wins, 1);
  assert.equal(standings[1].teamName, 'الفرسان');
  assert.equal(standings[1].points, 0);
});

test('shuffleArray mixes elements properly', () => {
  const arr = Array.from({ length: 25 }, (_, i) => i);
  const shuffled = shuffleArray(arr);
  assert.equal(shuffled.length, 25);
  assert.notDeepEqual(shuffled, arr);
});
