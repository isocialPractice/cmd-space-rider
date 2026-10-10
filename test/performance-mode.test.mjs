// test/performance-mode.test.mjs — The detail ladder: what a tier cuts, what
// moves between tiers, and what a window of frame times argues for.
//
// Both builds hold the same ladder and the same arithmetic, so everything here
// runs against both. The decision itself is a pure function of a mean frame
// time, which is what makes it checkable without a slow device: the frames are
// fed in rather than waited for.
//
// The one thing to keep hold of while reading this file is that the fullest tier
// is the game as it was before any of this existed. Forty stars and every
// particle a burst asks for is not a tier the ladder chose, it is tier zero, so
// a device that keeps up never sees a difference and no figure measured before
// the ladder existed moves because of it.
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

/** A run under way on an 80x24 grid, with the starfield populated. */
function flying(build, mode) {
  const game = new build.Game();
  game.state.screenWidth = 80;
  game.state.screenHeight = 24;
  game.startGame(mode);
  game.initStars(80, 24);
  return game;
}

/** Feed `count` frames that each took `seconds`, the way a shell does. */
function feed(game, seconds, count) {
  for (let i = 0; i < count; i++) game.trackFrameRate(seconds);
}

/** A frame time from a factor of the target, for readability below. */
const atFactor = (api, factor) => api.TARGET_FRAME_TIME * factor;

/** Feed `rounds` repetitions of a pattern of frame times, in turn. */
function feedPattern(game, pattern, rounds) {
  for (let i = 0; i < rounds; i++) {
    for (const seconds of pattern) game.trackFrameRate(seconds);
  }
}

// ----- The ladder itself -----

test('the ladder opens on the game as it was, and only thins from there', () => {
  for (const build of BUILDS) {
    const tiers = build.api.DETAIL_TIERS;
    assert.equal(tiers[0].stars, 40, `${build.name}: tier 0 is the forty stars initStars always made`);
    assert.equal(tiers[0].particles, 1, `${build.name}: and the whole of every burst`);

    for (let i = 1; i < tiers.length; i++) {
      assert.ok(tiers[i].stars < tiers[i - 1].stars, `${build.name}: tier ${i} cuts stars`);
      assert.ok(
        tiers[i].particles < tiers[i - 1].particles,
        `${build.name}: tier ${i} cuts particles`
      );
      assert.ok(tiers[i].stars > 0, `${build.name}: tier ${i} still has a starfield`);
      assert.ok(tiers[i].particles > 0, `${build.name}: tier ${i} still has debris`);
    }
  }
});

test('a tier past either end of the ladder reads as the end it is past', () => {
  for (const build of BUILDS) {
    const tiers = build.api.DETAIL_TIERS;
    const last = tiers.length - 1;
    for (const [asked, want] of [[-5, 0], [-1, 0], [0, 0], [last, last], [last + 1, last], [99, last]]) {
      assert.deepEqual(
        build.api.detailTier(asked), tiers[want],
        `${build.name}: level ${asked} reads as tier ${want}`
      );
    }
  }
});

test('a burst keeps at least one particle however far the ladder has dropped', () => {
  for (const build of BUILDS) {
    const last = build.api.DETAIL_TIERS.length - 1;
    for (let detail = 0; detail <= last; detail++) {
      for (const count of [1, 5, 8, 10, 12, 15, 20]) {
        const n = build.api.burstSize(count, detail);
        assert.ok(n >= 1, `${build.name}: ${count} at tier ${detail} threw nothing`);
        assert.ok(n <= count, `${build.name}: ${count} at tier ${detail} threw more than asked`);
      }
    }
    // The fullest tier is the count the caller asked for, exactly.
    for (const count of [1, 5, 8, 10, 12, 15, 20]) {
      assert.equal(build.api.burstSize(count, 0), count, `${build.name}: tier 0 is untouched`);
    }
  }
});

// ----- What a window of frames argues for -----

test('a window inside the target climbs, one past it drops, one between holds', () => {
  for (const build of BUILDS) {
    const { api } = build;
    const last = api.DETAIL_TIERS.length - 1;

    // Comfortably inside: the ladder climbs back towards the fullest tier.
    assert.equal(api.detailFor(2, atFactor(api, 1)), 1, `${build.name}: on target climbs`);
    assert.equal(api.detailFor(1, atFactor(api, 1)), 0, `${build.name}: and keeps climbing`);
    assert.equal(api.detailFor(0, atFactor(api, 1)), 0, `${build.name}: and stops at the top`);

    // Past the drop factor: the ladder steps down and stops at the bottom.
    const slow = atFactor(api, api.DETAIL_DROP_FACTOR + 0.5);
    assert.equal(api.detailFor(0, slow), 1, `${build.name}: a slow window drops`);
    assert.equal(api.detailFor(last, slow), last, `${build.name}: and stops at the bottom`);

    // Between the two factors is the hysteresis, and nothing moves in it.
    const between = atFactor(api, (api.DETAIL_RAISE_FACTOR + api.DETAIL_DROP_FACTOR) / 2);
    for (let detail = 0; detail <= last; detail++) {
      assert.equal(
        api.detailFor(detail, between), detail,
        `${build.name}: tier ${detail} holds between the factors`
      );
    }
  }
});

