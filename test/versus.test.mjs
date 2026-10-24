// test/versus.test.mjs — The split screen: two pilots at one keyboard, each
// flying their own run of the game in half the grid.
//
// Browser only, so nothing here pairs with test/parity.test.mjs - a terminal has
// one grid and one key reader, and the mode is the browser shell's own. What that
// buys, and what this file is mostly about, is that the engine is untouched: a
// round is two ordinary Game instances, so every rule a pilot flies under is
// already covered by the rest of the suite and the only new things to check are
// the four seams the shell adds around them.
//
// The seams are the keyboard split in two, the one global RNG shared by two runs
// that must not share a draw, the grid split into two halves and composed back,
// and the round's own reading of when it is over and who took it. All four are
// above the `// ===== Canvas Setup & Sizing =====` marker in index.html, which is
// why they are there: the frame loop that drives them is not reachable from here,
// and nothing in it decides anything.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  REPO_ROOT, loadBrowserEngine, fakeStorage, rowText, screenText,
  screenCells, changedCells, FRAME,
} from './helpers.mjs';

const browser = loadBrowserEngine(fakeStorage());

/** A grid wide enough for a round, with room to spare in both directions. */
const WIDE = { cols: 100, rows: 30 };

/** The layout WIDE resolves to, which most of the cases below are flown on. */
const wideLayout = () => browser.versusLayout(WIDE.cols, WIDE.rows);

/** A round on WIDE, opened on a named seed so a case can be re-read. */
function round(seed = 4242) {
  return new browser.VersusRound(seed, wideLayout());
}

/** Step a round a number of frames with one set of keys held throughout. */
function fly(r, frames, keys = {}, pressed = {}) {
  for (let i = 0; i < frames; i++) r.step(FRAME, keys, pressed);
}

/** A round's full grid, rendered. */
function renderRound(r, cols = WIDE.cols, rows = WIDE.rows) {
  const screen = new browser.ScreenBuffer(cols, rows);
  r.render(screen);
  return screen;
}

// ----- The grid, split in two -----

test('versus: the two halves and the seam tile the grid exactly', () => {
  // The composition is a blit per half at an offset plus a seam between them, so
  // a layout whose three spans do not add up to the grid leaves a column of the
  // canvas painted by nothing - or has one half writing over the other.
  for (let cols = 60; cols <= 205; cols++) {
    const layout = browser.versusLayout(cols, 30);
    assert.equal(
      layout.half * 2 + layout.seam, cols,
      `${cols} columns: the halves and the seam do not tile the grid`,
    );
    assert.equal(layout.leftX, 0, `${cols} columns: the left half starts at 0`);
    assert.equal(layout.seamX, layout.half, `${cols} columns: the seam follows the left half`);
    assert.equal(
      layout.rightX, layout.half + layout.seam,
      `${cols} columns: the right half follows the seam`,
    );
  }
});

test('versus: the odd column of an odd grid goes to the seam, never to a pilot', () => {
  // The halves being equal to the column is the whole fairness of the mode: a
  // column of difference is a column of tunnel one pilot can see and the other
  // cannot, in a round whose result is meant to be about how the two flew.
  for (const cols of [81, 99, 101, 137, 205]) {
    const layout = browser.versusLayout(cols, 30);
    assert.equal(cols % 2, 1, `${cols} is the odd case this is about`);
    assert.equal(layout.seam, 1, `${cols} columns: an odd grid needs no extra seam`);
  }
  // An even grid is the one that has a column over, because the seam's minimum
  // is odd. It goes to the seam rather than to the left half.
  for (const cols of [80, 100, 136, 204]) {
    const layout = browser.versusLayout(cols, 30);
    assert.equal(layout.seam, 2, `${cols} columns: the spare column widens the seam`);
  }
});

test('versus: a round opens on a half of its own floor and a screen of the game\'s', () => {
  const need = browser.VERSUS_MIN_HALF_WIDTH * 2 + browser.VERSUS_SEAM_COLS;

  assert.ok(browser.versusLayout(need, browser.MIN_HEIGHT).fits, `${need} columns is the floor`);
  assert.ok(
    !browser.versusLayout(need - 1, browser.MIN_HEIGHT).fits,
    'a column under it does not open a round',
  );
  assert.ok(
    !browser.versusLayout(need, browser.MIN_HEIGHT - 1).fits,
    'and neither does a row under the game\'s own floor',
  );

  // Rows are shared whole by both halves, so a round asks for the height the
  // game asks for and no more. A grid that fits the solo game but not a round is
  // therefore always a width problem.
  const solo = browser.versusLayout(browser.MIN_WIDTH, browser.MIN_HEIGHT);
  assert.ok(!solo.fits, 'the documented minimum screen is too narrow for two halves');
  assert.equal(solo.rows, browser.MIN_HEIGHT, 'but it has the rows a round needs');
});

