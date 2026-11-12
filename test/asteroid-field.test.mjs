// test/asteroid-field.test.mjs — The asteroid field section: every
// ASTEROID_INTERVAL the tunnel walls come down for ASTEROID_TIME and the rocks
// arrive across the whole screen, then the tunnel returns.
//
// The section is one flag - `asteroidTime` - that five separate things read, and
// each of them can fail without the others: the clock that opens and closes it,
// the rocks it brings in and takes away again, the walls that stand down, the
// corridor a tracer is clipped to, and the banner that says why the tunnel is
// gone. They are checked one at a time in that order.
//
// Two of them are checked for what they do *not* do, which is where the cost of
// this feature actually sits. The walls standing down must not put a fifth glyph
// on the wall columns, or the four-glyph set every figure in index.html is
// counted over stops being what the walls are drawn from. And the section's own
// rocks must not reach the run's own field, or a section leaves the difficulty
// curve permanently steeper than it found it.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, rowText, FRAME } from './helpers.mjs';
// The section sequence itself lives in the shared harness, because
// test/probes/section-jolt.mjs walks thousands of seeded worlds of it to report
// how often the two seeds pinned below are the draw a run actually gets. A
// sequence written out in both places is a rate reported about a sequence the
// suite is not checking.
import {
  GRIDS, HUD_ROWS, FOOTER_ROWS, emptyRun, armSection, closeSection, clearTunnel,
  renderFrame, shakeShift, wallGlyphs, openAndClose,
  QUIET_SECTION_SEED, JOLTED_SECTION_SEED,
} from './engagement.mjs';

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

/** The band the run's own obstacles are held in, from `placeObstacle`. */
const OWN_X = 4.5;
const OWN_Y_LOW = 0.5;
const OWN_Y_HIGH = 4.5;

/** The tunnel radius a run opens with, which the ship's reach is measured off. */
const TUNNEL_RADIUS = 8;

/** One frame of a live run, through the same entry point a shell calls. */
const step = (game, dt = FRAME) => game.update(dt, {}, {});

/** One obstacle of the run's own field, at a depth. */
const ownRock = (z) => ({ x: 0, y: 1, z, rot: 0, rotSpeed: 0, scale: 1, field: false });

/** One rock of a section's field, at a depth. */
const fieldRock = (z) => ({ x: 0, y: 1, z, rot: 0, rotSpeed: 0, scale: 1, field: true });

/** The centre row of the HUD, where every banner competes for the line. */
const bannerRow = (screen) => rowText(screen, HUD_ROWS);

// ----- The clock -----

