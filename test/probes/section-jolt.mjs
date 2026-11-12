// test/probes/section-jolt.mjs — How often an asteroid field section's rocks
// reach the ship, and what a jolted frame does to a reading of the walls.
//
// `test/asteroid-field.test.mjs` pins the open-and-close sequence at two seeds:
// one whose rocks miss the ship, and one whose rocks reach it and jolt the frame
// the walls are read off. Which of those two a run actually gets is a draw, and
// the case that holds the jolted one carried the rate as a figure - 237 shakes
// and 237 misreadings in 60,000 runs of the terminal build, 258 shakes and no
// misreadings in the browser's - taken on a scratch script that is not in the
// repository. This is that walk, with the scratch script's two faults fixed.
//
// The first fault was that the walk was unseeded, so the figure was a sample of
// an unrepeatable set and two runs of it disagreed. Here the worlds are seeds
// 1 to N, so the same command gives the same numbers every time and the rate is
// rebuilt by running the probe again rather than by averaging it. A rate over a
// seeded set is still a rate over a sample of the draws - what it is not is a
// rate nobody can reproduce.
//
// The second was that it reported two counts and left their agreement to the
// prose. A rate on its own cannot say whether the build that shook is the build
// that misread, and that is the whole claim the case comment makes, so the
// contingency between the two is counted here as four cells rather than two
// totals.
//
// Both readings of every frame are taken, which is what makes the pair legible:
// the wall columns at the span the jolt left them on, which is what the suite
// asserts, and the same frame read at the span they were drawn on. The two
// disagree exactly when the grid has been jolted, so the second column is the
// misreading the flake was filed about and the third is whether the fix holds.

import { BUILDS, GRIDS, openAndClose, FRAME, JOLTED_SECTION_SEED } from '../engagement.mjs';

/**
 * The worlds the walk flies: seeds 1 to this.
 *
 * Matched to the 60,000 runs the case comment quoted, so the figure replacing
 * it is taken over a set of the same size rather than over a smaller one that
 * happens to agree. The size is what the counts need rather than what the
 * history asks for: the rate is a few worlds per thousand, so at 2,000 worlds
 * the whole contingency rests on the 14 that shake at 80x24 and the 2 that
 * shake at 205x50, and one draw either way moves it.
 *
 * `--passes N` flies the first N while you iterate. Every figure quoted
 * anywhere in this repository is the whole set.
 */
const SECTION_WORLDS = 60000;

const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(2)}%` : '-');

/**
 * The jolt as a reader wants it: the distinct column offsets the shaking worlds
 * were rendered under.
 *
 * Reported as a set rather than as one figure because nothing here asserts it
 * is one. The terminal build's `shakeColumns` reads the shake timer and the
 * run's own clock, and every world in this walk reaches the read frame at the
 * same point in both, so a second offset in this column would be a draw
 * reaching the ship on some other frame than the one the sequence steps.
 */
function joltText(shifts) {
  const seen = [...shifts].sort((a, b) => a - b);
  if (!seen.length) return 'never shook';
  if (seen.length === 1 && seen[0] === 0) return 'none';
  return `${seen.join(', ')} column${seen.length === 1 && Math.abs(seen[0]) === 1 ? '' : 's'}`;
}

function tally(build, grid, worlds) {
  const r = {
    worlds: 0, shook: 0, bareWrong: 0, spanWrong: 0,
    shookAndBareWrong: 0, shookAndBareRight: 0, bareWrongUnshaken: 0, neither: 0,
    shifts: new Set(), joltedSeedShook: null,
  };
  for (let seed = 1; seed <= worlds; seed++) {
    const seen = openAndClose(build, grid, { seed });
    const shook = seen.shake > 0;
    r.worlds++;
    if (shook) {
      r.shook++;
      r.shifts.add(seen.shift);
    }
    if (seen.bareWrong) r.bareWrong++;
    if (seen.spanWrong) r.spanWrong++;
    if (shook && seen.bareWrong) r.shookAndBareWrong++;
    else if (shook) r.shookAndBareRight++;
    else if (seen.bareWrong) r.bareWrongUnshaken++;
    else r.neither++;
    if (seed === JOLTED_SECTION_SEED) r.joltedSeedShook = shook;
  }
  return r;
}

export async function run({ grids = GRIDS, builds = BUILDS, passes } = {}) {
  const worlds = passes ?? SECTION_WORLDS;

  console.log('section-jolt');
  console.log('  sequence: a run with nothing in the tunnel, the section timer wound to half a frame');
  console.log('            short of ASTEROID_INTERVAL, one frame to open the section, its own clock');
  console.log('            wound to half a frame short of closing, one frame to close it again');
  console.log(`  worlds: seeds 1 to ${worlds}, one section each    dt: 1/${Math.round(1 / FRAME)}`);
  console.log('  shook: the run\'s shake timer above zero afterwards, which is a rock having reached the ship');
  console.log('  bare span: the wall glyphs read at the columns the walls were drawn on, ignoring the jolt');
  console.log('  jolted span: the same frame read at the columns shakeColumns left them on');
  console.log('  wrong: that reading differs from the set the tunnel was drawn from before the section');
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      const r = tally(build, grid, worlds);
      console.log(`${build.name} at ${grid.name}`);
      console.log('  worlds    shook            bare span wrong    jolted span wrong   jolt');
      console.log(
        `  ${String(r.worlds).padStart(6)} ${String(r.shook).padStart(7)} ${pct(r.shook, r.worlds).padStart(7)}  `
        + `${String(r.bareWrong).padStart(10)} ${pct(r.bareWrong, r.worlds).padStart(7)}  `
        + `${String(r.spanWrong).padStart(13)}   ${joltText(r.shifts)}`
      );
      console.log(
        `  contingency: shook and bare wrong ${r.shookAndBareWrong}, shook and bare right `
        + `${r.shookAndBareRight}, bare wrong unshaken ${r.bareWrongUnshaken}, neither ${r.neither}`
      );
      // The suite's own jolted seed, which this walk passes through whenever it
      // is long enough to reach it. A probe that reported a rate of shakes while
      // the one seed a case pins stopped shaking would be reporting about a
      // sequence the suite is no longer holding.
      console.log(
        `  the suite's jolted seed, ${JOLTED_SECTION_SEED}: `
        + (r.joltedSeedShook === null
          ? `outside this walk - pass --passes ${JOLTED_SECTION_SEED} or more to reach it`
          : r.joltedSeedShook ? 'shook, as the case that pins it asserts' : 'did not shake')
      );
      console.log('');
    }
  }
}
