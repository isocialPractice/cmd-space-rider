// test/terminal-engine.test.mjs — Terminal build: pause, mute, shake, best
// score, and the row-shift primitive the shake is built on.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  REPO_ROOT, rowText, screenText, screenCells, changedCells,
  stageCollision, stageAnimatedWorld, FRAME,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer } = require(join(REPO_ROOT, 'out', 'screen.js'));
const { renderGame, shakeColumns } = require(join(REPO_ROOT, 'out', 'render.js'));
const { SHAKE_TIME, NEW_BEST_FLASH_TIME, BASE_SPEED_START } = require(join(REPO_ROOT, 'out', 'types.js'));

const HUD_ROWS = 3;

function stage(game, w = 80, h = 24) {
  const screen = new ScreenBuffer(w, h);
  game.state.screenWidth = w;
  game.state.screenHeight = h;
  game.initStars(w, h);
  return screen;
}

// ----- ScreenBuffer.shiftRows -----

test('shiftRows moves a row right and blanks what it vacates', () => {
  const screen = new ScreenBuffer(5, 1);
  screen.putString(0, 0, 'ABCDE', 3, 0);

  screen.shiftRows(0, 1, 1);
  assert.equal(rowText(screen, 0), ' ABCD');
  assert.equal(screen.fg[0], 7, 'the vacated cell resets to the default colour');
  assert.equal(screen.fg[1], 3, 'shifted cells carry their colour along');
});

test('shiftRows moves a row left and blanks what it vacates', () => {
  const screen = new ScreenBuffer(5, 1);
  screen.putString(0, 0, 'ABCDE');

  screen.shiftRows(0, 1, -1);
  assert.equal(rowText(screen, 0), 'BCDE ');
});

test('shiftRows with no offset changes nothing', () => {
  const screen = new ScreenBuffer(5, 1);
  screen.putString(0, 0, 'ABCDE');

  screen.shiftRows(0, 1, 0);
  assert.equal(rowText(screen, 0), 'ABCDE');
});

test('shiftRows touches only the rows it is given', () => {
  const screen = new ScreenBuffer(5, 3);
  screen.putString(0, 0, 'AAAAA');
  screen.putString(0, 1, 'BBBBB');
  screen.putString(0, 2, 'CCCCC');

  screen.shiftRows(1, 2, 2);
  assert.equal(rowText(screen, 0), 'AAAAA');
  assert.equal(rowText(screen, 1), '  BBB');
  assert.equal(rowText(screen, 2), 'CCCCC');
});

test('shiftRows clips a range that runs past the buffer', () => {
  const screen = new ScreenBuffer(4, 2);
  screen.putString(0, 0, 'WXYZ');
  screen.putString(0, 1, 'WXYZ');

  assert.doesNotThrow(() => screen.shiftRows(-5, 99, 1));
  assert.equal(rowText(screen, 0), ' WXY');
  assert.equal(rowText(screen, 1), ' WXY');
});

test('a shift wider than the row blanks it entirely', () => {
  const screen = new ScreenBuffer(4, 1);
  screen.putString(0, 0, 'WXYZ');

  screen.shiftRows(0, 1, 9);
  assert.equal(rowText(screen, 0), '    ');
});

// ----- Shake -----

test('taking damage starts the shake', () => {
  const game = new Game();
  const s = game.state;

  game.startGame();
  stageCollision(s);
  s.shake = 0;

  game.update(FRAME, {}, {});
  assert.equal(s.shake, SHAKE_TIME);
  assert.equal(s.shield, 75, 'the staged obstacle should have landed a hit');
});

test('the shake fades to nothing', () => {
  const game = new Game();
  const s = game.state;

  game.startGame();
  s.obstacles = []; s.orbs = []; s.mines = [];
  s.shake = SHAKE_TIME;

  for (let i = 0; i < 10; i++) game.update(FRAME, {}, {});
  assert.equal(s.shake, 0);
});

