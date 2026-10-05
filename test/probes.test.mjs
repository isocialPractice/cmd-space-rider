// test/probes.test.mjs — The probe rig's flag table, checked against the probes.
//
// test/probes/probes.mjs says of its own table that "a probe gaining or losing
// an argument is a line changed here rather than a flag silently ignored". That
// held only while somebody kept the two in step by hand. Drop `count` from the
// destructuring in test/probes/column.mjs and the rig still accepts
// `--count 6`, still prints "contact: N placements", and still reports a figure
// a reader takes for a narrowed walk - because the table still lists the flag.
// Nothing failed, because nothing looked.
//
// So the table is read against the probes themselves here, rather than against
// a second copy of it. The probes are imported and their `run()` asked what it
// destructures; the refusal is spawned, because a non-zero exit is the part
// three documents promise and the part a caller actually meets.
//
// Reading what `run()` destructures covers the probe's contract with the rig and
// stops there. A probe's other seam is the harness it calls, and that one moved
// in 0.8.1-alpha: `ghostFlight` gained a leading `build` parameter, and `creep`
// in test/probes/column.mjs was updated to pass it with nothing watching the
// probe's side of it. The harness's own side is watched - `the harness steps a
// bolt at the engine's speed, not a figure of its own` in
// test/pulse-cannon.test.mjs calls `ghostFlight` at two speeds and fails if the
// parameter goes away - but no path through `npm test` reached the call in the
// probe. The glob takes `test/*.test.mjs`, so a probe is reached only by
// `npm run probe`, and the check above imports a probe's `run()` to read its
// parameter list rather than to call it. So every probe that calls the harness
// is also run here, on the smallest workload the rig can describe, with what it
// prints collected instead of printed.
//
// Nothing here pairs with test/parity.test.mjs. The rig is neither build.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './helpers.mjs';
import { BUILDS, GRIDS } from './engagement.mjs';
import { PROBES, FLAG_ARG } from './probes/probes.mjs';

const RUNNER = join(REPO_ROOT, 'test', 'probes', 'run.mjs');
const runner = (...argv) => spawnSync(process.execPath, [RUNNER, ...argv], { encoding: 'utf8' });

/**
 * The smallest workload the rig can hand a probe: one grid, one build, one
 * placement, one pass.
 *
 * Keyed by the property each flag arrives in rather than by the flag's own
 * word, so a probe is handed exactly what FLAG_ARG says it destructures and the
 * rig's own refusal is reproduced here rather than restated. A figure off this
 * workload is worth nothing - a narrowed walk is for iterating, and every
 * figure quoted in this repository is a full one - so nothing below reads a
 * number for its value. What is checked is that the calls happen and come back
 * with something.
 */
const NARROWED = { grids: [GRIDS[0]], builds: [BUILDS[0]], count: 1, passes: 1 };

/** The narrowed argument object for one probe, holding only the flags it reads. */
function narrowedArgs(name) {
  const args = {};
  for (const flag of PROBES[name].flags) args[FLAG_ARG[flag]] = NARROWED[FLAG_ARG[flag]];
  return args;
}

/**
 * Whether a probe calls the harness, read off its own source rather than listed
 * here, so a probe that starts calling it is covered without a line being added.
 *
 * `overlay-anchor` is the one this excludes. It loads the browser engine and the
 * page's stylesheet directly and imports nothing from test/engagement.mjs, so it
 * has no harness call to reach; it also reads no flags, which means its walk
 * cannot be narrowed and a full one is the better part of a minute.
 */
function callsHarness(name) {
  const src = readFileSync(join(REPO_ROOT, 'test', 'probes', `${name}.mjs`), 'utf8');
  return /from '\.\.\/engagement\.mjs'/.test(src);
}

/** A probe's `run()`, with what it prints collected instead of printed. */
async function runQuietly(mod, args) {
  const printed = [];
  const log = console.log;
  console.log = (...parts) => printed.push(parts.join(' '));
  try {
    await mod.run(args);
  } finally {
    console.log = log;
  }
  return printed;
}

/** The index of the `}` closing the `{` at `open`. */
function closingBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i;
  }
  throw new Error('unbalanced braces');
}

/** A pattern's top-level entries, so a nested default does not split one in two. */
function topLevel(pattern) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if ('{[('.includes(ch)) depth++;
    else if ('}])'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) { out.push(pattern.slice(from, i)); from = i + 1; }
  }
  out.push(pattern.slice(from));
  return out.map((part) => part.trim()).filter(Boolean);
}

/**
 * The names a function destructures out of its first argument, read off the
 * function rather than off the file - so this is the `run()` the rig will call
 * and not a lookalike somewhere else in the module.
 *
 * A probe taking no argument at all, as overlay-anchor does, destructures
 * nothing and comes back empty.
 */
function destructuredArgs(fn) {
  const src = String(fn);
  const open = src.indexOf('(');
  assert.ok(open >= 0, `no parameter list in: ${src.slice(0, 40)}`);

  // Walked to the paren that closes the parameter list, so the pattern is taken
  // from there and never from the body. `= {}` trails the pattern with a second
  // brace, which is why only the first one found is read.
  let depth = 0;
  let pattern = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') depth++;
    else if (ch === ')') { if (--depth === 0) break; }
    else if (ch === '{' && pattern === null) {
      const close = closingBrace(src, i);
      pattern = src.slice(i + 1, close);
      i = close;
    }
  }
  if (pattern === null) return [];

  return topLevel(pattern).map((part) => {
    assert.ok(!part.startsWith('...'), `a probe gathers a rest argument, which the table cannot describe: ${part}`);
    return part.split('=')[0].split(':')[0].trim();
  });
}

