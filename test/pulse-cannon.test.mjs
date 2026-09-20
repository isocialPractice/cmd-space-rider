// test/pulse-cannon.test.mjs — Where the pulse cannon's shots go and what they
// register against.
//
// The screen is the whole of the player's aim: a target is one glyph in one
// column, the ship is another, and there is no reticle. So the checks here are
// written the way a player shoots - line the ship's column up with the
// target's, pull the trigger, see whether it counted - rather than by placing a
// bullet on top of an obstacle, which passes whatever the aiming does.
//
// The screen is now the whole of the hit test as well. A shot registers where
// its tracer is drawn on a target's block and nowhere else, so the two halves
// of this file are one question: what the renderer drew, and what the engine
// made of it.
//
// Every engagement is flown at three grids, because the hit test is not
// size-neutral and never was. Each of these checks used to run at 80x24 alone,
// and a browser window at the default font is nearer 205x50 - which is how the
// suite passed while a bolt drawn through a block killed nothing. The
// engagements themselves live in engagement.mjs, so the probes under
// test/probes/ fly the same flight these floors are taken from.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BUILDS, GRIDS, FRAME,
  AIMED_BANDS, VOLLEY_BAND, EYE_BANDS,
  HUD_ROWS, FOOTER_ROWS, WALL_CHARS,
  emptyRun, stageTarget, engage, sweep, sweepByEye, stagedShot, walk,
  watchEngagement, tracerCells, tracerCellsBothHalves,
  unitsPerCol, freeFlight, darkWalk, FRAME_RATES, FREE_SEEDS,
  FREE_FRAMES, FREE_RATE_FRAMES,
} from './engagement.mjs';

/**
 * The grid the tracer's drawing is checked at.
 *
 * Those checks are about the corridor the tunnel is drawn in, which is the same
 * shape at every size, and their figures - drawn frames, rows climbed - are
 * counted off one grid. The engagement checks below are the ones the grid moves,
 * and they run at all three.
 */
const DRAWN = GRIDS[0];
const W = DRAWN.w;
const H = DRAWN.h;

/** The ship heights the seen-versus-kill walk is flown at. */
const SEEN_HEIGHTS = [0, 1, 2.5, 4.5];
const SEEN_BANDS = [{ near: 20, far: 60 }, { near: 60, far: 140 }];
const SEEN_COUNT = 20;

/**
 * One walk of engagements watched cell by cell, kept for every check that reads
 * it. Each flight renders every frame twice - once with the volley out of the
 * way to find the block, once as the player saw it - so the walk is flown once
 * per build and grid and the three checks below share it.
 */
const seenWalks = new Map();
function seenWalk(build, grid) {
  const key = `${build.name}:${grid.name}`;
  if (seenWalks.has(key)) return seenWalks.get(key);

  const result = {
    flights: 0, kills: 0, drawnThroughAlive: 0, wide: 0, unlit: 0, hidden: 0,
    byGap: new Map(), gapMin: Infinity, gapMax: -Infinity,
  };
  for (const band of SEEN_BANDS) {
    for (const place of walk(SEEN_COUNT, band)) {
      for (const holdY of SEEN_HEIGHTS) {
        const seen = watchEngagement(build, grid, { ...place, holdY });
        if (seen.outcome !== 'hit' && seen.outcome !== 'miss') continue;
        result.flights++;
        const gap = Math.round(Math.abs(seen.targetY - holdY));
        const at = result.byGap.get(gap) ?? { kills: 0, flights: 0 };
        at.flights++;
        if (seen.outcome === 'hit') {
          result.kills++;
          at.kills++;
          if (seen.killContact === 'wide') result.wide++;
          if (seen.killContact === 'unlit') result.unlit++;
          if (seen.killContact === 'hidden') result.hidden++;
          if (seen.killGapZ !== null) {
            result.gapMin = Math.min(result.gapMin, seen.killGapZ);
            result.gapMax = Math.max(result.gapMax, seen.killGapZ);
          }
        } else if (seen.drawnThrough) {
          result.drawnThroughAlive++;
        }
        result.byGap.set(gap, at);
      }
    }
  }
  seenWalks.set(key, result);
  return result;
}

