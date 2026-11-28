// test/changelog-roll.test.mjs — The rolled changelog and the pointer naming it,
// read against each other.
//
// `CHANGELOG.md` is rolled by the automation tool rather than by this
// repository: sections older than a keep window move out to a
// `CHANGELOG-<year>.md` beside it, and a `> N earlier entries in
// \`CHANGELOG-<year>.md\`, newest first.` line goes under the intro for each.
// Nothing in `test/` read either file, so the split was unpinned from this side
// of it - a hand edit to the pointer, or a year file nothing names, read as fine
// and published a figure no run had looked at.
//
// **The year name is kept, and that is a decision rather than the status quo.**
// `CHANGELOG-2026.md` holds a fraction of 2026's entries and `CHANGELOG.md`
// keeps the rest, which reads as a file named for a year it does not partition
// - a reader who looks up a mid-October date by the name meets a gap. No
// figure is quoted here on purpose: the roll moves entries and rewrites the
// pointer on every pass, so a count written into this header is one the next
// roll can leave behind, and the argument never needed the exact number. The
// two answers were to rename it after what it is, the way `TODO-archive.md` is
// named, or to keep the year. The year is kept because the name is not this
// repository's to choose: the roll writes
// `CHANGELOG-<year>.md`, regenerates every pointer from each archive's own
// entry count on each pass, and merges later rolls into the same year file
// sorted newest-first. So a rename lasts until the next roll, which creates
// `CHANGELOG-2026.md` fresh, writes a pointer naming only that, and leaves the
// renamed file orphaned with nothing pointing at it. The year name is also what
// the tool's own history reader looks for.
//
// Two of the premises behind the rename are worth recording as false, because
// they are the reasons it looked like the better answer. The scheme does have a
// next step: 2026 entries accumulate in the 2026 file and 2027 opens its own, so
// the name stays true of what each file holds even while no file holds all of a
// year. And the count cannot go stale through a roll - the pointer is rebuilt
// from the file it names every time, never added to. What was genuinely
// unpinned is a hand edit, and a year file that stops being named at all.
//
// So what is checked here is the agreement that makes the name usable: the
// pointer and the file it names say the same number, every year file is named,
// each one holds its own year, and the rolled entries are the older end of the
// split rather than a slice out of the middle.
//
// **An archive this repository does not carry is read as absent on purpose, and
// that is the third of three answers.** `66e5131` untracked `CHANGELOG-2026.md`
// and `TODO-archive.md` and ignored both, to keep their size out of the history.
// The pointer naming the archive is in `CHANGELOG.md`, which is tracked, so a
// clone gets the pointer and no file - and the first check below read that as
// the hand edit it is written to catch. `npm test` could not pass in a fresh
// clone, and passed here only because the working copy still holds the ignored
// file. The three answers were to track the archives again, which undoes that
// commit; to stop publishing a pointer at all, which is the automation tool's
// behaviour and not this repository's to change; or to read a pointer whose file
// is both absent and excluded as the state every clone is in. The third is
// taken, because it is the only one of them this repository owns. Either of the
// others remains open to whoever owns the other two, and taking one costs
// nothing here: the reading below is off `.gitignore`, so tracking the archives
// again tightens the check back on its own.
//
// What that gives up is narrow and worth naming: a pointer naming an archive
// that is excluded and absent is no longer read against anything, so a hand
// edit that invents `CHANGELOG-2019.md` passes anywhere - here as readily as in
// a clone, the invented file being absent from both. Everywhere the file
// is present - this working copy, and any clone that has rolled - the count, the
// year and the split are all read as before, and a pointer naming a file the
// repository does carry and does not have still fails.
//
// Nothing here pairs with test/parity.test.mjs. A changelog is neither build.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './helpers.mjs';

const CHANGELOG = 'CHANGELOG.md';

/** The pointer line the roll writes under the intro, one for each year file. */
const POINTER = /^> (\d+) earlier (?:entry|entries) in `(CHANGELOG-(\d{4})\.md)`, newest first\.$/;

/** A year archive's name, which is the whole of what the roll calls it. */
const YEAR_FILE = /^CHANGELOG-(\d{4})\.md$/;

