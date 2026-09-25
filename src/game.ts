// src/game.ts — Game engine: state management, physics, collision, entities

import {
  GameState, GameMode, DebugMode, DEBUG_MODES, SoundCue,
  Obstacle, Orb, Mine, Bullet, Particle, Star, Powerup, POWERUP_KINDS,
  BASE_SPEED_START, SHAKE_TIME, NEW_BEST_FLASH_TIME,
  ROLL_TIME, ROLL_COOLDOWN, COMBO_TIME, COMBO_MAX, shotSlackCols, tracerLit,
  WARP_INTERVAL, WARP_FLASH_TIME,
  POWERUP_DROP_CHANCE, POWERUP_DRIFT, POWERUP_SHIELD_GAIN, POWERUP_GLYPHS,
  RAPID_FIRE_TIME, RAPID_FIRE_INTERVAL, SLOW_MOTION_TIME, SLOW_MOTION_SCALE,
  RNG,
} from './types';

const { PI, sin, cos, sqrt, abs, max, min, floor, ceil, atan2 } = Math;
const TAU = PI * 2;
/** Every draw the engine makes, routed through the one source `seedRng` pins. */
const random = (): number => RNG.next();
const rand = (a = 0, b = 1): number => a + random() * (b - a);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const NUM_RINGS = 30;
const RECYCLE_Z = NUM_RINGS * 14;
const HUD_ROWS = 3;
const FOOTER_ROWS = 2;
const Y_FACTOR = 0.4;

// Ship sprite bounding-box half-sizes (matches drawShip in render.ts)
const SHIP_HALF_W = 1; // ship drawn cols cx-1 .. cx+1
const SHIP_HALF_H = 1; // ship drawn rows cy-1 .. cy+1

/**
 * The furthest the hit test's sweep lets a shot and its target close on each
 * other between two samples, in world units.
 *
 * The contact it looks for is a pair of cells meeting on the screen, and a cell
 * is worth well under a unit of depth at the ranges a shot is taken at, so a
 * frame tested only at its ends can step a tracer clean over a block and never
 * know. Three quarters of a unit keeps every sample inside a cell at thirty
 * frames a second and still holds at a sixth of a second a frame, which is
 * slower than anything the game runs at.
 */
const SWEEP_STEP = 0.75;

/** Seconds between the chaos scenario's own volleys, which nobody triggers. */
const CHAOS_FIRE_INTERVAL = 0.12;