for (const build of BUILDS) {
  for (const grid of GRIDS) {
    const at = `${build.name} at ${grid.name}`;

    test(`${at}: a shot lined up by column lands, at every range`, () => {
      // Walked against the engine as committed for 0.3.3-alpha, this same sweep
      // landed 19/21, 26/58 and 3/58 at 80x24 - 90%, 45% and 5%. A shot held a
      // constant world x while the player aimed at a screen column, so the two
      // diverged further the longer the shot stayed in the air.
      for (const band of AIMED_BANDS) {
        const floor = band.floors[grid.name];
        const { hit, shots, rams } = sweep(build, grid, band);
        assert.ok(
          shots >= band.minShots,
          `${band.name}: only ${shots} of 60 engagements resolved, ${rams} were rams`
        );
        assert.ok(
          hit / shots >= floor,
          `${band.name} out: ${hit}/${shots} landed, wanted ${Math.round(floor * 100)}%`
        );
      }
    });

    test(`${at}: the volley a player actually fires almost never misses`, () => {
      // The volley's own spread covers the column creep a long shot meets, and
      // that spread scales with the grid as the creep does - 1.15 columns wide
      // at 80, 3.09 at 205 - so this is the one band that holds its figure at
      // every size. It is also the number a player experiences. It was 10/58
      // before the column fix and 50/56 at 205x50 before the slack was scaled.
      const floor = VOLLEY_BAND.floors[grid.name];
      const { hit, shots } = sweep(build, grid, VOLLEY_BAND);
      assert.ok(shots >= VOLLEY_BAND.minShots, `only ${shots} of 60 engagements resolved`);
      assert.ok(
        hit / shots >= floor,
        `long-range volley landed ${hit}/${shots}, wanted ${Math.round(floor * 100)}%`
      );
    });

    test(`${at}: a volley aimed at nothing but the screen still lands`, () => {
      // Every rate above reads the target's height out of the world to aim
      // with. This one reads the screen: the hull is found by its nose glyph,
      // the target by its red block, and the height is simply the middle of the
      // tunnel, which is the only standing guess the screen supports.
      for (const band of EYE_BANDS) {
        const floor = band.floors[grid.name];
        const { hit, shots, holdRow } = sweepByEye(build, grid, band);
        assert.ok(shots >= band.minShots, `${band.name}: only ${shots} engagements resolved`);
        assert.ok(
          hit / shots >= floor,
          `${band.name} out, flown by eye from hull row ${holdRow}: ` +
          `${hit}/${shots} landed, wanted ${Math.round(floor * 100)}%`
        );
      }
    });

    test(`${at}: a tracer drawn through a block always destroys it`, () => {
      // The complaint this whole rule answers, read off the rendered grid
      // rather than off the engine's own arithmetic. A screen capture of a run
      // showed a bolt climbing through a red block, overwriting its cells, with
      // no explosion; the hit test was comparing shot and target on one
      // projected plane, and two things level in depth are rows apart on screen
      // whenever they differ in height.
      //
      // Read with the volley out of the way, because drawBullets runs after
      // drawEntitiesFar and a tracer standing on the block replaces the very
      // cell this is about.
      const seen = seenWalk(build, grid);
      assert.equal(
        seen.drawnThroughAlive, 0,
        `${seen.drawnThroughAlive} of ${seen.flights} flights drew a tracer on the ` +
        'block and left it standing'
      );
      assert.ok(
        seen.kills / seen.flights >= 0.9,
        `${seen.kills}/${seen.flights} of the watched engagements landed, wanted 90%`
      );
    });

    test(`${at}: nothing is destroyed by a tracer that never reached it`, () => {
      // The other half, and what stops the column slack drifting upward: a kill
      // has to have its tracer on the block, or within the grid's column slack
      // beside it, on the kill frame or the one before.
      //
      // The two ways of failing that are counted apart, because they are
      // different faults and used to share one bucket. `unlit` is a kill with
      // no tracer drawn anywhere: the corridor clip took the bolt off the
      // screen and the hit test registered from it anyway, which is nil now
      // that `contacts` reads the same clip `drawBullets` draws by, and is the
      // regression this pins.
      //
      // `wide` is a tracer the player watched go past a column or more off the
      // block. A few per cent of those are the sweep inside the frame doing its
      // job rather than a kill nobody earned: a frame carries a shot a row or
      // so up the screen, so two cells can meet on a step the sweep tests and
      // neither end of the frame draws. Measured across all three grids and
      // both builds it is 8 kills in 860, and at most 3 in 150 at one grid.
      const seen = seenWalk(build, grid);
      assert.equal(
        seen.unlit, 0,
        `${seen.unlit} of ${seen.kills} kills landed with no tracer drawn at all`
      );
      assert.ok(
        seen.wide / seen.kills <= 0.05,
        `${seen.wide} of ${seen.kills} kills had a tracer drawn wide of the block`
      );
      // A kill lands well off the target's own depth, which is what a screen
      // rule means: the two are drawn at their own depths and meet where the
      // projection puts them, not where a plane through both would.
      assert.ok(
        seen.gapMax - seen.gapMin > 20,
        `every kill landed within ${(seen.gapMax - seen.gapMin).toFixed(0)} units of one depth`
      );
    });

    test(`${at}: height is not an aiming axis`, () => {
      // What the rule above retires. Height used to decide a kill: the hit test
      // compared rows on one plane with a row of slack either side, so a shot
      // two rows off the target's height never landed and the repository
      // carried a table of how fast it fell away. Under the contact rule a
      // tracer climbs its whole column and meets whatever is drawn in it, so
      // the kill rate is flat in the gap between the ship's height and the
      // target's - measured at 80x24, 17/17 level with the target, 46/46 a unit
      // off, 36/36 two off, 26/26 three off and 15/16 four off.
      const seen = seenWalk(build, grid);
      const buckets = [...seen.byGap.entries()]
        .filter(([, at2]) => at2.flights >= 10)
        .sort((a, b) => a[0] - b[0]);
      assert.ok(buckets.length >= 3, `only ${buckets.length} height gaps were walked`);
      for (const [gap, at2] of buckets) {
        // Flat to three units off, and still most of the way there at four,
        // which is a target on the floor of the tunnel shot at from the roof
        // and back again: 15/16 at 80x24, 14/14 at 60x20, 11/14 at 205x50.
        const floor = gap <= 2 ? 0.95 : 0.75;
        assert.ok(
          at2.kills / at2.flights >= floor,
          `${gap} world units off the target's height, ${at2.kills}/${at2.flights} landed, ` +
          `wanted ${Math.round(floor * 100)}%`
        );
      }

      // And the same thing from the aiming side: a volley aimed four world
      // units off - a target at the floor of the tunnel shot at from the roof -
      // lands as well as one aimed dead on. That is the figure the old ceiling
      // pinned at zero.
      for (const dy of [0.1, 2, 4]) {
        const { hit, shots } = sweep(build, grid, { near: 80, far: 140, dy });
        assert.ok(shots >= 25, `dy ${dy}: only ${shots} engagements resolved`);
        assert.ok(
          hit / shots >= 0.9,
          `aimed ${dy} of a world unit off, ${hit}/${shots} landed, wanted 90%`
        );
      }
    });

    test(`${at}: a shot resolves the same way at any frame rate`, () => {
      // The hit test sweeps inside the frame rather than testing its two ends,
      // so a slow frame cannot step a tracer over a block. Driven from a staged
      // shot rather than from the ship, because a slow frame steers in longer
      // strides too: an engagement flown at a sixth of a second a frame is a
      // different engagement, which is a fair question about the game and the
      // wrong one about the hit test. The aim is taken once, at 1/60, and the
      // same shot is flown at each rate.
      const RATES = FRAME_RATES;
      const changed = [];
      for (const place of walk(40, { near: 20, far: 140 })) {
        for (const aimedAt of ['target', 'clear']) {
          const verdicts = RATES.map(
            (dt) => stagedShot(build, grid, { ...place, targetZ: place.z, dt, aimedAt })
          );
          if (verdicts.some((v) => v !== 'hit' && v !== 'miss')) continue;
          if (new Set(verdicts).size > 1) {
            changed.push(
              `x ${place.x.toFixed(2)} y ${place.y.toFixed(2)} z ${place.z.toFixed(0)} ` +
              `aimed at the ${aimedAt}: ${verdicts.join('/')}`
            );
          }
        }
      }
      assert.deepEqual(changed, [], `shots that changed verdict with the frame rate:\n${changed.join('\n')}`);
    });

    test(`${at}: a shot wide of the slack does not register`, () => {
      // The slack is what makes an honest shot count; it is not a licence to
      // widen the target. A shot placed a column past it has to miss, or the
      // constant can drift upward unnoticed.
      const game = emptyRun(build, grid);
      const s = game.state;
      const z = -60;
      stageTarget(s, 0, 2, z);

      const scale = game.projScale(z);
      const cell = unitsPerCol(s, scale);
      const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);
      const clear = (half + build.shotSlackCols(grid.w) + 1) * cell;

      s.bullets = [{ x: clear, y: 2, z, life: 2 }];
      game.update(FRAME, {}, {});
      assert.equal(s.obstacles.length, 1, 'the target should still be there');
      assert.ok(s.obstacles[0].z > z - 100, 'and should not have been recycled by a kill');
    });

    test(`${at}: a shot inside the slack does register`, () => {
      const game = emptyRun(build, grid);
      const s = game.state;
      const z = -60;
      stageTarget(s, 0, 2, z);

      const scale = game.projScale(z);
      const cell = unitsPerCol(s, scale);
      const half = Math.floor(Math.max(1, Math.floor(scale * 2.5)) / 2);

      s.bullets = [{ x: (half + build.shotSlackCols(grid.w) - 0.5) * cell, y: 2, z, life: 2 }];
      game.update(FRAME, {}, {});
      assert.ok(s.obstacles[0].z < z - 100, 'the shot should have landed');
    });
  }

  test(`${build.name}: a shot holds the screen column it was fired down`, () => {
    // This is the aiming fix itself. A shot on a constant world x walks toward
    // the vanishing point instead, which is what put it wide of the target.
    const game = emptyRun(build, DRAWN);
    const s = game.state;
    s.shipX = 4;
    s.shipY = 2;
    s.obstacles = [];

    game.update(FRAME, {}, { SPACE: true });
    assert.equal(s.bullets.length, 3, 'the trigger should raise a three-shot volley');

    const columns = new Set();
    for (let frame = 0; frame < 40 && s.bullets.length; frame++) {
      const b = s.bullets.find((each) => each.x > 3);
      if (!b) break;
      columns.add(game.toScreen(b.x, b.y, b.z).col);
      game.update(FRAME, {}, {});
    }
    assert.equal(
      columns.size, 1,
      `the shot wandered across columns ${[...columns].join(', ')}`
    );
  });

  // What the renderer actually put on the screen for a volley fired from a
  // given column: how many frames carried a tracer, which cells it used, and
  // how far up the screen it climbed. The checks above ask toScreen where the
  // shot is; this reads the grid, which is all the player has to aim by, and
  // drawBullets could round, clip or drop a column without the state saying so.
  const flyTracer = (shipX) => {
    const game = emptyRun(build, DRAWN);
    const s = game.state;
    s.shipX = shipX;
    s.shipY = 0;

    const screen = new build.ScreenBuffer(W, H);
    game.update(FRAME, {}, { SPACE: true });
    build.renderGame(screen, s);

    const columns = new Set();
    const cells = [];
    let drawn = 0;
    let live = 0;
    let lastDrawnFrame = -1;
    let firstRow = null;
    let lastRow = null;

    for (let frame = 0; frame < 70 && s.bullets.length; frame++) {
      live++;
      const frameCells = tracerCells(build, screen);
      if (frameCells.length) {
        drawn++;
        lastDrawnFrame = frame;
        for (const cell of frameCells) {
          columns.add(cell.x);
          cells.push(cell);
        }
        lastRow = Math.min(...frameCells.map((cell) => cell.y));
        if (firstRow === null) firstRow = lastRow;
      }
      game.update(FRAME, {}, {});
      build.renderGame(screen, s);
    }

    return { columns, cells, drawn, live, lastDrawnFrame, firstRow, lastRow };
  };

  /** Both halves of the tracer on every frame of one flight, in order. */
  const tracerFrames = (shipX) => {
    const game = emptyRun(build, DRAWN);
    const s = game.state;
    s.shipX = shipX;
    s.shipY = 0;

    const screen = new build.ScreenBuffer(W, H);
    game.update(FRAME, {}, { SPACE: true });
    build.renderGame(screen, s);

    const frames = [];
    for (let i = 0; i < 70 && s.bullets.length; i++) {
      frames.push(tracerCellsBothHalves(build, screen));
      game.update(FRAME, {}, {});
      build.renderGame(screen, s);
    }
    return frames;
  };

  // A shot holds its firing column while the drawn tunnel converges on the
  // vanishing point, so how much of a flight is drawn depends on where it was
  // fired from: down the middle it is drawn the whole way, and the nearer the
  // wall the sooner it crosses out of the corridor and stops being drawn. 4.5
  // is the outermost column a target spawns in, 6.5 the wall the ship is held
  // at - a shot from there can reach nothing, and now says so.
  //
  // The two sides carry their own figures, because they are not mirrors. The
  // corridor is symmetric about floor(w / 2) while the projection floors a
  // continuous column, so a shot at -x sits a column further out than one at
  // +x and reaches the wall that much sooner: 40 frames drawn against 46 from
  // 4.5, and 11 against 17 from the wall. drawBullets says why rounding that
  // away costs more than it buys.
  //
  // Every flight climbs, the left wall's least of all. Read off the grid at
  // 80x24, both builds alike, its 11 drawn frames carry topmost tracer rows of
  // 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18 - one row gained before the clip
  // takes it, against 2 rows over 17 frames from the right wall and 10 over 59
  // down the middle. So its floor is the climb itself with nothing to spare,
  // where the others keep a row or two in hand. A floor of 0 there is no floor
  // at all: firstRow - lastRow cannot go below zero, so a 0 passes a tracer
  // drawn on a single row, and passes one never drawn at all, where both ends
  // stay null and null - null is 0. Only minDrawn beside it would still fail.
  const TRACER_FLIGHTS = [
    { shipX: 0, minDrawn: 55, minClimb: 8 },
    { shipX: -4.5, minDrawn: 36, minClimb: 4 },
    { shipX: 4.5, minDrawn: 42, minClimb: 5 },
    { shipX: -6.5, minDrawn: 9, minClimb: 1 },
    { shipX: 6.5, minDrawn: 14, minClimb: 1 },
  ];

  test(`${build.name}: the tracer is drawn as one column inside the play area`, () => {
    // Fired from both walls as well as the centre, since the drift the column
    // fix removed was widest at the edges.
    for (const { shipX, minDrawn, minClimb } of TRACER_FLIGHTS) {
      const flight = flyTracer(shipX);

      for (const cell of flight.cells) {
        assert.ok(
          cell.y >= HUD_ROWS && cell.y < H - FOOTER_ROWS,
          `fired from ${shipX}, a tracer was drawn at row ${cell.y}, ` +
          `outside the play area's rows ${HUD_ROWS} to ${H - FOOTER_ROWS - 1}`
        );
      }

      assert.ok(
        flight.drawn >= minDrawn,
        `fired from ${shipX}, the volley was drawn on only ${flight.drawn} frames`
      );
      // Three bullets, so three columns at the most, and fewer while the ship's
      // own glyphs still cover the muzzle. The same volley on a constant world
      // x walked through sixteen columns over this flight.
      assert.ok(
        flight.columns.size <= 3,
        `fired from ${shipX}, the volley was drawn across columns ` +
        `${[...flight.columns].sort((a, b) => a - b).join(', ')}`
      );
      assert.ok(
        flight.firstRow - flight.lastRow >= minClimb,
        `fired from ${shipX}, the tracer climbed only ` +
        `${flight.firstRow - flight.lastRow} rows`
      );
    }
  });

  test(`${build.name}: a tracer is never drawn on or past the tunnel wall`, () => {
    // Holding the firing column means a shot fired from near a wall crosses
    // that wall partway up, because the drawn tunnel converges and the shot
    // does not. Drawing it on past that left a cyan tracer climbing through
    // the black margin with the tunnel some distance to one side. It is also
    // where the shot stops being able to hit anything, since targets spawn no
    // further out than 4.5 and so sit inside this span at every depth.
    //
    // The bound is strict on both sides. tunnelSpan gives the columns the walls
    // are drawn on rather than the last columns of the corridor, so admitting
    // them put the tracer on the wall itself.
    for (const { shipX } of TRACER_FLIGHTS) {
      const flight = flyTracer(shipX);

      for (const cell of flight.cells) {
        const span = build.tunnelSpan(cell.y, HUD_ROWS, H - FOOTER_ROWS, W);
        assert.ok(
          cell.x > span.left && cell.x < span.right,
          `fired from ${shipX}, a tracer was drawn at column ${cell.x} on row ` +
          `${cell.y}, on or outside the tunnel walls at ${span.left} and ${span.right}`
        );
      }

      // Once dark it stays dark: the corridor only narrows as the shot climbs,
      // so a tracer coming back would mean the clip is reading the wrong row.
      assert.equal(
        flight.drawn, flight.lastDrawnFrame + 1,
        `fired from ${shipX}, the tracer went dark and came back`
      );
    }
  });

  test(`${build.name}: the tracer's dim upper half is clipped on its own row`, () => {
    // The checks above read the bright lower half, which is the glyph a player
    // aims by. The dim half is a row higher, where the corridor is narrower, so
    // it leaves the tunnel first and a clip that tested both halves against the
    // lower row would draw it in the margin with nothing above to say so.
    for (const { shipX } of TRACER_FLIGHTS) {
      const frames = tracerFrames(shipX);

      for (const [frame, cells] of frames.entries()) {
        for (const cell of cells.filter((c) => c.half === 'dim')) {
          const span = build.tunnelSpan(cell.y, HUD_ROWS, H - FOOTER_ROWS, W);
          assert.ok(
            cell.x > span.left && cell.x < span.right,
            `fired from ${shipX}, the dim half was drawn on frame ${frame} at column ` +
            `${cell.x} of row ${cell.y}, on or outside the walls at ${span.left} and ${span.right}`
          );
        }
      }

      // And neither half flickers: the corridor only narrows as a shot climbs.
      for (const half of ['bright', 'dim']) {
        const lit = frames.map((cells) => cells.some((c) => c.half === half));
        const first = lit.indexOf(true);
        if (first < 0) continue;
        assert.ok(
          lit.slice(first, lit.lastIndexOf(true) + 1).every(Boolean),
          `fired from ${shipX}, the ${half} half went dark and came back: ` +
          lit.map((on) => (on ? '#' : '.')).join('')
        );
      }
    }
  });

  test(`${build.name}: a tracer stays lit to the target it goes on to kill`, () => {
    // The clip is meant to fall outside the space targets occupy, so a shot
    // that lands has to be drawn the whole way there. A tracer that went dark
    // first and killed the target anyway would read as a miss that scored.
    //
    // Two of the three sit in the outermost column a target spawns in, where a
    // shot runs nearest the wall it is clipped against. A lone bullet is flown
    // rather than the volley, so the frames below belong to one shot, which
    // holds the placements inside the range a single shot is expected to land.
    // All three sit at 90 units, which is far enough that the flight is drawn
    // clear of the hull and near enough that a lone shot still lands from the
    // outermost column a target spawns in. drawShip runs after drawBullets, so
    // the first frame or two of a flight can be under the ship's own glyphs -
    // dark for a reason that has nothing to do with the clip, which is why the
    // run of lit frames is read from the first one that lit rather than from
    // the trigger.
    for (const [x, y, z] of [[0, 2, -90], [4.5, 0.5, -90], [-4.5, 3, -90]]) {
      const game = emptyRun(build, DRAWN);
      const screen = new build.ScreenBuffer(W, H);
      const lit = [];
      const outcome = engage(game, {
        x, y, z, volley: false,
        watch: () => {
          build.renderGame(screen, game.state);
          lit.push(tracerCells(build, screen).length > 0);
        },
      });

      assert.equal(outcome, 'hit', `the shot at ${x},${y},${z} resolved as ${outcome}`);
      // The killing shot is spent during the frame that resolves it, so the
      // frame before is the last one that can carry its tracer - and does.
      assert.ok(
        lit[lit.length - 2],
        `the shot at ${x},${y},${z} was dark on the frame before it killed: ` +
        lit.map((on) => (on ? '#' : '.')).join('')
      );
      const first = lit.indexOf(true);
      assert.ok(
        lit.slice(first, lit.length - 1).every(Boolean),
        `the shot at ${x},${y},${z} went dark on the way to the target: ` +
        lit.map((on) => (on ? '#' : '.')).join('')
      );
    }
  });

  test(`${build.name}: a tracer never eats the wall it is clipped against`, () => {
    // The checks above ask where the tracer went; this asks what the wall looks
    // like while it goes there, which is the half a player actually sees. The
    // wall is one cell thick over the top two thirds of the screen and
    // drawBullets runs after drawTunnel, so a tracer allowed onto a wall column
    // did not ride the wall - it replaced it, and the hole climbed with the
    // shot. Fired from -4.5, frame 28 used to leave row 13 reading two bars
    // where the rows either side of it carried blocks.
    for (const { shipX } of TRACER_FLIGHTS) {
      const game = emptyRun(build, DRAWN);
      const s = game.state;
      s.shipX = shipX;
      s.shipY = 0;

      const screen = new build.ScreenBuffer(W, H);
      game.update(FRAME, {}, { SPACE: true });
      build.renderGame(screen, s);

      for (let frame = 0; frame < 70 && s.bullets.length; frame++) {
        for (let row = HUD_ROWS; row < H - FOOTER_ROWS; row++) {
          const span = build.tunnelSpan(row, HUD_ROWS, H - FOOTER_ROWS, W);
          for (const col of [span.left, span.right]) {
            const ch = screen.chars[row * W + col];
            assert.ok(
              WALL_CHARS.has(ch),
              `fired from ${shipX}, frame ${frame} left the wall column ${col} ` +
              `of row ${row} reading "${ch}" instead of a wall glyph`
            );
          }
        }
        game.update(FRAME, {}, {});
        build.renderGame(screen, s);
      }
    }
  });

  test(`${build.name}: clipping the tracer leaves the shot itself in flight`, () => {
    // The fix is a drawing one. The span the walls are drawn on runs a little
    // narrower than the tunnel radius projects to, so culling the bullet where
    // the tracer stops would cost real hits out at the far end - and the held
    // column is the aiming fix the hit rates depend on.
    const wall = flyTracer(-6.5);
    const centre = flyTracer(0);

    assert.equal(
      wall.live, centre.live,
      `a wall shot lived ${wall.live} frames against the centre shot's ${centre.live}`
    );
    assert.ok(
      wall.drawn < wall.live,
      `the wall shot was drawn on all ${wall.live} of its frames, so nothing was clipped`
    );
  });
}