/**
 * An entry heading: `## [<version>]`, with ` - <YYYY>-<MM>-<DD>` where the entry
 * is dated. `## [Unreleased]` is the undated one, and no roll moves it.
 */
const ENTRY = /^## \[([^\]]+)\](?:\s*-\s*(\d{4})-(\d{2})-(\d{2}))?\s*$/;

const lines = (file) => readFileSync(join(REPO_ROOT, file), 'utf8').split(/\r?\n/);

/** The pointers `CHANGELOG.md` carries, in the order it writes them. */
function pointers() {
  return lines(CHANGELOG)
    .map((line, at) => ({ at: at + 1, said: line, read: POINTER.exec(line) }))
    .filter((one) => one.read)
    .map(({ at, said, read }) => ({
      at, said, count: Number(read[1]), file: read[2], year: Number(read[3]),
    }));
}

/** The year archives beside the changelog, oldest year first. */
const yearFiles = () => readdirSync(join(REPO_ROOT))
  .filter((name) => YEAR_FILE.test(name))
  .sort();

/** A `.gitignore` rule's own regex-special characters, which are matched as themselves. */
const LITERAL = /[.+^${}()|[\]\\]/g;

/** Whether one rule's pattern names a file, `*` and `?` the wildcards it writes. */
const ruleNames = (pattern, name) => new RegExp(`^${pattern
  .replace(LITERAL, (char) => `\\${char}`)
  .replace(/\*/g, '[^/]*')
  .replace(/\?/g, '[^/]')}$`).test(name);

/**
 * The root-level filename rules a `.gitignore` carries, in the order it writes
 * them, each beside whether it negates.
 *
 * Only that one form is read: no `/` in the pattern, `*` and `?` as the
 * wildcards, trailing whitespace dropped the way git drops it. A line in any
 * other form is dropped here, which leaves it deciding nothing either way.
 *
 * **Trailing whitespace and leading whitespace are not the same decision, and
 * `trim()` made them one.** Git drops the trailing kind and keeps the leading
 * kind, so `  CHANGELOG-2026.md` is a pattern for a file whose name opens with
 * two spaces and leaves `CHANGELOG-2026.md` tracked - checked against
 * `git check-ignore -v` in a scratch repository, which reports only the
 * unindented rule. Trimmed both ends, this answered `true` for the indented
 * form as well, and `ignoredByRepo`'s answer is spent on the relaxed direction
 * of the first check below: a `CHANGELOG.md` pointer naming an absent archive
 * would have been accepted as excluded-on-purpose where git excludes nothing,
 * which is the hand edit that check exists to catch. That is the lenient
 * direction, and the header below claims the strict one. So only the trailing
 * end is dropped, which still takes the `\r` of a CRLF line - this repository's
 * own `.gitignore` has two of them, though `lines` splits on `\r?\n` and has
 * already eaten both by the time a rule gets here. A line of nothing but
 * whitespace comes out empty and is filtered with the blanks, as before.
 *
 * The `!` is kept rather than dropped with the line, because this repository
 * un-ignores by negation - `.gitattributes`, `.nojekyll` and `.gitignore` itself
 * each have a `!` line and a paragraph of reasoning, and
 * `test/repo-files.test.mjs` is a whole file about them. A negation read as no
 * rule at all leaves a broader pattern above it answering for a file git does
 * not exclude, which is the lenient direction and not the strict one.
 */
const ignoreRules = (said) => said
  .map((line) => line.replace(/\s+$/, ''))
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => ({ negated: line.startsWith('!'), pattern: line.replace(/^!/, '') }))
  .filter(({ pattern }) => pattern && !pattern.includes('/'));

/** The lines of this repository's own `.gitignore`, or none where it has none. */
const ignoreFile = () => (existsSync(join(REPO_ROOT, '.gitignore')) ? lines('.gitignore') : []);

