// test/powerups.test.mjs — Drops from destroyed mines, what they do when the
// ship reaches them, and how long they last.
//
// The pickup is the first thing in this game that changes how a run plays after
// the fact: Rapid Fire changes what the trigger does and Slow Motion changes
// what a second is worth. So the file is in three parts - the drop, the drift
// and the pickup, then the two effects on their own - and both builds fly every
// one of them, as test/parity.test.mjs expects.
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

/** A run with an empty tunnel, so only what a test stages is in it. */
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
  s.powerups = [];
  return game;
}

/**
 * Shoot one mine down and report what it left behind.
 *
 * The mine is parked dead ahead of the muzzle with a single hit point, so one
 * volley settles it and the seed decides the drop rather than the flying. The
 * powerups are read on the frame the mine dies, before the drift has had a
 * chance to carry one into the ship and off the list again.
 */
function killOneMine(build, seed, z = -60) {
  build.seedRng(seed);
  try {
    const game = quietRun(build);
    const s = game.state;
    s.mines = [{ x: s.shipX, y: s.shipY, z, rot: 0, rotSpeed: 0, scale: 1, hp: 1 }];

    game.update(FRAME, {}, { SPACE: true });
    for (let frame = 0; frame < 200 && s.mines.length > 0; frame++) {
      game.update(FRAME, {}, {});
    }
    return { killed: s.mines.length === 0, drops: s.powerups.map((p) => p.kind) };
  } finally {
    build.seedRng(null);
  }
}

/** The same kill over a walk of seeds, so the drop rate is a count and not a sample. */
function dropWalk(build, count = 200) {
  const drops = [];
  for (let seed = 1; seed <= count; seed++) {
    const shot = killOneMine(build, seed);
    assert.equal(shot.killed, true, `seed ${seed}: the volley should settle the mine`);
    assert.ok(shot.drops.length <= 1, `seed ${seed}: one kill, at most one drop`);
    drops.push(shot.drops[0] ?? null);
  }
  return drops;
}

// ----- The drop -----

