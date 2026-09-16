// test/engagement.mjs — One pulse cannon engagement, flown at whatever grid the
// caller names.
//
// The tests and the probes fly the same flight out of this module. A figure a
// probe prints and a floor a test pins have to come from the same code, or the
// two drift and the repository ends up holding numbers nothing in it can
// reproduce. Everything here reports; the assertions stay in the test files and
// the printed tables stay in test/probes/. The floors those assertions pin are
// here too, because a probe prints them beside what it just measured and a
// probe printing a floor the suite does not pin is the same drift by another
// route.
//
// The grid is a parameter rather than a constant because the hit test is not
// size-neutral. Every figure this suite used to carry was taken at 80x24, and a
// browser window at the default font is nearer 205x50, so a check that only
// ever runs at 80x24 can pass while the game the player sees misses.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const { renderGame: terminalRender, tunnelSpan: terminalTunnelSpan } =
  require(join(REPO_ROOT, 'out', 'render.js'));
const terminalTypes = require(join(REPO_ROOT, 'out', 'types.js'));

const browser = loadBrowserEngine(fakeStorage());

export { FRAME };

/** Both engines, side by side, so every walk here is flown by each of them. */
export const BUILDS = [
  {
    name: 'terminal', Game: TerminalGame,
    ScreenBuffer: TerminalScreen, renderGame: terminalRender, C: terminalTypes.C,
    tunnelSpan: terminalTunnelSpan, shotSlackCols: terminalTypes.shotSlackCols,
  },
  {
    name: 'browser', Game: browser.Game,
    ScreenBuffer: browser.ScreenBuffer, renderGame: browser.renderGame, C: browser.C,
    tunnelSpan: browser.tunnelSpan, shotSlackCols: browser.shotSlackCols,
  },
];

/**
 * The grids an engagement is flown at.
 *
 * 80x24 is the terminal default, and every figure this repository used to quote
 * was taken there. 60x20 is the floor the browser build clamps a small window
 * to. 205x50 is the grid the screen capture behind the pulse cannon work was
 * played at: a full-screen browser window at the default font.
 */
export const GRIDS = [
  { name: '80x24', w: 80, h: 24 },
  { name: '60x20', w: 60, h: 20 },
  { name: '205x50', w: 205, h: 50 },
];

/**
 * The bands the aimed sweeps are pinned at, per grid.
 *
 * The floors differ by grid because the measurement does. A lone shot out at 80
 * to 140 lands 88% at 80x24, 93% at 60x20 and 67% at 205x50: the further a
 * flight runs the further a target's column creeps outward while it is in the
 * air, and that creep scales with `colRange`, which is 37 columns at 80 wide
 * and 99.5 at 205. The volley's own spread scales with the grid too and covers
 * it, which is why the volley band holds everywhere - and the volley is what a
 * player fires.
 *
 * `minShots` is the guard on the walk itself rather than a floor on the cannon.
 * Close in, most engagements end in a collision before the trigger is pulled,
 * and a wide grid rams more: lining up on a column is a finer movement when a
 * column is a smaller slice of the tunnel, so the ship takes longer to get
 * there. At 15 to 35 that leaves 23 engagements resolved at 80x24 and 12 at
 * 205x50, out of 60 flown.
 *
 * Every band carries a floor for every grid in `GRIDS` rather than one figure
 * and a set of exceptions, so a grid added without a floor fails the band
 * outright instead of passing it against `undefined`.
 */
export const AIMED_BANDS = [
  {
    name: '15 to 35', near: 15, far: 35, volley: false, minShots: 10,
    floors: { '80x24': 0.95, '60x20': 0.95, '205x50': 0.9 },
  },
  {
    name: '35 to 80', near: 35, far: 80, volley: false, minShots: 40,
    floors: { '80x24': 0.95, '60x20': 0.95, '205x50': 0.9 },
  },
  {
    name: '80 to 140', near: 80, far: 140, volley: false, minShots: 40,
    floors: { '80x24': 0.8, '60x20': 0.85, '205x50': 0.6 },
  },
];

/**
 * The volley a player actually fires, at the band where a lone shot falls off.
 *
 * Its own spread scales with the grid exactly as the column creep does, so this
 * is the one band whose floor is the same figure at every size.
 */