test('the shake offset is at most one column and settles to zero', () => {
  const game = new Game();
  const s = game.state;

  assert.equal(shakeColumns(s), 0);

  s.shake = SHAKE_TIME;
  let sawMovement = false;
  for (let i = 0; i < 40; i++) {
    s.uiTime = i * FRAME;
    const dx = shakeColumns(s);
    assert.ok(Number.isInteger(dx), 'a column offset must be whole');
    assert.ok(Math.abs(dx) <= 1, `offset within one column, got ${dx}`);
    if (dx !== 0) sawMovement = true;
  }
  assert.ok(sawMovement, 'a live shake should actually move the play area');

  s.shake = 0;
  assert.equal(shakeColumns(s), 0);
});

test('the shake leaves the HUD and border anchored', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  game.state.shake = SHAKE_TIME;

  // Sweep the shake through a full cycle so a shifting frame is certain.
  for (let i = 0; i < 20; i++) {
    game.state.uiTime = i * FRAME;
    renderGame(screen, game.state);
    const rows = screenText(screen).split('\n');
    assert.equal(rows[0][0], '╔', 'top-left corner holds');
    assert.equal(rows[0][screen.width - 1], '╗', 'top-right corner holds');
    assert.equal(rows[screen.height - 1][0], '╚', 'bottom-left corner holds');
    assert.match(rows[1], /SCORE:/, 'the HUD stays readable');
    assert.match(rows[screen.height - 1], /SPD:/, 'the status strip stays readable');
  }
});

// ----- Pause -----

test('P halts the run and P again resumes it', () => {
  const game = new Game();
  const s = game.state;

  game.startGame();
  game.update(FRAME, {}, {});
  game.update(FRAME, {}, { P: true });
  assert.equal(s.paused, true);

  const distance = s.distance;
  for (let i = 0; i < 20; i++) game.update(FRAME, {}, {});
  assert.equal(s.distance, distance);

  game.update(FRAME, {}, { P: true });
  game.update(FRAME, {}, {});
  assert.ok(s.distance > distance);
});

test('P does nothing outside a run, and a fresh run clears it', () => {
  const game = new Game();

  game.update(FRAME, {}, { P: true });
  assert.equal(game.state.paused, false);

  game.startGame();
  game.update(FRAME, {}, { P: true });
  assert.equal(game.state.paused, true);

  game.startGame();
  assert.equal(game.state.paused, false);
});

test('a pause stops the world clock and leaves the presentation clock running', () => {
  const game = new Game();

  game.startGame();
  game.update(FRAME, {}, { P: true });
  const { time, uiTime } = game.state;

  game.update(FRAME, {}, {});
  assert.equal(game.state.time, time, 'the world clock is frozen by the pause');
  assert.ok(game.state.uiTime > uiTime, 'the presentation clock carries on');

  game.update(FRAME, {}, { P: true });
  game.update(FRAME, {}, {});
  assert.ok(game.state.time > time, 'resuming restarts the world clock');
});

test('the world clock keeps running outside a run, whatever the pause flag says', () => {
  // The title screen, debug menu and game over screen all animate off the world
  // clock, so the pause gate has to name the mode as well as the flag.
  for (const mode of ['menu', 'debugMenu', 'dead']) {
    const game = new Game();
    game.state.mode = mode;
    game.state.paused = true;

    const t = game.state.time;
    game.update(FRAME, {}, {});
    assert.ok(game.state.time > t, `${mode} keeps animating`);
  }
});

test('a paused screen is a still image apart from the PAUSED label', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  stageAnimatedWorld(game.state);
  game.update(FRAME, {}, { P: true });
  assert.equal(game.state.paused, true);

  renderGame(screen, game.state);
  const before = screenCells(screen);

  for (let i = 0; i < 10; i++) game.update(FRAME, {}, {});
  renderGame(screen, game.state);
  const after = screenCells(screen);

  // The label pulse is the one thing meant to move, so it reads as paused
  // rather than crashed. Everything else - tunnel walls, mine blink, orb bob,
  // engine glow - freezes with the world.
  const moved = changedCells(before, after);
  const labelRow = Math.floor(screen.height / 2) - 1;
  const strays = moved.filter((cell) => Number(cell.split(',')[1]) !== labelRow);
  assert.deepEqual(strays, [], 'nothing outside the label row may animate while paused');
});

test('the PAUSED label still pulses across paused frames', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  game.update(FRAME, {}, { P: true });

  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    game.update(FRAME, {}, {});
    renderGame(screen, game.state);
    const labelRow = Math.floor(screen.height / 2) - 1;
    const mid = labelRow * screen.width + Math.floor(screen.width / 2);
    seen.add(screen.fg[mid]);
  }
  assert.ok(seen.size > 1, `the label should change colour while paused, saw ${[...seen]}`);
});

