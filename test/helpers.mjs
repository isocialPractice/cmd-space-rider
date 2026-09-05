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
  'renderGame', 'renderTitleScreen', 'renderGameOver', 'drawPauseOverlay',
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
