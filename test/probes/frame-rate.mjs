// test/probes/frame-rate.mjs — Whether a shot resolves the same way however the
// frames happen to fall.
//
// The hit test looks for two cells meeting on the screen, and a frame carries
// the shot some way across the grid, so a slow frame can step a tracer over a
// block and a fast one cannot. The engine sweeps inside the frame for exactly
// that reason; this is the walk that says whether the sweep is fine enough.
//
// The shot is staged rather than flown. A slow frame steers the ship in longer
// strides too, so an engagement flown at a sixth of a second a frame is a
// different engagement and not the same one answered differently - which is a
// fair question about the game and the wrong one about the hit test. The aim is
// taken once, at a fixed rate, and the same shot is then flown at each rate.
//
// The engagement flown from the ship is reported underneath, at the two ship
// heights, because it is the question a player would ask - and it answers
// differently for a reason worth keeping separate: at a sixth of a second a
// frame the ship moves a unit and a third between frames, so it lines up on a
// different column and fires from a different place.
//
// The suite's own check holds three placements. This holds the walk the pulse
// cannon work asked it to pass.

import { BUILDS, GRIDS, emptyRun, engage, stagedShot, walk, FRAME_RATES } from '../engagement.mjs';

const RATES = FRAME_RATES;
const HEIGHTS = [0, 2.5];

export async function run({ grids = GRIDS, builds = BUILDS, count = 150 } = {}) {
  console.log('frame-rate');
  console.log(`  walk: ${count} placements between 20 and 140 units, aimed at the target and a column clear of it`);
  console.log(`  rates: ${RATES.map((r) => `1/${Math.round(1 / r)}`).join(', ')}, aim taken at 1/60`);
  console.log('  a placement counts as changed when its verdict is not the same at every rate');
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      let flights = 0;
      let changed = 0;
      const examples = [];
      for (const place of walk(count, { near: 20, far: 140 })) {
        for (const aimedAt of ['target', 'clear']) {
          const verdicts = RATES.map(
            (dt) => stagedShot(build, grid, { ...place, targetZ: place.z, dt, aimedAt })
          );
          if (verdicts.some((v) => v !== 'hit' && v !== 'miss')) continue;
          flights++;
          if (new Set(verdicts).size > 1) {
            changed++;
            if (examples.length < 4) {
              examples.push(
                `x ${place.x.toFixed(2)} y ${place.y.toFixed(2)} z ${place.z.toFixed(0)} ` +
                `aimed at the ${aimedAt}: ${verdicts.join('/')}`
              );
            }
          }
        }
      }
      console.log(`${build.name} at ${grid.name}: ${changed} of ${flights} staged shots changed verdict`);
      for (const line of examples) console.log(`    ${line}`);

      let flown = 0;
      let flownChanged = 0;
      for (const place of walk(count, { near: 20, far: 140 })) {
        for (const holdY of HEIGHTS) {
          const verdicts = RATES.map(
            (dt) => engage(emptyRun(build, grid), { ...place, dt, holdY })
          );
          // A ram is the ship arriving first, which really does depend on how
          // far it moves between frames.
          if (verdicts.some((v) => v !== 'hit' && v !== 'miss')) continue;
          flown++;
          if (new Set(verdicts).size > 1) flownChanged++;
        }
      }
      console.log(
        `${' '.repeat(build.name.length + grid.name.length + 5)}` +
        `${flownChanged} of ${flown} flown engagements changed verdict, at ship heights ` +
        `${HEIGHTS.join(' and ')}`
      );
    }
  }
  console.log('');
}