/**
 * Whether this repository has decided not to carry a file, read off its own
 * `.gitignore`.
 *
 * Read there rather than from `git check-ignore`, for two reasons. The decision
 * asked about is the repository's, and `check-ignore` answers for the global
 * excludes file as well - a per-machine setting, which would let one developer's
 * configuration switch a drift check off for everybody. And a download of the
 * tree with no `.git` beside it still runs the suite.
 *
 * The last rule naming the file decides, which is how git decides it, so a
 * negation below a broader pattern answers false. No `.gitignore` at all, or one
 * whose every line is in a form `ignoreRules` does not read, answers false too
 * and leaves the checks at their strict reading - the safe direction for a file
 * this cannot parse. An indented rule is one of those forms, because git keeps
 * leading whitespace and so does `ignoreRules`: the pattern it names is not the
 * file, so nothing here excludes and the strict reading stands. `ignoreRules`'
 * own header has the reading and what the lenient direction cost.
 *
 * `said` is the rule lines, injectable so the case below can hold the ordering
 * to states this repository's own file does not hold.
 */
function ignoredByRepo(name, said = ignoreFile()) {
  let excluded = false;
  for (const { negated, pattern } of ignoreRules(said)) {
    if (ruleNames(pattern, name)) excluded = !negated;
  }
  return excluded;
}

/** One file's entries: the version each names, and the date where it has one. */
function entries(file) {
  return lines(file)
    .map((line) => ENTRY.exec(line))
    .filter(Boolean)
    .map(([, version, year, month, day]) => ({
      version,
      date: year ? `${year}-${month}-${day}` : null,
      year: year ? Number(year) : null,
    }));
}

test('changelog: every pointer and the file it names agree, in both directions', () => {
  const read = pointers();
  const files = yearFiles();

  // One direction without condition: a file nothing names is entries no reader
  // is told about, which is the quiet half - the changelog looks whole and is
  // missing a run of its history. An archive that is there has to be pointed at
  // whatever the repository carries, because being there is the whole of what
  // this half reads.
  const named = read.map((one) => one.file);
  const unnamed = files.filter((file) => !named.includes(file));
  assert.deepEqual(
    unnamed, [],
    `${unnamed.join(', ')} sits beside CHANGELOG.md with no pointer naming it, and the`
    + ` pointers it carries name ${named.join(', ') || 'no archive'} - the roll writes one for`
    + ' every archive it keeps, so a file without a pointer is history no reader is told about'
  );

  // One pointer per archive, which the single `deepEqual` that read both
  // directions at once used to carry on its own: two pointers naming one file
  // made the two lists different lengths. Split in two, neither half notices a
  // line written twice - the half above asks only whether each file is named
  // somewhere, and the half below walks each pointer by itself - so the
  // condition is stated rather than left to fall out of a comparison that is no
  // longer made. A second pointer is a hand edit of exactly the kind this file
  // exists to catch: the roll rebuilds every pointer from the archive it names
  // on each pass, and a reader meeting two cannot tell which is current.
  const twice = [...new Set(named.filter((file, at) => named.indexOf(file) !== at))];
  assert.deepEqual(
    twice, [],
    `CHANGELOG.md carries more than one pointer at ${twice.join(', ')} - the roll writes one`
    + ' for each archive it keeps and rewrites it in place, so a repeated pointer is a hand'
    + ' edit, and the two can disagree with nothing saying which a reader goes by'
  );

  // The other direction only for an archive this repository carries. A pointer
  // naming a file that is not there sends a reader after entries nothing holds,
  // unless `.gitignore` excludes that file - in which case the pointer in the
  // tracked changelog and the absent file beside it are the state every clone is
  // in, and the header above says why that is read rather than repaired.
  for (const one of read) {
    if (!existsSync(join(REPO_ROOT, one.file))) {
      assert.ok(
        ignoredByRepo(one.file),
        `CHANGELOG.md:${one.at} names ${one.file}, which is not beside it and is not a file`
        + ' .gitignore excludes - an archive this repository carries and does not have is a'
        + ' pointer sending a reader after entries nothing holds'
      );
      continue;
    }
    const held = entries(one.file).length;
    assert.equal(
      one.count, held,
      `CHANGELOG.md:${one.at} says "${one.said.trim()}" and ${one.file} holds ${held} entries`
      + ' - the roll rebuilds that figure from the file every pass, so a disagreement is a'
      + ' hand edit to one of the two and the pointer is the half a reader goes by'
    );
  }
});