test('probes: every probe takes exactly the flags the table lists for it', async () => {
  const names = Object.keys(PROBES);
  assert.ok(names.length, 'the table lists probes');

  for (const name of names) {
    const probe = PROBES[name];
    const mod = await probe.load();
    assert.equal(typeof mod.run, 'function', `${name} exports no run()`);

    for (const flag of probe.flags) {
      assert.ok(flag in FLAG_ARG, `${name}: the table lists --${flag}, which the rig does not parse`);
    }

    const listed = [...new Set(probe.flags.map((flag) => FLAG_ARG[flag]))].sort();
    const taken = [...new Set(destructuredArgs(mod.run))].sort();
    assert.deepEqual(
      taken, listed,
      `${name} destructures ${taken.join(', ') || 'nothing'} and the table lists `
      + `${probe.flags.map((flag) => `--${flag}`).join(' ') || 'no flags'}`
      + ' - a flag either side of that is one the rig accepts and the probe never reads,'
      + ' or one the probe reads and the rig refuses'
    );
  }
});

test('probes: every probe that calls the harness is run against it', async () => {
  // The flag check above reaches a probe's `run()` without calling it, so a
  // probe's calls into test/engagement.mjs are reached by nothing in the suite.
  // Run on the narrowed workload, each probe makes those calls for real and has
  // to come back with a report. A signature that moved under a probe surfaces
  // here as a throw rather than as a dash in a table nobody runs.
  const reached = [];
  for (const name of Object.keys(PROBES)) {
    if (!callsHarness(name)) continue;
    reached.push(name);
    const printed = await runQuietly(await PROBES[name].load(), narrowedArgs(name));
    assert.ok(printed.length, `${name} ran against the harness and reported nothing`);
  }
  assert.ok(reached.length, 'some probe calls the harness');
  assert.ok(
    !reached.includes('overlay-anchor'),
    'overlay-anchor imports no harness, so running it here would buy a full viewport walk and no coverage'
  );
});

test('probes: the column probe reaches ghostFlight rather than printing its refusal', async () => {
  // The pairing that moved, checked in the direction it moved in. `creep` is not
  // exported, so the probe's own `run()` is what reaches it.
  //
  // A mispairing of the kind 0.8.1-alpha made possible throws rather than
  // reporting, and the check above catches it by running the probe at all: the
  // old two-argument call leaves the third parameter undefined, so `ghostFlight`
  // cannot destructure `x` out of it, and swapping the first two arguments reads
  // `state` off the build instead of the game. What this check adds is the quiet
  // way a creep row goes wrong, which is the one the rig cannot report on.
  // `ghostFlight` returns null when the walk finds no contact in its 400 frames,
  // `creep` reports that as null, and the probe prints it as `-` and exits zero.
  // A table of dashes is the failure this file opens by naming: nothing failed,
  // because nothing looked.
  const printed = await runQuietly(await PROBES.column.load(), narrowedArgs('column'));
  const rows = printed.filter((line) => line.includes('creep in columns'));
  assert.equal(rows.length, 2, `the column probe printed ${rows.length} creep rows, not two`);

  for (const row of rows) {
    const readings = [...row.matchAll(/(\d+): (\S+)/g)];
    assert.equal(readings.length, 4, `four distances expected in: ${row.trim()}`);
    for (const [, at, figure] of readings) {
      assert.ok(
        Number.isFinite(Number(figure)),
        `the creep at ${at} read ${figure} rather than a column figure - `
        + 'ghostFlight found no contact for a staged target, and a dash is what the probe prints for it'
      );
    }
  }
});

test('probes: the table names every flag the rig parses, and no others', () => {
  // FLAG_ARG is the mapping the check above resolves the table through, so a
  // flag added to parseArgs and not to the mapping would take every probe that
  // reads it out of the check silently.
  const source = readFileSync(RUNNER, 'utf8');
  const parsed = [...source.matchAll(/arg === '--([\w-]+)'/g)].map((m) => m[1]).sort();
  assert.ok(parsed.length, 'the rig parses named flags');
  assert.deepEqual(parsed, Object.keys(FLAG_ARG).sort(), 'the rig parses the flags FLAG_ARG maps');
});

test('probes: a flag the named probe does not read is refused, not discarded', () => {
  // The end the item was opened on: a figure quoted from `--grid 80x24` on a
  // probe that never saw the grid is a figure from a walk that never happened.
  // Spawned rather than imported, because the exit code is what CHEATSHEET.md,
  // docs/cheatsheet.html and docs/development.html all promise a caller.
  const refused = runner('overlay-anchor', '--grid', '80x24');
  assert.equal(refused.status, 1, `the rig exited ${refused.status} on a flag it refuses`);
  assert.match(refused.stderr, /overlay-anchor does not take --grid/);
  assert.match(refused.stderr, /it takes: no flags/);

  const taken = PROBES['overlay-anchor'].flags;
  assert.deepEqual(taken, [], 'overlay-anchor is the probe that takes no flags, which is what makes it the one to refuse with');
});

test('probes: naming no probe prints the table and exits non-zero', () => {
  const usage = runner();
  assert.equal(usage.status, 1, `the rig exited ${usage.status} with no probe named`);
  for (const [name, probe] of Object.entries(PROBES)) {
    assert.ok(usage.stderr.includes(name), `the listing omits ${name}`);
    const flags = probe.flags.length ? probe.flags.map((flag) => `--${flag}`).join(' ') : 'no flags';
    assert.ok(usage.stderr.includes(flags), `the listing omits ${name}'s flags: ${flags}`);
  }
});