test('the hysteresis is a real gap, not a boundary', () => {
  // A drop factor at or below the raise factor is a ladder with no dead band:
  // every window would either climb or drop, and a device sitting between the
  // two would alternate once a second with the starfield visibly breathing.
  for (const build of BUILDS) {
    const { api } = build;
    assert.ok(
      api.DETAIL_DROP_FACTOR > api.DETAIL_RAISE_FACTOR,
      `${build.name}: the drop factor has to sit above the raise factor`
    );
    assert.ok(api.DETAIL_RAISE_FACTOR >= 1, `${build.name}: the raise factor allows for jitter`);
  }
});

test('the factors are the rates the comments name them as', () => {
  for (const build of BUILDS) {
    const { api } = build;
    const rate = (factor) => 1 / (api.TARGET_FRAME_TIME * factor);
    assert.equal(api.TARGET_FRAME_TIME, 1 / 30, `${build.name}: the target is 30 frames a second`);
    assert.ok(Math.abs(rate(api.DETAIL_DROP_FACTOR) - 24) < 0.05, `${build.name}: dropping at 24 fps`);
    assert.ok(
      Math.abs(rate(api.DETAIL_RAISE_FACTOR) - 27.3) < 0.05,
      `${build.name}: climbing at 27.3 fps`
    );
  }
});

// ----- The engine, fed real windows -----

test('a window of slow frames costs a tier, and the starfield thins with it', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    const s = game.state;
    assert.equal(s.detail, 0, `${build.name}: a run opens at the fullest tier`);
    assert.equal(s.stars.length, build.api.DETAIL_TIERS[0].stars, `${build.name}: forty stars`);

    feed(game, atFactor(build.api, 2), build.api.DETAIL_WINDOW_FRAMES);
    assert.equal(s.detail, 1, `${build.name}: one window, one tier`);
    assert.equal(
      s.stars.length, build.api.DETAIL_TIERS[1].stars,
      `${build.name}: the field came down with it`
    );

    feed(game, atFactor(build.api, 2), build.api.DETAIL_WINDOW_FRAMES);
    assert.equal(s.detail, 2, `${build.name}: a second window, a second tier`);
    assert.equal(s.stars.length, build.api.DETAIL_TIERS[2].stars, `${build.name}: and thinner again`);
  }
});

test('a tier is not spent before its window has closed', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    feed(game, atFactor(build.api, 2), build.api.DETAIL_WINDOW_FRAMES - 1);
    assert.equal(game.state.detail, 0, `${build.name}: one frame short decides nothing`);
    assert.equal(game.state.frameSeen, build.api.DETAIL_WINDOW_FRAMES - 1, `${build.name}: counted`);

    game.trackFrameRate(atFactor(build.api, 2));
    assert.equal(game.state.detail, 1, `${build.name}: the closing frame decides`);
    assert.equal(game.state.frameSeen, 0, `${build.name}: and opens a fresh window`);
    assert.equal(game.state.frameSpent, 0, `${build.name}: with nothing carried over`);
  }
});

test('a device that recovers climbs back to the fullest tier', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    const { api } = build;
    const last = api.DETAIL_TIERS.length - 1;

    for (let i = 0; i < last; i++) feed(game, atFactor(api, 2), api.DETAIL_WINDOW_FRAMES);
    assert.equal(game.state.detail, last, `${build.name}: at the bottom of the ladder`);

    for (let i = 0; i < last; i++) feed(game, atFactor(api, 1), api.DETAIL_WINDOW_FRAMES);
    assert.equal(game.state.detail, 0, `${build.name}: back at the top`);
    assert.equal(
      game.state.stars.length, api.DETAIL_TIERS[0].stars,
      `${build.name}: with the whole starfield back`
    );
  }
});

