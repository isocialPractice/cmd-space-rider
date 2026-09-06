#!/usr/bin/env node
// src/index.ts — CMD Space Rider: Entry point, terminal setup, main loop

import { Game } from './game';
import { ScreenBuffer } from './screen';
import { renderGame } from './render';
import { renderTitleScreen, renderDebugMenu, renderGameOver } from './menu';
import { InputState } from './input';

// ----- CLI argument parsing -----
const args = process.argv.slice(2);
const wantsDebug = args.includes('--debug');
const modeIdx = args.indexOf('--mode');
const explicitMode = modeIdx >= 0 ? args[modeIdx + 1] : null;

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write([
    '',
    '  CMD Space Rider — DOS terminal tunnel game',
    '',
    '  Usage:',
    '    space-rider              Start in normal mode',
    '    space-rider --debug      Open the debug scenario menu',
    '    space-rider --mode <m>   Start a specific debug mode directly',
    '',
    '  Debug modes: mines, orbs, obstacleCollision, mineCollision, chaos',
    '',
    '  Controls:',
    '    Arrows or W/A/S/D  Steer ship',
    '    SPACE              Fire pulse cannon',
    '    F                  Boost',
    '    Q / E              Barrel roll',
    '    P                  Pause / resume',
    '    M                  Mute toggle',
    '    ENTER              Launch / relaunch',
    '    ESC / Ctrl+C       Quit',
    '',
  ].join('\n'));
  process.exit(0);
}

// ----- Terminal setup -----
const stdout = process.stdout;
const stdin = process.stdin;

if (!stdout.isTTY) {
  process.stderr.write('Error: CMD Space Rider requires an interactive terminal (TTY).\n');
  process.exit(1);
}

let termWidth = stdout.columns || 80;
let termHeight = stdout.rows || 24;

const MIN_WIDTH = 60;
const MIN_HEIGHT = 20;

// Enter alternate screen buffer, hide cursor
stdout.write('\x1b[?1049h\x1b[?25l\x1b[2J');

function cleanup(): void {
  stdout.write('\x1b[?25h\x1b[?1049l\x1b[0m');
  if (stdin.setRawMode) stdin.setRawMode(false);
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});

stdout.on('resize', () => {
  termWidth = stdout.columns || 80;
  termHeight = stdout.rows || 24;
  screen.resize(termWidth, termHeight);
  game.initStars(termWidth, termHeight);
  game.state.screenWidth = termWidth;
  game.state.screenHeight = termHeight;
});

// ----- Input handling -----
// The key tables and their decay live in ./input, which the test suite can
// import. This file only wires stdin to them.
const input = new InputState();
const keys = input.keys;
const justPressed = input.justPressed;

if (stdin.setRawMode) stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', (data: string) => {
  if (data === '\x03') cleanup(); // Ctrl+C
  input.feed(data);
});

// ----- Game and rendering initialization -----
const game = new Game();
const screen = new ScreenBuffer(termWidth, termHeight);
game.initStars(termWidth, termHeight);
game.state.screenWidth = termWidth;
game.state.screenHeight = termHeight;

// Handle CLI args
if (explicitMode) {
  const validModes = ['mines', 'orbs', 'obstacleCollision', 'mineCollision', 'chaos'];
  if (validModes.includes(explicitMode)) {
    game.startGame(explicitMode as any);
  } else {
    stdout.write('\x1b[?25h\x1b[?1049l\x1b[0m');
    process.stderr.write(`Unknown mode: ${explicitMode}\nValid modes: ${validModes.join(', ')}\n`);
    process.exit(1);
  }
} else if (wantsDebug) {
  game.showDebugMenu();
}

// ----- Main game loop -----
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;
let lastTime = Date.now();

function frame(): void {
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap dt to avoid spiral of death
  lastTime = now;

  // Size check
  if (termWidth < MIN_WIDTH || termHeight < MIN_HEIGHT) {
    screen.resize(termWidth, termHeight);
    screen.clear(0);
    screen.putStringCenter(Math.floor(termHeight / 2) - 1, 'Terminal too small!', 9, 0);
    screen.putStringCenter(Math.floor(termHeight / 2), `Need ${MIN_WIDTH}x${MIN_HEIGHT}, have ${termWidth}x${termHeight}`, 7, 0);
    screen.putStringCenter(Math.floor(termHeight / 2) + 1, 'Please resize your terminal.', 7, 0);
    screen.flush();
    input.clearJustPressed();
    return;
  }

  // Release keys that have gone quiet since the last frame.
  input.expire();

  // Handle menu input
  game.handleMenuInput(justPressed);

  // ESC key goes back to menu or quits
  if (justPressed['ESCAPE']) {
    if (game.state.mode === 'playing' || game.state.mode === 'dead' || game.state.mode === 'debugMenu') {
      game.state.mode = 'menu';
    } else {
      cleanup();
    }
  }

  // Update game
  game.update(dt, keys, justPressed);

  // Render
  switch (game.state.mode) {
    case 'menu':
      renderTitleScreen(screen, game.state);
      break;
    case 'debugMenu':
      renderDebugMenu(screen, game.state);
      break;
    case 'playing':
      renderGame(screen, game.state);
      break;
    case 'dead':
      renderGameOver(screen, game.state);
      break;
  }

  screen.flush();
  input.clearJustPressed();
}

// Start the loop
const intervalId = setInterval(frame, FRAME_MS);

// Graceful shutdown
process.on('exit', () => {
  clearInterval(intervalId);
});
