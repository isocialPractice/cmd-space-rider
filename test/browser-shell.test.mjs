// test/browser-shell.test.mjs — The two things the browser build has that a
// terminal cannot: a system colour scheme to follow, and a touchscreen to be
// played on. Neither has a counterpart in the CLI build, so neither appears in
// test/parity.test.mjs.
//
// Both are checked at the seam where the arithmetic stops and the DOM starts.
// The palette a scheme resolves to and the keys a thumbstick reading stands for
// are decided above the `// ===== Canvas Setup & Sizing =====` marker in
// index.html, which is exactly why they were written there: everything below it
// is elements and pointers, and nothing in this suite can reach it.
//
// The favicon is checked as the text of the file, because that is all it is.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage } from './helpers.mjs';

const browser = loadBrowserEngine(fakeStorage());
const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');

const HEX = /^#[0-9a-f]{6}$/i;

/** Perceived lightness of a hex colour, 0 for black and 1 for white. */
function lightness(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// ----- The colour scheme -----

test('dark mode is the base palette itself, not a theme that matches it', () => {
  // The game was drawn against this palette, so dark mode has to be exactly
  // what it always was rather than a re-inking that happens to agree.
  assert.equal(browser.themePalette('dark'), browser.ANSI256);
  assert.equal(browser.themePalette(undefined), browser.ANSI256);
  assert.equal(browser.themePalette('anything else'), browser.ANSI256);
});

test('light mode re-inks a palette of its own and leaves the base alone', () => {
  const before = [...browser.ANSI256];
  const light = browser.themePalette('light');

  assert.notEqual(light, browser.ANSI256, 'a copy, not the array itself');
  assert.deepEqual([...browser.ANSI256], before, 'and the base is untouched');
  assert.equal(light.length, 256, 'every index still resolves');
  for (let i = 0; i < 256; i++) {
    assert.match(light[i], HEX, `index ${i}`);
  }
});

test('light mode changes exactly the indices it lists', () => {
  const light = browser.themePalette('light');
  const changed = [];
  for (let i = 0; i < 256; i++) {
    if (light[i] !== browser.ANSI256[i]) changed.push(String(i));
  }
  assert.deepEqual(changed.sort(), Object.keys(browser.LIGHT_INK).sort());
});

test('every colour the game draws with is re-inked for light mode', () => {
  // The named palette is the whole of what the renderer reaches for, so a
  // colour missing from LIGHT_INK is a neon left glowing on white paper.
  const light = browser.themePalette('light');
  for (const [name, index] of Object.entries(browser.C)) {
    assert.notEqual(light[index], browser.ANSI256[index], `C.${name} is not re-inked`);
  }
});

test('light mode inverts the page: dark ink on pale paper', () => {
  const light = browser.themePalette('light');

  // BLACK is the background the whole tunnel is drawn on, so in light mode it
  // has to be the paper rather than the ink.
  assert.ok(lightness(light[browser.C.BLACK]) > 0.85, 'BLACK becomes the paper');
  assert.ok(lightness(light[browser.C.BRIGHT_WHITE]) < 0.2, 'and BRIGHT_WHITE the ink');

  // The tunnel walls are what the item asked to see darkened, and they are the
  // blues and cyans. Every one of them has to read against the paper.
  for (const name of ['DARK_BLUE', 'BLUE', 'BRIGHT_BLUE', 'CYAN', 'BRIGHT_CYAN']) {
    const hex = light[browser.C[name]];
    assert.ok(lightness(hex) < 0.5, `${name} at ${hex} would glow rather than draw`);
  }
});

test('each scheme names the page colour behind its grid', () => {
  assert.match(browser.THEME_BG.dark, HEX);
  assert.match(browser.THEME_BG.light, HEX);
  assert.ok(lightness(browser.THEME_BG.dark) < 0.1);
  assert.ok(lightness(browser.THEME_BG.light) > 0.85);

  // The renderer leaves a BLACK cell unpainted and lets the page show through,
  // so the two have to be the same colour or the tunnel gains a grid of seams.
  assert.equal(browser.THEME_BG.light, browser.themePalette('light')[browser.C.BLACK]);
  assert.equal(browser.THEME_BG.dark, browser.ANSI256[browser.C.BLACK]);
});

test('the page asks the system rather than offering a switch', () => {
  assert.match(html, /prefers-color-scheme: light/);
  assert.match(html, /<meta name="color-scheme" content="dark light"\/>/);
  // Dark is the default, so a system that says nothing gets the game as drawn.
  assert.match(html, /let scheme=lightQuery\.matches\?'light':'dark';/);
});

// ----- The thumbstick -----

test('a stick at rest steers nowhere', () => {
  assert.deepEqual(browser.stickKeys(0, 0), { LEFT: false, RIGHT: false, UP: false, DOWN: false });
});

test('a thumb inside the dead zone steers nowhere either', () => {
  const radius = browser.STICK_RADIUS;
  const inside = radius * browser.STICK_DEADZONE * 0.9;
  for (const [dx, dy] of [[inside, 0], [0, inside], [-inside, 0], [0, -inside]]) {
    const held = browser.stickKeys(dx, dy);
    assert.deepEqual(Object.values(held), [false, false, false, false], `${dx},${dy}`);
  }
});

test('the four straight pushes each give one key', () => {
  const far = browser.STICK_RADIUS;
  assert.deepEqual(browser.stickKeys(-far, 0), { LEFT: true, RIGHT: false, UP: false, DOWN: false });
  assert.deepEqual(browser.stickKeys(far, 0), { LEFT: false, RIGHT: true, UP: false, DOWN: false });
  // The page measures y downward and the ship's own y runs upward, so a thumb
  // pushed toward the top of the screen is UP.
  assert.deepEqual(browser.stickKeys(0, -far), { LEFT: false, RIGHT: false, UP: true, DOWN: false });
  assert.deepEqual(browser.stickKeys(0, far), { LEFT: false, RIGHT: false, UP: false, DOWN: true });
});

test('the four diagonals each give two', () => {
  const far = browser.STICK_RADIUS;
  assert.deepEqual(browser.stickKeys(-far, -far), { LEFT: true, RIGHT: false, UP: true, DOWN: false });
  assert.deepEqual(browser.stickKeys(far, -far), { LEFT: false, RIGHT: true, UP: true, DOWN: false });
  assert.deepEqual(browser.stickKeys(-far, far), { LEFT: true, RIGHT: false, UP: false, DOWN: true });
  assert.deepEqual(browser.stickKeys(far, far), { LEFT: false, RIGHT: true, UP: false, DOWN: true });
});

test('the circle divides into eight sectors of the same size', () => {
  // Walked a degree at a time round the whole circle, well outside the dead
  // zone. A direction that is harder to hold than its neighbour is a stick
  // that fights the player, and the count is what says whether one is.
  const radius = browser.STICK_RADIUS;
  const counts = new Map();
  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    const held = browser.stickKeys(Math.cos(rad) * radius, Math.sin(rad) * radius);
    const name = Object.keys(held).filter((k) => held[k]).sort().join('+');
    assert.notEqual(name, '', `${deg} degrees steers nowhere`);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  assert.equal(counts.size, 8, 'four straights and four diagonals');
  for (const [name, degrees] of counts) {
    assert.ok(Math.abs(degrees - 45) <= 2, `${name} holds ${degrees} degrees of the circle`);
  }
});

test('opposite keys are never held at once', () => {
  const radius = browser.STICK_RADIUS;
  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    const held = browser.stickKeys(Math.cos(rad) * radius * 2, Math.sin(rad) * radius * 2);
    assert.ok(!(held.LEFT && held.RIGHT), `${deg} degrees holds both sides`);
    assert.ok(!(held.UP && held.DOWN), `${deg} degrees holds both ends`);
  }
});