for (const build of BUILDS) {
  test(`${build.name}: a run opens with the tunnel up and nothing counted toward a section`, () => {
    const s = emptyRun(build).state;
    assert.equal(s.asteroidTime, 0, 'no section is open');
    assert.equal(s.asteroidTimer, 0, 'and none is part way counted');
  });

  test(`${build.name}: crossing the interval opens a section`, () => {
    const game = emptyRun(build);
    armSection(build, game);
    step(game);

    const s = game.state;
    assert.equal(s.asteroidTime, build.ASTEROID_TIME, 'the section runs its full time');
    assert.equal(s.asteroidTimer, 0, 'and the interval starts over');
  });

  test(`${build.name}: short of the interval nothing opens`, () => {
    const game = emptyRun(build);
    const armed = build.ASTEROID_INTERVAL - FRAME * 4;
    game.state.asteroidTimer = armed;
    step(game);
    assert.equal(game.state.asteroidTime, 0);
    assert.ok(game.state.asteroidTimer > armed, 'and the timer still advanced');
  });

  test(`${build.name}: the interval counts play, not the run's clock`, () => {
    // The timer accumulates the dt the run was stepped, so a gameTime jump - a
    // test winding the clock, a shell handed one enormous frame - cannot open a
    // section the run has not actually flown to. This is the whole reason it is
    // not read off gameTime the way updateWarpLevel is.
    const game = emptyRun(build);
    game.state.gameTime = build.ASTEROID_INTERVAL * 4;
    step(game);
    assert.equal(game.state.asteroidTime, 0, 'no section off a clock jump');
    assert.ok(game.state.asteroidTimer < FRAME * 2, 'only the frame that was stepped counted');
  });

  test(`${build.name}: an open section holds the interval still`, () => {
    const game = emptyRun(build);
    armSection(build, game);
    step(game);

    const opened = game.state.asteroidTime;
    step(game);
    assert.ok(game.state.asteroidTime < opened, 'the section clock runs down');
    assert.equal(game.state.asteroidTimer, 0, 'and the interval does not run while it is open');
  });

  test(`${build.name}: the section closes when its time is up`, () => {
    const game = emptyRun(build);
    armSection(build, game);
    step(game);
    closeSection(game);
    step(game);

    assert.equal(game.state.asteroidTime, 0, 'the section is over');
    // The frame that closed a section spent its dt on the section, so the
    // interval starts from the frame after rather than being credited twice.
    assert.equal(game.state.asteroidTimer, 0, 'and the interval has not been paid that frame');
    step(game);
    assert.ok(game.state.asteroidTimer > 0, 'it counts again from the next one');
  });

  test(`${build.name}: a warp transition holds a section off rather than skipping it`, () => {
    // Both announce themselves on the one HUD row, so they are not allowed to
    // coincide at the opening. The timer is left where it is while the flash
    // decays, which is what makes this a delay and not a cancellation.
    const game = emptyRun(build);
    armSection(build, game);
    game.state.warpFlash = build.WARP_FLASH_TIME;
    step(game);

    const s = game.state;
    assert.equal(s.asteroidTime, 0, 'held while the flash is live');
    assert.ok(s.asteroidTimer >= build.ASTEROID_INTERVAL, 'and the interval is still owed');

    s.warpFlash = 0;
    step(game);
    assert.equal(s.asteroidTime, build.ASTEROID_TIME, 'it opens the frame after the flash clears');
  });

  test(`${build.name}: no debug scenario opens a section`, () => {
    // Each scenario is a fixed field laid out to be counted, and taking the
    // walls away for fifteen seconds of it changes what is being counted.
    for (const mode of build.DEBUG_MODES) {
      const game = new build.Game();
      game.startGame(mode);
      game.state.screenWidth = 80;
      game.state.screenHeight = 24;
      const armed = build.ASTEROID_INTERVAL - FRAME / 2;
      game.state.asteroidTimer = armed;
      step(game);
      assert.equal(game.state.asteroidTime, 0, `${mode} stayed in its tunnel`);
      // Unmoved rather than zero: the test armed it, and a scenario leaves the
      // whole mechanism alone instead of resetting it. A normal run after one
      // calls startGame, which is what clears it.
      assert.equal(game.state.asteroidTimer, armed, `${mode} counted nothing toward one`);
    }
  });

  test(`${build.name}: a run started over is not part way into a section`, () => {
    const game = emptyRun(build);
    armSection(build, game);
    step(game);
    assert.ok(game.state.asteroidTime > 0, 'a section is open to be left behind');

    game.startGame();
    assert.equal(game.state.asteroidTime, 0);
    assert.equal(game.state.asteroidTimer, 0);
  });
}

// ----- The rocks -----

