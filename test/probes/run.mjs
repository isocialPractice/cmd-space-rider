// test/probes/run.mjs — The probe rig.
//
// A probe produces the figures this repository quotes: in comments, in tests,
// in TODO items and in the CHANGELOG. It reports and never asserts; the
// assertions stay in test/*.test.mjs, so a number moving is a thing you read
// rather than a build that fails.
//
// Every probe measures a real engine, loaded through the same module the tests
// use. That is the point of the rig: the pulse cannon figures this work started
// from were taken on a sandbox copy of the engine, and a copy drifts, so a
// figure taken off a copy can be right about the copy and wrong about the game.
// The probes that fly a shot run against both engines; overlay-anchor loads the
// browser alone, because a terminal has no touch overlay to place.
//
//   npm run probe -- <name> [--grid 205x50] [--grid 80x24] [--build browser]
//                            [--count 30] [--passes 5]
//
// Not every probe takes every flag - the table below is what each one reads, and
// `npm run probe` with no name prints it. A flag the named probe does not read
// is refused rather than discarded: a figure quoted from `--grid 80x24` on a
// probe that never saw the grid is a figure from a walk that never happened.
//
// For a probe that takes them: with no --grid it runs at every grid in GRIDS,
// and with no --build it runs both. `--count` narrows the placement walk, which
// is the one knob worth turning while iterating - every probe walks its full set
// by default, and a figure quoted anywhere in this repository is a full walk.
// Every probe prints its own method - the grid, the placement walk, the ship
// heights, the band and the frame rate - above its table, so a reader can
// rebuild the number without this file.
//
// `--passes` narrows the probes that fly more than one world. A staged
// engagement places its target and flies the same flight every time, so it has
// one world and takes no passes; a probe that flies the run the game opens for
// itself has a set of seeded worlds and walks all of them by default, taking
// the spread across them. Passing a number flies the first N of the set, which
// is for iterating - a figure quoted anywhere in this repository is the whole
// set. No probe here is a sample any more: every walk is seeded, so a figure
// is rebuilt by running the probe again rather than by averaging it.

import { GRIDS, BUILDS, parseGrid } from '../engagement.mjs';

/**
 * Every probe, with the flags its own `run()` actually reads. The flag list is
 * what the rig checks a command line against, so a probe gaining or losing an
 * argument is a line changed here rather than a flag silently ignored.
 */
const PROBES = {
  'seen-versus-kill': { load: () => import('./seen-versus-kill.mjs'), flags: ['grid', 'build', 'count'] },
  'suite-replay': { load: () => import('./suite-replay.mjs'), flags: ['grid', 'build'] },
  'frame-rate': { load: () => import('./frame-rate.mjs'), flags: ['grid', 'build', 'count'] },
  'column': { load: () => import('./column.mjs'), flags: ['grid', 'build', 'count'] },
  'free-flight': { load: () => import('./free-flight.mjs'), flags: ['grid', 'build', 'count', 'passes'] },
  'overlay-anchor': { load: () => import('./overlay-anchor.mjs'), flags: [] },
};

function parseArgs(argv) {
  // `given` is the flags the command line carried, kept apart from the values
  // below because those are defaulted: `grids` is GRIDS whether or not --grid
  // was passed, so it cannot answer what the caller actually asked for.
  const out = { name: null, grids: [], builds: [], given: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--grid') { out.given.add('grid'); out.grids.push(parseGrid(argv[++i])); }
    else if (arg === '--count') { out.given.add('count'); out.count = Number(argv[++i]); }
    else if (arg === '--passes') { out.given.add('passes'); out.passes = Number(argv[++i]); }
    else if (arg === '--build') { out.given.add('build'); out.builds.push(argv[++i]); }
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

/** The flags one probe takes, for a message. */
const flagList = (flags) => (flags.length ? flags.map((flag) => `--${flag}`).join(' ') : 'no flags');

function usage() {
  console.error('usage: npm run probe -- <name> [--grid WxH] [--build terminal|browser] [--count N] [--passes N]');
  console.error('probes, with the flags each one takes:');
  for (const [name, probe] of Object.entries(PROBES)) {
    console.error(`  ${name.padEnd(17)} ${flagList(probe.flags)}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const probe = PROBES[args.name];

if (!probe) {
  usage();
  process.exit(1);
}

// Refused rather than ignored. A probe whose run() takes no parameters cannot
// report that it was handed a grid, so the rig is the only place this can be
// caught, and the cost of not catching it is a figure attributed to a walk that
// never happened.
const refused = [...args.given].filter((flag) => !probe.flags.includes(flag));
if (refused.length) {
  console.error(`${args.name} does not take ${refused.map((flag) => `--${flag}`).join(', ')}`);
  console.error(`it takes: ${flagList(probe.flags)}`);
  process.exit(1);
}

await (await probe.load()).run(args);