test('the dead zone is measured against the stick actually drawn', () => {
  // The element is sized in viewport units, so its radius is whatever the
  // phone gives it. A reading that just clears the dead zone at one size has
  // to still clear it when the same push is scaled with the control.
  for (const radius of [24, 40, 56, 90]) {
    const push = radius * browser.STICK_DEADZONE * 1.1;
    const held = browser.stickKeys(0, -push, radius);
    assert.equal(held.UP, true, `radius ${radius}`);
    const rest = radius * browser.STICK_DEADZONE * 0.9;
    assert.equal(browser.stickKeys(0, -rest, radius).UP, false, `radius ${radius}, at rest`);
  }
});

// ----- The fire button -----

test('the fire button is the trigger in a run and the confirm key elsewhere', () => {
  assert.equal(browser.touchFireKey('playing'), 'SPACE');
  for (const mode of ['menu', 'dead', 'debugMenu']) {
    assert.equal(browser.touchFireKey(mode), 'ENTER', `${mode} waits on ENTER`);
  }
});

test('the controls are in the page but hidden until a touch arrives', () => {
  assert.match(html, /<div id="touch" hidden>/);
  assert.match(html, /id="stick"/);
  assert.match(html, /id="fire"/);
  assert.match(html, /id="boost"/);
  // Capability is the wrong question - a laptop with a touchscreen reports
  // touch support and is being driven by its keyboard - so the reveal hangs
  // off an actual touch.
  assert.match(html, /addEventListener\('touchstart',revealTouch/);
  assert.doesNotMatch(html, /ontouchstart in window/);
});

test('a drag on the controls cannot scroll or zoom the page', () => {
  assert.match(html, /#touch\{[^}]*touch-action:none/s);
  assert.match(html, /#stick,#fire,#boost\{[^}]*touch-action:none/s);
});

// ----- Where the controls sit -----
//
// The overlay is laid out in CSS and the grid underneath it is laid out by
// fitGrid, so nothing in either file alone can say whether the two agree. What
// follows resolves the three rules the way a browser would - vw and vh against
// the viewport, aspect-ratio:1 taking the height off the resolved width, and
// max-width capping both - then converts each box to the character rows it
// covers and checks it against the rows the HUD and the footer own.
//
// Browser only, like the rest of this file: a terminal has no overlay, so
// test/parity.test.mjs has nothing to pair this with.

// Comments are stripped first: they sit between rules, so an uncommented
// parser reads one into the following rule's selector list and the rule then
// matches nothing.
const STYLE = html
  .slice(html.indexOf('<style>'), html.indexOf('</style>'))
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The declarations that apply to a bare `#id`, later rules winning as the
 * cascade has them. Selectors are matched whole, so `#fire.on` and
 * `body.light #fire` - which carry only colours - are correctly left out.
 */
function declarationsFor(id) {
  const out = {};
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = rule.exec(STYLE))) {
    if (!m[1].split(',').map((sel) => sel.trim()).includes(`#${id}`)) continue;
    for (const decl of m[2].split(';')) {
      const at = decl.indexOf(':');
      if (at < 0) continue;
      out[decl.slice(0, at).trim()] = decl.slice(at + 1).trim();
    }
  }
  return out;
}

/** Resolve a CSS length against a viewport, in device pixels. */
function lengthPx(value, vp, what) {
  const expr = value.trim()
    .replace(/var\(--footerpx[^)]*\)/g, `${vp.footerPx}`)
    .replace(/\bcalc\(/g, '(')
    .replace(/\bmin\(/g, 'Math.min(')
    .replace(/\bmax\(/g, 'Math.max(')
    .replace(/(-?[\d.]+)vw/g, (_, n) => `(${n} * ${vp.w} / 100)`)
    .replace(/(-?[\d.]+)vh/g, (_, n) => `(${n} * ${vp.h} / 100)`)
    .replace(/(-?[\d.]+)px/g, '$1');
  // Nothing but arithmetic is ever evaluated: an unresolved unit, or a var()
  // this harness does not know about, leaves a name behind and fails here
  // rather than quietly resolving to something plausible.
  assert.match(
    expr.replace(/Math\.(min|max)/g, ''),
    /^[-+*/(),.\s\d]+$/,
    `${what} carries a length this test cannot resolve: ${value}`
  );
  return Function(`"use strict";return (${expr});`)();
}

/** The box one control occupies, in device pixels from the viewport's top left. */
function boxOf(id, vp) {
  const d = declarationsFor(id);
  assert.equal(d['aspect-ratio'], '1', `#${id} takes its height off its width`);

  let w = lengthPx(d.width, vp, `#${id}`);
  if (d['max-width']) w = Math.min(w, lengthPx(d['max-width'], vp, `#${id}`));
  // aspect-ratio:1 makes the height the used width, and max-height caps it the
  // same way max-width caps the width.
  let h = w;
  if (d['max-height']) h = Math.min(h, lengthPx(d['max-height'], vp, `#${id}`));

  const bottomOffset = lengthPx(d.bottom, vp, `#${id}`);
  const left = d.left !== undefined
    ? lengthPx(d.left, vp, `#${id}`)
    : vp.w - lengthPx(d.right, vp, `#${id}`) - w;

  return {
    id, w, h,
    left, right: left + w,
    top: vp.h - bottomOffset - h, bottom: vp.h - bottomOffset,
  };
}

/** A cell the size Courier New draws at a given font size, near enough. */
const modelCell = (size) => ({ w: Math.max(1, Math.ceil(size * 0.6)), h: size + browser.CELL_LEADING });

/**
 * Viewports the overlay is walked over: two phones in portrait, four phones in
 * landscape, and a tablet each way. The landscape shapes are the ones the fault
 * was measured on - a 60x20 tunnel is widest on a phone held sideways, which is
 * the orientation the viewport-unit offsets came apart at.
 */
const SHAPES = [
  { w: 375, h: 667 }, { w: 412, h: 915 },
  { w: 667, h: 375 }, { w: 740, h: 360 },
  { w: 915, h: 412 }, { w: 932, h: 430 },
  { w: 820, h: 1180 }, { w: 1180, h: 820 },
];

/** The grid and the derived custom property one viewport resolves to. */
function viewport(shape) {
  const grid = browser.fitGrid(shape.w, shape.h, modelCell);
  return {
    ...shape,
    grid,
    // What handleResize publishes: the band at the foot of the viewport
    // holding the footer's rows and whatever the grid leaves unpainted below
    // them. A vh constant cannot know either figure.
    footerPx: shape.h - (grid.rows - browser.FOOTER_ROWS) * grid.cellH,
  };
}

/** The character rows a box covers, clamped to the grid. */
function rowsOf(box, vp) {
  const last = vp.grid.rows - 1;
  const clamp = (row) => Math.min(last, Math.max(0, row));
  return {
    first: clamp(Math.floor(box.top / vp.grid.cellH)),
    last: clamp(Math.floor((box.bottom - 1) / vp.grid.cellH)),
  };
}

test('browser: BOOST sits just above FIRE at every shape', () => {
  // The offset was written as FIRE's width plus a gap, but max-width caps
  // FIRE's height and not the offset, so past a viewport of about 492px the
  // two came apart and BOOST floated off towards the top right corner.
  for (const shape of SHAPES) {
    const vp = viewport(shape);
    const fire = boxOf('fire', vp);
    const boost = boxOf('boost', vp);
    const gap = fire.top - boost.bottom;
    assert.ok(gap >= 0, `${shape.w}x${shape.h}: BOOST overlaps FIRE by ${(-gap).toFixed(1)}px`);
    assert.ok(
      gap <= 3 * shape.w / 100,
      `${shape.w}x${shape.h}: BOOST leaves ${gap.toFixed(1)}px above FIRE, over 3vw`
    );
  }
});

test('browser: no control reaches the HUD rows or the footer rows', () => {
  // The controls sat at a viewport-unit offset while the footer is two
  // character rows tall, so on any short viewport they covered the status
  // strip carrying SPD, the powerup badges and MUTED.
  for (const shape of SHAPES) {
    const vp = viewport(shape);
    const lastPlayable = vp.grid.rows - 1 - browser.FOOTER_ROWS;
    const where = `${shape.w}x${shape.h} (${vp.grid.cols}x${vp.grid.rows})`;
    for (const id of ['stick', 'fire', 'boost']) {
      const { first, last } = rowsOf(boxOf(id, vp), vp);
      assert.ok(first >= browser.HUD_ROWS, `${where}: #${id} reaches row ${first}, in the HUD`);
      assert.ok(last <= lastPlayable, `${where}: #${id} reaches row ${last}, in the footer`);
    }
  }
});

test('browser: every control stays inside the viewport', () => {
  for (const shape of SHAPES) {
    const vp = viewport(shape);
    for (const id of ['stick', 'fire', 'boost']) {
      const box = boxOf(id, vp);
      assert.ok(box.left >= 0 && box.right <= shape.w, `${shape.w}x${shape.h}: #${id} off the sides`);
      assert.ok(box.top >= 0 && box.bottom <= shape.h, `${shape.w}x${shape.h}: #${id} off the ends`);
    }
  }
});

test('browser: the controls are anchored to the grid, not to the viewport', () => {
  // The offset has to know how tall the footer is, and only the fitter knows
  // that, so handleResize publishes it and the three rules read it back.
  assert.match(html, /setProperty\(\s*'--footerpx'/);
  for (const id of ['stick', 'fire', 'boost']) {
    assert.match(
      declarationsFor(id).bottom,
      /var\(--footerpx/,
      `#${id} reads the footer band rather than a vh constant`
    );
  }
});

// ----- The favicon -----

test('the tab carries the ship icon, inline', () => {
  const link = html.match(/<link rel="icon" href="([^"]+)"\/>/);
  assert.ok(link, 'the page declares an icon');

  const uri = link[1];
  assert.ok(uri.startsWith('data:image/svg+xml,'), 'inlined rather than fetched');
  // A # inside a data URI starts the fragment, so an unencoded one truncates
  // the icon at the first colour and the tab falls back to the globe.
  assert.doesNotMatch(uri, /#/, 'every colour is percent-encoded');
  assert.doesNotMatch(uri, /[<>]/, 'as are the angle brackets');

  const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /viewBox='0 0 32 32'/);
});

test('the inlined icon is the one in icon.svg', () => {
  // The file is the source and the URI is the copy, so the shapes have to
  // agree or the tab shows a ship the repository no longer draws.
  const source = readFileSync(join(REPO_ROOT, 'icon.svg'), 'utf8');
  const uri = html.match(/<link rel="icon" href="([^"]+)"\/>/)[1];
  const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));

  const shapes = (text) => (text.match(/(?:d|width|height|x|y)='[^']*'|(?:d|width|height|x|y)="[^"]*"/g) ?? [])
    .map((attr) => attr.replace(/"/g, "'"));

  assert.deepEqual(shapes(svg), shapes(source));
});
