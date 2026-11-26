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
 * The smallest workload the rig can hand a probe: one grid, one build, and the
 * smallest `count` and `passes` it takes.
 *
 * Named by the flags rather than by what they narrow, because `count` is not
 * one unit across the six probes that read it. In `column`, `frame-rate` and
 * `seen-versus-kill` it is the placement walk, so `count: 1` is one placement.
 * `free-flight` reads the same flag as frames - `const frames = count ??
 * FREE_FRAMES` - so `count: 1` flies a single frame, and its flight rows come
 * back with no volleys and no kills, nothing having been fired in one frame.
 * What reaches the harness there is the rate walk at FREE_RATE_FRAMES and the
 * dark walk, neither of which `count` narrows - so it is much the slowest probe
 * here, and this is still the smallest workload the rig can ask it for.
 * `drop-clip` reads it as frames as well, and `passes` as measurements of the
 * pair it times, so `count: 1, passes: 1` is one frame timed once either way.
 * `versus-half` reads it as the seconds of game time its flight runs out to, so
 * `count: 1` is a one-second flight: none of the probe's own marks is reached,
 * and it reports the width the readings a second into a run want instead.
 * `section-jolt` takes no `count` at all and reads `passes` as the seeded worlds
 * it walks, so `passes: 1` is one section opened and closed - a rate over one
 * world, which is the clearest case of a figure off this workload being worth
 * nothing.
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
 * The probes that call no harness, declared rather than inferred, so a third one
 * has to be written down here before the suite will accept it.
 *
 * `callsHarness` below is what actually decides, by reading each probe's source,
 * and this list does not drive that - it pins it. The two this excludes:
 *
 * - `overlay-anchor` loads the browser engine and the page's stylesheet directly
 *   and imports nothing from test/engagement.mjs, so it has no harness call to
 *   reach.
 * - `glyph-tuning` loads the browser engine through test/helpers.mjs and
 *   likewise imports no engagement, so it has none either.
 *
 * Neither reads a flag, which means neither walk can be narrowed and a full one
 * is the better part of a minute - the second reason running them against the
 * harness would buy time and no coverage. `docs/development.html` states the
 * same pair, `publishedExclusions` below reads it back out of the page, and the
 * two assertions at the foot of the harness test are what keep the three of
 * them from drifting apart: one against the probes the walk actually left out,
 * one against the pair the docs publish.
 */
const HARNESS_EXCLUSIONS = ['glyph-tuning', 'overlay-anchor'];

/**
 * The exclusion pair `docs/development.html` publishes, read out of the page.
 *
 * The third party to the pinning, and the one that was unpinned until 0.10.2:
 * the docs sentence is what exposed the undeclared exclusion in the first
 * place, and nothing in the suite read it. `test/docs-site.test.mjs` names
 * neither probe, so the published pair could be edited to any two names and
 * the suite passed - checked by publishing "`overlay-anchor` and `frame-rate`"
 * and running `npm test`: 684 pass, 0 fail, which is the drift the docstring
 * above claimed could not happen.
 *
 * The sentence is matched by its own closing words rather than by position, so
 * the paragraph can be rewritten around it. What it has to keep is the shape:
 * the probe names in `<code>` immediately before "are left out". A rewrite that
 * drops that fails here as an unreadable sentence rather than passing on a pair
 * nobody found.
 */
function publishedExclusions() {
  const page = readFileSync(join(REPO_ROOT, 'docs', 'development.html'), 'utf8');
  const sentence = page.match(/((?:<code>[a-z-]+<\/code>(?:,\s|,?\sand\s)?)+)\s+are left out/);
  assert.ok(
    sentence,
    'docs/development.html states no "<probe> and <probe> are left out" sentence - the'
    + ' published pair is what HARNESS_EXCLUSIONS is checked against, so a paragraph that'
    + ' no longer names the pair in that shape leaves the docs copy unpinned'
  );
  return [...sentence[1].matchAll(/<code>([a-z-]+)<\/code>/g)].map(([, name]) => name).sort();
}

/**
 * An import of test/engagement.mjs, in the forms this repository can produce:
 * the static `from` and the dynamic `import(`, against either quote.
 *
 * The pattern this replaces was `/from '\.\.\/engagement\.mjs'/`, which read the
 * static single-quoted form and nothing else - `await import('../engagement.mjs')`
 * answered false, and so did `from "../engagement.mjs"`. For the eight probes
 * expected to call the harness a misread is caught by the two-direction
 * `deepEqual` at the foot of the harness test: the probe drops out of `reached`,
 * `excluded` stops matching HARNESS_EXCLUSIONS, and the message names it. For
 * `glyph-tuning` and `overlay-anchor` it is not caught at all - a `false` there
 * agrees with the declared list, `excluded` still equals `declared`, and that
 * probe's harness calls are reached by nothing while the suite stays green.
 * `npm test` globs `test/*.test.mjs`, so the harness test is the only path in
 * the suite that runs a probe at all.
 *
 * The dynamic form is not hypothetical here: test/probes/probes.mjs loads every
 * one of the ten probes with `import()`, which is the shape this file's own
 * header is an argument against meeting by accident.
 *
 * The quote has to follow the keyword, which is what keeps this off a sentence.
 * HARNESS_EXCLUSIONS's own docstring above says of `overlay-anchor` that it
 * "imports nothing from test/engagement.mjs" - prose, unquoted, and no match.
 * That sentence is this file's, not the probe's: test/probes/overlay-anchor.mjs
 * never names the engagement at all, and neither does `glyph-tuning`, so the
 * negative fixture below has no probe line to quote and takes this file's own
 * sentence instead. The exclusion itself is read off those same two sources:
 * `callsHarness` finds no import in either, the harness run skips them on that
 * reading, and HARNESS_EXCLUSIONS pins the answer rather than supplying it.
 */
