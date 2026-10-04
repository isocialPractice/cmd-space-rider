// test/menu-layout.test.mjs — The title screen, debug menu and game over screen
// are shared logic ported line for line between the two builds, so every check
// here runs against both.
//
// Two defects live behind these tests. The debug menu placed its mode list and
// its navigation hint by counting rows down from the title, with nothing
// clamping the result to the screen, and ScreenBuffer.put drops an out-of-range
// write without complaint: at the documented 60x20 minimum the fifth mode and
// the whole navigation hint vanished, and the hint is the only thing on that
// screen that animates. Separately, the starfield was drawn last on all three
// screens, so stars punched holes through the text they were meant to sit
// behind.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  REPO_ROOT, loadBrowserEngine, fakeStorage,
  rowText, screenText, screenCells,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const terminalMenu = require(join(REPO_ROOT, 'out', 'menu.js'));
const { DEBUG_MODES, DEBUG_MODE_NAMES } = require(join(REPO_ROOT, 'out', 'types.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  { name: 'terminal', Game: TerminalGame, ScreenBuffer: TerminalScreen, menu: terminalMenu },
  { name: 'browser', Game: browser.Game, ScreenBuffer: browser.ScreenBuffer, menu: browser },
];

const NAV_HINT = '[ ↑↓ SELECT • ENTER LAUNCH ]';
const MODE_NAMES = DEBUG_MODES.map((mode) => DEBUG_MODE_NAMES[mode]);

/** README gives 60x20 as the minimum; 44 rows is a tall terminal. */
const WIDTHS = [60, 80];
const HEIGHTS = [];
for (let h = 20; h <= 44; h++) HEIGHTS.push(h);

/** A game and a screen buffer of the given size, with the starfield seeded. */
function stage(build, w, h) {
  const game = new build.Game();
  game.state.screenWidth = w;
  game.state.screenHeight = h;
  game.initStars(w, h);
  return { game, screen: new build.ScreenBuffer(w, h) };
}

/**
 * A screen that records every write landing outside the buffer. ScreenBuffer
 * discards those silently, which is what let the clipping go unnoticed, so the
 * only way to assert on them is to watch the calls.
 */
function recordingScreen(build, w, h) {
  const screen = new build.ScreenBuffer(w, h);
  const put = screen.put.bind(screen);
  const outside = [];
  screen.put = (x, y, ch, fg, bg) => {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || px >= w || py < 0 || py >= h) outside.push(`${px},${py}`);
    put(x, y, ch, fg, bg);
  };
  return { screen, outside };
}

/** A star on every cell inside the border, so any draw-order slip is total. */
function saturateStars(state, w, h) {
  state.stars = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      state.stars.push({ x, y, speed: 0, char: '*', color: 8 });
    }
  }
}

/** Put the game in the state the game over screen reads. */
function stageGameOver(game) {
  game.startGame();
  game.state.score = 1234;
  game.state.distance = 5678;
  game.endGame();
}

// ----- Debug menu layout -----

