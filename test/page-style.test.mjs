// test/page-style.test.mjs — test/page-style.mjs read as a module, rather than
// through the pages that use it.
//
// `specificity` is the half that needed a file of its own. One test file weighed
// it before this one existed - test/docs-site.test.mjs, where the nav geometry
// walk rests on the order it returns - and its only exercise there was the two
// selectors that file's caret test names, so every count was trusted and none was
// read. Two weigh it now, that file and this one.
//
// Three files read a stylesheet through test/page-style.mjs for what it says:
// test/browser-shell.test.mjs, test/docs-site.test.mjs and
// test/probes/overlay-anchor.mjs. Only the middle one weighs a selector - the
// other two read lengths out of the sheet, and one of the three is a probe rather
// than a test. This file reads the module instead, and opens the two sheets only
// to assert that the module can still read them at all.
//
// The answers are not obvious enough to leave at that. `a:before` and
// `a::before` both weigh (0,0,2), because the legacy spelling is still a
// pseudo-element and a pseudo-element weighs as a type, while `a:hover` weighs
// (0,1,1) because a pseudo-class does not. An attribute weighs as a class
// however much its value looks like something else. And the four functional
// pseudo-classes weigh nothing this function can work out, so they throw.
//
// Nothing here pairs with test/parity.test.mjs. The module reads a stylesheet,
// and the CLI build has none.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './helpers.mjs';
import { specificity, compareSpecificity, styleSheet, pageStyle } from './page-style.mjs';

const DOCS = join(REPO_ROOT, 'docs');

/**
 * Every shape of simple selector CSS counts differently, against the triple it
 * weighs: ids, then classes and attributes and pseudo-classes, then types and
 * pseudo-elements. Combinators and `*` weigh nothing at all.
 *
 * Both colon spellings of all four CSS2 pseudo-elements are here, because the
 * only thing telling `:after` from `:hover` is the name - and a sheet written in
 * the older form resolves to the wrong rule if that list is ever wrong.
 */
const WEIGHED = [
  ['*', [0, 0, 0], 'the universal selector counts for nothing'],
  ['li', [0, 0, 1], 'a type'],
  ['html', [0, 0, 1], 'a type, and the root element is not an id'],
  ['ul li', [0, 0, 2], 'two types, the descendant combinator weighing nothing'],
  ['nav ul > li + li', [0, 0, 4], 'four types, and neither combinator weighs'],
  ['#main', [1, 0, 0], 'an id'],
  ['.menu', [0, 1, 0], 'a class'],
  ['*.menu', [0, 1, 0], 'a class, with a `*` beside it that still weighs nothing'],
  ['[hidden]', [0, 1, 0], 'an attribute weighs as a class'],
  ['[aria-expanded="true"]', [0, 1, 0], 'an attribute with a value weighs as one without'],
  ['[href="#play"]', [0, 1, 0], 'an attribute whose value reads as an id is still one attribute'],
  [':root', [0, 1, 0], 'a pseudo-class, which is what the sheet declares its properties on'],
  ['a:hover', [0, 1, 1], 'a pseudo-class weighs as a class, beside its own type'],
  ['a:first-child', [0, 1, 1], 'a structural pseudo-class is still a pseudo-class'],
  ['a::before', [0, 0, 2], 'a pseudo-element weighs as a type'],
  ['a:before', [0, 0, 2], 'the one-colon spelling is the same pseudo-element'],
  ['a::after', [0, 0, 2], 'the caret is drawn by this one'],
  ['a:after', [0, 0, 2], 'and by this one'],
  ['p::first-line', [0, 0, 2], 'a pseudo-element the sheet does not use yet'],
  ['p:first-line', [0, 0, 2], 'spelled the older way'],
  ['p::first-letter', [0, 0, 2], 'the fourth of the four'],
  ['p:first-letter', [0, 0, 2], 'spelled the older way'],
  ['#fire.on', [1, 1, 0], 'an id and a class on one element'],
  ['body.light #fire', [1, 1, 1], 'one of each, which is the colour-scheme override'],
  ['#main .menu a:hover', [1, 2, 1], 'every column at once'],
  ['.brand svg', [0, 1, 1], 'the brand mark, whose height the bar walk reads'],
  ['.has-sub > button::after', [0, 1, 2], 'the narrow block\'s attempt to blank the caret'],
  [
    '.has-sub > button[aria-expanded="true"]::after', [0, 2, 2],
    'the top-level rule it has to beat, and the attribute is the whole difference',
  ],
];

test('page-style: every shape of selector weighs what CSS says it weighs', () => {
  for (const [selector, expected, why] of WEIGHED) {
    assert.deepEqual(
      specificity(selector), expected,
      `${selector} weighs (${specificity(selector).join(',')}) against (${expected.join(',')}) - ${why}`
    );
  }
});

test('page-style: the two colon spellings of a pseudo-element weigh the same', () => {
  // Stated as a rule rather than left to two rows of the table agreeing by
  // accident: the list of names PSEUDO_ELEMENTS holds is the only thing that
  // decides it, and a name dropped from that list moves a count by a whole
  // column without changing the selector.
  for (const name of ['before', 'after', 'first-line', 'first-letter']) {
    assert.deepEqual(
      specificity(`a:${name}`), specificity(`a::${name}`),
      `a:${name} and a::${name} are the same pseudo-element`
    );
  }
});

