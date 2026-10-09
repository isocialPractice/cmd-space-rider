// test/replay-ghost.test.mjs — The path a run records, and the ghost the next
// run races against it.
//
// The recording is of where the ship went rather than of which keys were held,
// and that is worth stating here because it is the one place this feature
// departs from how it was asked for. A key is held for some number of frames,
// and how far it carries the ship depends on how long those frames were: replay
// the keys at a different frame rate and the ghost flies a different path, which
// is the one thing it exists not to do. The test below that flies the same
// recording at five frame rates is the one that pins the difference.
//
// Both halves run off `gameTime`, so two runs are lined up by how long each had
// been flying rather than by how many frames each took. That is also what makes
// these checks possible without a clock: the frames are handed in.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, rowText, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const terminalTypes = require(join(REPO_ROOT, 'out', 'types.js'));
const terminalRender = require(join(REPO_ROOT, 'out', 'render.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  {
    name: 'terminal',
    Game: TerminalGame,
    ScreenBuffer: TerminalScreen,
    api: terminalTypes,
    render: terminalRender,
  },
  {
    name: 'browser',
    Game: browser.Game,
    ScreenBuffer: browser.ScreenBuffer,
    api: browser,
    render: browser,
  },
];

/**
 * A run with an empty tunnel, so a flight is decided by the keys and nothing
 * else. The entity lists are cleared after `startGame` has drawn them, which
 * leaves the ghost recording holding only its opening sample.
 */
function flying(build, mode) {
  const game = new build.Game();
  const s = game.state;
  s.screenWidth = 80;
  s.screenHeight = 24;
  s.leaderboard = [];
  game.startGame(mode);
  game.initStars(80, 24);
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  return game;
}

/** Fly `seconds` of run at `dt` a frame, holding `keys` throughout. */
function fly(game, seconds, keys = {}, dt = FRAME) {
  const frames = Math.round(seconds / dt);
  for (let i = 0; i < frames; i++) game.update(dt, keys, {});
}

// ----- Reading a recording -----

test('a reading between two samples is the point between them', () => {
  for (const build of BUILDS) {
    const path = [{ t: 0, x: 0, y: 0 }, { t: 1, x: 10, y: 4 }];
    for (const [t, x, y] of [[0, 0, 0], [0.25, 2.5, 1], [0.5, 5, 2], [1, 10, 4]]) {
      const got = build.api.readGhost(path, t, 0);
      assert.ok(got !== null, `${build.name}: a reading at ${t}`);
      assert.ok(Math.abs(got.x - x) < 1e-9, `${build.name}: x at ${t} is ${x}, saw ${got.x}`);
      assert.ok(Math.abs(got.y - y) < 1e-9, `${build.name}: y at ${t} is ${y}, saw ${got.y}`);
    }
  }
});

test('a reading past the end of a recording is nothing at all', () => {
  // The recording ends where the ghost's run ended, so a player still flying
  // past that moment has outlasted the run being raced.
  for (const build of BUILDS) {
    const path = [{ t: 0, x: 0, y: 0 }, { t: 1, x: 10, y: 4 }];
    assert.notEqual(build.api.readGhost(path, 1, 0), null, `${build.name}: the last instant holds`);
    assert.equal(build.api.readGhost(path, 1.001, 0), null, `${build.name}: and no longer`);
    assert.equal(build.api.readGhost(path, 500, 0), null, `${build.name}: long past, still nothing`);
  }
});

test('a reading before the first sample holds at the start line', () => {
  for (const build of BUILDS) {
    const path = [{ t: 0.5, x: 3, y: 1 }, { t: 1, x: 10, y: 4 }];
    const got = build.api.readGhost(path, 0, 0);
    assert.deepEqual(
      { x: got.x, y: got.y }, { x: 3, y: 1 },
      `${build.name}: clamped to the first sample rather than extrapolated backwards`
    );
  }
});

test('an empty recording reads as nothing, and a single sample as one instant', () => {
  for (const build of BUILDS) {
    assert.equal(build.api.readGhost([], 0, 0), null, `${build.name}: nothing recorded`);
    assert.equal(build.api.readGhost([], 10, 5), null, `${build.name}: still nothing`);

    const one = [{ t: 2, x: 1, y: 2 }];
    assert.notEqual(build.api.readGhost(one, 2, 0), null, `${build.name}: the instant itself`);
    assert.equal(build.api.readGhost(one, 2.5, 0), null, `${build.name}: and nothing after it`);
  }
});