for (const build of BUILDS) {
  test(`${build.name}: the debug menu draws all five modes at every supported size`, () => {
    for (const w of WIDTHS) {
      for (const h of HEIGHTS) {
        const { game, screen } = stage(build, w, h);
        build.menu.renderDebugMenu(screen, game.state);
        const text = screenText(screen);

        for (const name of MODE_NAMES) {
          assert.ok(text.includes(name), `${w}x${h}: mode ${name} should be listed`);
        }
      }
    }
  });

  test(`${build.name}: the debug menu draws its navigation hint at every supported size`, () => {
    for (const w of WIDTHS) {
      for (const h of HEIGHTS) {
        const { game, screen } = stage(build, w, h);
        build.menu.renderDebugMenu(screen, game.state);

        assert.ok(
          screenText(screen).includes(NAV_HINT),
          `${w}x${h}: the navigation hint should be drawn`
        );
      }
    }
  });

  test(`${build.name}: the debug menu never draws on the border or past the buffer`, () => {
    for (const w of WIDTHS) {
      for (const h of HEIGHTS) {
        for (const selected of [0, 2, DEBUG_MODES.length - 1]) {
          const { screen, outside } = recordingScreen(build, w, h);
          const game = new build.Game();
          game.state.screenWidth = w;
          game.state.screenHeight = h;
          game.state.debugMenuSelected = selected;
          game.initStars(w, h);
          build.menu.renderDebugMenu(screen, game.state);

          const label = `${w}x${h} selected ${selected}`;
          assert.deepEqual(outside, [], `${label}: nothing should be written off the buffer`);
          assert.equal(rowText(screen, 0), `╔${'═'.repeat(w - 2)}╗`, `${label}: top border`);
          assert.equal(rowText(screen, h - 1), `╚${'═'.repeat(w - 2)}╝`, `${label}: bottom border`);

          for (let y = 1; y < h - 1; y++) {
            const row = rowText(screen, y);
            assert.equal(row[0], '║', `${label}: left border of row ${y}`);
            assert.equal(row[w - 1], '║', `${label}: right border of row ${y}`);
          }
        }
      }
    }
  });

  test(`${build.name}: the title screen start prompt stays inside the border`, () => {
    for (const w of WIDTHS) {
      for (const h of HEIGHTS) {
        const { game, screen } = stage(build, w, h);
        build.menu.renderTitleScreen(screen, game.state);

        const rows = screenText(screen).split('\n');
        const promptRow = rows.findIndex((row) => row.includes('[ PRESS ENTER TO LAUNCH ]'));
        assert.ok(promptRow > 0, `${w}x${h}: the start prompt should be drawn`);
        assert.ok(promptRow < h - 1, `${w}x${h}: the start prompt should clear the bottom border`);
      }
    }
  });
}

test('both builds lay the debug menu out identically', () => {
  // Suppressed starfields: the two are seeded from Math.random independently
  // and never match cell for cell. What has to match is the layout under them.
  for (const w of WIDTHS) {
    for (const h of HEIGHTS) {
      for (const selected of [0, 2, DEBUG_MODES.length - 1]) {
        const rendered = BUILDS.map((build) => {
          const game = new build.Game();
          game.state.stars = [];
          game.state.debugMenuSelected = selected;
          const screen = new build.ScreenBuffer(w, h);
          build.menu.renderDebugMenu(screen, game.state);
          return screenText(screen);
        });

        assert.equal(rendered[1], rendered[0], `${w}x${h} selected ${selected}`);
      }
    }
  }
});

// ----- Starfield layering -----

for (const build of BUILDS) {
  test(`${build.name}: the menu starfield stays behind the text it is drawn with`, () => {
    const w = 100;
    const h = 30;
    const screens = [
      ['title screen', build.menu.renderTitleScreen, () => {}],
      ['debug menu', build.menu.renderDebugMenu, () => {}],
      ['game over screen', build.menu.renderGameOver, stageGameOver],
    ];

    for (const [name, render, setUp] of screens) {
      const { game, screen } = stage(build, w, h);
      setUp(game);

      game.state.stars = [];
      render(screen, game.state);
      const starless = screenCells(screen);

      saturateStars(game.state, w, h);
      render(screen, game.state);
      const starred = screenCells(screen);

      const lost = starless
        .filter((cell, i) => cell.key[0] !== ' ' && starred[i].key !== cell.key)
        .map((cell) => `${cell.x},${cell.y}`);

      assert.deepEqual(lost, [], `${name}: stars should not overwrite drawn cells`);
    }
  });

  test(`${build.name}: the debug menu stays readable under a full starfield`, () => {
    // The size sweep above runs with a normally seeded starfield, which only
    // lands on a handful of the cells that matter. This one guarantees a hit.
    for (const w of WIDTHS) {
      for (const h of HEIGHTS) {
        const { game, screen } = stage(build, w, h);
        saturateStars(game.state, w, h);
        build.menu.renderDebugMenu(screen, game.state);
        const text = screenText(screen);

        assert.ok(text.includes(NAV_HINT), `${w}x${h}: navigation hint under stars`);
        for (const name of MODE_NAMES) {
          assert.ok(text.includes(name), `${w}x${h}: mode ${name} under stars`);
        }
      }
    }
  });
}

// ----- The navigation hint's pulse -----

/**
 * Foreground colour of the navigation hint at the documented minimum size, with
 * the world clock parked at a given reading. The starfield is suppressed so the
 * colour read back is the hint's own and not a star sitting on top of it.
 */
