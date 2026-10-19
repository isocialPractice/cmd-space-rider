// test/boss.test.mjs - The boss encounter: every BOSS_INTERVAL of flying a
// single large mine bears down the tunnel, takes BOSS_HP pulse hits, shoots
// back, and leaves BOSS_DROPS pickups behind when it comes apart.
//
// Six things, each checked on its own because each can fail without the others:
// the clock that opens an encounter, the WARNING that announces it, the boss
// that closes, the shots it sends back, the two ways it leaves the board, and
// the agreement between the block that is drawn and the block that can be shot.
//
// That last one has its own section and is the reason `blockSize` exists. The
// boss is the first entity in this game whose drawn size is not a function of
// depth alone, so it is the first one where the renderer and the pulse cannon's
// hit test could come to state two different targets - a block the player can
// see and aim at that nothing registers against, which is the defect
// `drawBullets` and `placeObstacle` have each already carried a correction for.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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

/**
 * A run with nothing in the tunnel, so only the encounter under test moves.
 *
 * The mine spawn timers are emptied along with the mines themselves: a mine
 * arriving mid-encounter is a second thing a shot could register against, and
 * these tests count what the boss took.
 */
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
  s.mineSpawnTimers = [];
  s.bullets = [];
  s.particles = [];
  s.powerups = [];
  return game;
}

/**
 * A run with the boss already placed where the caller wants it, and the clock
 * wound to the frame after the warning ended.
 *
 * Staged rather than flown to, because flying to one costs three minutes of
 * frames and the cadence is checked on its own below. Nothing here reaches past
 * the fields `spawnBoss` sets.
 */
function stagedBoss(build, z = -40, width = 80, height = 24) {
  const game = quietRun(build, width, height);
  const s = game.state;
  s.boss = { x: 0, y: 2.5, z, hp: build.BOSS_HP, fireTimer: 0 };
  s.bossWarning = 0;
  s.bossTimer = 0;
  return game;
}

/** Fire one volley from the ship's current position, bypassing the key path. */
function volley(game) {
  game.update(FRAME, {}, { SPACE: true });
}

/**
 * A depth at which one frame's volley registers against a boss on the axis.
 *
 * A volley is fired and swept inside a single frame, and `contacts` is a test
 * on the screen rather than on depth - so what decides a contact is whether
 * the tracer is drawn across the target's block, not whether the bolt has
 * flown as far as the target. At this depth the boss's block covers the rows
 * the tracer is drawn on; further out it does not, and a test that fired one
 * volley at a boss at 60 units would read the miss as a boss that survived a
 * hit. Tests that want a landed hit stage here.
 */
const HITTING_Z = -40;

/**
 * Fire exactly one boss shot and take the boss off the board.
 *
 * The second half is what makes it one shot. A boss left up fires again every
 * BOSS_FIRE_INTERVAL, so a test that flew a shot out over a couple of hundred
 * frames would be reading the arrival of whichever shot came last. Removing
 * the boss is legitimate rather than a trick: a shot outliving its owner is
 * `updateBossShots`' own rule, and the test below pins it.
 */
function oneShot(build, game) {
  const s = game.state;
  s.boss.fireTimer = build.BOSS_FIRE_INTERVAL;
  game.update(FRAME, {}, {});
  s.boss = null;
  return s.bossShots[0];
}

// ----- The clock -----