for (const grid of GRIDS) {
  test(`both builds resolve the same engagements the same way at ${grid.name}`, () => {
    const outcomes = BUILDS.map((build) => walk(24, { near: 30, far: 140 })
      .map((place) => engage(emptyRun(build, grid), { ...place, volley: false })));
    assert.deepEqual(outcomes[1], outcomes[0]);
  });
}

test('both builds draw the tracer on the same cells, frame for frame', () => {
  // The test above compares what the shots hit; this compares what they looked
  // like, which is the half of the port that a hit rate cannot speak for. The
  // clip is drawn from the same span the walls are, so the two builds have to
  // stop a tracer in the same place as well as land it in the same place.
  //
  // Fired from the centre, from the outermost column a target spawns in, and
  // from the wall the ship is held at, which is where the two spans differing
  // by a column would show first.
  for (const shipX of [0, -4.5, 4.5, -6.5, 6.5]) {
    const drawnBy = BUILDS.map((build) => {
      const game = emptyRun(build, DRAWN);
      const s = game.state;
      s.shipX = shipX;
      s.shipY = 0;

      const screen = new build.ScreenBuffer(W, H);
      game.update(FRAME, {}, { SPACE: true });
      build.renderGame(screen, s);

      const frames = [];
      for (let i = 0; i < 70 && s.bullets.length; i++) {
        frames.push(tracerCellsBothHalves(build, screen));
        game.update(FRAME, {}, {});
        build.renderGame(screen, s);
      }
      return frames;
    });
    assert.deepEqual(
      drawnBy[1], drawnBy[0],
      `fired from ${shipX}, the two builds drew the tracer differently`
    );
  }
});

