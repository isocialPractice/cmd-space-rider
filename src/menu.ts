// src/menu.ts — Title screen, debug menu, and game over screen rendering

import { ScreenBuffer } from './screen';
import { GameState, C, DEBUG_MODES, DEBUG_MODE_NAMES, DEBUG_MODE_DESCS } from './types';

const { sin, floor } = Math;

const TITLE_ART = [
  ' ___  ___   _   ___ ___   ___ ___ ___  ___ ___ ',
  '/ __|/ _ \\ / \\ / __| __| | _ \\_ _|   \\| __| _ \\',
  '\\__ \\ ___// _ \\ (_| _|  |   /| || |) | _||   /',
  '|___/|_| /_/ \\_\\___|___| |_|_\\___|___/|___|_|_\\',
];

export function renderTitleScreen(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  screen.clear(C.BLACK);

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

  // Start prompt (pulsing)
  const promptY = instY + instructions.length + 3;
  const prompt = '[ PRESS ENTER TO LAUNCH ]';
  const promptPulse = sin(state.time * 3) * 0.5 + 0.5;
  const promptColor = promptPulse > 0.3 ? C.BRIGHT_GREEN : C.GREEN;
  screen.putStringCenter(promptY, prompt, promptColor, C.BLACK);

  // Starfield background
  drawMenuStars(screen, state, w, h);
}

export function renderDebugMenu(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  screen.clear(C.BLACK);
  drawBorder(screen, w, h);

  // Title
  const titleY = floor(h * 0.12);
  for (let i = 0; i < TITLE_ART.length; i++) {
    if (TITLE_ART[i].length < w - 4) {
      screen.putStringCenter(titleY + i, TITLE_ART[i], C.BRIGHT_CYAN, C.BLACK);
    }
  }

  // Subtitle
  const subY = titleY + TITLE_ART.length + 1;
  screen.putStringCenter(subY, 'DEBUG PROTOCOL v0.1', C.BRIGHT_MAGENTA, C.BLACK);

  // Menu items
  const menuY = subY + 3;
  for (let i = 0; i < DEBUG_MODES.length; i++) {
    const mode = DEBUG_MODES[i];
    const selected = i === state.debugMenuSelected;
    const prefix = `[${i + 1}] `;
    const name = DEBUG_MODE_NAMES[mode];
    const desc = `    ${DEBUG_MODE_DESCS[mode]}`;

    const y = menuY + i * 3;
    const lineWidth = prefix.length + name.length;
    const x = floor((w - 40) / 2);

    if (selected) {
      // Selection indicator
      screen.putString(x - 3, y, '\u25B6', C.BRIGHT_CYAN, C.BLACK); // ▶
      screen.putString(x, y, prefix, C.BRIGHT_MAGENTA, C.BLACK);
      screen.putString(x + prefix.length, y, name, C.BRIGHT_CYAN, C.BLACK);
      screen.putString(x, y + 1, desc, C.CYAN, C.BLACK);
      // Border highlight
      const bw = 42;
      const bx = x - 2;
      screen.put(bx, y - 1, '\u250C', C.CYAN, C.BLACK);
      screen.hLine(bx + 1, y - 1, bw, '\u2500', C.CYAN, C.BLACK);
      screen.put(bx + bw + 1, y - 1, '\u2510', C.CYAN, C.BLACK);
    } else {
      screen.putString(x, y, prefix, C.MAGENTA, C.BLACK);
      screen.putString(x + prefix.length, y, name, C.GRAY, C.BLACK);
      screen.putString(x, y + 1, desc, C.GRAY, C.BLACK);
    }
  }

  // Navigation hint
  const navY = menuY + DEBUG_MODES.length * 3 + 1;
  const navPulse = sin(state.time * 3) * 0.5 + 0.5;
  screen.putStringCenter(navY, '[ \u2191\u2193 SELECT \u2022 ENTER LAUNCH ]',
    navPulse > 0.3 ? C.BRIGHT_GREEN : C.GREEN, C.BLACK);

  drawMenuStars(screen, state, w, h);
}

export function renderGameOver(screen: ScreenBuffer, state: GameState): void {
  const w = screen.width;
  const h = screen.height;
  screen.clear(C.BLACK);
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

  // Restart prompt
  const promptY = statsY + 7;
  const pulse = sin(state.time * 3) * 0.5 + 0.5;
  screen.putStringCenter(promptY, '[ PRESS ENTER TO RELAUNCH ]',
    pulse > 0.3 ? C.BRIGHT_GREEN : C.GREEN, C.BLACK);

  drawMenuStars(screen, state, w, h);
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
      // Only draw on empty cells
      const i = y * w + x;
      screen.put(x, y, star.char, star.color, C.BLACK);
    }
  }
}