function navHintColor(build, time) {
  const w = 60;
  const h = 20;
  const { game, screen } = stage(build, w, h);
  game.state.stars = [];
  game.state.time = time;
  build.menu.renderDebugMenu(screen, game.state);

  const rows = screenText(screen).split('\n');
  const y = rows.findIndex((row) => row.includes(NAV_HINT));
  assert.ok(y > 0, `t=${time}: the navigation hint should be drawn`);
  return screen.fg[y * w + rows[y].indexOf(NAV_HINT)];
}

for (const build of BUILDS) {
  test(`${build.name}: the navigation hint still pulses at the minimum size`, () => {
    // The hint is the only animated thing on the debug menu, so a change that
    // stopped it moving would leave that screen completely still with every
    // other check here passing. Its colour turns on sin(time * 3) * 0.5 + 0.5
    // crossing 0.3: at t=0 that term is 0.5 and at t=PI/2 it is 0, which is one
    // either side of the threshold.
    const lit = navHintColor(build, 0);
    const dim = navHintColor(build, Math.PI / 2);
    assert.notEqual(dim, lit, `the hint should change colour across the pulse, saw ${lit} both times`);
  });
}

// ----- Fitting the grid into a browser window -----
//
// Browser only: the CLI build's grid is the terminal's own, and a terminal
// cannot be smaller than the grid it is showing. A canvas can, and clamping
// the grid up to the 60x20 floor built a buffer the window had no room for
// and painted the overflow where nothing displayed it. What went was the
// right of the HUD, taking the SHIELD readout, and the whole footer with the
// control hints and the speed - with nothing on screen saying so.

/** A cell the size Courier New draws at a given font size, near enough. */
const modelCell = (size) => ({ w: Math.max(1, Math.ceil(size * 0.6)), h: size + browser.CELL_LEADING });

/** Window sizes the fitting is walked over, in device pixels. */
const WINDOWS = [];
for (let px = 120; px <= 1920; px += 17) WINDOWS.push({ w: px, h: Math.max(80, Math.round(px * 0.6)) });

test('browser: the grid the buffer is built at always fits the window', () => {
  // The fault itself, stated as the invariant it broke: every cell the buffer
  // holds has somewhere on the canvas to be drawn. Measured against the grid
  // rather than against the window, because the grid is what the renderer
  // writes into and the buffer is what the overflow was lost from.
  for (const win of WINDOWS) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    const painted = `${grid.cols * grid.cellW}x${grid.rows * grid.cellH}`;
    assert.ok(
      grid.cols * grid.cellW <= win.w && grid.rows * grid.cellH <= win.h,
      `${win.w}x${win.h} window: a ${grid.cols}x${grid.rows} grid paints ${painted}`
    );
    assert.ok(
      grid.fontSize <= browser.FONT_SIZE && grid.fontSize >= browser.MIN_FONT_SIZE,
      `${win.w}x${win.h} window: font ${grid.fontSize} is outside the range the page draws at`
    );
  }
});

test('browser: a window that can hold the floor at any font gets the whole grid', () => {
  // The other half: shrinking the font is only worth doing if it is actually
  // tried. A window with room for 60x20 at some font in the range has to come
  // back fitting, whatever font that takes.
  for (const win of WINDOWS) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    const smallest = modelCell(browser.MIN_FONT_SIZE);
    const couldFit = Math.floor(win.w / smallest.w) >= browser.MIN_WIDTH
      && Math.floor(win.h / smallest.h) >= browser.MIN_HEIGHT;
    assert.equal(
      grid.fits, couldFit,
      `${win.w}x${win.h} window: fits was ${grid.fits} with the floor ${couldFit ? '' : 'un'}reachable`
    );
    if (!grid.fits) continue;
    assert.ok(
      grid.cols >= browser.MIN_WIDTH && grid.rows >= browser.MIN_HEIGHT,
      `${win.w}x${win.h} window: a fitting grid came back ${grid.cols}x${grid.rows}`
    );
  }
});