test('the stars a tier change keeps are the ones that were already on screen', () => {
  // Trimming and topping up rather than rebuilding is what keeps a tier change
  // from reshuffling the whole field, which would be a more obvious event than
  // the third of it that actually goes out.
  for (const build of BUILDS) {
    const game = flying(build);
    const before = game.state.stars.slice();

    feed(game, atFactor(build.api, 2), build.api.DETAIL_WINDOW_FRAMES);
    const kept = build.api.DETAIL_TIERS[1].stars;
    assert.deepEqual(
      game.state.stars, before.slice(0, kept),
      `${build.name}: the survivors are untouched`
    );

    // Climbing back tops the list up rather than replacing what is there.
    feed(game, atFactor(build.api, 1), build.api.DETAIL_WINDOW_FRAMES);
    assert.deepEqual(
      game.state.stars.slice(0, kept), before.slice(0, kept),
      `${build.name}: and stay untouched on the way back up`
    );
    assert.equal(game.state.stars.length, build.api.DETAIL_TIERS[0].stars, `${build.name}: refilled`);
  }
});

test('a dropped tier survives the run that measured it', () => {
  // The ladder is a reading of the device rather than of the run, so a player
  // who paid a second of a bad tier last run does not pay it again. The window
  // is the part that resets: its frames belonged to the run that is over.
  for (const build of BUILDS) {
    const game = flying(build);
    feed(game, atFactor(build.api, 2), build.api.DETAIL_WINDOW_FRAMES);
    game.trackFrameRate(atFactor(build.api, 2));

    game.startGame();
    assert.equal(game.state.detail, 1, `${build.name}: the tier carried over`);
    assert.equal(game.state.frameSeen, 0, `${build.name}: the window did not`);
    assert.equal(game.state.frameSpent, 0, `${build.name}: nor the time in it`);
  }
});

// ----- What is not measured -----

test('only a live run is measured', () => {
  for (const build of BUILDS) {
    const { api } = build;
    const slow = atFactor(api, 2);

    for (const mode of ['menu', 'debugMenu', 'nameEntry', 'dead']) {
      const game = flying(build);
      game.state.mode = mode;
      feed(game, slow, api.DETAIL_WINDOW_FRAMES * 2);
      assert.equal(game.state.detail, 0, `${build.name}: ${mode} is not a run`);
      assert.equal(game.state.frameSeen, 0, `${build.name}: ${mode} counts no frames`);
    }

    const paused = flying(build);
    paused.state.paused = true;
    feed(paused, slow, api.DETAIL_WINDOW_FRAMES * 2);
    assert.equal(paused.state.detail, 0, `${build.name}: a paused run is not measured`);
  }
});

test('a clock the shell could not read is not a fast frame', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    for (const bad of [0, -1, -0.5, NaN]) {
      feed(game, bad, build.api.DETAIL_WINDOW_FRAMES * 2);
      assert.equal(game.state.frameSeen, 0, `${build.name}: ${bad} is not a sample`);
      assert.equal(game.state.detail, 0, `${build.name}: ${bad} argued for nothing`);
    }
  }
});

test('a loop that stopped is not a slow frame', () => {
  // A backgrounded tab or a sleeping laptop. Neither says how fast the device
  // draws, and one of them averaged in would cost a tier for coming back to the
  // tab.
  for (const build of BUILDS) {
    const { api } = build;
    const window = api.DETAIL_WINDOW_FRAMES * api.TARGET_FRAME_TIME;

    const game = flying(build);
    feed(game, window, api.DETAIL_WINDOW_FRAMES * 2);
    assert.equal(game.state.frameSeen, 0, `${build.name}: a window-long frame is not a sample`);
    assert.equal(game.state.detail, 0, `${build.name}: and cost nothing`);

    // One stall in an otherwise healthy window leaves the tier where it was, and
    // the window is exactly its own length. The sample straddling a return is
    // discarded too - see the test below - but only when it is long enough to be
    // a piece of the stall, and a frame at the target is three hundredths of a
    // second. So none of these thirty is thrown away, all thirty are counted,
    // and `frameSeen` back at 0 is what says the window closed rather than
    // stopping one sample short of a decision.
    const mixed = flying(build);
    mixed.trackFrameRate(window * 4);
    feed(mixed, atFactor(api, 1), api.DETAIL_WINDOW_FRAMES);
    assert.equal(mixed.state.frameSeen, 0, `${build.name}: the window closed`);
    assert.equal(mixed.state.detail, 0, `${build.name}: and the healthy frames decided it`);

    // A device genuinely at a few frames a second is still well inside the
    // window, so the guard does not hide a real shortfall.
    const bad = flying(build);
    feed(bad, 0.5, api.DETAIL_WINDOW_FRAMES);
    assert.equal(bad.state.detail, 1, `${build.name}: 2 frames a second still drops a tier`);
  }
});

