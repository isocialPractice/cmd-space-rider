// test/hud-row.test.mjs — The row under the shield bar is shared. The combo
// counter is left-aligned on it, and the debug label, the warp banner and the
// NEW BEST banner are centred on it, so none of the four may overwrite another.
//
// The counter against the debug label is covered where the chaining is tested,
// and the two centred banners against each other and against the label are
// covered in test/warp.test.mjs. This file covers the pairings only a normal
// run can produce, which is why they are easy to miss: NEW BEST fires once, on
// the first crossing of the stored best, and a chain has to already be running
// at that moment for the two to meet. Driving a real run until they coincided
// took over a minute of firing and never landed on its own.
//
// The counter against the warp banner is the same kind of pairing and the
// margin between them is arithmetic rather than a check: the counter tops out
// at COMBO x8, ten columns wide ending at column 9, and >> WARP LEVEL 2 << is
// eighteen columns centred, which starts at column 21 on the 60-column floor.
// Widen the banner or raise COMBO_MAX and the two meet, so both ends are walked
// here rather than left to hold by coincidence.
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
const WARP = />> WARP LEVEL \d+ <</;

/**
 * A normal run with an empty world, showing whichever tenants of the shared row
 * are asked for. The flags are set directly rather than flown to, for the
 * reason in the header: two of these coinciding is a once-a-run event.
 */
function stageRow(build, width, height, { combo = 0, newBest = 0, warp = 0, warpLevel = 2 } = {}) {
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
  s.newBestFlash = newBest;
  s.warpFlash = warp;
  s.warpLevel = warpLevel;
  const screen = new build.ScreenBuffer(width, height);
  build.renderGame(screen, s);
  return rowText(screen, HUD_ROWS);
}

/** The counter beside the NEW BEST banner, which is the pairing this file opened on. */
const stageBoth = (build, width, height, combo) =>
  stageRow(build, width, height, { combo, newBest: 1 });

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

  test(`${build.name}: the combo counter and the warp banner share the HUD row`, () => {
    const row = stageRow(build, 80, 24, { combo: 3, warp: 1 });
    assert.ok(row.startsWith('  COMBO x3'), `the counter should open the row, saw ${JSON.stringify(row)}`);
    assert.match(row, WARP, `and the banner should be whole, saw ${JSON.stringify(row)}`);
  });

  test(`${build.name}: the counter and the warp banner never overwrite each other`, () => {
    // Two warp levels, because the banner's width grows with the number and
    // the counter's with the chain: a one-digit level is the first a run ever
    // shows and a two-digit one is the widest the banner gets in practice.
    for (let width = 60; width <= 120; width += 1) {
      for (const combo of [2, 12, 99]) {
        for (const warpLevel of [2, 12]) {
          const row = stageRow(build, width, 24, { combo, warp: 1, warpLevel });
          const where = `${width} columns, x${combo}, warp ${warpLevel}`;
          const counter = COUNTER.exec(row);
          const banner = WARP.exec(row);
          assert.ok(counter, `${where}: no counter, saw ${JSON.stringify(row)}`);
          assert.ok(banner, `${where}: no banner, saw ${JSON.stringify(row)}`);
          assert.ok(
            counter.index + counter[0].length <= banner.index,
            `${where}: the counter runs into the banner, saw ${JSON.stringify(row)}`
          );
          assert.ok(
            banner.index + banner[0].length <= width,
            `${where}: the banner runs off the buffer, saw ${JSON.stringify(row)}`
          );
        }
      }
    }
  });

  test(`${build.name}: NEW BEST covers the warp banner and still clears the counter`, () => {
    // The renderer draws NEW BEST after the warp banner precisely so it wins,
    // and the counter has to survive whichever of the two is on top.
    const row = stageRow(build, 80, 24, { combo: 8, warp: 1, newBest: 1 });
    assert.ok(row.startsWith('  COMBO x8'), `the counter should open the row, saw ${JSON.stringify(row)}`);
    assert.ok(row.includes(BANNER), `NEW BEST is the one to keep, saw ${JSON.stringify(row)}`);
    assert.doesNotMatch(row, WARP, `and it covers the warp banner, saw ${JSON.stringify(row)}`);
  });
}

test('both builds lay the shared row out identically', () => {
  const STAGINGS = [
    { combo: 7, newBest: 1 },
    { combo: 7, warp: 1 },
    { combo: 7, warp: 1, newBest: 1 },
  ];
  for (const width of [60, 80, 100]) {
    for (const staging of STAGINGS) {
      const rows = BUILDS.map((build) => stageRow(build, width, 24, staging));
      assert.equal(rows[1], rows[0], `${width} columns, ${JSON.stringify(staging)}`);
    }
  }
});