const HARNESS_IMPORT = /(?:from|import\s*\()\s*(['"])[^'"]*\/engagement\.mjs\1/;

/**
 * Whether a probe calls the harness, read off its own source rather than listed
 * here, so a probe that starts calling it is covered without a line being added.
 *
 * The probes this currently excludes are named in HARNESS_EXCLUSIONS above, with
 * the reason each is out.
 *
 * Takes the source text as a parameter, the way `claimsIn` does below, so a form
 * the repository does not currently hold can be read without editing a probe to
 * hold one. That is the same file's own precedent, and it is what lets every
 * form the pattern has to read be read in a single case.
 */
function callsHarness(name, src = null) {
  const text = src ?? readFileSync(join(REPO_ROOT, 'test', 'probes', `${name}.mjs`), 'utf8');
  return HARNESS_IMPORT.test(text);
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

  // Both directions, against the declared list rather than against a probe
  // named inline. A probe that appears here is one running for no coverage and
  // paying a full un-narrowable walk for it; a probe that disappears from
  // `reached` is one whose harness calls stopped being reached, which is the
  // silent half - `callsHarness` reads the source, so dropping the engagement
  // import removes a probe from this test with no line changed anywhere.
  const excluded = Object.keys(PROBES).filter((name) => !reached.includes(name)).sort();
  const declared = [...HARNESS_EXCLUSIONS].sort();
  assert.deepEqual(
    excluded, declared,
    `the probes left out of the harness run are ${excluded.join(', ') || 'none'} and the`
    + ` declared exclusions are ${declared.join(', ')} - a probe either side of that is one`
    + ' running here for no coverage, or one whose harness calls stopped being reached'
    + ' without the exclusion being declared'
  );

  // And the third party to it. The walked set and the declared list are both in
  // test/, so the pair docs/development.html publishes could name any two probes
  // and nothing failed. It is the sentence that exposed the undeclared exclusion
  // this list was written for, which is reason enough to hold it to the list.
  const published = publishedExclusions();
  assert.deepEqual(
    published, declared,
    `docs/development.html publishes ${published.join(', ')} as left out of the harness run`
    + ` and the declared exclusions are ${declared.join(', ')} - the published pair is what a`
    + ' reader goes by, so a name either side of that is documentation for a run the suite'
    + ' is not making'
  );
});

test('probes: a harness call is read whichever import form it is written in', () => {
  // The two declared exclusions are why this is a case rather than a reading of
  // the probes as they stand. For the eight probes that do call the harness a
  // misread surfaces in the `deepEqual` above - the probe leaves `reached`, so
  // `excluded` stops matching HARNESS_EXCLUSIONS and the message names it. For
  // `glyph-tuning` and `overlay-anchor` a misread agrees with the declared list:
  // `excluded` still equals `declared`, the suite stays at its full count, and
  // that probe's harness calls are reached by nothing. The harness test is the
  // only path in the suite that runs a probe at all, so nothing else in the
  // suite reaches those calls to find them missing.
  //
  // What is read here is the pattern, not the pair's two files. Their own
  // sources are read against `callsHarness` elsewhere - the `deepEqual` at the
  // foot of the harness test above holds them out of `reached`, and the
  // sole-claim test below holds `pair.filter((name) => !callsHarness(name))`
  // equal to the pair - and no reading of that shape can catch a misread,
  // because `false` is the answer every one of them is written to expect. A
  // misread is a property of the pattern rather than of `glyph-tuning` or
  // `overlay-anchor`, so reading the forms is the whole of what covers those
  // two, and an assertion here that `callsHarness` answers `false` for the pair
  // would be a third statement of a condition those two assertions already
  // hold.
  //
  // The pattern this pins replaced one that read the static single-quoted import
  // alone, and test/probes/probes.mjs loads every one of the ten probes with
  // `import()` - so the form it could not read is one this repository already
  // writes. The text is a parameter, which is what lets every form be read here
  // rather than by editing a probe into one of them.
  const forms = [
    { was: 'the static import, single quoted', src: "import { BUILDS } from '../engagement.mjs';" },
    { was: 'the static import, double quoted', src: 'import { BUILDS } from "../engagement.mjs";' },
    { was: 'the dynamic import, single quoted', src: "const { BUILDS } = await import('../engagement.mjs');" },
    { was: 'the dynamic import, double quoted', src: 'const { BUILDS } = await import("../engagement.mjs");' },
    { was: 'a dynamic import with the space the parser allows', src: "await import ('../engagement.mjs')" },
  ];
  for (const { was, src } of forms) {
    assert.ok(
      callsHarness('a source read on its own', src),
      `${was} is not read as a harness call, so a probe written that way drops out of the`
      + ` harness run with nothing refusing it - ${src}`
    );
  }

  // And the shape a widened pattern invites: the file named in a sentence rather
  // than imported. The second is a real line from a probe that names the
  // engagement without importing it, test/probes/frame-rate.mjs:15. The first is
  // not from a probe at all: it is this file's own HARNESS_EXCLUSIONS docstring
  // rewritten as a `//` line, because the sentence saying `overlay-anchor`
  // imports no engagement lives here rather than in the probe, which never names
  // the engagement.
  const prose = [
    '// imports nothing from test/engagement.mjs, so it has no harness call to reach',
    '// The engagement flown from the ship is reported underneath, at the two ship',
  ];
  for (const src of prose) {
    assert.equal(
      callsHarness('a source read on its own', src), false,
      `prose naming the harness is read as a call into it, which would put a probe into the`
      + ` harness run on the strength of its own comment - ${src}`
    );
  }
});

/**
 * The declarations whose docstrings account for how a probe comes to be left out
 * of the harness run: the declared pair, the pattern that reads an import, the
 * function that decides, and the two sets of shapes this case reads for - which
 * state the account themselves, in the course of saying what they refuse and
 * what they accept. Between them they have to state one account rather than two.
 *
 * What puts a paragraph in this list is a sentence affirming the reading, and a
 * paragraph had twice been left out of it on no better ground than being written
 * in the same turn as the list: `READING_DENIED` for a version, under a sentence
 * saying of three that "nothing else in the file states it", and
 * `READING_AFFIRMED` in the turn that corrected that. Both are paragraphs a
 * denial is likeliest to reach, being the ones written about denials, and
 * neither was read.
 *
 * So what is pinned now is the membership rather than the members.
 * `accountByAffirmation` below walks every top-level declaration in this file,
 * takes the docstring above each, and keeps the ones `readingAffirmations`
 * answers for; `probes: the account lists every docstring that states the
 * reading` holds that set equal to this list in both directions. A new paragraph
 * affirming the reading has to be listed before the suite will accept it, and a
 * listed one whose sentence goes is named from the other side rather than held
 * to an account it no longer makes. The list stays, because it is what the case
 * below iterates and what the second direction is compared against. What it is
 * no longer is the only statement of who belongs.
 *
 * The cost is that the reading is wider than the account, and this is the half
 * chosen deliberately. `READING_AFFIRMED` takes either of the two phrasings the
 * file writes the account in, and neither is quoted in this paragraph on
 * purpose: a docstring outside the list that quoted one would be pulled into the
 * set by its own example, which is the hazard `docstringAbove` records below
 * from the fixtures' side. Narrowing is no better. `HARNESS_IMPORT`'s
 * affirmation names two sources and no probe, so requiring a probe as the object
 * drops a member the account needs; and requiring the paragraph to name the
 * harness or the exclusion as well keeps all five while excluding nothing that
 * is out today, so it would pin nothing, and it would still not tell
 * `publishedExclusions` from a member, that paragraph being about the exclusion
 * throughout. So a docstring that comes to affirm the reading about some other
 * subject is pulled in. That is the cheaper of the two errors: a paragraph
 * wrongly pulled in fails loudly, names itself in the message, and is settled by
 * one line either way, while a paragraph left out is read by nothing at all -
 * and that one has already happened twice, in consecutive versions, to the two
 * paragraphs a denial is likeliest to reach.
 *
 * Every other declaration in the file is out because it carries no such
 * sentence, the nearest of them being the ones this case is built out of:
 * `publishedExclusions` accounts for the docs copy being pinned, and
 * `docstringAbove`, `flatProse`, `readingDenials`, `readingAffirmations` and
 * this docstring for how the text is found, flattened, read and listed. Each
 * would be held here to an account it does not make, which is what adding one
 * shows - the case fails on the affirmation that paragraph has no sentence for,
 * and the membership check names it from the other side.
 *
 * Read by name rather than by line, so the account travels with the declaration
 * it belongs to.
 */
const EXCLUSION_ACCOUNT = [
  'const HARNESS_EXCLUSIONS',
  'const HARNESS_IMPORT',
  'function callsHarness',
  'const READING_DENIED',
  'const READING_AFFIRMED',
];

/**
 * The docstring directly above a top-level declaration, with nothing but
 * whitespace between the two. `required: false` answers `null` for a declaration
 * carrying none, which is how the membership check walks a file whose
 * declarations mostly do not.
 *
 * What bounds the read is the docstring rather than the list of declarations.
 * The fixtures this case is built out of are written out in full in the test
 * bodies below - a guard that reads its own source cannot hold the sentence it
 * refuses - and no test body is a docstring, so running this over every
 * declaration in the file reaches none of them. What it does reach is every
 * other paragraph, which is why `EXCLUSION_ACCOUNT` quotes neither affirming
 * phrasing: a docstring is read whether or not the account is its subject.
 */
function docstringAbove(src, declaration, { required = true } = {}) {
  const at = src.indexOf(`\n${declaration}`);
  assert.ok(at > 0, `${declaration} is not declared at the top level of test/probes.test.mjs`);
  const close = src.lastIndexOf('*/', at);
  const open = src.lastIndexOf('/**', close);

  // Asked for by name, a missing paragraph is a fault: the account names the
  // declaration whose docstring is to be read. Walked to by the enumerator it is
  // the ordinary case, most of this file's declarations carrying no docstring at
  // all, so the two assertions below are skipped rather than reworded.
  const carries = open >= 0 && close > open && src.slice(close + 2, at).trim() === '';
  if (!carries && !required) return null;

  assert.ok(open >= 0 && close > open, `${declaration} carries no docstring`);
  assert.equal(
    src.slice(close + 2, at).trim(), '',
    `the block comment above ${declaration} is separated from it by code, so it documents`
    + ' something else and this is reading the wrong paragraph'
  );
  return src.slice(open, close + 2);
}

/**
 * Every top-level declaration in a module, in the form `EXCLUSION_ACCOUNT`
 * writes them: the keyword and the name, one space between, with `export ` kept
 * where a declaration carries it.
 *
 * Top level is column zero, which is what this file's layout makes of it - a
 * declaration inside a test body is indented, and a line inside a block comment
 * opens on the comment's own furniture. The keywords are the ones a module can
 * hold rather than the ones this file holds today, because a declaration written
 * in a form this does not list is one the membership check cannot see, and a
 * paragraph nothing sees is the error that check exists for.
 */
const TOP_LEVEL_DECLARATION = /^((?:export )?(?:async function|function|class|const|let|var)) ([A-Za-z_$][\w$]*)/gm;

/** The declarations that pattern finds, in the form `docstringAbove` takes. */
const topLevelDeclarations = (src) => [...src.matchAll(TOP_LEVEL_DECLARATION)]
  .map(([, keyword, name]) => `${keyword} ${name}`);

/**
 * Prose denying that a probe's exclusion is read off the probe's own source.
 *
 * `callsHarness` is what decides, by reading each source, and the `continue` in
 * the harness test above is where that answer is spent; HARNESS_EXCLUSIONS pins
 * it rather than supplying it. A sentence saying the opposite costs more than
 * its own accuracy: a reader who believes it has been told the list decides,
 * which is the inference `callsHarness`'s docstring was written to refuse, and
 * acting on it turns a read-off-source design back into a hand-maintained list.
 * 0.16.8 took such a clause out of HARNESS_IMPORT's docstring - the second
 * correction to these paragraphs in two versions - and nothing in the suite had
 * read any of them.
 *
 * What is matched is the denial rather than the subject, because the subject is
 * what varies and the true account needs the same words for itself.
 * HARNESS_EXCLUSIONS is "declared rather than inferred", which is true of the
 * list and is held below as a fixture that has to keep passing. What is never
 * true is that the probe could not be read.
 */
const READING_DENIED = [
  /(?:rather than|instead of) (?:being )?read(?:ing)? off (?:the |its |that )?[a-z' ]*(?:probe|source)/g,
  /(?:cannot|can't|could not|couldn't) be read off (?:the |its |that )?[a-z' ]*(?:probe|source)/g,
];

/**
 * A docstring or a loose sentence as one line, with the comment furniture gone,
 * so a clause broken over two comment lines is one sentence to both readers
 * below.
 *
 * Shared rather than written out in each of them: a denial and an affirmation
 * read off differently flattened text could both be false of the same
 * paragraph, which is the one answer this pair must not be able to give.
 */
const flatProse = (text) => text.replace(/^\s*\*\s?/gm, '').replace(/`/g, '').replace(/\s+/g, ' ');

/**
 * Every denial in a stretch of text.
 *
 * Takes the text rather than a path, the way `claimsIn` and `callsHarness` do:
 * the clause this was written for is gone from the file, so a reader that could
 * only take the file as it stands would never have been shown to catch anything.
 */
function readingDenials(text) {
  const flat = flatProse(text);
  return READING_DENIED.flatMap((shape) => [...flat.matchAll(shape)].map(([said]) => said));
}

/**
 * Prose affirming what the shapes above refuse: the exclusion read off the
 * probe's own source.
 *
 * Refusing the denial passes a paragraph that says nothing either way, and that
 * is how the case below came to be named for an affirmation it did not hold.
 * Deleting the sentence 0.16.8 wrote into HARNESS_IMPORT's docstring - "The
 * exclusion itself is read off those same two sources" - leaves that paragraph
 * silent on the reading and denying nothing, so the case passed under a name
 * saying the paragraph states it. Both halves are held per docstring now, and
 * the two fixtures in the case tell the deletion from the sentence it removed.
 *
 * One shape, which the alternation is what carries: the account is written
 * either as the answer being "read off" a source or as `callsHarness` "reading
 * each" of them, and the file has both. The noun has to follow, so a sentence
 * about reading something else is not an affirmation of this one.
 */
const READING_AFFIRMED = /read(?:s|ing)? (?:off|each) [a-z' ]*(?:probe|source)s?/g;

/** Every affirmation in a stretch of text, flattened the same way. */
function readingAffirmations(text) {
  return [...flatProse(text).matchAll(READING_AFFIRMED)].map(([said]) => said);
}

/**
 * The declarations whose docstrings put them in the exclusion account, taken off
 * the file rather than from a list: every top-level declaration carrying a
 * docstring `readingAffirmations` answers for.
 *
 * `EXCLUSION_ACCOUNT` is held equal to this in both directions by the membership
 * case below, which is what makes that list a pinning of who belongs rather than
 * the only statement of it. Its own docstring records why this reading is the
 * wide one and what the width costs.
 */
const accountByAffirmation = (src) => topLevelDeclarations(src)
  .filter((declaration) => {
    const paragraph = docstringAbove(src, declaration, { required: false });
    return paragraph !== null && readingAffirmations(paragraph).length > 0;
  })
  .sort();

test('probes: every docstring in the account says the exclusion is read off the probe', () => {
  const src = readFileSync(join(REPO_ROOT, 'test', 'probes.test.mjs'), 'utf8');
  for (const declaration of EXCLUSION_ACCOUNT) {
    const paragraph = docstringAbove(src, declaration);
    const said = readingDenials(paragraph);
    assert.deepEqual(
      said, [],
      `${declaration}'s docstring says a probe's exclusion is not read off the probe -`
      + ` "${said.join('"; "')}". callsHarness reads every probe's source and the harness`
      + ' test skips whatever it answers false for, so the list pins that answer rather than'
      + ' supplying it, and a docstring saying otherwise is what turns the design back into a'
      + ' hand-maintained list'
    );

    // And the half the name promises, which refusing the denial does not reach:
    // a paragraph silent on the reading denies nothing, so it passed the check
    // above under a name saying it states the account.
    assert.ok(
      readingAffirmations(paragraph).length,
      `${declaration}'s docstring never says the exclusion is read off the probe's own`
      + ' source, so this case holds it to an account it does not make - either the sentence'
      + ' affirming the reading has gone out of the paragraph, in whichever of the two'
      + ' phrasings READING_AFFIRMED takes, or the declaration belongs out of'
      + ' EXCLUSION_ACCOUNT'
    );
  }

  // The clause 0.16.8 took out of HARNESS_IMPORT's docstring, which is what this
  // reads for. It closed a sentence that was true up to the comma, which is why
  // three passes over the paragraph left it standing.
  const was = 'test/probes/overlay-anchor.mjs never names the engagement at all, which is'
    + ' why the exclusion had to be written down here rather than read off the probe.';
  assert.deepEqual(
    readingDenials(was), ['rather than read off the probe'],
    'the clause this guard was written for is not read as a denial, so the guard passes on'
    + ` the one sentence it is known to have had to catch - ${was}`
  );

  // And the sentences that have to keep passing: the one that replaced it, and
  // the true half of HARNESS_EXCLUSIONS's own account, which spends the same
  // `rather than` on a different object. The first is the affirmation's fixture
  // below as well, declared once so both halves are read off one sentence
  // rather than off two copies of it that can drift.
  const states = 'The exclusion itself is read off those same two sources: callsHarness finds'
    + ' no import in either, the harness run skips them on that reading, and HARNESS_EXCLUSIONS'
    + ' pins the answer rather than supplying it.';
  const keeps = [
    states,
    'The probes that call no harness, declared rather than inferred, so a third one has to'
    + ' be written down here before the suite will accept it.',
    'Whether a probe calls the harness, read off its own source rather than listed here.',
  ];
  for (const text of keeps) {
    assert.deepEqual(
      readingDenials(text), [],
      'a true account of the list is read as a denial, which would leave the paragraph no'
      + ` correct wording to be written in - ${text}`
    );
  }

  // The affirmation's own pair: the sentence above, and the paragraph deleting
  // it leaves behind. The deletion is the state the denial half passes and this
  // half refuses, and it is the one the case was green under while its name
  // said otherwise.
  assert.deepEqual(
    readingAffirmations(states), ['read off those same two sources'],
    'the sentence that states the reading is not read as an affirmation, so a docstring'
    + ` could lose it and leave this case green under a name saying it is there - ${states}`
  );

  const silent = 'The quote has to follow the keyword, which is what keeps this off a'
    + " sentence. That sentence is this file's, not the probe's:"
    + ' test/probes/overlay-anchor.mjs never names the engagement at all.';
  assert.deepEqual(
    readingDenials(silent), [],
    `a paragraph silent on the reading is read as denying it - ${silent}`
  );
  assert.deepEqual(
    readingAffirmations(silent), [],
    'a paragraph silent on the reading is read as stating it, which is the state the'
    + ` deletion leaves and the whole of what this half is for - ${silent}`
  );
});

test('probes: the account lists every docstring that states the reading', () => {
  // Membership was the hand-kept half, and it is the half that failed twice:
  // `READING_DENIED` was left out of the list in the version that wrote it, and
  // `READING_AFFIRMED` in the version that corrected that - both of them
  // paragraphs about denials, and so the likeliest to carry one. Neither
  // omission was reachable by the case above, which opens only what the list
  // names: a paragraph that is not listed is a paragraph it never reads.
  //
  // Both directions, because each fails on its own. A paragraph affirming the
  // account and not listed is the omission that has twice happened; a listed
  // declaration whose sentence has gone is the case above holding a paragraph to
  // an account it no longer makes, which that case's own message offers as one
  // of its two answers and nothing else decides between.
  const src = readFileSync(join(REPO_ROOT, 'test', 'probes.test.mjs'), 'utf8');
  const found = accountByAffirmation(src);
  const listed = [...EXCLUSION_ACCOUNT].sort();
  assert.deepEqual(
    found, listed,
    `the docstrings in this file that state the exclusion is read off the probe's own source`
    + ` are ${found.join(', ') || 'none'} and EXCLUSION_ACCOUNT lists ${listed.join(', ')} - a`
    + ' paragraph on the left and not the right states the account with nothing reading it,'
    + ' which is how READING_DENIED and READING_AFFIRMED were each left out in the version'
    + ' that wrote them; one on the right and not the left has lost the sentence the case'
    + ' above holds it to, and belongs either out of the list or back in the paragraph'
  );

  // And the reader shown to catch the omission rather than only to agree with
  // the list as it stands, which is the standard the sole-claim reader is held
  // to below: the state it has to read is one this file does not hold, a
  // paragraph that states the account and is not listed.
  //
  // Written as lines joined rather than as a block, because a `const` at column
  // zero inside a template literal is one `topLevelDeclarations` reads as this
  // file's own - the fixture would enter the set above and fail the comparison
  // it is here to support. That is the same hazard `docstringAbove` records, met
  // from a third side.
  const module = [
    '', // docstringAbove finds a declaration at the start of a line.
    '/** Prose read off each probe, which is what puts a paragraph in the account. */',
    'const AFFIRMS = 1;',
    '',
    '/** A paragraph saying nothing about where the answer comes from. */',
    'const SILENT = 2;',
    '',
    'const UNDOCUMENTED = 3;',
  ].join('\n');
  assert.deepEqual(
    accountByAffirmation(module), ['const AFFIRMS'],
    'the membership reader does not answer with exactly the declaration whose docstring'
    + ' states the account - a reading that misses the affirming paragraph, or takes a silent'
    + ' or undocumented declaration for one, makes the comparison above agree with the list'
    + ' for a reason that has nothing to do with what the file says'
  );
});

test('probes: neither excluded probe names the engagement, in an import or in prose', () => {
  // The negative prose fixture above is this file's own sentence rather than a
  // probe's, and the reason is a property of the two probes: neither mentions
  // test/engagement.mjs at all, in an import or in a comment, so there is no
  // probe line to quote in its place. That was unpinned from the probes' side.
  // An import is caught by `callsHarness` and named by the `deepEqual` at the
  // foot of the harness test; a mention in prose is caught by nothing, and prose
  // is the whole reason the fixture is drawn from this file - a probe whose
  // header starts naming the engagement is a probe the fixture should quote
  // instead, with every assertion above still passing.
  //
  // The filter runs before the message is composed, which is the order the
  // subject requires: the line is matched as the probe wrote it, and the path is
  // added afterwards. Composing first put `test/probes/<name>.mjs` into the text
  // `includes('engagement')` was handed, so a probe whose own name held the word
  // - an `engagement-trace` declared above for importing no engagement - would
  // report every one of its lines as a mention, and the message would name the
  // file as naming the engagement when no line of it did. The declared pair
  // reads the same either way, neither name holding the word, which is what left
  // the order free to be the wrong one.
  for (const name of HARNESS_EXCLUSIONS) {
    const file = `test/probes/${name}.mjs`;
    const src = readFileSync(join(REPO_ROOT, 'test', 'probes', `${name}.mjs`), 'utf8');
    const named = src.split('\n')
      .map((line, i) => ({ line, at: i + 1 }))
      .filter(({ line }) => line.includes('engagement'))
      .map(({ line, at }) => `${file}:${at} ${line.trim()}`);
    assert.deepEqual(
      named, [],
      `${file} names the engagement, which the docstrings above say no excluded probe`
      + ' does - the first of them is where the negative prose fixture comes from, and it'
      + ` comes from there because no probe line said it - ${named.join(' | ')}`
    );
  }
});

/**
 * The two shapes a sentence giving one probe sole possession of a property is
 * written in, read against flattened text so one pattern covers a page, a
 * markdown file and a source comment alike - a `<code>` element on the page, a
 * backtick span in the markdown, and neither of them in a comment.
 *
 * The predicate ends at the full stop or at the colon that introduces the rest
 * of the paragraph, because `glyph-tuning`'s sentence in CHEATSHEET.md closes on
 * the colon.
 *
 * There are two shapes because the single one this check was written with read
 * only part of what it was written to refuse:
 *
 * - The predicate opens on `that` or `whose`, which is how every sentence in
 *   the published files is phrased - "`overlay-anchor` is the one that flies
 *   nothing".
 * - It opens on a participle instead, the relative pronoun dropped. "the one
 *   probe flying nothing" is the same claim as "the one probe that flies
 *   nothing" and was matched by nothing. A participle wants the noun in front of
 *   it to be grammatical, and requiring `probe` there is what keeps this shape
 *   off an ordinary sentence: test/probes/overlay-anchor.mjs says "which is the
 *   one reading test/helpers.mjs says is safe to restate", where the gerund is a
 *   noun and the subject is not a probe at all.
 *
 * `also` and `still` are allowed between `is` and `the one`, and `only` beside
 * `one`, for the same reason the second shape exists: the sentence in
 * test/probes/run.mjs that half of this test was written for read "glyph-tuning
 * is also the one probe that flies nothing", so a pattern without the adverb
 * walks past the claim that prompted it.
 */
const CLAIM_SHAPES = [
  /([a-z][a-z-]+) is (?:also |still )?the (?:one|only) (?:probe )?((?:that|whose)[^.:]*)[.:]/g,
  /([a-z][a-z-]+) is (?:also |still )?the (?:one|only) probe ([a-z]+ing[^.:]*)[.:]/g,
];

/**
 * Every sole-possession claim in a stretch of text: the probe it names, and the
 * property it claims is that probe's alone.
 *
 * Takes the text rather than a path, so the shapes can be read against a
 * sentence a file used to carry rather than only against the files as they
 * stand. `the sole-claim reader catches the shapes that got past it` below is
 * what reads them that way, and it is the only thing in the suite that has shown
 * this guard catching anything.
 */
function claimsIn(text, file) {
  const flat = text.replace(/<[^>]*>/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
  return CLAIM_SHAPES.flatMap((shape) => [...flat.matchAll(shape)]
    .map(([said, probe, property]) => ({
      file, probe, property: property.trim(), said: said.trim(),
    })));
}

/** The claims one file makes, read off the file rather than listed here. */
const soleClaims = (file) => claimsIn(readFileSync(join(REPO_ROOT, file), 'utf8'), file);

/**
 * The published files whose claims are read. CHEATSHEET.md and the page
 * published from it are both here rather than one standing for the other:
 * test/docs-site.test.mjs compares the two in one direction only, so a sentence
 * added to the page alone is the publishing working as far as that check is
 * concerned.
 */
const PUBLISHED = ['docs/development.html', 'CHEATSHEET.md', 'docs/cheatsheet.html'];

/**
 * The rig's own source, read beside the published files, which it was not until
 * 0.16.2.
 *
 * That gap was half of the fault this test was written for and the half it did
 * not reach. The two sentences in opposite sole possession of flying nothing
 * were one published paragraph and one source comment, so restoring the comment
 * to test/probes/run.mjs passed the suite while restoring the paragraph to
 * docs/development.html failed it - the guard covered the half that had already
 * been corrected. A probe's header is also read by whoever edits the probe,
 * which is the reader most likely to carry the property on into a comment of
 * their own.
 *
 * The per-probe files come off `PROBES` rather than a list, so a new probe's
 * header is read without a line being added here.
 */
const RIG_SOURCES = [
  'test/probes/run.mjs',
  'test/probes/probes.mjs',
  ...Object.keys(PROBES).map((name) => `test/probes/${name}.mjs`),
];

const READ_FOR_CLAIMS = [...PUBLISHED, ...RIG_SOURCES];

/**
 * The predicates that single out neither probe in HARNESS_EXCLUSIONS, because
 * each is true of both of them or false of both.
 *
 * Every one of these was reached for at some point as the thing that told the
 * pair apart, and the pair is where a sentence of this shape goes wrong: eight
 * probes fly a shot and two do not, so a property of *not* flying is a property
 * of two probes and never of one.
 *
 * - `flies nothing` and the flag phrases are true of both, and the test below
 *   derives them rather than trusting this list.
 * - `walks a space` and `walks viewports` are true of both as well, which is the
 *   less obvious half: `reachable` in test/probes/glyph-tuning.mjs walks every
 *   integer width from 200 to 2200 against heights from 150 to 1400 to find
 *   which font sizes `fitGrid` can actually settle on, so the probe that is
 *   supposed to be pure arithmetic walks viewports too.
 * - `measures nothing` and `counts nothing` are false of both, for the same
 *   reason: each counts outcomes over a walk whose answers it cannot know in
 *   advance - 682,500 viewports against the overlay, 11 font sizes against two
 *   cell models - so neither is the one that counts nothing either.
 * - `loads the browser alone` is true of both, and test/probes/run.mjs says so
 *   in those words one paragraph above where it used to say the other thing.
 *
 * Each property is listed in both inflections, because CLAIM_SHAPES reads a
 * predicate opening on a participle as well as one opening on a verb:
 * `flies nothing` and `flying nothing` are the same claim in the two shapes, and
 * a list carrying only the first refuses only the first.
 */
const SHARED_BY_THE_PAIR = [
  'flies nothing', 'flying nothing',
  'flies no', 'flying no',
  'walks a space', 'walking a space',
  'walks viewports', 'walking viewports',
  'measures nothing', 'measuring nothing',
  'counts nothing', 'counting nothing',
  'loads the browser alone', 'loading the browser alone',
  'reads no flag', 'reading no flag',
  'takes no flag', 'taking no flag',
];

/**
 * The orderings SHARED_BY_THE_PAIR is read in by the fixtures below. Nothing
 * about the list is ordered - it is a set of phrases, written in pairs so the
 * two inflections of a property sit together and a reader can see at a glance
 * that neither is missing - so an assertion whose answer changes when the list
 * is reordered is reading a position rather than a phrase.
 *
 * 0.16.3 replaced such an assertion, and said in its release note that the
 * suite "passes with the list sorted alphabetically". That was true and
 * verified by hand, and nothing in the suite read the list in any order but
 * the one it is written in, so the note was the only record of the property:
 * the pre-0.16.3 `find` form could be put back and `npm test` would pass on
 * the list as written. These are the orders that answer it instead.
 *
 * - `as written` is the list itself, which is what the fixtures have always
 *   read and what every other order has to agree with.
 * - `sorted alphabetically` is the order that broke all three fixtures, the
 *   published one first: it puts each short form ahead of the long form it is
 *   a prefix of - `flies no` before `flies nothing` - so a `find` over it
 *   answers with the prefix where the fixture names the full phrase. It is
 *   also the obvious thing to do to an 18-entry list, which is why it is the
 *   order worth pinning.
 * - `reversed` is the cheap second: it moves every pair without sorting them,
 *   so it catches an assertion that reads the list's first or last entry
 *   rather than the one the sentence gives away.
 */
const PHRASE_ORDERS = [
  { read: 'as written', list: SHARED_BY_THE_PAIR },
  { read: 'sorted alphabetically', list: [...SHARED_BY_THE_PAIR].sort() },
  { read: 'reversed', list: [...SHARED_BY_THE_PAIR].reverse() },
];

/**
 * Whether a name read out of a sentence is one of the rig's probes.
 *
 * Named rather than written inline, so the case below exercises the predicate
 * the check above actually takes rather than a copy of it.
 *
 * `Object.hasOwn` rather than `in`. `in` walks the prototype chain and PROBES is
 * a plain object literal (test/probes/probes.mjs), so every Object.prototype key
 * answers `true` to it - and one of them is reachable from the `([a-z][a-z-]+)`
 * capture in CLAIM_SHAPES, `constructor`, the rest carrying capitals or
 * underscores. So "the constructor is the one that flies nothing." named a probe
 * as far as the check was concerned, and the assertion written to catch a
 * sentence outliving a renamed probe passed on it with its own message reading
 * "is not a probe". `test/probes/*.mjs` headers are in READ_FOR_CLAIMS, and a
 * constructor is an ordinary thing for one of them to name.
 */
const isProbe = (name) => Object.hasOwn(PROBES, name);

test('probes: no sentence singles a probe out by a property the pair shares', () => {
  // 0.16.0 found docs/development.html calling `overlay-anchor` "the one that
  // flies nothing" while `glyph-tuning` flew nothing by the same test - and
  // test/probes/run.mjs calling `glyph-tuning` "the one probe that flies
  // nothing" while `overlay-anchor` did. Two claims of sole possession, each
  // disproved by the other: one in a published paragraph, one in the rig's own
  // source. Nothing in the suite read either sentence.
  //
  // The published half is what this test covered when it was written, which
  // left the source half unguarded until 0.16.2 - and the source half was the
  // one still worth guarding, the published sentence having been corrected in
  // the same release the test arrived in.
  //
  // What a probe reports and what its subject is can single it out and are
  // left alone here. What it does *not* do cannot, once two probes do not do
  // it, and that is the whole of what this refuses.
  const claims = READ_FOR_CLAIMS.flatMap(soleClaims);
  assert.ok(claims.length, 'no file in READ_FOR_CLAIMS makes a "<probe> is the one ..." claim');

  // Every claim names a probe. A sentence outliving a renamed probe publishes a
  // property with nothing left to be the property of.
  for (const { file, probe, said } of claims) {
    assert.ok(
      isProbe(probe),
      `${file} says "${said}", and ${probe} is not a probe - a sentence naming no probe is`
      + ' one nothing can be checked against'
    );
  }

  // The two halves of what the pair shares that the rig can compute, computed
  // rather than taken from the list above: neither flies, and neither reads a
  // flag. Both were written down as one probe's own property.
  const pair = [...HARNESS_EXCLUSIONS].sort();
  assert.deepEqual(
    pair.filter((name) => !callsHarness(name)).sort(), pair,
    `${pair.join(' and ')} are the probes that import no engagement, so flying nothing is a`
    + ' property of the pair and a sentence giving it to one of them is wrong about the other'
  );
  assert.deepEqual(
    pair.filter((name) => PROBES[name].flags.length === 0).sort(), pair,
    `and ${pair.join(' and ')} are the probes the table lists no flags for, so reading no flag`
    + ' is a property of the pair as well'
  );

  for (const { file, property, said } of claims) {
    const shared = SHARED_BY_THE_PAIR.find((phrase) => property.includes(phrase));
    assert.ok(
      !shared,
      `${file} says "${said}", and "${shared}" is true of both ${pair.join(' and ')} or of`
      + ' neither - so it singles out nothing. Name something the probe does not share: its'
      + ' subject, or a figure only it reports'
    );
  }
});

test('probes: the sole-claim reader catches the shapes that got past it', () => {
  // The check above reads the files as they stand, so it passes on a repository
  // with no such sentence in it - which is the state this repository was left in
  // by the release that corrected the sentences. Nothing had been shown to catch
  // anything. Two of the three sentences below are the ones this repository
  // carried, read on their own; the third is the shape the second pattern was
  // added for and no file here ever held:
  //
  // - the published one was carried, and was caught. It is here so the shape
  //   this test was written with stays covered by the shapes that replaced it;
  // - the rig's own header was carried, and got past on two counts: the file
  //   was not read, and the `also` fit no pattern;
  // - the participle form was never in any file here. It is the shape the
  //   second pattern was added for, and the one a reader reaches for when
  //   "that flies" reads stiffly, so it is pinned on its own merits rather
  //   than as something this repository has to repair.
  const sentences = [
    {
      was: 'the published shape this check was written with',
      text: '<p><code>overlay-anchor</code> is the one that flies nothing. It measures where'
        + " the browser build's three controls land.</p>",
      probe: 'overlay-anchor',
      reads: 'overlay-anchor is the one that flies nothing.',
      shared: 'flies nothing',
    },
    {
      was: "the rig's own header, in a file nothing read and with an adverb in it",
      text: '// glyph-tuning is also the one probe that flies nothing. It rebuilds the'
        + ' figures that tuning quotes about itself.',
      probe: 'glyph-tuning',
      reads: 'glyph-tuning is also the one probe that flies nothing.',
      shared: 'flies nothing',
    },
    {
      was: 'the same claim with the relative pronoun dropped',
      text: '// glyph-tuning is the one probe flying nothing. It rebuilds the figures that'
        + ' tuning quotes about itself.',
      probe: 'glyph-tuning',
      reads: 'glyph-tuning is the one probe flying nothing.',
      shared: 'flying nothing',
    },
  ];

  // Each order has to be a different order from every other, or the fixtures
  // below read one list twice and the order-freedom they are supposed to pin
  // goes back to being unexercised in that pass while the loop still runs. Every
  // pair of orders is compared rather than each order against the list as
  // written: comparing against `as written` alone leaves the orders after it
  // free to coincide with one another, and the state that gets past that is a
  // later edit writing SHARED_BY_THE_PAIR out in reverse-alphabetical order,
  // which leaves `[...written].sort()` and `[...written].reverse()` holding the
  // identical array - reversing an already reverse-sorted list sorts it - while
  // both still differ from the list as written. So the message names the two
  // orders that coincide rather than one of them, the edit that causes it being
  // a rewrite of the list rather than a change to PHRASE_ORDERS. The list is
  // written in inflection pairs rather than alphabetically, so each order moves
  // it today; this is what says so when an edit stops that being true rather
  // than leaving it to be noticed.
  for (const [i, { read, list }] of PHRASE_ORDERS.entries()) {
    for (const { read: before, list: earlier } of PHRASE_ORDERS.slice(0, i)) {
      assert.notDeepEqual(
        list, earlier,
        `SHARED_BY_THE_PAIR read ${read} and read ${before} are the same order, so one of the`
        + ' two reads changes nothing and the fixtures below pin no order-freedom in that pass.'
        + ' Either the list was rewritten into an order that leaves the two agreeing - written'
        + ' reverse-alphabetically, sorting it and reversing it answer alike - in which case one'
        + ' of them has to be replaced by an order that still moves it differently, or one of'
        + ' them is no longer being built from the list'
      );
    }
  }

  // And each of them has to be the same phrases in another order rather than
  // another list, which the pairwise check above cannot see: two orders built
  // from different lists differ from each other as readily as two orders of one
  // list do.
  for (const { read, list } of PHRASE_ORDERS.slice(1)) {
    assert.deepEqual(
      [...list].sort(), [...SHARED_BY_THE_PAIR].sort(),
      `SHARED_BY_THE_PAIR read ${read} holds different phrases from the list as written, so the`
      + ' fixtures would be reading a different list rather than the same one in another'
      + ' order - an order has to be a permutation of the list and nothing else'
    );
  }

  for (const { was, text: wrote, probe, reads, shared } of sentences) {
    const claims = claimsIn(wrote, 'a sentence read on its own');
    assert.equal(
      claims.length, 1,
      `${was}: the reader finds ${claims.length} claims in it rather than one - ${wrote}`
    );
    assert.equal(claims[0].probe, probe, `${was}: the claim it reads names ${probe}`);
    // The words the failure message quotes, which are the sentence as written
    // and not a template filled in from the parts: the shapes allow an adverb,
    // `only` and the noun, so a reconstruction sends a reader to the file
    // looking for a sentence it does not hold.
    assert.equal(
      claims[0].said, reads,
      `${was}: the claim is reported as "${claims[0].said}" rather than as the sentence`
      + ` itself, "${reads}"`
    );
    // Two assertions rather than one `find` compared against `shared`, because
    // the phrases are prefixes of one another - `flies no` of `flies nothing`,
    // `flying no` of `flying nothing` - and `find` answers in array order, so
    // pinning which of them matched pins the order the list happens to be
    // written in. Sorting SHARED_BY_THE_PAIR alphabetically, the obvious thing
    // to do to an 18-entry list, puts each short form ahead of the long one it
    // is a prefix of, and fails all three fixtures with the guard working
    // exactly as before. What the fixture stands in for is that the inflection
    // it names is in the list at all and that the sentence is the one giving
    // that inflection away, and neither of those depends on order.
    //
    // The second names `shared` rather than asking whether some phrase of the
    // list matched the property. A `some` refuses only a list that dropped the
    // participle phrases altogether, nothing else in the list being able to
    // match "flying nothing", and it leaves the fixture's own `shared`
    // answering to the list rather than to its sentence: the participle
    // fixture passes with `walks viewports` written in place of
    // `flying nothing`, naming a property its sentence never gave away. Read
    // against the property, `shared` is one phrase rather than a position, so
    // pinning it costs the order-freedom nothing. The check above reads the
    // same `find` only to name a phrase in its message and asserts on
    // `!shared`, so order cannot reach it there either.
    //
    // And the pair is read once per order in PHRASE_ORDERS rather than once
    // against the list as written, which is what makes the paragraph above a
    // property of the suite instead of a claim in a release note. Whatever
    // stands in this spot reads `list`, so the `find` form put back here
    // answers with `flies no` under the sorted order where the fixture names
    // `flies nothing`, and fails on the spot. The order is named in each
    // message because a failure under one order and a failure under all three
    // are different findings: the first is an assertion reading a position,
    // the second is the phrase genuinely being absent or wrong.
    for (const { read, list } of PHRASE_ORDERS) {
      assert.ok(
        list.includes(shared),
        `${was}: "${shared}" is not in SHARED_BY_THE_PAIR read ${read}, so nothing refuses`
        + ' the sentence - each property is listed in both inflections, and a list carrying'
        + ' one of them refuses only the one it carries'
      );
      assert.ok(
        claims[0].property.includes(shared),
        `${was}: with the list read ${read}, the property read out of the sentence is`
        + ` "${claims[0].property}", which does not carry "${shared}" - so the phrase the`
        + ' list holds is not the one this sentence gives away, and the fixture names an'
        + ' inflection the reader did not find in it'
      );
    }
  }

  // And the half the shapes cannot cover: whether anybody looks at the file the
  // second of those lived in. Both halves were needed - the sentence above
  // matches now, and until the rig's source joined the read set there was
  // nothing for it to match against.
  for (const named of ['test/probes/run.mjs', 'test/probes/glyph-tuning.mjs']) {
    assert.ok(
      READ_FOR_CLAIMS.includes(named),
      `${named} is not read for claims - the sentence in opposite sole possession of flying`
      + ' nothing was a source comment, so reading the published files alone leaves half of'
      + ' that disagreement unguarded'
    );
  }
});

test('probes: a name the rig inherits is not read as the name of a probe', () => {
  // The three fixtures above pin the shapes the reader matches. This pins what
  // becomes of a name it hands back, which was unguarded for the one name the
  // capture can produce that PROBES answers to without holding.
  //
  // `([a-z][a-z-]+)` admits lower-case words and hyphens, which is every
  // Object.prototype key except the ones carrying capitals or underscores - and
  // what is left is `constructor`. PROBES is a plain object literal, so `in`
  // answered `true` for it and the assertion whose message reads "is not a
  // probe" passed on a sentence naming no probe.
  //
  // No file in READ_FOR_CLAIMS carries such a sentence today, which is the same
  // position the three fixtures were written from: `claimsIn` takes the text, so
  // the sentence is read on its own rather than by editing a probe to hold it.
  const inherited = 'constructor';
  const [claim, ...rest] = claimsIn(
    `the ${inherited} is the one that flies nothing.`, 'a sentence read on its own'
  );
  assert.equal(rest.length, 0, 'the reader finds more than one claim in a one-claim sentence');
  assert.equal(
    claim?.probe, inherited,
    `the capture in CLAIM_SHAPES no longer yields "${inherited}" - if a shape has narrowed so`
    + ' that no inherited key can be read out of a sentence, this case has nothing left to'
    + ' guard and the predicate below can go back to being a membership test'
  );

  // Both forms, which is what makes this a case rather than a restatement. The
  // first is the hazard still being real: a prototype key PROBES answers to.
  // The second is the predicate the check above takes, refusing it.
  assert.equal(
    inherited in PROBES, true,
    `"${inherited}" is no longer reachable through PROBES's prototype, so the guard this case`
    + ' is about has stopped being needed rather than stopped working - read why before'
    + ' deleting anything'
  );
  assert.equal(
    isProbe(inherited), false,
    `the sole-claim reader accepts "${inherited}" as the name of a probe - \`in\` walks the`
    + ' prototype chain, so a sentence naming an inherited key passes the assertion written'
    + ' to catch a sentence naming no probe at all'
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

test('probes: the narrowed workload carries a value for every argument the table maps', () => {
  // The third link in the chain the two checks above pin either side of.
  // FLAG_ARG is pinned against parseArgs, and the table is pinned against each
  // run(), but narrowedArgs resolves a probe's flags through FLAG_ARG into
  // NARROWED, and nothing pinned that. Add a flag to parseArgs, to FLAG_ARG and
  // to a probe - the shape this rig has grown twice - and NARROWED hands that
  // probe `undefined` for it, which the probe reads as the flag not having been
  // passed and answers with its own default, the full walk. Every assertion
  // still passes, and the workload the check above promises to narrow stops
  // being narrow with nothing saying so. `free-flight` is the one that would
  // hurt: its `passes` default is every seed in FREE_SEEDS.
  //
  // The value check below is nullish rather than strict because the probes read
  // these values with `??` - `count ?? FREE_FRAMES` and `passes ??
  // FREE_SEEDS.length` in free-flight - and `??` treats `null` exactly as
  // absent. Against `undefined` alone, writing `passes: null` here, which is a
  // natural way to spell "nothing narrows this one yet", would pass the check
  // and restore the full walk at every seed anyway.
  const mapped = [...new Set(Object.values(FLAG_ARG))].sort();
  assert.deepEqual(
    Object.keys(NARROWED).sort(), mapped,
    'NARROWED is keyed by the properties FLAG_ARG maps - a property either side of that is'
    + ' a flag handed no narrowed value, or a narrowed value no flag arrives in'
  );
  for (const prop of mapped) {
    assert.ok(
      NARROWED[prop] != null,
      `NARROWED carries no value for ${prop}, so a probe reading it is handed a`
      + ' nullish value and walks its own default instead'
    );
  }
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
