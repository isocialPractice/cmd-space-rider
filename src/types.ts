// src/types.ts — Type definitions for CMD Space Rider

export type GameMode = 'menu' | 'playing' | 'nameEntry' | 'dead' | 'debugMenu';
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

/** Depth units a bolt covers each second. One frame's travel is this times dt. */
export const BULLET_SPEED = 60;

/**
 * Depth of slack on a bolt's life past the draw distance.
 *
 * The reach itself is the draw distance - `updateBullets` drops a bolt that has
 * passed `state.maxViewZ`, because out there is past every target
 * `drawEntitiesFar` will draw. The slack is what keeps the life from being what
 * ends a flight instead: a bolt is dropped the frame its life runs out, before
 * that frame's contacts are taken, so a life ending on the very frame a bolt
 * crosses the draw distance would retire it with that frame untested and a
 * target parked at the far edge unkillable.
 *
 * One ring's spacing is the figure, and it is more than a frame's travel at
 * every rate the suite walks - ten units at the sixth of a second the slowest
 * one uses.
 */
export const BULLET_LIFE_SLACK = 14;

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

  /**
   * Step of the detail ladder the run is drawing at: an index into
   * DETAIL_TIERS, 0 for the fullest. Moved only by trackFrameRate.
   */
  detail: number;
  /** Seconds the open detail window has accumulated. */
  frameSpent: number;
  /** Frames the open detail window has counted. */
  frameSeen: number;
  /**
   * Whether the sample before this one was thrown out as a stopped loop. The
   * frame straddling the return from one is a partial interval rather than a
   * whole frame, so it is thrown out too. See trackFrameRate.
   */
  frameStalled: boolean;

  /** The top scores, highest first. Persisted by the browser build only. */
  leaderboard: LeaderEntry[];
  /** The three characters the name entry screen is showing. */
  entryName: string;
  /** Which of those three the entry screen is editing. */
  entrySlot: number;

  /** The path being raced this run, empty when there is nothing to race. */
  ghost: GhostSample[];
  /** Where that path was read last frame, as a hint for the next read. */
  ghostCursor: number;
  /** Where the ghost ship is this frame, or null when there is none to draw. */
  ghostShip: { x: number; y: number } | null;
  /** The path this run is recording, to be raced by the next one. */
  ghostRecord: GhostSample[];
  /** Seconds of game time until the next sample of that recording. */
  ghostTimer: number;

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

/**
 * One step of the detail ladder: how much of the presentation a run draws.
 *
 * The two figures are the ones that scale with nothing else in the game. The
 * starfield is a fixed population redrawn every frame whatever is happening,
 * and a burst's debris is the only thing in the tunnel whose count the player
 * never chose. Neither carries a rule, a hit test or a score, so dropping
 * either costs the run nothing it is played for.
 *
 * `stars` is a count and `particles` is a share, because that is the shape each
 * one is asked for: `initStars` is told how many to make, and `spawnParticles`
 * is told a count per event that already varies from 5 to 20 by what died.
 */
export interface DetailTier {
  /** What the footer calls this tier. Only drawn below the fullest one. */
  name: string;
  /** Stars the parallax field is drawn from. */
  stars: number;
  /** The share of a burst's debris that is spawned, never below one particle. */
  particles: number;
}

/**
 * The detail ladder, fullest first. A run opens at index 0 and only leaves it
 * for measured frame drops, so the top tier is the game exactly as it was
 * before any of this existed - forty stars and every particle a burst asks
 * for - and a machine that keeps up never sees the rest of the ladder.
 *
 * Two steps down rather than one, because the two things being cut are cheap
 * individually: trimming the starfield by a third is not much of a saving on a
 * device that cannot hold 30 frames at all, and a single tier would have to be
 * the aggressive one, which would then be the only thing on offer to a device
 * that needed a nudge.
 */
export const DETAIL_TIERS: DetailTier[] = [
  { name: 'FULL', stars: 40, particles: 1 },
  { name: 'REDUCED', stars: 24, particles: 0.6 },
  { name: 'MINIMAL', stars: 12, particles: 0.3 },
];

/** The tier a detail level names, clamped to the ladder at both ends. */
export function detailTier(detail: number): DetailTier {
  const i = Math.max(0, Math.min(Math.floor(detail), DETAIL_TIERS.length - 1));
  return DETAIL_TIERS[i];
}

/**
 * A burst's particle count at a detail level.
 *
 * Never below one, however far down the ladder a device has gone: a kill that
 * threw no debris at all reads as a shot that missed, and the hit is already
 * paid for by then.
 */
export function burstSize(count: number, detail: number): number {
  return Math.max(1, Math.round(count * detailTier(detail).particles));
}

/**
 * The frame time both builds aim for, in seconds.
 *
 * The rate is written in two shells already - `TARGET_FPS` is 30 in
 * src/index.ts and in index.html - and this is that same figure in the unit the
 * detail ladder measures against, so a shell that retargeted its loop without
 * moving this would judge its frames against a rate it no longer runs at.
 */
export const TARGET_FRAME_TIME = 1 / 30;

