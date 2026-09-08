// test/hud-row.test.mjs — The row under the shield bar is shared. The combo
// counter is left-aligned on it, the debug label and the NEW BEST banner are
// centred on it, and none of the three may overwrite another.
//
// The counter against the debug label is covered where the chaining is tested.
// This file covers the pairing that only a normal run can produce, which is why
// it is easy to miss: the banner fires once, on the first crossing of the
// stored best, and a chain has to already be running at that moment for the two
// to meet. Driving a real run until they coincided took over a minute of firing
// and never landed on its own.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, rowText } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const { renderGame: terminalRender } = require(join(REPO_ROOT, 'out', 'render.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  { name: 'terminal', Game: TerminalGame, ScreenBuffer: TerminalScreen, renderGame: terminalRender },
  { name: 'browser', Game: browser.Game, ScreenBuffer: browser.ScreenBuffer, renderGame: browser.renderGame },
];

const HUD_ROWS = 3;
const BANNER = '[ NEW BEST ]';
const COUNTER = /COMBO x\d+/;

/** A normal run with an empty world, showing a chain and the banner at once. */
function stageBoth(build, width, height, combo) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  s.bullets = [];
  s.particles = [];
  s.stars = [];
  s.screenWidth = width;
  s.screenHeight = height;
  s.combo = combo;
  s.newBestFlash = 1;
  const screen = new build.ScreenBuffer(width, height);
  build.renderGame(screen, s);
  return rowText(screen, HUD_ROWS);
}

for (const build of BUILDS) {
  test(`${build.name}: the combo counter and the NEW BEST banner share the HUD row`, () => {
    const row = stageBoth(build, 80, 24, 3);
    assert.ok(row.startsWith('  COMBO x3'), `the counter should open the row, saw ${JSON.stringify(row)}`);
    assert.ok(row.includes(BANNER), `and the banner should be whole, saw ${JSON.stringify(row)}`);
  });

  test(`${build.name}: neither overwrites the other at any supported width`, () => {
    for (let width = 60; width <= 120; width += 1) {
      for (const combo of [2, 12, 99]) {
        const row = stageBoth(build, width, 24, combo);
        const counter = COUNTER.exec(row);
        assert.ok(counter, `${width} columns, x${combo}: no counter, saw ${JSON.stringify(row)}`);
        const at = row.indexOf(BANNER);
        assert.ok(at >= 0, `${width} columns, x${combo}: no banner, saw ${JSON.stringify(row)}`);
        assert.ok(
          counter.index + counter[0].length <= at,
          `${width} columns, x${combo}: the counter runs into the banner, saw ${JSON.stringify(row)}`
        );
        assert.ok(
          at + BANNER.length <= width,
          `${width} columns, x${combo}: the banner runs off the buffer, saw ${JSON.stringify(row)}`
        );
      }
    }
  });

  test(`${build.name}: a lone kill leaves the banner the only thing on the row`, () => {
    const row = stageBoth(build, 80, 24, 1);
    assert.ok(!row.includes('COMBO'), `x1 is not a chain, saw ${JSON.stringify(row)}`);
    assert.ok(row.includes(BANNER), `the banner still stands alone, saw ${JSON.stringify(row)}`);
  });
}

test('both builds lay the shared row out identically', () => {
  for (const width of [60, 80, 100]) {
    const rows = BUILDS.map((build) => stageBoth(build, width, 24, 7));
    assert.equal(rows[1], rows[0], `${width} columns`);
  }
});
