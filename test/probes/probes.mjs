// test/probes/probes.mjs — The probe table, and the flags each probe reads.
//
// Its own module rather than a const inside run.mjs, because run.mjs runs a
// probe at import: it reads process.argv at the top level and awaits the probe
// it names, so nothing can read the table without running something. That is
// why the table went unchecked for as long as it did - the check that the table
// and the probes agree needs the table, and the only file holding it could not
// be imported.
//
// test/probes.test.mjs imports it here and asserts, for every probe, that its
// flags are exactly the arguments its own run() destructures.

/**
 * Every probe, with the flags its own `run()` actually reads. The flag list is
 * what the rig checks a command line against, so a probe gaining or losing an
 * argument is a line changed here rather than a flag silently ignored.
 *
 * `load` is a thunk so that naming a probe does not import every other one: a
 * probe pulls in an engine, and the rig runs one at a time.
 */
export const PROBES = {
  'seen-versus-kill': { load: () => import('./seen-versus-kill.mjs'), flags: ['grid', 'build', 'count'] },
  'suite-replay': { load: () => import('./suite-replay.mjs'), flags: ['grid', 'build'] },
  'frame-rate': { load: () => import('./frame-rate.mjs'), flags: ['grid', 'build', 'count'] },
  'column': { load: () => import('./column.mjs'), flags: ['grid', 'build', 'count'] },
  'free-flight': { load: () => import('./free-flight.mjs'), flags: ['grid', 'build', 'count', 'passes'] },
  'overlay-anchor': { load: () => import('./overlay-anchor.mjs'), flags: [] },
};

/**
 * The property of parseArgs' result each flag arrives in, which is not always
 * the flag's own word: `--grid` and `--build` may each be passed more than
 * once, so they collect into `grids` and `builds` and a probe destructures the
 * plural. Declared here rather than worked out twice, so the check in
 * test/probes.test.mjs reads the rig's own mapping instead of carrying a copy
 * that agrees with itself.
 */
export const FLAG_ARG = {
  grid: 'grids',
  build: 'builds',
  count: 'count',
  passes: 'passes',
};
