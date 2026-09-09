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