for (const build of BUILDS) {
  test(`${build.name}: a section brings its rocks in and takes them out again`, () => {
    const game = emptyRun(build);
    const s = game.state;
    for (let i = 0; i < 60; i++) s.obstacles.push(ownRock(-i * 14 - 30));
    const own = s.obstacles.slice();

    armSection(build, game);
    step(game);

    assert.equal(
      s.obstacles.length, own.length + build.ASTEROID_COUNT,
      "the section is added to the run's own field rather than replacing it"
    );
    assert.equal(
      s.obstacles.filter((o) => o.field).length, build.ASTEROID_COUNT,
      "and every rock it brought in is flagged as the section's"
    );

    closeSection(game);
    step(game);

    assert.equal(s.obstacles.filter((o) => o.field).length, 0, "the section's rocks are gone");
    assert.equal(s.obstacles.length, own.length, "and the run's own field is the size it was");
    assert.deepEqual(
      s.obstacles, own,
      'with the same obstacles in it, in the same order'
    );
  });

  test(`${build.name}: the section's rocks reach the band the ship can reach`, () => {
    // Walked over the placement rather than over one draw: a single rock landing
    // inside four and a half units proves nothing, and a single one landing
    // outside it could be the only one that ever does.
    const reach = TUNNEL_RADIUS - build.SHIP_MARGIN;
    const game = emptyRun(build);
    build.seedRng(20261014);
    try {
      let past = 0;
      let low = 0;
      for (let i = 0; i < 2000; i++) {
        const rock = fieldRock(-40);
        game.placeObstacle(rock);
        assert.ok(
          Math.abs(rock.x) <= reach, `a rock at x ${rock.x} is outside the ship's own reach`
        );
        assert.ok(
          rock.y >= 0 && rock.y <= reach, `a rock at y ${rock.y} is outside the ship's own reach`
        );
        if (Math.abs(rock.x) > OWN_X) past++;
        if (rock.y < OWN_Y_LOW) low++;
      }
      assert.ok(past > 0, 'and some of them are out past the corridor the walls enclose');
      assert.ok(low > 0, "and some come in under the floor the run's own field sits on");
    } finally {
      build.seedRng(null);
    }
  });

  test(`${build.name}: the run's own field stays in the band it is placed in`, () => {
    // This pins the world-space band, which is what placeObstacle decides: x
    // inside four and a half units, y between a half and four and a half. It is
    // deliberately not a claim about the drawn span - of this band's points that
    // draw into the play area, drawBullets measures 6.8% landing in a column
    // outside their own row's tunnelSpan - and the name used to say "corridor",
    // which read as though the span were what the assertions below walked. The
    // messages they fail with name the placement band and the bound broken, for
    // the same reason the case name does. A section is the exception to this
    // band, and the exception has to stay attached to the flag.
    const game = emptyRun(build);
    build.seedRng(20261014);
    try {
      for (let i = 0; i < 2000; i++) {
        const rock = ownRock(-40);
        game.placeObstacle(rock);
        assert.ok(
          Math.abs(rock.x) <= OWN_X,
          `an obstacle at x ${rock.x} left the placement band, which holds x inside ${OWN_X}`
        );
        assert.ok(
          rock.y >= OWN_Y_LOW && rock.y <= OWN_Y_HIGH,
          `an obstacle at y ${rock.y} left the placement band, which holds y between`
          + ` ${OWN_Y_LOW} and ${OWN_Y_HIGH}`
        );
      }
    } finally {
      build.seedRng(null);
    }
  });

  test(`${build.name}: a section's rock recycles as a section's rock`, () => {
    const game = emptyRun(build);
    const s = game.state;
    armSection(build, game);
    step(game);

    const rock = s.obstacles.find((o) => o.field);
    assert.ok(rock, 'a section opened with rocks in it');
    rock.z = 11;
    step(game);

    assert.ok(rock.z < -100, 'it went back down the tunnel rather than being dropped');
    assert.equal(rock.field, true, "and it is still the section's");
    assert.ok(s.obstacles.includes(rock), 'and still in the field');
  });

  test(`${build.name}: the minute's ten percent is taken off the run's own field`, () => {
    // A minute boundary inside a section would otherwise grow the run's own
    // field by a tenth of the section as well. The section's rocks go when it
    // closes; obstacles grown off the back of them are ordinary ones and would
    // not, so one unlucky boundary would step the curve by seven rather than one.
    const game = emptyRun(build);
    const s = game.state;
    for (let i = 0; i < 60; i++) s.obstacles.push(ownRock(-i * 14 - 30));

    s.asteroidTime = build.ASTEROID_TIME;
    for (let i = 0; i < build.ASTEROID_COUNT; i++) s.obstacles.push(fieldRock(-40));
    s.gameTime = 60 - FRAME / 2;
    s.lastObstacleIncreaseMinute = 0;
    step(game);

    const own = s.obstacles.filter((o) => !o.field).length;
    assert.equal(own, 66, 'six obstacles for sixty, not thirteen for a hundred and thirty');
    assert.equal(s.lastObstacleIncreaseMinute, 1, 'and the minute was counted');
  });
}

// ----- The walls -----