for (const build of BUILDS) {
  test(`${build.name}: a mine shot down drops at about the stated rate`, () => {
    const drops = dropWalk(build);
    const dropped = drops.filter((kind) => kind !== null).length;
    const rate = dropped / drops.length;

    // Seeded, so this is arithmetic rather than a sample and the band is here
    // to name a change rather than to absorb noise. Measured over the two
    // hundred seeds the walk flies: 64 drops, a rate of 0.320 against the 0.35
    // POWERUP_DROP_CHANCE names.
    assert.ok(
      Math.abs(rate - build.POWERUP_DROP_CHANCE) < 0.08,
      `drop rate ${rate.toFixed(3)} against ${build.POWERUP_DROP_CHANCE}`
    );
  });

  test(`${build.name}: every drop is one of the three kinds`, () => {
    const kinds = new Set(dropWalk(build).filter((kind) => kind !== null));
    assert.deepEqual([...kinds].sort(), [...build.POWERUP_KINDS].sort(),
      'all three should turn up over two hundred kills');
  });

  test(`${build.name}: a drop lands where the mine was`, () => {
    // Walked until a seed drops, rather than assuming one does: the point is
    // where the drop is, and the rate is the test above.
    for (let seed = 1; seed <= 40; seed++) {
      build.seedRng(seed);
      try {
        const game = quietRun(build);
        const s = game.state;
        const mine = { x: 2.5, y: 3, z: -60, rot: 0, rotSpeed: 0, scale: 1, hp: 1 };
        s.mines = [mine];
        s.shipX = 2.5;
        s.shipY = 3;

        game.update(FRAME, {}, { SPACE: true });
        for (let frame = 0; frame < 200 && s.mines.length > 0; frame++) {
          const where = { x: mine.x, y: mine.y, z: mine.z };
          game.update(FRAME, {}, {});
          if (s.mines.length > 0 || s.powerups.length === 0) continue;
          const [drop] = s.powerups;
          // The tolerance covers one frame of the mine's own advance:
          // `updateMines` carries it forward before `updateBullets` takes its
          // last hit point, while `where` is the position from before that
          // frame. The drop itself has not moved at all - `updatePowerups`
          // runs before `updateBullets`, so a drop created inside the latter
          // is not drifted until the next frame.
          assert.ok(Math.abs(drop.z - where.z) < 20, `z ${drop.z} against ${where.z}`);
          assert.ok(Math.abs(drop.x - where.x) <= 2.5, `x ${drop.x} against ${where.x}`);
          return;
        }
      } finally {
        build.seedRng(null);
      }
    }
    assert.fail('forty seeded kills should have dropped something');
  });

  test(`${build.name}: ramming a mine drops nothing`, () => {
    const game = quietRun(build);
    const s = game.state;
    // Parked on the ship, so the next frame is a collision rather than a kill.
    s.mines = [{ x: s.shipX, y: s.shipY, z: 0, rot: 0, rotSpeed: 0, scale: 1, hp: 5 }];

    game.update(FRAME, {}, {});

    assert.equal(s.mines.length, 0, 'the ram destroys it');
    assert.ok(s.shield < 100, 'and costs shield');
    assert.deepEqual(s.powerups, [], 'which is not a reward');
  });

  test(`${build.name}: the collision scenarios drop nothing either`, () => {
    for (const mode of ['obstacleCollision', 'mineCollision']) {
      const game = new build.Game();
      game.startGame(mode);
      const s = game.state;
      s.stars = [];
      s.obstacles = [];
      s.mines = [{ x: s.shipX, y: s.shipY, z: -60, rot: 0, rotSpeed: 0, scale: 1, hp: 1 }];
      s.powerups = [];

      game.update(FRAME, {}, { SPACE: true });
      for (let frame = 0; frame < 200 && s.mines.length > 0; frame++) {
        game.update(FRAME, {}, {});
        assert.deepEqual(s.powerups, [], `${mode}: a diagnostic run pays no rewards`);
      }
    }
  });
}

// ----- The drift and the pickup -----

