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
    tunnelSpan: terminalTunnelSpan, tracerLit: terminalTypes.tracerLit,
    shotSlackCols: terminalTypes.shotSlackCols,
    seedRng: terminalTypes.seedRng,
  },
  {
    name: 'browser', Game: browser.Game,
    ScreenBuffer: browser.ScreenBuffer, renderGame: browser.renderGame, C: browser.C,
    tunnelSpan: browser.tunnelSpan, tracerLit: browser.tracerLit,
    shotSlackCols: browser.shotSlackCols,
    seedRng: browser.seedRng,
  },
];

/**
 * The frame rates every rate walk in this repository flies.
 *
 * A sixtieth is a fast machine, a thirtieth is what the game targets, and the
 * three below that are what a loaded machine or a background tab actually
 * hands the loop. A sixth of a second a frame is slower than anything the game
 * has been seen to run at and is the point of the list: it is where a reading
 * taken per frame stops agreeing with a reading taken per second, so anything
 * that has to hold at every rate fails here first.
 *
 * One list rather than three. The staged-shot walk, the free flight and the
 * frame-rate probe each used to carry their own copy, and a rate added to one
 * of them said nothing about the other two - which is how `freeFlight` came to
 * take a `dt` the suite never flew it at while the walk beside it went to a
 * sixth.
 */
export const FRAME_RATES = [1 / 60, 1 / 30, 1 / 20, 1 / 12, 1 / 6];

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
 * of it, `beside` it within the grid's column slack, `wide` of it, or `unlit` -
 * no tracer drawn at all.
 *
 * The last two used to share one `clear` bucket, and they are different faults.
 * `wide` is a shot the player watched go past: the bolt is on the screen, a
 * column or more off the block, and the block dies anyway. `unlit` is a shot
 * the player never saw at all - `drawBullets` clips the tracer at the corridor
 * wall and `contacts` does not, so a bolt whose column has left the tunnel is
 * drawn nowhere and still registers. One bucket could not tell which of the two
 * a kill belonged to, so the share that was the clip was not known.
 *
 * `hidden` is the fifth answer and not a degree of the others: the target was
 * drawn on cells something later drew over, so the frame has nothing to read.
 * The ship sits where the tunnel's near end sits, so a target low and far can
 * project into the hull, and calling that `wide` would score a kill against a
 * block the reading could never have found.
 */
export function contactOf(tracer, block, slack) {
  if (!block.length) return 'hidden';
  if (!tracer.length) return 'unlit';
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
  return beside ? 'beside' : 'wide';
}

/**
 * The nearer of two contact readings, `on` beating `beside` beating `wide`
 * beating `unlit` beating `hidden` - a frame with nothing to read losing to one
 * that had the block in view and found the tracer clear of it, and a tracer
 * drawn wide of the block beating one that was never drawn at all.
 */