for (const build of BUILDS) {
  test(`${build.name}: an open section draws no walls at all`, () => {
    const game = emptyRun(build);
    const before = wallGlyphs(build, renderFrame(build, game));
    assert.ok(before.size > 0, 'the tunnel is drawn to begin with');

    build.seedRng(QUIET_SECTION_SEED);
    try {
      armSection(build, game);
      step(game);
    } finally {
      build.seedRng(null);
    }
    clearTunnel(game);

    const during = wallGlyphs(build, renderFrame(build, game), shakeShift(build, game.state));
    assert.deepEqual(
      [...during], [],
      'drawTunnel left ' + JSON.stringify([...during]) + ' on the wall columns during a section.'
      + ' A section is the walls being absent, not the walls being different: a thinner wall, or'
      + ' the ring ends without the walls under them, would put a fifth glyph on the columns'
      + ' test/warp.test.mjs counts the four-glyph ramp over'
    );
  });

  test(`${build.name}: the walls come back with the tunnel`, () => {
    const seen = openAndClose(build, GRIDS[0], { seed: QUIET_SECTION_SEED });

    assert.equal(seen.shake, 0, 'this seed is the one whose section hits nothing');
    assert.deepEqual(
      [...seen.atSpan].sort(), [...seen.drawn].sort(),
      'the tunnel is drawn from what it was drawn from before the section'
    );
  });

  test(`${build.name}: the walls come back with the tunnel through a jolt`, () => {
    // The case above renders a section that hits nothing, which is all but four
    // runs in a thousand of them at this grid. This is one of the four, and
    // `npm run probe -- section-jolt` is what counts them: over seeds 1 to
    // 60,000 of this sequence, 254 worlds put a rock into the ship at 80x24 -
    // 0.42% - and at every one of them the terminal build read the walls back
    // wrong at the bare span while the browser build read them back right. None
    // shook without misreading, and none misread without shaking.
    //
    // Two things that walk says which the 60,000 unseeded runs this comment
    // used to quote could not. Both builds shake on the same worlds, 254 of
    // them each, so the figures that used to differ by build - 237 and 258 -
    // were two unseeded draws rather than two behaviours. And the rate belongs
    // to a grid, because the collision test is a bounding-box overlap on the
    // character grid: the same walk gives 0.83% at 60x20 and 0.04% at 205x50.
    //
    // So the jolt is the whole of the difference, and the difference is between
    // the two renders rather than between the two sections: both builds' state
    // shakes here, and only the terminal build's renderGame moves the grid under
    // it. At this seed the terminal build answers the bare span with the two
    // near bands alone, off the six it was drawn from, which is the report the
    // flake filed.
    const seen = openAndClose(build, GRIDS[0], { seed: JOLTED_SECTION_SEED });

    assert.ok(seen.shake > 0, 'a rock reached the ship, or this case is the one above again');
    assert.equal(
      seen.shift, build.shakeColumns ? 1 : 0,
      'the build that jolts its grid jolts it a column here, and the one that jolts its canvas'
      + ' leaves the grid where it was drawn'
    );
    assert.deepEqual(
      [...seen.atSpan].sort(), [...seen.drawn].sort(),
      'the walls come back where the jolt leaves them, not where they were drawn. Read at the'
      + ' bare span instead, a jolted frame answers with the two near depth bands alone: the'
      + ' twelve rows whose wall is one character thick have moved off the column being read'
    );
    assert.equal(
      seen.bareWrong, Boolean(build.shakeColumns),
      'the bare span is the misreading on the build that jolts its grid and the same reading'
      + ' as the jolted span on the build that does not - which is the contingency'
      + ' test/probes/section-jolt.mjs reports the rate of'
    );
  });
}

// ----- The corridor -----