for (const build of BUILDS) {
  test(`${build.name}: a drop closes on the ship while it comes in`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.shipX = 0;
    s.shipY = 1;
    s.powerups = [{ x: 4, y: 4, z: -80, kind: 'shield' }];

    const gap = () => Math.hypot(s.powerups[0].x - s.shipX, s.powerups[0].y - s.shipY);
    const opening = gap();
    for (let frame = 0; frame < 20; frame++) game.update(FRAME, {}, {});

    assert.ok(s.powerups.length === 1, 'still in the air');
    assert.ok(gap() < opening, `gap ${gap().toFixed(2)} should be under ${opening.toFixed(2)}`);
  });

  test(`${build.name}: the drift never overshoots the ship`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.powerups = [{ x: 0.01, y: s.shipY + 0.01, z: -150, kind: 'shield' }];

    // A step that ran past the ship would sit the drop on the far side and
    // walk it away again, which reads as a pickup fleeing the player.
    for (let frame = 0; frame < 60 && s.powerups.length > 0; frame++) {
      game.update(FRAME, {}, {});
      if (s.powerups.length === 0) break;
      const [p] = s.powerups;
      assert.ok(Math.hypot(p.x - s.shipX, p.y - s.shipY) < 0.2, 'it closes and stays closed');
    }
  });

  test(`${build.name}: a drop that gets past the ship is gone`, () => {
    const game = quietRun(build);
    const s = game.state;
    // Behind the ship in height by more than the sprite covers, so it sails by
    // rather than being collected.
    s.powerups = [{ x: 0, y: 0, z: 9, kind: 'shield' }];
    s.shipY = 6;
    s.shield = 50;

    for (let frame = 0; frame < 5 && s.powerups.length > 0; frame++) {
      game.update(FRAME, {}, {});
    }

    assert.deepEqual(s.powerups, [], 'it is not recycled to the back of the tunnel');
    assert.equal(s.shield, 50, 'and it was not collected on the way out');
  });

  test(`${build.name}: shield regen restores its shield and no more than full`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.shield = 40;
    s.powerups = [{ x: s.shipX, y: s.shipY, z: 0, kind: 'shield' }];

    game.update(FRAME, {}, {});

    assert.equal(s.shield, 40 + build.POWERUP_SHIELD_GAIN);
    assert.deepEqual(s.powerups, [], 'and the pickup is spent');
    assert.ok(s.sounds.includes('powerup'), 'the pickup names its own sound');

    s.shield = 90;
    s.powerups = [{ x: s.shipX, y: s.shipY, z: 0, kind: 'shield' }];
    game.update(FRAME, {}, {});
    assert.equal(s.shield, 100, 'the cap holds');
  });

  test(`${build.name}: the two timed pickups start their clocks`, () => {
    for (const [kind, field, length] of [
      ['rapid', 'rapidFire', build.RAPID_FIRE_TIME],
      ['slow', 'slowMotion', build.SLOW_MOTION_TIME],
    ]) {
      const game = quietRun(build);
      const s = game.state;
      s.powerups = [{ x: s.shipX, y: s.shipY, z: 0, kind }];

      game.update(FRAME, {}, {});

      // One frame of the clock has already run by the time the frame returns,
      // so the reading is just under its full length rather than at it.
      assert.ok(s[field] > length - 2 * FRAME, `${kind}: ${field} at ${s[field]}`);
      assert.ok(s[field] <= length, `${kind}: and no longer than ${length}`);
    }
  });

  test(`${build.name}: a barrel roll collects rather than passing through`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.shield = 40;
    s.powerups = [{ x: s.shipX, y: s.shipY, z: 0, kind: 'shield' }];

    game.update(FRAME, {}, { E: true });

    assert.ok(s.shipRoll > 0, 'the roll is under way');
    assert.equal(s.shield, 40 + build.POWERUP_SHIELD_GAIN,
      'the roll is invincibility to damage, not to a pickup');
  });
}

// ----- Rapid fire -----

for (const build of BUILDS) {
  test(`${build.name}: the trigger fires at once, with or without rapid fire`, () => {
    for (const rapidFire of [0, build.RAPID_FIRE_TIME]) {
      const game = quietRun(build);
      const s = game.state;
      s.rapidFire = rapidFire;

      game.update(FRAME, {}, { SPACE: true });

      assert.equal(s.bullets.length, 3, `rapidFire ${rapidFire}: a press is a volley`);
    }
  });

  test(`${build.name}: a held trigger does nothing without rapid fire`, () => {
    const game = quietRun(build);
    const s = game.state;

    game.update(FRAME, { SPACE: true }, { SPACE: true });
    s.bullets = [];
    for (let frame = 0; frame < 30; frame++) game.update(FRAME, { SPACE: true }, {});

    assert.equal(s.bullets.length, 0, 'the cannon answers presses and nothing else');
  });

  test(`${build.name}: a held trigger repeats at the stated cadence under rapid fire`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.rapidFire = build.RAPID_FIRE_TIME;

    game.update(FRAME, { SPACE: true }, { SPACE: true });
    s.bullets = [];

    // One second of holding, counted in volleys rather than in bullets, so a
    // change to the spread cannot read as a change to the cadence.
    let volleys = 0;
    for (let frame = 0; frame < 30; frame++) {
      const before = s.bullets.length;
      game.update(FRAME, { SPACE: true }, {});
      if (s.bullets.length > before) volleys++;
    }

    const expected = Math.floor(1 / build.RAPID_FIRE_INTERVAL);
    assert.ok(Math.abs(volleys - expected) <= 1, `${volleys} volleys against about ${expected}`);
  });

  test(`${build.name}: the cadence is the nominal one times the multiplier`, () => {
    assert.equal(build.RAPID_FIRE_INTERVAL, build.FIRE_INTERVAL / build.RAPID_FIRE_MULT);
    assert.equal(build.RAPID_FIRE_MULT, 3, 'which is the 3x the pickup promises');
  });

  test(`${build.name}: letting go stops it, and it stops on its own when it runs out`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.rapidFire = build.RAPID_FIRE_TIME;

    game.update(FRAME, { SPACE: true }, { SPACE: true });
    s.bullets = [];
    for (let frame = 0; frame < 10; frame++) game.update(FRAME, {}, {});
    assert.equal(s.bullets.length, 0, 'a released trigger is silent');

    s.rapidFire = FRAME / 2;
    for (let frame = 0; frame < 30; frame++) game.update(FRAME, { SPACE: true }, {});
    assert.equal(s.rapidFire, 0, 'and the clock runs out');
    assert.equal(s.bullets.length, 0, 'leaving the held trigger silent again');
  });

  test(`${build.name}: the pickup's clock is spent in real seconds, not paused ones`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.rapidFire = build.RAPID_FIRE_TIME;
    s.paused = true;

    for (let frame = 0; frame < 30; frame++) game.update(FRAME, {}, {});

    assert.equal(s.rapidFire, build.RAPID_FIRE_TIME, 'a paused screen is not ten free seconds');
  });
}

