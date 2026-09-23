// test/warp.test.mjs — The warp transition: the run's difficulty steps every
// WARP_INTERVAL seconds, and that crossing is announced rather than left to be
// noticed from the field thickening a few seconds later.
//
// The effect is three things at once and each is checked on its own, because
// each can fail without the others: the counter that steps, the walls that
// shift colour, the banner that names the level, and the speed lines that
// thicken down both margins.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, rowText, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const terminal = {
  name: 'terminal',
  ...require(join(REPO_ROOT, 'out', 'game.js')),
  ...require(join(REPO_ROOT, 'out', 'screen.js')),
  ...require(join(REPO_ROOT, 'out', 'render.js')),
  ...require(join(REPO_ROOT, 'out', 'types.js')),
};
const browser = { name: 'browser', ...loadBrowserEngine(fakeStorage()) };

const BUILDS = [terminal, browser];

const HUD_ROWS = 3;
const FOOTER_ROWS = 2;
const BAR = '│';

/** Everything drawTunnel is allowed to leave on a wall column. */
const WALL_CHARS = new Set(['░', '▒', '▓', '█', '╣', '╠']);

/** The floor dot drawTunnel strings between the walls on a near ring row. */
const FLOOR_DOT = '·';

/**
 * The tunnel's own cells, keyed by where they are. Taken below the first row of
 * the play area, which the HUD banners write over, and away from the margin
 * columns the speed lines use.
 */
function wallCells(screen) {
  const out = [];
  for (let y = HUD_ROWS + 1; y < screen.height - FOOTER_ROWS; y++) {
    const row = rowText(screen, y);
    for (let x = 4; x < screen.width - 4; x++) {
      if (!WALL_CHARS.has(row[x])) continue;
      out.push({ at: `${x},${y}`, char: row[x], fg: screen.fg[y * screen.width + x] });
    }
  }
  return out;
}

/** A run with nothing in the tunnel, so only the effect under test draws. */
function quietRun(build, width = 80, height = 24) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = width;
  s.screenHeight = height;
  s.stars = [];
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  s.bullets = [];
  s.particles = [];
  return game;
}

// ----- The counter -----

for (const build of BUILDS) {
  test(`${build.name}: a run opens on warp level 1 with nothing flashing`, () => {
    const s = quietRun(build).state;
    assert.equal(s.warpLevel, 1);
    assert.equal(s.warpFlash, 0);
  });

  test(`${build.name}: crossing the interval steps the level and raises the flash`, () => {
    const game = quietRun(build);
    const s = game.state;

    // Parked a frame short of the boundary, so the next frame is the crossing
    // and nothing before it is.
    s.gameTime = build.WARP_INTERVAL - FRAME / 2;
    game.update(FRAME, {}, {});

    assert.equal(s.warpLevel, 2, 'the first crossing a run ever sees is level 2');
    assert.equal(s.warpFlash, build.WARP_FLASH_TIME, 'the flash opens at its full length');
  });

  test(`${build.name}: the level holds between crossings`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.gameTime = build.WARP_INTERVAL + 5;

    for (let i = 0; i < 30; i++) game.update(FRAME, {}, {});

    assert.equal(s.warpLevel, 2, 'one crossing, one step');
  });

  test(`${build.name}: each further interval steps it again`, () => {
    const game = quietRun(build);
    const s = game.state;

    for (const expected of [2, 3, 4]) {
      s.gameTime = build.WARP_INTERVAL * (expected - 1) - FRAME / 2;
      game.update(FRAME, {}, {});
      assert.equal(s.warpLevel, expected);
      assert.equal(s.warpFlash, build.WARP_FLASH_TIME);
    }
  });

  test(`${build.name}: the flash decays and the pause does not stop it`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.warpFlash = build.WARP_FLASH_TIME;
    s.paused = true;

    game.update(FRAME, {}, {});

    // It decays on the presentation clock the other banners use, so a flash
    // caught by a pause finishes rather than freezing on screen for as long as
    // the player leaves the game sitting there.
    assert.ok(s.warpFlash < build.WARP_FLASH_TIME);
    assert.ok(s.warpFlash > 0);
  });

  test(`${build.name}: a paused run does not cross an interval`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.gameTime = build.WARP_INTERVAL - FRAME / 2;
    s.paused = true;

    for (let i = 0; i < 10; i++) game.update(FRAME, {}, {});

    assert.equal(s.warpLevel, 1, 'the world clock is what crosses, and it is stopped');
  });
}

// ----- The walls -----

for (const build of BUILDS) {
  test(`${build.name}: no transition leaves every wall colour as it was`, () => {
    const state = { warpFlash: 0 };
    for (const color of Object.values(build.C)) {
      assert.equal(build.warpWallColor(color, state), color);
    }
  });

  test(`${build.name}: a transition shifts the whole wall ramp and nothing else`, () => {
    const state = { warpFlash: 1 };
    const walls = [build.C.DARK_BLUE, build.C.BLUE, build.C.BRIGHT_BLUE, build.C.CYAN, build.C.BRIGHT_CYAN];

    for (const color of walls) {
      assert.notEqual(build.warpWallColor(color, state), color, `wall colour ${color} should shift`);
    }
    // The ramp still runs from darkest to brightest after the shift, which is
    // what keeps the tunnel reading as depth rather than as a flat wash.
    const shifted = walls.map((c) => build.warpWallColor(c, state));
    assert.equal(new Set(shifted).size >= 4, true, 'the shifted ramp keeps its steps');

    for (const color of [build.C.RED, build.C.BRIGHT_GREEN, build.C.ORANGE, build.C.GRAY]) {
      assert.equal(build.warpWallColor(color, state), color, `colour ${color} is not a wall`);
    }
  });

  test(`${build.name}: the drawn tunnel is re-coloured and not redrawn`, () => {
    const game = quietRun(build);
    const s = game.state;
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, s);
    const before = wallCells(screen);

    s.warpFlash = 1;
    build.renderGame(screen, s);
    const after = wallCells(screen);

    // Read the wall cells alone. The banner takes the top row of the play area
    // and the speed lines take the two columns either side, and both of those
    // are the transition too - they are simply not what this is about.
    assert.deepEqual(after.map((c) => c.at), before.map((c) => c.at),
      'the walls should stand exactly where they stood');
    assert.deepEqual(after.map((c) => c.char), before.map((c) => c.char),
      'and be drawn with the same glyphs');
    assert.notDeepEqual(after.map((c) => c.fg), before.map((c) => c.fg),
      'in different colours');
  });
}

