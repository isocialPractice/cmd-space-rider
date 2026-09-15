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
const { renderGame: terminalRender, tunnelSpan: terminalTunnelSpan } =
  require(join(REPO_ROOT, 'out', 'render.js'));
const { SHOT_SLACK_COLS, SHOT_SLACK_ROWS, C: terminalC } = require(join(REPO_ROOT, 'out', 'types.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  {
    name: 'terminal', Game: TerminalGame,
    ScreenBuffer: TerminalScreen, renderGame: terminalRender, C: terminalC,
    tunnelSpan: terminalTunnelSpan,
  },
  {
    name: 'browser', Game: browser.Game,
    ScreenBuffer: browser.ScreenBuffer, renderGame: browser.renderGame, C: browser.C,
    tunnelSpan: browser.tunnelSpan,
  },
];

const W = 80;
const H = 24;

/** Everything drawTunnel is allowed to leave on a wall column. */
const WALL_CHARS = new Set([
  '\u2591', '\u2592', '\u2593', '\u2588', // the four depths of block
  '\u2563', '\u2560', // the two ring ends
]);
const HUD_ROWS = 3;
const FOOTER_ROWS = 2;
/** The squash toScreen puts on the tunnel's height, matching Y_FACTOR. */
const Y_FACTOR = 0.4;

/** The ship's nose. Nothing else in the game draws it, so it locates the hull. */
const NOSE = '▲';
/**
 * An obstacle's block, near and far. Red is what tells it from a tunnel wall,
 * which shares ▓, and from a mine, which blinks between ◈ and a grey ■.
 */
const BLOCK_CHARS = new Set(['■', '▓']);

/**
 * World units of height to one screen row at a given depth, which is what the
 * vertical slack is worth in the units a target is placed in.
 */
function unitsPerRow(state, scale) {
  const gameH = state.screenHeight - HUD_ROWS - FOOTER_ROWS;
  return state.tunnelRadius / (gameH * Y_FACTOR * scale);
}

/**
 * The cells a tracer was drawn on. Its bright lower half is the one glyph and
 * colour only drawBullets puts on the screen: the tunnel's own walls carry
 * block characters, and the boost stripes down the border are magenta.
 *
 * Its dim upper half is as particular, and is asked for by colour: the ring
 * glyphs that share the colour are ╣ and ╠, and the engine glow that shares
 * the glyph is blue.
 */
function tracerCells(build, screen, fg = build.C.BRIGHT_CYAN) {
  const key = `│|${fg}|${build.C.BLACK}`;
  return screenCells(screen).filter((cell) => cell.key === key);
}

/**
 * Both halves of the tracer on every frame of one flight, in order.
 *
 * drawBullets tests each half against the row it is on, so the two are read
 * back together: the halves sit a row apart, the corridor narrows going up, and
 * a clip that read one row for both would show up here and nowhere else.
 */
