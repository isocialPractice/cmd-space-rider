// test/probes/suite-replay.mjs — The test file's own bands, replayed at a given
// grid.
//
// This is how a floor is checked at a new size before a test is written for it.
// Each band prints as landed over resolved beside the floor the suite pins, with
// the ram count, because a band whose engagements mostly end in a collision is
// not measuring the cannon at all - the `shots > 20` guard in the suite exists
// for exactly that.

import {
  BUILDS, GRIDS, AIMED_BANDS, VOLLEY_BAND, EYE_BANDS, sweep, sweepByEye, FRAME,
} from '../engagement.mjs';

/**
 * The bands the suite pins, read from the suite's own table rather than copied
 * beside it. A floor here that the suite does not pin reads as headroom that is
 * not there, which is the reading this probe exists to give.
 */
const BANDS = [...AIMED_BANDS, VOLLEY_BAND];

const label = (band) => `${band.volley ? 'volley' : 'lone shot'} ${band.name}`;

/**
 * The floor the suite pins a band at for this grid, or a note that it pins
 * none. Replaying a band at a grid nothing is pinned at is what this probe is
 * for, so a grid off `GRIDS` has to say so rather than print a floor.
 */
const floorAt = (band, grid) => (
  band.floors[grid.name] === undefined
    ? 'unpinned here'
    : `floor ${Math.round(band.floors[grid.name] * 100)}%`
);

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

export async function run({ grids = GRIDS, builds = BUILDS } = {}) {
  console.log('suite-replay');
  console.log('  walk: 60 placements for the aimed bands, 40 for the bands flown by eye');
  console.log('  x -4.5 to 4.5, y 0.5 to 4.5, z across the band; ship steered to the target');
  console.log(`  dt: 1/${Math.round(1 / FRAME)}`);
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      console.log(`${build.name} at ${grid.name} (column slack ${build.shotSlackCols(grid.w)})`);
      for (const band of BANDS) {
        const r = sweep(build, grid, band);
        console.log(
          `  ${label(band).padEnd(20)} ${String(r.hit).padStart(3)}/${String(r.shots).padEnd(3)} ` +
          `${pct(r.hit, r.shots).padStart(4)}   ${floorAt(band, grid).padEnd(13)}   ${r.rams} rams`
        );
      }
      for (const band of EYE_BANDS) {
        const r = sweepByEye(build, grid, band);
        console.log(
          `  ${`by eye ${band.name}`.padEnd(20)} ${String(r.hit).padStart(3)}/${String(r.shots).padEnd(3)} ` +
          `${pct(r.hit, r.shots).padStart(4)}   ${floorAt(band, grid).padEnd(13)}   ` +
          `${r.rams} rams, hull row ${r.holdRow}`
        );
      }
      console.log('');
    }
  }
}