for (const build of BUILDS) {
  test(`${build.name}: a run opens with no boss, no warning and a cold clock`, () => {
    const s = quietRun(build).state;
    assert.equal(s.boss, null);
    assert.deepEqual(s.bossShots, []);
    assert.equal(s.bossTimer, 0);
    assert.equal(s.bossWarning, 0);
  });

  test(`${build.name}: nothing is announced before the interval is flown`, () => {
    const game = quietRun(build);
    const s = game.state;

    // Parked a frame short of the boundary, so the next frame is the crossing
    // and nothing before it is.
    s.bossTimer = build.BOSS_INTERVAL - FRAME * 1.5;
    game.update(FRAME, {}, {});

    assert.equal(s.bossWarning, 0, 'still short of the interval');
    assert.equal(s.boss, null);
  });

  test(`${build.name}: crossing the interval raises the warning at its full length`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossTimer = build.BOSS_INTERVAL - FRAME / 2;
    game.update(FRAME, {}, {});

    assert.equal(s.bossWarning, build.BOSS_WARNING_TIME);
    assert.equal(s.boss, null, 'the warning is the notice, not the arrival');
  });

  test(`${build.name}: the boss is placed when the warning runs out`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossWarning = FRAME / 2;
    game.update(FRAME, {}, {});

    assert.equal(s.bossWarning, 0);
    assert.notEqual(s.boss, null);
  });

  test(`${build.name}: the clock is held while a warning runs`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossWarning = build.BOSS_WARNING_TIME;
    s.bossTimer = build.BOSS_INTERVAL;

    game.update(FRAME, {}, {});

    assert.equal(s.bossTimer, build.BOSS_INTERVAL, 'the gap is flying, not warning');
  });

  test(`${build.name}: the clock is held while a boss is on the board`, () => {
    const game = stagedBoss(build, -150);
    const s = game.state;

    for (let i = 0; i < 20; i++) game.update(FRAME, {}, {});

    assert.equal(s.bossTimer, 0, 'an encounter does not count toward the next');
  });

  test(`${build.name}: a warning is held off under a warp banner and not skipped`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossTimer = build.BOSS_INTERVAL + 10;
    s.warpFlash = FRAME * 3;

    game.update(FRAME, {}, {});
    assert.equal(s.bossWarning, 0, 'the row belongs to the warp banner');

    // The timer was left where it was rather than reset, so the warning opens on
    // the first frame the row is free - which is the frame the flash decays to
    // zero on, since the decay runs before the gate reads it.
    while (s.warpFlash > 0) game.update(FRAME, {}, {});
    assert.equal(s.bossWarning, build.BOSS_WARNING_TIME);
  });

  test(`${build.name}: a warning is held off inside an asteroid field section`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossTimer = build.BOSS_INTERVAL + 10;
    s.asteroidTime = 5;

    game.update(FRAME, {}, {});

    // The stronger of the two cases: the section's banner holds this row for the
    // whole fifteen seconds and is drawn before the warning, so a warning raised
    // inside one would not be drawn at all.
    assert.equal(s.bossWarning, 0);

    s.asteroidTime = 0;
    game.update(FRAME, {}, {});
    assert.equal(s.bossWarning, build.BOSS_WARNING_TIME);
  });

  test(`${build.name}: the first warning of a run is due on a warp frame`, () => {
    // Stated by BOSS_INTERVAL and worth pinning, because it is the one case the
    // timer does not separate from `gameTime`: nothing has reset the timer by
    // the first encounter, so it reads the same 180 the warp step does. The
    // gate above is what handles it, not the choice of clock.
    assert.equal(build.BOSS_INTERVAL % build.WARP_INTERVAL, 0);
  });

  test(`${build.name}: one section and three warp steps come before the first warning`, () => {
    // BOSS_INTERVAL's closing sentence prices the interval in what the player
    // has already been shown, and both halves of that figure are engine state
    // nothing else pins. It read "two asteroid field sections" until a run was
    // flown and counted: a section's own clock is an interval of flying too, so
    // openings fall at 150 and 315 seconds while the encounter is due at 180.
    //
    // Flown rather than staged, because that is the whole claim - the counts are
    // what three minutes of the cadence produces, not what a rig can be set to.
    // The shield is held up so a collision cannot end the run before 180
    // seconds, and nothing else is touched.
    const game = quietRun(build);
    const s = game.state;

    let sections = 0;
    let warps = 0;
    let open = s.asteroidTime > 0;
    let level = s.warpLevel;

    for (let i = 0; i < 30 * 240 && s.bossWarning === 0; i++) {
      s.shield = 100;
      game.update(FRAME, {}, {});
      if (!open && s.asteroidTime > 0) sections++;
      if (s.warpLevel > level) warps++;
      open = s.asteroidTime > 0;
      level = s.warpLevel;
    }

    assert.ok(s.bossWarning > 0, 'the first warning was reached');
    assert.equal(sections, 1, `asteroid field sections before the first warning: ${sections}`);
    assert.equal(warps, 3, `warp steps before the first warning: ${warps}`);
    // 180 plus the two seconds the warp gate holds the warning for, which is
    // the first-collision case BOSS_INTERVAL describes doing its job.
    assert.ok(s.gameTime > build.BOSS_INTERVAL, 'the warning waited for the row');
    assert.ok(s.gameTime < build.BOSS_INTERVAL + build.WARP_FLASH_TIME + 1,
      `the warning landed at ${s.gameTime.toFixed(2)}`);
    assert.equal(s.warpLevel, 4);
  });

  test(`${build.name}: no boss in a debug scenario`, () => {
    const game = new build.Game();
    game.startGame('mines');
    const s = game.state;
    s.bossTimer = build.BOSS_INTERVAL + 10;

    for (let i = 0; i < 10; i++) game.update(FRAME, {}, {});

    assert.equal(s.bossWarning, 0);
    assert.equal(s.boss, null);
  });

  test(`${build.name}: a pause holds the warning and the approach`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossWarning = build.BOSS_WARNING_TIME;
    s.paused = true;

    for (let i = 0; i < 10; i++) game.update(FRAME, {}, {});

    // The warning is about the world, so it stops with the world - the same
    // clock an open asteroid section is counted on, not the presentation clock
    // the banner blinks on.
    assert.equal(s.bossWarning, build.BOSS_WARNING_TIME);
    assert.equal(s.boss, null);
  });
}

// ----- The boss -----