test('the partial frame on the way back from a stall is not a sample either', () => {
  // The gap the guard above misses. A backgrounded tab is brought forward
  // partway through one of the intervals its frames were being withheld across,
  // so the frame that straddles the return is a part of an interval - measured
  // at 650ms, 750ms and 850ms over three spells away from a run in a headed
  // chromium. Each is under the whole-window cut-off and so was taken as an
  // ordinary sample, and one of them carries a window of thirty on its own: at
  // 650ms the mean is 53.9ms against a 41.7ms drop threshold. Every spell cost a
  // tier, which is the thing the guard exists to prevent.
  for (const build of BUILDS) {
    const { api } = build;
    const window = api.DETAIL_WINDOW_FRAMES * api.TARGET_FRAME_TIME;

    const game = flying(build);
    feed(game, window, 3);          // frames withheld while the tab was behind
    game.trackFrameRate(0.7);       // the partial interval straddling the return
    feed(game, atFactor(api, 1), api.DETAIL_WINDOW_FRAMES);
    assert.equal(game.state.frameSeen, 0, `${build.name}: a window of healthy frames closed`);
    assert.equal(game.state.detail, 0, `${build.name}: and the return cost no tier`);

    // Only the first one after the stall. A second sample in the same band is an
    // ordinary slow frame and is counted, or a device that really is slow could
    // hide behind one stall.
    const twice = flying(build);
    twice.trackFrameRate(window);
    feed(twice, 0.7, 2);
    assert.equal(twice.state.frameSeen, 1, `${build.name}: the second one was counted`);

    // And the cut-off itself is untouched, which is the half that cannot give:
    // a device genuinely at two frames a second is a run of samples rather than
    // one. At 0.5s a frame it is under the discard band as well, so it loses
    // none of them - thirty are fed, thirty are counted, and `frameSeen` back at
    // 0 says so - and the tier goes on the window they close.
    const slow = flying(build);
    slow.trackFrameRate(window * 4);
    feed(slow, 0.5, api.DETAIL_WINDOW_FRAMES);
    assert.equal(slow.state.frameSeen, 0, `${build.name}: none of the thirty was discarded`);
    assert.equal(slow.state.detail, 1, `${build.name}: 2 frames a second still drops a tier`);

    // The band is what separates the two, so its edge is worth pinning. The
    // floor is the shortest fragment measured; a sample reaching it is read as a
    // piece of the stall, and a shorter one as a frame the device drew.
    const floor = window * api.DETAIL_STALL_RETURN_FACTOR;
    for (const [elapsed, counted, what] of [
      [floor, 0, 'at the floor is a fragment'],
      [floor * 0.999, 1, 'just under it is an ordinary frame'],
    ]) {
      const edge = flying(build);
      edge.trackFrameRate(window);
      edge.trackFrameRate(elapsed);
      assert.equal(edge.state.frameSeen, counted, `${build.name}: a sample ${what}`);
    }
  }
});

test('a loop stalling on every other frame is a slow device, not an unmeasurable one', () => {
  // Nothing else in this file feeds two frame lengths in turn, and the discard
  // above is the reason to. It was a flag armed by a frame at or over the
  // cut-off and cleared by whatever came next, whatever that one measured - so a
  // run alternating across the cut-off armed the flag on every long frame and
  // spent every short one clearing it, and contributed no samples at all. The
  // ladder never moved in either direction, and a loop stalling every other
  // frame read as a device with no measurable frame rate rather than as a slow
  // one.
  //
  // Bounding the discard to the band a fragment of a withheld interval falls in
  // is what counts the short halves below: each is well under the floor, so each
  // is an ordinary frame that happens to follow a stall.
  for (const build of BUILDS) {
    const { api } = build;
    const floorTier = api.DETAIL_TIERS.length - 1;

    for (const pattern of [[1.5, 0.2], [1.1, 0.6], [2.0, 0.05]]) {
      const game = flying(build);
      feedPattern(game, pattern, 300);
      assert.equal(game.state.detail, floorTier,
        `${build.name}: (${pattern.join(', ')}) in turn is a device at the floor tier`);
    }

    // Two short frames falling together always closed the hole, because the
    // second had no flag left to clear. That is why the alternation had to be
    // strict to lose everything, and it is the case that went on working.
    const pair = flying(build);
    feedPattern(pair, [1.1, 0.6, 0.6], 300);
    assert.equal(pair.state.detail, floorTier,
      `${build.name}: two short frames together reach the floor`);

    // And the limit, stated rather than left to be found: the band bounds the
    // hole without closing it. A 0.99s frame is longer than any fragment
    // measured, so a run alternating 1.01s and 0.99s still contributes nothing.
    // That device trips the whole-window cut-off on every other frame, which is
    // by design read as a loop that stopped, and the cut-off is pinned by
    // `a loop that stopped is not a slow frame`.
    const overlap = flying(build);
    feedPattern(overlap, [1.01, 0.99], 300);
    assert.equal(overlap.state.frameSeen, 0,
      `${build.name}: a frame inside the band is still discarded`);
    assert.equal(overlap.state.detail, 0,
      `${build.name}: and the ladder cannot read that device`);

    // A consistently slow device never arms the flag at all, and is the reading
    // neither version of the discard touches.
    const steady = flying(build);
    feed(steady, 0.9, api.DETAIL_WINDOW_FRAMES * 2);
    assert.equal(steady.state.detail, floorTier,
      `${build.name}: 0.9s a frame throughout is the floor tier`);
  }
});

