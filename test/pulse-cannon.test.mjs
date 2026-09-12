// test/pulse-cannon.test.mjs — Where the pulse cannon's shots go and what they
// register against.
//
// The screen is the whole of the player's aim: a target is one glyph in one
// column, the ship is another, and there is no reticle. So the checks here are
// written the way a player shoots - line the ship's column up with the
// target's, pull the trigger, see whether it counted - rather than by placing a
// bullet on top of an obstacle, which passes whatever the aiming does.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, screenCells, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const { renderGame: terminalRender } = require(join(REPO_ROOT, 'out', 'render.js'));
const { SHOT_SLACK_COLS, C: terminalC } = require(join(REPO_ROOT, 'out', 'types.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  {
    name: 'terminal', Game: TerminalGame,
    ScreenBuffer: TerminalScreen, renderGame: terminalRender, C: terminalC,
  },
  {
    name: 'browser', Game: browser.Game,
    ScreenBuffer: browser.ScreenBuffer, renderGame: browser.renderGame, C: browser.C,
  },
];

const W = 80;
const H = 24;
const HUD_ROWS = 3;
const FOOTER_ROWS = 2;

/**
 * The cells a tracer was drawn on. Its bright lower half is the one glyph and
 * colour only drawBullets puts on the screen: the tunnel's own walls carry
 * block characters, and the boost stripes down the border are magenta.
 */
function tracerCells(build, screen) {
  const key = `│|${build.C.BRIGHT_CYAN}|${build.C.BLACK}`;
  return screenCells(screen).filter((cell) => cell.key === key);
}

/** A run holding nothing but what a test stages into it. */
function emptyRun(build) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = W;
  s.screenHeight = H;
  s.stars = [];
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  s.bullets = [];
  s.particles = [];
  return game;
}

/** Park a single obstacle out in the tunnel and clear everything else away. */
function stageTarget(state, x, y, z) {
  state.obstacles = [{ x, y, z, rot: 0, rotSpeed: 0, scale: 1 }];
  state.orbs = [];
  state.mines = [];
  state.particles = [];
}

/**
 * Fly one engagement the way a player flies it: steer until the ship's glyph
 * sits in the target's column and at the target's height in the tunnel, fire,
 * then peel off the collision course. A ram recycles the obstacle just as a
 * kill does, so the two are told apart by the shield - only a collision spends
 * it.
 */
function engage(game, { x, y, z, dt = FRAME, volley = true }) {
  const s = game.state;
  stageTarget(s, x, y, z);
  let fired = false;

  for (let frame = 0; frame < 800; frame++) {
    const o = s.obstacles[0];
    const target = game.toScreen(o.x, o.y, o.z);
    const ship = game.toScreen(s.shipX, s.shipY, 0);

    const keys = {};
    const justPressed = {};
    if (!fired) {
      if (ship.col < target.col) keys.D = true;
      else if (ship.col > target.col) keys.A = true;
      if (s.shipY < o.y - 0.05) keys.W = true;
      else if (s.shipY > o.y + 0.05) keys.S = true;
      if (ship.col === target.col && Math.abs(s.shipY - o.y) <= 0.15) {
        justPressed.SPACE = true;
        fired = true;
      }
    } else if (x >= 0) {
      keys.A = true;
    } else {
      keys.D = true;
    }
    // The volley's own one-column spread hides an aiming fault the centre
    // bullet would show, so a test can ask for the centre bullet alone.
    if (fired && !volley && s.bullets.length > 1) s.bullets.length = 1;

    const shieldBefore = s.shield;
    const bulletsBefore = s.bullets.length;
    const zBefore = o.z;
    game.update(dt, keys, justPressed);
    if (s.mode === 'dead') return 'dead';

    // A kill, a ram and simply sailing past the camera all recycle the
    // obstacle to the back of the tunnel. Only a ram spends shield, and only a
    // kill spends the shot that caused it.
    if (s.obstacles[0].z < zBefore - 100) {
      if (s.shield < shieldBefore) return 'ram';
      if (s.bullets.length < bulletsBefore) return 'hit';
      return 'miss';
    }
    if (fired && s.bullets.length === 0) return 'miss';
    if (!fired && s.obstacles[0].z > 8) return 'no-shot';
  }
  return 'timeout';
}

/** Where a shot leaves the ship, matching the centre bullet of a volley. */
const MUZZLE_Z = -2;

/**
 * One shot placed by hand rather than flown, so the ship is never in the way.
 * It leaves the muzzle aimed either dead on the target's column at the depth
 * the two meet, or one column past everything the hit test allows. The ship is
 * parked at the far wall so nothing it does can register.
 */