export const VOLLEY_BAND = {
  name: '80 to 140', near: 80, far: 140, volley: true, minShots: 40,
  floors: { '80x24': 0.95, '60x20': 0.95, '205x50': 0.95 },
};

/** The same walk flown with nothing but the painted screen to aim by. */
export const EYE_BANDS = [
  {
    name: '35 to 80', near: 35, far: 80, minShots: 30,
    floors: { '80x24': 0.95, '60x20': 0.95, '205x50': 0.95 },
  },
  {
    name: '80 to 140', near: 80, far: 140, minShots: 30,
    floors: { '80x24': 0.9, '60x20': 0.9, '205x50': 0.9 },
  },
];

/** Read a grid back out of a `WxH` string, for a probe's command line. */
export function parseGrid(text) {
  const match = /^(\d+)x(\d+)$/.exec(String(text).trim());
  if (!match) throw new Error(`not a grid: ${text}`);
  return { name: `${match[1]}x${match[2]}`, w: Number(match[1]), h: Number(match[2]) };
}

export const HUD_ROWS = 3;
export const FOOTER_ROWS = 2;
/** The squash toScreen puts on the tunnel's height, matching Y_FACTOR. */
export const Y_FACTOR = 0.4;

/** The ship's nose. Nothing else in the game draws it, so it locates the hull. */
export const NOSE = '▲';
/**
 * An obstacle's block, near and far. Red is what tells it from a tunnel wall,
 * which shares ▓, and from a mine, which blinks between ◈ and a grey ■.
 */
export const BLOCK_CHARS = new Set(['■', '▓']);

/** Everything drawTunnel is allowed to leave on a wall column. */
export const WALL_CHARS = new Set([
  '░', '▒', '▓', '█', // the four depths of block
  '╣', '╠', // the two ring ends
]);

/** The tracer's own glyph, which only drawBullets puts on the screen. */
const TRACER = '│';

/**
 * World units of height to one screen row at a given depth, which is what a row
 * of the grid is worth in the units a target is placed in. It is a fact about
 * the grid rather than a constant of the game: at 80x24 a row out at 80 to 140
 * units spans about two world units, and at 205x50 it spans about one.
 */
export function unitsPerRow(state, scale) {
  const gameH = state.screenHeight - HUD_ROWS - FOOTER_ROWS;
  return state.tunnelRadius / (gameH * Y_FACTOR * scale);
}

/** World units of width to one screen column at a given depth. */
export function unitsPerCol(state, scale) {
  return state.tunnelRadius / (((state.screenWidth - 6) / 2) * scale);
}

/** A run holding nothing but what a caller stages into it, at a given grid. */
export function emptyRun(build, grid = GRIDS[0]) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = grid.w;
  s.screenHeight = grid.h;
  s.stars = [];
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  s.bullets = [];
  s.particles = [];
  return game;
}

/** Shots the trigger raises at once. */
export const VOLLEY_SIZE = 3;

/**
 * The volley as `updatePlaying` pushes it: a centre shot at the muzzle and two
 * a quarter of a unit either side, half a unit nearer and a twentieth lower.
 *
 * Written down here because a kill can land on the very frame the trigger was
 * pulled - a tracer's upper half is drawn a row above the muzzle, and a far low
 * target can already be drawn there - and a reading taken at the top of that
 * frame finds no shot in the air to attribute it to.
 */
export function muzzleVolley(shipX, shipY) {
  return [
    { x: shipX, y: shipY, z: -2, life: 2 },
    { x: shipX - 0.25, y: shipY - 0.05, z: -1.5, life: 2 },
    { x: shipX + 0.25, y: shipY - 0.05, z: -1.5, life: 2 },
  ];
}

