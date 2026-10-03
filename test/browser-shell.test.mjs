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
import { pageStyle } from './page-style.mjs';

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

// ----- The gamepad -----
//
// The third way into the two key maps, after the keyboard and the thumbstick,
// and the only one with no events to listen for: the Gamepad API hands out a
// snapshot when asked and nothing else, so the page polls it once a frame.
//
// Checked at the same seam the thumbstick is. `padKeys` is arithmetic over one
// snapshot and sits above the `// ===== Canvas Setup & Sizing =====` marker;
// the polling is below it, where nothing in this suite can reach, so what the
// poll does is read off the page as source.

/** A standard-layout snapshot: two left-stick axes and the eight buttons read. */
function padSnapshot({ x = 0, y = 0, a = 0, b = 0, lt = 0, rt = 0, mapping = 'standard' } = {}) {
  const buttons = [a, 0, 0, 0, 0, 0, lt, rt].map((value) => ({ value, pressed: value >= 0.5 }));
  buttons[1] = { value: b, pressed: b >= 0.5 };
  return { mapping, connected: true, axes: [x, y], buttons };
}

/** The keys a snapshot holds, as a sorted name, so a reading reads as one. */
function heldNames(held) {
  return Object.keys(held).filter((k) => held[k]).sort().join('+');
}

test('a pad at rest holds nothing', () => {
  assert.equal(heldNames(browser.padKeys(padSnapshot(), 'playing')), '');
});

test('the left stick steers, on the keys the ship is steered by', () => {
  // The engine reads A/LEFT, D/RIGHT, W/UP and S/DOWN, so the arrow names are
  // what a pad has to produce for the ship to move at all.
  assert.equal(heldNames(browser.padKeys(padSnapshot({ x: -1 }), 'playing')), 'LEFT');
  assert.equal(heldNames(browser.padKeys(padSnapshot({ x: 1 }), 'playing')), 'RIGHT');
  // A pad's vertical axis reads negative pushed up, which is the same sign the
  // page's own y runs in - so the stick and the thumbstick need no flip
  // between them.
  assert.equal(heldNames(browser.padKeys(padSnapshot({ y: -1 }), 'playing')), 'UP');
  assert.equal(heldNames(browser.padKeys(padSnapshot({ y: 1 }), 'playing')), 'DOWN');
  assert.equal(heldNames(browser.padKeys(padSnapshot({ x: 1, y: -1 }), 'playing')), 'RIGHT+UP');
});

test('the stick reads by the same rule the thumbstick does', () => {
  // Reuse stated as the invariant: a pad axis pair is a push at a radius of 1,
  // and it has to come out of padKeys as the same four keys stickKeys gives
  // that push. One tuning governs a thumb on glass and a thumb on a controller,
  // and a change to STICK_DEADZONE or STICK_AXIS_SHARE moves both or neither.
  for (let deg = 0; deg < 360; deg += 3) {
    for (const throwAt of [0.2, 0.31, 0.6, 1]) {
      const rad = (deg * Math.PI) / 180;
      const x = Math.cos(rad) * throwAt;
      const y = Math.sin(rad) * throwAt;
      const steer = browser.stickKeys(x, y, 1);
      const held = browser.padKeys(padSnapshot({ x, y }), 'playing');
      const at = `${deg} degrees at ${throwAt}`;
      for (const k of ['LEFT', 'RIGHT', 'UP', 'DOWN']) {
        assert.equal(held[k], steer[k], `${at}: ${k}`);
      }
    }
  }
});

test('a stick inside the dead zone steers nowhere', () => {
  const inside = browser.STICK_DEADZONE * 0.9;
  for (const [x, y] of [[inside, 0], [-inside, 0], [0, inside], [0, -inside]]) {
    assert.equal(heldNames(browser.padKeys(padSnapshot({ x, y }), 'playing')), '', `${x},${y}`);
  }
  const outside = browser.STICK_DEADZONE * 1.1;
  assert.equal(heldNames(browser.padKeys(padSnapshot({ x: -outside }), 'playing')), 'LEFT');
});

test('A fires in a run and confirms everywhere else', () => {
  // The same reading the on-screen FIRE button takes, and taken through the
  // same function: the title screen, the debug menu and the game over screen
  // all wait on an ENTER the pad has no other way to send.
  assert.equal(heldNames(browser.padKeys(padSnapshot({ a: 1 }), 'playing')), 'SPACE');
  for (const mode of ['menu', 'dead', 'debugMenu']) {
    assert.equal(heldNames(browser.padKeys(padSnapshot({ a: 1 }), mode)), 'ENTER', mode);
  }
});

