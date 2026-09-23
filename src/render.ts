// src/render.ts — Terminal renderer: tunnel, ship, entities, HUD, effects

import { ScreenBuffer } from './screen';
import {
  GameState, C, DEBUG_MODE_NAMES, BASE_SPEED_START, SHAKE_TIME, ROLL_TIME,
  tunnelSpan, tracerLit, POWERUP_GLYPHS,
} from './types';

// The tunnel's geometry moved to types.ts, where the hit test can read the same
// corridor this draws in. Re-exported from its old home so the drawing tests,
// which ask the renderer for the span they check a tracer against, go on
// reading it off the module that draws with it.
export { tunnelSpan };

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

/**
 * What each wall colour becomes while a warp transition is running.
 *
 * The tunnel is blue at the far end and cyan at the near one, and a warp
 * carries the whole ramp across to magenta and out to white at the mouth. It
 * is a lookup rather than an arithmetic shift because the palette is ANSI 256
 * indices and there is no arithmetic between two of them that means anything:
 * the five colours drawTunnel can pick are listed, and a colour not in the
 * list is left as it was.
 */
const WARP_WALLS: Record<number, number> = {
  [C.DARK_BLUE]: C.MAGENTA,
  [C.BLUE]: C.NEON_MAGENTA,
  [C.BRIGHT_BLUE]: C.BRIGHT_MAGENTA,
  [C.CYAN]: C.BRIGHT_MAGENTA,
  [C.BRIGHT_CYAN]: C.BRIGHT_WHITE,
};

/**
 * A wall colour as the warp transition leaves it, which is the colour itself
 * whenever no transition is running.
 */
export function warpWallColor(color: number, state: GameState): number {
  if (state.warpFlash <= 0) return color;
  const shifted = WARP_WALLS[color];
  return shifted === undefined ? color : shifted;
}

/**
 * The ship's wings a quarter of a roll apart. The sprite is three cells wide,
 * so the roll is told by the wings alone: the nose and body stay where they
 * are, which is what a roll about the long axis actually does.
 */
const ROLL_WINGS = [['<', '>'], ['\\', '/'], ['-', '-'], ['/', '\\']];

/**
 * The wing pair for the roll the ship is in, level when it is in none. E reads
 * the table forwards and Q reads it backwards, which mirrors the spin.
 */