for (const build of BUILDS) {
  test(`${build.name}: a section opens the corridor to the whole grid`, () => {
    // The clip is there because a shot whose column has left the span is in a
    // column almost no target can occupy at that depth - drawBullets measures
    // the "almost". A section has no walls to cross and its rocks are placed
    // across the whole band, so the premise is gone and the clip goes with it.
    const game = emptyRun(build);
    const s = game.state;
    const gameTop = HUD_ROWS;
    const gameBottom = s.screenHeight - FOOTER_ROWS;
    const w = s.screenWidth;

    const outside = [];
    for (let row = gameTop; row < gameBottom; row++) {
      for (let col = 0; col < w; col++) {
        if (!build.tracerLit(col, row, gameTop, gameBottom, w)) outside.push([col, row]);
      }
    }
    assert.ok(outside.length > 0, 'there are columns the corridor does not reach');

    for (const [col, row] of outside) {
      assert.equal(
        build.tracerDrawn(s, col, row, gameTop, gameBottom, w), false,
        `column ${col} of row ${row} is outside the corridor with the tunnel up`
      );
    }

    armSection(build, game);
    step(game);

    for (const [col, row] of outside) {
      assert.equal(
        build.tracerDrawn(s, col, row, gameTop, gameBottom, w), true,
        `column ${col} of row ${row} should be drawn in while a section is open`
      );
    }
  });

  test(`${build.name}: the corridor still ends at the edge of the grid`, () => {
    // The grid bound is what the span used to supply. Without it a shot drifting
    // off the screen would go on registering against anything whose own block
    // the renderer had clipped to the edge.
    const game = emptyRun(build);
    const s = game.state;
    const gameTop = HUD_ROWS;
    const gameBottom = s.screenHeight - FOOTER_ROWS;
    const w = s.screenWidth;

    armSection(build, game);
    step(game);

    for (const col of [-1, -20, w, w + 20]) {
      assert.equal(
        build.tracerDrawn(s, col, gameTop + 1, gameTop, gameBottom, w), false,
        `column ${col} is off the grid`
      );
    }
  });

  test(`${build.name}: the corridor closes with the section`, () => {
    const game = emptyRun(build);
    const s = game.state;
    const gameTop = HUD_ROWS;
    const gameBottom = s.screenHeight - FOOTER_ROWS;
    const w = s.screenWidth;

    armSection(build, game);
    step(game);
    closeSection(game);
    step(game);

    for (let row = gameTop; row < gameBottom; row++) {
      for (let col = 0; col < w; col++) {
        assert.equal(
          build.tracerDrawn(s, col, row, gameTop, gameBottom, w),
          build.tracerLit(col, row, gameTop, gameBottom, w),
          `column ${col} of row ${row} after the section`
        );
      }
    }
  });
}

// ----- The banner -----

for (const build of BUILDS) {
  test(`${build.name}: the banner says why the tunnel is gone, for the whole section`, () => {
    const game = emptyRun(build);
    assert.ok(
      !bannerRow(renderFrame(build, game)).includes('ASTEROID FIELD'),
      'nothing says it before a section'
    );

    armSection(build, game);
    step(game);
    clearTunnel(game);

    // Walked across the blink rather than read once: the colour alternates on
    // uiTime and the line itself must not.
    for (const uiTime of [0, 0.1, 0.3, 0.52, 0.8, 1.4]) {
      game.state.uiTime = uiTime;
      assert.ok(
        bannerRow(renderFrame(build, game)).includes('>> ASTEROID FIELD <<'),
        `the banner is up at uiTime ${uiTime}`
      );
    }

    closeSection(game);
    step(game);
    assert.ok(
      !bannerRow(renderFrame(build, game)).includes('ASTEROID FIELD'),
      'and down again once the tunnel is back'
    );
  });

  test(`${build.name}: a warp transition inside a section wins the row`, () => {
    // They cannot coincide at the opening - a section is held off while a flash
    // is live - but a section opened just under its own length before an
    // interval crossing is still running when the next flash arrives. The flash
    // is two seconds of the fifteen and is the newer news.
    const game = emptyRun(build);
    armSection(build, game);
    step(game);
    clearTunnel(game);
    game.state.warpFlash = build.WARP_FLASH_TIME;
    game.state.warpLevel = 3;

    const row = bannerRow(renderFrame(build, game));
    assert.ok(row.includes('WARP LEVEL 3'), 'the warp banner is the one drawn');
    assert.ok(!row.includes('ASTEROID FIELD'), 'and it covers the section banner');
    assert.ok(game.state.asteroidTime > 0, 'while the section itself is still open');
  });

  test(`${build.name}: a debug run keeps the label it already owns`, () => {
    const game = new build.Game();
    game.startGame('chaos');
    const s = game.state;
    s.screenWidth = 80;
    s.screenHeight = 24;
    clearTunnel(game);
    // Set directly: a debug run never opens a section of its own, and the
    // question here is what the HUD does if one somehow is open.
    s.asteroidTime = build.ASTEROID_TIME;

    assert.ok(
      !bannerRow(renderFrame(build, game)).includes('ASTEROID FIELD'),
      'the banner is held back rather than drawn over the scenario label'
    );
  });
}