test('versus: a buffer blits into another at an offset, and is clipped not wrapped', () => {
  const src = new browser.ScreenBuffer(3, 2);
  src.putString(0, 0, 'abc', browser.C.BRIGHT_RED, browser.C.DARK_BLUE);
  src.putString(0, 1, 'def', browser.C.BRIGHT_GREEN, browser.C.BLACK);

  const into = new browser.ScreenBuffer(8, 3);
  into.clear(browser.C.BLACK);
  into.blit(src, 2, 1);

  assert.equal(rowText(into, 0), '        ', 'the row above is untouched');
  assert.equal(rowText(into, 1), '  abc   ', 'the first row lands at the offset');
  assert.equal(rowText(into, 2), '  def   ', 'and the second under it');

  // The colours travel with the characters, which is the half of this the
  // character reading cannot see.
  const at = (x, y) => y * into.width + x;
  assert.equal(into.fg[at(2, 1)], browser.C.BRIGHT_RED, 'the foreground is carried');
  assert.equal(into.bg[at(2, 1)], browser.C.DARK_BLUE, 'and so is the background');

  // Past the right edge: cropped at the edge, and nothing appears on the row
  // below, which is what writing the arrays directly would have produced.
  const edge = new browser.ScreenBuffer(8, 3);
  edge.clear(browser.C.BLACK);
  edge.blit(src, 6, 0);
  assert.equal(rowText(edge, 0), '      ab', 'the overhang is cropped');
  assert.equal(rowText(edge, 1), '      de', 'and the second row with it');
  assert.equal(rowText(edge, 2), '        ', 'nothing wrapped into the row below');
});

// ----- The keyboard, split in two -----

test('versus: the two seats share no key', () => {
  // Two hands hold a turn at once, so a key in both maps would steer both ships
  // and the round could not be flown at all.
  const [one, two] = browser.VERSUS_BINDINGS;
  const mine = new Set(Object.values(one));
  for (const key of Object.values(two)) {
    assert.ok(!mine.has(key), `${key} is in both seats`);
  }

  // And both seats answer the same set of controls, so neither pilot is flying a
  // smaller game than the other.
  assert.deepEqual(Object.keys(two).sort(), Object.keys(one).sort());

  // Pilot 1's seat is the solo game's own, which is what lets a player who has
  // flown alone sit down and fly half a round without learning anything.
  assert.deepEqual(one, { W: 'W', A: 'A', S: 'S', D: 'D', Q: 'Q', E: 'E', F: 'F', SPACE: 'SPACE' });
  // And pilot 2's is the pair the roadmap item named, with the rest of the
  // controls arranged around it the way pilot 1's are around WASD.
  assert.equal(two.W, 'I');
  assert.equal(two.A, 'J');
  assert.equal(two.S, 'K');
  assert.equal(two.D, 'L');
  assert.equal(two.SPACE, 'ENTER');
});

test('versus: every key a seat names is one the page can actually produce', () => {
  // The one coupling in a round that the rest of this file cannot reach.
  // VERSUS_BINDINGS is above the canvas marker and mapKey is below it, so the
  // seats name keys while the page's own listener decides which physical codes
  // become names at all. A seat naming a key mapKey never returns is a control
  // that is silently dead: pilot 2's boost sitting on a SEMICOLON the page
  // drops would leave every case above passing while half the round could not
  // be flown. Read off the source, as the shell tests read it, because the
  // harness stops before the listener is defined.
  const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
  const from = html.indexOf('function mapKey(e){');
  assert.ok(from > 0, 'index.html should define mapKey');
  const to = html.indexOf('\n}', from);
  assert.ok(to > from, 'mapKey should close at the start of a line');
  const body = html.slice(from, to);

  const produced = new Set([...body.matchAll(/return'([A-Z_0-9]+)'/g)].map((m) => m[1]));
  const named = [
    ...browser.VERSUS_BINDINGS.flatMap((binding) => Object.values(binding)),
    ...browser.VERSUS_SHARED_KEYS,
  ];
  for (const key of named) {
    assert.ok(produced.has(key), `no physical key on the page maps to ${key}`);
  }
  // And the key the title screen's own label names, which opens a round.
  assert.ok(produced.has('V'), 'the page should map the key the label names');
});

test('versus: a pilot is handed every name the engine reads and nothing else', () => {
  const [one, two] = browser.VERSUS_BINDINGS;
  const names = [...Object.keys(one), ...browser.VERSUS_SHARED_KEYS].sort();

  // Nothing held: every name is answered, and answered false. A name left off
  // the map reads as undefined, which is falsy and therefore harmless - but a
  // name left on it from somewhere else would be read by the engine as this
  // pilot's own control, which is the fault worth pinning.
  const quiet = browser.pilotKeys(one, {});
  assert.deepEqual(Object.keys(quiet).sort(), names);
  assert.deepEqual(Object.values(quiet), Object.values(quiet).map(() => false));

  // Pilot 2's own keys held: pilot 2 sees them under the engine's names, and
  // pilot 1 sees nothing at all.
  const held = { I: true, J: true, ENTER: true, SEMICOLON: true };
  assert.deepEqual(browser.pilotKeys(two, held), {
    W: true, A: true, S: false, D: false, Q: false, E: false, F: true, SPACE: true,
    P: false, M: false,
  });
  for (const [name, on] of Object.entries(browser.pilotKeys(one, held))) {
    assert.equal(on, false, `pilot 1 should not see ${name} from pilot 2's keys`);
  }
});

