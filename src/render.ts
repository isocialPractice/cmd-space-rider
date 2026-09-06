// src/render.ts — Terminal renderer: tunnel, ship, entities, HUD, effects

import { ScreenBuffer } from './screen';
import { GameState, C, DEBUG_MODE_NAMES, BASE_SPEED_START, SHAKE_TIME } from './types';

const { sin, cos, floor, round, max, min, abs, sqrt } = Math;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number): number => max(lo, min(hi, v));

const HUD_ROWS = 3;
const FOOTER_ROWS = 2;

/** Map game 3D coordinates to screen position with perspective */
function gameToScreen(
  gx: number, gy: number, gz: number,
  sw: number, sh: number,
  gameTop: number, gameBottom: number,
  tunnelRadius: number, maxZ: number
): { col: number; row: number; scale: number } {
  const gameH = gameBottom - gameTop;
  const t = clamp((gz + maxZ) / maxZ, 0, 1); // 0=far(top), 1=near(bottom)
  const scale = 0.15 + t * 0.85;
  const baseRow = gameTop + t * (gameH - 2);
  const colRange = (sw - 6) / 2;
  const col = sw / 2 + (gx / tunnelRadius) * colRange * scale;
  const rowOffset = -(gy / tunnelRadius) * (gameH * 0.4) * scale;
  const row = baseRow + rowOffset;
  return { col: floor(col), row: floor(row), scale };
}

export function renderGame(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  const gameTop = HUD_ROWS;
  const gameBottom = h - FOOTER_ROWS;

  screen.clear(C.BLACK);
  drawStarfield(screen, state, gameTop, gameBottom);
  drawTunnel(screen, state, gameTop, gameBottom);
  drawEntitiesFar(screen, state, gameTop, gameBottom);
  drawBullets(screen, state, gameTop, gameBottom);
  drawParticles(screen, state, gameTop, gameBottom);
  drawShip(screen, state, gameTop, gameBottom);
  // Jolt the play area only, so the HUD and border stay anchored.
  screen.shiftRows(gameTop, gameBottom, shakeColumns(state));
  drawHUD(screen, state);
  drawFooter(screen, state);
  drawEffects(screen, state);
  if (state.paused) drawPauseOverlay(screen, state);
}

/**
 * Damage screen shake as a whole-column offset. The terminal has no subpixel
 * positioning, so the jolt is one character cell either way, fading with the
 * shake timer.
 */
export function shakeColumns(state: GameState): number {
  if (state.shake <= 0) return 0;
  const strength = state.shake / SHAKE_TIME;
  return round(sin(state.uiTime * 40) * 1.5 * strength);
}

function drawStarfield(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const h = screen.height;
  const w = screen.width;
  for (const star of state.stars) {
    const sy = star.y % h;
    const y = sy < 0 ? sy + h : sy;
    if (y >= gameTop && y < gameBottom) {
      screen.put(floor(star.x) % w, floor(y), star.char, star.color, C.BLACK);
    }
  }
}

function drawTunnel(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const w = screen.width;
  const gameH = gameBottom - gameTop;
  const center = floor(w / 2);
  const ringSpacing = 4;
  const ringOffset = floor(state.distance * 0.3) % ringSpacing;

  for (let row = gameTop; row < gameBottom; row++) {
    const t = (row - gameTop) / gameH; // 0=far(top), 1=near(bottom)
    const halfSpan = floor(3 + t * (center - 4));
    const leftWall = center - halfSpan;
    const rightWall = center + halfSpan;

    // Wall thickness: thicker near camera
    const thickness = max(1, floor(t * 3));

    // Wall character and color based on depth
    let wallChar: string;
    let wallColor: number;
    const pulse = sin(state.time * 3 + row * 0.15) * 0.3 + 0.7;

    if (t < 0.2) {
      wallChar = '\u2591'; // ░
      wallColor = pulse > 0.6 ? C.DARK_BLUE : C.BLUE;
    } else if (t < 0.5) {
      wallChar = '\u2592'; // ▒
      wallColor = pulse > 0.6 ? C.BLUE : C.BRIGHT_BLUE;
    } else if (t < 0.8) {
      wallChar = '\u2593'; // ▓
      wallColor = pulse > 0.6 ? C.BRIGHT_BLUE : C.CYAN;
    } else {
      wallChar = '\u2588'; // █
      wallColor = pulse > 0.6 ? C.CYAN : C.BRIGHT_CYAN;
    }

    // Draw left wall
    for (let dx = 0; dx < thickness; dx++) {
      screen.put(leftWall - dx, row, wallChar, wallColor, C.BLACK);
    }
    // Draw right wall
    for (let dx = 0; dx < thickness; dx++) {
      screen.put(rightWall + dx, row, wallChar, wallColor, C.BLACK);
    }

    // Neon ring lines at intervals (scrolling with distance)
    const isRing = (row - gameTop + ringOffset) % ringSpacing === 0;
    if (isRing && t > 0.1) {
      const ringColor = t > 0.5 ? C.BRIGHT_CYAN : C.CYAN;
      screen.put(leftWall, row, '\u2563', ringColor, C.BLACK); // ╣
      screen.put(rightWall, row, '\u2560', ringColor, C.BLACK); // ╠

      // Subtle floor dots between walls
      if (t > 0.3) {
        for (let x = leftWall + 2; x < rightWall; x += 4) {
          screen.put(x, row, '\u00B7', C.DARK_BLUE, C.BLACK); // ·
        }
      }
    }
  }
}