test('a shake caught by a pause still decays and settles at no offset', () => {
  const game = new Game();
  const s = game.state;

  game.startGame();
  s.shake = SHAKE_TIME;
  game.update(FRAME, {}, { P: true });
  assert.equal(s.paused, true);
  assert.ok(s.shake > 0, 'the shake is still in flight when the pause lands');

  for (let i = 0; i < 20; i++) game.update(FRAME, {}, {});
  assert.equal(s.shake, 0, 'the shake finishes rather than freezing mid-offset');
  assert.equal(shakeColumns(s), 0, 'and settles back to centre');
});

test('the paused overlay is drawn only while paused', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  renderGame(screen, game.state);
  assert.doesNotMatch(screenText(screen), /\[ PAUSED \]/);

  game.state.paused = true;
  renderGame(screen, game.state);
  const text = screenText(screen);
  assert.match(text, /\[ PAUSED \]/);
  assert.match(text, /P to resume/);
});

// ----- Mute -----

test('M toggles the mute flag from any mode', () => {
  const game = new Game();

  game.update(FRAME, {}, { M: true });
  assert.equal(game.state.muted, true);

  game.startGame();
  assert.equal(game.state.muted, true, 'mute is a setting, not run state');

  game.update(FRAME, {}, { M: true });
  assert.equal(game.state.muted, false);
});

test('the mute indicator appears only when muted', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  renderGame(screen, game.state);
  assert.doesNotMatch(rowText(screen, screen.height - 1), /MUTED/);

  game.state.muted = true;
  renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /MUTED/);
});

// ----- Speed readout -----

test('the footer carries the speed readout', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /SPD: 1\.0x/);

  game.state.speed = BASE_SPEED_START * 1.8;
  renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /SPD: 1\.8x/);
});

test('the footer never overruns the border, at any supported width', () => {
  for (const w of [60, 61, 62, 63, 64, 70, 80, 100, 160]) {
    const game = new Game();
    const screen = stage(game, w, 24);
    game.startGame();
    game.state.muted = true;
    game.state.score = 99999999;
    game.state.distance = 99999999;
    renderGame(screen, game.state);

    const hintRow = rowText(screen, screen.height - 2);
    const statusRow = rowText(screen, screen.height - 1);

    assert.equal(hintRow[0], '╠', `width ${w}: left border of the hint row`);
    assert.equal(hintRow[w - 1], '╣', `width ${w}: right border of the hint row`);
    assert.equal(statusRow[0], '╚', `width ${w}: left border of the status row`);
    assert.equal(statusRow[w - 1], '╝', `width ${w}: right border of the status row`);
    assert.match(statusRow, /SPD:/, `width ${w}: speed readout present`);
    assert.match(statusRow, /MUTED/, `width ${w}: mute indicator present`);
  }
});

// ----- Best score -----

test('only a normal run can set the best score', () => {
  const game = new Game();

  game.startGame('chaos');
  game.state.score = 999999;
  game.endGame();
  assert.equal(game.state.bestScore, 0);

  game.startGame();
  game.state.score = 800;
  game.endGame();
  assert.equal(game.state.bestScore, 800);
});

test('crossing the best raises the banner once', () => {
  const game = new Game();
  const s = game.state;

  game.startGame();
  s.obstacles = []; s.orbs = []; s.mines = [];
  s.bestScore = 1000;
  s.score = 999;

  game.update(FRAME, {}, {});
  assert.equal(s.newBestShown, true);
  assert.equal(s.newBestFlash, NEW_BEST_FLASH_TIME);

  for (let i = 0; i < 100; i++) game.update(FRAME, {}, {});
  assert.equal(s.newBestFlash, 0);
});

test('the NEW BEST banner is drawn only while the flash is live', () => {
  const game = new Game();
  const screen = stage(game);

  game.startGame();
  renderGame(screen, game.state);
  assert.doesNotMatch(screenText(screen), /NEW BEST/);

  game.state.newBestFlash = 1;
  renderGame(screen, game.state);
  assert.match(rowText(screen, HUD_ROWS), /\[ NEW BEST \]/);
});
