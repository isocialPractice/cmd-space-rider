// src/menu.ts — Title screen, debug menu, and game over screen rendering

import { ScreenBuffer } from './screen';
import { GameState, C, DEBUG_MODES, DEBUG_MODE_NAMES, DEBUG_MODE_DESCS } from './types';

const { sin, floor, min, max } = Math;

const TITLE_ART = [
  ' ___  ___   _   ___ ___   ___ ___ ___  ___ ___ ',
  '/ __|/ _ \\ / \\ / __| __| | _ \\_ _|   \\| __| _ \\',
  '\\__ \\ ___// _ \\ (_| _|  |   /| || |) | _||   /',
  '|___/|_| /_/ \\_\\___|___| |_|_\\___|___/|___|_|_\\',
];

/**
 * One way of laying the debug menu out vertically. The fullest form needs 25
 * rows and the documented minimum screen is 20, so the parts that can be given
 * up are listed in the order they are given up: the blank row between entries
 * first, then the per-mode description, then the title art. The five modes and
 * the navigation hint are what the screen is for, and are never dropped.
 */
interface DebugMenuVariant {
  /** Whether there is room for the title art above the subtitle. */
  art: boolean;
  /** Rows from one mode entry to the next. */
  stride: number;
  /** Whether each mode gets its description row. */
  desc: boolean;
  /** The rule drawn one row above the selected entry. Needs a stride of 3. */
  bracket: boolean;
}

const DEBUG_MENU_VARIANTS: DebugMenuVariant[] = [
  { art: true, stride: 3, desc: true, bracket: true },
  { art: true, stride: 2, desc: true, bracket: false },
  { art: true, stride: 1, desc: false, bracket: false },
  { art: false, stride: 2, desc: true, bracket: false },
  { art: false, stride: 1, desc: false, bracket: false },
];

interface DebugMenuLayout extends DebugMenuVariant {
  artY: number;
  subY: number;
  menuY: number;
  navY: number;
}

/** Rows a variant occupies, from its first drawn row to its last list row. */
function debugMenuBlockRows(variant: DebugMenuVariant): number {
  const head = variant.art ? TITLE_ART.length + 1 : 0; // art plus the blank under it
  const gap = variant.bracket ? 2 : 1;                 // blank rows under the subtitle
  const list = (DEBUG_MODES.length - 1) * variant.stride + (variant.desc ? 2 : 1);
  return head + 1 + gap + list;                        // + the subtitle row
}

/**
 * Pick the fullest layout that fits between the borders, then place it. Every
 * row the menu draws is derived from the result, so nothing lands past the
 * bottom border to be silently dropped by ScreenBuffer.put.
 */
function debugMenuLayout(h: number): DebugMenuLayout {
  const top = 1;
  const bottom = h - 2;

  let variant = DEBUG_MENU_VARIANTS[DEBUG_MENU_VARIANTS.length - 1];
  let blockRows = debugMenuBlockRows(variant);
  for (const candidate of DEBUG_MENU_VARIANTS) {
    variant = candidate;
    blockRows = debugMenuBlockRows(candidate);
    if (blockRows <= bottom - top) break;
  }

  // Keep the familiar placement while there is room for it, and slide the block
  // up against the top border once there is not.
  const artY = max(top, min(floor(h * 0.12), bottom - blockRows));
  const subY = artY + (variant.art ? TITLE_ART.length + 1 : 0);
  const menuY = subY + 1 + (variant.bracket ? 2 : 1);
  // The hint keeps its usual row below the list, clamped to the last row inside
  // the border so a short screen shortens the gap rather than losing the line.
  const navY = min(menuY + DEBUG_MODES.length * variant.stride + 1, bottom);

  return { ...variant, artY, subY, menuY, navY };
}

/** True when a row is inside the border and may be drawn on. */
function insideBorder(y: number, h: number): boolean {
  return y >= 1 && y <= h - 2;
}