test('versus: pause and mute reach both pilots from either hand', () => {
  for (const binding of browser.VERSUS_BINDINGS) {
    const seen = browser.pilotKeys(binding, { P: true, M: true });
    assert.equal(seen.P, true, 'the pause key reaches this pilot');
    assert.equal(seen.M, true, 'and so does the mute key');
  }
});

test('versus: the arrow keys and SHIFT steer nobody in a round', () => {
  // They are pilot 1's alternates in a solo run. In a round they belong to no
  // particular pilot, and a control two players cannot agree the owner of is
  // worse than no control.
  const loose = { LEFT: true, RIGHT: true, UP: true, DOWN: true, SHIFT: true };
  for (let i = 0; i < browser.VERSUS_BINDINGS.length; i++) {
    const seen = browser.pilotKeys(browser.VERSUS_BINDINGS[i], loose);
    for (const [name, on] of Object.entries(seen)) {
      assert.equal(on, false, `pilot ${i + 1} should not see ${name}`);
    }
  }
});

// ----- One source of randomness, two runs -----

test('versus: withRng points the engine at a stream and puts back what it found', () => {
  const was = browser.RNG.next;
  const stream = browser.seededRandom(7);

  const drawn = browser.withRng(stream, () => browser.RNG.next());
  assert.equal(browser.RNG.next, was, 'the global is back where it was');
  assert.equal(drawn, browser.seededRandom(7)(), 'and the body drew from the stream');

  // A throw inside the body is the case the finally is for: without it the whole
  // page would go on drawing from one pilot's stream, which is a seeded game
  // wearing an ordinary one's face.
  assert.throws(() => browser.withRng(stream, () => { throw new Error('boom'); }), /boom/);
  assert.equal(browser.RNG.next, was, 'and it is back after a throw too');
});

test('versus: both pilots open on the same field, from the one seed', () => {
  // This is what "the same tunnel" means. The field startGame lays down is
  // placed from the same draws in both halves, so the two pilots launch into the
  // same rocks at the same depths and the round is about how each flew it.
  const r = round(31337);
  const [one, two] = r.states();

  assert.ok(one.obstacles.length > 0, 'a round opens on a field');
  assert.deepEqual(two.obstacles, one.obstacles, 'the same obstacles, placed the same way');
  assert.deepEqual(two.orbs, one.orbs, 'and the same orbs');

  // Both streams are at the same point afterwards, which is the property the
  // field equality rests on rather than a second reading of it.
  assert.equal(r.streams[1](), r.streams[0](), 'the two streams are in step at the open');
});

test('versus: two rounds are two different tunnels', () => {
  // A seed a player could learn would hand the rematch to whoever remembered
  // where the first rock was, so the seed is drawn fresh for every round.
  const first = round(1);
  const second = round(2);
  assert.notDeepEqual(second.states()[0].obstacles, first.states()[0].obstacles);

  // And the drawing of it is the page's own randomness rather than the engine's,
  // so a round opened on a page whose stream had been pinned is still a new
  // round. Checked as a spread of values rather than as one: the pinning this
  // guards against would make every seed identical.
  const was = browser.RNG.next;
  browser.seedRng(99);
  const seeds = new Set([
    browser.versusSeed(), browser.versusSeed(), browser.versusSeed(),
    browser.versusSeed(), browser.versusSeed(),
  ]);
  browser.RNG.next = was;
  assert.ok(seeds.size > 1, 'a pinned page still draws a fresh seed for each round');
});

test('versus: a round leaves the page\'s own source of randomness where it was', () => {
  const was = browser.RNG.next;
  const r = round();
  fly(r, 30, { A: true, L: true }, { SPACE: true });
  renderRound(r);
  assert.equal(browser.RNG.next, was, 'opening, flying and drawing a round all put it back');
});

test('versus: a pilot\'s stream is their own', () => {
  // Stepped off one shared stream the two runs would take alternate numbers out
  // of a single sequence: neither would be flying the seeded field, and the seed
  // would pin the pair rather than either pilot.
  const r = round(555);
  assert.notEqual(r.streams[0], r.streams[1], 'a stream each');

  const mine = r.streams[0]();
  const alsoMine = r.streams[0]();
  const theirs = r.streams[1]();
  assert.notEqual(alsoMine, mine, 'a draw moves the stream it was taken from');
  assert.equal(theirs, mine, 'and leaves the other where it was');
});

// ----- Stepping a round -----

