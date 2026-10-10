// test/parity.test.mjs — The browser build is a port of the CLI build, so the
// two are meant to hold the same state and behave the same way. These tests
// guard that promise, which is easy to break by touching one file and not the
// other.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  REPO_ROOT, loadBrowserEngine, fakeStorage,
  screenCells, changedCells, stageAnimatedWorld, FRAME,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const terminalTypes = require(join(REPO_ROOT, 'out', 'types.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const { renderGame: terminalRender } = require(join(REPO_ROOT, 'out', 'render.js'));
const terminalMenu = require(join(REPO_ROOT, 'out', 'menu.js'));

const browser = loadBrowserEngine(fakeStorage());

test('both builds carry the same game state fields', () => {
  const terminalKeys = Object.keys(new TerminalGame().state).sort();
  const browserKeys = Object.keys(new browser.Game().state).sort();
  assert.deepEqual(browserKeys, terminalKeys);
});

test('both builds agree on the shared tuning constants', () => {
  assert.equal(browser.BASE_SPEED_START, terminalTypes.BASE_SPEED_START);
  assert.equal(browser.SHAKE_TIME, terminalTypes.SHAKE_TIME);
  assert.equal(browser.NEW_BEST_FLASH_TIME, terminalTypes.NEW_BEST_FLASH_TIME);
  assert.equal(browser.ROLL_TIME, terminalTypes.ROLL_TIME);
  assert.equal(browser.ROLL_COOLDOWN, terminalTypes.ROLL_COOLDOWN);
  assert.equal(browser.COMBO_TIME, terminalTypes.COMBO_TIME);
  assert.equal(browser.COMBO_MAX, terminalTypes.COMBO_MAX);
  assert.equal(browser.SHOT_SLACK_COLS, terminalTypes.SHOT_SLACK_COLS);
  assert.equal(browser.SLACK_REF_WIDTH, terminalTypes.SLACK_REF_WIDTH);
});

test('both builds hold the same detail ladder', () => {
  // The ladder is what a slow device is stepped down, so a build cutting its
  // starfield to a different population than the other is a browser and a
  // terminal that do not look like the same game on the same machine.
  assert.equal(browser.TARGET_FRAME_TIME, terminalTypes.TARGET_FRAME_TIME);
  assert.equal(browser.DETAIL_WINDOW_FRAMES, terminalTypes.DETAIL_WINDOW_FRAMES);
  assert.equal(browser.DETAIL_DROP_FACTOR, terminalTypes.DETAIL_DROP_FACTOR);
  assert.equal(browser.DETAIL_RAISE_FACTOR, terminalTypes.DETAIL_RAISE_FACTOR);
  assert.equal(browser.DETAIL_STALL_RETURN_FACTOR, terminalTypes.DETAIL_STALL_RETURN_FACTOR);
  assert.deepEqual(browser.DETAIL_TIERS, terminalTypes.DETAIL_TIERS);

  // And the two decisions read off it, walked rather than spot-checked: the
  // ladder is an index and the arithmetic is a comparison, so a build that got
  // either boundary wrong would agree on the constants and still differ here.
  for (let detail = -1; detail <= terminalTypes.DETAIL_TIERS.length; detail++) {
    assert.deepEqual(
      browser.detailTier(detail), terminalTypes.detailTier(detail),
      `the tier at level ${detail}`
    );
    for (let ms = 10; ms <= 120; ms++) {
      assert.equal(
        browser.detailFor(detail, ms / 1000), terminalTypes.detailFor(detail, ms / 1000),
        `the decision at level ${detail} on a ${ms}ms mean`
      );
    }
    for (const count of [1, 5, 8, 10, 12, 15, 20]) {
      assert.equal(
        browser.burstSize(count, detail), terminalTypes.burstSize(count, detail),
        `a burst of ${count} at level ${detail}`
      );
    }
  }
});

test('both builds keep the same table and spell a name the same way', () => {
  assert.equal(browser.LEADERBOARD_SIZE, terminalTypes.LEADERBOARD_SIZE);
  assert.equal(browser.NAME_LENGTH, terminalTypes.NAME_LENGTH);
  assert.equal(browser.NAME_ALPHABET, terminalTypes.NAME_ALPHABET);
  assert.equal(browser.DEFAULT_NAME, terminalTypes.DEFAULT_NAME);

  // The alphabet agreeing is not the same as the two builds reading a name the
  // same way, and the stored table is the one value in this game that a player
  // can edit by hand - so a build that accepted a row the other dropped would
  // show a different table from the same storage.
  const said = [
    'ABC', 'abc', '', 'A', 'ABCDEFGH', 'a-b', '\n\t!', 'A1 ', '  ', '123',
  ];
  for (const name of said) {
    assert.equal(
      browser.normalizeName(name), terminalTypes.normalizeName(name),
      `the name ${JSON.stringify(name)}`
    );
  }

  const stored = [
    null, undefined, 0, 'nope', true, [],
    [{ name: 'ABC', score: 300 }, { name: 'DEF', score: 900 }],
    [null, 7, 'ABC 400', { name: 'DEF' }, { score: 800 }],
    [{ name: 'GHI', score: 'lots' }, { name: 'JKL', score: NaN }],
    [{ name: 'MNO', score: Infinity }, { name: 'PQR', score: -40 }, { name: 'STU', score: 0 }],
    [{ name: 'VWX', score: 0.5 }, { name: 'YZA', score: 0.999 }, { name: 'BCD', score: 1.5 }],
    [{ name: 'this is far too long', score: 100.7 }],
  ];
  for (const raw of stored) {
    assert.deepEqual(
      browser.sanitizeLeaderboard(raw), terminalTypes.sanitizeLeaderboard(raw),
      `the stored table ${JSON.stringify(raw) ?? 'undefined'}`
    );
  }

  const full = [];
  for (let i = 0; i < terminalTypes.LEADERBOARD_SIZE; i++) full.push({ name: 'AAA', score: i + 1 });
  for (const score of [-1, 0, 1, 5, 11, 1000]) {
    assert.equal(
      browser.scoreQualifies(full, score), terminalTypes.scoreQualifies(full, score),
      `a score of ${score} against a full table`
    );
    assert.deepEqual(
      browser.recordScore(full, { name: 'NEW', score }),
      terminalTypes.recordScore(full, { name: 'NEW', score }),
      `recording ${score}`
    );
  }
});

test('both builds record and read a ghost the same way', () => {
  assert.equal(browser.GHOST_SAMPLE_TIME, terminalTypes.GHOST_SAMPLE_TIME);
  assert.equal(browser.GHOST_MAX_SAMPLES, terminalTypes.GHOST_MAX_SAMPLES);

  // The reading is an interpolation with a cursor, and the end of a recording
  // is a boundary: a build that read it one sample wide would show a ghost the
  // other had already retired.
  const path = [];
  for (let i = 0; i <= 20; i++) path.push({ t: i * 0.1, x: Math.sin(i) * 4, y: i % 3 });
  for (let step = -5; step <= 250; step++) {
    const t = step / 100;
    for (const cursor of [0, 5, 19, 20, 999, -3]) {
      assert.deepEqual(
        browser.readGhost(path, t, cursor), terminalTypes.readGhost(path, t, cursor),
        `a reading at ${t} from cursor ${cursor}`
      );
    }
  }
  for (const empty of [[], [{ t: 1, x: 2, y: 3 }]]) {
    for (const t of [0, 1, 2]) {
      assert.deepEqual(
        browser.readGhost(empty, t, 0), terminalTypes.readGhost(empty, t, 0),
        `a short recording of ${empty.length} at ${t}`
      );
    }
  }
});

test('both builds step the difficulty on the same clock', () => {
  assert.equal(browser.WARP_INTERVAL, terminalTypes.WARP_INTERVAL);
  assert.equal(browser.WARP_FLASH_TIME, terminalTypes.WARP_FLASH_TIME);
});

test('both builds agree on what a powerup is worth', () => {
  assert.equal(browser.POWERUP_DROP_CHANCE, terminalTypes.POWERUP_DROP_CHANCE);
  assert.equal(browser.POWERUP_DRIFT, terminalTypes.POWERUP_DRIFT);
  assert.equal(browser.POWERUP_SHIELD_GAIN, terminalTypes.POWERUP_SHIELD_GAIN);
  assert.equal(browser.RAPID_FIRE_TIME, terminalTypes.RAPID_FIRE_TIME);
  assert.equal(browser.SLOW_MOTION_TIME, terminalTypes.SLOW_MOTION_TIME);
  assert.equal(browser.SLOW_MOTION_SCALE, terminalTypes.SLOW_MOTION_SCALE);
  assert.equal(browser.FIRE_INTERVAL, terminalTypes.FIRE_INTERVAL);
  assert.equal(browser.RAPID_FIRE_MULT, terminalTypes.RAPID_FIRE_MULT);
  assert.equal(browser.RAPID_FIRE_INTERVAL, terminalTypes.RAPID_FIRE_INTERVAL);
});

test('both builds give a bolt the same reach', () => {
  // The reach is the draw distance in both, so the pair that sizes a bolt's
  // flight has to agree as well - one build reaching the far end of its tunnel
  // and the other stopping short of it is the fault this guards.
  assert.equal(browser.BULLET_SPEED, terminalTypes.BULLET_SPEED);
  assert.equal(browser.BULLET_LIFE_SLACK, terminalTypes.BULLET_LIFE_SLACK);
  assert.equal(new browser.Game().state.maxViewZ, new TerminalGame().state.maxViewZ);
});

test('both builds draw a powerup the same way', () => {
  // The glyph table is read by the engine for the burst colour, by the renderer
  // for the drop, and by the footer for the badge, so a build that drifted here
  // would show a different pickup doing the same thing.
  assert.deepEqual(browser.POWERUP_KINDS, terminalTypes.POWERUP_KINDS);
  for (const kind of terminalTypes.POWERUP_KINDS) {
    assert.deepEqual(browser.POWERUP_GLYPHS[kind], terminalTypes.POWERUP_GLYPHS[kind], kind);
  }
});

test('both builds scale the column slack the same way', () => {
  // The slack the hit test reads is a function of the grid rather than a
  // constant, so the two builds have to agree on the function and not only on
  // the number it is built from. Walked from the 60 columns the browser build
  // clamps a small window to, out past the 205 a full-screen window gives it.
  for (let width = 60; width <= 240; width++) {
    assert.equal(
      browser.shotSlackCols(width), terminalTypes.shotSlackCols(width),
      `column slack at ${width} wide`
    );
  }
});

test('both builds agree on the colour constants', () => {
  assert.deepEqual(
    Object.keys(browser.C).sort(),
    Object.keys(terminalTypes.C).sort()
  );
  for (const key of Object.keys(terminalTypes.C)) {
    assert.equal(browser.C[key], terminalTypes.C[key], `colour ${key}`);
  }
});

test('both builds pause, mute, and shake identically', () => {
  const pair = [new TerminalGame(), new browser.Game()];

  for (const game of pair) {
    game.startGame();
    game.state.obstacles = []; game.state.orbs = []; game.state.mines = [];
  }

  const step = (keys, justPressed) => pair.map((g) => {
    g.update(FRAME, keys, justPressed);
    const s = g.state;
    return {
      paused: s.paused, muted: s.muted,
      shake: s.shake, newBestFlash: s.newBestFlash,
      distance: s.distance, score: s.score,
    };
  });

  const script = [
    [{}, {}],
    [{}, { P: true }],
    [{}, {}],
    [{ D: true }, {}],
    [{}, { M: true }],
    [{}, { P: true }],
    [{}, {}],
  ];

  for (const [keys, justPressed] of script) {
    const [terminal, browserState] = step(keys, justPressed);
    assert.deepEqual(browserState, terminal);
  }
});

test('both builds draw the same sequence from the same seed', () => {
  // The engine's randomness is one function in each build, and every draw
  // either of them makes comes through it: the sixty obstacles a run opens
  // with, the orbs among them, the mine timers, the starfield, the debris a
  // burst is thrown in. Seeding it is what makes a figure taken off a flown
  // run reproducible, and that only holds if the two builds step the same
  // arithmetic - mulberry32 is written out twice, once in src/types.ts and
  // once in index.html, so this is the check that the copies have not drifted.
  for (const seed of [0, 1, 7, 20260919, -3, 2 ** 31]) {
    const mine = terminalTypes.seededRandom(seed);
    const theirs = browser.seededRandom(seed);
    const drawn = [];
    for (let i = 0; i < 200; i++) drawn.push(mine());
    assert.deepEqual(
      Array.from({ length: 200 }, () => theirs()), drawn,
      `the two builds diverge on seed ${seed}`
    );
    assert.ok(
      drawn.every((v) => v >= 0 && v < 1),
      `seed ${seed} drew outside [0, 1)`
    );
  }
});

test('seeding is repeatable and releasing it hands the draw back', () => {
  for (const [name, build] of [['terminal', terminalTypes], ['browser', browser]]) {
    build.seedRng(4242);
    const first = [0, 0, 0, 0].map(() => build.RNG.next());
    build.seedRng(4242);
    assert.deepEqual([0, 0, 0, 0].map(() => build.RNG.next()), first, `${name} did not repeat`);

    build.seedRng(null);
    assert.equal(build.RNG.next, Math.random, `${name} did not release the seed`);
  }
});

test('a seeded run opens the same world in both builds', () => {
  // The sequence agreeing is not the same thing as the two builds spending it
  // the same way. `startGame` draws in a fixed order - one obstacle, then an
  // orb four times in ten - and the port has to make the same draws in the
  // same order or a seeded flight is two different flights.
  const opened = [['terminal', TerminalGame, terminalTypes], ['browser', browser.Game, browser]]
    .map(([name, Game, api]) => {
      api.seedRng(20260919);
      try {
        const game = new Game();
        game.startGame();
        game.initStars(80, 24);
        return { name, state: game.state };
      } finally {
        api.seedRng(null);
      }
    });

  const [mine, theirs] = opened;
  for (const field of ['obstacles', 'orbs', 'mines', 'stars']) {
    assert.deepEqual(theirs.state[field], mine.state[field], `${field} differ`);
  }
  assert.equal(mine.state.obstacles.length, 60, 'a normal run opens with sixty obstacles');
  assert.ok(mine.state.orbs.length > 0, 'and some orbs among them');
});

test('an unseeded run is still a different run each time', () => {
  // The seed is for the checks and the probes. The game itself has to stay
  // unpredictable, so a build nobody seeded draws from Math.random and two
  // runs of it open on different worlds.
  const open = (Game) => {
    const game = new Game();
    game.startGame();
    return game.state.obstacles.map((o) => o.x).join(',');
  };
  assert.notEqual(open(TerminalGame), open(TerminalGame));

  // The browser build gets the same reading off a copy nothing has seeded yet,
  // rather than off the shared one the tests above have been handing seeds to.
  // That is the build a player loads, and it carries seedRng in the same file
  // as the draw it replaces, so the default landing anywhere but Math.random
  // would put a fixed world in front of every player who opened the page.
  const fresh = loadBrowserEngine(fakeStorage());
  assert.equal(fresh.RNG.next, Math.random, 'a freshly loaded browser engine is already seeded');
  assert.notEqual(open(fresh.Game), open(fresh.Game));
});

test('both builds refuse to record a debug run as the best score', () => {
  for (const game of [new TerminalGame(), new browser.Game()]) {
    game.startGame('mines');
    game.state.score = 500000;
    game.endGame();
    assert.equal(game.state.bestScore, 0);
  }
});

test('both builds fly the same ghost and record the same path', () => {
  // The recording is the one piece of per-frame state read back by the renderer
  // rather than by a rule, so a build sampling on a different clock would show
  // the player a ghost somewhere else while agreeing on every constant.
  const raced = [];
  for (let i = 0; i <= 40; i++) raced.push({ t: i * 0.1, x: Math.sin(i / 2) * 4, y: 1 + (i % 3) });

  const flown = [new TerminalGame(), new browser.Game()].map((game) => {
    const s = game.state;
    s.screenWidth = 80;
    s.screenHeight = 24;
    s.leaderboard = [];
    game.startGame();
    s.obstacles = [];
    s.orbs = [];
    s.mines = [];
    s.ghost = raced;
    s.ghostCursor = 0;

    const seen = [];
    const script = [{ D: true }, { D: true }, {}, { A: true }, { W: true }, {}];
    for (let i = 0; i < 120; i++) {
      game.update(FRAME, script[i % script.length], {});
      seen.push(s.ghostShip === null ? null : { x: s.ghostShip.x, y: s.ghostShip.y });
    }
    return { seen, record: s.ghostRecord, cursor: s.ghostCursor };
  });

  const [mine, theirs] = flown;
  assert.deepEqual(theirs.seen, mine.seen, 'the ghost was somewhere else');
  assert.deepEqual(theirs.record, mine.record, 'the recording came out different');
  assert.equal(theirs.cursor, mine.cursor, 'the cursors parted');
  assert.ok(mine.seen.some((p) => p !== null), 'the ghost should have been on screen');
  assert.ok(mine.record.length > 10, 'and the run should have recorded a path');
});

test('both builds name a score through the same screen', () => {
  const pair = [new TerminalGame(), new browser.Game()].map((game) => {
    game.state.screenWidth = 80;
    game.state.screenHeight = 24;
    game.state.leaderboard = [];
    game.startGame();
    game.state.score = 4321;
    game.endGame();
    return game;
  });

  const step = (key) => pair.map((game) => {
    game.handleMenuInput({ [key]: true });
    const s = game.state;
    return { mode: s.mode, entryName: s.entryName, entrySlot: s.entrySlot, table: s.leaderboard };
  });

  for (const key of ['UP', 'UP', 'RIGHT', 'DOWN', 'D', 'W', 'LEFT', 'A', 'ENTER']) {
    const [mine, theirs] = step(key);
    assert.deepEqual(theirs, mine, `the two builds parted on ${key}`);
  }
  assert.equal(pair[0].state.mode, 'dead', 'the name was filed and the screen moved on');
  assert.equal(pair[0].state.leaderboard.length, 1, 'with a row on the table');
});

test('both builds draw the same name entry screen and the same table', () => {
  // Both screens are new, and both are ported line for line, so the cheapest
  // guard against a drift is the whole buffer. The starfields are drawn from
  // Math.random and never match, so they are cleared rather than compared - the
  // same thing the paused check below does for the same reason.
  const W = 80;
  const H = 40;
  const table = [
    { name: 'ACE', score: 90000 },
    { name: 'BOB', score: 4200 },
    { name: 'CAT', score: 7 },
  ];

  const drawn = [
    { name: 'terminal', Game: TerminalGame, Screen: TerminalScreen, menu: terminalMenu },
    { name: 'browser', Game: browser.Game, Screen: browser.ScreenBuffer, menu: browser },
  ].map((build) => {
    const game = new build.Game();
    const s = game.state;
    s.screenWidth = W;
    s.screenHeight = H;
    s.leaderboard = [];
    game.startGame();
    s.score = 4321;
    game.endGame();
    s.stars = [];
    s.entrySlot = 1;
    s.uiTime = 0.5;
    s.time = 0.5;

    const screen = new build.Screen(W, H);
    build.menu.renderNameEntry(screen, s);
    const entry = screenCells(screen);

    s.mode = 'menu';
    s.leaderboard = table;
    build.menu.renderTitleScreen(screen, s);
    return { entry, title: screenCells(screen) };
  });

  const [mine, theirs] = drawn;
  assert.deepEqual(changedCells(mine.entry, theirs.entry), [], 'the entry screens differ');
  assert.deepEqual(changedCells(mine.title, theirs.title), [], 'the title screens differ');
});

test('both builds freeze the same cells while paused', () => {
  // The starfields are seeded from Math.random, so the two screens never match
  // cell for cell. What has to match is which cells move while paused: the
  // PAUSED label pulses in both builds and nothing else may.
  const movedBy = (game, screen, renderGame) => {
    game.startGame();
    game.state.screenWidth = screen.width;
    game.state.screenHeight = screen.height;
    game.initStars(screen.width, screen.height);
    stageAnimatedWorld(game.state);
    game.update(FRAME, {}, { P: true });

    const read = () => {
      renderGame(screen, game.state);
      return screenCells(screen);
    };

    const before = read();
    // Long enough to cross the label pulse trough. sin(uiTime*3) only drops
    // under the colour threshold past ~1.2s, so a shorter sweep would find
    // nothing moving and pass whether the label pulsed or not.
    for (let i = 0; i < 40; i++) game.update(FRAME, {}, {});
    return changedCells(before, read()).sort();
  };

  const W = 80;
  const H = 24;
  const terminalMoved = movedBy(new TerminalGame(), new TerminalScreen(W, H), terminalRender);
  const browserMoved = movedBy(new browser.Game(), new browser.ScreenBuffer(W, H), browser.renderGame);

  assert.deepEqual(browserMoved, terminalMoved);
  assert.ok(terminalMoved.length > 0, 'the PAUSED label should still be pulsing');

  const labelRow = Math.floor(H / 2) - 1;
  for (const cell of terminalMoved) {
    assert.equal(Number(cell.split(',')[1]), labelRow, `only the label row moves, saw ${cell}`);
  }
});