function drawEntitiesFar(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const w = screen.width;
  const h = screen.height;

  // Draw obstacles (sorted back-to-front implicitly by draw order)
  for (const o of state.obstacles) {
    if (o.z < -state.maxViewZ || o.z > 5) continue;
    const pos = gameToScreen(o.x, o.y, o.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row < gameTop || pos.row >= gameBottom) continue;
    const size = max(1, floor(pos.scale * 2.5));
    const glow = sin(state.time * 3 + o.z) * 0.3 + 0.5;
    const color = glow > 0.5 ? C.BRIGHT_RED : C.RED;
    const ch = size >= 2 ? '\u2593' : '\u25A0'; // ▓ or ■
    drawBlock(screen, pos.col, pos.row, size, ch, color, gameTop, gameBottom);
  }

  // Draw mines
  for (const m of state.mines) {
    if (m.z < -state.maxViewZ || m.z > 5) continue;
    const pos = gameToScreen(m.x, m.y, m.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row < gameTop || pos.row >= gameBottom) continue;
    const size = max(1, floor(pos.scale * 2.5));
    // Blink between red and dark
    const blink = sin(state.time * 8) > 0;
    const color = blink ? C.BRIGHT_RED : C.GRAY;
    const ch = blink ? '\u25C8' : '\u25A0'; // ◈ or ■
    drawBlock(screen, pos.col, pos.row, size, ch, color, gameTop, gameBottom);
  }

  // Draw orbs
  for (const o of state.orbs) {
    if (o.collected || o.z < -state.maxViewZ || o.z > 5) continue;
    const pos = gameToScreen(o.x, o.y + sin(state.time * 4 + o.x) * 0.3, o.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row < gameTop || pos.row >= gameBottom) continue;
    const size = max(1, floor(pos.scale * 2));
    const pulse = sin(state.time * 5) * 0.3 + 0.7;
    const color = pulse > 0.6 ? C.BRIGHT_GREEN : C.GREEN;
    const ch = size >= 2 ? '\u25C6' : '\u2666'; // ◆ or ♦
    drawBlock(screen, pos.col, pos.row, size, ch, color, gameTop, gameBottom);
  }
}

function drawBlock(
  screen: ScreenBuffer, cx: number, cy: number, size: number,
  ch: string, color: number, gameTop: number, gameBottom: number
): void {
  const half = floor(size / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const y = cy + dy;
      if (y >= gameTop && y < gameBottom) {
        screen.put(cx + dx, y, ch, color, C.BLACK);
      }
    }
  }
}

function drawBullets(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const w = screen.width;
  const h = screen.height;
  for (const b of state.bullets) {
    const pos = gameToScreen(b.x, b.y, b.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row >= gameTop && pos.row < gameBottom) {
      screen.put(pos.col, pos.row, '\u2502', C.BRIGHT_CYAN, C.BLACK); // │
      if (pos.row - 1 >= gameTop) {
        screen.put(pos.col, pos.row - 1, '\u2502', C.CYAN, C.BLACK);
      }
    }
  }
}

function drawParticles(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const w = screen.width;
  const h = screen.height;
  const particleChars = ['*', '+', '\u00B7', '.'];
  for (const p of state.particles) {
    const pos = gameToScreen(p.x, p.y, p.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row >= gameTop && pos.row < gameBottom && pos.col >= 0 && pos.col < w) {
      const fade = p.life / p.maxLife;
      const ch = particleChars[floor((1 - fade) * (particleChars.length - 1))];
      const color = fade > 0.5 ? p.color : C.GRAY;
      screen.put(pos.col, pos.row, ch, color, C.BLACK);
    }
  }
}