test('versus: each pilot answers their own keys and nobody else\'s', () => {
  const r = round();
  const [one, two] = r.states();

  // Pilot 1 pushed left, pilot 2 pushed right, on one keyboard.
  fly(r, 20, { A: true, L: true });
  assert.ok(one.shipX < 0, 'pilot 1 steered left on A');
  assert.ok(two.shipX > 0, 'pilot 2 steered right on L');

  // Pilot 1's trigger alone: pilot 1 has bolts in the air and pilot 2 has none.
  const quiet = round();
  quiet.step(FRAME, { SPACE: true }, { SPACE: true });
  assert.ok(quiet.states()[0].bullets.length > 0, 'pilot 1 fired on SPACE');
  assert.equal(quiet.states()[1].bullets.length, 0, 'and pilot 2 did not');

  // Pilot 2's trigger alone, which is the same key the shell reads as a launch
  // everywhere else.
  const theirs = round();
  theirs.step(FRAME, { ENTER: true }, { ENTER: true });
  assert.equal(theirs.states()[0].bullets.length, 0, 'pilot 1 did not fire on ENTER');
  assert.ok(theirs.states()[1].bullets.length > 0, 'and pilot 2 did');
});

test('versus: a pilot who is out is not stepped, and stops making a noise', () => {
  const r = round();
  const [one, two] = r.states();

  one.score = 1234;
  one.shield = 0;
  r.pilots[0].endGame();
  const frozen = { x: one.shipX, y: one.shipY, distance: one.distance };
  const noise = one.sounds.length;

  fly(r, 20, { A: true, J: true });

  assert.equal(one.shipX, frozen.x, 'a wrecked pilot\'s ship holds its place');
  assert.equal(one.shipY, frozen.y, 'in both axes');
  assert.equal(one.distance, frozen.distance, 'and travels no further');
  assert.ok(two.distance > frozen.distance, 'while the pilot still flying flies on');

  // The cue queue is what update normally drains, so a pilot nobody steps would
  // otherwise be found holding the damage cue they died on - and it would play
  // again on every frame of the round that followed.
  assert.ok(noise >= 0, 'whatever the wreck queued');
  assert.equal(one.sounds.length, 0, 'the queue of a pilot who is out is emptied');
});

test('versus: the mute key still answers a pilot who is out', () => {
  // The one thing a pilot nobody steps still does. M is the round's key and
  // update is what normally answers it, so a pilot wrecked while the round was
  // muted would hold a muted flag versusAudioState reads as an or over the pair,
  // and nothing either player pressed afterwards could lift it.
  const r = round();
  const [one, two] = r.states();
  const heard = () => browser.versusAudioState(one, two).muted;

  r.step(FRAME, {}, { M: true });
  assert.equal(heard(), true, 'the round is muted from either hand');

  one.shield = 0;
  r.pilots[0].endGame();
  r.step(FRAME, {}, {});
  assert.equal(heard(), true, 'and stays muted with a pilot down');

  r.step(FRAME, {}, { M: true });
  assert.equal(one.muted, false, 'the wrecked pilot answers the key too');
  assert.equal(two.muted, false, 'as does the one still flying');
  assert.equal(heard(), false, 'so the survivor can bring the sound back');

  // And on the result panel, which is the one state nothing at all is stepped
  // in: without the key being answered there the round would end silent for good
  // whenever the last frame it was muted on was the frame it ended.
  r.step(FRAME, {}, { M: true });
  two.shield = 0;
  r.pilots[1].endGame();
  assert.equal(r.standing().over, true, 'both pilots are out');
  assert.equal(heard(), true, 'muted as the round ended');

  r.step(FRAME, {}, { M: true });
  assert.equal(heard(), false, 'and the key still lifts it');
});

test('versus: a round keeps one stored best, and files no lower score over a higher one', () => {
  // Each Game reads the stored figure when it is built and endGame weighs a run
  // against that pilot's own copy, so a pilot who beats it leaves the other
  // holding the number from before the round. Unlevelled, the second pilot to
  // end files their own score over the first's.
  const store = fakeStorage({ 'cmdSpaceRider.bestScore': 1000 });
  const engine = loadBrowserEngine(store);
  const stored = () => Number(store.read(engine.BEST_SCORE_KEY));

  const r = new engine.VersusRound(5, engine.versusLayout(WIDE.cols, WIDE.rows));
  const [one, two] = r.states();
  assert.deepEqual([one.bestScore, two.bestScore], [1000, 1000], 'both opened on the stored one');

  one.score = 5000;
  one.shield = 0;
  r.pilots[0].endGame();
  assert.equal(stored(), 5000, 'the pilot who was wrecked on the better flight set it');

  r.step(FRAME, {}, {});
  assert.equal(two.bestScore, 5000, 'and the round levels the other pilot onto it');

  two.score = 3000;
  two.shield = 0;
  r.pilots[1].endGame();
  assert.equal(stored(), 5000, 'so the lower score is not filed over the higher one');
});