export function closerContact(a, b) {
  const rank = { on: 4, beside: 3, wide: 2, unlit: 1, hidden: 0 };
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
  // The weakest reading there is short of one that could see nothing at all,
  // which is what a flight with no frame read yet has taken.
  let lastDrawn = 'unlit';
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
    if (seen === 'on' || seen === 'beside') return seen;
    return block.length < drawnBlockCells(game, target ?? { x: 0, y: 0, z: 1e9 }).length
      ? 'hidden'
      : seen;
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

/** A cell as a key, for the set arithmetic the free flight below runs on. */
const cellKey = (c) => `${c.x},${c.y}`;

/**
 * The colour an obstacle's own debris is thrown in, which is how the free
 * flight below tells a kill from the other two ways a block leaves the tunnel.
 *
 * A block goes three ways and all three look identical once the frame has
 * ended, because all three set `o.z` back by `RECYCLE_Z` and nothing records
 * which did it: shot down by `updateBullets`, rammed by `updateObstacles`, or
 * wrapped round after passing the ship. `updateObstacles` runs first, so a
 * reading that watches the depth alone scores a rammed block as a kill on any
 * frame that also spent a shot.
 *
 * The explosion says which. Only `updateBullets` throws debris in this colour;
 * a ram throws the damage colour, and a wrap throws none at all. The bursts are
 * also pushed in resolution order and nothing reorders `state.particles`, so
 * the order they appear in is the order the kills resolved in - which is what
 * pairs each kill to the shot that made it.
 */
const KILL_DEBRIS = 208;

/**
 * How many pieces a kill's burst is thrown in, which is what tells one kill's
 * debris from the next kill's.
 *
 * The count is fixed - `updateBullets` spawns this many on every kill and no
 * other number - and `spawnParticles` pushes a whole burst in one loop, so the
 * frame's fresh kill debris is its bursts laid end to end, this many at a time,
 * in the order the kills resolved. A ram and an orb throw their debris in other
 * colours and a mine's is pushed whole like this one, so filtering on the
 * colour leaves the kill bursts contiguous and in order.
 *
 * The boundary is counted rather than read off the positions, because the two
 * blocks that have to be told apart are the two a frame shot, and those are the
 * closest together of any pair on the screen: the pilot closes on the nearest
 * drawn block's column before it fires, so a frame that kills twice usually
 * kills twice down the same column. Measured over 60 flights of the matrix,
 * adjacent bursts came as close as 0.19 units on every axis at once - the
 * whole of a slow frame's drift budget and about two frames of a fast one, per
 * `debrisDrift` below - so grouping the debris by where it landed merged those
 * two kills into one, dropped a kill, and handed the remainder that `rams` is
 * taken as a ram that never happened. Counting the boundary instead is what
 * makes it a rate the reading does not have to know.
 */
const KILL_DEBRIS_COUNT = 12;

/**
 * How far a piece of debris can be from the block it came off, one frame on.
 *
 * `spawnParticles` puts a whole burst on the block's own position, and the
 * frame then moves every particle once before anything can read it, so the
 * piece this module reads a burst's position off has drifted from the block by
 * one frame of its own velocity. That is a function of the frame, not a
 * constant: at a thirtieth of a second the drift is under a tenth of a unit on
 * each axis, and at a sixth it is half a unit across and better than three
 * quarters deep.
 *
 * So the bound is derived from the frame rather than fixed. It was fixed at
 * half a unit, which is one frame of drift at a thirtieth with room over and
 * less than one frame of it at a sixth: the z term alone clears half a unit on
 * its own once `dt` passes about a seventh, the burst then names no block, and
 * the kill goes unread. Flown over the whole matrix that left 83% of kills
 * unpaired at a sixth of a second a frame against 2% to 4% at the rates above
 * it.
 *
 * Deriving it means restating what `spawnParticles` draws and what
 * `updateParticles` does with it, which the fixed bound was written to avoid.
 * That trade is the right way round, and the pairing is not what makes it
 * safe. It catches a restatement gone too tight, loudly and at every rate at
 * once: the window then reaches nothing and the kills go unread. It is blind
 * to one gone too loose, which is what a narrowing in `spawnParticles` leaves
 * behind - flown with all three numbers widened tenfold, to 30 on x and y and
 * -10 to 20 on z, the seeded matrix still cleared every floor the flight pins,
 * with no `unlit` at any grid.
 *
 * So the numbers are pinned to the engine by a check rather than by this
 * comment. `killBurst` below draws a burst out of a build, and the suite
 * asserts every piece of it sits inside this window and that the pieces reach
 * both ends - so `spawnParticles` moving either way fails on an assertion.
 *
 * The z window is one-sided because the drift is. A burst is spawned at the
 * depth `updateObstacles` left the block at and then carried forward by the
 * frame's own advance on top of its own `vz`, so it can only sit deeper than
 * the block by between `(vzMin + advance) * dt` and `(vzMax + advance) * dt`.
 * Bounding that window rather than its magnitude keeps the bound tight as the
 * frame grows, which is what leaves room for a second block beside the first.
 *
 * This bounds a burst against its own block and nothing else. It is not what
 * separates one burst from the next, which is counted: see
 * `KILL_DEBRIS_COUNT`. A burst that fails to name exactly one block is still
 * counted as unpaired rather than guessed at - `unnamed` where the window
 * reached nothing and `ambiguous` where it reached more than one.
 */
const DEBRIS_VXY = 3;
const DEBRIS_VZ_MIN = -1;
const DEBRIS_VZ_MAX = 2;

/** Room for the float error in carrying a position through a frame. */
const DRIFT_SLACK = 1e-9;

/** The window one frame of drift can put between a burst and its own block. */
const debrisDrift = (dt, advance) => ({
  xy: DEBRIS_VXY * dt + DRIFT_SLACK,
  zMin: (DEBRIS_VZ_MIN + advance) * dt - DRIFT_SLACK,
  zMax: (DEBRIS_VZ_MAX + advance) * dt + DRIFT_SLACK,
});

/** Whether a burst and a block are close enough to be the same block. */
const nearby = (burst, block, drift) => Math.abs(burst.x - block.x) <= drift.xy
  && Math.abs(burst.y - block.y) <= drift.xy
  && burst.z - block.z >= drift.zMin
  && burst.z - block.z <= drift.zMax;

/**
 * How close a drawn burst has to come to each end of the window above.
 *
 * The inside half of the check is the easy half: a piece of debris outside the
 * window is one the engine draws and `debrisDrift` does not allow, and one
 * burst is enough to see it. The outside half is what the pairing could never
 * see - a `spawnParticles` narrowed to draw inside a window this module still
 * believes is wide - and seeing that takes the draw coming near enough to each
 * end that a narrowing would pull it away.
 *
 * `BURST_DRAWS` uniform draws leave the extreme about a `BURST_DRAWS`th of the
 * span short of the end, which is under five thousandths of a unit on x and y
 * and half that on z. Measured at the seed below, the worst of the six ends
 * came 0.0077 short. The tolerance is six times that, so the check has room
 * against the arithmetic and still fails on any narrowing worth the name: the
 * draw narrowed to 2 on x and y and -0.5 to 1 on z misses by two units.
 */
export const BURST_REACH = 0.05;

/**
 * Pieces drawn for the check, which is a hundred kills' worth of debris.
 *
 * Seeded, so the figure above is arithmetic rather than a sample: the same
 * hundred bursts every time, and the same ones in both builds, which is the
 * draw parity `test/parity.test.mjs` pins separately.
 *
 * The seed is this check's own rather than one of `FREE_SEEDS`. Those name
 * worlds a flight is flown in, and this flies nothing - it draws velocities
 * with no run around them, so the two have nothing to hold in common and a
 * shared number would only read as though they did.
 */
const BURST_DRAWS = 100 * KILL_DEBRIS_COUNT;
const BURST_SEED = 424242;

/**
 * A kill's debris, drawn out of a build with nothing else running.
 *
 * `updateBullets` is not asked for one, because a kill needs a block, a shot
 * and a frame, and a frame moves the debris before anything can read it - the
 * velocities are what this reads, and they are gone by then. `spawnParticles`
 * is called directly instead, on the run's own state, which is the same call a
 * kill makes and the one the numbers above restate.
 */
export function killBurst(build, { count = BURST_DRAWS, seed = BURST_SEED } = {}) {
  build.seedRng(seed);
  try {
    const game = new build.Game();
    game.state.particles = [];
    game.spawnParticles(0, 0, 0, KILL_DEBRIS, count);
    return game.state.particles;
  } finally {
    build.seedRng(null);
  }
}

/** What each of a burst's velocities has to sit inside, and reach the ends of. */
export const DEBRIS_DRAWN = [
  { axis: 'vx', min: -DEBRIS_VXY, max: DEBRIS_VXY },
  { axis: 'vy', min: -DEBRIS_VXY, max: DEBRIS_VXY },
  { axis: 'vz', min: DEBRIS_VZ_MIN, max: DEBRIS_VZ_MAX },
];

/**
 * The kill bursts one frame added to `state.particles`, in resolution order.
 *
 * Every particle spawned this frame outlives it - `life` starts at 0.3 at the
 * least, against a frame of a thirtieth - so the frame's own bursts are all
 * still there, in the order they were pushed, with the older ones the caller
 * already held ahead of them.
 */
function killBurstsSince(particles, before) {
  const fresh = [];
  for (const p of particles) {
    if (!before.has(p) && p.color === KILL_DEBRIS) fresh.push(p);
  }
  const out = [];
  for (let i = 0; i + KILL_DEBRIS_COUNT <= fresh.length; i += KILL_DEBRIS_COUNT) {
    out.push({ x: fresh[i].x, y: fresh[i].y, z: fresh[i].z });
  }
  return out;
}

/**
 * How often the flight below pulls the trigger, in seconds.
 *
 * The engine puts no cooldown on the trigger - the rate is whatever the player
 * can tap - so the figure is taken from the one place the game fires itself:
 * chaos mode's auto-fire. It is fast enough that volleys overlap in the air,
 * which is the condition a staged engagement never produces.
 */
export const FREE_FIRE_INTERVAL = 0.12;

/**
 * The worlds the flight is flown in.
 *
 * The flight used to fly whatever `startGame` drew from an unseeded
 * `Math.random`, so every pass flew a different run and no figure taken off
 * it was reproducible: the numbers quoted in the checks below, in
 * `test/probes/free-flight.mjs` and in the changelog were each one draw, and
 * the first rerun fell outside them. Widening them into spreads over a stated
 * number of passes did not settle it either - two ten-pass runs of the whole
 * matrix disagreed with each other, so no number of passes quoted that way
 * ever would.
 *
 * Seeding settles it. Each of these is a fixed world: the same sixty
 * obstacles, the same orbs among them, the same mine timers, drawn in the
 * same order by both builds. A figure off one of them is arithmetic, and a
 * spread over all of them is arithmetic too - the same spread every time,
 * rebuilt by running the probe rather than remembered from the day it was
 * taken.
 *
 * The values are arbitrary and their only property is being written down.
 * The suite flies the first of them, which is one world per check and the
 * same coverage an unseeded pass gave; the probe flies all of them, which is
 * where the breadth the old pass count was reaching for now lives.
 */
export const FREE_SEEDS = [20260919, 7, 4242, 31337, 900001];

/**
 * Frames a flight runs, matching the length the browser verification flew.
 *
 * `FREE_RATE_FRAMES` is what the rate walk flies instead, at five rates rather
 * than one. Half the length keeps that walk inside a couple of seconds, and it
 * costs nothing it was measuring: the slow rates cover more ground per frame,
 * so the short flight still lands hundreds of kills where it matters.
 *
 * Both live here rather than in the test and the probe separately, for the
 * reason at the top of this file - a probe printing a different flight from
 * the one the suite pins prints a figure the suite cannot be checked against.
 */
export const FREE_FRAMES = 1200;
export const FREE_RATE_FRAMES = 600;

/**
 * The ship heights a flight is flown at: the floor, and the ceiling the tunnel
 * clamps the ship to.
 *
 * Here for the same reason `FREE_FRAMES` is, and it is the same drift. Every
 * figure the probe prints for the flight is summed over these two heights and
 * every floor the suite pins is read against them, so a copy in each file
 * means a height changed in one of them prints a flight the other does not
 * fly - and nothing says so, because both still run.
 *
 * `HEIGHTS` in `test/probes/frame-rate.mjs` is a different pair and stays
 * where it is: that walk is a staged shot rather than a flight, and its
 * heights belong to it.
 */
export const FREE_HEIGHTS = [0, 6.5];

/**
 * A real run, flown for a stretch, with every frame rendered and read.
 *
 * Every other engagement in this module stages its world: one target parked in
 * an emptied run, the ship steered onto it, one volley in the air. That is the
 * right shape for a rate - it isolates the shot from everything else - and the
 * wrong shape for the invariant, because the fault the screen-space hit rule
 * answers was found in free flight, with sixty obstacles in the air and volleys
 * overlapping. A guard that only ever flies a staged engagement leaves the
 * shape the fault was found in unchecked.
 *
 * So this flies the run the game actually starts: `startGame` with no debug
 * mode, which puts sixty obstacles and the orbs among them into the tunnel, and
 * then plays it - hold a height, line up on a block's drawn column read off the
 * rendered buffer, fire on the interval, and render every frame.
 *
 * Two things are read off each frame, and both are anchored to the screen:
 *
 * - **Ignored contacts.** A tracer drawn on a block, where that same block is
 *   still there the frame after with that same shot still in the air. The pair
 *   is the rule `updateBullets` states failing in front of the player, and the
 *   sweep in `contacts` tests exactly the frame that was drawn - its first
 *   sample is where the two stood when the frame was painted - so there is no
 *   slack in the reading to argue about.
 * - **Kill contacts.** Where the killing shot's tracer stood against the block
 *   it killed, on the frame the kill resolved or the frame before, by
 *   `contactOf`'s reading. The kill frame is rebuilt rather than read, for the
 *   reason `watchEngagement` gives: the frame that resolves a kill splices the
 *   shot and recycles the target inside itself, so a render taken afterwards
 *   shows neither.
 *
 * A kill is paired to the shot that made it before either reading is taken,
 * because a crowded frame spends several shots and a reading taken across all
 * of them credits one shot's contact to another shot's kill. The pairing is the
 * frame's own resolution order rather than a guess at it: `updateBullets` walks
 * the bullets from the end and stops on the first obstacle each registers
 * against, and every kill spawns its debris where it resolved, so the kill
 * bursts in `state.particles` are the kills in bullet order. Walk the spent
 * shots from the end alongside them and the pairing falls out.
 *
 * It falls out on every frame that spent its shots on obstacles, which is all
 * but a handful: a shot can also be spent on a mine, and a mine's burst is the
 * same colour as several others, so a frame that spends more shots than it
 * landed kills cannot say which shot went where. Those kills are counted in
 * `unpaired` and left unread rather than read against the wrong shot.
 *
 * `crowdedContacts` is the pairing's own guard: the same verdicts again, over
 * the kills whose frame spent more than one shot. Those are the only kills a
 * pairing can get wrong - a frame that spent one shot pairs the same way
 * however the spent shots are walked - and they are a tenth of the kills, so
 * a pairing fault barely moves `killContacts` while it halves this.
 *
 * The world is seeded, so the flight is the same flight every time it is
 * flown: `seed` pins every draw the engine makes for the length of the run
 * and hands the engine back to `Math.random` on the way out, so nothing
 * flown after it inherits the seed. Passing `null` flies an unseeded run,
 * which is a sample rather than a measurement and is not what any figure in
 * this repository is quoted from.
 *
 * Three things are held steady, and each is presentation or bookkeeping rather
 * than anything the hit test reads. The starfield is emptied, because it is
 * seeded from Math.random in each build independently. The shake is held at
 * zero, because the two builds apply it differently - the CLI build shifts the
 * grid's play area by whole columns and the browser build translates the
 * finished canvas - so a jolt would move the drawn cells in one build and not
 * in the other. And the shield is topped up at the top of every frame, so a
 * flight runs its full length rather than ending on the first run of bad luck:
 * chasing a block down its own column is a collision course by construction.
 */
export function freeFlight(build, grid, {
  frames = 600, holdY = 0, dt = FRAME, fireInterval = FREE_FIRE_INTERVAL,
  seed = FREE_SEEDS[0],
} = {}) {
  build.seedRng(seed);
  try {
    return flyFreely(build, grid, { frames, holdY, dt, fireInterval, seed });
  } finally {
    build.seedRng(null);
  }
}

/** The flight itself, with the seed already in force. */
function flyFreely(build, grid, { frames, holdY, dt, fireInterval, seed }) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = grid.w;
  s.screenHeight = grid.h;
  s.stars = [];
  s.shipY = holdY;

  const screen = new build.ScreenBuffer(grid.w, grid.h);
  const scratch = new build.ScreenBuffer(grid.w, grid.h);
  const slack = build.shotSlackCols(grid.w);
  const gameTop = HUD_ROWS;
  const gameBottom = grid.h - FOOTER_ROWS;

  const report = {
    frames: 0, volleys: 0, kills: 0, rams: 0,
    unpaired: 0, unpairedMine: 0, unnamed: 0, ambiguous: 0,
    drawnThrough: 0, ignored: 0, ignoredAt: [],
    killContacts: new Map(), crowdedContacts: new Map(),
    mostBlocksDrawn: 0, mostShotsInAir: 0, slack,
    seed, dt, holdY,
  };

  /** What the player is looking at: the blocks drawn, and the tracers over them. */
  const readFrame = () => {
    const held = s.bullets;
    s.bullets = [];
    build.renderGame(screen, s);
    const lit = new Set(blockCells(build, screen).map(cellKey));
    s.bullets = held;
    build.renderGame(screen, s);
    return { lit, tracer: tracerCellsBothHalves(build, screen) };
  };

  /**
   * Where one bullet's tracer went, in two readings that have to be kept apart.
   *
   * `laid` is what `drawBullets` put down: its own row and the row above, each
   * only where the corridor covers that row. `cells` is what survived to the
   * finished screen, which is less wherever something drawn after it stands on
   * it - drawParticles and drawShip both run later, and the hull sits exactly
   * where a shot leaving the muzzle is.
   *
   * The difference is the whole of the distinction between a tracer nobody
   * could see and a tracer nothing drew. A reading that collapses the two
   * reports the corridor fault every time the hull covers a bolt.
   *
   * The corridor is `build.tracerLit`, called out of the build that is flying.
   * There is one definition of it - drawTunnel lays the walls from it,
   * drawBullets draws the tracer inside it, and `contacts` registers inside it
   * - and a test restating the boundary here would be pinning its own copy.
   */
  const tracerOf = (bullet, drawn) => {
    const pos = game.toScreen(bullet.x, bullet.y, bullet.z);
    const laid = [];
    if (pos.row >= gameTop && pos.row < gameBottom) {
      for (const y of [pos.row, pos.row - 1]) {
        if (y < gameTop) continue;
        if (build.tracerLit(pos.col, y, gameTop, gameBottom, grid.w)) laid.push({ x: pos.col, y });
      }
    }
    return { laid, cells: laid.filter((c) => drawn.has(cellKey(c))) };
  };

  /**
   * How one shot stood against one block, with a frame that cannot answer
   * saying so. `contactOf` calls a tracer it cannot find `unlit`, which is the
   * right reading only when the renderer drew nothing; where it drew something
   * and the hull covered it, the frame is `hidden` and the other reading of the
   * pair is what settles the kill.
   */
  const seen = (shot, block) => {
    const verdict = contactOf(shot.cells, block, slack);
    return verdict === 'unlit' && shot.laid.length ? 'hidden' : verdict;
  };

  /** A target's block, kept to the cells the finished screen still shows. */
  const blockOf = (o, lit) => drawnBlockCells(game, o).filter((c) => lit.has(cellKey(c)));

  let sinceFired = fireInterval;

  for (let frame = 0; frame < frames; frame++) {
    s.shield = 100;
    s.shake = 0;
    const { lit, tracer } = readFrame();
    const ship = seeShip(screen);
    const drawn = new Set(tracer.map(cellKey));

    // Where every shot and every block stood on the frame just painted.
    const shots = s.bullets.map((b) => ({ bullet: b, ...tracerOf(b, drawn) }));
    const blocks = [];
    for (const o of s.obstacles) {
      const cells = blockOf(o, lit);
      if (cells.length) blocks.push({ o, cells, keys: new Set(cells.map(cellKey)) });
    }
    report.mostBlocksDrawn = Math.max(report.mostBlocksDrawn, blocks.length);
    report.mostShotsInAir = Math.max(report.mostShotsInAir, s.bullets.length);

    // Every drawn block against every shot, one pair at a time. A run with
    // volleys overlapping has a dozen tracers on the screen at once, so a
    // reading taken against all of them at once would credit one shot's
    // contact to whichever block another shot happened to be crossing.
    const drawnShots = new Map(shots.map((shot) => [shot.bullet, shot]));
    const drawnBlocks = new Map(blocks.map((block) => [block.o, block.cells]));
    const contacts = [];
    for (const block of blocks) {
      for (const shot of shots) {
        if (!shot.cells.some((c) => block.keys.has(cellKey(c)))) continue;
        contacts.push({ o: block.o, bullet: shot.bullet, z: block.o.z });
        report.drawnThrough++;
      }
    }

    // Steer by the screen: hold the height, close on the nearest drawn block's
    // column, and fire on the interval whenever the ship is standing in one.
    const keys = {};
    const justPressed = {};
    if (s.shipY < holdY - 0.05) keys.W = true;
    else if (s.shipY > holdY + 0.05) keys.S = true;
    const columns = [...new Set(blocks.flatMap((b) => b.cells.map((c) => c.x)))];
    sinceFired += dt;
    if (ship && columns.length) {
      const aim = columns.reduce((a, b) => (Math.abs(b - ship.col) < Math.abs(a - ship.col) ? b : a));
      if (ship.col < aim) keys.D = true;
      else if (ship.col > aim) keys.A = true;
      if (ship.col === aim && sinceFired >= fireInterval) {
        justPressed.SPACE = true;
        sinceFired = 0;
        report.volleys++;
      }
    }

    const was = {
      obstacles: s.obstacles.map((o) => ({ ref: o, x: o.x, y: o.y, z: o.z, rot: o.rot, rotSpeed: o.rotSpeed, scale: o.scale })),
      bullets: s.bullets.map((b) => ({ ref: b, x: b.x, y: b.y, z: b.z, life: b.life })),
      debris: new Set(s.particles),
    };

    game.update(dt, keys, justPressed);
    report.frames++;

    // A contact on the frame just painted had to resolve in the frame that
    // followed it, which is the one just stepped: the block goes, or the shot
    // does. Both surviving is the rule failing. The frame's sweep starts at the
    // positions the painting was taken at, so this is the contact the hit test
    // was handed rather than one it might have been.
    for (const c of contacts) {
      const standing = s.obstacles.includes(c.o) && c.o.z > c.z - 100;
      if (!standing || !s.bullets.includes(c.bullet)) continue;
      report.ignored++;
      if (report.ignoredAt.length < 5) {
        report.ignoredAt.push(`frame ${report.frames} on a block at z ${c.z.toFixed(1)}`);
      }
    }

    // The frame, rebuilt. `s.speed` is set once a frame and then used for the
    // advance, so reading it back after the update gives what the frame ran on;
    // the shot holds its screen ray, so x is carried forward by the ratio of
    // the two scales exactly as updateBullets carries it.
    const advance = s.speed * 60 * dt;
    const travel = 60 * dt;
    const drift = debrisDrift(dt, advance);

    // What the frame resolved, read off the debris it threw rather than off
    // where the blocks ended up. A block that goes has been shot, rammed or
    // wrapped round, and all three leave it in the same place; only a kill
    // throws debris in the obstacle's own colour. The wrap is the one of the
    // three that is arithmetic - a block past the ship at the end of its
    // advance - so what is left over is the rams.
    const kills = killBurstsSince(s.particles, was.debris);
    const left = was.obstacles.filter((o) => o.ref.z < o.z - 100);
    const wrapped = left.filter((o) => o.z + advance > 10);
    report.kills += kills.length;
    report.rams += left.length - wrapped.length - kills.length;
    if (!kills.length) continue;

    // The shots the frame spent, in the order updateBullets walked them: from
    // the end of the list, so the kills line up with the bursts above one for
    // one. A shot that ran out of life leaves the air on its own, so only a
    // shot with life left in it was spent on something.
    const air = new Set(s.bullets);
    const spent = [];
    for (let i = was.bullets.length - 1; i >= 0; i--) {
      const b = was.bullets[i];
      if (!air.has(b.ref) && b.life - dt > 0) spent.push(b);
    }
    // A shot spent on a mine lands no kill and throws a burst that is not the
    // kill colour, so it shifts every pairing after it by one and there is
    // nothing in the frame that says where it sat. Rare enough to sit out:
    // these kills are counted and left unread rather than read against a shot
    // that was never near them.
    if (spent.length !== kills.length) {
      report.unpaired += kills.length;
      report.unpairedMine += kills.length;
      continue;
    }

    const live = {
      obstacles: s.obstacles, mines: s.mines, orbs: s.orbs,
      bullets: s.bullets, particles: s.particles,
    };
    s.mines = [];
    s.orbs = [];
    s.particles = [];
    for (let k = 0; k < kills.length; k++) {
      // The burst stands where the block did when it died, which is where
      // updateObstacles left it: its own x and y, and its depth plus the
      // frame's advance. That is what names the block among the ones that left
      // the tunnel this frame. Exactly one, or the frame does not say.
      const at = { x: kills[k].x, y: kills[k].y, z: kills[k].z };
      const named = left.filter((o) => nearby(at, { x: o.x, y: o.y, z: o.z + advance }, drift));
      const block = named.length === 1 ? named[0] : null;
      const shot = spent[k];
      if (!block) {
        report.unpaired++;
        if (named.length) report.ambiguous++; else report.unnamed++;
        continue;
      }

      const z = shot.z - travel;
      const stepped = {
        x: (shot.x * game.projScale(shot.z)) / game.projScale(z), y: shot.y, z, life: shot.life,
      };
      s.obstacles = [{
        x: block.x, y: block.y, z: block.z + advance,
        rot: block.rot, rotSpeed: block.rotSpeed, scale: block.scale,
      }];
      // The block is read with the tracer out of the way, for the reason
      // watchEngagement gives: drawBullets runs after drawEntitiesFar and
      // stands on the very cells this reading is about.
      s.bullets = [];
      build.renderGame(scratch, s);
      const cells = blockCells(build, scratch);
      s.bullets = [stepped];
      build.renderGame(scratch, s);
      const shown = new Set(tracerCellsBothHalves(build, scratch).map(cellKey));
      // The kill frame or the one before, as watchEngagement takes it: a shot
      // can meet a block part way through a frame, on a step the sweep tests
      // and neither end of the frame draws. Both readings are the killing shot
      // against the killed block and nothing else.
      const now = seen(tracerOf(stepped, shown), cells);
      const started = drawnShots.get(shot.ref);
      const before = started
        ? seen(started, drawnBlocks.get(block.ref) ?? [])
        : 'hidden';
      // A shot raised inside the frame that resolved it has no start-of-frame
      // reading, and the end-of-frame one alone cannot say a tracer was never
      // drawn: the contact can land on a sweep step the frame's far end has
      // already climbed past the corridor from. So the frame says it cannot
      // answer rather than saying nothing was drawn.
      const settled = closerContact(now, before);
      const verdict = settled === 'unlit' && !started ? 'hidden' : settled;
      report.killContacts.set(verdict, (report.killContacts.get(verdict) ?? 0) + 1);
      // The same verdict again, kept apart for the kills the pairing is the
      // whole of. A frame that spent one shot pairs the same way whichever
      // end the spent shots are walked from, so those kills say nothing
      // about the pairing and dilute the share that does.
      if (spent.length > 1) {
        report.crowdedContacts.set(verdict, (report.crowdedContacts.get(verdict) ?? 0) + 1);
      }
    }
    Object.assign(s, live);
  }

  return report;
}

