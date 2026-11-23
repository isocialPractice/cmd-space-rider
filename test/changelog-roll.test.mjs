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

  // Both directions, because each one fails on its own. A pointer naming a file
  // that is not there sends a reader after entries nothing holds; a file nothing
  // names is entries no reader is told about, which is the quiet half - the
  // changelog looks whole and is missing a run of its history.
  assert.deepEqual(
    read.map((one) => one.file).sort(), files,
    `CHANGELOG.md points at ${read.map((one) => one.file).join(', ') || 'no archive'} and the`
    + ` archives beside it are ${files.join(', ') || 'none'} - a pointer without a file sends a`
    + ' reader after entries nothing holds, and a file without a pointer is history no reader'
    + ' is told about'
  );

  for (const one of read) {
    assert.ok(
      existsSync(join(REPO_ROOT, one.file)),
      `CHANGELOG.md:${one.at} names ${one.file}, which is not beside it`
    );
    const held = entries(one.file).length;
    assert.equal(
      one.count, held,
      `CHANGELOG.md:${one.at} says "${one.said.trim()}" and ${one.file} holds ${held} entries`
      + ' - the roll rebuilds that figure from the file every pass, so a disagreement is a'
      + ' hand edit to one of the two and the pointer is the half a reader goes by'
    );
  }
});

test('changelog: a year file holds that year and the changelog keeps the newer end', () => {
  const files = yearFiles();
  if (files.length === 0) {
    // A clone where the roll has never run has no archive, which is an ordinary
    // state rather than a fault. The check above already holds it to having no
    // pointer either.
    assert.deepEqual(pointers(), [], 'no archive is beside the changelog, so none may be named');
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
