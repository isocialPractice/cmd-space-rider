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
// So three walks, printed together because they are the same question from
// different ends. The flight asks what a run does; the rate walk asks whether
// the flight's own readings track the frame they are taken on; the dark walk
// asks what the hit test would accept if a run ever got there.
//
// Every one of them is arithmetic, and that is new. The flight used to fly
// whatever `startGame` drew from an unseeded `Math.random`, so each pass flew a
// different run and one pass of it was a sample rather than a measurement. Its
// figures were therefore printed as a spread over a stated number of passes -
// and that did not settle it either, because two ten-pass runs of the whole
// matrix disagreed with each other. It is seeded now, at the worlds in
// `FREE_SEEDS`, so every number below comes back the same on the next run and a
// figure quoted from here can be rebuilt by asking for it again.
//
// `--passes N` flies the first N of those worlds. A figure quoted anywhere in
// this repository is taken over all of them, or at `FREE_SEEDS[0]` alone where
// it is a figure the suite pins - each table below says which.
//
//   npm run probe -- free-flight [--grid 205x50] [--build browser] [--passes 3]

import {
  BUILDS, GRIDS, freeFlight, darkWalk,
  FREE_FIRE_INTERVAL, FREE_SEEDS, FREE_FRAMES, FREE_RATE_FRAMES, FRAME_RATES,
} from '../engagement.mjs';

/** Held on the floor, and held at the ceiling the tunnel clamps the ship to. */
const HEIGHTS = [0, 6.5];

/** The verdicts contactOf can return for a kill, nearest contact first. */
const VERDICTS = ['on', 'beside', 'wide', 'unlit', 'hidden'];

/** A figure over several worlds: one number where they agreed, a range where they did not. */
const span = (values, width = 0) => {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (lo === hi ? `${lo}` : `${lo}-${hi}`).padStart(width);
};

const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);

/** Every kill a set of contacts covers, whatever the tracer did. */
const readOf = (contacts) => [...contacts.values()].reduce((a, b) => a + b, 0);

/** The share of them whose tracer reached the block it killed. */
const reachedIn = (contacts) => (contacts.get('on') ?? 0) + (contacts.get('beside') ?? 0);