for (const build of BUILDS) {
  test(`${build.name}: it is placed on the axis at the edge of sight, at full health`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossWarning = FRAME / 2;
    game.update(FRAME, {}, {});

    assert.equal(s.boss.x, 0, 'the one column the corridor is never narrower than');
    assert.equal(s.boss.y, 2.5, 'the middle of the placement band');
    // Placed and then advanced inside the one frame, which is the arrangement
    // `openAsteroidField` already has with `updateObstacles`: both happen on the
    // frame boundary rather than a frame out from it.
    assert.ok(Math.abs(s.boss.z - (-build.BOSS_SPAWN_Z + build.BOSS_CLOSE_SPEED * FRAME)) < 1e-9,
      `placed at ${s.boss.z}`);
    assert.equal(s.boss.hp, build.BOSS_HP);
    // Its cadence opens at zero, so the first shot is a full BOSS_FIRE_INTERVAL
    // away rather than fired on arrival - all that is on the timer here is the
    // one frame it was placed and stepped in.
    assert.ok(Math.abs(s.boss.fireTimer - FRAME) < 1e-9, `timer at ${s.boss.fireTimer}`);
    assert.deepEqual(s.bossShots, [], 'it does not open fire as it appears');
  });

  test(`${build.name}: it closes at its own rate, not the tunnel's`, () => {
    const game = stagedBoss(build, -150);
    const s = game.state;
    const was = s.boss.z;

    game.update(FRAME, {}, {});

    assert.ok(Math.abs((s.boss.z - was) - build.BOSS_CLOSE_SPEED * FRAME) < 1e-9);
  });

  test(`${build.name}: a faster run does not shorten the approach`, () => {
    // The point of BOSS_CLOSE_SPEED. Everything else in the tunnel arrives at
    // whatever speed the run has reached, so a late run would meet a boss that
    // had crossed the screen in a fraction of the time.
    const slow = stagedBoss(build, -150);
    const fast = stagedBoss(build, -150);
    fast.state.speed = slow.state.speed * 4;
    fast.state.baseSpeed = slow.state.baseSpeed * 4;

    slow.update(FRAME, {}, {});
    fast.update(FRAME, {}, {});

    assert.equal(fast.state.boss.z, slow.state.boss.z);
  });

  test(`${build.name}: the approach is the figure the constants quote`, () => {
    // BOSS_HP's comment prices twenty hits against "about fourteen seconds", and
    // BOSS_FIRE_INTERVAL's against "about nine" shots. Both are arithmetic off
    // the constants, so they are pinned here rather than measured.
    const approach = build.BOSS_SPAWN_Z / build.BOSS_CLOSE_SPEED;
    assert.ok(approach > 14 && approach < 15, `approach is ${approach}s`);

    const shots = Math.floor(approach / build.BOSS_FIRE_INTERVAL);
    assert.equal(shots, 9);

    const perHit = approach / build.BOSS_HP;
    assert.ok(perHit > 0.7 && perHit < 0.75, `a hit every ${perHit}s`);
    assert.ok(perHit > build.FIRE_INTERVAL, "inside the cannon's own cadence");
  });

  test(`${build.name}: a shot takes one hit point off it`, () => {
    const game = stagedBoss(build, -30);
    const s = game.state;
    volley(game);

    assert.ok(s.boss.hp < build.BOSS_HP, 'the volley registered');
    assert.ok(s.boss.hp >= build.BOSS_HP - 3, 'a volley is three bolts, not twenty');
  });

  test(`${build.name}: it takes BOSS_HP contacts to bring down`, () => {
    const game = stagedBoss(build, HITTING_Z);
    const s = game.state;

    // Flown through the real path rather than counted down by hand, so what is
    // pinned is the number of contacts the engine actually asks for. The depth
    // is held between volleys so every one meets the same target, and the
    // return fire is cleared because the shield is not what is under test.
    let contacts = 0;
    for (let guard = 0; guard < 500 && s.boss !== null; guard++) {
      const hp = s.boss.hp;
      s.boss.z = HITTING_Z;
      s.bossShots = [];
      s.shield = 100;
      volley(game);
      contacts += s.boss === null ? hp : hp - s.boss.hp;
    }

    assert.equal(s.boss, null, 'it came down');
    assert.equal(contacts, build.BOSS_HP);
  });
}

// ----- The return fire -----

for (const build of BUILDS) {
  test(`${build.name}: it fires on its own cadence`, () => {
    const game = stagedBoss(build, -100);
    const s = game.state;

    const frames = Math.ceil(build.BOSS_FIRE_INTERVAL / FRAME) - 1;
    for (let i = 0; i < frames; i++) game.update(FRAME, {}, {});
    assert.equal(s.bossShots.length, 0, 'nothing before the interval');

    game.update(FRAME, {}, {});
    assert.equal(s.bossShots.length, 1);
  });

  test(`${build.name}: a shot is aimed at where the ship was when it left`, () => {
    const game = stagedBoss(build, -100);
    const s = game.state;
    s.shipX = 3;
    s.shipY = 4;
    const shot = oneShot(build, game);

    // The velocity is a direction scaled to one speed, so the three components
    // come back to BOSS_SHOT_SPEED.
    const speed = Math.hypot(shot.vx, shot.vy, shot.vz);
    assert.ok(Math.abs(speed - build.BOSS_SHOT_SPEED) < 1e-9, `speed is ${speed}`);

    // And the line of it reaches the ship. Measured from where the shot is now
    // rather than from the boss: `updateBossShots` runs after `updateBoss` in
    // the same frame, so a shot has already taken its first step by the time a
    // test can see it.
    const flight = -shot.z / shot.vz;
    assert.ok(Math.abs(shot.x + shot.vx * flight - 3) < 1e-6,
      `reaches ${shot.x + shot.vx * flight} in x, not 3`);
    assert.ok(Math.abs(shot.y + shot.vy * flight - 4) < 1e-6,
      `reaches ${shot.y + shot.vy * flight} in y, not 4`);
  });

  test(`${build.name}: a ship that stays put is hit, and it costs BOSS_SHOT_DAMAGE`, () => {
    const game = stagedBoss(build, -60);
    const s = game.state;
    oneShot(build, game);
    assert.equal(s.bossShots.length, 1);

    const shield = s.shield;
    // Flown rather than teleported, so the hit is the collision the player sees
    // and not a staged one.
    for (let i = 0; i < 200 && s.bossShots.length > 0; i++) game.update(FRAME, {}, {});

    assert.equal(s.shield, shield - build.BOSS_SHOT_DAMAGE);
    assert.equal(s.bossShots.length, 0, 'the shot is spent either way');
  });

  test(`${build.name}: moving out of the way is a miss`, () => {
    const game = stagedBoss(build, -60);
    const s = game.state;
    s.shipX = -5;
    oneShot(build, game);
    assert.equal(s.bossShots.length, 1);

    const shield = s.shield;
    s.shipX = 5;
    for (let i = 0; i < 200 && s.bossShots.length > 0; i++) game.update(FRAME, {}, {});

    assert.equal(s.shield, shield, 'the shot went where the ship had been');
  });

  test(`${build.name}: a barrel roll turns a shot aside and spends it`, () => {
    const game = stagedBoss(build, -60);
    const s = game.state;
    oneShot(build, game);

    const shield = s.shield;
    for (let i = 0; i < 200 && s.bossShots.length > 0; i++) {
      // Held open frame by frame, so the roll is live on whichever frame the
      // shot arrives on.
      s.shipRoll = 1;
      game.update(FRAME, {}, {});
    }

    assert.equal(s.shield, shield, 'nothing can touch the ship while it rolls');
    assert.equal(s.bossShots.length, 0, 'and the shot is not left to try again');
  });

  test(`${build.name}: shots outlive the boss that sent them`, () => {
    const game = stagedBoss(build, HITTING_Z);
    const s = game.state;
    s.boss.fireTimer = build.BOSS_FIRE_INTERVAL;
    game.update(FRAME, {}, {});
    assert.equal(s.bossShots.length, 1);

    s.boss.hp = 1;
    s.boss.z = HITTING_Z;
    volley(game);
    assert.equal(s.boss, null, 'the boss is down');
    assert.equal(s.bossShots.length, 1, 'its last shot is still in the air');

    const shield = s.shield;
    for (let i = 0; i < 200 && s.bossShots.length > 0; i++) game.update(FRAME, {}, {});
    assert.equal(s.shield, shield - build.BOSS_SHOT_DAMAGE);
  });

  test(`${build.name}: a shot that reaches a spent shield ends the run`, () => {
    const game = stagedBoss(build, -60);
    const s = game.state;
    s.shield = build.BOSS_SHOT_DAMAGE;
    oneShot(build, game);

    for (let i = 0; i < 200 && s.mode === 'playing'; i++) game.update(FRAME, {}, {});

    assert.equal(s.shield, 0);
    assert.notEqual(s.mode, 'playing');
  });
}