/**
 * Frames one detail decision is taken over: a second's worth at the target.
 *
 * A single slow frame is not evidence of a slow device. Scrolling a terminal, a
 * background tab coming back, one blocked write - each of those produces a
 * frame well past the budget on a machine that is otherwise fine, and a ladder
 * that stepped on it would spend the run oscillating. A second is long enough
 * for a real shortfall to show up in the mean, and short enough that a player
 * who opened on a weak device is at the right tier before the first mine
 * arrives.
 */
export const DETAIL_WINDOW_FRAMES = 30;

/**
 * How far past the target a window's mean frame time has to run before the
 * ladder steps down: 41.7ms, which is 24 frames a second.
 *
 * It is a quarter rather than a tenth because the shells do not deliver the
 * target exactly even when nothing is wrong. `setInterval` in the terminal
 * build is bounded below by the platform's timer granularity, and the browser
 * build steps on an accumulator fed by `requestAnimationFrame`, so a window
 * either side of 35ms is an ordinary reading on a machine with headroom to
 * spare.
 */
export const DETAIL_DROP_FACTOR = 1.25;

/**
 * How close to the target a window has to come before the ladder steps back
 * up: 36.7ms, or 27.3 frames a second.
 *
 * The gap between this and the drop factor is the hysteresis, and it has to be
 * real in both directions. Set too near the drop factor, a device sitting
 * between the two climbs a tier, fails the next window, drops again, and the
 * starfield visibly breathes once a second. Set too near the target, the
 * ordinary jitter above becomes a ceiling and a device that recovered - a tab
 * brought back to the front, a terminal that stopped being resized - never
 * climbs out of the tier one bad stretch cost it.
 */
export const DETAIL_RAISE_FACTOR = 1.1;

/**
 * The detail level a closed window argues for, given the level it was measured
 * at and the mean frame time it saw.
 *
 * One step at a time in either direction. The mean says that a device is
 * behind, not how far behind, because the measurement was taken at a tier that
 * is already cutting work: a window read at MINIMAL that is still over budget
 * has nothing further to give, and a window read at FULL that is badly over has
 * another window closing a second later to take it down again.
 */
export function detailFor(detail: number, meanFrameTime: number): number {
  if (meanFrameTime >= TARGET_FRAME_TIME * DETAIL_DROP_FACTOR) {
    return Math.min(detail + 1, DETAIL_TIERS.length - 1);
  }
  if (meanFrameTime <= TARGET_FRAME_TIME * DETAIL_RAISE_FACTOR) {
    return Math.max(detail - 1, 0);
  }
  return detail;
}

/** A name on the leaderboard and the score it was set with. */
export interface LeaderEntry {
  name: string;
  score: number;
}

/** How many scores the leaderboard keeps. */
export const LEADERBOARD_SIZE = 10;

/** How many characters a name carries, as the cabinets took. */
export const NAME_LENGTH = 3;

/**
 * The characters a name is spelled from, in the order the entry screen cycles
 * through them.
 *
 * Letters first, so the common case is a short walk from the opening `AAA`,
 * then digits, then the space that lets a one or two letter name be spelled
 * without padding it out. Nothing else: the grid holds one character per cell
 * and a name is read back at a glance from a table, so punctuation buys nothing,
 * and a character the stored table could hold but this alphabet could not spell
 * would be a name the player is unable to edit.
 */
export const NAME_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

/** What the entry screen opens on, and what a stored row with no name is filed under. */
export const DEFAULT_NAME = 'AAA';

/**
 * A name as the table holds it: exactly NAME_LENGTH characters, every one of
 * them from NAME_ALPHABET.
 *
 * Both ends need it. The entry screen can only produce a name of this shape, so
 * the table is safe from that direction, but the stored copy is a JSON string
 * in a folder the player can edit, and a name of forty characters or one
 * carrying a newline would otherwise be drawn straight into the title screen's
 * table.
 */
export function normalizeName(name: string): string {
  let out = '';
  for (let i = 0; i < NAME_LENGTH; i++) {
    const ch = (name[i] || ' ').toUpperCase();
    out += NAME_ALPHABET.includes(ch) ? ch : ' ';
  }
  return out;
}

/**
 * Whether a score earns a place on the table.
 *
 * Making the table, rather than beating the best score - which is the stricter
 * reading of the same idea, and the one that cannot fill a table: a run named
 * only when it takes first place leaves the other nine rows with no name to put
 * on them. Every new best qualifies under this rule as well, so the stricter
 * case is covered by the looser one.
 *
 * A score of zero never qualifies, so a run that ended before it had earned
 * anything does not take a row from a run that did.
 */
export function scoreQualifies(entries: LeaderEntry[], score: number): boolean {
  if (score <= 0) return false;
  if (entries.length < LEADERBOARD_SIZE) return true;
  return score > entries[entries.length - 1].score;
}

/**
 * The table with one more entry on it, highest score first, trimmed back to
 * LEADERBOARD_SIZE.
 *
 * The new entry is appended before the sort rather than inserted, so a score
 * matching one already on the table ranks below it: `Array.prototype.sort` is
 * stable, and the run that set the figure first is the one that keeps the row.
 */