function tracerFrames(build, shipX) {
  const game = emptyRun(build);
  const s = game.state;
  s.shipX = shipX;
  s.shipY = 0;

  const screen = new build.ScreenBuffer(W, H);
  game.update(FRAME, {}, { SPACE: true });
  build.renderGame(screen, s);

  const frames = [];
  for (let i = 0; i < 70 && s.bullets.length; i++) {
    const halves = [
      ...tracerCells(build, screen).map((c) => ({ x: c.x, y: c.y, half: 'bright' })),
      ...tracerCells(build, screen, build.C.CYAN).map((c) => ({ x: c.x, y: c.y, half: 'dim' })),
    ];
    frames.push(halves);
    game.update(FRAME, {}, {});
    build.renderGame(screen, s);
  }
  return frames;
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

/** The ship's hull row and column, found on the painted screen by its nose. */
function seeShip(screen) {
  for (let i = 0; i < screen.chars.length; i++) {
    if (screen.chars[i] === NOSE) return { col: i % W, row: Math.floor(i / W) + 1 };
  }
  return null;
}

/**
 * The target's drawn block, as the middle of the red cells on the screen.
 *
 * One staged target is what the engagements below give it, so every red cell
 * on the screen belongs to that one block. A second obstacle arriving would
 * widen the box and pull the aim off, which the floors would catch.
 */
function seeBlock(build, screen) {
  let left = W, right = -1, top = H, bottom = -1;
  for (let i = 0; i < screen.chars.length; i++) {
    if (!BLOCK_CHARS.has(screen.chars[i])) continue;
    if (screen.fg[i] !== build.C.RED && screen.fg[i] !== build.C.BRIGHT_RED) continue;
    const col = i % W;
    const row = Math.floor(i / W);
    if (col < left) left = col;
    if (col > right) right = col;
    if (row < top) top = row;
    if (row > bottom) bottom = row;
  }
  if (right < 0) return null;
  return { col: Math.round((left + right) / 2), row: Math.round((top + bottom) / 2) };
}

/**
 * The hull row halfway up the ship's travel, measured by flying to each end of
 * it and reading the screen back. That is all a player has to find it with, and
 * it is where a run is spent: every target spawns in the same band of heights,
 * so the middle of the tunnel is the standing guess at where the next one is.
 */
function middleHullRow(build) {
  const game = emptyRun(build);
  const screen = new build.ScreenBuffer(W, H);
  const flyTo = (keys) => {
    for (let i = 0; i < 60; i++) game.update(FRAME, keys, {});
    build.renderGame(screen, game.state);
    return seeShip(screen).row;
  };
  return Math.round((flyTo({ W: true }) + flyTo({ S: true })) / 2);
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
 *
 * `watch` is handed every frame once the trigger has been pulled, for a test
 * that has to see what the engagement looked like rather than only how it
 * ended.
 */
function engage(game, { x, y, z, dt = FRAME, volley = true, watch = null, dy = 0 }) {
  const s = game.state;
  stageTarget(s, x, y, z);
  let fired = false;

  for (let frame = 0; frame < 800; frame++) {
    const o = s.obstacles[0];
    const target = game.toScreen(o.x, o.y, o.z);
    const ship = game.toScreen(s.shipX, s.shipY, 0);
    // Where the player thinks the target's height is. `dy` is how far off that
    // reading sits, which is the error the vertical slack is there to absorb.
    const aimY = o.y + dy;

    const keys = {};
    const justPressed = {};
    if (!fired) {
      if (ship.col < target.col) keys.D = true;
      else if (ship.col > target.col) keys.A = true;
      if (s.shipY < aimY - 0.05) keys.W = true;
      else if (s.shipY > aimY + 0.05) keys.S = true;
      if (ship.col === target.col && Math.abs(s.shipY - aimY) <= 0.15) {
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
    if (fired && watch) watch();
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
function sweep(build, { near, far, volley = true, dt = FRAME, dy = 0 }) {
  let hit = 0;
  let shots = 0;
  for (let i = 0; i < 60; i++) {
    // Walked rather than drawn at random, so a failure names one placement.
    const x = -4.5 + (9 * i) / 59;
    const y = 0.5 + (4 * ((i * 7) % 60)) / 59;
    const z = -(near + ((far - near) * ((i * 13) % 60)) / 59);
    const outcome = engage(emptyRun(build), { x, y, z, volley, dt, dy });
    if (outcome === 'hit' || outcome === 'miss') {
      shots++;
      if (outcome === 'hit') hit++;
    }
  }
  return { hit, shots };
}

/**
 * One engagement flown with nothing but the painted screen to aim by.
 *
 * `engage` above steers to the target's column off toScreen, which is fair -
 * a column is countable on the screen - but takes the target's height straight
 * out of `o.y`, and no player has that. Here both axes are read off the
 * rendered buffer: the ship is its nose glyph, the target is the red block,
 * and the height is the middle of the tunnel rather than anything the target
 * discloses. What is left is the vertical error a player cannot help carrying.
 */
function engageByEye(build, screen, { x, y, z, holdRow }) {
  const game = emptyRun(build);
  const s = game.state;
  stageTarget(s, x, y, z);
  let fired = false;

  for (let frame = 0; frame < 800; frame++) {
    build.renderGame(screen, s);
    const keys = {};
    const justPressed = {};
    if (!fired) {
      const ship = seeShip(screen);
      const block = seeBlock(build, screen);
      if (!ship || !block) { game.update(FRAME, {}, {}); continue; }
      if (ship.col < block.col) keys.D = true;
      else if (ship.col > block.col) keys.A = true;
      if (ship.row > holdRow) keys.W = true;
      else if (ship.row < holdRow) keys.S = true;
      if (ship.col === block.col && ship.row === holdRow) {
        justPressed.SPACE = true;
        fired = true;
      }
    } else if (x >= 0) {
      keys.A = true;
    } else {
      keys.D = true;
    }

    const shieldBefore = s.shield;
    const bulletsBefore = s.bullets.length;
    const zBefore = s.obstacles[0].z;
    game.update(FRAME, keys, justPressed);
    if (s.mode === 'dead') return 'dead';
    if (s.obstacles[0].z < zBefore - 100) {
      if (s.shield < shieldBefore) return 'ram';
      return s.bullets.length < bulletsBefore ? 'hit' : 'miss';
    }
    if (fired && s.bullets.length === 0) return 'miss';
    if (!fired && s.obstacles[0].z > 8) return 'no-shot';
  }
  return 'timeout';
}

/** The same walk of placements as `sweep`, flown by eye. */
function sweepByEye(build, { near, far, count = 40 }) {
  const screen = new build.ScreenBuffer(W, H);
  const holdRow = middleHullRow(build);
  let hit = 0;
  let shots = 0;
  for (let i = 0; i < count; i++) {
    const x = -4.5 + (9 * i) / (count - 1);
    const y = 0.5 + (4 * ((i * 7) % count)) / (count - 1);
    const z = -(near + ((far - near) * ((i * 13) % count)) / (count - 1));
    const outcome = engageByEye(build, screen, { x, y, z, holdRow });
    if (outcome === 'hit' || outcome === 'miss') {
      shots++;
      if (outcome === 'hit') hit++;
    }
  }
  return { hit, shots, holdRow };
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

  test(`${build.name}: a volley aimed at nothing but the screen still lands`, () => {
    // Every rate above reads the target's height out of the world to aim with.
    // This one reads the screen: the hull is found by its nose glyph, the
    // target by its red block, and the height is simply the middle of the
    // tunnel, which is the only standing guess the screen supports. That makes
    // it the closest thing the suite has to the complaint the slack answers -
    // a shot the player believes is lined up, missing anyway.
    //
    // Walked with SHOT_SLACK_ROWS back at 0, this sweep landed 35/39 at 35 to
    // 80 and 31/39 at 80 to 140. With the row of slack in it lands 39 of 39 in
    // both bands, and did so on eight runs in a row: the placements are walked
    // and the outcome does not move, so the floors below are margin rather than
    // noise.
    for (const band of [
      { near: 35, far: 80, floor: 0.95 },
      { near: 80, far: 140, floor: 0.9 },
    ]) {
      const { hit, shots, holdRow } = sweepByEye(build, band);
      assert.ok(shots > 20, `${band.near}-${band.far}: only ${shots} shots resolved`);
      assert.ok(
        hit / shots >= band.floor,
        `${band.near}-${band.far} out, flown by eye from hull row ${holdRow}: ` +
        `${hit}/${shots} landed, wanted ${band.floor * 100}%`
      );
    }
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

  // What the renderer actually put on the screen for a volley fired from a
  // given column: how many frames carried a tracer, which cells it used, and
  // how far up the screen it climbed. The checks above ask toScreen where the
  // shot is; this reads the grid, which is all the player has to aim by, and
  // drawBullets could round, clip or drop a column without the state saying so.
  const flyTracer = (shipX) => {
    const game = emptyRun(build);
    const s = game.state;
    s.shipX = shipX;
    s.shipY = 0;

    const screen = new build.ScreenBuffer(W, H);
    game.update(FRAME, {}, { SPACE: true });
    build.renderGame(screen, s);

    const columns = new Set();
    const cells = [];
    let drawn = 0;
    let live = 0;
    let lastDrawnFrame = -1;
    let firstRow = null;
    let lastRow = null;

    for (let frame = 0; frame < 70 && s.bullets.length; frame++) {
      live++;
      const frameCells = tracerCells(build, screen);
      if (frameCells.length) {
        drawn++;
        lastDrawnFrame = frame;
        for (const cell of frameCells) {
          columns.add(cell.x);
          cells.push(cell);
        }
        lastRow = Math.min(...frameCells.map((cell) => cell.y));
        if (firstRow === null) firstRow = lastRow;
      }
      game.update(FRAME, {}, {});
      build.renderGame(screen, s);
    }

    return { columns, cells, drawn, live, lastDrawnFrame, firstRow, lastRow };
  };

  // A shot holds its firing column while the drawn tunnel converges on the
  // vanishing point, so how much of a flight is drawn depends on where it was
  // fired from: down the middle it is drawn the whole way, and the nearer the
  // wall the sooner it crosses out of the corridor and stops being drawn. 4.5
  // is the outermost column a target spawns in, 6.5 the wall the ship is held
  // at - a shot from there can reach nothing, and now says so.
  //
  // The two sides carry their own figures, because they are not mirrors. The
  // corridor is symmetric about floor(w / 2) while the projection floors a
  // continuous column, so a shot at -x sits a column further out than one at
  // +x and reaches the wall that much sooner: 40 frames drawn against 46 from
  // 4.5, and 11 against 17 from the wall. drawBullets says why rounding that
  // away costs more than it buys.
  //
  // Every flight climbs, the left wall's least of all. Read off the grid at
  // 80x24, both builds alike, its 11 drawn frames carry topmost tracer rows of
  // 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18 - one row gained before the clip
  // takes it, against 2 rows over 17 frames from the right wall and 10 over 59
  // down the middle. So its floor is the climb itself with nothing to spare,
  // where the others keep a row or two in hand. A floor of 0 there is no floor
  // at all: firstRow - lastRow cannot go below zero, so a 0 passes a tracer
  // drawn on a single row, and passes one never drawn at all, where both ends
  // stay null and null - null is 0. Only minDrawn beside it would still fail.
  const TRACER_FLIGHTS = [
    { shipX: 0, minDrawn: 55, minClimb: 8 },
    { shipX: -4.5, minDrawn: 36, minClimb: 4 },
    { shipX: 4.5, minDrawn: 42, minClimb: 5 },
    { shipX: -6.5, minDrawn: 9, minClimb: 1 },
    { shipX: 6.5, minDrawn: 14, minClimb: 1 },
  ];

  test(`${build.name}: the tracer is drawn as one column inside the play area`, () => {
    // Fired from both walls as well as the centre, since the drift the column
    // fix removed was widest at the edges.
    for (const { shipX, minDrawn, minClimb } of TRACER_FLIGHTS) {
      const flight = flyTracer(shipX);

      for (const cell of flight.cells) {
        assert.ok(
          cell.y >= HUD_ROWS && cell.y < H - FOOTER_ROWS,
          `fired from ${shipX}, a tracer was drawn at row ${cell.y}, ` +
          `outside the play area's rows ${HUD_ROWS} to ${H - FOOTER_ROWS - 1}`
        );
      }

      assert.ok(
        flight.drawn >= minDrawn,
        `fired from ${shipX}, the volley was drawn on only ${flight.drawn} frames`
      );
      // Three bullets, so three columns at the most, and fewer while the ship's
      // own glyphs still cover the muzzle. The same volley on a constant world
      // x walked through sixteen columns over this flight.
      assert.ok(
        flight.columns.size <= 3,
        `fired from ${shipX}, the volley was drawn across columns ` +
        `${[...flight.columns].sort((a, b) => a - b).join(', ')}`
      );
      assert.ok(
        flight.firstRow - flight.lastRow >= minClimb,
        `fired from ${shipX}, the tracer climbed only ` +
        `${flight.firstRow - flight.lastRow} rows`
      );
    }
  });

  test(`${build.name}: a tracer is never drawn on or past the tunnel wall`, () => {
    // Holding the firing column means a shot fired from near a wall crosses
    // that wall partway up, because the drawn tunnel converges and the shot
    // does not. Drawing it on past that left a cyan tracer climbing through
    // the black margin with the tunnel some distance to one side. It is also
    // where the shot stops being able to hit anything, since targets spawn no
    // further out than 4.5 and so sit inside this span at every depth.
    //
    // The bound is strict on both sides. tunnelSpan gives the columns the walls
    // are drawn on rather than the last columns of the corridor, so admitting
    // them put the tracer on the wall itself.
    for (const { shipX } of TRACER_FLIGHTS) {
      const flight = flyTracer(shipX);

      for (const cell of flight.cells) {
        const span = build.tunnelSpan(cell.y, HUD_ROWS, H - FOOTER_ROWS, W);
        assert.ok(
          cell.x > span.left && cell.x < span.right,
          `fired from ${shipX}, a tracer was drawn at column ${cell.x} on row ` +
          `${cell.y}, on or outside the tunnel walls at ${span.left} and ${span.right}`
        );
      }

      // Once dark it stays dark: the corridor only narrows as the shot climbs,
      // so a tracer coming back would mean the clip is reading the wrong row.
      assert.equal(
        flight.drawn, flight.lastDrawnFrame + 1,
        `fired from ${shipX}, the tracer went dark and came back`
      );
    }
  });

  test(`${build.name}: the tracer's dim upper half is clipped on its own row`, () => {
    // The checks above read the bright lower half, which is the glyph a player
    // aims by. The dim half is a row higher, where the corridor is narrower, so
    // it leaves the tunnel first and a clip that tested both halves against the
    // lower row would draw it in the margin with nothing above to say so.
    for (const { shipX } of TRACER_FLIGHTS) {
      const frames = tracerFrames(build, shipX);

      for (const [frame, cells] of frames.entries()) {
        for (const cell of cells.filter((c) => c.half === 'dim')) {
          const span = build.tunnelSpan(cell.y, HUD_ROWS, H - FOOTER_ROWS, W);
          assert.ok(
            cell.x > span.left && cell.x < span.right,
            `fired from ${shipX}, the dim half was drawn on frame ${frame} at column ` +
            `${cell.x} of row ${cell.y}, on or outside the walls at ${span.left} and ${span.right}`
          );
        }
      }

      // And neither half flickers: the corridor only narrows as a shot climbs.
      for (const half of ['bright', 'dim']) {
        const lit = frames.map((cells) => cells.some((c) => c.half === half));
        const first = lit.indexOf(true);
        if (first < 0) continue;
        assert.ok(
          lit.slice(first, lit.lastIndexOf(true) + 1).every(Boolean),
          `fired from ${shipX}, the ${half} half went dark and came back: ` +
          lit.map((on) => (on ? '#' : '.')).join('')
        );
      }
    }
  });

  test(`${build.name}: a tracer stays lit to the target it goes on to kill`, () => {
    // The clip is meant to fall outside the space targets occupy, so a shot
    // that lands has to be drawn the whole way there. A tracer that went dark
    // first and killed the target anyway would read as a miss that scored.
    //
    // Two of the three sit in the outermost column a target spawns in, where a
    // shot runs nearest the wall it is clipped against. A lone bullet is flown
    // rather than the volley, so the frames below belong to one shot, which
    // holds the placements inside the range a single shot is expected to land.
    for (const [x, y, z] of [[0, 2, -90], [4.5, 0.5, -50], [-4.5, 3, -60]]) {
      const game = emptyRun(build);
      const screen = new build.ScreenBuffer(W, H);
      const lit = [];
      const outcome = engage(game, {
        x, y, z, volley: false,
        watch: () => {
          build.renderGame(screen, game.state);
          lit.push(tracerCells(build, screen).length > 0);
        },
      });

      assert.equal(outcome, 'hit', `the shot at ${x},${y},${z} resolved as ${outcome}`);
      // The killing shot is spent during the frame that resolves it, so the
      // frame before is the last one that can carry its tracer - and does.
      assert.ok(
        lit[lit.length - 2],
        `the shot at ${x},${y},${z} was dark on the frame before it killed: ` +
        lit.map((on) => (on ? '#' : '.')).join('')
      );
      const first = lit.indexOf(true);
      assert.ok(
        lit.slice(first, lit.length - 1).every(Boolean),
        `the shot at ${x},${y},${z} went dark on the way to the target: ` +
        lit.map((on) => (on ? '#' : '.')).join('')
      );
    }
  });

  test(`${build.name}: a tracer never eats the wall it is clipped against`, () => {
    // The checks above ask where the tracer went; this asks what the wall looks
    // like while it goes there, which is the half a player actually sees. The
    // wall is one cell thick over the top two thirds of the screen and
    // drawBullets runs after drawTunnel, so a tracer allowed onto a wall column
    // did not ride the wall - it replaced it, and the hole climbed with the
    // shot. Fired from -4.5, frame 28 used to leave row 13 reading two bars
    // where the rows either side of it carried blocks.
    for (const { shipX } of TRACER_FLIGHTS) {
      const game = emptyRun(build);
      const s = game.state;
      s.shipX = shipX;
      s.shipY = 0;

      const screen = new build.ScreenBuffer(W, H);
      game.update(FRAME, {}, { SPACE: true });
      build.renderGame(screen, s);

      for (let frame = 0; frame < 70 && s.bullets.length; frame++) {
        for (let row = HUD_ROWS; row < H - FOOTER_ROWS; row++) {
          const span = build.tunnelSpan(row, HUD_ROWS, H - FOOTER_ROWS, W);
          for (const col of [span.left, span.right]) {
            const ch = screen.chars[row * W + col];
            assert.ok(
              WALL_CHARS.has(ch),
              `fired from ${shipX}, frame ${frame} left the wall column ${col} ` +
              `of row ${row} reading "${ch}" instead of a wall glyph`
            );
          }
        }
        game.update(FRAME, {}, {});
        build.renderGame(screen, s);
      }
    }
  });

  test(`${build.name}: clipping the tracer leaves the shot itself in flight`, () => {
    // The fix is a drawing one. The span the walls are drawn on runs a little
    // narrower than the tunnel radius projects to, so culling the bullet where
    // the tracer stops would cost real hits out at the far end - and the held
    // column is the aiming fix the hit rates depend on.
    const wall = flyTracer(-6.5);
    const centre = flyTracer(0);

    assert.equal(
      wall.live, centre.live,
      `a wall shot lived ${wall.live} frames against the centre shot's ${centre.live}`
    );
    assert.ok(
      wall.drawn < wall.live,
      `the wall shot was drawn on all ${wall.live} of its frames, so nothing was clipped`
    );
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

  test(`${build.name}: a shot inside the vertical slack does register`, () => {
    // The same pair of checks the columns get, on the axis the player cannot
    // read. Above the target and below it both, since the tracer is two rows
    // tall and the band is not symmetric about the glyph without the slack.
    const z = -60;
    for (const dir of [1, -1]) {
      const game = emptyRun(build);
      const s = game.state;
      stageTarget(s, 0, 2, z);

      const scale = game.projScale(z);
      const row = unitsPerRow(s, scale);
      const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);

      s.bullets = [{ x: 0, y: 2 + dir * (half + SHOT_SLACK_ROWS - 0.5) * row, z, life: 2 }];
      game.update(FRAME, {}, {});
      assert.ok(
        s.obstacles[0].z < z - 100,
        `a shot ${dir > 0 ? 'above' : 'below'} the target inside the slack should have landed`
      );
    }
  });

  test(`${build.name}: a shot wide of the vertical slack does not register`, () => {
    // A row of slack is not a licence to widen the target vertically either. A
    // shot a row past the band has to miss, or the constant can drift upward
    // unnoticed - which on this axis would go unseen for longer, because a row
    // out at 60 units is most of the height a target ever spawns at.
    const z = -60;
    for (const dir of [1, -1]) {
      const game = emptyRun(build);
      const s = game.state;
      stageTarget(s, 0, 2, z);

      const scale = game.projScale(z);
      const row = unitsPerRow(s, scale);
      const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);

      s.bullets = [{ x: 0, y: 2 + dir * (half + SHOT_SLACK_ROWS + 2) * row, z, life: 2 }];
      game.update(FRAME, {}, {});
      assert.equal(s.obstacles.length, 1, 'the target should still be there');
      assert.ok(
        s.obstacles[0].z > z - 100,
        `a shot ${dir > 0 ? 'above' : 'below'} the target and clear of the slack should have missed`
      );
    }
  });

  test(`${build.name}: a volley survives the vertical aim error a player cannot avoid`, () => {
    // The fault this slack answers. The ship's glyph and the target's move at
    // different scales, so the two never meet on a row and there is nothing on
    // screen to line up - all the player has is how high in the tunnel the
    // target looks. Out at 80 to 140 a row is about two world units of height,
    // so the errors below are a twentieth, a quarter and half of a row.
    //
    // Walked against the engine before the slack existed, this same sweep
    // landed 95%, 73% and 39% - half a row of vertical error costing more than
    // three whole columns of horizontal error did at the same range, on the one
    // axis the player has no way to measure.
    for (const dy of [0.1, 0.5, 1]) {
      const { hit, shots } = sweep(build, { near: 80, far: 140, dy });
      assert.ok(shots > 20, `dy ${dy}: only ${shots} shots resolved`);
      assert.ok(
        hit / shots >= 0.95,
        `aimed ${dy} of a world unit off, ${hit}/${shots} landed, wanted 95%`
      );
    }
  });

  test(`${build.name}: the vertical slack is a cell of forgiveness, not an aimbot`, () => {
    // The floor above would be met by removing the row test altogether, so the
    // ceiling here is what says the axis still counts for something. Measured
    // at 80 to 140, where a row is about two world units: a shot two units off
    // the target's height lands 68% of the time, three units off 22%, and four
    // units off - a target at the floor of the tunnel shot at from the roof -
    // never at all.
    const far = sweep(build, { near: 80, far: 140, dy: 4 });
    assert.equal(far.hit, 0, `aimed four world units off, ${far.hit}/${far.shots} still landed`);

    const wide = sweep(build, { near: 80, far: 140, dy: 3 });
    assert.ok(
      wide.hit / wide.shots <= 0.5,
      `aimed three world units off, ${wide.hit}/${wide.shots} landed, wanted no better than half`
    );
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

test('both builds draw the tracer on the same cells, frame for frame', () => {
  // The test above compares what the shots hit; this compares what they looked
  // like, which is the half of the port that a hit rate cannot speak for. The
  // clip is drawn from the same span the walls are, so the two builds have to
  // stop a tracer in the same place as well as land it in the same place.
  //
  // Fired from the centre, from the outermost column a target spawns in, and
  // from the wall the ship is held at, which is where the two spans differing
  // by a column would show first.
  for (const shipX of [0, -4.5, 4.5, -6.5, 6.5]) {
    const [terminal, browserDrawn] = BUILDS.map((build) => tracerFrames(build, shipX));
    assert.deepEqual(
      browserDrawn, terminal,
      `fired from ${shipX}, the two builds drew the tracer differently`
    );
  }
});