test('B boosts and the two triggers roll either way', () => {
  // F is the boost the engine reads, and Q and E are the two directions of the
  // barrel roll - left trigger rolls left, as the hands are already arranged.
  assert.equal(heldNames(browser.padKeys(padSnapshot({ b: 1 }), 'playing')), 'F');
  assert.equal(heldNames(browser.padKeys(padSnapshot({ lt: 1 }), 'playing')), 'Q');
  assert.equal(heldNames(browser.padKeys(padSnapshot({ rt: 1 }), 'playing')), 'E');
  assert.equal(
    heldNames(browser.padKeys(padSnapshot({ x: -1, a: 1, b: 1, rt: 1 }), 'playing')),
    'E+F+LEFT+SPACE',
    'a full handful should all come through at once'
  );
});

test('a trigger has to be pulled, not brushed', () => {
  // The triggers are the only analog buttons on a pad, and a resting finger
  // reports a few percent. The face buttons are digital either way.
  const pull = browser.PAD_TRIGGER_PULL;
  assert.equal(browser.padPressed({ value: pull * 0.9, pressed: false }), false);
  assert.equal(browser.padPressed({ value: pull, pressed: false }), true);
  assert.equal(heldNames(browser.padKeys(padSnapshot({ lt: pull * 0.9 }), 'playing')), '');
  assert.equal(heldNames(browser.padKeys(padSnapshot({ lt: pull }), 'playing')), 'Q');
});

test('a button resting at zero is read by its pressed flag', () => {
  // Some drivers report a face button with no analog figure at all. The flag is
  // the fallback, and it has to be read or those pads press nothing.
  assert.equal(browser.padPressed({ value: 0, pressed: true }), true);
  assert.equal(browser.padPressed({ value: 0, pressed: false }), false);
  assert.equal(browser.padPressed(undefined), false);
  assert.equal(browser.padPressed(null), false);
});

test('a pad that is not standard layout drives nothing', () => {
  // The indices are the standard layout, not a guess at a device. A wheel or a
  // flight stick read by them would steer on whatever axis came first, which is
  // worse for the player than a controller the game ignores.
  const live = padSnapshot({ x: -1, a: 1, b: 1, lt: 1, rt: 1 });
  assert.notEqual(heldNames(browser.padKeys(live, 'playing')), '', 'the snapshot should hold keys');
  for (const mapping of ['', undefined, 'none']) {
    const odd = { ...live, mapping };
    assert.equal(heldNames(browser.padKeys(odd, 'playing')), '', `mapping ${String(mapping)}`);
  }
});

test('no pad, or an empty slot, holds nothing', () => {
  // navigator.getGamepads() returns a fixed-length array with nulls in the
  // slots nothing is plugged into, so the nulls arrive here on every poll.
  assert.equal(heldNames(browser.padKeys(null, 'playing')), '');
  assert.equal(heldNames(browser.padsKeys([null, null, null, null], 'playing')), '');
  assert.equal(heldNames(browser.padsKeys(null, 'playing')), '');
  assert.equal(heldNames(browser.padsKeys([], 'playing')), '');
});

test('every pad plugged in can drive, and a disconnected one cannot', () => {
  // Which slot a controller lands in is not the player's business: a browser
  // leaves gaps, fills a different slot after a reconnect, and some drivers
  // report one physical pad twice. So the slots are OR-ed rather than chosen
  // between.
  const pads = [null, padSnapshot({ x: -1 }), null, padSnapshot({ a: 1 })];
  assert.equal(heldNames(browser.padsKeys(pads, 'playing')), 'LEFT+SPACE');

  const gone = [{ ...padSnapshot({ x: 1, a: 1 }), connected: false }, padSnapshot({ b: 1 })];
  assert.equal(
    heldNames(browser.padsKeys(gone, 'playing')), 'F',
    'a pad that has been unplugged should not still be holding its last reading'
  );
});

test('the keys a pad can hold are all keys the engine reads', () => {
  // A name this map produces that nothing downstream looks at is a control that
  // silently does nothing, and the engine is the only thing that says which
  // names those are. Read out of the compiled engine rather than listed again.
  const engine = readFileSync(join(REPO_ROOT, 'src', 'game.ts'), 'utf8');
  for (const k of browser.PAD_CONTROL_KEYS) {
    assert.ok(
      engine.includes(`keys['${k}']`) || engine.includes(`justPressed['${k}']`),
      `${k} is held by the pad but read nowhere in the engine`
    );
  }
});