test('versus: two pilots wrecked on one frame still leave the higher score stored', () => {
  // The case the levelling has to run inside the step for rather than after it.
  // Both halves open on the same field, so two pilots handed the same keys fly
  // the same run and strike the same rock on the same frame - and by then the
  // second endGame of that frame has already read its own copy of the best.
  const store = fakeStorage({ 'cmdSpaceRider.bestScore': 1000 });
  const engine = loadBrowserEngine(store);
  const r = new engine.VersusRound(5, engine.versusLayout(WIDE.cols, WIDE.rows));
  const [one, two] = r.states();

  // Shields that one collision ends, and a lead for pilot 1 that distance cannot
  // close, since both halves earn it at the same rate.
  one.shield = 1;
  two.shield = 1;
  one.score = 5000;
  two.score = 3000;

  const wrecked = [null, null];
  for (let f = 0; f < 900 && !r.standing().over; f++) {
    r.step(FRAME, {}, {});
    r.states().forEach((s, i) => {
      if (wrecked[i] === null && s.mode !== 'playing') wrecked[i] = f;
    });
  }
  assert.equal(r.standing().over, true, 'both pilots were wrecked inside thirty seconds');
  assert.equal(wrecked[0], wrecked[1], 'on the one frame, which is what this case is');
  assert.ok(one.score > two.score, 'pilot 1 holds the better flight');
  assert.equal(
    Number(store.read(engine.BEST_SCORE_KEY)), one.score,
    'and the better flight is what is stored',
  );
});

test('versus: a pause from either hand stops both runs', () => {
  for (const key of ['P']) {
    const r = round();
    const [one, two] = r.states();
    r.step(FRAME, {}, { [key]: true });
    assert.equal(one.paused, true, 'pilot 1 is paused');
    assert.equal(two.paused, true, 'and so is pilot 2');

    const held = { one: one.distance, two: two.distance };
    fly(r, 20, { A: true, L: true });
    assert.equal(one.distance, held.one, 'a paused round advances nobody');
    assert.equal(two.distance, held.two, 'on either side of the seam');
  }
});

// ----- How a round stands, and who took it -----

test('versus: a round runs while either pilot is flying and is over when neither is', () => {
  const flying = { mode: 'playing', score: 0 };
  const out = { mode: 'dead', score: 0 };

  assert.deepEqual(browser.versusStanding(flying, flying), {
    alive: [true, true], over: false, winner: null,
  });
  assert.deepEqual(browser.versusStanding(out, flying), {
    alive: [false, true], over: false, winner: null,
  });
  assert.deepEqual(browser.versusStanding(flying, out), {
    alive: [true, false], over: false, winner: null,
  });
});

test('versus: the round goes to the higher score, and a tie is a dead heat', () => {
  const at = (score) => ({ mode: 'dead', score });
  assert.equal(browser.versusStanding(at(900), at(100)).winner, 0);
  assert.equal(browser.versusStanding(at(100), at(900)).winner, 1);
  assert.equal(browser.versusStanding(at(500), at(500)).winner, -1, 'a dead heat is -1');

  // -1 and null are different answers and the panel reads them differently: one
  // is a round nobody took and the other is a round still being flown.
  assert.equal(browser.versusStanding(at(500), { mode: 'playing', score: 0 }).winner, null);
});

test('versus: a score that would make the table reads as out, and never reaches it', () => {
  // endGame sends a qualifying score to the name entry screen, which is a screen
  // for one player with one name. A round reads that mode as out, exactly as it
  // reads 'dead', so nothing routes a keypress there and commitEntry is never
  // reached - the round's scores are on the round's own panel instead.
  const store = fakeStorage();
  const engine = loadBrowserEngine(store);
  const r = new engine.VersusRound(8, engine.versusLayout(WIDE.cols, WIDE.rows));
  const [one, two] = r.states();

  one.score = 50000;
  one.shield = 0;
  r.pilots[0].endGame();
  assert.equal(one.mode, 'nameEntry', 'the engine did send it to the entry screen');

  const standing = r.standing();
  assert.equal(standing.alive[0], false, 'and the round reads that pilot as out');

  two.score = 10;
  r.pilots[1].endGame();
  assert.equal(r.standing().over, true, 'the round is over with both of them off \'playing\'');
  assert.equal(r.standing().winner, 0, 'and it goes to the higher score');

  assert.equal(store.read(engine.LEADERBOARD_KEY), null, 'the table was never written');

  // The screen the round draws is its own panel, not the entry screen the engine
  // left one pilot's mode at.
  const text = screenText(renderRound(r));
  assert.ok(text.includes('TAKES THE ROUND'), 'the round draws its result');
  assert.ok(!text.includes('ENTER YOUR NAME'), 'and not the name entry screen');
});

// ----- One audio layer, two runs -----