function stagedShot(build, { x, y, targetZ, dt, aimedAt }) {
  const game = emptyRun(build);
  const s = game.state;
  stageTarget(s, x, y, targetZ);
  s.shipX = x >= 0 ? -6.5 : 6.5;
  s.shipY = 0;

  // The target closes on the camera while the shot runs the other way, so the
  // two speeds and the gap between them fix the depth they meet at.
  const flight = (MUZZLE_Z - targetZ) / (60 + s.speed * 60);
  const crossZ = MUZZLE_Z - 60 * flight;
  const scale = game.projScale(crossZ);
  const cell = s.tunnelRadius / (((W - 6) / 2) * scale); // world units per column
  const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);
  const offset = aimedAt === 'target' ? 0 : half + SHOT_SLACK_COLS + 1;
  const aim = (x + offset * cell) * scale;
  s.bullets = [{ x: aim / game.projScale(MUZZLE_Z), y, z: MUZZLE_Z, life: 4 }];

  for (let frame = 0; frame < 400; frame++) {
    const zBefore = s.obstacles[0].z;
    const bulletsBefore = s.bullets.length;
    game.update(dt, {}, {});
    if (s.mode === 'dead') return 'dead';
    // Sailing past the camera recycles the obstacle exactly as a kill does, so
    // the shot going with it is what tells the two apart.
    if (s.obstacles[0].z < zBefore - 100) {
      return s.bullets.length < bulletsBefore ? 'hit' : 'miss';
    }
    if (s.bullets.length === 0) return 'miss';
  }
  return 'timeout';
}

/** Every engagement across a spread of target positions at one range band. */
function sweep(build, { near, far, volley = true, dt = FRAME }) {
  let hit = 0;
  let shots = 0;
  for (let i = 0; i < 60; i++) {
    // Walked rather than drawn at random, so a failure names one placement.
    const x = -4.5 + (9 * i) / 59;
    const y = 0.5 + (4 * ((i * 7) % 60)) / 59;
    const z = -(near + ((far - near) * ((i * 13) % 60)) / 59);
    const outcome = engage(emptyRun(build), { x, y, z, volley, dt });
    if (outcome === 'hit' || outcome === 'miss') {
      shots++;
      if (outcome === 'hit') hit++;
    }
  }
  return { hit, shots };
}