test('browser: the windows the fault was measured in now carry the whole screen', () => {
  // The three sizes read off a real chromium window against the furthest
  // painted cell. 600x360 showed the whole 60x20 grid; 500x320 lost 10 columns
  // and 3 rows, and 380x240 lost 22 columns and 7 rows.
  for (const win of [{ w: 600, h: 360 }, { w: 500, h: 320 }, { w: 380, h: 240 }]) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    assert.ok(grid.fits, `${win.w}x${win.h}: should reach the floor`);

    const game = new browser.Game();
    game.startGame();
    game.state.stars = [];
    game.state.screenWidth = grid.cols;
    game.state.screenHeight = grid.rows;
    const screen = new browser.ScreenBuffer(grid.cols, grid.rows);
    browser.renderGame(screen, game.state);
    const rows = screenText(screen).split('\n');

    // The two readouts the overflow took: SHIELD off the right of the HUD, and
    // the speed off the footer. Both are drawn, and every cell of the buffer
    // they are drawn in is inside the window.
    assert.ok(rows.some((row) => row.includes('SHIELD:')), `${win.w}x${win.h}: SHIELD readout`);
    assert.ok(rows.some((row) => row.includes('SPD:')), `${win.w}x${win.h}: speed readout`);
    assert.ok(
      grid.cols * grid.cellW <= win.w && grid.rows * grid.cellH <= win.h,
      `${win.w}x${win.h}: the grid holding them paints outside the window`
    );
  }
});

test('browser: a window too small for the floor says so, inside its own buffer', () => {
  // Below what the smallest font can reach, the page draws the notice the CLI
  // build draws into a terminal too small for it. It is the one screen that
  // has to survive a grid under the floor, so it is checked for writing
  // nothing off the buffer it was given.
  for (const win of [{ w: 240, h: 150 }, { w: 200, h: 120 }, { w: 120, h: 80 }]) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    assert.equal(grid.fits, false, `${win.w}x${win.h}: should be under the floor`);

    const { screen, outside } = recordingScreen(
      { ScreenBuffer: browser.ScreenBuffer }, grid.cols, grid.rows
    );
    browser.renderTooSmall(screen);

    const label = `${win.w}x${win.h} window, ${grid.cols}x${grid.rows} grid`;
    assert.deepEqual(outside, [], `${label}: nothing should be written off the buffer`);
    const text = screenText(screen);
    assert.ok(text.includes('Window too small!'), `${label}: the notice should name the fault`);
    assert.ok(
      text.includes(`Need ${browser.MIN_WIDTH}x${browser.MIN_HEIGHT}`),
      `${label}: the notice should give the size needed`
    );
    assert.ok(text.includes('Please resize'), `${label}: the notice should say what to do`);
  }
});

// ----- What the page does with the grid it fitted -----
//
// Browser only, for the same reason the fitting above is: a terminal cannot be
// made smaller than the grid it is showing, so the CLI build never re-seats a
// run and test/parity.test.mjs has nothing to pair these with.
//
// `fitGrid` says what grid a window gets; `seatGrid` is what the page does with
// the answer, and until it was lifted out of `handleResize` nothing in the suite
// could reach either it or the `frame()` branch that draws the notice. The
// browser was the only thing that had ever checked them. Measured by hand in a
// chromium window, a run at 900x600 taken down to 200x120 and back came up on
// the same run - score 159 to 189, distance 18.0 to 21.0, with no title screen
// in between - which is the behaviour these pin.

/**
 * The page as source, for the two checks below that read it.
 *
 * `handleResize` and `frame()` both sit under the
 * `// ===== Canvas Setup & Sizing =====` marker `loadBrowserEngine` stops at,
 * so neither can be called here. What they can be asked is whether they still
 * route through the lifted functions, which is the half of this a rename or a
 * quiet inlining would otherwise break with every check still passing.
 */
const pageSource = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');

/** A run put somewhere recognisable, so a reset shows up as a reset. */
function stagedRun() {
  const game = new browser.Game();
  game.startGame();
  game.state.score = 159;
  game.state.distance = 18;
  return game;
}

/** The two windows the resize was measured between, and the grids they fit. */
const SEAT_WINDOWS = [
  { label: 'over the floor', win: { w: 900, h: 600 }, fits: true },
  { label: 'under the floor', win: { w: 200, h: 120 }, fits: false },
];