// ----- The rule, in free flight -----
//
// Everything above stages its engagement: one target parked in an emptied run,
// one volley in the air. That isolates the shot, which is what a rate needs,
// and it is not the shape the fault was found in. The screen capture behind
// this whole rule was a real run - sixty obstacles in the tunnel, volleys
// overlapping, the ship held on the floor - and the two invariants had no check
// in that shape at all. They were verified in a browser instead, which means
// they were only ever guarded when the UI/UX agent ran, and not on a change.
//
// So the same pair is asked of a run the engine starts for itself. The pilot is
// in engagement.mjs; these read what it brings back.

/** Held on the floor, and held at the ceiling the tunnel clamps the ship to. */
const FREE_HEIGHTS = [0, 6.5];

// Every figure quoted in the checks below is a number rather than a spread,
// and rebuilding one is a matter of running the probe again.
//
// It was not. The flight used to fly whatever `startGame` drew from an
// unseeded `Math.random`, so each pass flew a different run and no figure off
// it was repeatable the way the staged walks beside it are: the numbers in
// these comments were each one draw, and the first rerun fell outside them.
// Restating them as spreads over ten passes did not settle it either - two
// ten-pass runs of the whole matrix disagreed with each other, so no pass
// count quoted that way ever would.
//
// The flight is seeded now, at `FREE_SEEDS[0]`, so it is the same sixty
// obstacles and the same orbs among them every time it is flown - and the same
// in both builds, which is why every figure below is one number for the pair
// rather than one each. `npm run probe -- free-flight` prints them all again,
// at this seed and at the four beside it.
//
// The floors are still set well under what the flight delivers. A seeded world
// is reproducible, not representative: the probe's other four seeds are the
// check on that, and a floor pinned against what one world happens to give
// would fail the day the engine changed for a reason nobody minded.