export function renderTitleScreen(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  screen.clear(C.BLACK);

  // Starfield background, drawn first so the text sits on top of it
  drawMenuStars(screen, state, w, h);

  // Draw border
  drawBorder(screen, w, h);

  // Title art
  const artY = floor(h * 0.15);
  for (let i = 0; i < TITLE_ART.length; i++) {
    const line = TITLE_ART[i];
    if (line.length < w - 4) {
      const pulse = sin(state.time * 2 + i * 0.3) * 0.5 + 0.5;
      const color = pulse > 0.5 ? C.BRIGHT_CYAN : C.CYAN;
      screen.putStringCenter(artY + i, line, color, C.BLACK);
    }
  }

  // Subtitle
  const subY = artY + TITLE_ART.length + 2;
  const subtitle = 'WARP TUNNEL PROTOCOL v2.7';
  const subPulse = sin(state.time * 1.5) * 0.5 + 0.5;
  screen.putStringCenter(subY, subtitle, subPulse > 0.5 ? C.BRIGHT_MAGENTA : C.MAGENTA, C.BLACK);

  // Instructions
  const instY = subY + 3;
  const instructions = [
    ['WASD', ' or ', 'ARROWS', ' \u2014 steer ship'],
    ['F', ' \u2014 boost  |  ', 'SPACE', ' \u2014 fire pulse cannon'],
    ['Q / E', ' \u2014 barrel roll'],
    ['', 'Dodge obstacles \u2022 Collect energy orbs \u2022 Survive!', '', ''],
  ];

  for (let i = 0; i < instructions.length; i++) {
    const parts = instructions[i];
    let line = '';
    for (const p of parts) line += p;
    const x = floor((w - line.length) / 2);
    let cx = x;
    for (let j = 0; j < parts.length; j++) {
      const color = j % 2 === 0 && parts[j].length > 0 ? C.BRIGHT_CYAN : C.GRAY;
      screen.putString(cx, instY + i, parts[j], color, C.BLACK);
      cx += parts[j].length;
    }
  }

  // Start prompt (pulsing), clamped to the last row inside the border: at the
  // documented 60x20 minimum its usual row is the bottom border itself.
  const promptY = min(instY + instructions.length + 3, h - 2);
  const prompt = '[ PRESS ENTER TO LAUNCH ]';
  const promptPulse = sin(state.time * 3) * 0.5 + 0.5;
  const promptColor = promptPulse > 0.3 ? C.BRIGHT_GREEN : C.GREEN;
  screen.putStringCenter(promptY, prompt, promptColor, C.BLACK);
}

export function renderDebugMenu(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  screen.clear(C.BLACK);

  // Starfield background, drawn first so the text sits on top of it
  drawMenuStars(screen, state, w, h);
  drawBorder(screen, w, h);

  const layout = debugMenuLayout(h);

  // Title
  if (layout.art) {
    for (let i = 0; i < TITLE_ART.length; i++) {
      const y = layout.artY + i;
      if (TITLE_ART[i].length < w - 4 && insideBorder(y, h)) {
        screen.putStringCenter(y, TITLE_ART[i], C.BRIGHT_CYAN, C.BLACK);
      }
    }
  }

  // Subtitle
  if (insideBorder(layout.subY, h)) {
    screen.putStringCenter(layout.subY, 'DEBUG PROTOCOL v0.1', C.BRIGHT_MAGENTA, C.BLACK);
  }

  // Menu items
  for (let i = 0; i < DEBUG_MODES.length; i++) {
    const mode = DEBUG_MODES[i];
    const selected = i === state.debugMenuSelected;
    const prefix = `[${i + 1}] `;
    const name = DEBUG_MODE_NAMES[mode];
    const desc = `    ${DEBUG_MODE_DESCS[mode]}`;

    const y = layout.menuY + i * layout.stride;
    const x = floor((w - 40) / 2);
    if (!insideBorder(y, h)) continue;

    if (selected) {
      // Selection indicator
      screen.putString(x - 3, y, '\u25B6', C.BRIGHT_CYAN, C.BLACK); // ▶
    }
    screen.putString(x, y, prefix, selected ? C.BRIGHT_MAGENTA : C.MAGENTA, C.BLACK);
    screen.putString(x + prefix.length, y, name, selected ? C.BRIGHT_CYAN : C.GRAY, C.BLACK);

    if (layout.desc && insideBorder(y + 1, h)) {
      screen.putString(x, y + 1, desc, selected ? C.CYAN : C.GRAY, C.BLACK);
    }

    if (selected && layout.bracket && insideBorder(y - 1, h)) {
      // Border highlight
      const bw = 42;
      const bx = x - 2;
      screen.put(bx, y - 1, '\u250C', C.CYAN, C.BLACK);
      screen.hLine(bx + 1, y - 1, bw, '\u2500', C.CYAN, C.BLACK);
      screen.put(bx + bw + 1, y - 1, '\u2510', C.CYAN, C.BLACK);
    }
  }

  // Navigation hint
  if (insideBorder(layout.navY, h)) {
    const navPulse = sin(state.time * 3) * 0.5 + 0.5;
    screen.putStringCenter(layout.navY, '[ \u2191\u2193 SELECT \u2022 ENTER LAUNCH ]',
      navPulse > 0.3 ? C.BRIGHT_GREEN : C.GREEN, C.BLACK);
  }
}

