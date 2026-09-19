// test/probes/run.mjs — The probe rig.
//
// A probe produces the figures this repository quotes: in comments, in tests,
// in TODO items and in the CHANGELOG. It reports and never asserts; the
// assertions stay in test/*.test.mjs, so a number moving is a thing you read
// rather than a build that fails.
//
// Every probe runs against both real engines, loaded through the same module
// the tests use. That is the point of the rig: the pulse cannon figures this
// work started from were taken on a sandbox copy of the engine, and a copy
// drifts, so a figure taken off a copy can be right about the copy and wrong
// about the game.
//
//   npm run probe -- <name> [--grid 205x50] [--grid 80x24] [--build browser]
//                            [--count 30] [--passes 5]
//
// With no --grid the probe runs at every grid in GRIDS. With no --build it runs
// both. `--count` narrows the placement walk, which is the one knob worth
// turning while iterating: every probe walks its full set by default, and a
// figure quoted anywhere in this repository is a full walk. Every probe prints
// its own method - the grid, the placement walk, the ship heights, the band and
// the frame rate - above its table, so a reader can rebuild the number without
// this file.
//
// `--passes` is for the probes whose walk is not deterministic. A staged
// engagement places its target and flies the same flight every time, so one
// pass is the figure; a probe that flies the run the game opens for itself is
// drawing a fresh sixty obstacles each time, and one pass of it is a sample
// rather than a measurement. Those probes take the spread over the passes they
// were asked for and print the number of passes beside it, so a figure quoted
// from one can be rebuilt by asking for the same number again.

import { GRIDS, BUILDS, parseGrid } from '../engagement.mjs';

const PROBES = {
  'seen-versus-kill': () => import('./seen-versus-kill.mjs'),
  'suite-replay': () => import('./suite-replay.mjs'),
  'frame-rate': () => import('./frame-rate.mjs'),
  'column': () => import('./column.mjs'),
  'free-flight': () => import('./free-flight.mjs'),
};

function parseArgs(argv) {
  const out = { name: null, grids: [], builds: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--grid') out.grids.push(parseGrid(argv[++i]));
    else if (arg === '--count') out.count = Number(argv[++i]);
    else if (arg === '--passes') out.passes = Number(argv[++i]);
    else if (arg === '--build') out.builds.push(argv[++i]);
    else if (!out.name) out.name = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  if (!out.grids.length) out.grids = GRIDS;
  out.builds = out.builds.length
    ? out.builds.map((name) => {
      const build = BUILDS.find((b) => b.name === name);
      if (!build) throw new Error(`no such build: ${name}`);
      return build;
    })
    : BUILDS;
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.name || !PROBES[args.name]) {
  console.error('usage: npm run probe -- <name> [--grid WxH] [--build terminal|browser] [--count N] [--passes N]');
  console.error(`probes: ${Object.keys(PROBES).join(', ')}`);
  process.exit(1);
}

const probe = await PROBES[args.name]();
await probe.run(args);
