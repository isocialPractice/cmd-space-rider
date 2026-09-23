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