test('browser: re-seating a run on a new grid leaves the run where it stood', () => {
  // The whole point of the lift. A resize is the one thing that reaches into a
  // live run from the page, so it is the one place a run could be lost - and a
  // run lost here comes up as a fresh game the first time the player drags a
  // window edge, which is what the measurement above would have shown.
  const game = stagedRun();
  const before = {
    mode: game.state.mode,
    score: game.state.score,
    distance: game.state.distance,
  };

  for (const { label, win, fits } of SEAT_WINDOWS) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    assert.equal(grid.fits, fits, `${win.w}x${win.h} should be ${label}`);

    const screen = browser.seatGrid(game, grid);
    const at = `${label} at ${win.w}x${win.h}, a ${grid.cols}x${grid.rows} grid`;

    assert.equal(game.state.mode, before.mode, `${at}: the run should still be playing`);
    assert.equal(game.state.score, before.score, `${at}: the score should be untouched`);
    assert.equal(game.state.distance, before.distance, `${at}: the distance should be untouched`);

    // The buffer is the new grid's, not the old one's. A buffer left behind
    // paints a grid the engine has stopped writing for, and the notice drawn on
    // it is clipped exactly as the game would be - which is why this is checked
    // under the floor as well as over it.
    assert.equal(screen.width, grid.cols, `${at}: the buffer should be the new grid's width`);
    assert.equal(screen.height, grid.rows, `${at}: the buffer should be the new grid's height`);
    assert.equal(game.state.screenWidth, grid.cols, `${at}: the engine should lay out at the new width`);
    assert.equal(game.state.screenHeight, grid.rows, `${at}: the engine should lay out at the new height`);
  }
});

test('browser: a run survives the whole way down under the floor and back', () => {
  // The measured round trip rather than its two ends: down below the floor and
  // back up, on one game, with the readings taken after both moves. A reset on
  // either leg fails here, and a reset on the way back up is the leg the two
  // separate seatings above cannot see.
  const game = stagedRun();
  const grids = [
    browser.fitGrid(900, 600, modelCell),
    browser.fitGrid(200, 120, modelCell),
    browser.fitGrid(900, 600, modelCell),
  ];

  let screen = null;
  for (const grid of grids) screen = browser.seatGrid(game, grid);

  assert.equal(game.state.mode, 'playing', 'the run should come back up playing');
  assert.equal(game.state.score, 159, 'the score should come back as it went down');
  assert.equal(game.state.distance, 18, 'the distance should come back as it went down');
  assert.equal(screen.width, grids[2].cols, 'the buffer should be the window it came back to');
  assert.equal(screen.height, grids[2].rows, 'the buffer should be the window it came back to');
});

test('browser: the starfield is re-laid at every grid it is seated on', () => {
  // The one thing seatGrid changes about the run on purpose. Stars are held in
  // cell coordinates, so a field laid out for the old grid leaves a window that
  // grew with a blank band down its right and bottom - the fitting checks above
  // would all still pass, because the buffer is the right size and only what is
  // in it is wrong.
  const game = stagedRun();
  for (const { win } of SEAT_WINDOWS) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    browser.seatGrid(game, grid);
    const stars = game.state.stars;
    assert.ok(stars.length > 0, `${win.w}x${win.h}: the field should not be empty`);
    const out = stars.filter((st) => st.x < 0 || st.x >= grid.cols || st.y < 0 || st.y >= grid.rows);
    assert.deepEqual(
      out.map((st) => `${st.x},${st.y}`), [],
      `${win.w}x${win.h}: stars should sit inside the ${grid.cols}x${grid.rows} grid`
    );
  }
});

test('browser: the page re-seats the run through seatGrid and nowhere else', () => {
  // The lift is only worth anything if the page actually goes through it, and
  // `handleResize` sits below the marker `loadBrowserEngine` stops at - so it is
  // read off the page as source, the way the hum branch is below. Without this,
  // the three checks above would keep passing against a function the page had
  // quietly stopped calling.
  const start = pageSource.indexOf('function handleResize(){');
  assert.ok(start > 0, 'the page should have a resize handler');
  const body = pageSource.slice(start, pageSource.indexOf('\n}', start));

  assert.ok(body.includes('seatGrid(game,grid)'), 'handleResize should re-seat through seatGrid');
  assert.equal(typeof browser.seatGrid, 'function', 'and seatGrid should be the lifted function');

  // The lines seatGrid now owns. Any of them back in the handler is a second
  // path into the run, which is the state the lift was undoing.
  for (const moved of ['new ScreenBuffer(', 'game.initStars(', 'game.state.screenWidth=']) {
    assert.ok(
      !body.includes(moved),
      `handleResize should leave ${moved} to seatGrid rather than doing it again`
    );
  }
});