/** Park a single obstacle out in the tunnel and clear everything else away. */
export function stageTarget(state, x, y, z) {
  state.obstacles = [{ x, y, z, rot: 0, rotSpeed: 0, scale: 1 }];
  state.orbs = [];
  state.mines = [];
  state.particles = [];
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
export function tracerCells(build, screen, fg = build.C.BRIGHT_CYAN) {
  const w = screen.width;
  const out = [];
  for (let i = 0; i < screen.chars.length; i++) {
    if (screen.chars[i] !== TRACER) continue;
    if (screen.fg[i] !== fg || screen.bg[i] !== build.C.BLACK) continue;
    out.push({ x: i % w, y: Math.floor(i / w) });
  }
  return out;
}

/** Both halves of the tracer on one rendered frame, in a single pass. */
export function tracerCellsBothHalves(build, screen) {
  const w = screen.width;
  const out = [];
  for (let i = 0; i < screen.chars.length; i++) {
    if (screen.chars[i] !== TRACER || screen.bg[i] !== build.C.BLACK) continue;
    const fg = screen.fg[i];
    if (fg !== build.C.BRIGHT_CYAN && fg !== build.C.CYAN) continue;
    out.push({ x: i % w, y: Math.floor(i / w), half: fg === build.C.BRIGHT_CYAN ? 'bright' : 'dim' });
  }
  return out;
}

/** The ship's hull row and column, found on the painted screen by its nose. */
export function seeShip(screen) {
  const w = screen.width;
  for (let i = 0; i < screen.chars.length; i++) {
    if (screen.chars[i] === NOSE) return { col: i % w, row: Math.floor(i / w) + 1 };
  }
  return null;
}

/** Every cell of the target's drawn block, read off the painted screen. */
export function blockCells(build, screen) {
  const w = screen.width;
  const out = [];
  for (let i = 0; i < screen.chars.length; i++) {
    if (!BLOCK_CHARS.has(screen.chars[i])) continue;
    if (screen.fg[i] !== build.C.RED && screen.fg[i] !== build.C.BRIGHT_RED) continue;
    out.push({ x: i % w, y: Math.floor(i / w) });
  }
  return out;
}

/**
 * The cells `drawEntitiesFar` gives a target, before anything drawn after it
 * covers them over.
 *
 * `drawBullets`, `drawParticles` and `drawShip` all run after it, so the red
 * cells left on the finished screen can be fewer than the block the renderer
 * laid down. A reading that cannot see the whole block cannot say where the
 * tracer was relative to it, and this is what says so.
 */
export function drawnBlockCells(game, target) {
  const s = game.state;
  if (target.z < -s.maxViewZ || target.z > 5) return [];
  const gameTop = HUD_ROWS;
  const gameBottom = s.screenHeight - FOOTER_ROWS;
  const pos = game.toScreen(target.x, target.y, target.z);
  if (pos.row < gameTop || pos.row >= gameBottom) return [];
  const half = Math.floor(Math.max(1, Math.floor(pos.scale * 2.5)) / 2);
  const out = [];
  for (let dy = -half; dy <= half; dy++) {
    const y = pos.row + dy;
    if (y < gameTop || y >= gameBottom) continue;
    for (let dx = -half; dx <= half; dx++) {
      const x = pos.col + dx;
      if (x < 0 || x >= s.screenWidth) continue;
      out.push({ x, y });
    }
  }
  return out;
}

/**
 * The target's drawn block, as the middle of the red cells on the screen.
 *
 * One staged target is what the engagements below give it, so every red cell
 * on the screen belongs to that one block. A second obstacle arriving would
 * widen the box and pull the aim off, which the floors would catch.
 */
export function seeBlock(build, screen) {
  const cells = blockCells(build, screen);
  if (!cells.length) return null;
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  return {
    col: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    row: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
  };
}

/**
 * The hull row halfway up the ship's travel, measured by flying to each end of
 * it and reading the screen back. That is all a player has to find it with, and
 * it is where a run is spent: every target spawns in the same band of heights,
 * so the middle of the tunnel is the standing guess at where the next one is.
 */
export function middleHullRow(build, grid = GRIDS[0]) {
  const game = emptyRun(build, grid);
  const screen = new build.ScreenBuffer(grid.w, grid.h);
  const flyTo = (keys) => {
    for (let i = 0; i < 60; i++) game.update(FRAME, keys, {});
    build.renderGame(screen, game.state);
    return seeShip(screen).row;
  };
  return Math.round((flyTo({ W: true }) + flyTo({ S: true })) / 2);
}

/**
 * Fly one engagement the way a player flies it: steer until the ship's glyph
 * sits in the target's column and at the target's height in the tunnel, fire,
 * then peel off the collision course. A ram recycles the obstacle just as a
 * kill does, so the two are told apart by the shield - only a collision spends
 * it.
 *
 * `watch` is handed every frame once the trigger has been pulled, for a caller
 * that has to see what the engagement looked like rather than only how it
 * ended. `peek` is the same hook taken at the top of the frame instead of the
 * bottom, which is the only place a kill can still be read: the frame that
 * resolves one splices the shot and recycles the target inside itself.
 * `holdY` flies the ship at a fixed height instead of the target's, which is
 * how the capture behind this work was played: on the floor, lined up by
 * column and nothing else.
 */
export function engage(game, { x, y, z, dt = FRAME, volley = true, watch = null, peek = null, dy = 0, holdY = null }) {
  const s = game.state;
  stageTarget(s, x, y, z);
  let fired = false;

  for (let frame = 0; frame < 800; frame++) {
    const o = s.obstacles[0];
    const target = game.toScreen(o.x, o.y, o.z);
    const ship = game.toScreen(s.shipX, s.shipY, 0);
    // Where the player thinks the target's height is. `dy` is how far off that
    // reading sits, which is the error a shot has to survive.
    const aimY = holdY === null ? o.y + dy : holdY;

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
    // The volley's own spread hides an aiming fault the centre bullet would
    // show, so a caller can ask for the centre bullet alone.
    if (fired && !volley && s.bullets.length > 1) s.bullets.length = 1;

    const shieldBefore = s.shield;
    // What the frame about to run would leave in the air if nothing landed.
    // The trigger raises three shots inside that same frame, and the contact
    // rule lets a near target die on the frame it was fired at, so counting
    // only what was in the air beforehand reads that kill as a miss.
    const bulletsExpected = s.bullets.length + (justPressed.SPACE ? VOLLEY_SIZE : 0);
    const zBefore = o.z;
    if (fired && peek) peek();
    game.update(dt, keys, justPressed);
    if (fired && watch) watch();
    if (s.mode === 'dead') return 'dead';

    // A kill, a ram and simply sailing past the camera all recycle the
    // obstacle to the back of the tunnel. Only a ram spends shield, and only a
    // kill spends the shot that caused it.
    if (s.obstacles[0].z < zBefore - 100) {
      if (s.shield < shieldBefore) return 'ram';
      if (s.bullets.length < bulletsExpected) return 'hit';
      return 'miss';
    }
    if (fired && s.bullets.length === 0) return 'miss';
    if (!fired && s.obstacles[0].z > 8) return 'no-shot';
  }
  return 'timeout';
}

/**
 * The placement walk every sweep and probe flies, so a failure names one
 * placement and a figure can be rebuilt from the count and the band alone.
 * Walked rather than drawn at random for the same reason.
 */
export function walk(count, { near, far }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: -4.5 + (9 * i) / (count - 1),
      y: 0.5 + (4 * ((i * 7) % count)) / (count - 1),
      z: -(near + ((far - near) * ((i * 13) % count)) / (count - 1)),
    });
  }
  return out;
}