export function renderGameOver(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  screen.clear(C.BLACK);

  // Starfield background, drawn first so the stats sit on top of it
  drawMenuStars(screen, state, w, h);
  drawBorder(screen, w, h);

  // Title
  const titleY = floor(h * 0.2);
  screen.putStringCenter(titleY, 'W A R P   F A I L E D', C.BRIGHT_RED, C.BLACK);
  screen.putStringCenter(titleY + 2, 'SHIP INTEGRITY COMPROMISED', C.BRIGHT_MAGENTA, C.BLACK);

  // Stats
  const statsY = titleY + 5;

  if (state.debugMode === 'obstacleCollision' || state.debugMode === 'mineCollision') {
    const countStr = `${state.trackerCount}`;
    screen.putStringCenter(statsY, countStr, C.BRIGHT_MAGENTA, C.BLACK);
    screen.putStringCenter(statsY + 2, `Collisions Detected: ${state.trackerCount}`, C.BRIGHT_CYAN, C.BLACK);
    screen.putStringCenter(statsY + 3, `Distance: ${(state.distance / 10).toFixed(1)} km`, C.BRIGHT_CYAN, C.BLACK);
  } else if (state.debugMode === 'chaos') {
    screen.putStringCenter(statsY, `${state.score}`, C.BRIGHT_MAGENTA, C.BLACK);
    screen.putStringCenter(statsY + 2, `Total Destruction: ${state.trackerCount}`, C.BRIGHT_CYAN, C.BLACK);
    screen.putStringCenter(statsY + 3, `Score: ${state.score}`, C.BRIGHT_CYAN, C.BLACK);
    screen.putStringCenter(statsY + 4, `Distance: ${(state.distance / 10).toFixed(1)} km`, C.BRIGHT_CYAN, C.BLACK);
  } else {
    screen.putStringCenter(statsY, `${state.score}`, C.BRIGHT_MAGENTA, C.BLACK);
    screen.putStringCenter(statsY + 2, `Distance: ${(state.distance / 10).toFixed(1)} km`, C.BRIGHT_CYAN, C.BLACK);
    screen.putStringCenter(statsY + 3, `Best Score: ${state.bestScore}`, C.BRIGHT_CYAN, C.BLACK);
  }

  // Restart prompt, clamped to the last row inside the border
  const promptY = min(statsY + 7, h - 2);
  const pulse = sin(state.time * 3) * 0.5 + 0.5;
  screen.putStringCenter(promptY, '[ PRESS ENTER TO RELAUNCH ]',
    pulse > 0.3 ? C.BRIGHT_GREEN : C.GREEN, C.BLACK);
}

function drawBorder(screen: ScreenBuffer, w: number, h: number): void {
  screen.put(0, 0, '\u2554', C.CYAN, C.BLACK);
  screen.hLine(1, 0, w - 2, '\u2550', C.CYAN, C.BLACK);
  screen.put(w - 1, 0, '\u2557', C.CYAN, C.BLACK);

  for (let y = 1; y < h - 1; y++) {
    screen.put(0, y, '\u2551', C.CYAN, C.BLACK);
    screen.put(w - 1, y, '\u2551', C.CYAN, C.BLACK);
  }

  screen.put(0, h - 1, '\u255A', C.CYAN, C.BLACK);
  screen.hLine(1, h - 1, w - 2, '\u2550', C.CYAN, C.BLACK);
  screen.put(w - 1, h - 1, '\u255D', C.CYAN, C.BLACK);
}

function drawMenuStars(screen: ScreenBuffer, state: GameState, w: number, h: number): void {
  for (const star of state.stars) {
    const sy = star.y % h;
    const y = floor(sy < 0 ? sy + h : sy);
    const x = floor(star.x) % w;
    if (y > 0 && y < h - 1 && x > 0 && x < w - 1) {
      screen.put(x, y, star.char, star.color, C.BLACK);
    }
  }
}