test('the A button keeps the key it went down on until it comes up', () => {
  // `padKeys` reads A against the mode of the frame it was polled on, so a mode
  // change under a button nobody moved used to turn a hold into a fresh press
  // of a different key. The run ending is the case that mattered: fire held
  // through a death came back as the ENTER the game over screen waits on, and
  // on a seeded flight with A held throughout the run died on frame 2089 with
  // 8425 points and was already back at zero on frame 2090 - a game over screen
  // that stood for one frame and a score nobody could read.
  //
  // Held either way round, because the title screen is the same change in
  // reverse: A pressed to launch a run must not become the trigger halfway
  // through its own press.
  const playing = browser.padsKeys([padSnapshot({ a: 1 })], 'playing');
  const dead = browser.padsKeys([padSnapshot({ a: 1 })], 'dead');
  assert.equal(browser.padFireKey(playing, null), 'SPACE', 'a press in a run fires');
  assert.equal(browser.padFireKey(dead, 'SPACE'), 'SPACE', 'and stays the trigger past the death');
  assert.equal(browser.padFireKey(dead, null), 'ENTER', 'a press on the game over screen confirms');
  assert.equal(browser.padFireKey(playing, 'ENTER'), 'ENTER', 'and stays the confirm into the run');
});

test('a released A button resolves afresh on its next press', () => {
  // The hold is the press's key, not the pad's forever. Letting go has to clear
  // it or a pad that launched a run could never fire in it.
  const up = browser.padsKeys([padSnapshot()], 'playing');
  assert.equal(browser.padFireKey(up, 'ENTER'), null, 'an A button that is up holds nothing');
  assert.equal(browser.padFireKey(up, null), null);

  const playing = browser.padsKeys([padSnapshot({ a: 1 })], 'playing');
  assert.equal(browser.padFireKey(playing, null), 'SPACE', 'the next press reads the mode again');
});

test('the fire hold leaves the rest of the pad alone', () => {
  // Only A is resolved against the mode, so only A is held across one. The
  // stick, the boost and the two triggers send the same key in every mode and
  // have nothing to carry.
  const full = browser.padsKeys([padSnapshot({ x: -1, b: 1, lt: 1 })], 'playing');
  const before = heldNames(full);
  browser.padFireKey(full, 'ENTER');
  assert.equal(heldNames(full), before, 'resolving the fire key should read, not write');
  assert.equal(before, 'F+LEFT+Q');
});