test('versus: a round is heard as one run', () => {
  const flying = (over) => ({
    mode: 'playing', paused: false, muted: false, speed: 0.3, sounds: [], ...over,
  });

  // One of each cue. The queue holds names rather than events, so two pilots
  // firing on one frame is one shot heard rather than the same shot twice.
  const both = browser.versusAudioState(
    flying({ sounds: ['shot', 'orb'] }),
    flying({ sounds: ['shot', 'damage'] }),
  );
  assert.deepEqual([...both.sounds].sort(), ['damage', 'orb', 'shot']);

  // The hum follows whichever pilot is flying fastest.
  assert.equal(browser.versusAudioState(flying({ speed: 0.3 }), flying({ speed: 0.5 })).speed, 0.5);
  assert.equal(browser.versusAudioState(flying({ speed: 0.5 }), flying({ speed: 0.3 })).speed, 0.5);

  // And it follows the pilot who is actually flying, however fast the other one
  // was going when they stopped.
  const lead = browser.versusAudioState(
    flying({ mode: 'dead', speed: 0.9 }),
    flying({ speed: 0.4 }),
  );
  assert.equal(lead.speed, 0.4, 'a wrecked pilot\'s last speed is not the hum');
  assert.equal(lead.mode, 'playing', 'and the hum runs while either is flying');

  // It stops when neither is.
  assert.equal(
    browser.versusAudioState(flying({ mode: 'dead' }), flying({ mode: 'dead' })).mode, 'dead',
  );

  // A paused round is not a run advancing, which is the one condition the hum
  // runs under - and the reading is of the pilots, since the merged state carries
  // no pause of its own for the layer to read.
  const held = browser.versusAudioState(flying({ paused: true }), flying({ paused: true }));
  assert.equal(held.mode, 'dead', 'a paused round is silent');
  assert.equal(held.paused, false, 'reported through the mode rather than the flag');

  // Mute is either pilot's to call: a player who wants the room quiet is not
  // outvoted by the other one.
  assert.equal(browser.versusAudioState(flying({ muted: true }), flying()).muted, true);
  assert.equal(browser.versusAudioState(flying(), flying({ muted: true })).muted, true);
  assert.equal(browser.versusAudioState(flying(), flying()).muted, false);
});

// ----- What a round draws -----

test('versus: the grid is two halves with a divider between them', () => {
  const r = round();
  fly(r, 30);
  const layout = wideLayout();
  const screen = renderRound(r);

  for (let y = 0; y < WIDE.rows; y++) {
    const row = rowText(screen, y);
    for (let dx = 0; dx < layout.seam; dx++) {
      assert.equal(row[layout.seamX + dx], '║', `row ${y}: the seam holds its column`);
    }
  }

  // Each half carries a frame of its own, which is what makes the two read as
  // two screens rather than as one wide one.
  for (const x of [layout.leftX, layout.rightX]) {
    assert.equal(rowText(screen, 0)[x], '╔', `the half at ${x} opens with a corner`);
    assert.equal(
      rowText(screen, 0)[x + layout.half - 1], '╗',
      `and closes with one ${layout.half} columns along`,
    );
  }
});

test('versus: each half is laid where the layout puts it', () => {
  // The blit offsets are the one thing a swap would make invisible: both halves
  // draw the same tunnel, so two halves laid in the wrong order looks right
  // until a pilot moves. The ships are pushed apart to tell them apart.
  const r = round();
  fly(r, 30, { A: true, L: true });
  const layout = wideLayout();
  const screen = renderRound(r);

  const half = (x) => {
    const out = [];
    for (let y = 0; y < WIDE.rows; y++) {
      out.push(rowText(screen, y).slice(x, x + layout.half));
    }
    return out.join('\n');
  };

  const own = [0, 1].map((i) => {
    const buffer = new browser.ScreenBuffer(layout.half, layout.rows);
    browser.renderGame(buffer, r.states()[i]);
    return screenText(buffer);
  });

  // The two labels the composition replaces are the rows that differ, so the
  // comparison is of everything under them.
  const body = (text) => text.split('\n').slice(1, layout.rows - browser.FOOTER_ROWS).join('\n');
  assert.equal(body(half(layout.leftX)), body(own[0]), 'pilot 1 is in the left half');
  assert.equal(body(half(layout.rightX)), body(own[1]), 'and pilot 2 in the right');
});

test('versus: a half says whose it is, with nothing of the shared title left', () => {
  const r = round();
  const layout = wideLayout();
  const top = rowText(renderRound(r), 0);

  assert.ok(top.includes('PILOT 1'), 'the left half is tagged');
  assert.ok(top.includes('PILOT 2'), 'and so is the right');
  assert.ok(!top.includes('SPACE RIDER'), 'the shared title is gone');
  // The fault this guards is a fragment rather than a whole word: the tag is
  // written over a title of a different length, and the row once read
  // `S PILOT 1 R` because only the middle of the title was covered.
  assert.ok(!/[A-Z]\s+PILOT/.test(top), `a fragment of the title is left: ${top}`);
  assert.ok(!/PILOT \d\s+[A-Z]/.test(top), `a fragment of the title is left: ${top}`);

  // Each tag is centred on its own half rather than on the grid.
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? layout.leftX : layout.rightX;
    const span = top.slice(x, x + layout.half);
    const tag = browser.versusTag(i, true);
    assert.equal(span.indexOf(tag), Math.floor((layout.half - tag.length) / 2), `tag ${i + 1}`);
  }
});

