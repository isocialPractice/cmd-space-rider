// test/probes/free-flight.mjs — What the screen showed against what registered,
// in a run nobody staged.
//
// Every other probe here stages its engagement: one target parked in an emptied
// run, the ship steered onto it, one volley in the air. That isolates the shot,
// which is what a rate needs, and it is not the shape either of these faults was
// found in. The screen capture behind the whole screen-space rule was a real run
// - sixty obstacles in the tunnel, volleys overlapping, the ship held on the
// floor - and the corridor clip needs something a flown engagement cannot
// produce at all: a shot fired from a column no target ever spawns in.
//
// So two walks, printed together because they are the same question from the two
// ends. The flight asks what a run does; the dark walk asks what the hit test
// would accept if a run ever got there.
//
//   npm run probe -- free-flight [--grid 205x50] [--build browser]

import { BUILDS, GRIDS, freeFlight, darkWalk, FREE_FIRE_INTERVAL } from '../engagement.mjs';

/** Held on the floor, and held at the ceiling the tunnel clamps the ship to. */
const HEIGHTS = [0, 6.5];

/** Frames per flight, matching the length the browser verification flew. */
const FRAMES = 1200;

/** The verdicts contactOf can return for a kill, nearest contact first. */
const VERDICTS = ['on', 'beside', 'wide', 'unlit', 'hidden'];

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

export async function run({ grids = GRIDS, builds = BUILDS, count } = {}) {
  const frames = count ?? FRAMES;

  console.log('free-flight');
  console.log(`  flight: ${frames} frames of a run startGame opens, at ship heights ${HEIGHTS.join(' and ')}`);
  console.log(`  pilot: holds the height, closes on the nearest drawn block's column, fires every ${FREE_FIRE_INTERVAL}s`);
  console.log('  ignored: a tracer drawn on a block still there the frame after, with that shot still in the air');
  console.log('  kill contact: where the killing shot stood against the killed block, on the kill frame or the one before');
  console.log('  dark walk: every firing column and height against every shot depth and every legal target placement');
  console.log('  candidates: dark configurations whose cells would otherwise have met - what the old hit test killed on');
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      console.log(`${build.name} at ${grid.name}`);
      console.log('  held  volleys  kills   rams   ignored  drawn through     on  beside    wide   unlit  hidden   blocks  shots');

      for (const holdY of HEIGHTS) {
        const r = freeFlight(build, grid, { frames, holdY });
        const at = (name) => pct(r.killContacts.get(name) ?? 0, r.kills).padStart(6);
        console.log(
          `  ${String(holdY).padEnd(5)} ${String(r.volleys).padStart(6)} ` +
          `${String(r.kills).padStart(6)} ${String(r.rams).padStart(6)} ` +
          `${String(r.ignored).padStart(9)} ` +
          `${String(r.drawnThrough).padStart(13)}   ${VERDICTS.map(at).join(' ')} ` +
          `${String(r.mostBlocksDrawn).padStart(8)} ${String(r.mostShotsInAir).padStart(6)}`
        );
      }

      const walked = darkWalk(build, grid);
      console.log(
        `  dark walk: ${walked.dark} of ${walked.walked} configurations drew no tracer, ` +
        `${walked.candidates} of those would otherwise have met, ${walked.registered} registered`
      );
      for (const line of walked.at) console.log(`    ${line}`);
      console.log('');
    }
  }
}
