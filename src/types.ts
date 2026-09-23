// src/types.ts — Type definitions for CMD Space Rider

export type GameMode = 'menu' | 'playing' | 'dead' | 'debugMenu';
export type DebugMode = 'mines' | 'orbs' | 'obstacleCollision' | 'mineCollision' | 'chaos';

export const DEBUG_MODES: DebugMode[] = [
  'mines', 'orbs', 'obstacleCollision', 'mineCollision', 'chaos'
];

export const DEBUG_MODE_NAMES: Record<DebugMode, string> = {
  mines: 'MINE FIELD',
  orbs: 'ORB HARVEST',
  obstacleCollision: 'COLLISION COURSE',
  mineCollision: 'MINE SWEEPER',
  chaos: 'CHAOS PROTOCOL',
};

export const DEBUG_MODE_DESCS: Record<DebugMode, string> = {
  mines: 'Only mines. Pure evasion.',
  orbs: 'Only orbs. Collect them all.',
  obstacleCollision: 'Hit obstacles. Track every impact.',
  mineCollision: 'Ram mines. Log collisions.',
  chaos: 'Everything. Everywhere. All at once.',
};

export interface Obstacle {
  x: number; y: number; z: number;
  rot: number; rotSpeed: number; scale: number;
}

export interface Orb {
  x: number; y: number; z: number;
  collected: boolean;
}

export interface Mine {
  x: number; y: number; z: number;
  rot: number; rotSpeed: number; scale: number;
  hp: number;
}

export interface Bullet {
  x: number; y: number; z: number;
  life: number;
}

export interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number; color: number;
}

export interface Star {
  x: number; y: number; speed: number; char: string; color: number;
}

/** What a dropped powerup gives the ship that picks it up. */
export type PowerupKind = 'shield' | 'rapid' | 'slow';

/** The three kinds, in the order a drop draws from. */
export const POWERUP_KINDS: PowerupKind[] = ['shield', 'rapid', 'slow'];

export interface Powerup {
  x: number; y: number; z: number;
  kind: PowerupKind;
}

/** Speed a run starts at. The HUD speed readout is a multiple of this. */
export const BASE_SPEED_START = 0.3;

/** Seconds the screen shake lasts after the ship takes damage. */
export const SHAKE_TIME = 0.2;

/** Seconds the "NEW BEST" HUD banner stays on screen. */
export const NEW_BEST_FLASH_TIME = 2;

/** Seconds a barrel roll takes to carry the ship all the way round. */
export const ROLL_TIME = 0.5;

/**
 * Seconds from the start of one barrel roll to the earliest next one. Longer
 * than the roll itself, so there is a beat of level flight between two of them
 * and the invincibility the roll grants cannot be held open indefinitely.
 */
export const ROLL_COOLDOWN = 1.2;

/**
 * Columns of slack the pulse cannon's hit test allows either side of a target's
 * drawn block, at the 80-column grid every figure in this repository was first
 * measured on. `shotSlackCols` below is what the hit test reads.
 *
 * Past about 47 units out a target's block is a single character, so without
 * slack a shot has to land on one exact column. Two things go wrong with that.
 * Both positions are floored to a cell, so a shot dead on in world terms still
 * reads as one column adrift whenever the two fall either side of a cell
 * boundary. And a target's own column creeps outward while the shot is in
 * flight, which over a long one comes to about a column of lead the player has
 * no way to measure.
 *
 * One column covers both at 80 wide: the shot registers where it passes through
 * the target's block or immediately beside it. Two was measured as well and
 * buys little past what the three-shot volley's own spread already covers, at
 * the cost of counting a shot that visibly clears the target by a character.
 */
export const SHOT_SLACK_COLS = 1;

/** The grid width SHOT_SLACK_COLS was measured at. */
export const SLACK_REF_WIDTH = 80;