/** One flight per height, kept for every check below that reads it. */
const freeFlights = new Map();
function freeRun(build, grid) {
  const key = `${build.name}:${grid.name}`;
  if (!freeFlights.has(key)) {
    freeFlights.set(key, FREE_HEIGHTS.map((holdY) => ({
      holdY, ...freeFlight(build, grid, { frames: FREE_FRAMES, holdY, seed: FREE_SEEDS[0] }),
    })));
  }
  return freeFlights.get(key);
}

for (const build of BUILDS) {
  for (const grid of GRIDS) {
    const at = `${build.name} at ${grid.name}`;

    test(`${at}: the free flight is a real run, crowded and firing`, () => {
      // The guard on the pilot rather than on the cannon. Both checks below
      // pass on a flight that never fires, never meets anything, or dies in its
      // first seconds, so what the flight actually contained is pinned here:
      // volleys pulled, kills landed, blocks on the screen at once, and shots
      // in the air at once. Across the twelve seeded flights - both builds,
      // three grids, two heights - a 1200-frame flight fires 141 to 298
      // volleys, lands 40 to 126 kills, draws 15 to 34 blocks at once and
      // holds 45 shots in the air. The floors sit well under the low end of
      // each: a seeded world is reproducible rather than representative, and a
      // floor set against what this one gives would be pinning the seed.
      for (const flight of freeRun(build, grid)) {
        const held = `held at ${flight.holdY}`;
        assert.equal(flight.frames, FREE_FRAMES, `${held}: the flight should run its length`);
        assert.ok(flight.volleys >= 80, `${held}: only ${flight.volleys} volleys fired`);
        assert.ok(flight.kills >= 15, `${held}: only ${flight.kills} kills landed`);
        assert.ok(
          flight.mostBlocksDrawn >= 8,
          `${held}: at most ${flight.mostBlocksDrawn} blocks were ever drawn at once`
        );
        assert.ok(
          flight.mostShotsInAir >= 9,
          `${held}: at most ${flight.mostShotsInAir} shots were ever in the air, so no volley overlapped`
        );
      }
    });

    test(`${at}: no tracer is drawn through a block a whole run long`, () => {
      // The complaint, asked of free flight: a bolt drawn on a block that is
      // still there the frame after, with the same shot still in the air. The
      // sweep's first sample is where the two stood when the frame was painted,
      // so a contact the player can see is one the hit test was handed.
      //
      // It comes back nil, and so does the count of frames that drew a tracer
      // on a block at all - the contact resolves on the frame it would first be
      // drawn, so the player never sees a bolt standing on a live block. Both
      // are nil on all twelve seeded flights. Flown in a real chromium window
      // the same detector counted 164 such frames with the hit rule switched
      // off; forcing `contacts` to return false here gives 921 to 24,673 a
      // flight, so the check has plenty of grip.
      for (const flight of freeRun(build, grid)) {
        assert.equal(
          flight.ignored, 0,
          `held at ${flight.holdY}: ${flight.ignored} contacts were drawn and ignored, ` +
          `first at ${flight.ignoredAt.join('; ')}`
        );
      }
    });

    test(`${at}: every kill in free flight was earned on the screen`, () => {
      // The other half. A kill has to have had its tracer on the killed block
      // or within the grid's column slack beside it, on the kill frame or the
      // one before, with both readings taken against the killing shot alone.
      //
      // "The killing shot alone" is the frame's own resolution order rather
      // than a figure of speech: the pilot pairs each kill to the shot that
      // made it before reading either contact, walking the spent shots and the
      // kill bursts from the same end updateBullets walks the bullets from. It
      // used to reduce both readings over every shot the frame spent, which on
      // a crowded frame let one shot's contact answer for another shot's kill -
      // 11% of kills were landed on a frame that spent more than one shot, so
      // the share this asserts was a ceiling on what it could catch.
      //
      // `unlit` is a kill with no bolt drawn anywhere, which is the corridor
      // clip fault, and it is nil now that `contacts` reads the same clip
      // `drawBullets` draws by. It is nil at every grid, in both builds, at 97
      // to 191 kills a grid.
      //
      // The rest is 99% or better on or beside, taken over the kills the frame
      // could pair. That remainder is the sweep inside the frame doing its job
      // rather than a kill nobody earned: a frame carries a shot a row or more
      // up the screen, so two cells can meet on a step the sweep tests and
      // neither end of the frame draws.
      //
      // The pairing is what the last assertion guards. A frame that also
      // spends a shot on a mine cannot say which shot went where, so its kills
      // are counted and left unread - 2, 4 and 3 a grid here, which is 97% of
      // them read at the worst grid of the three.
      //
      // What guards the pairing being the *right* one is the check below this
      // one rather than the share above. The share was quoted as catching it,
      // on a run flown with the spent shots walked from the wrong end falling
      // to 87% and 89% at two of the six build-and-grid pairs; that figure was
      // one unseeded draw and does not hold. Walked from the wrong end on the
      // five seeded worlds the probe flies, the share falls no lower than
      // 90.4%, so it clears this floor at all fifteen of the grids and catches
      // the fault at none of them. It cannot separate them: a pairing fault can
      // only move the kills whose frame spent more than one shot, and those are
      // a tenth of the kills.
      const flights = freeRun(build, grid);
      const count = (verdict) => flights.reduce(
        (n, f) => n + (f.killContacts.get(verdict) ?? 0), 0
      );
      const kills = flights.reduce((n, f) => n + f.kills, 0);
      const read = count('on') + count('beside') + count('wide')
        + count('unlit') + count('hidden');
      const reached = count('on') + count('beside');

      assert.equal(
        count('unlit'), 0,
        `${count('unlit')} of ${read} read kills landed with no tracer drawn at all`
      );
      assert.ok(
        reached / read >= 0.9,
        `${reached}/${read} kills had their tracer on or within ${flights[0].slack} ` +
        `columns of the block, wanted 90%`
      );
      assert.ok(
        read / kills >= 0.75,
        `only ${read} of ${kills} kills could be paired to the shot that made them, ` +
        `wanted three quarters`
      );
    });
  }

  test(`${build.name}: a crowded frame's kills are read against the shot that made them`, () => {
    // The pairing, on its own. Every other reading above is diluted by the
    // kills a pairing cannot get wrong: a frame that spent one shot pairs that
    // shot to that kill whichever end the spent shots are walked from, and
    // those are nine kills in ten. So this takes the same verdicts over the
    // kills whose frame spent more than one shot, which is the whole of what
    // the pairing decides.
    //
    // Read over the three grids together, because a crowded frame is not
    // evenly spread across them: lining up on a column is a finer movement on
    // a wide grid, so the pilot fires less often and 205x50 contributes none
    // of these at this seed while 60x20 contributes 28.
    //
    // It comes back 44 of 44 on or beside. Flown with the spent shots walked
    // from the wrong end it is 20 of 44 - 45% - so the floor has grip here
    // where the undiluted share did not: that same fault leaves the share over
    // every kill at 90% or better on all five of the probe's seeds.
    const flights = GRIDS.flatMap((grid) => freeRun(build, grid));
    const count = (verdict) => flights.reduce(
      (n, f) => n + (f.crowdedContacts.get(verdict) ?? 0), 0
    );
    const read = ['on', 'beside', 'wide', 'unlit', 'hidden'].reduce(
      (n, verdict) => n + count(verdict), 0
    );
    const reached = count('on') + count('beside');

    assert.ok(
      read >= 20,
      `only ${read} kills landed on a frame that spent more than one shot, ` +
      `so the flight says nothing about the pairing`
    );
    assert.ok(
      reached / read >= 0.9,
      `${reached}/${read} kills on a crowded frame had their tracer on or ` +
      `within ${flights[0].slack} columns of the block they killed, wanted 90%`
    );
  });
}