test('changelog: an archive .gitignore negates reads as carried, not as excluded', () => {
  // What the check above lets through is a pointer whose file is absent and
  // excluded, so which files count as excluded is the whole of how far it is
  // relaxed - and a negation is the one rule that narrows the set rather than
  // widening it. This repository un-ignores by negation three times over, with a
  // paragraph of reasoning apiece, so the first way anyone here would start
  // carrying the archives again is a `!` line under `CHANGELOG-*.md`. Read as no
  // rule at all, the broader pattern above would still answer "excluded", the
  // check would stay relaxed on a file git does not exclude, and the header's
  // claim that tracking the archives again tightens it back would be false in
  // the one form this repository writes that decision in.
  //
  // Injected rather than read off `.gitignore`, because the states that matter
  // are ones this repository's own file does not hold, and because the file it
  // does hold is what the check above already exercises.
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['CHANGELOG-*.md']), true,
    'a root-level pattern naming the archive has to read as excluded, which is the state the'
    + ' relaxed direction above is written for'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['CHANGELOG-*.md', '!CHANGELOG-2026.md']), false,
    'a `!` line under the pattern that would otherwise swallow the archive is this repository'
    + ' deciding to carry it, so the pointer has to be held to a file being there again -'
    + ' reading the negation as no rule leaves the check relaxed on a file git tracks'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['!CHANGELOG-2026.md', 'CHANGELOG-*.md']), true,
    'the last rule naming a file decides, the way git decides it, so a negation above the'
    + ' pattern is overridden by it rather than winning on being a negation'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', []), false,
    'no rule at all excludes nothing, which is what keeps a repository with no .gitignore at'
    + ' the strict reading'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['# CHANGELOG-*.md', 'docs/CHANGELOG-*.md']), false,
    'a comment and a rule with a path in it are the forms this does not read, and a line it'
    + ' cannot parse has to decide nothing rather than exclude'
  );
});

test('changelog: an indented ignore rule names an indented file, the way git reads it', () => {
  // The two ends of a line are two decisions and `trim()` made them one. Git
  // drops trailing whitespace from a `.gitignore` rule and keeps leading
  // whitespace, so an indented rule is a pattern for an indented filename and
  // leaves the unindented file tracked - confirmed with `git check-ignore -v` in
  // a scratch repository, which reported only the rule written at the margin.
  //
  // Which direction that is matters more than the parsing. `ignoredByRepo`'s
  // answer is spent on the relaxed branch of the first check above, where `true`
  // passes: read leniently, a pointer naming an absent archive that git does not
  // exclude is accepted as excluded-on-purpose, which is the hand edit that
  // check is written to catch. Nothing in this repository's own `.gitignore` is
  // indented, so no input in the tree ever reached it, and the header above
  // claimed the strict reading throughout.
  //
  // Injected for the same reason the negation fixtures are: these are states the
  // real file does not hold, and the case above passes arrays that were already
  // trimmed, so nothing exercised either end of a line at all.
  //
  // The trailing half, though, is load-bearing on the real file, which is why
  // one end is dropped rather than neither. This repository's `.gitignore` holds
  // its two archive rules as `"CHANGELOG-*.md \r"` and `"TODO-archive.md \r"` -
  // a trailing space as well as the CR, which is the `w/mixed` that
  // `git ls-files --eol` reports. The CR never reaches a rule, `lines` having
  // split on `/\r?\n/` already; the space does, and `^CHANGELOG-[^/]*\.md $`
  // names no archive. Strip nothing and the first case above still passes here,
  // because `CHANGELOG-2026.md` is present in this working copy and `existsSync`
  // short-circuits before `ignoredByRepo` is asked - so the break would surface
  // only in a clone, which is the failure 0.16.10 was spent on. This case is
  // what catches it from inside the repository.
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['  CHANGELOG-2026.md']), false,
    'leading whitespace is part of the pattern git matches, so an indented rule names a file'
    + ' whose own name is indented and excludes nothing - answering true here is the lenient'
    + ' direction, and the relaxed branch above spends that answer on a pointer'
  );
  assert.equal(
    ignoredByRepo('  CHANGELOG-2026.md', ['  CHANGELOG-2026.md']), true,
    'and the file it does name is the indented one, which is what makes the reading a reading'
    + ' rather than the rule being thrown away'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['CHANGELOG-2026.md   ']), true,
    'trailing whitespace git drops, so the rule still names the file - dropping neither end'
    + ' would swing the same check the other way and refuse a pointer git does exclude'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['CHANGELOG-*.md', '   ', '']), true,
    'a line of nothing but whitespace comes out empty and is filtered with the blanks rather'
    + ' than becoming a pattern that matches nothing and shadows the rule above it'
  );
  assert.equal(
    ignoredByRepo('CHANGELOG-2026.md', ['CHANGELOG-*.md', '  !CHANGELOG-2026.md']), true,
    'an indented negation is an indented pattern too, so it does not reach the file and the'
    + ' rule above it still decides - a `!` only un-ignores from the margin'
  );
});

