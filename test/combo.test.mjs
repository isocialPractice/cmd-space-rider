// test/combo.test.mjs — Kills strung together inside the combo window pay a
// rising multiplier and put a counter on the HUD. Shared engine and renderer
// code, so every check runs against both builds.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  REPO_ROOT, loadBrowserEngine, fakeStorage,
  rowText, screenText, FRAME,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const { renderGame: terminalRender } = require(join(REPO_ROOT, 'out', 'render.js'));
const { COMBO_TIME } = require(join(REPO_ROOT, 'out', 'types.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  { name: 'terminal', Game: TerminalGame, ScreenBuffer: TerminalScreen, renderGame: terminalRender },
  { name: 'browser', Game: browser.Game, ScreenBuffer: browser.ScreenBuffer, renderGame: browser.renderGame },
];

const HUD_ROWS = 3;

/** A run with nothing in it, so only what a test stages can happen. */
function emptyRun(build, mode) {
  const game = new build.Game();
  game.startGame(mode);
  clearWorld(game.state);
  return game;
}

function clearWorld(state) {
  state.obstacles = [];
  state.orbs = [];
  state.mines = [];
  state.bullets = [];
  state.particles = [];
}

/**
 * Put an obstacle and a bullet on the same spot, well clear of the ship, so the
 * next frame is a kill and nothing else. The kill is what the tests assert on,
 * so a staging that stopped landing would fail rather than pass quietly.
 */
function stageObstacleKill(state) {
  clearWorld(state);
  state.obstacles = [{ x: 4, y: 3, z: -40, rot: 0, rotSpeed: 0, scale: 1 }];
  state.bullets = [{ x: 4, y: 3, z: -40, life: 2 }];
}

/** The same, with a mine on its last hit point. */
function stageMineKill(state) {
  clearWorld(state);
  state.mines = [{ x: 4, y: 3, z: -40, rot: 0, rotSpeed: 0, scale: 1, hp: 1 }];
  state.bullets = [{ x: 4, y: 3, z: -40, life: 2 }];
}

for (const build of BUILDS) {
  test(`${build.name}: a kill starts a chain and each one inside the window raises it`, () => {
    const game = emptyRun(build);

    stageObstacleKill(game.state);
    game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 1, 'the first kill should land');
    assert.equal(game.state.comboTimer, COMBO_TIME, 'and arm the window');

    stageObstacleKill(game.state);
    game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 2);

    stageMineKill(game.state);
    game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 3, 'a mine chains with an obstacle');
  });

  test(`${build.name}: the chain multiplies what a kill is worth`, () => {
    // Distance scores on its own every frame, so a kill's worth is read as the
    // gap between a run that kills and one stepped identically that does not.
    // Both carry the same speed and distance, so the floor under them matches.
    const killing = emptyRun(build);
    const control = emptyRun(build);

    const step = (game, stage) => {
      if (stage) stage(game.state);
      else clearWorld(game.state);
      const before = game.state.score;
      game.update(FRAME, {}, {});
      return game.state.score - before;
    };

    const paidFor = (stage) => step(killing, stage) - step(control, null);

    assert.equal(paidFor(stageObstacleKill), 200, 'the first obstacle at face value');
    assert.equal(killing.state.combo, 1);

    assert.equal(paidFor(stageObstacleKill), 400, 'the second at double');
    assert.equal(killing.state.combo, 2);

    assert.equal(paidFor(stageMineKill), 1500, 'a mine at triple its own 500');
    assert.equal(killing.state.combo, 3);
  });

  test(`${build.name}: a chain drops after a quiet window`, () => {
    const game = emptyRun(build);
    stageObstacleKill(game.state);
    game.update(FRAME, {}, {});
    stageObstacleKill(game.state);
    game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 2);

    const frames = Math.round(COMBO_TIME / FRAME);
    for (let i = 0; i < frames - 2; i++) game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 2, 'still standing just inside the window');

    for (let i = 0; i < 4; i++) game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 0, 'and gone just past it');
    assert.equal(game.state.comboTimer, 0);
  });

  test(`${build.name}: the window does not run down while paused`, () => {
    const game = emptyRun(build);
    stageObstacleKill(game.state);
    game.update(FRAME, {}, {});
    const armed = game.state.comboTimer;

    game.update(FRAME, {}, { P: true });
    for (let i = 0; i < Math.round(COMBO_TIME / FRAME) + 5; i++) game.update(FRAME, {}, {});

    assert.equal(game.state.comboTimer, armed, 'the chain waits out the pause');
    assert.equal(game.state.combo, 1);
  });

  test(`${build.name}: collecting an orb does not chain`, () => {
    const game = emptyRun(build);
    game.state.orbs = [{ x: game.state.shipX, y: game.state.shipY, z: 0, collected: false }];
    game.update(FRAME, {}, {});

    assert.ok(game.state.orbs[0].collected, 'the orb should have been picked up');
    assert.equal(game.state.combo, 0, 'a pickup is not a kill');
  });

  test(`${build.name}: the collision-tracking modes chain nothing`, () => {
    for (const [mode, stage] of [['obstacleCollision', stageObstacleKill], ['mineCollision', stageMineKill]]) {
      const game = emptyRun(build, mode);
      stage(game.state);
      game.update(FRAME, {}, {});

      assert.equal(game.state.bullets.length, 0, `${mode}: the shot should have landed`);
      assert.equal(game.state.combo, 0, `${mode}: an unscored kill starts no chain`);
      assert.equal(game.state.score, 0, `${mode}: and scores nothing`);
    }
  });

  test(`${build.name}: a fresh run starts with no chain`, () => {
    const game = emptyRun(build);
    stageObstacleKill(game.state);
    game.update(FRAME, {}, {});
    assert.equal(game.state.combo, 1);

    game.startGame();
    assert.equal(game.state.combo, 0);
    assert.equal(game.state.comboTimer, 0);
  });

  test(`${build.name}: the counter shows from x2 up, on the HUD row`, () => {
    const game = emptyRun(build);
    const screen = new build.ScreenBuffer(80, 24);
    game.state.screenWidth = 80;
    game.state.screenHeight = 24;
    game.state.stars = [];

    build.renderGame(screen, game.state);
    assert.ok(!screenText(screen).includes('COMBO'), 'nothing to show with no chain');

    game.state.combo = 1;
    build.renderGame(screen, game.state);
    assert.ok(!screenText(screen).includes('COMBO'), 'a lone kill is not a chain');

    game.state.combo = 3;
    build.renderGame(screen, game.state);
    assert.ok(
      rowText(screen, HUD_ROWS).startsWith('  COMBO x3'),
      `x3 should open the HUD row, saw ${JSON.stringify(rowText(screen, HUD_ROWS))}`
    );
  });

  test(`${build.name}: a longer chain reads differently`, () => {
    const game = emptyRun(build);
    const screen = new build.ScreenBuffer(80, 24);
    game.state.screenWidth = 80;
    game.state.screenHeight = 24;
    game.state.stars = [];

    const colorOfCounter = (combo) => {
      game.state.combo = combo;
      build.renderGame(screen, game.state);
      return screen.fg[HUD_ROWS * screen.width + 2];
    };

    const tiers = [colorOfCounter(2), colorOfCounter(4), colorOfCounter(6)];
    assert.equal(new Set(tiers).size, 3, `each tier should carry its own colour, saw ${tiers.join(' ')}`);
  });

  test(`${build.name}: the counter clears the debug label beside it`, () => {
    // Both sit on the HUD row: the counter left-aligned, the label centred. The
    // narrowest supported screen is where they would meet if they ever did.
    const game = emptyRun(build, 'chaos');
    const screen = new build.ScreenBuffer(60, 20);
    game.state.screenWidth = 60;
    game.state.screenHeight = 20;
    game.state.stars = [];
    game.state.combo = 12;

    build.renderGame(screen, game.state);
    const row = rowText(screen, HUD_ROWS);
    assert.ok(row.startsWith('  COMBO x12'), `the counter should be there, saw ${JSON.stringify(row)}`);
    assert.ok(row.includes('[ DEBUG: CHAOS PROTOCOL ]'), `and the label whole, saw ${JSON.stringify(row)}`);
  });
}

test('both builds chain and score the same way', () => {
  const pair = BUILDS.map((build) => emptyRun(build));

  const kill = (i) => {
    for (const game of pair) {
      if (i % 10 === 0) stageObstacleKill(game.state);
      else clearWorld(game.state);
    }
  };

  for (let i = 0; i < 90; i++) {
    kill(i);
    const read = pair.map((game) => {
      game.update(FRAME, {}, {});
      return { combo: game.state.combo, comboTimer: game.state.comboTimer, score: game.state.score };
    });
    assert.deepEqual(read[1], read[0], `frame ${i}`);
  }
});