// ----- The same flight, at every rate the suite walks -----
//
// `freeFlight` takes a `dt` like everything else in this module, so what it
// reads off a frame has to be derived from that frame rather than fixed at the
// rate it usually flies at. One reading was not. The bound on how far a kill's
// debris can have drifted from the block it came off was a flat half a unit,
// which is one frame of a particle's own velocity at a thirtieth of a second
// with room over and less than one frame of it at a sixth: `spawnParticles`
// draws `vz` from -1 to 2 and `updateParticles` carries z by
// `(vz + advance) * dt`, so past about a seventh of a second the z term alone
// clears half a unit. The burst then names no block, the kill cannot be paired
// to the shot that made it, and it goes unread. Flown over the whole matrix
// that left 4%, 4%, 3% and 2% of kills unpaired at 1/60, 1/30, 1/20 and 1/12 -
// and 83% at 1/6, which would take the three-quarters floor above straight
// through.
//
// Nothing reached it, because no caller passed a `dt` and the default is
// `FRAME`. That is the reason to fly the rates rather than the reason not to:
// the walk above this one goes to a sixth of a second a frame, so the
// parameter reads as though the flight were flown there too, and a reading
// that only holds at one rate should say so or be made to hold at all of them.
// It is made to hold.
//
// One grid, both builds, and half the frames the matrix checks fly. Whether a
// reading tracks the frame is not a property of the grid, so a second grid
// would buy repetition rather than coverage; the two builds are worth flying
// because a seeded flight is identical in both, so a rate that pairs in one
// and not the other is the port drifting.
//
// The bound is derived now - `3 * dt` on x and y, and the frame's own advance
// on z - and the pairing holds all the way down. Per build, both heights
// together: 28 of 29 kills read at 1/60, 69 of 70 at 1/30, 124 of 125 at 1/20,
// 220 of 229 at 1/12 and 525 of 542 at 1/6, with 99% or better of each on or
// beside the block and no kill landing unlit at any rate. Every kill left
// unread here is the mine case the pairing sits out by design. The wider bound
// a slow frame needs does let a second block inside it elsewhere in the matrix
// - 10 bursts naming nothing and 14 naming more than one, out of 8,266 kills
// at 1/6 - and those are counted as unpaired rather than guessed at, which is
// what `unnamed` and `ambiguous` are for.
//
// Flown with the bound put back to a flat half a unit, this walk reads 127 of
// 542 kills at 1/6 against the same floor, so it has grip where it needs it.

