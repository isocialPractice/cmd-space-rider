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
// Nothing here pairs with test/parity.test.mjs. The rig is neither build.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './helpers.mjs';
import { PROBES, FLAG_ARG } from './probes/probes.mjs';

const RUNNER = join(REPO_ROOT, 'test', 'probes', 'run.mjs');
const runner = (...argv) => spawnSync(process.execPath, [RUNNER, ...argv], { encoding: 'utf8' });

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