function drawShip(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const w = screen.width;
  const h = screen.height;
  const pos = gameToScreen(state.shipX, state.shipY, 0, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);

  // Ship sprite (3 rows x 5 cols)
  //   ▲
  //  <█>
  //  ╨ ╨
  const cx = pos.col;
  const cy = pos.row;

  if (cy - 1 >= gameTop && cy + 1 < gameBottom) {
    screen.put(cx, cy - 1, '\u25B2', C.BRIGHT_CYAN, C.BLACK);     // ▲ nose
    screen.put(cx - 1, cy, '<', C.BRIGHT_BLUE, C.BLACK);            // < left wing
    screen.put(cx, cy, '\u2588', C.BRIGHT_CYAN, C.BLACK);           // █ body
    screen.put(cx + 1, cy, '>', C.BRIGHT_BLUE, C.BLACK);            // > right wing
    screen.put(cx - 1, cy + 1, '\u2568', C.CYAN, C.BLACK);         // ╨ left engine
    screen.put(cx + 1, cy + 1, '\u2568', C.CYAN, C.BLACK);         // ╨ right engine

    // Engine glow
    const engineGlow = sin(state.time * 20) > 0;
    const glowColor = state.boosting ? C.BRIGHT_MAGENTA : C.BRIGHT_BLUE;
    if (engineGlow && cy + 2 < gameBottom) {
      screen.put(cx - 1, cy + 2, '\u2502', glowColor, C.BLACK);    // │
      screen.put(cx + 1, cy + 2, '\u2502', glowColor, C.BLACK);    // │
    }
  }
}

function drawHUD(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;

  // Top border
  screen.put(0, 0, '\u2554', C.CYAN, C.BLACK); // ╔
  screen.hLine(1, 0, w - 2, '\u2550', C.CYAN, C.BLACK); // ═
  screen.put(w - 1, 0, '\u2557', C.CYAN, C.BLACK); // ╗

  // Title in top border
  const title = ' SPACE RIDER ';
  const titleX = floor((w - title.length) / 2);
  screen.putString(titleX, 0, title, C.BRIGHT_CYAN, C.BLACK);

  // HUD row
  screen.put(0, 1, '\u2551', C.CYAN, C.BLACK); // ║
  screen.put(w - 1, 1, '\u2551', C.CYAN, C.BLACK);

  const scoreStr = state.debugMode === 'obstacleCollision' || state.debugMode === 'mineCollision'
    ? 'SCORE: ---'
    : `SCORE: ${state.score}`;
  const distStr = `DIST: ${(state.distance / 10).toFixed(1)} km`;
  const shieldStr = `SHIELD: ${Math.round(state.shield)}%`;

  screen.putString(2, 1, scoreStr, C.BRIGHT_CYAN, C.BLACK);
  screen.putStringCenter(1, distStr, C.BRIGHT_MAGENTA, C.BLACK);
  screen.putString(w - shieldStr.length - 2, 1, shieldStr,
    state.shield < 30 ? C.BRIGHT_RED : C.BRIGHT_GREEN, C.BLACK);

  // Shield bar
  screen.put(0, 2, '\u2551', C.CYAN, C.BLACK);
  screen.put(w - 1, 2, '\u2551', C.CYAN, C.BLACK);
  const barWidth = w - 4;
  const barStart = 2;
  const filled = floor(barWidth * state.shield / 100);
  const barColor = state.shield < 30 ? C.BRIGHT_RED : C.BRIGHT_GREEN;
  for (let i = 0; i < barWidth; i++) {
    if (i < filled) {
      screen.put(barStart + i, 2, '\u2588', barColor, C.BLACK); // █
    } else {
      screen.put(barStart + i, 2, '\u2591', C.GRAY, C.BLACK); // ░
    }
  }

  // Debug mode indicator
  if (state.debugMode && state.mode === 'playing') {
    const label = `[ DEBUG: ${DEBUG_MODE_NAMES[state.debugMode]} ]`;
    screen.putStringCenter(HUD_ROWS, label, C.BRIGHT_MAGENTA, C.BLACK);

    // Tracker display for collision/chaos modes
    if (state.debugMode === 'obstacleCollision' || state.debugMode === 'mineCollision') {
      const tracker = `Collisions: ${state.trackerCount}`;
      screen.putString(w - tracker.length - 2, HUD_ROWS, tracker, C.BRIGHT_GREEN, C.BLACK);
    } else if (state.debugMode === 'chaos') {
      const tracker = `Destruction: ${state.trackerCount}`;
      screen.putString(w - tracker.length - 2, HUD_ROWS, tracker, C.BRIGHT_GREEN, C.BLACK);
    }
  }

  // NEW BEST banner. It only fires on normal runs, so it never shares this row
  // with the debug label above.
  if (state.newBestFlash > 0) {
    const blink = sin(state.uiTime * 10) > 0;
    screen.putStringCenter(HUD_ROWS, '[ NEW BEST ]', blink ? C.BRIGHT_YELLOW : C.BRIGHT_WHITE, C.BLACK);
  }
}

