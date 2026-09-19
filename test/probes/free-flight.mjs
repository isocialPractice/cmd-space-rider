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
// The two are read differently, and the difference is the whole reason this
// probe takes a pass count. The dark walk is arithmetic: the same firing
// columns against the same placements, so it gives the same three numbers every
// time and one pass of it is the figure. The flight is not. It flies the run
// `startGame` opens, which seeds sixty obstacles from an unseeded `Math.random`,
// so every pass flies a different run and one pass of it is a sample. Its
// figures are therefore printed as the spread over a stated number of passes,
// and a figure quoted from this probe anywhere in the repository carries that
// number with it. Quoting one pass as though it were the measurement is how the
// figures this file used to print stopped being reproducible.
//
//   npm run probe -- free-flight [--grid 205x50] [--build browser] [--passes 5]

import { BUILDS, GRIDS, freeFlight, darkWalk, FREE_FIRE_INTERVAL } from '../engagement.mjs';

/** Held on the floor, and held at the ceiling the tunnel clamps the ship to. */
const HEIGHTS = [0, 6.5];

/** Frames per flight, matching the length the browser verification flew. */
const FRAMES = 1200;

/** Passes per flight when the caller does not say, which the tables quote. */
const PASSES = 5;

/** The verdicts contactOf can return for a kill, nearest contact first. */
const VERDICTS = ['on', 'beside', 'wide', 'unlit', 'hidden'];

/** A figure over several passes: one number where they agreed, a range where they did not. */
const span = (values, width = 0) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (lo === hi ? `${lo}` : `${lo}-${hi}`).padStart(width);
};

const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);

export async function run({ grids = GRIDS, builds = BUILDS, count, passes } = {}) {
  const frames = count ?? FRAMES;
  const runs = passes ?? PASSES;

  console.log('free-flight');
  console.log(`  flight: ${frames} frames of a run startGame opens, at ship heights ${HEIGHTS.join(' and ')}`);
  console.log(`  pilot: holds the height, closes on the nearest drawn block's column, fires every ${FREE_FIRE_INTERVAL}s`);
  console.log(`  passes: ${runs} per height, and the flight is unseeded - every figure below is the spread over them`);
  console.log('  kills: blocks the frame blew up, told from the ones it rammed or wrapped round by the debris colour');
  console.log('  unpaired: kills on a frame that also spent a shot on a mine, so the frame cannot say which shot killed what');
  console.log('  ignored: a tracer drawn on a block still there the frame after, with that shot still in the air');
  console.log('  kill contact: where the killing shot stood against the block it killed, on the kill frame or the one before');
  console.log('  dark walk: every firing column and height against every shot depth and every legal target placement');
  console.log('  candidates: dark configurations whose cells would otherwise have met - what the old hit test killed on');
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      console.log(`${build.name} at ${grid.name}`);
      console.log('  held  volleys    kills   rams  unpaired  ignored  drawn through        on   beside     wide    unlit   hidden  on-or-beside   blocks   shots');

      // A kill the frame could not pair to a shot is left unread, so every
      // share below is a share of what was read rather than of every kill.
      const read = (f) => [...f.killContacts.values()].reduce((a, b) => a + b, 0);
      const verdict = (f, name) => f.killContacts.get(name) ?? 0;
      const byHeight = new Map();

      for (const holdY of HEIGHTS) {
        const flights = [];
        for (let i = 0; i < runs; i++) flights.push(freeFlight(build, grid, { frames, holdY }));
        byHeight.set(holdY, flights);
        const of = (take) => flights.map(take);
        const at = (name) => span(of((f) => pct(verdict(f, name), read(f))), 6);

        console.log(
          `  ${String(holdY).padEnd(5)} ${span(of((f) => f.volleys), 7)} ` +
          `${span(of((f) => f.kills), 8)} ${span(of((f) => f.rams), 6)} ` +
          `${span(of((f) => f.unpaired), 9)} ${span(of((f) => f.ignored), 8)} ` +
          `${span(of((f) => f.drawnThrough), 14)}   ${VERDICTS.map(at).join(' ')} ` +
          `${span(of((f) => pct(verdict(f, 'on') + verdict(f, 'beside'), read(f))), 12)}% ` +
          `${span(of((f) => f.mostBlocksDrawn), 8)} ${span(of((f) => f.mostShotsInAir), 7)}`
        );
      }

      // The two heights together, which is the shape the suite pins: its floor
      // on the contact share is taken over both flights at a grid rather than
      // over either one of them.
      const passes = [];
      for (let i = 0; i < runs; i++) {
        const flown = HEIGHTS.map((holdY) => byHeight.get(holdY)[i]);
        const sum = (take) => flown.reduce((n, f) => n + take(f), 0);
        passes.push({
          kills: sum((f) => f.kills),
          unpaired: sum((f) => f.unpaired),
          unlit: sum((f) => verdict(f, 'unlit')),
          share: pct(sum((f) => verdict(f, 'on') + verdict(f, 'beside')), sum(read)),
        });
      }
      console.log(
        `  both heights: ${span(passes.map((p) => p.kills))} kills a pass, ` +
        `${span(passes.map((p) => p.unpaired))} of them unpaired, ` +
        `${span(passes.map((p) => p.share))}% of the read ones on or beside, ` +
        `${span(passes.map((p) => p.unlit))} unlit`
      );

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