// ----- Leaving the board -----

for (const build of BUILDS) {
  test(`${build.name}: shot down, it leaves BOSS_DROPS pickups, one of each kind`, () => {
    const game = stagedBoss(build, -40);
    const s = game.state;
    s.boss.hp = 1;
    volley(game);

    assert.equal(s.powerups.length, build.BOSS_DROPS);
    assert.deepEqual(s.powerups.map((p) => p.kind), build.POWERUP_KINDS);
  });

  test(`${build.name}: BOSS_DROPS is the number of kinds there are`, () => {
    // One source drops all of them, so a fourth kind added without a thought
    // here would leave it undroppable by the only thing that drops the set.
    assert.equal(build.BOSS_DROPS, build.POWERUP_KINDS.length);
  });

  test(`${build.name}: the three drops are spread rather than stacked`, () => {
    const game = stagedBoss(build, -40);
    const s = game.state;
    s.boss.hp = 1;
    volley(game);

    const xs = s.powerups.map((p) => p.x);
    assert.equal(new Set(xs).size, build.BOSS_DROPS, 'no two share a column');
    assert.ok(Math.abs(xs[1] - xs[0] - build.BOSS_DROP_SPREAD) < 1e-9);
    assert.ok(Math.abs(xs[2] - xs[1] - build.BOSS_DROP_SPREAD) < 1e-9);
  });

  for (const [width, height] of [[60, 20], [80, 24], [128, 45]]) {
    test(`${build.name}: the three drops hold three cells at every drawn depth, ${width}x${height}`, () => {
      // Walked at the narrowest grid first, because that is where it failed and
      // the rest of this file stages at 80x24. BOSS_DROP_SPREAD is a world
      // distance and the drawn gap narrows with depth and with the grid's width
      // together, so 1.5 units put two of the three in one cell at 60 columns
      // from z=-189 out - the row rendered `+~` where it should have rendered
      // `+ ! ~`, showing two pickups for a kill that paid three.
      //
      // A unit at a time rather than a coarser step: the crossing was a single
      // unit wide. Killed through `killBoss` so the drops come from
      // `dropBossPowerups` at exactly the depth under test, and the burst that
      // call raises is cleared before the frame is read - it is drawn after the
      // drops and over them, and it is not what this is about.
      const glyphs = build.POWERUP_KINDS.map((k) => build.POWERUP_GLYPHS[k].char);
      let drawnAt = 0;

      for (let z = -5; z >= -build.BOSS_SPAWN_Z; z--) {
        const game = stagedBoss(build, z, width, height);
        const s = game.state;
        game.killBoss(s.boss);
        s.particles = [];

        const screen = new build.ScreenBuffer(width, height);
        build.renderGame(screen, s);

        const cells = new Set();
        const kinds = new Set();
        for (let y = HUD_ROWS; y < height - FOOTER_ROWS; y++) {
          const row = rowText(screen, y);
          for (let x = 0; x < width; x++) {
            if (glyphs.includes(row[x])) { cells.add(`${x},${y}`); kinds.add(row[x]); }
          }
        }
        if (cells.size === 0) continue; // too far out to be drawn at all

        drawnAt++;
        assert.equal(cells.size, build.BOSS_DROPS,
          `z=${z}: ${cells.size} cells for ${build.BOSS_DROPS} drops`);
        assert.equal(kinds.size, build.BOSS_DROPS,
          `z=${z}: ${[...kinds].join('')} drawn, not all ${build.BOSS_DROPS} kinds`);
      }

      assert.ok(drawnAt > 150, `only ${drawnAt} depths drew the drops at all`);
    });
  }

  test(`${build.name}: the spread only widens where the projection is tight`, () => {
    // `bossDropSpread`'s floor is BOSS_DROP_SPREAD, and the floor is what holds
    // everywhere near the ship and on every grid from 80 columns up. Pinned
    // because the near end is what widening the constant instead would have
    // cost: a drop placed further out on a point-blank kill is past the ship
    // before it can be collected.
    assert.equal(build.bossDropSpread(1, 80, 8), build.BOSS_DROP_SPREAD);
    assert.equal(build.bossDropSpread(1, 60, 8), build.BOSS_DROP_SPREAD);
    assert.equal(build.bossDropSpread(0.15, 128, 8), build.BOSS_DROP_SPREAD);

    // And it is above the floor exactly where a column is worth more than the
    // floor is: at the 60-column grid's far end, and never by much.
    const far = build.bossDropSpread(0.15, 60, 8);
    assert.ok(far > build.BOSS_DROP_SPREAD, `${far} is not wider than the floor`);
    assert.ok(far < 2, `${far} is wider than the placement band wants`);
  });

  test(`${build.name}: a kill is worth BOSS_SCORE and chains like any other`, () => {
    const game = stagedBoss(build, -40);
    const s = game.state;
    s.score = 0;
    s.combo = 0;
    s.boss.hp = 1;
    volley(game);

    // The distance score moves on the same frame, so the kill is read as the
    // step above whatever that was rather than as the whole total.
    assert.ok(s.score >= build.BOSS_SCORE, `score is ${s.score}`);
    assert.equal(s.combo, 1, 'a lone kill opens the chain');
  });

  test(`${build.name}: a kill restarts the clock on the next encounter`, () => {
    const game = stagedBoss(build, -40);
    const s = game.state;
    s.bossTimer = build.BOSS_INTERVAL;
    s.boss.hp = 1;
    volley(game);

    assert.equal(s.boss, null);
    assert.equal(s.bossTimer, 0);
    assert.equal(s.bossWarning, 0);
  });

  test(`${build.name}: rammed, it costs BOSS_RAM_DAMAGE and pays nothing`, () => {
    const game = stagedBoss(build, -build.BOSS_CLOSE_SPEED * FRAME / 2);
    const s = game.state;
    s.score = 0;
    const shield = s.shield;

    game.update(FRAME, {}, {});

    assert.equal(s.boss, null, 'it destroys itself on the way');
    assert.equal(s.shield, shield - build.BOSS_RAM_DAMAGE);
    assert.deepEqual(s.powerups, [], 'a boss that was not shot down pays no drops');
    assert.ok(s.score < build.BOSS_SCORE, 'and no score');
  });

  test(`${build.name}: rolling through a ram turns the damage aside, not the boss`, () => {
    const game = stagedBoss(build, -build.BOSS_CLOSE_SPEED * FRAME / 2);
    const s = game.state;
    s.shipRoll = 1;
    const shield = s.shield;

    game.update(FRAME, {}, {});

    assert.equal(s.shield, shield);
    assert.equal(s.boss, null, 'the roll is an escape, not a way to leave it up');
  });

  test(`${build.name}: a ram onto a spent shield ends the run`, () => {
    const game = stagedBoss(build, -build.BOSS_CLOSE_SPEED * FRAME / 2);
    const s = game.state;
    s.shield = build.BOSS_RAM_DAMAGE;

    game.update(FRAME, {}, {});

    assert.equal(s.shield, 0);
    assert.notEqual(s.mode, 'playing');
  });
}

