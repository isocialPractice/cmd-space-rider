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
  unitsPerCol,
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
    flights: 0, kills: 0, drawnThroughAlive: 0, clear: 0, hidden: 0,
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
          if (seen.killContact === 'clear') result.clear++;
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
      // A few per cent are neither, and that is the sweep inside the frame
      // doing its job rather than a kill nobody earned. A frame carries a shot
      // a row or so up the screen, so two cells can meet on a step the sweep
      // tests and neither end of the frame draws - the player sees the tracer a
      // row short, then the block goes. Measured across all three grids it is
      // at most 3 kills in 150.
      const seen = seenWalk(build, grid);
      assert.ok(
        seen.clear / seen.kills <= 0.05,
        `${seen.clear} of ${seen.kills} kills had no tracer on or beside the block`
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
      const RATES = [1 / 60, 1 / 30, 1 / 20, 1 / 12, 1 / 6];
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