// ----- Slow motion -----

for (const build of BUILDS) {
  test(`${build.name}: slow motion halves what a frame advances`, () => {
    const distanceOver = (slowMotion) => {
      const game = quietRun(build);
      const s = game.state;
      s.slowMotion = slowMotion;
      for (let frame = 0; frame < 10; frame++) game.update(FRAME, {}, {});
      return s.distance;
    };

    const full = distanceOver(0);
    const slowed = distanceOver(build.SLOW_MOTION_TIME);

    assert.ok(full > 0);
    // Not exactly half: baseSpeed climbs with distance, so the slowed run is
    // also accelerating more gently. Close enough to half to be unmistakable.
    assert.ok(slowed < full * 0.55, `${slowed.toFixed(2)} against ${full.toFixed(2)}`);
    assert.ok(slowed > full * 0.45, `${slowed.toFixed(2)} against ${full.toFixed(2)}`);
  });

  test(`${build.name}: it does not stretch its own clock`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.slowMotion = build.SLOW_MOTION_TIME;

    // Counted in real frames: five seconds of them and a beat over, since the
    // clock is a running subtraction and lands on zero rather than at it.
    for (let frame = 0; frame < 30 * build.SLOW_MOTION_TIME + 5; frame++) {
      game.update(FRAME, {}, {});
    }

    assert.equal(s.slowMotion, 0, 'the clock it slows is not the one counting it');
  });

  test(`${build.name}: the world's own clock slows with it`, () => {
    const gameTimeOver = (slowMotion) => {
      const game = quietRun(build);
      const s = game.state;
      s.slowMotion = slowMotion;
      for (let frame = 0; frame < 10; frame++) game.update(FRAME, {}, {});
      return s.gameTime;
    };

    assert.ok(
      Math.abs(gameTimeOver(build.SLOW_MOTION_TIME) - gameTimeOver(0) * build.SLOW_MOTION_SCALE) < 1e-9,
      'difficulty progresses at the speed the world is running at'
    );
  });
}

// ----- What the screen says about it -----