test('the cursor is a hint rather than an answer, and is walked to fit the reading', () => {
  // Both directions, because a forward-only walk cannot correct a cursor that
  // is already past `t` - and then the position it reads is of the wrong pair of
  // samples rather than merely slower to find.
  for (const build of BUILDS) {
    const path = [];
    for (let i = 0; i <= 20; i++) path.push({ t: i, x: i, y: 0 });

    // A stale cursor behind the reading still finds the right samples.
    const fromZero = build.api.readGhost(path, 15.5, 0);
    assert.equal(fromZero.cursor, 15, `${build.name}: walked forward to sample 15`);
    assert.ok(Math.abs(fromZero.x - 15.5) < 1e-9, `${build.name}: and read the right position`);

    // A cursor one pair ahead is the ordinary stale case, and the reading is
    // still the point between the samples `t` falls between.
    const ahead = build.api.readGhost(path, 7.5, 9);
    assert.equal(ahead.cursor, 7, `${build.name}: walked back a pair, saw ${ahead.cursor}`);
    assert.ok(Math.abs(ahead.x - 7.5) < 1e-9, `${build.name}: and interpolated, saw ${ahead.x}`);

    // A cursor past the end of the recording is clamped into it and then walked
    // back, so it reads the position at `t` rather than the last sample's.
    const wild = build.api.readGhost(path, 3, 999);
    assert.ok(wild !== null, `${build.name}: a cursor past the end still reads`);
    assert.equal(wild.cursor, 3, `${build.name}: walked back to sample 3, saw ${wild.cursor}`);
    assert.ok(Math.abs(wild.x - 3) < 1e-9, `${build.name}: at x 3, saw ${wild.x}`);

    // A run starting over is handed back 0, which is what the doc comment on
    // readGhost promises and what `startGame` would otherwise be the only
    // guarantee of.
    const restart = build.api.readGhost(path, 0, 18);
    assert.equal(restart.cursor, 0, `${build.name}: back to the start line`);
    assert.ok(Math.abs(restart.x) < 1e-9, `${build.name}: and at the first sample`);

    // A negative one is clamped too.
    assert.equal(build.api.readGhost(path, 0, -50).cursor, 0, `${build.name}: and so is a negative`);
  }
});

// ----- Recording a run -----

test('a run opens with a sample at the start line', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    assert.deepEqual(
      game.state.ghostRecord,
      [{ t: 0, x: game.state.shipX, y: game.state.shipY }],
      `${build.name}: anchored where the run began`
    );
  }
});

test('samples go down a fixed tenth of a second apart, whatever the frames did', () => {
  for (const build of BUILDS) {
    const { GHOST_SAMPLE_TIME } = build.api;
    for (const dt of [1 / 60, FRAME, 1 / 12, 0.05]) {
      const game = flying(build);
      fly(game, 2, {}, dt);

      const times = game.state.ghostRecord.map((p) => p.t);
      assert.ok(times.length >= 19, `${build.name} at dt ${dt}: two seconds is about twenty samples`);
      for (let i = 1; i < times.length; i++) {
        const gap = times[i] - times[i - 1];
        assert.ok(
          Math.abs(gap - GHOST_SAMPLE_TIME) <= dt + 1e-9,
          `${build.name} at dt ${dt}: gap ${gap} is a sample interval give or take a frame`
        );
      }
      // The intervals do not drift later and later: the timer carries its
      // overshoot rather than being reset to a whole interval each time.
      const last = times[times.length - 1];
      assert.ok(
        Math.abs(last - (times.length - 1) * GHOST_SAMPLE_TIME) <= dt + 1e-9,
        `${build.name} at dt ${dt}: the last sample has not drifted, at ${last}`
      );
    }
  }
});

test('a recording follows where the ship was steered', () => {
  for (const build of BUILDS) {
    const left = flying(build);
    fly(left, 1, { A: true });
    const right = flying(build);
    fly(right, 1, { D: true });

    const endOf = (game) => game.state.ghostRecord[game.state.ghostRecord.length - 1];
    assert.ok(endOf(left).x < -1, `${build.name}: holding A carried the record left`);
    assert.ok(endOf(right).x > 1, `${build.name}: and holding D carried it right`);
  }
});

test('a recording stops at its bound rather than growing without end', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    const { GHOST_MAX_SAMPLES } = build.api;

    // Walk the recording up to its ceiling directly - flying ten minutes of run
    // a frame at a time is the same arithmetic several hundred thousand times.
    const s = game.state;
    while (s.ghostRecord.length < GHOST_MAX_SAMPLES) {
      s.ghostRecord.push({ t: s.ghostRecord.length * build.api.GHOST_SAMPLE_TIME, x: 0, y: 0 });
    }
    fly(game, 2);
    assert.equal(
      s.ghostRecord.length, GHOST_MAX_SAMPLES,
      `${build.name}: the ceiling held and the run carried on`
    );
    assert.equal(s.mode, 'playing', `${build.name}: and the run is still a run`);
  }
});