test('browser: the notice branch returns before the run is advanced', () => {
  // The other half of the page's use of the grid: under the floor, `frame()`
  // draws the notice and returns, and the run is left exactly where it stood so
  // that resizing back brings the same game up. The hum check below pins what
  // that branch has to do on the way out; this pins what it must not do, which
  // is reach the update at all.
  const start = pageSource.indexOf('if(!gridFits){');
  assert.ok(start > 0, 'the page should have a branch for a window under the floor');
  const branch = pageSource.slice(start, pageSource.indexOf('\n  }', start));

  assert.ok(branch.includes('renderTooSmall(screen)'), 'the branch should draw the notice');
  assert.ok(/\breturn\b/.test(branch), 'and return rather than falling through to the run');
  for (const advances of ['game.update(', 'game.handleMenuInput(', 'renderGame(']) {
    assert.ok(
      !branch.includes(advances),
      `the branch should return before ${advances}, leaving the run where it stood`
    );
  }
});

// ----- Where a glyph sits in its cell -----
//
// Browser only: the CLI build hands characters to a terminal, which places them
// in cells of its own, so there is nothing here for test/parity.test.mjs.
//
// `fitGrid` takes the ceiling of the font's advance, because a grid laid out on
// fractional columns loses its last column off the canvas - so every cell
// carries the difference between its width and the width the font draws at. The
// glyph used to be packed against the cell's left edge, which put all of that
// difference in one gap on its right. At MIN_FONT_SIZE it is a real share of a
// cell, and the tunnel walls are built out of box characters meant to tile edge
// to edge.
//
// `render` itself needs a canvas, so what is checked here is the arithmetic it
// places by and the two context properties it sets, through a recording stub.

/** A canvas context that records what was asked of it rather than drawing. */
function recordingContext() {
  const calls = { text: [], rects: [] };
  const ctx = {
    textBaseline: '',
    font: '',
    fillStyle: '',
    textRendering: '',
    fontKerning: '',
    fillText: (ch, x, y) => calls.text.push({ ch, x, y }),
    fillRect: (x, y, w, h) => calls.rects.push({ x, y, w, h }),
  };
  return { ctx, calls };
}

test('browser: a glyph is centred in the slack its cell has over the advance', () => {
  // The whole of the placement, stated as the arithmetic. Half the slack each
  // side is the same ink with the seam between two box glyphs halved.
  // Compared to a tolerance because the slack is a float: (4 - 3.6) / 2 is
  // 0.19999999999999996 in binary, and it is a pixel offset rather than a
  // figure anything counts in.
  const close = (cellW, advance, want) => assert.ok(
    Math.abs(browser.glyphInset(cellW, advance) - want) < 1e-9,
    `a ${cellW} cell over an advance of ${advance} should inset ${want}, `
    + `saw ${browser.glyphInset(cellW, advance)}`
  );
  close(4, 3.6, 0.2);
  close(10, 9, 0.5);
  close(8, 7.5, 0.25);
});

test('browser: a glyph with no slack to share is drawn where it always was', () => {
  // Every case that is not a usable pair, which includes the caller that has no
  // measurement and passes the cell width itself. None of them may invent an
  // offset: a negative one would draw into the cell to the left.
  for (const [cellW, advance] of [[4, 4], [4, 5], [4, 0], [4, -1], [0, 0], [4, NaN], [4, undefined]]) {
    assert.equal(
      browser.glyphInset(cellW, advance), 0,
      `cell ${cellW} against an advance of ${String(advance)}`
    );
  }
});

test('browser: the inset never pushes a glyph out of its own cell', () => {
  // Walked over every font size the fitting can settle on and a spread of
  // advances inside each. The inset is only ever a fraction of a pixel, and it
  // has to stay inside the cell at both ends or the grid shears.
  for (let size = browser.MIN_FONT_SIZE; size <= browser.FONT_SIZE; size++) {
    for (let frac = 0; frac < 1; frac += 0.05) {
      const advance = size * 0.6 + frac;
      const cellW = Math.max(1, Math.ceil(advance));
      const inset = browser.glyphInset(cellW, advance);
      const at = `font ${size}, advance ${advance.toFixed(2)}, cell ${cellW}`;
      assert.ok(inset >= 0, `${at}: inset ${inset} reaches into the cell to the left`);
      assert.ok(inset + advance <= cellW + 1e-9, `${at}: inset ${inset} overruns the cell`);
      assert.ok(Math.abs(inset - (cellW - advance - inset)) < 1e-9, `${at}: the two margins differ`);
    }
  }
});