/**
 * The firing columns the walk below sweeps, in the world x a shot leaves the
 * muzzle at. The ship is clamped to `tunnelRadius - 1.5`, so this is every
 * column it can shoot from - including the outer ones no target ever spawns in,
 * which is where a shot leaves the corridor and goes dark.
 */
export const FIRING_AIMS = [];
for (let aim = -6.5; aim <= 6.5001; aim += 0.5) FIRING_AIMS.push(Number(aim.toFixed(2)));

/** Every legal target placement, walked as a cross product of its three axes. */
export const TARGET_XS = [];
for (let x = -4.5; x <= 4.5001; x += 0.75) TARGET_XS.push(Number(x.toFixed(2)));
export const TARGET_YS = [];
for (let y = 0.5; y <= 4.5001; y += 0.5) TARGET_YS.push(Number(y.toFixed(2)));
export const TARGET_ZS = [];
for (let z = -2; z >= -140; z -= 6) TARGET_ZS.push(z);

/** The heights the ship can fire from, which set the row a tracer climbs. */
export const FIRING_HEIGHTS = [0, 1.5, 3, 4.5, 6.5];

/** The depths a shot passes through in its life: 60 units a second for two. */
export const SHOT_DEPTHS = [];
for (let z = -5; z >= -125; z -= 5) SHOT_DEPTHS.push(z);

