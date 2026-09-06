// test/helpers.mjs — Shared rigging for the engine tests.
//
// The browser build is a single self-contained index.html, so there is nothing
// to import. Instead the inline script is read off disk and evaluated up to the
// canvas setup, which is the point where it starts touching the DOM. Everything
// above that line is pure logic and rendering, and that is what gets tested.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..');

/** Marker where index.html stops being testable logic and starts touching the DOM. */
const DOM_MARKER = '// ===== Canvas Setup & Sizing =====';

/** Names the harness pulls out of the evaluated browser script. */
const EXPORTS = [
  'Game', 'ScreenBuffer', 'C',
  'renderGame', 'renderTitleScreen', 'renderDebugMenu', 'renderGameOver', 'drawPauseOverlay',
  'shakeOffset', 'loadBestScore', 'saveBestScore',
  'HUD_ROWS', 'FOOTER_ROWS', 'SHAKE_TIME', 'NEW_BEST_FLASH_TIME',
  'BASE_SPEED_START', 'SHAKE_PIXELS', 'BEST_SCORE_KEY',
];

/** In-memory stand-in for window.localStorage. */
export function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    read: (k) => (store.has(k) ? store.get(k) : null),
    size: () => store.size,
  };
}

/** A localStorage that throws on every access, as private-mode browsers do. */
export function hostileStorage() {
  const boom = () => { throw new Error('storage is not available'); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

/**
 * Evaluate the browser engine against a given localStorage and hand back its
 * classes and functions. Each call is an independent copy of the engine, so a
 * test can never leak state into the next one.
 */
export function loadBrowserEngine(localStorage = fakeStorage()) {
  const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');

  const scriptStart = html.indexOf('<script>');
  if (scriptStart < 0) throw new Error('index.html has no <script> block');
  const bodyStart = scriptStart + '<script>'.length;

  const domStart = html.indexOf(DOM_MARKER, bodyStart);
  if (domStart < 0) throw new Error(`index.html is missing the marker: ${DOM_MARKER}`);

  const body = html.slice(bodyStart, domStart);
  const factory = new Function(
    'localStorage',
    `${body}\nreturn {${EXPORTS.join(',')}};`
  );
  return factory(localStorage);
}

/** Read one row of a screen buffer back as a string. */
export function rowText(screen, y) {
  let out = '';
  for (let x = 0; x < screen.width; x++) out += screen.chars[y * screen.width + x];
  return out;
}

/** Read the whole screen buffer back as newline-joined rows. */
export function screenText(screen) {
  const rows = [];
  for (let y = 0; y < screen.height; y++) rows.push(rowText(screen, y));
  return rows.join('\n');
}

/**
 * Read the whole buffer back as cells of `char|fg|bg`, which is what a freeze
 * test has to compare: the paused defect moved colours as well as glyphs, and
 * screenText() alone would not have seen the tunnel wall pulse.
 */
export function screenCells(screen) {
  const cells = [];
  for (let y = 0; y < screen.height; y++) {
    for (let x = 0; x < screen.width; x++) {
      const i = y * screen.width + x;
      cells.push({ x, y, key: `${screen.chars[i]}|${screen.fg[i]}|${screen.bg[i]}` });
    }
  }
  return cells;
}

/** Coordinates whose char or colour differs between two buffer readings. */
export function changedCells(before, after) {
  const out = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i].key !== after[i].key) out.push(`${before[i].x},${before[i].y}`);
  }
  return out;
}

/**
 * Fill a run with one of everything that animates, at fixed positions, so a
 * paused frame is reproducible. Placing the entities rather than waiting for
 * spawns keeps the test off the RNG and off the spawn timers.
 */
export function stageAnimatedWorld(state) {
  state.obstacles = [
    { x: -3, y: 1, z: 30, rot: 0, rotSpeed: 1, scale: 1 },
    { x: 4, y: -2, z: 70, rot: 0.5, rotSpeed: 1, scale: 1.2 },
  ];
  state.orbs = [
    { x: 2, y: 0, z: 25, collected: false },
    { x: -1, y: 2, z: 55, collected: false },
  ];
  state.mines = [
    { x: 0, y: -1, z: 40, rot: 0, rotSpeed: 1, scale: 1, hp: 3 },
    { x: -4, y: 3, z: 90, rot: 1, rotSpeed: 1, scale: 1, hp: 3 },
  ];
  state.bullets = [];
  state.particles = [];
}

/**
 * Drop a single obstacle exactly where the ship is, so the next frame is a
 * guaranteed collision. Clears the other entity lists so nothing else fires.
 */
export function stageCollision(state) {
  state.obstacles = [{
    x: state.shipX, y: state.shipY, z: 0,
    rot: 0, rotSpeed: 0, scale: 1,
  }];
  state.orbs = [];
  state.mines = [];
  state.particles = [];
}

/** One frame at the engine's 30 fps target. */
export const FRAME = 1 / 30;