test('versus: a wrecked half says so, and the half still flying does not', () => {
  const r = round();
  r.states()[0].shield = 0;
  r.pilots[0].endGame();
  r.step(FRAME, {}, {});

  const top = rowText(renderRound(r), 0);
  assert.ok(top.includes(`PILOT 1${browser.VERSUS_OUT}`), 'the wrecked half is marked');
  assert.ok(!top.includes(`PILOT 2${browser.VERSUS_OUT}`), 'and the flying one is not');
});

test('versus: each half carries its own pilot\'s keys', () => {
  // The shared footer names the solo game's keys - Arrows, SPACE, F - and half
  // of a round is flown on none of them, so without this pilot 2 would be
  // reading a legend for pilot 1's hand.
  const layout = wideLayout();
  const screen = renderRound(round());
  const hintY = layout.rows - browser.FOOTER_ROWS;
  const row = rowText(screen, hintY);

  const mine = row.slice(layout.leftX, layout.leftX + layout.half);
  const theirs = row.slice(layout.rightX, layout.rightX + layout.half);

  assert.ok(mine.includes(browser.versusHintRow(0, layout.half)), `pilot 1's keys: ${mine}`);
  assert.ok(theirs.includes(browser.versusHintRow(1, layout.half)), `pilot 2's keys: ${theirs}`);
  assert.ok(!mine.includes('IJKL'), 'pilot 1 is not shown pilot 2\'s keys');
  assert.ok(!theirs.includes('WASD'), 'and pilot 2 is not shown pilot 1\'s');
  assert.ok(!row.includes('Arrows'), 'and neither is shown the solo game\'s');
});

test('versus: a key list never runs into the frame it is set into', () => {
  // The rule the footer's own two forms follow, over three. The widths swept
  // start under the mode's own floor, because a window dragged narrower keeps
  // the round it is holding.
  for (let w = 20; w <= 120; w++) {
    for (let i = 0; i < browser.VERSUS_BINDINGS.length; i++) {
      const hint = browser.versusHintRow(i, w);
      const shortest = browser.VERSUS_HINTS[i][browser.VERSUS_HINTS[i].length - 1];
      assert.ok(
        hint.length <= w - 4 || hint === shortest,
        `pilot ${i + 1} at ${w} columns: ${hint}`,
      );
    }
  }

  // Both pilots drop to the same form at the same width, so two legends of
  // different shapes are never shown side by side.
  for (let w = 20; w <= 120; w++) {
    const forms = browser.VERSUS_BINDINGS.map((_, i) => browser.VERSUS_HINTS[i]
      .indexOf(browser.versusHintRow(i, w)));
    assert.equal(forms[1], forms[0], `the two halves disagree about the form at ${w} columns`);
  }
});

test('versus: the result panel is drawn once the round is over and not before', () => {
  const r = round();
  const [one, two] = r.states();

  one.shield = 0;
  r.pilots[0].endGame();
  r.step(FRAME, {}, {});
  assert.ok(
    !screenText(renderRound(r)).includes('TAKES THE ROUND'),
    'one pilot down is not a result',
  );

  r.pilots[1].endGame();
  // Levelled after both are out rather than before. The frame stepped above
  // advances whoever is still flying, and score is mostly distance, so a figure
  // set on a pilot who then flies for a frame is not the figure they end on.
  one.score = 700;
  two.score = 700;
  r.step(FRAME, {}, {});
  const text = screenText(renderRound(r));
  assert.ok(text.includes('A DEAD HEAT'), 'two equal scores is a dead heat');
  assert.ok(text.includes('PILOT 1  700'), 'and both scores are on the panel');
  assert.ok(text.includes('PILOT 2  700'));
  assert.ok(text.includes('ENTER REMATCH'), 'with the two ways out of it');
});

test('versus: the result panel stays on the grid at every width a round holds', () => {
  for (const cols of [81, 100, 137, 205]) {
    const screen = new browser.ScreenBuffer(cols, 30);
    const outside = [];
    const put = screen.put.bind(screen);
    screen.put = (x, y, ch, fg, bg) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || px >= cols || py < 0 || py >= 30) outside.push(`${px},${py}`);
      put(x, y, ch, fg, bg);
    };
    browser.drawVersusResult(screen, browser.versusResultLines(
      { score: 123456 }, { score: 7 }, { over: true, winner: 0, alive: [false, false] },
    ));
    assert.deepEqual(outside, [], `${cols} columns: the panel drew off the buffer`);
  }
});

// ----- The label on the title screen -----

test('versus: the title screen\'s label is on the border and nothing else', () => {
  // Drawn by the page after renderTitleScreen rather than inside it, because the
  // split screen is the browser's own and test/parity.test.mjs reads the two
  // builds' title buffers against each other. The bottom border is the one row
  // of that screen nothing else ever writes to.
  const game = new browser.Game();
  game.state.screenWidth = WIDE.cols;
  game.state.screenHeight = WIDE.rows;
  game.state.stars = [];
  game.state.leaderboard = [
    { name: 'ACE', score: 90000 }, { name: 'BOB', score: 4200 }, { name: 'CAT', score: 7 },
  ];

  const screen = new browser.ScreenBuffer(WIDE.cols, WIDE.rows);
  browser.renderTitleScreen(screen, game.state);
  const before = screenCells(screen);

  browser.drawVersusHint(screen, wideLayout());
  const moved = changedCells(before, screenCells(screen));
  assert.ok(moved.length > 0, 'the label is drawn');
  for (const cell of moved) {
    assert.equal(cell.split(',')[1], String(WIDE.rows - 1), `${cell} is not on the bottom border`);
  }
  assert.ok(rowText(screen, WIDE.rows - 1).includes('SPLIT SCREEN'), 'and it says what it opens');
});