test('changelog: a year file holds that year and the changelog keeps the newer end', () => {
  const files = yearFiles();
  if (files.length === 0) {
    // No archive to read, which is an ordinary state rather than a fault, and
    // now two of them: a clone where the roll has never run, and a clone of a
    // repository that ignores its archives - here the roll has run and its
    // output is not carried. The pointer side of both belongs to the check
    // above, which holds a pointer whose file is absent to naming a file
    // `.gitignore` excludes. Restating it here would be a second statement of
    // one condition, and the weaker of the two.
    return;
  }

  const rolled = [];
  for (const file of files) {
    const year = Number(YEAR_FILE.exec(file)[1]);
    const held = entries(file);
    assert.ok(held.length, `${file} holds no entries, so the pointer naming it names nothing`);

    // What makes the year name true of the file: every entry in it is dated, and
    // dated to the year the name carries. The file is not all of that year - the
    // roll moves by a keep window, so the newest of a year stays in
    // CHANGELOG.md - and a reader looking up a date by the name has to meet the
    // right year or the name is worse than no name at all.
    for (const entry of held) {
      assert.ok(
        entry.date,
        `${file} holds "## [${entry.version}]" with no date - an undated section is one no`
        + ' roll moves, so a dateless entry in an archive got there by hand'
      );
      assert.equal(
        entry.year, year,
        `${file} holds ${entry.version} dated ${entry.date}, which is not ${year} - the file`
        + ' is named for the year of the entries in it, so an entry from another year is'
        + ' filed where its date will not find it'
      );
    }
    rolled.push(...held);
  }

  // And the split is by date rather than a slice out of the middle: everything
  // rolled is older than everything kept. This is what lets a reader go by the
  // pointer at all - an older date is in the archive, a newer one is not.
  const kept = entries(CHANGELOG).filter((entry) => entry.date);
  if (kept.length === 0) return;
  const newestRolled = rolled.map((entry) => entry.date).sort().at(-1);
  const oldestKept = kept.map((entry) => entry.date).sort().at(0);
  assert.ok(
    newestRolled < oldestKept,
    `the newest rolled entry is ${newestRolled} and the oldest CHANGELOG.md keeps is`
    + ` ${oldestKept} - the roll moves the older end, so an overlap means a reader who finds`
    + ' a date in one file cannot tell whether the other holds it too'
  );
});

test('changelog: the pointers sit in the intro, where a reader meets them', () => {
  const read = pointers();
  if (read.length === 0) return;

  const firstEntry = lines(CHANGELOG).findIndex((line) => ENTRY.test(line));
  assert.ok(firstEntry > 0, 'CHANGELOG.md states no entry heading at all');

  // The roll takes a pointer an earlier version of it left lower down the file
  // and rewrites it here, so below the first entry is a place one can only have
  // reached by hand - and a pointer under an entry reads as part of that
  // release's notes rather than as a statement about the file.
  for (const one of read) {
    assert.ok(
      one.at < firstEntry + 1,
      `CHANGELOG.md:${one.at} carries "${one.said.trim()}" below the first entry at line`
      + ` ${firstEntry + 1} - the one place for a pointer is the intro, where it is read as a`
      + " statement about the file rather than as part of a release's notes"
    );
  }
});