/** Every engagement across a spread of target positions at one range band. */
export function sweep(build, grid, { near, far, volley = true, dt = FRAME, dy = 0, count = 60, holdY = null }) {
  let hit = 0;
  let shots = 0;
  let rams = 0;
  for (const place of walk(count, { near, far })) {
    const outcome = engage(emptyRun(build, grid), { ...place, volley, dt, dy, holdY });
    if (outcome === 'ram') rams++;
    if (outcome === 'hit' || outcome === 'miss') {
      shots++;
      if (outcome === 'hit') hit++;
    }
  }
  return { hit, shots, rams };
}

/** Where a shot leaves the ship, matching the centre bullet of a volley. */
export const MUZZLE_Z = -2;

/**
 * Seconds a staged shot lives, against the two the trigger gives a real one.
 *
 * A staged shot is measuring the hit test rather than the cannon's reach, and a
 * shot whose life ran out on the very frame its target sailed past the camera
 * read as a kill for as long as the two were told apart by the bullet count.
 * Long enough that the life can never be what ends the flight keeps the two
 * questions separate.
 */
export const STAGED_LIFE = 10;

/**
 * The engagement replayed as geometry alone, with nothing registering.
 *
 * A staged shot has to be placed on the column the target is drawn in at the
 * moment the two meet on screen, and that is not the column it started in: a
 * target's column creeps outward for the whole flight. So the flight is walked
 * here first, off the projection alone, and the column it reports is what the
 * shot is then aimed at.
 */
