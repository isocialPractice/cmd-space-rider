// test/page-style.test.mjs — test/page-style.mjs read as a module, rather than
// through the pages that use it.
//
// `specificity` is the half that needed a file of its own. Three test files
// resolve rules through it and the whole nav geometry walk rests on the order it
// returns, but its only exercise was the two selectors the caret test in
// test/docs-site.test.mjs names - so every count was trusted and none was read.
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

import { specificity, compareSpecificity } from './page-style.mjs';

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
  // is a real-looking answer and sometimes the right one - so the first sheet to
  // gain one would have folded a rule in the wrong order with the suite green.
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