// ----- Promotion -----

test('the run that ended is the one the next run races', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    fly(game, 1, { D: true });
    const flown = game.state.ghostRecord.slice();
    assert.ok(flown.length > 2, `${build.name}: there is a path to promote`);

    game.endGame();
    assert.deepEqual(game.state.ghost, flown, `${build.name}: promoted at the end of the run`);

    game.startGame();
    assert.deepEqual(game.state.ghost, flown, `${build.name}: and still there for the next run`);
    assert.equal(game.state.ghostRecord.length, 1, `${build.name}: with a fresh recording open`);
    assert.equal(game.state.ghostCursor, 0, `${build.name}: and the cursor back at the start`);
  }
});

test('a run abandoned rather than flown out leaves the old ghost in place', () => {
  // Promotion happens at the end of a run, so a flight backed out of from the
  // pause screen stops recording wherever the player lost interest. That is not
  // a performance worth chasing, and the run before it still is.
  for (const build of BUILDS) {
    const game = flying(build);
    fly(game, 1, { D: true });
    game.endGame();
    const raced = game.state.ghost.slice();

    game.startGame();
    fly(game, 0.5, { A: true });
    game.state.mode = 'menu'; // what both shells do when ESCAPE leaves a run
    game.startGame();
    assert.deepEqual(game.state.ghost, raced, `${build.name}: the flown run is still the ghost`);
  }
});

test('a run with nothing in it promotes nothing', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    game.endGame();
    assert.deepEqual(
      game.state.ghost, [],
      `${build.name}: one sample is a path with no travel in it`
    );
  }
});

test('a debug scenario neither records nor is raced', () => {
  for (const build of BUILDS) {
    const normal = flying(build);
    fly(normal, 1, { D: true });
    normal.endGame();
    const raced = normal.state.ghost.slice();
    assert.ok(raced.length > 2, `${build.name}: there is a ghost to be ignored`);

    for (const mode of ['mines', 'orbs', 'obstacleCollision', 'mineCollision', 'chaos']) {
      normal.startGame(mode);
      fly(normal, 1);
      assert.deepEqual(normal.state.ghostRecord, [], `${build.name}: ${mode} records nothing`);
      assert.equal(normal.state.ghostShip, null, `${build.name}: ${mode} draws no ghost`);
      normal.endGame();
      assert.deepEqual(normal.state.ghost, raced, `${build.name}: ${mode} promoted nothing`);
    }

    // And a normal run after one of them still races the last normal run.
    normal.startGame();
    fly(normal, 0.5);
    assert.ok(normal.state.ghostShip !== null, `${build.name}: back to racing the flown run`);
  }
});

// ----- Racing -----

test('a ghost is read at the game time the current run has reached', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    // The readings below are taken a second inside the recording rather than at
    // its last sample. The run's clock is a sum of frame-length floats, so after
    // thirty frames of a thirtieth it is a hair either side of the second it is
    // meant to be, and a reading taken at the final sample would fall off the
    // end of the recording half the time it was taken.
    game.state.ghost = [
      { t: 0, x: 0, y: 1 },
      { t: 1, x: 4, y: 1 },
      { t: 2, x: -4, y: 1 },
      { t: 4, x: -4, y: 1 },
    ];
    game.state.ghostCursor = 0;

    fly(game, 1);
    const atOne = game.state.ghostShip;
    assert.ok(atOne !== null, `${build.name}: a ghost at one second in`);
    assert.ok(Math.abs(atOne.x - 4) < 0.3, `${build.name}: where the record says, saw ${atOne.x}`);

    fly(game, 1);
    const atTwo = game.state.ghostShip;
    assert.ok(atTwo !== null, `${build.name}: and at two seconds`);
    assert.ok(Math.abs(atTwo.x + 4) < 0.3, `${build.name}: back the other way, saw ${atTwo.x}`);

    fly(game, 2.5);
    assert.equal(game.state.ghostShip, null, `${build.name}: and gone once the record runs out`);
  }
});

