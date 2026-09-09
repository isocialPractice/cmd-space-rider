// src/game.ts — Game engine: state management, physics, collision, entities

import {
  GameState, GameMode, DebugMode, DEBUG_MODES, SoundCue,
  Obstacle, Orb, Mine, Bullet, Particle, Star,
  BASE_SPEED_START, SHAKE_TIME, NEW_BEST_FLASH_TIME,
  ROLL_TIME, ROLL_COOLDOWN, COMBO_TIME, COMBO_MAX,
} from './types';

const { PI, sin, cos, sqrt, abs, max, min, floor, random, atan2 } = Math;
const TAU = PI * 2;
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

  /** Project game coordinates to screen space (matches render.ts gameToScreen) */
  private toScreen(gx: number, gy: number, gz: number): { col: number; row: number; scale: number } {
    const s = this.state;
    const sw = s.screenWidth;
    const sh = s.screenHeight;
    const gameTop = HUD_ROWS;
    const gameBottom = sh - FOOTER_ROWS;
    const gameH = gameBottom - gameTop;
    const t = max(0, min(1, (gz + s.maxViewZ) / s.maxViewZ));
    const scale = 0.15 + t * 0.85;
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
    s.obstacles = [];
    s.orbs = [];
    s.bullets = [];
    s.particles = [];
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
    s.shake = max(0, s.shake - dt);

    if (s.mode === 'playing' && !s.paused) {
      this.updatePlaying(dt, keys, justPressed);
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

    // Fire bullets
    if (justPressed['SPACE']) {
      s.bullets.push({ x: s.shipX, y: s.shipY, z: -2, life: 2 });
      s.bullets.push({ x: s.shipX - 0.25, y: s.shipY - 0.05, z: -1.5, life: 2 });
      s.bullets.push({ x: s.shipX + 0.25, y: s.shipY - 0.05, z: -1.5, life: 2 });
      this.cue('shot');
    }

    // Chaos auto-fire
    if (s.debugMode === 'chaos') {
      s.chaosFireTimer += dt;
      if (s.chaosFireTimer >= 0.12) {
        s.chaosFireTimer = 0;
        s.bullets.push({ x: s.shipX, y: s.shipY, z: -2, life: 2 });
        s.bullets.push({ x: s.shipX - 0.25, y: s.shipY - 0.05, z: -1.5, life: 2 });
        s.bullets.push({ x: s.shipX + 0.25, y: s.shipY - 0.05, z: -1.5, life: 2 });
        this.cue('shot');
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

    this.updateObstacleScaling();
    this.updateMineSpawning(dt);
    this.updateObstacles(advance, dt);
    this.updateOrbs(advance);
    this.updateMines(advance, dt);
    this.updateBullets(dt, advance);
    this.updateParticles(dt, advance);
    this.updateStars(dt);
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

  private updateBullets(dt: number, advance: number): void {
    const s = this.state;
    for (let i = s.bullets.length - 1; i >= 0; i--) {
      const b = s.bullets[i];
      b.z -= 60 * dt;
      b.life -= dt;
      if (b.life <= 0) { s.bullets.splice(i, 1); continue; }

      const bScr = this.toScreen(b.x, b.y, b.z);
      // Bullet bbox: 1 col wide, 2 rows tall → (bCol, bRow-1) to (bCol, bRow)
      let hit = false;

      // Bullet-obstacle collision (2D character-grid overlap)
      if (!s.debugMode || s.debugMode === 'obstacleCollision' || s.debugMode === 'chaos') {
        for (let j = s.obstacles.length - 1; j >= 0; j--) {
          const o = s.obstacles[j];
          if (abs(b.z - o.z) > 10) continue;
          const oScr = this.toScreen(o.x, o.y, o.z);
          const size = max(1, floor(oScr.scale * 2.5));
          const half = floor(size / 2);
          // bullet col in obstacle col range, and bullet row range overlaps obstacle row range
          if (abs(bScr.col - oScr.col) <= half &&
              bScr.row >= oScr.row - half && bScr.row - 1 <= oScr.row + half) {
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
      }

      if (hit) continue;

      // Bullet-mine collision (2D character-grid overlap)
      if (!s.debugMode || s.debugMode === 'mines' || s.debugMode === 'mineCollision' || s.debugMode === 'chaos') {
        for (let j = s.mines.length - 1; j >= 0; j--) {
          const m = s.mines[j];
          if (abs(b.z - m.z) > 10) continue;
          const mScr = this.toScreen(m.x, m.y, m.z);
          const size = max(1, floor(mScr.scale * 2.5));
          const half = floor(size / 2);
          if (abs(bScr.col - mScr.col) <= half &&
              bScr.row >= mScr.row - half && bScr.row - 1 <= mScr.row + half) {
            m.hp -= 1;
            this.spawnParticles(m.x, m.y, m.z, 9, 5);
            if (m.hp <= 0) {
              this.spawnParticles(m.x, m.y, m.z, 9, 20);
              this.cue('mine');
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