function drawFooter(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  const footerY = h - FOOTER_ROWS;

  // Bottom border
  screen.put(0, footerY, '\u2560', C.CYAN, C.BLACK); // ╠
  screen.hLine(1, footerY, w - 2, '\u2550', C.CYAN, C.BLACK); // ═
  screen.put(w - 1, footerY, '\u2563', C.CYAN, C.BLACK); // ╣

  // Controls hint
  screen.put(0, footerY + 1, '\u255A', C.CYAN, C.BLACK); // ╚
  screen.hLine(1, footerY + 1, w - 2, '\u2550', C.CYAN, C.BLACK);
  screen.put(w - 1, footerY + 1, '\u255D', C.CYAN, C.BLACK); // ╝

  // Fall back to the compact hint list on a narrow terminal so it never runs
  // into the border corners.
  const hintsFull = 'Arrows:Move  SPACE:Fire  F:Boost  P:Pause  M:Mute  ESC:Quit';
  const hintsShort = 'Move  Fire  Boost  P:Pause  M:Mute  ESC';
  const hints = hintsFull.length <= w - 4 ? hintsFull : hintsShort;
  const hintX = floor((w - hints.length) / 2);
  screen.putString(hintX, footerY, hints, C.GRAY, C.BLACK);

  // Status strip set into the bottom border: speed multiplier and mute state.
  const spd = ` SPD: ${(state.speed / BASE_SPEED_START).toFixed(1)}x `;
  screen.putString(2, footerY + 1, spd,
    state.boosting ? C.BRIGHT_MAGENTA : C.BRIGHT_CYAN, C.BLACK);

  if (state.muted) {
    const mute = ' MUTED ';
    screen.putString(w - mute.length - 2, footerY + 1, mute, C.BRIGHT_YELLOW, C.BLACK);
  }
}

function drawPauseOverlay(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  const label = '[ PAUSED ]';
  const hint = 'P to resume';
  const boxW = max(label.length, hint.length) + 6;
  const boxX = floor((w - boxW) / 2);
  const boxY = floor(h / 2) - 2;

  screen.fillRect(boxX, boxY, boxW, 5, ' ', C.WHITE, C.BLACK);
  screen.put(boxX, boxY, '\u250C', C.BRIGHT_CYAN, C.BLACK);                  // ┌
  screen.hLine(boxX + 1, boxY, boxW - 2, '\u2500', C.BRIGHT_CYAN, C.BLACK);  // ─
  screen.put(boxX + boxW - 1, boxY, '\u2510', C.BRIGHT_CYAN, C.BLACK);       // ┐
  screen.vLine(boxX, boxY + 1, 3, '\u2502', C.BRIGHT_CYAN, C.BLACK);         // │
  screen.vLine(boxX + boxW - 1, boxY + 1, 3, '\u2502', C.BRIGHT_CYAN, C.BLACK);
  screen.put(boxX, boxY + 4, '\u2514', C.BRIGHT_CYAN, C.BLACK);              // └
  screen.hLine(boxX + 1, boxY + 4, boxW - 2, '\u2500', C.BRIGHT_CYAN, C.BLACK);
  screen.put(boxX + boxW - 1, boxY + 4, '\u2518', C.BRIGHT_CYAN, C.BLACK);   // ┘

  const pulse = sin(state.uiTime * 3) * 0.5 + 0.5;
  screen.putStringCenter(boxY + 1, label, pulse > 0.3 ? C.BRIGHT_YELLOW : C.YELLOW, C.BLACK);
  screen.putStringCenter(boxY + 3, hint, C.GRAY, C.BLACK);
}

function drawEffects(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;

  // Damage flash: tint border red
  if (state.damageFlash > 0.1) {
    const color = C.BRIGHT_RED;
    screen.hLine(1, 0, w - 2, '\u2550', color, C.BLACK);
    screen.put(0, 0, '\u2554', color, C.BLACK);
    screen.put(w - 1, 0, '\u2557', color, C.BLACK);
  }

  // Collect flash: tint border green
  if (state.collectFlash > 0.1) {
    const color = C.BRIGHT_GREEN;
    screen.hLine(1, 0, w - 2, '\u2550', color, C.BLACK);
    screen.put(0, 0, '\u2554', color, C.BLACK);
    screen.put(w - 1, 0, '\u2557', color, C.BLACK);
  }

  // Speed lines when boosting
  if (state.boosting) {
    for (let row = HUD_ROWS + 1; row < h - FOOTER_ROWS; row += 3) {
      const offset = floor(state.time * 30 + row) % 5;
      if (offset === 0) {
        screen.put(1, row, '\u2502', C.BRIGHT_MAGENTA, C.BLACK); // │
        screen.put(w - 2, row, '\u2502', C.BRIGHT_MAGENTA, C.BLACK);
      }
    }
  }
}