export function rollWings(state: GameState): string[] {
  if (state.shipRoll <= 0) return ROLL_WINGS[0];
  const turns = ROLL_WINGS.length;
  const elapsed = (ROLL_TIME - state.shipRoll) / ROLL_TIME;
  const step = min(turns - 1, max(0, floor(elapsed * turns)));
  return state.rollDir < 0 ? ROLL_WINGS[(turns - step) % turns] : ROLL_WINGS[step];
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
  const ringSpacing = 4;
  const ringOffset = floor(state.distance * 0.3) % ringSpacing;

  for (let row = gameTop; row < gameBottom; row++) {
    const t = (row - gameTop) / gameH; // 0=far(top), 1=near(bottom)
    const { left: leftWall, right: rightWall } = tunnelSpan(row, gameTop, gameBottom, w);

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
    // The ramp is picked first and shifted after, so the depth banding and the
    // pulse both survive the warp rather than being flattened by it.
    wallColor = warpWallColor(wallColor, state);

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
      const ringColor = warpWallColor(t > 0.5 ? C.BRIGHT_CYAN : C.CYAN, state);
      screen.put(leftWall, row, '\u2563', ringColor, C.BLACK); // ╣
      screen.put(rightWall, row, '\u2560', ringColor, C.BLACK); // ╠

      // Subtle floor dots between walls. They are drawn in a wall colour
      // and shift with the walls, or a warp leaves a row of blue dots
      // strung between two magenta walls. Shifted once for the row rather
      // than once per dot, since every dot on it takes the same colour.
      if (t > 0.3) {
        const dotColor = warpWallColor(C.DARK_BLUE, state);
        for (let x = leftWall + 2; x < rightWall; x += 4) {
          screen.put(x, row, '\u00B7', dotColor, C.BLACK); // ·
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

  // Draw dropped powerups. Each is one glyph in its own colour rather than a
  // shaded block, because what it does is the only thing worth reading off it
  // at a glance and there are three of them to tell apart: + restores shield,
  // ! is rapid fire, ~ is slow motion. The pulse is offset by depth, so a pair
  // of drops in the air together does not blink in unison.
  for (const p of state.powerups) {
    if (p.z < -state.maxViewZ || p.z > 5) continue;
    const pos = gameToScreen(p.x, p.y, p.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row < gameTop || pos.row >= gameBottom) continue;
    const size = max(1, floor(pos.scale * 2));
    const spec = POWERUP_GLYPHS[p.kind];
    const pulse = sin(state.time * 6 + p.z) * 0.3 + 0.7;
    const color = pulse > 0.6 ? spec.bright : spec.dim;
    drawBlock(screen, pos.col, pos.row, size, spec.char, color, gameTop, gameBottom);
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

/**
 * The tracer, drawn only while it is still inside the corridor.
 *
 * A shot holds the screen column it was fired down - updateBullets says why
 * the aim depends on that - while the drawn tunnel converges on the vanishing
 * point, so a shot fired from near a wall crosses that wall partway up, and
 * the rest of the flight would otherwise be drawn out in the black margin
 * with the tunnel some distance to one side.
 *
 * The corridor is what the walls enclose, not the walls themselves: drawTunnel
 * lays its glyph on tunnelSpan's own two columns and thickens outward from
 * there, so the corridor runs from left + 1 to right - 1. Admitting the wall
 * columns punched a hole in the wall instead of stopping the shot at it, since
 * drawBullets runs after drawTunnel and the wall is one cell thick over the top
 * two thirds of the screen: a tracer landing on one replaced the block glyph
 * with a bar, and the hole travelled up the wall with the shot.
 *
 * Crossing the wall is also where the shot stops being able to hit anything.
 * Targets spawn within four and a half units of the axis and the walls are
 * drawn at eight, so every target sits inside this span at every depth; a
 * shot whose column has left the span is in a column no target can occupy at
 * that depth, and stays there for the rest of its life. Stopping the tracer
 * short of the wall says so. Clamping it back into the corridor instead would
 * keep drawing a shot that can no longer hit a thing in there, and would put
 * back the column drift the aiming fix removed.
 *
 * A left-hand shot goes dark a few frames before its mirror on the right, and
 * that is quantisation rather than a second fault. tunnelSpan is symmetric
 * about floor(w / 2) while gameToScreen floors a continuous column, so a shot
 * at -x lands ceil cells out and one at +x floor cells out - the left side
 * reaches the wall a column sooner. Rounding the column instead makes the two
 * agree exactly, and costs real hits: measured over the suite's own long-range
 * sweep it took the centre bullet from 44/58 to 37/60, under the 65% the band
 * is pinned at, because SHOT_SLACK_COLS is tuned against the floor. Drawing
 * rounded while registering floored is worse again - the glyph the player aims
 * by would sit a column off what the hit test reads, on half of all positions.
 *
 * The hit test reads the same clip, and that is the whole of what it shares
 * with this: a frame that draws no tracer registers nothing on that frame. The
 * flight itself is not cut short. The span the walls are drawn on runs a little
 * narrower than the tunnel radius projects to, so culling the bullet outright
 * when it crosses would cost real hits at the far end - the shot goes dark, and
 * lights again if the corridor widens back around its column. Measured across
 * every band the suite pins, at all three grids and in both builds, matching
 * the two cost nothing: every rate came back on the figure it had.
 *
 * Each half is tested on its own row, because the span narrows going up and the
 * dim upper half leaves the corridor first.
 */
function drawBullets(screen: ScreenBuffer, state: GameState, gameTop: number, gameBottom: number): void {
  const w = screen.width;
  const h = screen.height;
  const inCorridor = (col: number, row: number): boolean =>
    tracerLit(col, row, gameTop, gameBottom, w);
  for (const b of state.bullets) {
    const pos = gameToScreen(b.x, b.y, b.z, w, h, gameTop, gameBottom, state.tunnelRadius, state.maxViewZ);
    if (pos.row < gameTop || pos.row >= gameBottom) continue;
    if (inCorridor(pos.col, pos.row)) {
      screen.put(pos.col, pos.row, '\u2502', C.BRIGHT_CYAN, C.BLACK); // │
    }
    if (pos.row - 1 >= gameTop && inCorridor(pos.col, pos.row - 1)) {
      screen.put(pos.col, pos.row - 1, '\u2502', C.CYAN, C.BLACK);
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

  // Mid-roll the wings turn and the hull goes white, so the invincibility the
  // roll grants is visible rather than something the player has to remember.
  const rolling = state.shipRoll > 0;
  const [leftWing, rightWing] = rollWings(state);
  const hullColor = rolling ? C.BRIGHT_WHITE : C.BRIGHT_CYAN;
  const wingColor = rolling ? C.BRIGHT_MAGENTA : C.BRIGHT_BLUE;

  if (cy - 1 >= gameTop && cy + 1 < gameBottom) {
    screen.put(cx, cy - 1, '\u25B2', hullColor, C.BLACK);  // ▲ nose
    screen.put(cx - 1, cy, leftWing, wingColor, C.BLACK);  // left wing, turns
    screen.put(cx, cy, '\u2588', hullColor, C.BLACK);      // █ body
    screen.put(cx + 1, cy, rightWing, wingColor, C.BLACK); // right wing, turns
    screen.put(cx - 1, cy + 1, '\u2568', C.CYAN, C.BLACK); // ╨ left engine
    screen.put(cx + 1, cy + 1, '\u2568', C.CYAN, C.BLACK); // ╨ right engine

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

  // Combo counter, left-aligned on the row the debug label and the NEW BEST
  // banner centre themselves on, so the three never collide. A lone kill is
  // worth its face value and puts nothing on screen; the chain starts at x2.
  if (state.combo >= 2) {
    const combo = `COMBO x${state.combo}`;
    const comboColor = state.combo >= 6 ? C.BRIGHT_MAGENTA
      : state.combo >= 4 ? C.BRIGHT_YELLOW
      : C.BRIGHT_CYAN;
    screen.putString(2, HUD_ROWS, combo, comboColor, C.BLACK);
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

  // Warp banner. It shares the centre of this row with the debug label and the
  // NEW BEST banner, and loses to both: a debug run has its label up for the
  // whole run, so the banner is held back rather than blinking over it for two
  // seconds, and NEW BEST is drawn after this and covers it on the rare frame
  // the two coincide. The level counts from 1, so the first one a run ever
  // shows reads WARP LEVEL 2.
  if (state.warpFlash > 0 && state.debugMode === null) {
    const blink = sin(state.uiTime * 8) > 0;
    screen.putStringCenter(HUD_ROWS, `>> WARP LEVEL ${state.warpLevel} <<`,
      blink ? C.BRIGHT_WHITE : C.BRIGHT_MAGENTA, C.BLACK);
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

  // Active powerups count themselves down beside the speed, which is the other
  // number on this strip that moves while a run is under way. Each badge is
  // drawn only where there is room for it before the mute slot at the right,
  // so the narrowest supported grid drops a badge rather than overwriting the
  // border - the same rule the hint list above follows.
  const muteRoom = state.muted ? ' MUTED '.length : 0;
  let badgeX = 2 + spd.length;
  for (const badge of powerupBadges(state)) {
    if (badgeX + badge.text.length > w - 2 - muteRoom) break;
    screen.putString(badgeX, footerY + 1, badge.text, badge.color, C.BLACK);
    badgeX += badge.text.length;
  }

  if (state.muted) {
    const mute = ' MUTED ';
    screen.putString(w - mute.length - 2, footerY + 1, mute, C.BRIGHT_YELLOW, C.BLACK);
  }
}

/**
 * The countdown badges for whatever powerups are running, left to right in a
 * fixed order so two of them on screen together do not swap places between
 * frames.
 *
 * Exported because it is the whole of what the status strip says about a
 * pickup, and a test reading the finished row cannot tell a badge dropped for
 * want of room from one the engine never raised.
 */
export function powerupBadges(state: GameState): { text: string; color: number }[] {
  const out: { text: string; color: number }[] = [];
  if (state.rapidFire > 0) {
    out.push({
      text: ` ${POWERUP_GLYPHS.rapid.label} ${state.rapidFire.toFixed(1)}s `,
      color: POWERUP_GLYPHS.rapid.bright,
    });
  }
  if (state.slowMotion > 0) {
    out.push({
      text: ` ${POWERUP_GLYPHS.slow.label} ${state.slowMotion.toFixed(1)}s `,
      color: POWERUP_GLYPHS.slow.bright,
    });
  }
  return out;
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

  // Speed lines, down both margins. Boosting draws them every third row in
  // magenta; a warp transition draws them every second row, twice as fast and
  // in white, with a second line one column further in. That is what
  // intensifying comes to on a character grid: there is no brightness to turn
  // up, only more of the thing and a hotter colour.
  //
  // A boost through a warp draws the warp's pattern rather than both at once.
  // Laying the two over each other lights so many rows that neither reads as
  // motion any more.
  if (state.boosting || state.warpFlash > 0) {
    const warping = state.warpFlash > 0;
    const step = warping ? 2 : 3;
    const rate = warping ? 60 : 30;
    const color = warping ? C.BRIGHT_WHITE : C.BRIGHT_MAGENTA;
    for (let row = HUD_ROWS + 1; row < h - FOOTER_ROWS; row += step) {
      const offset = floor(state.time * rate + row) % 5;
      if (offset !== 0) continue;
      screen.put(1, row, '\u2502', color, C.BLACK); // |
      screen.put(w - 2, row, '\u2502', color, C.BLACK);
      if (warping) {
        screen.put(2, row, '\u2502', C.BRIGHT_MAGENTA, C.BLACK);
        screen.put(w - 3, row, '\u2502', C.BRIGHT_MAGENTA, C.BLACK);
      }
    }
  }
}