/**
 * The slack that constant is worth at the grid actually being played.
 *
 * Both of the faults it answers are measured in columns and both grow with the
 * grid. A target's outward creep over a long flight scales with `colRange`,
 * which is 37 columns at 80 wide and 99.5 at 205, so the same flight that ends
 * a column out at 80 ends nearly three columns out on a full-screen browser
 * window. A fixed column of slack is therefore a wide slack on a narrow screen
 * and no slack at all on a wide one, and the long band fell from 98% to 83%
 * across exactly that change of grid.
 *
 * Scaling it by `colRange` holds the slack at a constant share of the tunnel's
 * width instead, which is the thing the creep is a share of. It never falls
 * below the one column a narrow grid needs for the flooring alone.
 */
export function shotSlackCols(screenWidth: number): number {
  const scaled = SHOT_SLACK_COLS * ((screenWidth - 6) / (SLACK_REF_WIDTH - 6));
  return Math.max(SHOT_SLACK_COLS, Math.round(scaled));
}

/**
 * The two columns the tunnel's walls are drawn on for a given row.
 *
 * Three things read it, and that is why it lives here rather than in the
 * renderer: drawTunnel lays the walls down from it, drawBullets reads it back
 * to decide whether a tracer is still inside the corridor, and the pulse
 * cannon's hit test reads it to decide whether that tracer was drawn at all.
 * The corridor the player sees, the corridor a shot is drawn in and the
 * corridor a shot can register in are then one corridor and cannot drift
 * apart.
 */
export function tunnelSpan(
  row: number, gameTop: number, gameBottom: number, w: number
): { left: number; right: number } {
  const center = Math.floor(w / 2);
  const t = (row - gameTop) / (gameBottom - gameTop); // 0=far(top), 1=near(bottom)
  const halfSpan = Math.floor(3 + t * (center - 4));
  return { left: center - halfSpan, right: center + halfSpan };
}

/**
 * Whether a tracer at this column and row is inside the corridor, which is
 * what drawBullets draws it in.
 *
 * The corridor is what the walls enclose and not the walls themselves:
 * drawTunnel lays its glyph on tunnelSpan's own two columns and thickens
 * outward from there, so the corridor runs from left + 1 to right - 1.
 */
export function tracerLit(
  col: number, row: number, gameTop: number, gameBottom: number, w: number
): boolean {
  const span = tunnelSpan(row, gameTop, gameBottom, w);
  return col > span.left && col < span.right;
}

/**
 * The engine's source of randomness, and the one place it can be pinned.
 *
 * Every draw either build makes comes through `RNG.next` - the obstacle and
 * orb field a run opens with, the mine timers, the starfield, the debris a
 * burst is thrown in - so seeding this seeds the whole run. Unseeded it is
 * `Math.random`, which is what the game plays on: a run nobody can predict is
 * the point of the game.
 *
 * Seeding exists for the checks and the probes. A figure taken off an unseeded
 * run is a sample rather than a measurement, and this repository quotes those
 * figures in test comments, in probe tables and in the changelog, where a
 * sample stops being reproducible the moment it is written down. A seeded run
 * flies the same sixty obstacles every time, so the figure off it is
 * arithmetic and a reader can rebuild it.
 *
 * It is `mulberry32`, chosen because it is short enough to restate exactly in
 * the browser build's single file and uses only `imul` and shifts, so both
 * builds step through the same 32-bit arithmetic and draw the same sequence
 * from the same seed. `test/parity.test.mjs` pins that.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The draw the engine reads. Swapped by `seedRng`, and nothing else. */
export const RNG: { next: () => number } = { next: Math.random };

/** Pin the engine's draws to a seed, or hand them back to `Math.random`. */
export function seedRng(seed: number | null): void {
  RNG.next = seed === null ? Math.random : seededRandom(seed);
}

/** Seconds a combo chain survives without a kill before it drops to nothing. */
export const COMBO_TIME = 2;

