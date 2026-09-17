// test/probes/seen-versus-kill.mjs — Whether a kill agrees with what the screen
// drew, which is the measurement the pulse cannon work turns on.
//
// Two shares matter and a hit rate shows neither. A flight whose tracer was
// drawn straight through a block and that ends with the block still there is
// the fault the screen capture caught. A kill with no tracer anywhere near the
// block is the opposite fault, and is what a slack that has drifted too wide
// looks like. Both are counted here, per grid and per range band.
//
// A third column is neither: a target drawn on cells the ship then drew over
// leaves the frame with nothing to read, so those kills are set aside rather
// than counted against either share.

import { BUILDS, GRIDS, walk, watchEngagement, FRAME } from '../engagement.mjs';

const BANDS = [
  { name: '20 to 60', near: 20, far: 60 },
  { name: '60 to 140', near: 60, far: 140 },
];

/** The ship heights the walk is flown at. The capture was flown at the first. */
const HEIGHTS = [0, 1, 2.5, 4.5];

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

function tally(build, grid, band, { count, heights }) {
  const r = {
    flights: 0, kills: 0, drawnThroughAlive: 0,
    on: 0, beside: 0, wide: 0, unlit: 0, hidden: 0,
    gapMin: Infinity, gapMax: -Infinity,
    byGap: new Map(),
  };
  for (const place of walk(count, band)) {
    for (const shipY of heights) {
      const seen = watchEngagement(build, grid, { ...place, holdY: shipY });
      if (seen.outcome !== 'hit' && seen.outcome !== 'miss') continue;
      r.flights++;
      const gap = Math.round(Math.abs((seen.targetY ?? 0) - shipY));
      const at = r.byGap.get(gap) ?? { kills: 0, flights: 0 };
      at.flights++;
      if (seen.outcome === 'hit') {
        r.kills++;
        at.kills++;
        r[seen.killContact]++;
        if (seen.killGapZ !== null) {
          r.gapMin = Math.min(r.gapMin, seen.killGapZ);
          r.gapMax = Math.max(r.gapMax, seen.killGapZ);
        }
      } else if (seen.drawnThrough) {
        r.drawnThroughAlive++;
      }
      r.byGap.set(gap, at);
    }
  }
  return r;
}

export async function run({ grids = GRIDS, builds = BUILDS, count = 150 } = {}) {
  console.log('seen-versus-kill');
  console.log(`  walk: ${count} placements, x -4.5 to 4.5, y 0.5 to 4.5, z across the band`);
  console.log(`  ship heights: ${HEIGHTS.join(', ')}, and held at the floor alone as the capture was flown`);
  console.log(`  volley: all three shots    dt: 1/${Math.round(1 / FRAME)}`);
  console.log('  drawn through: flights whose tracer stood on a block cell and killed nothing');
  console.log('  wide: the tracer was drawn, a column or more off the block; unlit: no tracer drawn at all');
  console.log('  kill frame: where the killing tracer was, on the kill frame or the one before');
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      console.log(`${build.name} at ${grid.name} (column slack ${build.shotSlackCols(grid.w)})`);
      console.log('  aim      band          kills        drawn through   on    beside    wide   unlit  hidden   kill z gap');
      for (const [label, heights] of [['heights', HEIGHTS], ['floor', [0]]]) {
        for (const band of BANDS) {
          const r = tally(build, grid, band, { count, heights });
          const gap = r.gapMin === Infinity ? '-' : `${r.gapMin.toFixed(0)} to ${r.gapMax.toFixed(0)}`;
          console.log(
            `  ${label.padEnd(8)} ${band.name.padEnd(11)} ` +
            `${String(r.kills).padStart(4)}/${String(r.flights).padEnd(4)} ${pct(r.kills, r.flights).padStart(4)}  ` +
            `${String(r.drawnThroughAlive).padStart(9)}    ` +
            `${pct(r.on, r.kills).padStart(5)} ${pct(r.beside, r.kills).padStart(6)} ` +
            `${pct(r.wide, r.kills).padStart(6)} ${pct(r.unlit, r.kills).padStart(7)} ` +
            `${pct(r.hidden, r.kills).padStart(6)}   ${gap}`
          );
          if (label === 'heights') {
            const gaps = [...r.byGap.entries()].sort((a, b) => a[0] - b[0])
              .map(([g, at]) => `${g}:${at.kills}/${at.flights}`).join('  ');
            console.log(`             by height gap  ${gaps}`);
          }
        }
      }
      console.log('');
    }
  }
}