export async function run({ grids = GRIDS, builds = BUILDS, count, passes } = {}) {
  const frames = count ?? FREE_FRAMES;
  const seeds = FREE_SEEDS.slice(0, passes ?? FREE_SEEDS.length);
  const rateNames = FRAME_RATES.map((r) => `1/${Math.round(1 / r)}`).join(', ');

  console.log('free-flight');
  console.log(`  flight: ${frames} frames of a run startGame opens, at ship heights ${HEIGHTS.join(' and ')}`);
  console.log(`  pilot: holds the height, closes on the nearest drawn block's column, fires every ${FREE_FIRE_INTERVAL}s`);
  console.log(`  worlds: seeds ${seeds.join(', ')} - the flight is seeded, so every figure below repeats on the next run`);
  console.log('  kills: blocks the frame blew up, told from the ones it rammed or wrapped round by the debris colour');
  console.log('  unpaired: kills the frame could not read against one shot, split by cause underneath');
  console.log('  ignored: a tracer drawn on a block still there the frame after, with that shot still in the air');
  console.log('  kill contact: where the killing shot stood against the block it killed, on the kill frame or the one before');
  console.log('  crowded: the same contact over the kills whose frame spent more than one shot - what the pairing decides');
  console.log(`  rates: the same flight at ${rateNames}, ${FREE_RATE_FRAMES} frames, at the first seed alone`);
  console.log('  dark walk: every firing column and height against every shot depth and every legal target placement');
  console.log('  candidates: dark configurations whose cells would otherwise have met - what the old hit test killed on');
  console.log('');

  for (const build of builds) {
    for (const grid of grids) {
      console.log(`${build.name} at ${grid.name}`);
      console.log('  held  volleys    kills   rams  unpaired  ignored  drawn through        on   beside     wide    unlit   hidden  on-or-beside   blocks   shots');

      const verdict = (f, name) => f.killContacts.get(name) ?? 0;
      const byHeight = new Map();

      for (const holdY of HEIGHTS) {
        const flights = seeds.map((seed) => freeFlight(build, grid, { frames, holdY, seed }));
        byHeight.set(holdY, flights);
        const of = (take) => flights.map(take);
        const at = (name) => span(of((f) => pct(verdict(f, name), readOf(f.killContacts))), 6);

        console.log(
          `  ${String(holdY).padEnd(5)} ${span(of((f) => f.volleys), 7)} ` +
          `${span(of((f) => f.kills), 8)} ${span(of((f) => f.rams), 6)} ` +
          `${span(of((f) => f.unpaired), 9)} ${span(of((f) => f.ignored), 8)} ` +
          `${span(of((f) => f.drawnThrough), 14)}   ${VERDICTS.map(at).join(' ')} ` +
          `${span(of((f) => pct(reachedIn(f.killContacts), readOf(f.killContacts))), 12)}% ` +
          `${span(of((f) => f.mostBlocksDrawn), 8)} ${span(of((f) => f.mostShotsInAir), 7)}`
        );
      }

      // Why a kill went unread, which the column above only totals. A frame
      // that spent a shot on a mine cannot say which shot killed what and sits
      // the whole frame out; the other two are a burst that named no block and
      // a burst that named more than one, which is what a drift bound too wide
      // for its frame produces.
      const everyFlight = HEIGHTS.flatMap((holdY) => byHeight.get(holdY));
      const causeOf = (take) => everyFlight.reduce((n, f) => n + take(f), 0);
      console.log(
        `  unpaired by cause: ${causeOf((f) => f.unpairedMine)} on a frame that also spent a ` +
        `shot elsewhere, ${causeOf((f) => f.unnamed)} whose burst named no block, ` +
        `${causeOf((f) => f.ambiguous)} whose burst named more than one`
      );

      // The two heights together, which is the shape the suite pins: its floor
      // on the contact share is taken over both flights at a grid rather than
      // over either one of them.
      const worlds = seeds.map((seed, i) => {
        const flown = HEIGHTS.map((holdY) => byHeight.get(holdY)[i]);
        const sum = (take) => flown.reduce((n, f) => n + take(f), 0);
        const crowded = sum((f) => readOf(f.crowdedContacts));
        return {
          seed,
          kills: sum((f) => f.kills),
          unpaired: sum((f) => f.unpaired),
          unlit: sum((f) => verdict(f, 'unlit')),
          share: pct(sum((f) => reachedIn(f.killContacts)), sum((f) => readOf(f.killContacts))),
          crowded,
          crowdedShare: pct(sum((f) => reachedIn(f.crowdedContacts)), crowded),
        };
      });
      console.log(
        `  both heights: ${span(worlds.map((w) => w.kills))} kills a world, ` +
        `${span(worlds.map((w) => w.unpaired))} of them unpaired, ` +
        `${span(worlds.map((w) => w.share))}% of the read ones on or beside, ` +
        `${span(worlds.map((w) => w.unlit))} unlit`
      );
      console.log(
        `  crowded frames: ${span(worlds.map((w) => w.crowded))} kills a world landed on a frame ` +
        `that spent more than one shot, ${span(worlds.map((w) => w.crowdedShare))}% of them on or beside`
      );

      // The same flight at every rate the suite walks, at one world. Every
      // reading taken off a frame is derived from that frame, so a rate the
      // flight is never flown at is a rate nothing says holds - and one of
      // them did not: a drift bound fixed at half a unit left 83% of kills
      // unpaired at a sixth of a second a frame.
      for (const dt of FRAME_RATES) {
        const flown = HEIGHTS.map((holdY) => freeFlight(build, grid, {
          frames: FREE_RATE_FRAMES, holdY, dt, seed: FREE_SEEDS[0],
        }));
        const sum = (take) => flown.reduce((n, f) => n + take(f), 0);
        const kills = sum((f) => f.kills);
        const read = sum((f) => readOf(f.killContacts));
        console.log(
          `    1/${Math.round(1 / dt)}: ${kills} kills, ${read} read (${pct(read, kills)}%), ` +
          `${pct(sum((f) => reachedIn(f.killContacts)), read)}% on or beside, ` +
          `${sum((f) => f.unnamed)} named no block, ${sum((f) => f.ambiguous)} named more than one`
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