/**
 * The highest multiplier a chain can reach. Without a ceiling the chain barely
 * ever breaks - obstacle density rises with difficulty, so two seconds is
 * longer than the gap between kills - and an ordinary run runs into the
 * millions while a best score set by one long chain is one ordinary play can
 * never approach again.
 *
 * The counter reads the cap rather than counting past it, so the number on the
 * HUD is always the multiplier actually being paid. Eight clears the top HUD
 * colour tier at 6, so every tier is still reachable, and holds a mine kill at
 * 4000 rather than the 68,600 the 343rd kill of an uncapped chain was worth.
 */
export const COMBO_MAX = 8;

/**
 * Seconds of game time between one difficulty step and the next.
 *
 * `updateObstacleScaling` has counted in whole minutes since it was written -
 * it thickens the field every time `floor(gameTime / 60)` moves on - and the
 * warp transition is that same crossing made visible. Naming the number once
 * is what keeps the effect on the step it announces: a warp flash a few
 * seconds out from the obstacles arriving would read as a second event.
 */
export const WARP_INTERVAL = 60;

/**
 * Seconds the warp transition runs for: the banner in the HUD, the shifted
 * tunnel walls, and the denser speed lines down both margins.
 *
 * Two seconds is the NEW_BEST_FLASH_TIME the other HUD banner already uses,
 * which is long enough to read a three-word line and short enough that the
 * walls are back to their own colours well before the thickened field reaches
 * the ship.
 */
export const WARP_FLASH_TIME = 2;

/**
 * The chance a mine shot to pieces leaves a powerup behind.
 *
 * Only a kill drops one. Ramming a mine destroys it too, but that is the
 * player taking 35 shield for it, and paying a reward out for the collision
 * would undercut the one move the mine is there to punish.
 */
export const POWERUP_DROP_CHANCE = 0.35;

/** Units a second a dropped powerup closes on the ship while it drifts in. */
export const POWERUP_DRIFT = 2.5;

/** Shield a Shield Regen pickup restores, capped at the usual 100. */
export const POWERUP_SHIELD_GAIN = 25;

/** Seconds a Rapid Fire pickup holds the cannon at its faster cadence. */
export const RAPID_FIRE_TIME = 10;

/** Seconds a Slow Motion pickup holds the world at half speed. */
export const SLOW_MOTION_TIME = 5;

/** What Slow Motion multiplies the world's clock by while it runs. */
export const SLOW_MOTION_SCALE = 0.5;

/**
 * The cannon's nominal cadence, in seconds between volleys.
 *
 * Tapping the trigger is not gated by it - a press has always fired at once
 * and still does, because a cannon that swallows a keypress reads as a broken
 * one. It is the rate Rapid Fire holds the trigger down at, and the figure the
 * "3x" on the pickup is three times of.
 */
export const FIRE_INTERVAL = 0.36;

/** How much faster Rapid Fire makes that cadence. */
export const RAPID_FIRE_MULT = 3;

/**
 * Seconds between two volleys with Rapid Fire running and SPACE held.
 *
 * It comes out at the 0.12 the chaos scenario has auto-fired at since it was
 * written, which is the useful coincidence: that cadence has been played
 * against the densest field in the game and is known to be fast without
 * filling the tunnel with tracers.
 */
export const RAPID_FIRE_INTERVAL = FIRE_INTERVAL / RAPID_FIRE_MULT;

/**
 * One-shot sounds the engine queues for the frame it has just simulated. The
 * engine names the event; what it sounds like is the browser build's business,
 * and the terminal build has no audio and simply lets the queue clear.
 */
export type SoundCue = 'shot' | 'orb' | 'damage' | 'mine' | 'powerup';