test('the same recording is raced identically at every frame rate', () => {
  // This is the whole reason the recording holds positions rather than keys. A
  // key held for a frame carries the ship as far as that frame was long, so a
  // recording of keys replayed at another rate flies somewhere else. A
  // recording of positions read on the game clock does not.
  for (const build of BUILDS) {
    const path = [];
    for (let i = 0; i <= 30; i++) path.push({ t: i * 0.1, x: Math.sin(i) * 4, y: 1 });

    const readAt = (dt) => {
      const game = flying(build);
      game.state.ghost = path;
      game.state.ghostCursor = 0;
      fly(game, 1.5, {}, dt);
      return game.state.ghostShip;
    };

    const base = readAt(FRAME);
    assert.ok(base !== null, `${build.name}: there is a ghost to compare`);
    for (const dt of [1 / 60, 1 / 20, 1 / 12, 1 / 10]) {
      const got = readAt(dt);
      assert.ok(got !== null, `${build.name} at dt ${dt}: still a ghost`);
      assert.ok(
        Math.abs(got.x - base.x) < 0.2,
        `${build.name} at dt ${dt}: x ${got.x} against ${base.x}`
      );
      assert.ok(
        Math.abs(got.y - base.y) < 0.2,
        `${build.name} at dt ${dt}: y ${got.y} against ${base.y}`
      );
    }
  }
});

test('a replayed run retraces the path it was recorded from', () => {
  // End to end: fly a run, let it be promoted, fly the same keys again, and the
  // ghost is where the ship is at every point of the second flight.
  for (const build of BUILDS) {
    const first = flying(build);
    fly(first, 1.5, { D: true });
    first.endGame();

    const second = flying(build);
    second.state.ghost = first.state.ghost;
    second.state.ghostCursor = 0;

    let worst = 0;
    for (let i = 0; i < 45; i++) {
      second.update(FRAME, { D: true }, {});
      const ghost = second.state.ghostShip;
      if (ghost === null) continue;
      worst = Math.max(worst, Math.abs(ghost.x - second.state.shipX));
    }
    assert.ok(worst < 0.3, `${build.name}: the ghost tracked the ship, worst gap ${worst}`);
  }
});

test('a paused run does not advance the ghost either', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    game.state.ghost = [{ t: 0, x: 0, y: 1 }, { t: 5, x: 4, y: 1 }];
    game.state.ghostCursor = 0;
    fly(game, 0.5);

    const before = { ...game.state.ghostShip };
    game.update(FRAME, {}, { P: true });
    for (let i = 0; i < 30; i++) game.update(FRAME, {}, {});
    assert.deepEqual(
      { ...game.state.ghostShip }, before,
      `${build.name}: the ghost is as still as the world`
    );
  }
});

// ----- Drawing -----

test('no ghost is no cells, and a ghost is the sprite the live ship is not', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    const screen = new build.ScreenBuffer(80, 24);
    game.state.stars = [];

    build.render.renderGame(screen, game.state);
    const without = [];
    for (let y = 0; y < 24; y++) without.push(rowText(screen, y));
    assert.ok(!without.join('\n').includes('△'), `${build.name}: nothing drawn without a ghost`);

    // A ghost beside the ship, so the two sprites are both on screen at once.
    game.state.ghostShip = { x: game.state.shipX - 3, y: game.state.shipY };
    build.render.renderGame(screen, game.state);
    const text = [];
    for (let y = 0; y < 24; y++) text.push(rowText(screen, y));
    const joined = text.join('\n');
    assert.match(joined, /△/, `${build.name}: the hollow nose`);
    assert.match(joined, /░/, `${build.name}: the faded body`);
    assert.match(joined, /▲/, `${build.name}: and the live ship is still solid`);
    assert.match(joined, /█/, `${build.name}: with a solid body of its own`);
  }
});

/**
 * Where the ghost's hollow nose was drawn, or null if it was not.
 *
 * The nose is how the sprite is found, because it is the one glyph the ghost
 * has to itself: the faded body is `░`, which is also the lightest of the four
 * shades the tunnel walls are drawn from, so a search for that finds the far end
 * of the tunnel on every frame.
 */
function noseAt(screen, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (screen.chars[y * w + x] === '△') return { x, y };
    }
  }
  return null;
}

test('the ghost is drawn in grey, never in the ship’s own colours', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    game.state.stars = [];
    game.state.ghostShip = { x: game.state.shipX - 3, y: game.state.shipY };

    const screen = new build.ScreenBuffer(80, 24);
    build.render.renderGame(screen, game.state);

    const nose = noseAt(screen, 80, 24);
    assert.ok(nose !== null, `${build.name}: the ghost was drawn`);

    const grey = build.api.C.GRAY;
    const cell = (x, y) => ({ char: screen.chars[y * 80 + x], fg: screen.fg[y * 80 + x] });
    assert.deepEqual(cell(nose.x, nose.y), { char: '△', fg: grey }, `${build.name}: the nose`);
    assert.deepEqual(
      cell(nose.x, nose.y + 1), { char: '░', fg: grey },
      `${build.name}: the faded body, on the row under the nose`
    );
    assert.deepEqual(cell(nose.x - 1, nose.y + 1), { char: '<', fg: grey }, `${build.name}: left wing`);
    assert.deepEqual(cell(nose.x + 1, nose.y + 1), { char: '>', fg: grey }, `${build.name}: right wing`);
  }
});