export class Game {
  state: GameState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      mode: 'menu',
      debugMode: null,
      score: 0,
      distance: 0,
      shield: 100,
      bestScore: 0,
      speed: BASE_SPEED_START,
      baseSpeed: BASE_SPEED_START,
      boostSpeed: 0.55,
      shipX: 0,
      shipY: 0,
      shipRoll: 0,
      rollDir: 0,
      rollCooldown: 0,
      time: 0,
      uiTime: 0,
      gameTime: 0,
      obstacles: [],
      orbs: [],
      mines: [],
      bullets: [],
      particles: [],
      powerups: [],
      stars: [],
      tunnelRadius: 8,
      maxViewZ: 200,
      lastObstacleIncreaseMinute: 0,
      mineTrackTime: 0,
      minesToPresent: 0,
      mineSpawnTimers: [],
      firstMinuteElapsed: false,
      trackerCount: 0,
      debugMenuSelected: 0,
      chaosFireTimer: 0,
      damageFlash: 0,
      collectFlash: 0,
      boosting: false,
      combo: 0,
      comboTimer: 0,
      warpLevel: 1,
      warpFlash: 0,
      rapidFire: 0,
      slowMotion: 0,
      fireTimer: 0,
      sounds: [],
      paused: false,
      muted: false,
      shake: 0,
      newBestFlash: 0,
      newBestShown: false,
      screenWidth: 80,
      screenHeight: 24,
    };
  }

  /**
   * The perspective scale toScreen applies at a given depth, on its own. The
   * pulse cannon needs it away from a full projection: a shot holds the screen
   * column it was fired down, and that means undoing the scale rather than
   * applying it.
   */
  private projScale(gz: number): number {
    const s = this.state;
    const t = max(0, min(1, (gz + s.maxViewZ) / s.maxViewZ));
    return 0.15 + t * 0.85;
  }

  /** Project game coordinates to screen space (matches render.ts gameToScreen) */
  private toScreen(gx: number, gy: number, gz: number): { col: number; row: number; scale: number } {
    const s = this.state;
    const sw = s.screenWidth;
    const sh = s.screenHeight;
    const gameTop = HUD_ROWS;
    const gameBottom = sh - FOOTER_ROWS;
    const gameH = gameBottom - gameTop;
    const t = max(0, min(1, (gz + s.maxViewZ) / s.maxViewZ));
    const scale = this.projScale(gz);
    const baseRow = gameTop + t * (gameH - 2);
    const colRange = (sw - 6) / 2;
    const col = sw / 2 + (gx / s.tunnelRadius) * colRange * scale;
    const rowOffset = -(gy / s.tunnelRadius) * gameH * Y_FACTOR * scale;
    const row = baseRow + rowOffset;
    return { col: floor(col), row: floor(row), scale };
  }

  initStars(width: number, height: number): void {
    this.state.stars = [];
    const starChars = ['.', '\u00B7', '*', '+'];
    const starColors = [8, 7, 15, 8, 7];
    for (let i = 0; i < 40; i++) {
      this.state.stars.push({
        x: floor(random() * width),
        y: floor(random() * height),
        speed: rand(0.3, 1.5),
        char: starChars[floor(random() * starChars.length)],
        color: starColors[floor(random() * starColors.length)],
      });
    }
  }

  showDebugMenu(): void {
    this.state.mode = 'debugMenu';
    this.state.debugMenuSelected = 0;
  }

  startGame(mode?: DebugMode | null): void {
    const s = this.state;
    s.debugMode = mode || null;
    s.mode = 'playing';
    s.score = 0;
    s.distance = 0;
    s.shield = 100;
    s.baseSpeed = BASE_SPEED_START;
    s.boostSpeed = 0.55;
    s.speed = s.baseSpeed;
    s.shipX = 0;
    s.shipY = 1;
    s.shipRoll = 0;
    s.rollDir = 0;
    s.rollCooldown = 0;
    s.combo = 0;
    s.comboTimer = 0;
    s.warpLevel = 1;
    s.warpFlash = 0;
    s.rapidFire = 0;
    s.slowMotion = 0;
    s.fireTimer = 0;
    s.obstacles = [];
    s.orbs = [];
    s.bullets = [];
    s.particles = [];
    s.powerups = [];
    s.mines = [];
    s.gameTime = 0;
    s.lastObstacleIncreaseMinute = 0;
    s.mineTrackTime = 0;
    s.minesToPresent = 0;
    s.mineSpawnTimers = [];
    s.firstMinuteElapsed = false;
    s.trackerCount = 0;
    s.chaosFireTimer = 0;
    s.damageFlash = 0;
    s.collectFlash = 0;
    s.boosting = false;
    s.paused = false;
    s.shake = 0;
    s.newBestFlash = 0;
    s.newBestShown = false;

    if (s.debugMode === 'mines') {
      for (let i = 0; i < 40; i++) this.spawnMine(-i * 10 - 30);
    } else if (s.debugMode === 'orbs') {
      for (let i = 0; i < 100; i++) this.spawnOrb(-i * 8 - 15);
    } else if (s.debugMode === 'obstacleCollision') {
      for (let i = 0; i < 60; i++) this.spawnObstacle(-i * 14 - 30);
    } else if (s.debugMode === 'mineCollision') {
      for (let i = 0; i < 40; i++) this.spawnMine(-i * 10 - 30);
    } else if (s.debugMode === 'chaos') {
      for (let i = 0; i < 120; i++) this.spawnObstacle(-i * 7 - 20);
      for (let i = 0; i < 50; i++) this.spawnOrb(-i * 10 - 15);
      for (let i = 0; i < 25; i++) this.spawnMine(-i * 12 - 30);
    } else {
      for (let i = 0; i < 60; i++) {
        this.spawnObstacle(-i * 14 - 30);
        if (random() < 0.4) this.spawnOrb(-i * 14 - 20);
      }
    }
  }

  private endGame(): void {
    const s = this.state;
    s.mode = 'dead';
    // Debug scenarios are diagnostics rather than scored runs, so they never
    // set the best score. Only a normal run can beat it.
    if (s.debugMode === null && s.score > s.bestScore) {
      s.bestScore = s.score;
      this.persistBestScore(s.bestScore);
    }
  }

  /**
   * Hook for storing the best score across sessions. The terminal build keeps
   * it in memory only; the browser build writes it to localStorage.
   */
  protected persistBestScore(_best: number): void { /* no persistence in the terminal build */ }

  private spawnObstacle(z: number): void {
    this.state.obstacles.push({
      x: rand(-4.5, 4.5), y: rand(0.5, 4.5), z,
      rot: rand(0, TAU), rotSpeed: rand(-2, 2), scale: rand(0.6, 1.5),
    });
  }

  private spawnOrb(z: number): void {
    this.state.orbs.push({
      x: rand(-4.5, 4.5), y: rand(0.5, 4.5), z, collected: false,
    });
  }

  private spawnMine(z: number): void {
    this.state.mines.push({
      x: rand(-4.5, 4.5), y: rand(0.5, 4.5), z,
      rot: rand(0, TAU), rotSpeed: rand(-2, 2), scale: rand(0.66, 1.65), hp: 5,
    });
  }

  /**
   * The powerup a destroyed mine may leave behind, where it was destroyed.
   *
   * It costs one draw per kill and a second one on the kills that do drop, so
   * a seeded run's sequence now depends on how many mines it shot. That is
   * what `test/engagement.mjs` seeds for and it stays reproducible, but a
   * figure quoted off a flight taken before this existed will not reproduce
   * against a flight taken after it.
   *
   * A drop is placed where the mine was when the bullet reached it, which is
   * already one frame of `advance` past where the mine started that frame, and
   * it does not move until the next one: `updatePowerups` has run by the time
   * `updateBullets` calls this.
   *
   * The collision-tracking scenarios get nothing. They are diagnostics rather
   * than scored runs - neither pays a combo either - and a pickup drifting
   * through one is a moving part in a screen that exists to count collisions.
   */
  private dropPowerup(x: number, y: number, z: number): void {
    const s = this.state;
    if (s.debugMode === 'obstacleCollision' || s.debugMode === 'mineCollision') return;
    if (random() >= POWERUP_DROP_CHANCE) return;
    const kind = POWERUP_KINDS[floor(random() * POWERUP_KINDS.length)];
    s.powerups.push({ x, y, z, kind });
  }

  private spawnParticles(x: number, y: number, z: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x, y, z,
        vx: rand(-3, 3), vy: rand(-3, 3), vz: rand(-1, 2),
        life: rand(0.3, 0.8), maxLife: 0.8, color,
      });
    }
  }

  handleMenuInput(justPressed: Record<string, boolean>): void {
    const s = this.state;

    if (s.mode === 'menu' || s.mode === 'dead') {
      if (justPressed['ENTER']) this.startGame();
    }

    if (s.mode === 'debugMenu') {
      if (justPressed['UP']) {
        s.debugMenuSelected = (s.debugMenuSelected - 1 + DEBUG_MODES.length) % DEBUG_MODES.length;
      }
      if (justPressed['DOWN']) {
        s.debugMenuSelected = (s.debugMenuSelected + 1) % DEBUG_MODES.length;
      }
      if (justPressed['ENTER']) {
        this.startGame(DEBUG_MODES[s.debugMenuSelected]);
      }
      for (let i = 0; i < 5; i++) {
        if (justPressed[`DIGIT_${i + 1}`]) {
          this.startGame(DEBUG_MODES[i]);
        }
      }
    }
  }

  /**
   * Queue a one-shot sound for the frame being simulated. The queue is drained
   * by whoever can make a noise with it, which is the browser build alone.
   */
  private cue(name: SoundCue): void {
    this.state.sounds.push(name);
  }

  /**
   * Count a kill into the combo chain and hand back the multiplier it earns.
   * The first kill is worth x1, and each further one inside the window raises
   * it, so a chain pays more the faster it is strung together, up to COMBO_MAX.
   * A kill at the ceiling still re-arms the window, so the chain is held rather
   * than broken by pressing on past it.
   */
  private registerKill(): number {
    const s = this.state;
    s.combo = min(s.combo + 1, COMBO_MAX);
    s.comboTimer = COMBO_TIME;
    return s.combo;
  }

  /**
   * One volley: the centre bolt from the muzzle and a wing bolt either side,
   * half a unit apart and half a unit further forward.
   *
   * Every shot in the game comes out of here - the trigger, the held trigger
   * under Rapid Fire, and the chaos scenario's auto-fire - so the three cannot
   * come to fire different spreads. The spread itself is what
   * `test/engagement.mjs` calls VOLLEY_SIZE and measures the volley band
   * against.
   */
  private fireVolley(): void {
    const s = this.state;
    s.bullets.push({ x: s.shipX, y: s.shipY, z: -2, life: 2 });
    s.bullets.push({ x: s.shipX - 0.25, y: s.shipY - 0.05, z: -1.5, life: 2 });
    s.bullets.push({ x: s.shipX + 0.25, y: s.shipY - 0.05, z: -1.5, life: 2 });
    this.cue('shot');
  }

  update(dt: number, keys: Record<string, boolean>, justPressed: Record<string, boolean>): void {
    const s = this.state;

    // The cue queue holds one frame's worth of sound. Emptying it here rather
    // than leaving it to the caller keeps it bounded in a build that never
    // reads it.
    s.sounds.length = 0;

    // M is a global setting toggle, so it works in every mode. P only pauses a
    // run in progress.
    if (justPressed['M']) s.muted = !s.muted;
    if (s.mode === 'playing' && justPressed['P']) s.paused = !s.paused;

    // Presentation timers keep running while paused so an in-flight flash or
    // shake finishes instead of freezing on screen.
    s.uiTime += dt;
    // The world's clock stops with the world, so a paused screen is a still
    // image. The gate names the mode as well as the flag: the title screen,
    // debug menu and game over screen animate off this clock and are not a
    // run in progress, so a bare `!s.paused` would freeze them too.
    if (!(s.mode === 'playing' && s.paused)) s.time += dt;
    s.damageFlash = max(0, s.damageFlash - dt * 8);
    s.collectFlash = max(0, s.collectFlash - dt * 8);
    s.newBestFlash = max(0, s.newBestFlash - dt);
    s.warpFlash = max(0, s.warpFlash - dt);
    s.shake = max(0, s.shake - dt);

    if (s.mode === 'playing' && !s.paused) {
      // Powerup durations are counted in real seconds rather than in the
      // world's, and counted here rather than inside updatePlaying, for two
      // reasons that pull the same way. A pause stops them, because a pickup
      // held across a paused screen is ten free seconds; and Slow Motion does
      // not stretch itself, because the clock it slows is the one that would
      // otherwise be counting it down.
      s.rapidFire = max(0, s.rapidFire - dt);
      s.slowMotion = max(0, s.slowMotion - dt);
      this.updatePlaying(s.slowMotion > 0 ? dt * SLOW_MOTION_SCALE : dt, keys, justPressed);
    }
  }

  private updatePlaying(dt: number, keys: Record<string, boolean>, justPressed: Record<string, boolean>): void {
    const s = this.state;
    const moveSpeed = 8;

    // Ship movement
    if (keys['A'] || keys['LEFT']) { s.shipX -= moveSpeed * dt; }
    if (keys['D'] || keys['RIGHT']) { s.shipX += moveSpeed * dt; }
    if (keys['W'] || keys['UP']) { s.shipY += moveSpeed * dt; }
    if (keys['S'] || keys['DOWN']) { s.shipY -= moveSpeed * dt; }

    this.updateBarrelRoll(dt, justPressed);
    this.updateCombo(dt);

    // Boost (F key since Shift is hard to detect in raw terminal mode)
    s.boosting = false;
    if (s.debugMode === 'chaos') {
      s.speed = lerp(s.speed, s.boostSpeed, 3 * dt);
      s.boosting = true;
    } else if (keys['F']) {
      s.speed = lerp(s.speed, s.boostSpeed, 3 * dt);
      s.boosting = true;
    } else {
      s.speed = lerp(s.speed, s.baseSpeed, 2 * dt);
    }

    // Constrain to tunnel (rectangular for 2D gameplay)
    const maxR = s.tunnelRadius - 1.5;
    s.shipX = max(-maxR, min(maxR, s.shipX));
    s.shipY = max(0, min(maxR, s.shipY));

    // Fire bullets. A press always fires on the frame it arrives, with or
    // without Rapid Fire: the trigger answering the key is the whole feel of
    // the cannon, and gating it behind a cadence would swallow keypresses to
    // buy a pickup something to improve. What Rapid Fire adds is the held
    // trigger - keep SPACE down and the volleys repeat at RAPID_FIRE_INTERVAL
    // until it runs out, which is RAPID_FIRE_MULT times the cadence
    // FIRE_INTERVAL names.
    if (justPressed['SPACE']) {
      this.fireVolley();
      s.fireTimer = 0;
    } else if (s.rapidFire > 0 && keys['SPACE']) {
      s.fireTimer += dt;
      if (s.fireTimer >= RAPID_FIRE_INTERVAL) {
        s.fireTimer -= RAPID_FIRE_INTERVAL;
        this.fireVolley();
      }
    } else {
      s.fireTimer = 0;
    }

    // Chaos auto-fire. It keeps its own cadence rather than reading Rapid
    // Fire's, which happens to be the same number: the scenario is a stress
    // test and the pickup is a reward, and tuning one should not move the
    // other.
    if (s.debugMode === 'chaos') {
      s.chaosFireTimer += dt;
      if (s.chaosFireTimer >= CHAOS_FIRE_INTERVAL) {
        s.chaosFireTimer = 0;
        this.fireVolley();
      }
    }

    // Advance forward
    const advance = s.speed * 60 * dt;
    s.distance += advance;

    // Score from distance
    if (s.debugMode !== 'obstacleCollision' && s.debugMode !== 'mineCollision') {
      s.score += floor(advance * 10 * (s.speed / s.baseSpeed));
    }

    // First crossing of the stored best in a normal run raises the HUD banner.
    // A best of 0 means there is nothing to beat yet, so the first run is quiet.
    if (s.debugMode === null && !s.newBestShown && s.bestScore > 0 && s.score > s.bestScore) {
      s.newBestShown = true;
      s.newBestFlash = NEW_BEST_FLASH_TIME;
    }

    // Difficulty scaling
    s.baseSpeed = BASE_SPEED_START + s.distance * 0.00002;
    s.boostSpeed = s.baseSpeed * 1.8;
    s.gameTime += dt;

    this.updateWarpLevel();
    this.updateObstacleScaling();
    this.updateMineSpawning(dt);
    this.updateObstacles(advance, dt);
    this.updateOrbs(advance);
    this.updateMines(advance, dt);
    this.updatePowerups(advance, dt);
    this.updateBullets(dt, advance);
    this.updateParticles(dt, advance);
    this.updateStars(dt);
  }

  /**
   * The difficulty step the run has reached, and the transition when it moves.
   *
   * It reads `gameTime` on the same WARP_INTERVAL boundary `updateObstacleScaling`
   * thickens the field on, but keeps its own counter rather than sharing
   * `lastObstacleIncreaseMinute`: that one is held still in the scenarios that
   * do not scale their field, and a run whose obstacles are fixed still gets
   * faster and still crosses the boundary the banner names.
   *
   * Level 1 is the opening minute, so the first transition a run ever sees is
   * the one that raises WARP LEVEL 2.
   */
  private updateWarpLevel(): void {
    const s = this.state;
    const level = floor(s.gameTime / WARP_INTERVAL) + 1;
    if (level <= s.warpLevel) return;
    s.warpLevel = level;
    s.warpFlash = WARP_FLASH_TIME;
  }

  /**
   * Dropped powerups: carried in by the tunnel and pulled toward the ship.
   *
   * The drift is what makes a drop worth chasing rather than a coin flip about
   * where the mine happened to die. It closes on the ship in x and y at
   * POWERUP_DRIFT a second while the tunnel carries it forward at the run's own
   * speed, so a drop from a mine killed dead ahead falls into the ship and one
   * killed out by a wall is a decision about whether to go and get it.
   *
   * Collection uses the same bounding-box overlap the orbs use, against the
   * ship's drawn sprite, so a pickup registers where the player sees the two
   * meet. Nothing here is gated on the barrel roll: rolling through a powerup
   * collects it, because the roll is invincibility to damage and not a state
   * of not being there.
   */
  private updatePowerups(advance: number, dt: number): void {
    const s = this.state;
    const shipScr = this.toScreen(s.shipX, s.shipY, 0);

    for (let i = s.powerups.length - 1; i >= 0; i--) {
      const p = s.powerups[i];
      p.z += advance;
      // Past the ship it is gone for good. Unlike an obstacle or an orb there
      // is nothing to recycle: a drop is the record of one mine, and putting
      // it back at the far end would be a second reward for the same kill.
      if (p.z > 10) { s.powerups.splice(i, 1); continue; }

      const dx = s.shipX - p.x;
      const dy = s.shipY - p.y;
      const dist = sqrt(dx * dx + dy * dy);
      if (dist > 0.0001) {
        const step = min(dist, POWERUP_DRIFT * dt);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }

      if (p.z > -20 && p.z < 5) {
        const pScr = this.toScreen(p.x, p.y, p.z);
        const size = max(1, floor(pScr.scale * 2));
        const half = floor(size / 2);
        const drow = shipScr.row - pScr.row;
        if (abs(shipScr.col - pScr.col) <= SHIP_HALF_W + half &&
            drow <= 2 + half && drow >= -(1 + half)) {
          this.collectPowerup(p);
          s.powerups.splice(i, 1);
        }
      }
    }
  }

  /** What a pickup does, and the flash and burst that say it happened. */
  private collectPowerup(p: Powerup): void {
    const s = this.state;
    if (p.kind === 'shield') {
      s.shield = min(100, s.shield + POWERUP_SHIELD_GAIN);
    } else if (p.kind === 'rapid') {
      s.rapidFire = RAPID_FIRE_TIME;
    } else {
      s.slowMotion = SLOW_MOTION_TIME;
    }
    s.collectFlash = 0.6;
    this.cue('powerup');
    this.spawnParticles(p.x, p.y, p.z, POWERUP_GLYPHS[p.kind].bright, 12);
  }

  /**
   * Barrel roll. Q rolls left and E rolls right, for as long as ROLL_TIME, and
   * the ship is untouchable for the whole of it - that dodge is what the move
   * is for. The cooldown starts with the roll rather than with its end, so it
   * bounds how much of a run can be spent invincible.
   */
  private updateBarrelRoll(dt: number, justPressed: Record<string, boolean>): void {
    const s = this.state;
    if (s.rollCooldown > 0) s.rollCooldown = max(0, s.rollCooldown - dt);

    if (s.shipRoll > 0) {
      s.shipRoll = max(0, s.shipRoll - dt);
      if (s.shipRoll === 0) s.rollDir = 0;
      return;
    }

    if (s.rollCooldown > 0) return;
    const dir = justPressed['Q'] ? -1 : justPressed['E'] ? 1 : 0;
    if (dir === 0) return;

    s.shipRoll = ROLL_TIME;
    s.rollDir = dir;
    s.rollCooldown = ROLL_COOLDOWN;
  }

  /** True while a barrel roll is carrying the ship through whatever it hits. */
  private invincible(): boolean {
    return this.state.shipRoll > 0;
  }

  /**
   * Combo decay. Every kill re-arms the window in registerKill; COMBO_TIME
   * without one drops the chain, so the multiplier only pays for kills strung
   * together rather than for a long run's total.
   */
  private updateCombo(dt: number): void {
    const s = this.state;
    if (s.comboTimer <= 0) return;
    s.comboTimer = max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 0;
  }

  private updateObstacleScaling(): void {
    const s = this.state;
    if (!s.debugMode || s.debugMode === 'obstacleCollision' || s.debugMode === 'chaos') {
      const currentMinute = floor(s.gameTime / 60);
      if (currentMinute > s.lastObstacleIncreaseMinute) {
        const newCount = Math.ceil(s.obstacles.length * 0.1);
        for (let i = 0; i < newCount; i++) {
          this.spawnObstacle(-rand(30, RECYCLE_Z));
        }
        s.lastObstacleIncreaseMinute = currentMinute;
      }
    }
  }

  private updateMineSpawning(dt: number): void {
    const s = this.state;
    if (s.debugMode && s.debugMode !== 'mines' && s.debugMode !== 'mineCollision' && s.debugMode !== 'chaos') return;

    if (s.debugMode === 'mines' || s.debugMode === 'mineCollision' || s.debugMode === 'chaos') {
      s.mineTrackTime += dt;
      if (s.mineTrackTime >= 5) {
        s.mineTrackTime = 0;
        const count = s.debugMode === 'chaos' ? 3 : 2;
        for (let i = 0; i < count; i++) this.spawnMine(-rand(30, 60));
      }
    } else {
      s.mineTrackTime += dt;
      if (!s.firstMinuteElapsed) {
        if (s.mineTrackTime >= 60) {
          s.firstMinuteElapsed = true;
          s.mineTrackTime = 0;
          s.minesToPresent += 1;
          s.mineSpawnTimers = [];
          for (let i = 0; i < s.minesToPresent; i++) {
            s.mineSpawnTimers.push(floor(30 * random()));
          }
        }
      } else {
        if (s.mineTrackTime >= 30) {
          s.mineTrackTime = 0;
          s.minesToPresent += 1;
          s.mineSpawnTimers = [];
          for (let i = 0; i < s.minesToPresent; i++) {
            s.mineSpawnTimers.push(floor(30 * random()));
          }
        }
        for (let i = s.mineSpawnTimers.length - 1; i >= 0; i--) {
          if (s.mineTrackTime >= s.mineSpawnTimers[i]) {
            this.spawnMine(-rand(30, 60));
            s.mineSpawnTimers.splice(i, 1);
          }
        }
      }
    }
  }

  private updateObstacles(advance: number, dt: number): void {
    const s = this.state;
    if (s.debugMode && s.debugMode !== 'obstacleCollision' && s.debugMode !== 'chaos') return;

    const shipScr = this.toScreen(s.shipX, s.shipY, 0);

    for (let i = s.obstacles.length - 1; i >= 0; i--) {
      const o = s.obstacles[i];
      o.z += advance;
      o.rot += o.rotSpeed * dt;
      if (o.z > 10) {
        o.z -= RECYCLE_Z;
        o.x = rand(-4.5, 4.5);
        o.y = rand(0.5, 4.5);
        o.scale = rand(0.6, 1.5);
      }
      // 2D bounding-box overlap on the character grid
      // Vertical check is asymmetric: trigger when ship top is within 1 char of obstacle bottom
      if (o.z > -20 && o.z < 5) {
        const oScr = this.toScreen(o.x, o.y, o.z);
        const size = max(1, floor(oScr.scale * 2.5));
        const half = floor(size / 2);
        const dy = shipScr.row - oScr.row;
        if (abs(shipScr.col - oScr.col) <= SHIP_HALF_W + half &&
            dy <= 2 + half && dy >= -(1 + half)) {
          if (this.invincible()) continue; // rolled clean through it
          s.shake = SHAKE_TIME; // every branch below is an impact
          this.cue('damage');
          if (s.debugMode === 'obstacleCollision') {
            s.trackerCount++;
            s.damageFlash = 0.5;
            this.spawnParticles(o.x, o.y, o.z, 208, 8);
            o.z = -RECYCLE_Z + rand(-10, 10);
          } else if (s.debugMode === 'chaos') {
            s.damageFlash = 0.3;
            this.spawnParticles(o.x, o.y, o.z, 208, 8);
            o.z = -RECYCLE_Z + rand(-10, 10);
          } else {
            s.shield -= 25;
            s.damageFlash = 0.8;
            this.spawnParticles(o.x, o.y, o.z, 9, 8);
            o.z = -RECYCLE_Z + rand(-10, 10);
            if (s.shield <= 0) { s.shield = 0; this.endGame(); return; }
          }
        }
      }
    }
  }

  private updateOrbs(advance: number): void {
    const s = this.state;
    if (s.debugMode && s.debugMode !== 'orbs' && s.debugMode !== 'chaos') return;

    const shipScr = this.toScreen(s.shipX, s.shipY, 0);

    for (let i = s.orbs.length - 1; i >= 0; i--) {
      const o = s.orbs[i];
      o.z += advance;
      if (o.z > 10) {
        o.z -= RECYCLE_Z;
        o.x = rand(-4.5, 4.5);
        o.y = rand(0.5, 4.5);
        o.collected = false;
      }
      // 2D bounding-box overlap on the character grid
      // Vertical check is asymmetric: trigger when ship top is within 1 char of orb bottom
      if (!o.collected && o.z > -20 && o.z < 5) {
        const oScr = this.toScreen(o.x, o.y, o.z);
        const size = max(1, floor(oScr.scale * 2));
        const half = floor(size / 2);
        const dy = shipScr.row - oScr.row;
        if (abs(shipScr.col - oScr.col) <= SHIP_HALF_W + half &&
            dy <= 2 + half && dy >= -(1 + half)) {
          o.collected = true;
          s.score += 500;
          s.shield = min(100, s.shield + 10);
          s.collectFlash = 0.6;
          this.cue('orb');
          this.spawnParticles(o.x, o.y, o.z, 10, 10);
        }
      }
    }
  }

  private updateMines(advance: number, dt: number): void {
    const s = this.state;
    if (s.debugMode && s.debugMode !== 'mines' && s.debugMode !== 'mineCollision' && s.debugMode !== 'chaos') return;

    const shipScr = this.toScreen(s.shipX, s.shipY, 0);

    for (let i = s.mines.length - 1; i >= 0; i--) {
      const m = s.mines[i];
      m.z += advance;
      m.rot += m.rotSpeed * dt;
      if (m.z > 10) {
        if (s.debugMode === 'mines' || s.debugMode === 'mineCollision') {
          m.z = -rand(30, 60);
          m.x = rand(-4.5, 4.5);
          m.y = rand(0.5, 4.5);
          m.hp = 5;
          continue;
        }
        s.mines.splice(i, 1);
        continue;
      }
      // 2D bounding-box overlap on the character grid
      // Vertical check is asymmetric: trigger when ship top is within 1 char of mine bottom
      if (m.z > -20 && m.z < 5) {
        const mScr = this.toScreen(m.x, m.y, m.z);
        const size = max(1, floor(mScr.scale * 2.5));
        const half = floor(size / 2);
        const dy = shipScr.row - mScr.row;
        if (abs(shipScr.col - mScr.col) <= SHIP_HALF_W + half &&
            dy <= 2 + half && dy >= -(1 + half)) {
          if (this.invincible()) continue; // rolled clean through it
          s.shake = SHAKE_TIME; // every branch below is an impact
          this.cue('damage');
          if (s.debugMode === 'mineCollision') {
            s.trackerCount++;
            s.damageFlash = 0.5;
            this.spawnParticles(m.x, m.y, m.z, 9, 8);
            m.z = -rand(30, 60);
            m.x = rand(-4.5, 4.5);
            m.y = rand(0.5, 4.5);
            m.hp = 5;
          } else if (s.debugMode === 'chaos') {
            s.damageFlash = 0.5;
            this.spawnParticles(m.x, m.y, m.z, 9, 15);
            s.mines.splice(i, 1);
          } else {
            s.shield -= 35;
            s.damageFlash = 1.0;
            this.spawnParticles(m.x, m.y, m.z, 9, 15);
            s.mines.splice(i, 1);
            if (s.shield <= 0) { s.shield = 0; this.endGame(); return; }
          }
        }
      }
    }
  }

  /**
   * Whether a shot's tracer met a target's block on the screen at any point in
   * the frame just stepped.
   *
   * The screen is the whole of the hit test, because the screen is the whole of
   * what the player has. `drawBullets` puts the tracer on two cells, the row it
   * is projected to and the row above, and on neither of them where that column
   * has left the corridor; `drawEntitiesFar` gives a target a block of `size`
   * cells about its own projected centre. The two either share a cell or they
   * do not, and neither a target that is not being drawn nor a tracer that is
   * not being drawn can be half of a contact.
   *
   * The corridor clip is read from `tracerLit`, which is what `drawBullets`
   * draws by, so the two cannot come to state different corridors. Leaving it
   * out - which is how this stood until the clip was measured - let a shot
   * register from a column the tunnel no longer reaches: `drawEntitiesFar`
   * draws a target's block whether or not the corridor covers it, so the player
   * saw the block, saw no bolt, and the block died anyway. Walked as geometry
   * over every firing column and height the ship can hold, every depth of a
   * shot's life and every legal target placement, 594 undrawn-tracer
   * configurations at 80x24 registered a kill, 2241 at 60x20 and 76 at 205x50;
   * `npm run probe -- free-flight` prints the walk. Reading the clip here costs
   * nothing measurable: every band the suite pins, at all three grids and in
   * both builds, came back on the figure it had.
   *
   * Depth is not compared. Shot and target are drawn at their own depths, so
   * two things a frame apart in depth can be a cell apart on the screen and two
   * things level in depth can be rows apart; testing them on one projected
   * plane, as this used to, asks a question the player is never shown the
   * answer to. A kill therefore lands with the shot well off the target's
   * depth, tens of units either way, which is what this projection draws.
   *
   * Columns keep their slack and rows have none. A column is countable on the
   * screen and a row is not - Y_FACTOR squashes the tunnel's height, and a
   * target's row moves at its depth's scale while the ship's moves at full
   * scale - so a row of slack was buying an aim the player could not have
   * taken. Under the contact rule height stops deciding a kill at all: a tracer
   * climbs its whole column and meets whatever is drawn in it.
   *
   * The frame is swept rather than sampled at its ends, so a long `dt` cannot
   * carry a tracer over a block between two frames and leave the pair untested.
   * Both sides move: the shot outward by its travel, the target inward by
   * `advance`, which `updateObstacles` has already applied by the time this
   * runs - so the target started the frame at `tz - advance`.
   */
  private contacts(
    aimX: number, bulletY: number, bulletFromZ: number, travel: number,
    tx: number, ty: number, tz: number, advance: number, slackCols: number
  ): boolean {
    const s = this.state;
    const gameTop = HUD_ROWS;
    const gameBottom = s.screenHeight - FOOTER_ROWS;

    // Holding the firing column means the shot's own column is constant for the
    // whole flight, so it is worth one projection rather than one per sample.
    const bCol = this.toScreen(aimX / this.projScale(bulletFromZ), bulletY, bulletFromZ).col;

    // A target's column and its block both grow with its scale, which is
    // monotonic in depth, so the frame's two ends bound everything between
    // them: a bullet column outside that bound cannot touch the block at any
    // point of the frame, and the sweep below can be skipped outright.
    //
    // The bound is the distance to the span the two ends enclose, not the
    // nearer of the two distances. The column the target passes through mid
    // frame is nearer than either end whenever the shot's column lies between
    // them, so taking the nearer end skips a contact the sweep would have
    // found - by measurement, 703 of 7625 contacts at 205x50 at a sixth of a
    // second a frame, which is the slowest rate the suite walks.
    let widest = -1;
    let lo = Infinity;
    let hi = -Infinity;
    for (const z of [tz - advance, tz]) {
      widest = max(widest, floor(max(1, floor(this.projScale(z) * 2.5)) / 2));
      const col = this.toScreen(tx, ty, z).col;
      lo = min(lo, col);
      hi = max(hi, col);
    }
    const nearest = bCol < lo ? lo - bCol : bCol > hi ? bCol - hi : 0;
    if (nearest > widest + slackCols) return false;

    const steps = max(1, ceil((travel + advance) / SWEEP_STEP));
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const targetZ = tz - advance * (1 - f);
      // drawEntitiesFar draws nothing outside this depth band.
      if (targetZ < -s.maxViewZ || targetZ > 5) continue;
      const tScr = this.toScreen(tx, ty, targetZ);
      if (tScr.row < gameTop || tScr.row >= gameBottom) continue;

      const bulletZ = bulletFromZ - travel * f;
      const bScr = this.toScreen(aimX / this.projScale(bulletZ), bulletY, bulletZ);
      // drawBullets drops the whole tracer when its lower half is off the play
      // area, and draws the upper half only when there is a row above for it.
      if (bScr.row < gameTop || bScr.row >= gameBottom) continue;

      const half = floor(max(1, floor(this.projScale(targetZ) * 2.5)) / 2);
      if (abs(bScr.col - tScr.col) > half + slackCols) continue;

      // The block is clipped to the play area as drawBlock clips it; the tracer
      // is its own row and, where there is room for it, the row above - and
      // each half only where drawBullets would actually draw it, which is
      // inside the corridor and nowhere else.
      const blockTop = max(gameTop, tScr.row - half);
      const blockBottom = min(gameBottom - 1, tScr.row + half);
      const lowLit = tracerLit(bScr.col, bScr.row, gameTop, gameBottom, s.screenWidth);
      const highLit = bScr.row - 1 >= gameTop
        && tracerLit(bScr.col, bScr.row - 1, gameTop, gameBottom, s.screenWidth);
      if (!lowLit && !highLit) continue; // nothing drawn, so nothing to register
      const tracerTop = highLit ? bScr.row - 1 : bScr.row;
      const tracerBottom = lowLit ? bScr.row : bScr.row - 1;
      if (tracerTop <= blockBottom && tracerBottom >= blockTop) return true;
    }
    return false;
  }

  /**
   * Bullet flight and what it hits.
   *
   * Horizontally a shot holds the screen column it was fired down rather than
   * a line of constant world x, because the column is the player's whole aim:
   * the target is one glyph in one of about seventy columns, the ship is
   * another, and there is no reticle to do it any other way. A world-space
   * shot converges on the vanishing point as it recedes while the target it
   * was aimed at diverges from it, so a shot lined up at the muzzle lands wide
   * of anything off-centre, and the wider the range the wider it lands. Paying
   * `b.x` forward by the ratio of the two scales holds the column instead, and
   * the shot then draws as the straight line up the screen a player already
   * reads it as.
   *
   * Vertically it stays in world space, because that axis reads differently.
   * Y_FACTOR squashes the tunnel's whole height into about eight rows at the
   * muzzle, so nobody aims by row - they aim by how high in the tunnel the
   * target sits, which is world y. Holding the row instead measured worse at
   * every range, since it puts the shot above a target the player had lined up
   * correctly.
   *
   * Holding the column is also why a shot fired from near a wall ends up
   * outside the drawn tunnel partway through its flight: the corridor
   * converges on the vanishing point and the shot does not. That is left
   * alone here, because the column is the aim and the hit rates ride on it.
   * drawBullets in render.ts stops drawing the tracer there instead, and says
   * why the flight may not be cut short with it.
   *
   * What a shot then registers against is decided on the screen, by `contacts`
   * above: a tracer drawn on a target's block destroys it, and one that is not
   * drawn on it does not. That second half covers a tracer drawn beside the
   * block and a tracer not drawn at all, which are the two ways of not being
   * drawn on it - so a shot whose column has left the corridor registers
   * nothing for as long as it is dark, and a block the player can see with no
   * bolt on it survives.
   */
  private updateBullets(dt: number, advance: number): void {
    const s = this.state;
    const travel = 60 * dt;
    const slackCols = shotSlackCols(s.screenWidth);

    for (let i = s.bullets.length - 1; i >= 0; i--) {
      const b = s.bullets[i];
      const fromZ = b.z;
      b.z -= travel;
      b.life -= dt;
      if (b.life <= 0) { s.bullets.splice(i, 1); continue; }

      // x * scale is constant along a screen ray, so carrying x forward by the
      // ratio of the two scales holds the column the shot was fired at.
      b.x *= this.projScale(fromZ) / this.projScale(b.z);
      const aimX = b.x * this.projScale(b.z);

      let hit = false;

      // Bullet-obstacle collision, taken on the screen the player is watching.
      if (!s.debugMode || s.debugMode === 'obstacleCollision' || s.debugMode === 'chaos') {
        for (let j = s.obstacles.length - 1; j >= 0; j--) {
          const o = s.obstacles[j];
          if (!this.contacts(aimX, b.y, fromZ, travel, o.x, o.y, o.z, advance, slackCols)) continue;
          this.spawnParticles(o.x, o.y, o.z, 208, 12);
          if (s.debugMode === 'chaos') s.trackerCount++;
          const dm = s.debugMode as string | null;
          // The collision-tracking modes are not scored, so a kill in one of
          // them carries no multiplier and never starts a chain either.
          if (dm !== 'obstacleCollision' && dm !== 'mineCollision') {
            s.score += 200 * this.registerKill();
          }
          o.z = -RECYCLE_Z + rand(-10, 10);
          s.bullets.splice(i, 1);
          hit = true;
          break;
        }
      }

      if (hit) continue;

      // Bullet-mine collision, on the same rule.
      if (!s.debugMode || s.debugMode === 'mines' || s.debugMode === 'mineCollision' || s.debugMode === 'chaos') {
        for (let j = s.mines.length - 1; j >= 0; j--) {
          const m = s.mines[j];
          if (!this.contacts(aimX, b.y, fromZ, travel, m.x, m.y, m.z, advance, slackCols)) continue;
          m.hp -= 1;
          this.spawnParticles(m.x, m.y, m.z, 9, 5);
          if (m.hp <= 0) {
            this.spawnParticles(m.x, m.y, m.z, 9, 20);
            this.cue('mine');
            this.dropPowerup(m.x, m.y, m.z);
            if (s.debugMode === 'chaos') s.trackerCount++;
            const dm2 = s.debugMode as string | null;
            if (dm2 !== 'obstacleCollision' && dm2 !== 'mineCollision') {
              s.score += 500 * this.registerKill();
            }
            s.mines.splice(j, 1);
          }
          s.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  private updateParticles(dt: number, advance: number): void {
    const s = this.state;
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + advance) * dt;
      p.life -= dt;
      if (p.life <= 0) s.particles.splice(i, 1);
    }
  }

  private updateStars(dt: number): void {
    const s = this.state;
    const speedMul = s.speed / s.baseSpeed;
    for (const star of s.stars) {
      star.y += star.speed * speedMul * dt * 30;
    }
  }
}
