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