for (const build of BUILDS) {
  const grid = GRIDS[0];

  test(`${build.name} at ${grid.name}: the free flight pairs its kills at every frame rate`, () => {
    for (const dt of FRAME_RATES) {
      const rate = `1/${Math.round(1 / dt)}`;
      const flights = FREE_HEIGHTS.map(
        (holdY) => freeFlight(build, grid, { frames: FREE_RATE_FRAMES, holdY, dt })
      );
      const count = (verdict) => flights.reduce(
        (n, f) => n + (f.killContacts.get(verdict) ?? 0), 0
      );
      const kills = flights.reduce((n, f) => n + f.kills, 0);
      const read = count('on') + count('beside') + count('wide')
        + count('unlit') + count('hidden');
      const reached = count('on') + count('beside');

      assert.ok(
        kills >= 10,
        `at ${rate}: only ${kills} kills landed, so the flight says nothing either way`
      );
      assert.equal(
        count('unlit'), 0,
        `at ${rate}: ${count('unlit')} of ${read} read kills landed with no tracer drawn at all`
      );
      assert.ok(
        read / kills >= 0.75,
        `at ${rate}: only ${read} of ${kills} kills could be paired to the shot that ` +
        `made them, wanted three quarters`
      );
      assert.ok(
        reached / read >= 0.9,
        `at ${rate}: ${reached}/${read} kills had their tracer on or within ` +
        `${flights[0].slack} columns of the block, wanted 90%`
      );
    }
  });
}

