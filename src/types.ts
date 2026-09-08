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

/** Seconds a combo chain survives without a kill before it drops to nothing. */
export const COMBO_TIME = 2;

/**
 * One-shot sounds the engine queues for the frame it has just simulated. The
 * engine names the event; what it sounds like is the browser build's business,
 * and the terminal build has no audio and simply lets the queue clear.
 */
export type SoundCue = 'shot' | 'orb' | 'damage' | 'mine';

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