export interface GameState {
  mode: GameMode;
  debugMode: DebugMode | null;
  score: number;
  distance: number;
  shield: number;
  bestScore: number;
  speed: number;
  baseSpeed: number;
  boostSpeed: number;
  shipX: number;
  shipY: number;
  /** Seconds left in the barrel roll under way, 0 when the ship is level. */
  shipRoll: number;
  /** Which way that roll is going: -1 for Q, 1 for E, 0 when level. */
  rollDir: number;
  /** Seconds until another barrel roll may be started. */
  rollCooldown: number;
  /** The world's animation clock. Stops while a run is paused. */
  time: number;
  /** Presentation clock for the few effects meant to outlive a pause. */
  uiTime: number;
  gameTime: number;

  obstacles: Obstacle[];
  orbs: Orb[];
  mines: Mine[];
  bullets: Bullet[];
  particles: Particle[];
  powerups: Powerup[];
  stars: Star[];

  tunnelRadius: number;
  maxViewZ: number;

  lastObstacleIncreaseMinute: number;
  mineTrackTime: number;
  minesToPresent: number;
  mineSpawnTimers: number[];
  firstMinuteElapsed: boolean;

  trackerCount: number;
  debugMenuSelected: number;
  chaosFireTimer: number;

  damageFlash: number;
  collectFlash: number;
  boosting: boolean;

  /** Kills chained inside the combo window. 0 and 1 carry no multiplier. */
  combo: number;
  /** Seconds left on the combo window. Re-armed by every kill. */
  comboTimer: number;

  /** Difficulty step the run is on: 1 for the first minute, 2 for the next. */
  warpLevel: number;
  /** Seconds left on the warp transition raised by the last step up. */
  warpFlash: number;

  /** Seconds left of Rapid Fire, 0 when the cannon is at its own cadence. */
  rapidFire: number;
  /** Seconds left of Slow Motion, 0 when the world runs at full speed. */
  slowMotion: number;
  /** Seconds since the last Rapid Fire volley. Reset by every press. */
  fireTimer: number;

  /** Sounds raised by the frame just simulated. Cleared at the top of each. */
  sounds: SoundCue[];

  paused: boolean;
  muted: boolean;
  shake: number;
  newBestFlash: number;
  newBestShown: boolean;

  screenWidth: number;
  screenHeight: number;
}

// ANSI 256-color constants for DOS neon aesthetic
export const C = {
  BLACK: 0,
  RED: 1,
  GREEN: 2,
  YELLOW: 3,
  BLUE: 4,
  MAGENTA: 5,
  CYAN: 6,
  WHITE: 7,
  GRAY: 8,
  BRIGHT_RED: 9,
  BRIGHT_GREEN: 10,
  BRIGHT_YELLOW: 11,
  BRIGHT_BLUE: 12,
  BRIGHT_MAGENTA: 13,
  BRIGHT_CYAN: 14,
  BRIGHT_WHITE: 15,
  DARK_BLUE: 17,
  DARK_CYAN: 23,
  DARK_GREEN: 22,
  NEON_CYAN: 51,
  NEON_GREEN: 46,
  NEON_MAGENTA: 201,
  NEON_RED: 196,
  ORANGE: 208,
} as const;

/**
 * How each powerup is drawn and what the HUD calls it.
 *
 * The renderer reads the glyph and the two colours it pulses between; the
 * footer reads the label for the badge that counts the pickup down. Both sit
 * in one table rather than one each, so a kind added to `PowerupKind` with no
 * entry here fails to compile instead of dropping an invisible pickup into
 * the tunnel.
 */
export const POWERUP_GLYPHS: Record<
  PowerupKind, { char: string; bright: number; dim: number; label: string }
> = {
  shield: { char: '+', bright: C.BRIGHT_GREEN, dim: C.GREEN, label: 'SHIELD' },
  rapid: { char: '!', bright: C.BRIGHT_CYAN, dim: C.CYAN, label: 'RAPID' },
  slow: { char: '~', bright: C.BRIGHT_MAGENTA, dim: C.MAGENTA, label: 'SLOW' },
};