test('page-style: specificity orders the pair the caret turned on', () => {
  // The ordering, not just the counts. This is the comparison that decides the
  // caret: a media query contributes nothing, so the narrow block's rule loses
  // inside its own block however the file is ordered, and the glyph had to be
  // blanked at a specificity that matches rather than at one that reads later.
  const narrow = specificity('.has-sub > button::after');
  const top = specificity('.has-sub > button[aria-expanded="true"]::after');

  assert.ok(
    compareSpecificity(narrow, top) < 0,
    'the attribute rule outweighs the plain one, which is why document order could not save the narrow block'
  );
  assert.equal(compareSpecificity(narrow, narrow), 0, 'a selector ties with itself');
  assert.deepEqual(
    [top, narrow].sort(compareSpecificity), [narrow, top],
    'the comparator sorts weakest first, which is the order declarations are folded in'
  );
});

test('page-style: a functional pseudo-class throws rather than resolving to a plausible count', () => {
  // CSS takes the specificity of a `:not()`, `:is()` or `:has()` from the most
  // specific selector inside the parentheses, and `:where()` from nothing at
  // all. The pseudo-class pass counts any of the four as one plain class, which
  // is a real-looking answer and sometimes the right one.
  //
  // This is the direct caller's path and nothing wider: `specificity` is only
  // reached for a selector somebody named, so the sheet that gains one is caught
  // by `styleSheet` instead, which the test below pins.
  for (const selector of [
    'a:not(.current)',
    'li:is(.one, .two)',
    'li:where(.one, .two)',
    '.menu:has(> button)',
    'a:NOT(.current)',
    '.menu li:not(:last-child)',
  ]) {
    assert.throws(
      () => specificity(selector),
      /functional pseudo-class/,
      `${selector} carries an argument this resolver does not model`
    );
  }
});

test('page-style: a class that merely reads like one of the four still weighs', () => {
  // The guard matches the colon, which is the whole reason it can be trusted:
  // `.has-sub` is on every dropdown group in the site's nav, and a guard keyed
  // on the bare word would have thrown on the one selector the caret work was
  // built around.
  for (const [selector, expected] of [
    ['.has-sub', [0, 1, 0]],
    ['.has-sub > button', [0, 1, 1]],
    ['.is-open', [0, 1, 0]],
    ['.not-found', [0, 1, 0]],
    ['.where', [0, 1, 0]],
    ['[data-has="sub"]', [0, 1, 0]],
  ]) {
    assert.deepEqual(specificity(selector), expected, `${selector} is not a functional pseudo-class`);
  }
});

test('page-style: a sheet carrying a functional pseudo-class is refused, not resolved', () => {
  // The wider half of the same guard, and the half the silent case needs.
  // `specificity` only ever sees a selector a caller named, and both readers here
  // match a selector whole - `declarationsFor` folds the rules whose list holds
  // the caller's selector, and the layout fold in test/docs-site.test.mjs weighs
  // only the selectors its caller passed in. So a `:not()` rule that really
  // applies is not mis-weighed, it is skipped, and what comes back is a real value
  // from the sheet with nothing failing.
  //
  // Both shapes below are the ones that would have gone unseen. The first takes a
  // custom property away from every length read off it; the second takes a
  // declaration out of the dropdown fold. Neither names a selector any caller
  // lists, so neither reaches the guard inside `specificity` at all.
  for (const css of [
    ':root:not(.light) { --bar: 80px }',
    '.has-sub:not([aria-expanded]) > .sub { display: none }',
    '.menu li:is(.one, .two) { color: red }',
    '.menu li:where(.one) { color: red }',
    '.nav:has(> .menu) { color: red }',
    '.menu li:NOT(:last-child) { margin: 0 }',
  ]) {
    assert.throws(
      () => styleSheet(`:root { --bar: 50px } ${css}`),
      /functional pseudo-class/,
      `a sheet carrying ${css} has no rule order this module can be trusted on`
    );
  }
});

test('page-style: the sheets this repository ships are ones the module can read', () => {
  // The guard above is only worth having if it is off today, and that is a fact
  // about the repository rather than about the module: the two sheets are read for
  // their lengths and their rule order throughout the suite, so one of them
  // gaining a `:not()` has to fail here, naming the rule, rather than in whichever
  // geometry walk reached it first.
  //
  // Each file is read through the call the rest of the suite reads it through:
  // `styleSheet` for a `.css` file, `pageStyle` for the page that carries its
  // sheet inline. The page matters, because `styleSheet` on the whole file parses
  // the markup and the game's script as CSS as well - 257 rules against the
  // stylesheet's 20 - and every prelude a brace leaves behind is weighed as a
  // selector. A line of ordinary JavaScript is enough to fail it:
  // `querySelectorAll('#touch div:not(.off)')` on the statement before an `if`
  // block lands in one, and the sheet is refused with a selector that is a line
  // of script. `pageStyle` slices the `<style>` block out first, which is both the
  // thing being asserted about and what browser-shell.test.mjs and the
  // overlay-anchor probe already read the page with.
  for (const [what, file, read] of [
    ["the documentation site's stylesheet", join(DOCS, 'assets', 'style.css'), styleSheet],
    ['the game page, whose stylesheet is inline', join(REPO_ROOT, 'index.html'), pageStyle],
  ]) {
    assert.doesNotThrow(
      () => read(readFileSync(file, 'utf8')),
      `${what} carries a selector this module would have to guess at`
    );
  }
});

test('page-style: a sheet whose classes merely read like the four is read normally', () => {
  // The same reason the per-selector guard matches the colon. `.has-sub` is on
  // every dropdown group in the site's nav, so a sheet-wide guard keyed on the
  // bare word would refuse the one stylesheet the specificity work exists for.
  const sheet = styleSheet(`
    :root { --bar: 50px }
    .has-sub > button { color: red }
    .not-found { color: red }
    .is-open .where { color: red }
    [data-has="sub"] { color: red }
  `);
  assert.equal(sheet.properties['--bar'], '50px', 'the sheet resolves, so none of its classes was read as a pseudo-class');
  assert.equal(sheet.rules.length, 5, 'and every rule in it was parsed');
});
