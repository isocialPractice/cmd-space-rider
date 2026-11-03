// test/repo-files.test.mjs — The `!` lines in .gitignore, checked against git's
// own reading of them rather than against a second copy of the list.
//
// A rule in .gitignore only reaches a clone if the file holding it does, and
// until 0.15.1 this one did not. A global excludes file names `.gitignore` -
// once in a bare dotfile pattern and twice by name - so the file sat untracked
// for the repository's whole life while every rule in it read as settled.
// Nothing failed, because nothing looked: `git status` reported a clean tree,
// the rules worked on the machine the file was on, and a clone ignored nothing,
// so out/, node_modules/ and the agent's test-results folder all read as
// untracked there.
//
// The file already answered that trap for two other dotfiles - it carries a `!`
// line and a paragraph of reasoning for .gitattributes and another for
// .nojekyll - so what was missing was not the idea but one line of it, and what
// was missing after that was anything checking the idea held. So the negations
// are read off the file here rather than listed, and a fourth dotfile un-ignored
// tomorrow is covered without a second edit.
//
// `--no-index` is what gives this teeth, and it is the whole reason these checks
// are worth running. Plain `git check-ignore` consults the index first and
// reports nothing for a file git already tracks, so a negation deleted from
// under .gitattributes today would read as fine for as long as the file stayed
// in the index - and would strand the next clone that had to add it again.
// Asking the rules alone reads the line rather than its leftovers.
//
// What is deliberately not here is whether git tracks these paths. That is the
// index's answer, not the ignore file's, and it cannot be true in the run that
// writes the rule: the fix is a line in a file, and the file reaches the index
// at the commit afterwards. A negation's own promise is that a bulk `git add`
// will not pass over the file, which is what these two read.
//
// Nothing here pairs with test/parity.test.mjs. A dotfile is neither build.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { REPO_ROOT } from './helpers.mjs';

const IGNORE_FILE = join(REPO_ROOT, '.gitignore');

/** The paths .gitignore un-ignores, in the order it names them. */
function negations() {
  return readFileSync(IGNORE_FILE, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('!'))
    .map((line) => line.slice(1));
}

/**
 * Whether the ignore rules alone exclude a path, with the index left out of it.
 *
 * `null` where git cannot answer - no git on the machine, or no work tree to
 * ask about - and the caller skips on it. `check-ignore` answers in its exit
 * code: 0 is excluded, 1 is not, and anything above that is the failure to ask
 * rather than an answer, which is why the two are told apart here instead of
 * being read as "not excluded".
 */
function excludedByRules(path) {
  const got = spawnSync('git', ['check-ignore', '--no-index', '-q', '--', path],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  if (got.error || got.status > 1) return null;
  return got.status === 0;
}

test('repo: the rules un-ignore every path .gitignore negates', (t) => {
  const named = negations();
  assert.ok(named.length, '.gitignore un-ignores nothing, so this check reads no files');

  const read = named.map((path) => ({ path, excluded: excludedByRules(path) }));
  if (read.some((one) => one.excluded === null)) {
    t.skip('no git to read the ignore rules with');
    return;
  }

  // Every one that failed rather than the first. A negation is written because
  // a broader rule would otherwise swallow the file, so the files needing one
  // tend to arrive together, and a report that stops at the first turns one
  // edit into as many runs as there are files.
  const swallowed = read.filter((one) => one.excluded).map((one) => one.path);
  assert.deepEqual(
    swallowed, [],
    `.gitignore names ${swallowed.length} path(s) its own \`!\` line does not `
    + `rescue, so a bulk \`git add\` passes over each:\n`
    + swallowed.map((path) => `  ${path}`).join('\n')
  );
});

test('repo: .gitignore un-ignores itself, which is how it reaches a clone', () => {
  // The check above reads the file's list and so cannot speak for the line that
  // puts the file on it. Delete `!.gitignore` and the list is two paths that
  // both pass, while the file holding them goes back to being invisible to
  // every bulk add - which is the state this repository was in until 0.15.1.
  assert.ok(
    negations().includes('.gitignore'),
    '.gitignore carries no `!.gitignore` line, so the global rules hide it again'
  );
});