export function ghostFlight(game, { x, y, targetZ, dt }) {
  const s = game.state;
  const advance = s.speed * 60 * dt;
  const travel = 60 * dt;
  let bz = MUZZLE_Z;
  let oz = targetZ;
  for (let frame = 0; frame < 400; frame++) {
    bz -= travel;
    oz += advance;
    if (oz > 5) return null;
    const bullet = game.toScreen(x, y, bz);
    const target = game.toScreen(x, y, oz);
    const half = Math.floor(Math.max(1, Math.floor(game.projScale(oz) * 2.5)) / 2);
    // Both halves of the tracer against the block's own rows, which is the
    // contact the hit test now takes.
    if (bullet.row >= target.row - half && bullet.row - 1 <= target.row + half) {
      return { col: target.col, bulletZ: bz, targetZ: oz, half };
    }
  }
  return null;
}

/**
 * One shot placed by hand rather than flown, so the ship is never in the way.
 *
 * It is aimed by screen contact: `ghostFlight` says where the target is drawn
 * on the frame the two meet, and the shot is held on that column, or one column
 * past everything the hit test allows. The ship is parked at the far wall so
 * nothing it does can register.
 */
export function stagedShot(build, grid, { x, y, targetZ, dt, aimedAt, aimDt = 1 / 60 }) {
  const game = emptyRun(build, grid);
  const s = game.state;
  stageTarget(s, x, y, targetZ);
  s.shipX = x >= 0 ? -6.5 : 6.5;
  s.shipY = 0;

  // The aim is taken at a fixed rate whatever rate the flight is then flown at,
  // so a walk across frame rates is one shot answered five times rather than
  // five different shots.
  const ghost = ghostFlight(game, { x, y, targetZ, dt: aimDt });
  if (!ghost) return 'no-contact';

  // A column of the grid, in the world units the bullet is placed in, at the
  // depth the two meet.
  const scale = game.projScale(ghost.bulletZ);
  const cell = unitsPerCol(s, scale);
  // A target's block widens as it closes, so a shot placed a column past what
  // the hit test allows at the contact depth is inside it again a few units
  // nearer. The widest the block ever gets is the figure to clear, and that is
  // its size at the near end of the draw distance.
  const widestHalf = Math.floor(Math.max(1, Math.floor(game.projScale(5) * 2.5)) / 2);
  const offset = aimedAt === 'target' ? 0 : widestHalf + build.shotSlackCols(grid.w) + 1;
  // The bullet holds the screen ray it was fired down, so the aim is set at the
  // contact depth and carried back to the muzzle by the ratio of the scales.
  const contactX = (x * game.projScale(ghost.targetZ)) / scale;
  const aim = (contactX + offset * cell) * scale;
  s.bullets = [{ x: aim / game.projScale(MUZZLE_Z), y, z: MUZZLE_Z, life: STAGED_LIFE }];

  // Long enough for the slowest case this is flown at: a target at 140 units,
  // closing at a little over 18 a second, at a sixtieth of a second a frame.
  for (let frame = 0; frame < 1200; frame++) {
    const zBefore = s.obstacles[0].z;
    const bulletsBefore = s.bullets.length;
    game.update(dt, {}, {});
    if (s.mode === 'dead') return 'dead';
    // Sailing past the camera recycles the obstacle exactly as a kill does, so
    // the shot going with it is what tells the two apart. `updateObstacles`
    // recycles past z = 10, so a frame that starts short of that and ends
    // recycled is a kill and nothing else - which matters because the two used
    // to be told apart by the bullet count alone, and a shot whose life ran out
    // on the very frame the target sailed past then read as a kill.
    if (s.obstacles[0].z < zBefore - 100) {
      if (zBefore > 0) return 'miss';
      return s.bullets.length < bulletsBefore ? 'hit' : 'miss';
    }
    if (s.bullets.length === 0) return 'miss';
  }
  return 'timeout';
}

