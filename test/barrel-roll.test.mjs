// test/barrel-roll.test.mjs — Q and E were bound in both builds and did
// nothing at all until the roll was written behind them. It is shared engine
// code, so every check here runs against both builds.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, stageCollision, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { rollWings: terminalRollWings } = require(join(REPO_ROOT, 'out', 'render.js'));
const { ROLL_TIME, ROLL_COOLDOWN } = require(join(REPO_ROOT, 'out', 'types.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  { name: 'terminal', Game: TerminalGame, rollWings: terminalRollWings },
  { name: 'browser', Game: browser.Game, rollWings: browser.rollWings },
];

/** Frames a duration takes at the engine's 30 fps target. */
const framesFor = (seconds) => Math.round(seconds / FRAME);

/** A run with nothing in it, so only what a test stages can happen. */
function emptyRun(build) {
  const game = new build.Game();
  game.startGame();
  game.state.obstacles = [];
  game.state.orbs = [];
  game.state.mines = [];
  return game;
}

/** Step the run on, pressing nothing. */
function idle(game, frames) {
  for (let i = 0; i < frames; i++) game.update(FRAME, {}, {});
}

for (const build of BUILDS) {
  test(`${build.name}: Q rolls one way and E the other`, () => {
    const left = emptyRun(build);
    left.update(FRAME, {}, { Q: true });
    assert.equal(left.state.shipRoll, ROLL_TIME);
    assert.equal(left.state.rollDir, -1);

    const right = emptyRun(build);
    right.update(FRAME, {}, { E: true });
    assert.equal(right.state.shipRoll, ROLL_TIME);
    assert.equal(right.state.rollDir, 1);
  });

  test(`${build.name}: a roll runs for its stated time and then levels out`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { E: true });

    idle(game, framesFor(ROLL_TIME) - 1);
    assert.ok(game.state.shipRoll > 0, 'still rolling a frame short of the end');

    // Two frames past, rather than one: the timer counts down in steps of dt,
    // and ROLL_TIME is not an exact multiple of one, so the last step can leave
    // a hair above zero the way every other timer in the engine can.
    idle(game, 2);
    assert.equal(game.state.shipRoll, 0, 'level again just past the end');
    assert.equal(game.state.rollDir, 0);
  });

  test(`${build.name}: a roll carries the ship through an obstacle untouched`, () => {
    const rolled = emptyRun(build);
    rolled.update(FRAME, {}, { Q: true });
    stageCollision(rolled.state);
    rolled.update(FRAME, {}, {});

    // The same collision, stepped the same way, with no roll under it.
    const control = emptyRun(build);
    control.update(FRAME, {}, {});
    stageCollision(control.state);
    control.update(FRAME, {}, {});

    assert.ok(control.state.shield < 100, 'the control run should take the hit');
    assert.equal(rolled.state.shield, 100, 'the rolling run should not');
    assert.equal(rolled.state.shake, 0, 'and should not be jolted by it either');
    assert.deepEqual(rolled.state.sounds, [], 'nor make the noise of one');
  });

  test(`${build.name}: a mine cannot touch a ship in a roll either`, () => {
    const rolled = emptyRun(build);
    rolled.update(FRAME, {}, { E: true });
    rolled.state.mines = [{
      x: rolled.state.shipX, y: rolled.state.shipY, z: 0,
      rot: 0, rotSpeed: 0, scale: 1, hp: 5,
    }];
    rolled.update(FRAME, {}, {});

    assert.equal(rolled.state.shield, 100);
    assert.equal(rolled.state.mines.length, 1, 'the mine is dodged, not destroyed');
  });

  test(`${build.name}: the hit lands again once the roll is over`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { Q: true });
    idle(game, framesFor(ROLL_TIME) + 2);
    assert.equal(game.state.shipRoll, 0);

    stageCollision(game.state);
    game.update(FRAME, {}, {});
    assert.ok(game.state.shield < 100, 'a level ship is hittable again');
  });

  test(`${build.name}: a second roll waits for the cooldown`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { Q: true });

    idle(game, framesFor(ROLL_TIME) + 2);
    assert.equal(game.state.shipRoll, 0, 'the first roll has finished');
    assert.ok(game.state.rollCooldown > 0, 'but the cooldown has not');

    game.update(FRAME, {}, { E: true });
    assert.equal(game.state.shipRoll, 0, 'so a press inside it does nothing');

    idle(game, framesFor(ROLL_COOLDOWN));
    assert.equal(game.state.rollCooldown, 0);

    game.update(FRAME, {}, { E: true });
    assert.equal(game.state.shipRoll, ROLL_TIME, 'and one past it rolls again');
  });

  test(`${build.name}: pressing again mid-roll neither restarts nor extends it`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { Q: true });
    idle(game, 5);
    const partway = game.state.shipRoll;

    game.update(FRAME, {}, { E: true });
    assert.ok(game.state.shipRoll < partway, 'the roll keeps running down');
    assert.equal(game.state.rollDir, -1, 'and stays the way it started');
  });

  test(`${build.name}: the wings turn through the roll and come back level`, () => {
    const game = emptyRun(build);
    assert.deepEqual(build.rollWings(game.state), ['<', '>'], 'level to start with');

    game.update(FRAME, {}, { E: true });
    const seen = new Set();
    for (let i = 0; i < framesFor(ROLL_TIME); i++) {
      seen.add(build.rollWings(game.state).join(''));
      game.update(FRAME, {}, {});
    }
    assert.equal(seen.size, 4, `the roll should pass through four wing positions, saw ${[...seen].join(' ')}`);

    idle(game, 2);
    assert.deepEqual(build.rollWings(game.state), ['<', '>'], 'level again at the end');
  });

  test(`${build.name}: Q and E turn the wings the opposite way round`, () => {
    const wingsThrough = (key) => {
      const game = emptyRun(build);
      game.update(FRAME, {}, { [key]: true });
      const seen = [];
      for (let i = 0; i < framesFor(ROLL_TIME); i++) {
        const pair = build.rollWings(game.state).join('');
        if (pair !== seen[seen.length - 1]) seen.push(pair);
        game.update(FRAME, {}, {});
      }
      return seen;
    };

    const right = wingsThrough('E');
    const left = wingsThrough('Q');

    assert.equal(right.length, 4, 'four positions each way');
    assert.equal(left[0], right[0], 'both start level');
    assert.deepEqual(
      left.slice(1), right.slice(1).reverse(),
      'and pass through the rest in opposite order'
    );
  });

  test(`${build.name}: a paused run does not roll`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { P: true });
    game.update(FRAME, {}, { Q: true });
    assert.equal(game.state.shipRoll, 0);
  });

  test(`${build.name}: Q does nothing outside a run`, () => {
    const game = new build.Game();
    game.update(FRAME, {}, { Q: true });
    assert.equal(game.state.shipRoll, 0);
    assert.equal(game.state.rollCooldown, 0);
  });

  test(`${build.name}: a fresh run starts level, whatever the last one was doing`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { Q: true });
    assert.ok(game.state.shipRoll > 0);

    game.startGame();
    assert.equal(game.state.shipRoll, 0);
    assert.equal(game.state.rollDir, 0);
    assert.equal(game.state.rollCooldown, 0);
  });
}

test('both builds roll the same way through the same presses', () => {
  const pair = BUILDS.map((build) => emptyRun(build));

  const script = [{ Q: true }, {}, {}, {}, { E: true }, {}, {}, { E: true }];
  for (let i = 0; i < 60; i++) {
    const justPressed = script[i] || {};
    const read = pair.map((game) => {
      game.update(FRAME, {}, justPressed);
      const s = game.state;
      return { shipRoll: s.shipRoll, rollDir: s.rollDir, rollCooldown: s.rollCooldown };
    });
    assert.deepEqual(read[1], read[0], `frame ${i}`);
  }
});