// ----- The block that is drawn and the block that can be shot -----

for (const build of BUILDS) {
  test(`${build.name}: blockSize is the mine's own formula at a multiplier of one`, () => {
    for (const scale of [0.15, 0.4, 0.575, 0.83, 1]) {
      assert.equal(build.blockSize(scale), Math.max(1, Math.floor(scale * 2.5)));
    }
  });

  test(`${build.name}: the boss block is the size BOSS_SIZE_MULT quotes`, () => {
    // Its comment prices the multiplier at "8 cells across when the boss reaches
    // the ship and 1 at the edge of sight, against a mine's 2 and 1". The two
    // scales are the ends of the projection: 1 at the ship, 0.15 at maxViewZ.
    assert.equal(build.blockSize(1, build.BOSS_SIZE_MULT), 8);
    assert.equal(build.blockSize(0.15, build.BOSS_SIZE_MULT), 1);
    assert.equal(build.blockSize(1), 2);
    assert.equal(build.blockSize(0.15), 1);
  });

  test(`${build.name}: the drawn block is 9 cells across and a mine's 3`, () => {
    // The figures BOSS_SIZE_MULT's comment quotes, read off the painted canvas
    // rather than off the function. The two are a cell apart and the comment
    // used to quote the function's pair as the drawn one: `drawBlock` takes
    // `half = floor(size / 2)` and loops `-half` to `+half` inclusive, so
    // `blockSize`'s 8 paints 9 columns and its 2 paints 3.
    //
    // The ship is parked out of the way and off the axis, because at z=0 it is
    // drawn over the middle of the block and would eat cells out of a count.
    for (const [kind, chars, across] of [['boss', '◉◎', 9], ['mine', '◈■', 3]]) {
      const game = quietRun(build, 80, 24);
      const s = game.state;
      s.shipX = 6;
      s.shipY = 0.5;
      if (kind === 'boss') {
        s.boss = { x: 0, y: 2.5, z: 0, hp: build.BOSS_HP, fireTimer: 0 };
        s.bossWarning = 0;
        s.bossTimer = 0;
      } else {
        s.mines = [{ x: 0, y: 2.5, z: 0, rot: 0, rotSpeed: 0, scale: 1, hp: 5 }];
      }

      const screen = new build.ScreenBuffer(80, 24);
      build.renderGame(screen, s);

      const cols = new Set();
      const rows = new Set();
      for (let y = HUD_ROWS; y < 24 - FOOTER_ROWS; y++) {
        const row = rowText(screen, y);
        for (let x = 0; x < 80; x++) {
          if (chars.includes(row[x])) { cols.add(x); rows.add(y); }
        }
      }
      assert.equal(cols.size, across, `${kind} drawn ${cols.size} cells across`);
      assert.equal(rows.size, across, `${kind} drawn ${rows.size} cells down`);
    }
  });

  test(`${build.name}: a close boss is about half the play area, not two fifths`, () => {
    // The other half of BOSS_SIZE_MULT's figures. Measured at both grids the
    // comment names, and the narrow one is the point: 20 rows is the floor both
    // builds enforce, not the 24 the comment used to call one, and the block is
    // clipped to 8 of the 15 play rows there rather than filling 9 of 19.
    for (const [height, playRows, blockRows] of [[24, 19, 9], [20, 15, 8]]) {
      const game = quietRun(build, 80, height);
      const s = game.state;
      s.shipX = 6;
      s.shipY = 0.5;
      s.boss = { x: 0, y: 2.5, z: 0, hp: build.BOSS_HP, fireTimer: 0 };
      s.bossWarning = 0;
      s.bossTimer = 0;

      const screen = new build.ScreenBuffer(80, height);
      build.renderGame(screen, s);

      const rows = new Set();
      for (let y = HUD_ROWS; y < height - FOOTER_ROWS; y++) {
        const row = rowText(screen, y);
        for (const ch of row) if (ch === '◉' || ch === '◎') { rows.add(y); break; }
      }
      assert.equal(height - HUD_ROWS - FOOTER_ROWS, playRows);
      assert.equal(rows.size, blockRows, `${height} rows: block over ${rows.size} of ${playRows}`);
    }

    // 8 of 15 is 53.3% and 9 of 19 is 47.4% - the two shares the comment quotes,
    // and over half at the floor rather than the two fifths it used to claim.
    assert.equal((8 / 15 * 100).toFixed(1), '53.3');
    assert.equal((9 / 19 * 100).toFixed(1), '47.4');
  });

  test(`${build.name}: the floor those shares are quoted at is 20 rows in both builds`, () => {
    // The correction above rests on it, and the 24 it replaces is still in
    // `src/index.ts` a few lines up as the fallback for an undefined
    // `stdout.rows` - which is how the comment came to call it the floor.
    const entry = readFileSync(join(REPO_ROOT, 'src', 'index.ts'), 'utf8');
    const page = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
    assert.match(entry, /const MIN_HEIGHT = 20;/);
    assert.match(page, /const MIN_HEIGHT=20;/);
  });

  test(`${build.name}: the box the ship collides with is the block that was drawn`, () => {
    // The fourth reader of `blockSize`. `drawEntitiesFar` and `contacts` are
    // pinned above and below; the ship's own obstacle and mine boxes sized the
    // same block longhand until this release, so the one thing nothing asserted
    // was that the ship collides with what it can see.
    //
    // Written without naming the formula, because naming it would only restate
    // it: the ship's sprite paints three columns and the block paints its own,
    // and a contact has to register on exactly the frames those two sets share
    // a column. The obstacle's columns are read from a frame with the ship
    // parked clear of it, since the ship is drawn last and over the block.
    const z = -2;
    const stage = (shipX, withObstacle) => {
      const game = quietRun(build, 80, 24);
      const s = game.state;
      s.shipX = shipX;
      if (withObstacle) {
        s.obstacles = [{ x: 0, y: s.shipY, z, rot: 0, rotSpeed: 0, scale: 1 }];
      }
      return game;
    };
    const paint = (game) => {
      const screen = new build.ScreenBuffer(80, 24);
      build.renderGame(screen, game.state);
      const out = [];
      for (let y = 0; y < 24; y++) out.push(rowText(screen, y));
      return out;
    };
    const noseColumn = (rows) => {
      for (const row of rows) {
        const x = row.indexOf('▲');
        if (x >= 0) return x;
      }
      return -1;
    };

    const withIt = paint(stage(6.5, true));
    const without = paint(stage(6.5, false));
    const blockCols = new Set();
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 80; x++) {
        if (withIt[y][x] !== without[y][x]) blockCols.add(x);
      }
    }
    assert.equal(blockCols.size, 3, `the block paints ${blockCols.size} columns`);

    let checked = 0;
    for (let step = 60; step >= -60; step--) {
      const shipX = step / 20;
      const nose = noseColumn(paint(stage(shipX, true)));
      assert.ok(nose >= 0, `the ship is drawn at shipX ${shipX}`);
      const shares = [nose - 1, nose, nose + 1].some((c) => blockCols.has(c));

      const game = stage(shipX, true);
      const before = game.state.shield;
      game.update(FRAME, {}, {});
      const registered = game.state.shield < before;

      assert.equal(registered, shares,
        `shipX ${shipX}: contact ${registered}, shared column ${shares}`);
      checked++;
    }
    assert.equal(checked, 121);
  });

  test(`${build.name}: the drawn block is wider than a mine's at the same depth`, () => {
    const game = stagedBoss(build, -40);
    const s = game.state;
    s.mines = [{ x: 4, y: 2.5, z: -40, rot: 0, rotSpeed: 0, scale: 1, hp: 5 }];

    const screen = new build.ScreenBuffer(80, 24);
    build.renderGame(screen, s);

    let bossCells = 0;
    let mineCells = 0;
    for (let y = HUD_ROWS; y < 24 - FOOTER_ROWS; y++) {
      const row = rowText(screen, y);
      for (const ch of row) {
        if (ch === '◉' || ch === '◎') bossCells++;
        if (ch === '◈' || ch === '■') mineCells++;
      }
    }
    assert.ok(bossCells > 0, 'the boss is drawn');
    assert.ok(mineCells > 0, 'so is the mine, for the comparison');
    assert.ok(bossCells > mineCells, `${bossCells} boss cells against ${mineCells}`);
  });

  test(`${build.name}: a shot landing on the block's outer ring registers`, () => {
    // The regression this section exists for. A hit test reading the boss at a
    // multiplier of 1 would take only the middle of a block the player can
    // plainly see, so a bolt lined up on the edge of it would pass through and
    // the rock would not die - twenty hits to land and most of the target inert.
    //
    // The ring is found off the drawn block rather than guessed: the boss is
    // parked where its block is several cells wide, and the ship is walked out
    // in x until a volley stops registering. The furthest column that still
    // registers has to be outside the middle cell.
    const atOffset = (dx) => {
      const game = stagedBoss(build, -40);
      const s = game.state;
      s.shipX = dx;
      volley(game);
      return s.boss.hp < build.BOSS_HP;
    };

    assert.ok(atOffset(0), 'dead on registers');

    let furthest = 0;
    for (let dx = 0.25; dx <= 6.5; dx += 0.25) {
      if (!atOffset(dx)) break;
      furthest = dx;
    }

    // One world unit out at this depth is several columns, so a hit test reading
    // the unmultiplied block could not reach it.
    assert.ok(furthest >= 1, `a volley registered from ${furthest} units off axis`);
  });

  test(`${build.name}: a shot well clear of the block registers nothing`, () => {
    const game = stagedBoss(build, -40);
    const s = game.state;
    s.shipX = 6.5;
    volley(game);
    assert.equal(s.boss.hp, build.BOSS_HP, 'the multiplier is a size, not a licence');
  });
}