// ----- The corridor clip, walked rather than flown -----
//
// `drawBullets` stops drawing a tracer whose column has left the corridor, and
// `drawEntitiesFar` draws a target's block whether or not the corridor reaches
// it - so before `contacts` read the same clip, a shot could register from a
// column the tunnel no longer covered. The player saw the block, saw no bolt,
// and the block died anyway.
//
// None of the flown engagements can reach that. They steer onto the target's
// column before firing, and a target never spawns outside four and a half units
// of the axis, so a flown shot is never taken from a column the tunnel has
// stopped reaching. The ship can hold six and a half. So the hit test is walked
// instead: every firing column and height the ship can hold, every depth of a
// shot's life, against every legal target placement.

for (const build of BUILDS) {
  for (const grid of GRIDS) {
    test(`${build.name} at ${grid.name}: a shot the player cannot see registers nothing`, () => {
      // Every configuration the walk calls a candidate is one where the tracer
      // was drawn nowhere and the cells would otherwise have met - which is to
      // say, one the hit test killed on before it read the clip. Walked against
      // the tail as it stood then, every single one registers: 594 of 594 at
      // 80x24, 2241 of 2241 at 60x20 and 76 of 76 at 205x50, out of 3.5 to 3.9
      // million dark configurations at each grid. They now register none.
      const walked = darkWalk(build, grid);

      assert.equal(
        walked.registered, 0,
        `${walked.registered} of ${walked.candidates} undrawn-tracer configurations ` +
        `still registered, first ${walked.at[0]}`
      );
      // The guard on the walk rather than on the hit test: a walk that produces
      // no candidate asserts nothing, and the candidate count is the one thing
      // that moves if the corridor, the slack or the projection is retuned.
      assert.ok(
        walked.candidates > 0,
        `the walk found no undrawn-tracer configuration to put to the hit test, ` +
        `out of ${walked.dark} dark ones`
      );
    });
  }
}
