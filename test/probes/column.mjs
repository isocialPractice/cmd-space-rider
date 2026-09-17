// test/probes/column.mjs — The measurement behind "long shots fall off on wide
// screens".
//
// Three things, because the long band's kill rate is the sum of them. The
// volley's own spread, in columns rather than world units, since that is what
// covers a near miss. The target's column creep over a flight, which is the
// lead a player has no way to take and the reason the slack exists at all.
// And the resulting kill rate at the far band with the contact shares beside
// it, so a wider slack cannot buy kills the tracer never visibly reached.

import {
  BUILDS, GRIDS, emptyRun, stageTarget, sweep, walk, watchEngagement,
  ghostFlight, MUZZLE_Z, FRAME,
} from '../engagement.mjs';

/** The world offsets the trigger gives the two side shots, from updatePlaying. */
const SIDE_OFFSET = 0.25;
const SIDE_Z = -1.5;

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

/** How far out the side bullets sit from the centre one, in columns, at the muzzle. */
function muzzleSpread(game, shipX) {
  const centre = game.toScreen(shipX, 0, MUZZLE_Z);
  const side = game.toScreen(shipX + SIDE_OFFSET, 0, SIDE_Z);
  const s = game.state;
  const colRange = (s.screenWidth - 6) / 2;
  // Read in fractions of a column rather than off the floored projection, which
  // would quantise the very figure being measured.
  const exact = (gx, gz) => s.screenWidth / 2 + (gx / s.tunnelRadius) * colRange * game.projScale(gz);
  return {
    columns: Math.abs(exact(shipX + SIDE_OFFSET, SIDE_Z) - exact(shipX, MUZZLE_Z)),
    cells: Math.abs(side.col - centre.col),
  };
}

/** How far a target's drawn column moves between the shot leaving and meeting it. */
function creep(game, { x, y, targetZ }) {
  const ghost = ghostFlight(game, { x, y, targetZ, dt: FRAME });
  if (!ghost) return null;
  const s = game.state;
  const colRange = (s.screenWidth - 6) / 2;
  const exact = (gz) => (x / s.tunnelRadius) * colRange * game.projScale(gz);
  return Math.abs(exact(ghost.targetZ) - exact(targetZ));
}

export async function run({ grids = GRIDS, builds = BUILDS, count = 24 } = {}) {
  console.log('column');
  console.log('  spread: the side shots at x +/- 0.25, z -1.5, against the centre shot at z -2');
  console.log('  creep: a target at x = 4.5 and at x = 2, from the shot leaving to the two meeting');
  console.log(`  rates: 60 placements at 60 to 140, dt 1/${Math.round(1 / FRAME)}, ship steered to the target`);
  console.log(`  contact: ${count} placements at ship heights 0, 1, 2.5 and 4.5, read off the rendered grid`);
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      const game = emptyRun(build, grid);
      const slack = build.shotSlackCols(grid.w);
      const colRange = (grid.w - 6) / 2;
      console.log(`${build.name} at ${grid.name} (colRange ${colRange}, column slack ${slack})`);

      const spread = muzzleSpread(game, 0);
      console.log(`  volley spread at the muzzle: ${spread.columns.toFixed(2)} columns`);

      for (const x of [4.5, 2]) {
        const row = [];
        for (const targetZ of [-40, -80, -110, -140]) {
          stageTarget(game.state, x, 2, targetZ);
          const c = creep(game, { x, y: 2, targetZ });
          row.push(`${-targetZ}: ${c === null ? '-' : c.toFixed(2)}`);
        }
        console.log(`  creep in columns, target at x ${x}   ${row.join('   ')}`);
      }

      for (const volley of [false, true]) {
        const r = sweep(build, grid, { near: 60, far: 140, volley });
        console.log(
          `  ${(volley ? 'volley' : 'lone shot').padEnd(10)} 60 to 140: ` +
          `${String(r.hit).padStart(3)}/${String(r.shots).padEnd(3)} ${pct(r.hit, r.shots).padStart(4)}`
        );
      }

      let kills = 0; let flights = 0; let beside = 0; let wide = 0; let unlit = 0;
      let through = 0; let hidden = 0;
      for (const place of walk(count, { near: 60, far: 140 })) {
        for (const shipY of [0, 1, 2.5, 4.5]) {
          const seen = watchEngagement(build, grid, { ...place, holdY: shipY });
          if (seen.outcome !== 'hit' && seen.outcome !== 'miss') continue;
          flights++;
          if (seen.drawnThrough && seen.outcome === 'miss') through++;
          if (seen.outcome === 'hit') {
            kills++;
            if (seen.killContact === 'beside') beside++;
            if (seen.killContact === 'wide') wide++;
            if (seen.killContact === 'unlit') unlit++;
            if (seen.killContact === 'hidden') hidden++;
          }
        }
      }
      console.log(
        `  contact at 60 to 140: ${kills}/${flights} killed ${pct(kills, flights)},  ` +
        `${pct(beside, kills)} of kills beside the block, ${pct(wide, kills)} wide of it, ` +
        `${pct(unlit, kills)} with no tracer drawn, ${pct(hidden, kills)} hidden by the hull, ` +
        `${through} tracers drawn through a survivor`
      );
      console.log('');
    }
  }
}