/**
 * One engagement flown with nothing but the painted screen to aim by.
 *
 * `engage` above steers to the target's column off toScreen, which is fair - a
 * column is countable on the screen - but takes the target's height straight
 * out of `o.y`, and no player has that. Here both axes are read off the
 * rendered buffer: the ship is its nose glyph, the target is the red block, and
 * the height is the middle of the tunnel rather than anything the target
 * discloses.
 */
export function engageByEye(build, screen, { x, y, z, holdRow }) {
  const grid = { name: `${screen.width}x${screen.height}`, w: screen.width, h: screen.height };
  const game = emptyRun(build, grid);
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
    const bulletsExpected = s.bullets.length + (justPressed.SPACE ? VOLLEY_SIZE : 0);
    const zBefore = s.obstacles[0].z;
    game.update(FRAME, keys, justPressed);
    if (s.mode === 'dead') return 'dead';
    if (s.obstacles[0].z < zBefore - 100) {
      if (s.shield < shieldBefore) return 'ram';
      return s.bullets.length < bulletsExpected ? 'hit' : 'miss';
    }
    if (fired && s.bullets.length === 0) return 'miss';
    if (!fired && s.obstacles[0].z > 8) return 'no-shot';
  }
  return 'timeout';
}

/** The same walk of placements as `sweep`, flown by eye. */
export function sweepByEye(build, grid, { near, far, count = 40 }) {
  const screen = new build.ScreenBuffer(grid.w, grid.h);
  const holdRow = middleHullRow(build, grid);
  let hit = 0;
  let shots = 0;
  let rams = 0;
  for (const place of walk(count, { near, far })) {
    const outcome = engageByEye(build, screen, { ...place, holdRow });
    if (outcome === 'ram') rams++;
    if (outcome === 'hit' || outcome === 'miss') {
      shots++;
      if (outcome === 'hit') hit++;
    }
  }
  return { hit, shots, rams, holdRow };
}

/**
 * How close a frame's tracer came to the block the renderer drew: `on` a cell
 * of it, `beside` it within the grid's column slack, or `clear` of it.
 *
 * `hidden` is the fourth answer and not a degree of the other three: the target
 * was drawn on cells the ship then drew over, so the frame has nothing to read.
 * The ship sits where the tunnel's near end sits, so a target low and far can
 * project into the hull, and calling that `clear` would score a kill against a
 * block the reading could never have found.
 */
export function contactOf(tracer, block, slack) {
  if (!block.length) return 'hidden';
  if (!tracer.length) return 'clear';
  const on = new Set();
  const rows = new Map();
  for (const c of block) {
    on.add(`${c.x},${c.y}`);
    if (!rows.has(c.y)) rows.set(c.y, []);
    rows.get(c.y).push(c.x);
  }
  let beside = false;
  for (const t of tracer) {
    if (on.has(`${t.x},${t.y}`)) return 'on';
    const cols = rows.get(t.y);
    if (cols && cols.some((c) => Math.abs(c - t.x) <= slack)) beside = true;
  }
  return beside ? 'beside' : 'clear';
}

/**
 * The nearer of two contact readings, `on` beating `beside` beating `clear`
 * beating `hidden` - a frame with nothing to read losing to one that had the
 * block in view and found the tracer clear of it.
 */