/**
 * Whether the hit test can register from a frame that drew no tracer.
 *
 * This is the one question the flown engagements cannot reach. `engage` steers
 * onto the target's column before firing and a target never spawns outside four
 * and a half units of the axis, so a flown shot is never taken from a column the
 * tunnel has stopped reaching - and the fault needs exactly that. So the hit
 * test is walked instead of flown: every firing column the ship can hold,
 * against every depth of a shot's life, against the placement walk.
 *
 * A configuration counts as **dark** when `drawBullets` would draw the tracer
 * nowhere: outside the play area, or outside the corridor on both of its two
 * rows. Lit-ness only ever runs one way over a flight - the shot climbs the
 * screen and the corridor narrows going up - so a shot dark where the frame was
 * painted is dark for every step of the sweep inside it.
 *
 * A dark configuration is a **candidate** when the cells would otherwise meet:
 * the block's drawn rows against the tracer's, inside the grid's column slack.
 * Those are the frames where the player sees the block, sees no bolt, and the
 * old hit test killed the block anyway. Each one is then put to the engine for
 * a single frame, and `registered` counts the ones that still resolve.
 */
export function darkWalk(build, grid, { dt = 1 / 60 } = {}) {
  const probe = emptyRun(build, grid);
  const ps = probe.state;
  const gameTop = HUD_ROWS;
  const gameBottom = grid.h - FOOTER_ROWS;
  const slack = build.shotSlackCols(grid.w);

  // Every legal target placement, as a cross product rather than as the
  // coupled walk the sweeps fly. A walk pairs one x with one y with one z, and
  // the configurations this is about are particular pairings - a target out at
  // the tunnel's edge, high, and close in - which a walk of the same size
  // reaches only by luck.
  const places = [];
  for (const x of TARGET_XS) {
    for (const y of TARGET_YS) {
      for (const z of TARGET_ZS) {
        if (z < -ps.maxViewZ || z > 5) continue;
        const pos = probe.toScreen(x, y, z);
        if (pos.row < gameTop || pos.row >= gameBottom) continue;
        const half = Math.floor(Math.max(1, Math.floor(pos.scale * 2.5)) / 2);
        places.push({
          x, y, z, col: pos.col, half,
          top: Math.max(gameTop, pos.row - half),
          bottom: Math.min(gameBottom - 1, pos.row + half),
        });
      }
    }
  }

  const out = { walked: 0, dark: 0, candidates: 0, registered: 0, at: [] };

  for (const aim of FIRING_AIMS) {
    for (const by of FIRING_HEIGHTS) {
    for (const bz of SHOT_DEPTHS) {
      const bullet = { x: aim / probe.projScale(bz), y: by, z: bz, life: STAGED_LIFE };
      const bPos = probe.toScreen(bullet.x, bullet.y, bullet.z);
      const low = bPos.row >= gameTop && bPos.row < gameBottom
        && build.tracerLit(bPos.col, bPos.row, gameTop, gameBottom, grid.w);
      const high = bPos.row - 1 >= gameTop && bPos.row < gameBottom
        && build.tracerLit(bPos.col, bPos.row - 1, gameTop, gameBottom, grid.w);

      for (const place of places) {
        out.walked++;
        if (low || high) continue; // the player can see this one
        out.dark++;

        // Would the cells have met, had the tracer been drawn? Read at the
        // positions the frame was painted at, which is the sweep's first step.
        if (Math.abs(bPos.col - place.col) > place.half + slack) continue;
        if (bPos.row - 1 > place.bottom || bPos.row < place.top) continue;
        out.candidates++;

        // Put it to the engine for one frame. The ship is parked at the far
        // wall so nothing it does can register, as stagedShot parks it.
        const game = emptyRun(build, grid);
        const s = game.state;
        stageTarget(s, place.x, place.y, place.z);
        s.shipX = place.x >= 0 ? -6.5 : 6.5;
        s.shipY = 0;
        s.bullets = [{ ...bullet }];
        const zBefore = s.obstacles[0].z;
        const bullets = s.bullets.length;
        game.update(dt, {}, {});
        if (s.obstacles[0].z >= zBefore - 100 || s.bullets.length >= bullets) continue;

        out.registered++;
        if (out.at.length < 5) {
          out.at.push(
            `a shot at screen column ${bPos.col} of row ${bPos.row} (aim x ${aim}, y ${by}, z ${bz}) ` +
            `against a target at x ${place.x.toFixed(2)}, y ${place.y.toFixed(2)}, ` +
            `z ${place.z.toFixed(0)}`
          );
        }
      }
    }
    }
  }
  return out;
}