test('versus: the label appears only where a round would open', () => {
  const quiet = new browser.ScreenBuffer(browser.MIN_WIDTH, browser.MIN_HEIGHT);
  quiet.clear(browser.C.BLACK);
  const before = screenText(quiet);
  browser.drawVersusHint(quiet, browser.versusLayout(browser.MIN_WIDTH, browser.MIN_HEIGHT));
  assert.equal(screenText(quiet), before, 'a window too narrow for two halves shows nothing');

  // So the key the label names always does something while the label is there,
  // and widening the window is what reveals it.
  const need = browser.VERSUS_MIN_HALF_WIDTH * 2 + browser.VERSUS_SEAM_COLS;
  const shown = new browser.ScreenBuffer(need, browser.MIN_HEIGHT);
  shown.clear(browser.C.BLACK);
  browser.drawVersusHint(shown, browser.versusLayout(need, browser.MIN_HEIGHT));
  assert.ok(screenText(shown).includes('SPLIT SCREEN'), 'and shows at the floor');
});

test('versus: the label falls back to a short form rather than running off', () => {
  // The same rule the name entry hint follows. The long form clears the narrowest
  // grid a round opens on with room to spare, so the short one is for a window
  // under the mode's own floor rather than for any width it supports.
  const need = browser.VERSUS_MIN_HALF_WIDTH * 2 + browser.VERSUS_SEAM_COLS;
  assert.ok(browser.versusHintText(need).length <= need - 4, 'the long form fits the floor');
  assert.ok(
    browser.versusHintText(24).length < browser.versusHintText(need).length,
    'and a narrow grid gets the short one',
  );
});

// ----- Resizing, and the round after this one -----

test('versus: a resize reseats both halves and moves neither pilot\'s world', () => {
  // The window is the one event a round has that neither player caused, so it
  // has to cost a round nothing. seatGrid lays a starfield, which is draws, and
  // taking those from a pilot's stream would move that pilot's tunnel every time
  // somebody dragged an edge.
  const dragged = round(606);
  const still = round(606);
  fly(dragged, 10, { A: true });
  fly(still, 10, { A: true });

  const world = JSON.stringify(dragged.states()[0].obstacles);
  const wider = browser.versusLayout(137, 34);
  dragged.seat(wider);

  assert.equal(JSON.stringify(dragged.states()[0].obstacles), world, 'the field is where it was');
  assert.equal(dragged.streams[0](), still.streams[0](), 'and the stream is where it was');

  for (let i = 0; i < 2; i++) {
    assert.equal(dragged.halves[i].width, wider.half, `half ${i + 1} is the new width`);
    assert.equal(dragged.halves[i].height, wider.rows, `and the new height`);
    assert.equal(dragged.states()[i].screenWidth, wider.half, `pilot ${i + 1}'s grid moved with it`);
    assert.equal(dragged.states()[i].screenHeight, wider.rows);
  }

  // And the round draws onto the grid it was re-seated for.
  const screen = renderRound(dragged, 137, 34);
  assert.equal(rowText(screen, 0)[wider.seamX], '║', 'the seam is where the new layout puts it');
});

test('versus: a rematch is a new round on the layout showing', () => {
  const first = round(11);
  const again = first.rematch();

  assert.notEqual(again, first, 'a round of its own');
  assert.deepEqual(again.layout, first.layout, 'on the layout the players are sitting at');
  assert.deepEqual(again.states().map((s) => s.mode), ['playing', 'playing'], 'both pilots launch');
  assert.notEqual(again.seed, first.seed, 'into a tunnel neither of them has seen');
  assert.deepEqual(
    again.states()[1].obstacles, again.states()[0].obstacles,
    'and both into the same one as each other',
  );
});

test('versus: a round is not settled until a frame has been stepped on it', () => {
  // The frame that ends a round can be carrying the ENTER that was pilot 2's
  // last shot, and the shell reads the rematch key against this flag. Read on
  // that frame, a round would relaunch on the keypress that fired into it.
  const r = round();
  assert.equal(r.settled, false, 'a round opens unsettled');

  r.states()[0].shield = 0;
  r.pilots[0].endGame();
  r.pilots[1].endGame();
  assert.equal(r.standing().over, true, 'the round is over');
  assert.equal(r.settled, false, 'but not yet settled, which is the frame it ended on');

  r.step(FRAME, {}, {});
  assert.equal(r.settled, true, 'the frame after is the one a rematch is read on');
});