for (const build of BUILDS) {
  test(`${build.name}: a drop is drawn with its own glyph`, () => {
    for (const kind of build.POWERUP_KINDS) {
      const game = quietRun(build);
      const s = game.state;
      s.powerups = [{ x: 0, y: s.shipY, z: -60, kind }];
      const screen = new build.ScreenBuffer(80, 24);

      build.renderGame(screen, s);

      const drawn = [...screen.chars].filter((ch) => ch === build.POWERUP_GLYPHS[kind].char);
      assert.ok(drawn.length > 0, `${kind}: its glyph should be on the screen`);
    }
  });

  test(`${build.name}: the three glyphs are told apart`, () => {
    const chars = build.POWERUP_KINDS.map((kind) => build.POWERUP_GLYPHS[kind].char);
    assert.equal(new Set(chars).size, chars.length);
  });

  test(`${build.name}: an active pickup counts itself down on the status strip`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.rapidFire = 7.25;
    s.slowMotion = 3.5;
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, s);
    const strip = rowText(screen, screen.height - 1);

    assert.match(strip, /SPD: /, 'beside the speed it shares the strip with');
    assert.match(strip, /RAPID 7\.3s/);
    assert.match(strip, /SLOW 3\.5s/);
  });

  test(`${build.name}: nothing running, nothing on the strip`, () => {
    const game = quietRun(build);
    const screen = new build.ScreenBuffer(80, 24);

    build.renderGame(screen, game.state);
    const strip = rowText(screen, screen.height - 1);

    assert.doesNotMatch(strip, /RAPID|SLOW/);
  });

  test(`${build.name}: the badges are raised in a fixed order`, () => {
    const state = { rapidFire: 1, slowMotion: 1 };
    assert.deepEqual(
      build.powerupBadges(state).map((badge) => badge.text.trim().split(' ')[0]),
      ['RAPID', 'SLOW']
    );
    assert.deepEqual(build.powerupBadges({ rapidFire: 0, slowMotion: 0 }), []);
  });

  test(`${build.name}: the strip never overruns the border, at any supported width`, () => {
    for (const w of [60, 61, 64, 70, 80, 100, 160]) {
      const game = quietRun(build, w, 24);
      const s = game.state;
      s.muted = true;
      s.rapidFire = 10;
      s.slowMotion = 5;
      const screen = new build.ScreenBuffer(w, 24);

      build.renderGame(screen, s);
      const strip = rowText(screen, 23);

      assert.equal(strip[0], '╚', `width ${w}: left border`);
      assert.equal(strip[w - 1], '╝', `width ${w}: right border`);
      assert.match(strip, /SPD:/, `width ${w}: the speed is never dropped`);
      assert.match(strip, /MUTED/, `width ${w}: nor the mute indicator`);
    }
  });

  test(`${build.name}: both badges fit beside the mute slot at the narrowest grid`, () => {
    const game = quietRun(build, 60, 24);
    const s = game.state;
    s.muted = true;
    s.rapidFire = 10;
    s.slowMotion = 5;
    const screen = new build.ScreenBuffer(60, 24);

    build.renderGame(screen, s);
    const strip = rowText(screen, 23);

    assert.match(strip, /RAPID 10\.0s/);
    assert.match(strip, /SLOW 5\.0s/);
    assert.match(strip, /MUTED/);
  });

  test(`${build.name}: a badge with no room is dropped rather than drawn over`, () => {
    // 60 columns is the narrowest grid the game is laid out for and everything
    // fits on it, so the guard never fires in play. It is here for the grid
    // below that: the renderer draws whatever buffer it is handed, and a
    // badge written past the mute slot would take the border corner with it.
    const game = quietRun(build, 40, 24);
    const s = game.state;
    s.muted = true;
    s.rapidFire = 10;
    s.slowMotion = 5;
    const screen = new build.ScreenBuffer(40, 24);

    build.renderGame(screen, s);
    const strip = rowText(screen, 23);

    assert.match(strip, /RAPID 10\.0s/, 'the first badge still fits');
    assert.doesNotMatch(strip, /SLOW/, 'the second gives way');
    assert.match(strip, /MUTED/, 'and the indicator it would have covered survives');
    assert.equal(strip[39], '╝', 'as does the border corner');
  });
}

// ----- Both builds together -----

test('both builds drop the same powerups from the same seeds', () => {
  assert.deepEqual(dropWalk(browser), dropWalk(terminal));
});

test('both builds agree on the powerup table', () => {
  assert.deepEqual(browser.POWERUP_KINDS, terminal.POWERUP_KINDS);
  for (const kind of terminal.POWERUP_KINDS) {
    assert.deepEqual(browser.POWERUP_GLYPHS[kind], terminal.POWERUP_GLYPHS[kind], `${kind}`);
  }
});