for (const build of BUILDS) {
  test(`${build.name}: the floor dots shift with the walls they run between`, () => {
    // They are drawn in a wall colour rather than a colour of their own, so a
    // transition that shifted the walls and left them alone would string a row
    // of blue dots between two magenta walls. The starfield and the particles
    // draw the same glyph, so the run is emptied of both first.
    const game = quietRun(build);
    const s = game.state;
    const screen = new build.ScreenBuffer(80, 24);

    const dotColors = () => {
      build.renderGame(screen, s);
      const out = new Set();
      for (let y = HUD_ROWS; y < screen.height - FOOTER_ROWS; y++) {
        const row = rowText(screen, y);
        for (let x = 0; x < screen.width; x++) {
          if (row[x] === FLOOR_DOT) out.add(screen.fg[y * screen.width + x]);
        }
      }
      return [...out];
    };

    const before = dotColors();
    assert.deepEqual(before, [build.C.DARK_BLUE], 'the dots are a wall colour to begin with');

    s.warpFlash = 1;
    assert.deepEqual(dotColors(), [build.warpWallColor(build.C.DARK_BLUE, s)],
      'and take that colour where the transition leaves it');
  });
}

// ----- The banner -----

for (const build of BUILDS) {
  test(`${build.name}: the banner names the level while the flash is live`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.warpLevel = 3;
    s.warpFlash = 1;
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, s);
    assert.match(rowText(screen, HUD_ROWS), />> WARP LEVEL 3 <</);
  });

  test(`${build.name}: no flash, no banner`, () => {
    const game = quietRun(build);
    game.state.warpLevel = 3;
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, game.state);
    assert.doesNotMatch(rowText(screen, HUD_ROWS), /WARP LEVEL/);
  });

  test(`${build.name}: the debug label keeps the row it already owns`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.debugMode = 'chaos';
    s.warpLevel = 2;
    s.warpFlash = 1;
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, s);
    const row = rowText(screen, HUD_ROWS);

    // A debug run carries its label for the whole run, so a banner blinking
    // over it for two seconds would take away the one thing that says which
    // scenario is being flown.
    assert.match(row, /DEBUG: CHAOS PROTOCOL/);
    assert.doesNotMatch(row, /WARP LEVEL/);
  });

  test(`${build.name}: the NEW BEST banner wins the row when the two coincide`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.warpLevel = 2;
    s.warpFlash = 1;
    s.newBestFlash = 1;
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, s);
    const row = rowText(screen, HUD_ROWS);

    assert.match(row, /\[ NEW BEST \]/, 'the rarer banner is the one to keep');
    assert.doesNotMatch(row, /WARP LEVEL 2/);
  });
}

// ----- The speed lines -----

/** Margin cells carrying a speed line, summed over a sweep of the world clock. */
function marginLines(build, game, screen, column) {
  const s = game.state;
  let lit = 0;
  for (let step = 0; step < 40; step++) {
    s.time = step * 0.05;
    build.renderGame(screen, s);
    for (let row = HUD_ROWS + 1; row < screen.height - FOOTER_ROWS; row++) {
      if (rowText(screen, row)[column] === BAR) lit++;
    }
  }
  return lit;
}

for (const build of BUILDS) {
  test(`${build.name}: a warp draws more speed lines than a boost does`, () => {
    const game = quietRun(build);
    const s = game.state;
    const screen = new build.ScreenBuffer(80, 24);

    s.boosting = true;
    const boosting = marginLines(build, game, screen, 1);

    s.boosting = false;
    s.warpFlash = 1;
    const warping = marginLines(build, game, screen, 1);

    assert.ok(boosting > 0, 'a boost draws lines at all');
    assert.ok(warping > boosting, `warp ${warping} should beat boost ${boosting}`);
  });

  test(`${build.name}: only a warp reaches the second column in`, () => {
    const game = quietRun(build);
    const s = game.state;
    const screen = new build.ScreenBuffer(80, 24);

    s.boosting = true;
    assert.equal(marginLines(build, game, screen, 2), 0, 'a boost stays on one column');

    s.boosting = false;
    s.warpFlash = 1;
    assert.ok(marginLines(build, game, screen, 2) > 0, 'a warp lays a second one beside it');
  });

  test(`${build.name}: a boost through a warp draws the warp's pattern`, () => {
    const game = quietRun(build);
    const s = game.state;
    const screen = new build.ScreenBuffer(80, 24);

    s.warpFlash = 1;
    s.boosting = false;
    const warpAlone = marginLines(build, game, screen, 1);

    s.boosting = true;
    const both = marginLines(build, game, screen, 1);

    assert.equal(both, warpAlone, 'the two do not stack');
  });

  test(`${build.name}: neither draws anything with the run level and unwarped`, () => {
    const game = quietRun(build);
    const screen = new build.ScreenBuffer(80, 24);
    assert.equal(marginLines(build, game, screen, 1), 0);
  });
}