test('the live ship wins a cell the two of them share', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    game.state.stars = [];
    game.state.ghostShip = { x: game.state.shipX, y: game.state.shipY };

    const screen = new build.ScreenBuffer(80, 24);
    build.render.renderGame(screen, game.state);

    // The nose is the only glyph the ghost has to itself, so its absence is
    // what says the whole sprite was overdrawn: the two are written to exactly
    // the same four cells, and the ship is drawn second.
    assert.equal(noseAt(screen, 80, 24), null, `${build.name}: the ghost's nose is overdrawn`);

    const joined = [];
    for (let y = 0; y < 24; y++) joined.push(rowText(screen, y));
    const text = joined.join('\n');
    assert.match(text, /▲/, `${build.name}: the ship's nose is what is there instead`);
    assert.match(text, /█/, `${build.name}: and its solid body`);
  }
});

test('a ghost anywhere a run could have flown stays inside the play area', () => {
  // The positions swept here are the ones a recording can actually hold, which
  // is the clamp updatePlaying puts on the ship: the ghost is a previous run's
  // ship, so it was held to the same corridor when it was recorded.
  const maxR = 8 - 1.5; // tunnelRadius less the margin updatePlaying keeps

  for (const build of BUILDS) {
    let located = 0;
    for (const [w, h] of [[60, 20], [80, 24], [120, 44]]) {
      const gameBottom = h - 2;
      for (const x of [-maxR, -maxR / 2, 0, maxR / 2, maxR]) {
        for (const y of [0, maxR / 2, maxR]) {
          const game = flying(build);
          game.state.screenWidth = w;
          game.state.screenHeight = h;
          game.state.stars = [];
          game.state.ghostShip = { x, y };

          const screen = new build.ScreenBuffer(w, h);
          const put = screen.put.bind(screen);
          const outside = [];
          screen.put = (px, py, ch, fg, bg) => {
            const ix = Math.floor(px);
            const iy = Math.floor(py);
            if (ix < 0 || ix >= w || iy < 0 || iy >= h) outside.push(`${ix},${iy}`);
            put(px, py, ch, fg, bg);
          };
          build.render.renderGame(screen, game.state);

          assert.deepEqual(
            outside, [],
            `${build.name} at ${w}x${h}: ghost at ${x},${y} drew outside the buffer`
          );

          // The HUD rows and the footer rows belong to the HUD, whatever the
          // ghost is doing. Read off the hollow nose alone, because the shield
          // bar is drawn from the same `░` the ghost's body is.
          //
          // A ghost sitting where the ship is has no nose to find: the ship is
          // drawn second and wins every cell the two share, which is checked on
          // its own above. So the row is asserted where there is one to assert,
          // and the count below is what keeps that from passing vacuously.
          const nose = noseAt(screen, w, h);
          if (nose !== null) {
            located++;
            assert.ok(
              nose.y >= 3 && nose.y < gameBottom,
              `${build.name} at ${w}x${h}: ghost at ${x},${y} put its nose on row ${nose.y}`
            );
          }
        }
      }
    }
    assert.ok(located > 30, `${build.name}: only ${located} of the sweep drew a ghost to check`);
  }
});

test('a ghost outside the corridor is held off the HUD rather than clipped by luck', () => {
  // Nothing a run records reaches here - the clamp above is what a recording
  // holds - so this is the guard rather than a case. It is worth a check all the
  // same: the sprite is two rows, so a row guard that let it through at the top
  // of the play area would paint over the shield bar, and ScreenBuffer.put
  // discards an out-of-range write without a word rather than failing.
  for (const build of BUILDS) {
    for (const y of [-200, -40, 40, 200]) {
      const game = flying(build);
      game.state.stars = [];
      game.state.ghostShip = { x: 0, y };

      const screen = new build.ScreenBuffer(80, 24);
      build.render.renderGame(screen, game.state);

      for (const row of [0, 1, 2, 22, 23]) {
        assert.ok(
          !rowText(screen, row).includes('△'),
          `${build.name}: a ghost at y ${y} reached row ${row}`
        );
      }
    }
  }
});