export function recordScore(entries: LeaderEntry[], entry: LeaderEntry): LeaderEntry[] {
  const next = [...entries, { name: normalizeName(entry.name), score: Math.floor(entry.score) }];
  next.sort((a, b) => b.score - a.score);
  return next.slice(0, LEADERBOARD_SIZE);
}

/**
 * A stored leaderboard read back into the shape the game draws from, dropping
 * whatever is not an entry.
 *
 * What comes out of storage is parsed JSON from a file the player owns, so it
 * is any value at all rather than a table: not an array, an array of numbers,
 * an entry whose score is a string or `NaN`. Each of those is dropped on its
 * own rather than condemning the rest, because one corrupt row is not a reason
 * to throw away nine good scores. A row with no name at all is the single case
 * repaired instead of dropped - the score is the part worth keeping - and it is
 * filed under DEFAULT_NAME.
 */
export function sanitizeLeaderboard(raw: unknown): LeaderEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LeaderEntry[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue;
    const { name, score } = item as { name?: unknown; score?: unknown };
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    // The whole number is what the table holds, so it is the figure the floor is
    // tested against. Testing the stored one instead lets a hand-edited 0.5
    // through as a row scoring zero, which is the row this rule exists to keep
    // off the table.
    const whole = Math.floor(score);
    if (whole <= 0) continue;
    out.push({
      name: typeof name === 'string' ? normalizeName(name) : DEFAULT_NAME,
      score: whole,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, LEADERBOARD_SIZE);
}

/** Where the ship was at one moment of a recorded run, and when that was. */
export interface GhostSample {
  /** Game time the sample was taken at, in seconds from the start of the run. */
  t: number;
  x: number;
  y: number;
}

/**
 * Seconds of game time between two samples of the path a run is recording.
 *
 * The recording is of where the ship went rather than of which keys were held,
 * and that is the one deliberate departure from how this was asked for. A key
 * is held for some number of frames, and how far it carries the ship depends on
 * how long those frames were: replaying the keys on the next run, whose frames
 * fall differently, flies a different path - which is the one thing the ghost
 * exists not to do. Sampling the position instead reproduces the path the
 * player actually flew, at any frame rate, including a run recorded on a
 * machine that was dropping frames and replayed on one that is not.
 *
 * A tenth of a second is three frames at the target rate. The ship crosses the
 * tunnel in about a second and a half at its move speed, so a tenth of that
 * travel is well under a character cell once the interpolation between two
 * samples is counted, and the ghost reads as flying rather than as stepping.
 */
export const GHOST_SAMPLE_TIME = 0.1;

/**
 * The most samples one recording keeps: ten minutes of flying.
 *
 * The recording is held in memory for as long as the session lasts and nothing
 * trims it, so an unbounded one grows for as long as the player is good enough
 * to keep flying. Ten minutes is past where a run is still being raced - the
 * difficulty has stepped ten times by then - and the ghost simply ends there,
 * which it already does at the end of any shorter run.
 */
export const GHOST_MAX_SAMPLES = 6000;

/** Where a recorded path was at some moment, and the cursor it was read with. */
export interface GhostReading {
  x: number;
  y: number;
  /** The sample the reading starts from, to be handed back on the next read. */
  cursor: number;
}

/**
 * Where a recorded path was at game time `t`, interpolated between the samples
 * either side of it, or `null` once `t` is past the end of the recording.
 *
 * Running out is the point rather than an edge case: the recording ends where
 * the ghost's run ended, so a player still flying past that moment has
 * outlasted the run being raced, and the ghost disappearing is how the screen
 * says so.
 *
 * `cursor` is where the last read left off, and starting from it is what keeps
 * this off a scan of the whole recording every frame. It is only ever a hint:
 * it is clamped into the recording and then walked to the pair of samples `t`
 * actually falls between, backwards as readily as forwards, so a stale one
 * costs a walk rather than a wrong answer. A run starting over is handed back
 * 0, because the backward walk follows `t` when `t` returns to the start line.
 */
export function readGhost(samples: GhostSample[], t: number, cursor: number): GhostReading | null {
  if (samples.length === 0) return null;

  let i = Math.max(0, Math.min(Math.floor(cursor), samples.length - 1));
  // Walked both ways rather than only forward. A cursor sitting ahead of `t` -
  // left by a caller that restarted its clock without resetting the cursor, or
  // by one reading two times out of order - would otherwise never be corrected,
  // and the reading taken from it would interpolate the wrong pair of samples.
  while (i > 0 && samples[i].t > t) i--;
  while (i + 1 < samples.length && samples[i + 1].t <= t) i++;

  const here = samples[i];
  const next = samples[i + 1];
  if (next === undefined) {
    // The last sample. It holds for the instant it was taken at and no longer,
    // so a run that has flown past it sees nothing.
    return t > here.t ? null : { x: here.x, y: here.y, cursor: i };
  }

  const span = next.t - here.t;
  const k = span > 0 ? Math.max(0, Math.min(1, (t - here.t) / span)) : 0;
  return { x: here.x + (next.x - here.x) * k, y: here.y + (next.y - here.y) * k, cursor: i };
}