test('browser: the fitting carries the unrounded advance it ceiled the cell from', () => {
  // The two have to travel together. The caller cannot re-measure, because the
  // font size is whatever this fitting settled on, so a grid that reports only
  // the rounded width leaves the drawing with nothing to inset by.
  // A quarter pixel over, which never lands on a whole one: six tenths of any
  // font size in the range has a fraction of .0, .2, .4, .6 or .8, so a quarter
  // on top of it always leaves slack for the cell to be ceiled into.
  const measured = (size) => {
    const advance = size * 0.6 + 0.25;
    return { w: Math.max(1, Math.ceil(advance)), h: size + browser.CELL_LEADING, advance };
  };
  for (const win of [{ w: 1920, h: 1080 }, { w: 900, h: 600 }, { w: 420, h: 260 }]) {
    const grid = browser.fitGrid(win.w, win.h, measured);
    const at = `${win.w}x${win.h}, font ${grid.fontSize}`;
    assert.equal(grid.advance, measured(grid.fontSize).advance, `${at}: the advance should come through`);
    assert.equal(grid.cellW, Math.ceil(grid.advance), `${at}: the cell should be its ceiling`);
    assert.ok(browser.glyphInset(grid.cellW, grid.advance) > 0, `${at}: there should be slack to centre in`);
  }
});

test('browser: a measure with no advance leaves the cell width standing in', () => {
  // `modelCell` above is one of these, and so is any caller that only knows the
  // cell. The fallback has to be the cell width, which insets nothing, rather
  // than undefined - which would make the inset NaN and put every glyph
  // nowhere.
  for (const win of [{ w: 1920, h: 1080 }, { w: 300, h: 200 }]) {
    const grid = browser.fitGrid(win.w, win.h, modelCell);
    assert.equal(grid.advance, grid.cellW, `${win.w}x${win.h}`);
    assert.equal(browser.glyphInset(grid.cellW, grid.advance), 0, `${win.w}x${win.h}`);
  }
});

test('browser: every glyph of a frame is drawn at its cell plus the one inset', () => {
  // The placement as `render` applies it. One inset for the whole grid, because
  // the font is monospace and every cell is the same width - a per-cell reading
  // would be the same figure computed thousands of times a frame.
  const { ctx, calls } = recordingContext();
  const screen = new browser.ScreenBuffer(6, 3);
  screen.putString(0, 0, 'ABCDEF', 7, 0);
  screen.putString(0, 2, 'UVWXYZ', 7, 0);

  const cellW = 10;
  const cellH = 18;
  const advance = 9.4;
  screen.render(ctx, cellW, cellH, '16px monospace', advance);

  const inset = browser.glyphInset(cellW, advance);
  assert.ok(inset > 0, 'the test should be using a cell with slack in it');
  assert.equal(calls.text.length, 12, 'both rows of text should have been drawn');
  for (const { ch, x, y } of calls.text) {
    const col = Math.round((x - inset) / cellW);
    const row = y / cellH;
    assert.equal(x, col * cellW + inset, `${ch} should sit one inset into column ${col}`);
    assert.equal(y, row * cellH, `${ch} should sit at the top of row ${row}`);
    assert.equal(screen.chars[row * screen.width + col], ch, `${ch} should be drawn at its own cell`);
  }
});

test('browser: a render with no advance draws the grid exactly as it did before', () => {
  // The default, which is what the two page call sites fall back to if the
  // measurement ever stops arriving. Left-packed is less crisp, not broken, and
  // it has to stay available rather than becoming a NaN.
  const { ctx, calls } = recordingContext();
  const screen = new browser.ScreenBuffer(4, 1);
  screen.putString(0, 0, 'WXYZ', 7, 0);
  screen.render(ctx, 10, 18, '16px monospace');

  assert.deepEqual(calls.text.map((c) => c.x), [0, 10, 20, 30]);
  assert.deepEqual(calls.text.map((c) => c.y), [0, 0, 0, 0]);
});