// ----- The HUD -----

for (const build of BUILDS) {
  const hudRow = (game, width = 80, height = 24) => {
    const screen = new build.ScreenBuffer(width, height);
    build.renderGame(screen, game.state);
    return rowText(screen, HUD_ROWS);
  };

  /** The grids the banner row is read at: the floor, the default, and a wide one. */
  const BANNER_GRIDS = [[60, 20], [80, 24], [128, 45]];

  test(`${build.name}: the warning banner holds the row while it runs`, () => {
    const game = quietRun(build);
    game.state.bossWarning = build.BOSS_WARNING_TIME;
    assert.match(hudRow(game), /WARNING/);
  });

  test(`${build.name}: no warning, no banner`, () => {
    const game = quietRun(build);
    assert.doesNotMatch(hudRow(game), /WARNING/);
  });

  test(`${build.name}: the warning beats the two banners it can collide with`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossWarning = build.BOSS_WARNING_TIME;
    s.warpFlash = build.WARP_FLASH_TIME;
    s.asteroidTime = 5;

    const row = hudRow(game);
    assert.match(row, /WARNING/);
    assert.doesNotMatch(row, /WARP LEVEL/);
    assert.doesNotMatch(row, /ASTEROID FIELD/);
  });

  for (const [width, height] of BANNER_GRIDS) {
    test(`${build.name}: a warning over another banner is the warning alone, ${width}x${height}`, () => {
      // The row carries one banner, and it used to carry the union of two.
      // `drawHUD` writes all four centred on HUD_ROWS in priority order with
      // nothing clearing the row between two writes, so a shorter banner over a
      // longer one covered the longer one's middle and left its ends standing:
      // a warning inside a section rendered `>> >> WARNING <<D <<`, the stray
      // `D` being the `D` of `FIELD`, and a warning across a warp step rendered
      // `>>>> WARNING << <<`. Both at every width, which is why this is read at
      // three of them - it was a draw-order defect, not a narrow-grid one.
      for (const over of ['asteroidTime', 'warpFlash']) {
        const game = quietRun(build, width, height);
        const s = game.state;
        s.bossWarning = build.BOSS_WARNING_TIME;
        s.warpLevel = 2;
        s[over] = over === 'asteroidTime' ? build.ASTEROID_TIME : build.WARP_FLASH_TIME;

        assert.equal(hudRow(game, width, height).trim(), '>> WARNING <<',
          `with ${over} live`);
      }
    });

    test(`${build.name}: a new best over a section is the new best alone, ${width}x${height}`, () => {
      // The fourth banner has the same defect from the other end: `[ NEW BEST ]`
      // is 12 characters against the section's 20, so it rendered
      // `>> A[ NEW BEST ]D <<`.
      const game = quietRun(build, width, height);
      const s = game.state;
      s.newBestFlash = build.NEW_BEST_FLASH_TIME;
      s.asteroidTime = build.ASTEROID_TIME;

      assert.equal(hudRow(game, width, height).trim(), '[ NEW BEST ]');
    });

    test(`${build.name}: blanking the field leaves the row's two readouts, ${width}x${height}`, () => {
      // What bounds the blanked span. The combo counter is left-aligned on this
      // row and the boss readout right-aligned, and the field is centred and 20
      // wide - the width of the widest banner it can carry. Read with the
      // longest form of each up together, which is the tightest the row gets.
      const game = quietRun(build, width, height);
      const s = game.state;
      s.combo = build.COMBO_MAX;
      s.boss = { x: 0, y: 2.5, z: -40, hp: build.BOSS_HP, fireTimer: 0 };
      s.bossWarning = build.BOSS_WARNING_TIME;
      s.asteroidTime = build.ASTEROID_TIME;

      const row = hudRow(game, width, height);
      assert.match(row, new RegExp(`COMBO x${build.COMBO_MAX}`));
      assert.match(row, new RegExp(`BOSS ${build.BOSS_HP}/${build.BOSS_HP}`));
      assert.equal(row.trim().replace(/\s{2,}/g, ' '),
        `COMBO x${build.COMBO_MAX} >> WARNING << BOSS ${build.BOSS_HP}/${build.BOSS_HP}`);
    });
  }

  for (const [width, height] of [[60, 20], [80, 24]]) {
    test(`${build.name}: the frame that garbled the row is flown to, ${width}x${height}`, () => {
      // The reachability, rather than a staged pair of fields. The gate in
      // `updateBossEncounter` holds a warning off while a banner is up, but it
      // gates raising one and not the three seconds it then runs, and
      // `updateAsteroidField` runs before it held off only by a warp flash - so
      // a section coming due inside a live warning opens under it.
      const game = quietRun(build, width, height);
      const s = game.state;
      s.bossTimer = build.BOSS_INTERVAL - FRAME / 2;
      s.asteroidTimer = build.ASTEROID_INTERVAL - 1.5;
      // Three minutes of flying scores enough to cross a cold best, and NEW
      // BEST is the one banner that beats a warning. It wins the row by design
      // and is pinned below; marking it shown keeps it off this frame.
      s.newBestShown = true;

      let reached = false;
      for (let i = 0; i < 100 && !reached; i++) {
        s.shield = 100;
        game.update(FRAME, {}, {});
        reached = s.bossWarning > 0 && s.asteroidTime > 0;
      }

      assert.ok(reached, 'a frame carries both the warning and an open section');
      assert.equal(s.bossWarning.toFixed(2), '1.50');
      assert.equal(s.asteroidTime.toFixed(2), '15.00');
      assert.equal(hudRow(game, width, height).trim(), '>> WARNING <<');
    });
  }

  test(`${build.name}: NEW BEST still wins the row`, () => {
    const game = quietRun(build);
    const s = game.state;
    s.bossWarning = build.BOSS_WARNING_TIME;
    s.newBestFlash = build.NEW_BEST_FLASH_TIME;

    assert.match(hudRow(game), /NEW BEST/);
  });

  test(`${build.name}: a debug run shows no warning`, () => {
    const game = new build.Game();
    game.startGame('mines');
    game.state.screenWidth = 80;
    game.state.screenHeight = 24;
    game.state.bossWarning = build.BOSS_WARNING_TIME;

    assert.doesNotMatch(hudRow(game), /WARNING/);
  });

  test(`${build.name}: the hit points are read back while a fight is under way`, () => {
    const game = stagedBoss(build, -40);
    game.state.boss.hp = 17;
    assert.match(hudRow(game), new RegExp(`BOSS 17/${build.BOSS_HP}`));
  });

  test(`${build.name}: no boss, no readout`, () => {
    assert.doesNotMatch(hudRow(quietRun(build)), /BOSS /);
  });
}