// ----- The badge on the status strip -----

test('the fullest tier says nothing on the status strip', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    assert.equal(build.render.detailBadge(game.state), null, `${build.name}: no badge at tier 0`);
  }
});

test('a dropped tier names itself on the status strip', () => {
  for (const build of BUILDS) {
    const tiers = build.api.DETAIL_TIERS;
    for (let detail = 1; detail < tiers.length; detail++) {
      const game = flying(build);
      game.state.detail = detail;
      const badge = build.render.detailBadge(game.state);
      assert.ok(badge !== null, `${build.name}: tier ${detail} draws a badge`);
      assert.match(badge.text, new RegExp(tiers[detail].name), `${build.name}: naming the tier`);
    }
  }
});

test('the badge reaches the strip, and never past the border', () => {
  for (const build of BUILDS) {
    for (const w of [60, 80, 120]) {
      const game = flying(build);
      const s = game.state;
      s.screenWidth = w;
      s.screenHeight = 24;
      s.detail = 1;
      s.obstacles = [];
      s.orbs = [];
      s.mines = [];

      const screen = new build.ScreenBuffer(w, 24);
      build.render.renderGame(screen, s);
      const strip = rowText(screen, 23);
      assert.match(
        strip, new RegExp(build.api.DETAIL_TIERS[1].name),
        `${build.name} at ${w}: the badge is on the strip`
      );
      assert.equal(strip.length, w, `${build.name} at ${w}: the row is the grid's width`);
      assert.equal(strip[w - 1], '╝', `${build.name} at ${w}: the corner survived`);
    }
  }
});

test('a pickup counting down keeps the strip ahead of the notice', () => {
  // Both are drawn on the same room rule, and the badge goes last, so the
  // narrowest grid carrying two pickups drops the notice rather than a pickup.
  for (const build of BUILDS) {
    const game = flying(build);
    const s = game.state;
    s.screenWidth = 60;
    s.screenHeight = 24;
    s.detail = 2;
    s.rapidFire = 9.4;
    s.slowMotion = 4.6;
    s.obstacles = [];
    s.orbs = [];
    s.mines = [];
    s.muted = true;

    const screen = new build.ScreenBuffer(60, 24);
    build.render.renderGame(screen, s);
    const strip = rowText(screen, 23);
    assert.match(strip, /RAPID/, `${build.name}: the pickup kept its badge`);
    assert.match(strip, /MUTED/, `${build.name}: and the mute flag its slot`);
    assert.equal(strip[59], '╝', `${build.name}: nothing overran the corner`);
  }
});

// ----- The ladder does not touch the run -----

test('a tier change moves the presentation and nothing the run is scored on', () => {
  for (const build of BUILDS) {
    const game = flying(build);
    const s = game.state;
    for (let i = 0; i < 30; i++) game.update(FRAME, {}, {});

    const before = {
      score: s.score, distance: s.distance, shield: s.shield,
      obstacles: s.obstacles.length, orbs: s.orbs.length, mines: s.mines.length,
      speed: s.speed, gameTime: s.gameTime,
    };
    feed(game, atFactor(build.api, 2), build.api.DETAIL_WINDOW_FRAMES);
    assert.equal(s.detail, 1, `${build.name}: the tier moved`);
    assert.deepEqual(
      {
        score: s.score, distance: s.distance, shield: s.shield,
        obstacles: s.obstacles.length, orbs: s.orbs.length, mines: s.mines.length,
        speed: s.speed, gameTime: s.gameTime,
      },
      before,
      `${build.name}: and the run did not`
    );
  }
});