test('browser: the grid asks for exact glyph positions and no kerning', () => {
  // Asked for as insurance rather than as what the centring rests on: measured
  // against the page in chromium, the fractional position is honoured either
  // way. The case it covers is an engine that rounds a glyph's position to a
  // whole pixel, which would snap the inset back to zero. What is pinned here
  // is that the page asks, since that is the part a renderer can lose.
  const { ctx } = recordingContext();
  new browser.ScreenBuffer(2, 1).render(ctx, 10, 18, '16px monospace', 9.4);
  assert.equal(ctx.textRendering, 'geometricPrecision');
  assert.equal(ctx.fontKerning, 'none', 'every cell is drawn alone, so kerning has nothing to read');
  assert.equal(ctx.textBaseline, 'top', 'the leading still sits under the row');
});

test('browser: a context without the text properties is still drawn into', () => {
  // Neither property has a fallback because neither has anything to fall back
  // to, so the tuning is asked for behind a capability check. A context that
  // has never heard of them draws the grid as this build drew it before.
  const plain = { fillText: () => {}, fillRect: () => {} };
  assert.doesNotThrow(() => browser.tuneText(plain));
  assert.doesNotThrow(() => browser.tuneText(null));
  assert.ok(!('textRendering' in plain), 'the tuning should not invent the property');

  const drawn = [];
  const screen = new browser.ScreenBuffer(3, 1);
  screen.putString(0, 0, 'ABC', 7, 0);
  screen.render(
    { fillText: (ch, x) => drawn.push({ ch, x }), fillRect: () => {} },
    10, 18, '16px monospace', 9.4
  );
  assert.deepEqual(drawn.map((d) => d.ch), ['A', 'B', 'C']);
});

test('browser: the page measures the advance under the same tuning it draws with', () => {
  // `measureCell` sits below the DOM marker, so it is read as source. A width
  // measured hinted and then drawn precise is a figure for a different grid
  // than the one on the screen, and the inset taken from it would be wrong by
  // whatever the rounding moved.
  const start = pageSource.indexOf('function measureCell(size){');
  assert.ok(start > 0, 'the page should measure its cell');
  const body = pageSource.slice(start, pageSource.indexOf('\n}', start));

  assert.ok(body.includes('tuneText(ctx)'), 'measureCell should measure under the drawing tuning');
  assert.ok(body.includes('advance'), 'and report the unrounded advance');
  assert.ok(/ceil\(advance\)/.test(body), 'with the cell width as its ceiling');

  // And the page hands that figure to the renderer at both call sites, rather
  // than letting the default quietly take over.
  const renders = pageSource.match(/screen\.render\(ctx,cellW,cellH,FONT[^)]*\)/g) ?? [];
  assert.equal(renders.length, 2, 'the page should draw the grid in two places');
  for (const call of renders) {
    assert.ok(call.endsWith(',cellAdvance)'), `${call} should pass the measured advance`);
  }
});

test('browser: a window under the floor cuts the engine hum', () => {
  // The notice freezes the run where it stood, which means `frame()` returns
  // before it reaches `audio.frame` - and `audio.frame` is the only thing that
  // ever stops the hum. Without a call on the way out, shrinking a running,
  // unmuted window below the floor leaves the oscillator sounding at the pitch
  // it was last set to for as long as the notice is up, while the run it
  // belongs to is not advancing.
  //
  // `frame()` sits below the marker `loadBrowserEngine` stops at, so it is read
  // off the page as source, the way the keypress wiring is in sound.test.mjs.
  // The method it names is asked of the loaded engine, so a rename cannot leave
  // this passing against a call that no longer resolves.
  const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('if(!gridFits){');
  assert.ok(start > 0, 'the page should have a branch for a window under the floor');
  const branch = html.slice(start, html.indexOf('\n  }', start));

  assert.ok(
    branch.includes('audio.engineOff()'),
    'the too-small branch should stop the hum before it returns'
  );
  assert.equal(
    typeof browser.RetroAudio.prototype.engineOff, 'function',
    'and the method it calls should be the one the audio layer stops the hum with'
  );
});