// ----- What the encounter costs the RNG -----

for (const build of BUILDS) {
  test(`${build.name}: placing a boss and aiming its shots draws nothing`, () => {
    // BOSS_DROPS rests on this. A seeded flight is compared against another, and
    // an encounter that drew for its placement, its aim or its drops would make
    // every figure quoted off one depend on whether the boss happened to die.
    // Particles are the one route it does draw by, and that is the route every
    // kill in the game already takes - so they are emptied out of the way here
    // by running at a detail tier that spawns none.
    let draws = 0;
    build.seedRng(1234);
    const seeded = build.RNG.next;
    build.RNG.next = () => { draws++; return seeded(); };
    try {
      const game = quietRun(build);
      const s = game.state;
      s.detail = build.DETAIL_TIERS.length - 1;
      s.bossWarning = FRAME / 2;
      game.update(FRAME, {}, {});
      assert.notEqual(s.boss, null, 'the boss was placed');

      const afterPlacement = draws;
      s.boss.fireTimer = build.BOSS_FIRE_INTERVAL;
      game.update(FRAME, {}, {});
      assert.equal(s.bossShots.length, 1, 'and it fired');
      assert.equal(draws, afterPlacement, 'aiming drew nothing');

      const afterFiring = draws;
      game.dropBossPowerups(0, 2.5, -40);
      assert.equal(s.powerups.length, build.BOSS_DROPS);
      assert.equal(draws, afterFiring, 'the drops drew nothing');
    } finally {
      build.RNG.next = seeded;
      build.seedRng(null);
    }
  });
}