export function closerContact(a, b) {
  const rank = { on: 3, beside: 2, clear: 1, hidden: 0 };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * One engagement flown and watched cell by cell: what the renderer drew, and
 * what the engine registered, on every frame from the trigger to the verdict.
 *
 * This is the measurement the pulse cannon work turns on. A kill is only honest
 * if the tracer was on the block the screen drew, and a tracer on that block is
 * only honest if the target then dies, so both halves are counted here rather
 * than inferred from a hit rate.
 *
 * `drawBullets` runs after `drawEntitiesFar` and overwrites the cells it stands
 * on, so the block is read from a render with the bullet list emptied and the
 * tracer from the render the player would have seen.
 *
 * The kill frame is rebuilt rather than read. `updateBullets` splices the
 * killing shot and recycles the target inside the frame that resolves them, so
 * a render taken afterwards shows neither and every kill looks unseen - while a
 * render taken before shows a tracer that still has most of a frame to travel.
 * So the frame is captured at its top, stepped forward by the same arithmetic
 * the engine steps it by, and drawn: `s.speed` is set once a frame and then
 * used for `advance`, so reading it back after the update gives the figure the
 * frame actually ran on.
 */
export function watchEngagement(build, grid, { x, y, z, volley = true, dt = FRAME, holdY = null }) {
  const game = emptyRun(build, grid);
  const s = game.state;
  const screen = new build.ScreenBuffer(grid.w, grid.h);
  const slack = build.shotSlackCols(grid.w);

  let drawnThrough = false;
  let snapshot = null;
  let lastDrawn = 'clear';
  // Where the trigger was pulled from, for the one frame where the shot that
  // lands was also raised. Read at the bottom of the frame, which is where the
  // ship already was when `updatePlaying` pushed the volley.
  let muzzle = null;

  /**
   * Where the tracer stood against the block on one frame, or `hidden` when the
   * frame cannot answer: the hull and the debris are drawn after the block, and
   * a target low and far projects into both.
   */
  const read = (target) => {
    const held = s.bullets;
    s.bullets = [];
    build.renderGame(screen, s);
    const block = blockCells(build, screen);
    s.bullets = held;
    build.renderGame(screen, s);
    const tracer = tracerCellsBothHalves(build, screen);
    const seen = contactOf(tracer, block, slack);
    // A tracer found on a cell that is still showing settles the question
    // whatever else is covered. Only a reading that found nothing has to say
    // whether it could have.
    if (seen !== 'clear') return seen;
    return block.length < drawnBlockCells(game, target ?? { x: 0, y: 0, z: 1e9 }).length
      ? 'hidden'
      : 'clear';
  };

  const outcome = engage(game, {
    x, y, z, volley, dt, holdY,
    peek: () => {
      lastDrawn = read(s.obstacles[0]);
      if (lastDrawn === 'on') drawnThrough = true;
      snapshot = {
        bullets: s.bullets.map((b) => ({ x: b.x, y: b.y, z: b.z })),
        obstacles: s.obstacles.map((o) => ({ ...o })),
      };
    },
    watch: () => {
      if (snapshot && !snapshot.bullets.length && !muzzle) {
        muzzle = { x: s.shipX, y: s.shipY };
      }
    },
  });

  let killContact = null;
  let killGapZ = null;
  let targetY = null;

  if (outcome === 'hit' && snapshot) {
    const advance = s.speed * 60 * dt;
    const travel = 60 * dt;
    // The shot holds its screen ray, so x is carried forward by the ratio of
    // the two scales exactly as updateBullets carries it.
    const raised = snapshot.bullets.length
      ? snapshot.bullets
      : (muzzle ? muzzleVolley(muzzle.x, muzzle.y) : []);
    const stepped = raised.map((b) => {
      const bz = b.z - travel;
      return { x: (b.x * game.projScale(b.z)) / game.projScale(bz), y: b.y, z: bz, life: 1 };
    });
    // Whatever is still in flight after the frame survived it, so what is left
    // is the shot that landed.
    const survived = (b) => s.bullets.some(
      (alive) => Math.abs(alive.x - b.x) < 1e-9 && Math.abs(alive.y - b.y) < 1e-9
        && Math.abs(alive.z - b.z) < 1e-9
    );
    const killer = stepped.filter((b) => !survived(b));
    const target = { ...snapshot.obstacles[0], z: snapshot.obstacles[0].z + advance };

    s.obstacles = [target];
    s.bullets = killer;
    // The kill spawned its explosion inside the same frame, and drawParticles
    // runs after drawEntitiesFar - so at long range, where the block is a single
    // cell, the debris covers the very cell this reading is about.
    s.particles = [];
    // The kill frame or the one before: a shot can meet a block part way
    // through a frame, on a step the sweep tests and neither end of the frame
    // draws, so the closer of the two readings is the honest one.
    killContact = closerContact(read(target), lastDrawn);
    if (killer.length) killGapZ = killer[0].z - target.z;
    targetY = target.y;
  } else if (snapshot && snapshot.obstacles.length) {
    targetY = snapshot.obstacles[0].y;
  }

  return { outcome, drawnThrough, killContact, killGapZ, targetY, slack };
}