for (const build of BUILDS) {
  test(`${build.name}: a shot lined up by column lands, at every range`, () => {
    // Walked against the engine as committed for 0.3.3-alpha, this same sweep
    // landed 19/21, 26/58 and 3/58 - 90%, 45% and 5%. A shot held a constant
    // world x while the player aimed at a screen column, so the two diverged
    // further the longer the shot stayed in the air, and the floors below sit
    // well above what that engine could reach at any of the three ranges.
    const bands = [
      { near: 15, far: 35, floor: 0.95 },
      { near: 35, far: 80, floor: 0.9 },
      { near: 80, far: 140, floor: 0.65 },
    ];
    for (const band of bands) {
      const { hit, shots } = sweep(build, { near: band.near, far: band.far, volley: false });
      assert.ok(shots > 20, `${band.near}-${band.far}: only ${shots} shots resolved`);
      assert.ok(
        hit / shots >= band.floor,
        `${band.near}-${band.far} out: ${hit}/${shots} landed, wanted ${band.floor * 100}%`
      );
    }
  });

  test(`${build.name}: the volley a player actually fires almost never misses`, () => {
    // The volley's own one-column spread covers the lead a long shot needs, so
    // this is the number a player experiences. It was 10/58 before.
    const { hit, shots } = sweep(build, { near: 80, far: 140, volley: true });
    assert.ok(
      hit / shots >= 0.9,
      `long-range volley landed ${hit}/${shots}, wanted 90%`
    );
  });

  test(`${build.name}: a shot holds the screen column it was fired down`, () => {
    // This is the aiming fix itself. A shot on a constant world x walks toward
    // the vanishing point instead, which is what put it wide of the target.
    const game = emptyRun(build);
    const s = game.state;
    s.shipX = 4;
    s.shipY = 2;
    s.obstacles = [];

    game.update(FRAME, {}, { SPACE: true });
    assert.equal(s.bullets.length, 3, 'the trigger should raise a three-shot volley');

    const columns = new Set();
    for (let frame = 0; frame < 40 && s.bullets.length; frame++) {
      const b = s.bullets.find((each) => each.x > 3);
      if (!b) break;
      columns.add(game.toScreen(b.x, b.y, b.z).col);
      game.update(FRAME, {}, {});
    }
    assert.equal(
      columns.size, 1,
      `the shot wandered across columns ${[...columns].join(', ')}`
    );
  });

  test(`${build.name}: the tracer is drawn as one column inside the play area`, () => {
    // The check above asks toScreen where the shot is. This one asks the
    // renderer what it actually put on the screen, which is all the player has
    // to aim by: drawBullets could round, clip or drop a column without the
    // state ever saying so. Fired from both walls as well as the centre, since
    // the drift the column fix removed was widest at the edges.
    for (const shipX of [-6.5, 0, 6.5]) {
      const game = emptyRun(build);
      const s = game.state;
      s.shipX = shipX;
      s.shipY = 0;

      const screen = new build.ScreenBuffer(W, H);
      game.update(FRAME, {}, { SPACE: true });
      build.renderGame(screen, s);

      const columns = new Set();
      let drawn = 0;
      let firstRow = null;
      let lastRow = null;

      for (let frame = 0; frame < 70 && s.bullets.length; frame++) {
        const cells = tracerCells(build, screen);
        if (cells.length) {
          drawn++;
          for (const cell of cells) {
            columns.add(cell.x);
            assert.ok(
              cell.y >= HUD_ROWS && cell.y < H - FOOTER_ROWS,
              `fired from ${shipX}, a tracer was drawn at row ${cell.y}, ` +
              `outside the play area's rows ${HUD_ROWS} to ${H - FOOTER_ROWS - 1}`
            );
          }
          lastRow = Math.min(...cells.map((cell) => cell.y));
          if (firstRow === null) firstRow = lastRow;
        }
        game.update(FRAME, {}, {});
        build.renderGame(screen, s);
      }

      assert.ok(drawn > 40, `fired from ${shipX}, the volley was drawn on only ${drawn} frames`);
      // Three bullets, so three columns at the most, and fewer while the ship's
      // own glyphs still cover the muzzle. The same volley on a constant world
      // x walked through sixteen columns over this flight.
      assert.ok(
        columns.size <= 3,
        `fired from ${shipX}, the volley was drawn across columns ` +
        `${[...columns].sort((a, b) => a - b).join(', ')}`
      );
      assert.ok(
        firstRow - lastRow >= 3,
        `fired from ${shipX}, the tracer climbed only ${firstRow - lastRow} rows`
      );
    }
  });

  test(`${build.name}: a shot resolves the same way at any frame rate`, () => {
    // The hit is taken where the shot crossed the target's depth rather than
    // wherever the frame left it, so the verdict belongs to the geometry and
    // not to how the frames happened to fall. Driven from a staged shot rather
    // than from the ship, so a slow frame cannot let the ship reach the target
    // first and answer a question nobody asked.
    const RATES = [1 / 60, 1 / 30, 1 / 20, 1 / 12, 1 / 6];
    for (const [x, y, targetZ] of [[3.5, 1, -50], [-4, 3.5, -90], [2, 4, -120]]) {
      const onTarget = RATES.map((dt) => stagedShot(build, { x, y, targetZ, dt, aimedAt: 'target' }));
      assert.deepEqual(
        onTarget, RATES.map(() => 'hit'),
        `a shot on the target at ${x},${y},${targetZ} resolved as ${onTarget.join('/')}`
      );

      const wide = RATES.map((dt) => stagedShot(build, { x, y, targetZ, dt, aimedAt: 'clear' }));
      assert.deepEqual(
        wide, RATES.map(() => 'miss'),
        `a shot wide of the target at ${x},${y},${targetZ} resolved as ${wide.join('/')}`
      );
    }
  });

  test(`${build.name}: a shot wide of the slack does not register`, () => {
    // The slack is what makes an honest shot count; it is not a licence to
    // widen the target. A shot placed a column past it has to miss, or the
    // constant can drift upward unnoticed.
    const game = emptyRun(build);
    const s = game.state;
    const z = -60;
    stageTarget(s, 0, 2, z);

    const scale = game.projScale(z);
    const cell = s.tunnelRadius / (((W - 6) / 2) * scale); // world units per column
    const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);
    const clear = (half + SHOT_SLACK_COLS + 1) * cell;

    s.bullets = [{ x: clear, y: 2, z, life: 2 }];
    game.update(FRAME, {}, {});
    assert.equal(s.obstacles.length, 1, 'the target should still be there');
    assert.ok(s.obstacles[0].z > z - 100, 'and should not have been recycled by a kill');
  });

  test(`${build.name}: a shot inside the slack does register`, () => {
    const game = emptyRun(build);
    const s = game.state;
    const z = -60;
    stageTarget(s, 0, 2, z);

    const scale = game.projScale(z);
    const cell = s.tunnelRadius / (((W - 6) / 2) * scale);
    const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);

    s.bullets = [{ x: (half + SHOT_SLACK_COLS - 0.5) * cell, y: 2, z, life: 2 }];
    game.update(FRAME, {}, {});
    assert.ok(s.obstacles[0].z < z - 100, 'the shot should have landed');
  });
}

test('both builds resolve the same engagements the same way', () => {
  const outcomes = BUILDS.map((build) => {
    const results = [];
    for (let i = 0; i < 24; i++) {
      const x = -4.5 + (9 * i) / 23;
      const y = 0.5 + (4 * ((i * 7) % 24)) / 23;
      const z = -(30 + (110 * ((i * 5) % 24)) / 23);
      results.push(engage(emptyRun(build), { x, y, z, volley: false }));
    }
    return results;
  });
  assert.deepEqual(outcomes[1], outcomes[0]);
});
