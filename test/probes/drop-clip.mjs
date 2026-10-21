// test/probes/drop-clip.mjs - What the tracer's drop clip costs a frame.
//
// `drawBullets` skips a cell `drawEntitiesFar` drew a dropped powerup into, so
// a boss's three drops are readable while the player's own bolts are still
// strung up the axis they landed on. That clip is a lookup inside the bullet
// loop, and the bullet loop is the one pass whose length a player controls: a
// trigger tapped hard enough to kill a boss leaves about seventy bolts in the
// air at once. This is the walk that says what the lookup costs, which is the
// question the fix had to answer before it could be taken.
//
// Three scenes per grid, at the FULL detail tier:
//
//   bare    the bolt column full and no drop in the air - the common frame,
//           and the one the clip is meant to cost nothing, since
//           `drawEntitiesFar` hands back null rather than a set
//   held    the same column with a boss's three held drops in it - the frame
//           the clip is actually doing work on
//   drops   the drop count the scene is reporting, so a figure cannot be read
//           off a scene that staged no drops
//
// The whole render is timed rather than the clip alone. A figure for the clip
// on its own would need the pass instrumented, and an instrumented pass is a
// copy of the thing being measured - the rule the rig opens with. What a
// reader wants to know is whether a frame got slower, and a frame is what is
// timed.
//
//   npm run probe -- drop-clip [--grid 60x20] [--build terminal] [--count 20000] [--passes 5]
//
// `count` is frames per figure here, not a placement walk - `free-flight`
// reads the flag the same way. `passes` is how many times the pair is
// measured, and it matters more than it looks: the two figures land inside the
// noise of each other, so one pass cannot tell a cost from a warm cache. The
// spread across passes is reported for that reason, and a negative delta in it
// is the honest answer rather than a fault - it is what "below the noise"
// looks like when you print it.
//
// Nothing here pairs with test/parity.test.mjs. A timing is a property of the
// machine it ran on, not of a build, so the two builds' figures are reported
// side by side and never compared.

import { BUILDS, GRIDS, FRAME } from '../engagement.mjs';

/** Frames per figure, and measurements of the pair. */
const FRAMES = 20000;
const PASSES = 5;

/** Volleys are pushed every this many frames, over about the life of a bolt. */
const VOLLEY_EVERY = 4;
const FILL_FRAMES = 104;

/**
 * The scene both figures are taken on: the axis column as full as twenty hits
 * leave it, the ship held on the axis, the starfield at the population the
 * FULL tier asks for.
 *
 * The drops are raised through `killBoss` rather than pushed, so the burst is
 * in the scene too - it is drawn after the tracers and over the same cells, and
 * leaving it out would time a frame the game never draws.
 *
 * `shake` is zeroed because `renderGame` shifts the play area by a column while
 * it is running, and a shifted row is a different amount of work to write out.
 * The shake lasts six frames of a twenty-thousand frame walk, so including it
 * would move the figure by a rounding error and make the scene harder to state.
 */
function scene(build, grid, withDrops) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = grid.w;
  s.screenHeight = grid.h;
  s.detail = 0;
  game.initStars(grid.w, grid.h);
  s.shipX = 0;
  s.shipY = 2.5;
  for (let f = 0; f < FILL_FRAMES; f++) {
    if (f % VOLLEY_EVERY === 0) game.fireVolley();
    s.shipX = 0;
    s.shipY = 2.5;
    game.update(FRAME, {}, {});
  }
  if (withDrops) game.killBoss({ x: 0, y: 2.5, z: -190, hp: 0, fireTimer: 0 });
  else s.powerups = [];
  s.shake = 0;
  return { game, s };
}

/**
 * Microseconds a frame, over `frames` renders of one standing scene.
 *
 * The world is not stepped between renders. Stepping it would drain the bullet
 * list and expire the drops partway through the walk, so the back half of the
 * figure would be taken on a scene the front half was not - and the scene is
 * the whole of what this probe is comparing.
 */
function time(build, grid, withDrops, frames) {
  const { s } = scene(build, grid, withDrops);
  const screen = new build.ScreenBuffer(grid.w, grid.h);
  const t0 = process.hrtime.bigint();
  for (let f = 0; f < frames; f++) build.renderGame(screen, s);
  const t1 = process.hrtime.bigint();
  return {
    us: Number(t1 - t0) / frames / 1000,
    bolts: s.bullets.length,
    drops: s.powerups.length,
    stars: s.stars.length,
  };
}

/** A 30 fps frame, in the unit the table reports. */
const BUDGET_US = 33333;

export async function run({ grids = GRIDS, builds = BUILDS, count, passes } = {}) {
  const frames = count ?? FRAMES;
  const runs = passes ?? PASSES;
  console.log('drop-clip');
  console.log(`  scene: the axis column filled by a volley every ${VOLLEY_EVERY} frames for ${FILL_FRAMES} frames, ship held at x: 0`);
  console.log(`  drops: raised through killBoss at z=-190, so the burst is in the scene`);
  console.log(`  tier: FULL (detail 0), starfield seeded to the tier's own population`);
  console.log(`  walk: ${frames} frames per figure, ${runs} pass${runs === 1 ? '' : 'es'} of the pair`);
  console.log(`  a 30 fps frame is ${BUDGET_US} us, which is what every figure below is against`);
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      // One discarded pass first, so the first grid is not charged for the JIT
      // the ones after it inherit.
      time(build, grid, true, Math.min(2000, frames));

      const deltas = [];
      let last = null;
      for (let pass = 0; pass < runs; pass++) {
        const bare = time(build, grid, false, frames);
        const held = time(build, grid, true, frames);
        deltas.push(held.us - bare.us);
        last = { bare, held };
      }
      deltas.sort((a, b) => a - b);
      const lo = deltas[0];
      const hi = deltas[deltas.length - 1];
      const mid = deltas[Math.floor(deltas.length / 2)];
      const sign = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

      console.log(
        `  ${build.name.padEnd(8)} ${grid.name.padEnd(7)}` +
        ` stars=${last.bare.stars} bolts=${String(last.bare.bolts).padStart(3)}` +
        ` drops=${last.held.drops}`
      );
      console.log(
        `    bare ${last.bare.us.toFixed(1)} us/frame   held ${last.held.us.toFixed(1)} us/frame` +
        `   delta ${sign(mid)} us median, ${sign(lo)} to ${sign(hi)} across ${runs}` +
        `   ${(Math.abs(mid) / BUDGET_US * 100).toFixed(3)}% of a frame`
      );
    }
  }
  console.log('');
  console.log('  a delta whose range crosses zero is below what this rig can measure');
}