test('the page polls the pad once a frame and releases only what it pressed', () => {
  // The polling sits below the DOM marker, so it is read as source the way the
  // notice branch is in menu-layout.test.mjs. Three things have to hold, and
  // the middle one is the whole reason the previous reading is kept: a pad
  // reports every key it is not holding as up, so feeding those straight
  // through would have a controller sitting on a desk clearing the keyboard's
  // keys sixty times a second.
  assert.match(html, /\n  pollGamepads\(\);/, 'frame() should poll the pad');
  const start = html.indexOf('function pollGamepads(){');
  assert.ok(start > 0, 'the page should have a poll');
  const body = html.slice(start, html.indexOf('\n}', start));

  assert.ok(body.includes('padWasHeld'), 'the poll should remember what it was holding');
  assert.ok(
    /else if\(padWasHeld\?\.\[k\]\)\{\s*setKey\(k,false\)/.test(body),
    'and release a key only where it was the thing holding it'
  );
  assert.ok(body.includes('setKey(k,true)'), 'the poll should press through setKey');
  assert.ok(body.includes('audio.resume()'), 'a first press is the gesture a sound needs');

  // And the fire key is resolved through the hold rather than taken from the
  // frame's own reading, which is the half of it the unit checks above cannot
  // see: they pin the function, and this pins the poll using it.
  assert.ok(
    body.includes('padFireKey(held,padFire)'),
    'the poll should hold the fire key the press resolved'
  );
  assert.ok(
    body.includes("held.SPACE=padFire==='SPACE'") && body.includes("held.ENTER=padFire==='ENTER'"),
    'and write it back, so the release is the release of what was pressed'
  );

  // Polled before the branch that draws the too-small notice, so a pad behaves
  // like the keyboard, whose listeners fire whatever the window size is.
  const poll = html.indexOf('\n  pollGamepads();');
  const notice = html.indexOf('if(!gridFits){');
  assert.ok(poll < notice, 'the poll should come before the notice branch returns');
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

// The stylesheet is resolved through test/page-style.mjs, which the overlay
// probe reads the same three rules through. Two copies of a length are two
// figures that drift, and the probe's are quoted in the CHANGELOG.
const style = pageStyle(html);

/** The box one control occupies, in device pixels from the viewport's top left. */
function boxOf(id, vp) {
  const d = style.declarationsFor(`#${id}`);
  assert.equal(d['aspect-ratio'], '1', `#${id} takes its height off its width`);

  let w = style.lengthPx(d.width, vp, `#${id}`);
  if (d['max-width']) w = Math.min(w, style.lengthPx(d['max-width'], vp, `#${id}`));
  // aspect-ratio:1 makes the height the used width, and max-height caps it the
  // same way max-width caps the width.
  let h = w;
  if (d['max-height']) h = Math.min(h, style.lengthPx(d['max-height'], vp, `#${id}`));

  const bottomOffset = style.lengthPx(d.bottom, vp, `#${id}`);
  const left = d.left !== undefined
    ? style.lengthPx(d.left, vp, `#${id}`)
    : vp.w - style.lengthPx(d.right, vp, `#${id}`) - w;

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
 * landscape, and a tablet each way. The landscape shapes are the ones the
 * viewport-unit offsets came apart at - a 60x20 tunnel is widest on a phone
 * held sideways, which is the orientation they were measured in.
 *
 * The six short shapes below them are the second failure, where the controls
 * and the gap between them outgrew the playable band: what they cost is driven
 * by the viewport's width while the room for them is driven by its height, so
 * a viewport under about 340px tall put BOOST back on the shield bar.
 *
 * The last two are not devices. They are the floor of what the game will play
 * at - fitGrid reports `fits: true` at both, so the game draws and the overlay
 * is live the moment a touch arrives - and they are here because the stick
 * comes apart before BOOST does on a narrow one. Without them the stick's
 * bound is held by nothing but the assertion that the rule reads --playpx,
 * which is a check that the fix is present rather than that it works.
 */
const SHAPES = [
  { w: 375, h: 667 }, { w: 412, h: 915 },
  { w: 667, h: 375 }, { w: 740, h: 360 },
  { w: 915, h: 412 }, { w: 932, h: 430 },
  { w: 820, h: 1180 }, { w: 1180, h: 820 },
  { w: 1180, h: 300 }, { w: 820, h: 300 },
  { w: 932, h: 330 }, { w: 667, h: 300 },
  { w: 740, h: 330 }, { w: 740, h: 320 },
  { w: 349, h: 160 }, { w: 400, h: 180 },
];

/** A CSS pixel length the page published, as a number. */
function px(value, what) {
  assert.match(String(value), /^-?[\d.]+px$/, `${what} is published as a pixel length`);
  return Number.parseFloat(value);
}

/** The grid and the derived custom properties one viewport resolves to. */
function viewport(shape) {
  const grid = browser.fitGrid(shape.w, shape.h, modelCell);
  // The map handleResize publishes, taken from the page's own function rather
  // than restated here, and read back *by property name* - so every box below is
  // laid out with whatever --footerpx and --playpx actually carry. footerPx is
  // the band at the foot of the viewport holding the footer's rows and whatever
  // the grid leaves unpainted below them; playPx is the band between the HUD and
  // the footer, which is the room the overlay has to fit in. No viewport unit
  // can know either, which is the whole reason the page publishes them.
  const vars = browser.overlayVars(grid, shape.h);
  return {
    ...shape,
    grid,
    vars,
    footerPx: px(vars['--footerpx'], '--footerpx'),
    playPx: px(vars['--playpx'], '--playpx'),
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

test('browser: the published footer band is the footer and nothing else', () => {
  // The figure the whole overlay hangs off. Asserting it against its own
  // arithmetic would only prove the test can do the sum, so these are the two
  // properties that make it the *footer's* band: it covers the footer's rows,
  // and it covers no row the game paints. fitGrid floors the row count, so the
  // slack below the last row is always under one cell - which is what puts the
  // band inside a single row of FOOTER_ROWS * cellH.
  //
  // That bracket is what catches a wrong row constant. Substituting HUD_ROWS
  // for FOOTER_ROWS used to leave the whole suite green; it now fails here,
  // because 3 rows of band is a whole row more than the footer owns.
  for (const shape of SHAPES) {
    const vp = viewport(shape);
    const { cellH } = vp.grid;
    const where = `${shape.w}x${shape.h} (${vp.grid.cols}x${vp.grid.rows})`;
    assert.ok(
      vp.footerPx >= browser.FOOTER_ROWS * cellH,
      `${where}: the band is ${vp.footerPx}px, under the footer's ${browser.FOOTER_ROWS} rows`
    );
    assert.ok(
      vp.footerPx < (browser.FOOTER_ROWS + 1) * cellH,
      `${where}: the band is ${vp.footerPx}px, over a row more than the footer owns`
    );
  }
});

test('browser: each band is published under the property name that belongs to it', () => {
  // The two figures are both pixel lengths off the same grid, so handing each to
  // the other's property is a swap no arithmetic notices - and it is nowhere
  // near a near miss in a browser. Swapped, a 375x667 phone draws FIRE 4.4px
  // across and 607px up a 667px viewport instead of 90px across and 38px up:
  // every control is a dot near the top of the screen and none of them is
  // reachable by a thumb.
  //
  // What catches it is that the two bands are shaped differently. The footer's
  // band is the footer's rows plus the slack the fitter floors off, so it is
  // under one character row more than those rows and almost never a whole
  // number of them; the play band is nothing but rows. The test above brackets
  // the first; this pins the second, and also pins the partition, so neither
  // figure can be some third length that happens to satisfy one bound.
  for (const shape of SHAPES) {
    const vp = viewport(shape);
    const { cellH } = vp.grid;
    const where = `${shape.w}x${shape.h} (${vp.grid.cols}x${vp.grid.rows})`;
    assert.deepEqual(
      Object.keys(vp.vars).sort(),
      ['--footerpx', '--playpx'],
      'the page publishes exactly the two properties the overlay rules read'
    );
    assert.equal(
      vp.playPx % cellH, 0,
      `${where}: --playpx is ${vp.playPx}px, not a whole number of ${cellH}px rows`
    );
    assert.equal(
      vp.playPx, shape.h - vp.footerPx - browser.HUD_ROWS * cellH,
      `${where}: --playpx is not what the HUD's rows and --footerpx leave of the viewport`
    );
  }
});

test('browser: nothing below the DOM marker works either band out for itself', () => {
  // handleResize is below the marker test/helpers.mjs stops at, so nothing here
  // can execute it. What is checkable is that it computes neither figure: it
  // hands over the map overlayVars returns, which is the function every
  // assertion above reads. A setProperty call naming a property directly is the
  // shape this replaced, and it could only ever be checked for being present.
  assert.match(html, /overlayVars\(\s*grid\s*,\s*canvas\.height\s*\)/);
  assert.doesNotMatch(
    html,
    /setProperty\(\s*'--(?:footerpx|playpx)'/,
    'neither band is published by a line the suite cannot reach'
  );
});

test('browser: every control is sized against the band, not against the viewport', () => {
  // What a control costs is driven by how wide the viewport is; the room for
  // it is driven by how tall the viewport is, in character rows nothing in CSS
  // can measure. So each size has to be solved out of the band the page
  // publishes. A viewport cap alone is what let BOOST climb onto the HUD on
  // every short landscape shape, which is what the six short SHAPES hold.
  for (const name of ['--ctl', '--stick']) {
    assert.ok(style.properties[name], `the page declares ${name} on :root`);
    assert.match(
      style.properties[name],
      /var\(--playpx/,
      `${name} is bounded by the published band rather than by a viewport unit`
    );
  }
  assert.equal(style.declarationsFor('#stick').width, 'var(--stick)');
  for (const id of ['fire', 'boost']) {
    assert.equal(
      style.declarationsFor(`#${id}`).width,
      'var(--ctl)',
      `#${id} is drawn at --ctl rather than at its own copy of the figure`
    );
  }
  // BOOST stands on FIRE's height. Written as a second copy of the size it
  // drifts the moment either cap binds, which is the fault that put BOOST in
  // the top right corner, so it has to be the same property.
  assert.match(
    style.declarationsFor('#boost').bottom,
    /var\(--ctl\)/,
    "BOOST's offset reads the same size FIRE is drawn at"
  );
});

test('browser: the controls are anchored to the grid, not to the viewport', () => {
  // The offset has to know how tall the footer is, and only the fitter knows
  // that, so the page publishes it and the three rules read it back.
  for (const id of ['stick', 'fire', 'boost']) {
    assert.match(
      style.declarationsFor(`#${id}`).bottom,
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
