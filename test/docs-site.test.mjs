// test/docs-site.test.mjs — The documentation site under docs/, checked as the
// text of its own files.
//
// The first coverage test/ has of the site, and it needs no browser: what went
// wrong was over the markup and the stylesheet as text, which is how
// test/browser-shell.test.mjs already reads index.html. The stylesheet is
// resolved through test/page-style.mjs, the same module the overlay rules are
// resolved through, so the reveal rule is read rather than restated - a test
// carrying its own copy of `> button` agrees with itself when the stylesheet
// changes and says nothing about the site.
//
// Nothing here pairs with test/parity.test.mjs. The site is not a build of the
// game and the CLI has no equivalent of it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './helpers.mjs';
import { styleSheet } from './page-style.mjs';

const DOCS = join(REPO_ROOT, 'docs');
const PAGES = readdirSync(DOCS).filter((name) => name.endsWith('.html')).sort();
const pageText = (name) => readFileSync(join(DOCS, name), 'utf8');
const style = styleSheet(readFileSync(join(DOCS, 'assets', 'style.css'), 'utf8'));

/** The `<nav>` element's own markup, which is the whole menu and nothing else. */
function navOf(name) {
  const html = pageText(name);
  const open = html.indexOf('<nav');
  const close = html.indexOf('</nav>');
  assert.ok(open >= 0 && close > open, `${name} carries no nav`);
  return html.slice(open, close + '</nav>'.length);
}

/**
 * The `.has-sub` groups in a nav, each as its own markup.
 *
 * A group ends with its own dropdown list, and no entry inside that list closes
 * a `</ul>` of its own, so `</ul></li>` is where the group closes.
 */
function groupsOf(nav) {
  return [...nav.matchAll(/<li class="has-sub">(.*?)<\/ul><\/li>/gs)].map((m) => `${m[1]}</ul>`);
}

/**
 * The element a dropdown list has to be preceded by before the wide layout will
 * reveal it, read off the stylesheet's own rule.
 *
 * This is the invariant that failed: three of the four groups labelled
 * themselves with an `<a>`, the rule matches only a `<button>`, and their lists
 * kept `display: none` with no control anywhere that changed it.
 */
function revealTag() {
  const revealing = style.rules.filter((rule) => !rule.at.length
    && rule.selectors.some((sel) => sel.endsWith('+ .sub'))
    && /display:\s*block/.test(rule.body));
  assert.equal(revealing.length, 1, 'exactly one rule reveals a dropdown on the wide layout');

  const selector = revealing[0].selectors.find((sel) => sel.endsWith('+ .sub'));
  const named = selector.match(/>\s*([a-z]+)[^>]*\+\s*\.sub$/);
  assert.ok(named, `the reveal rule names no element before .sub: ${selector}`);
  return named[1];
}

test('docs: the nav is the same markup on every page', () => {
  // The menu is repeated verbatim in all ten pages, so a fix applied to nine of
  // them leaves the pages disagreeing about their own navigation. Compared as
  // bytes rather than parsed, because any difference at all is the fault.
  const first = navOf(PAGES[0]);
  for (const name of PAGES.slice(1)) {
    assert.equal(navOf(name), first, `${name} carries a different nav from ${PAGES[0]}`);
  }
});

test('docs: every group with in-page anchors carries the control that reveals it', () => {
  const tag = revealTag();
  for (const name of PAGES) {
    const groups = groupsOf(navOf(name));
    assert.ok(groups.length, `${name}: the nav has no dropdown groups`);

    let anchored = 0;
    for (const group of groups) {
      const at = group.indexOf('<ul class="sub">');
      assert.ok(at > 0, `${name}: a .has-sub group with no dropdown list`);

      // Only the groups holding in-page anchors are checked. Reference holds
      // four page links, and those are reachable whether or not the list opens.
      if (!/href="[^"]*#/.test(group.slice(at))) continue;
      anchored++;

      const before = group.slice(0, at);
      const closing = [...before.matchAll(/<\/([a-z]+)>/g)].pop();
      assert.ok(closing, `${name}: nothing closes before the dropdown list`);
      assert.equal(
        closing[1], tag,
        `${name}: a group carrying in-page anchors is labelled <${closing[1]}>, and the `
        + `wide layout reveals its list only after a <${tag}>`
      );
      assert.match(
        before.slice(before.lastIndexOf(`<${tag}`)),
        /aria-expanded="false"/,
        `${name}: the <${tag}> starts closed, which is the attribute docs.js toggles`
      );
    }
    assert.ok(anchored > 0, `${name}: the nav carries no in-page anchors, so this checks nothing`);
  }
});

test('docs: every in-page anchor in the nav names an id that exists', () => {
  // The navs are identical, so one of them is every one of them. A heading
  // renamed on a page takes its anchor with it and nothing else would say so.
  const links = [...navOf(PAGES[0]).matchAll(/href="([^"]*#[^"]+)"/g)].map((m) => m[1]);
  assert.ok(links.length, 'the nav carries in-page anchors');

  for (const href of links) {
    const [file, id] = href.split('#');
    const target = file || PAGES[0];
    assert.ok(PAGES.includes(target), `the nav links to ${target}, which is not a page`);
    assert.ok(
      pageText(target).includes(`id="${id}"`),
      `${target} has no id="${id}", which the nav links to`
    );
  }
});

/** Whether a rule's body reads a given custom property. */
const reads = (body, name) => new RegExp(`var\\(\\s*${name}\\s*[,)]`).test(body);

/**
 * Whether a selector names anything the pages hold.
 *
 * Approximate on purpose. It takes the tags, classes and ids out of a selector
 * and asks whether one page carries all of them; attribute selectors,
 * pseudo-classes and pseudo-elements are dropped, because they narrow a match
 * rather than create one. That is enough to tell a rule about an element the
 * site has from a rule about one no page holds, which is the only question here.
 */
function namesSomething(selector, markup) {
  const parts = selector
    .replace(/\[[^\]]*\]/g, '')
    .replace(/::?[a-z-]+(\([^)]*\))?/g, '')
    .split(/[\s>+~]+/)
    .filter((part) => part && part !== '*');

  return parts.every((part) => {
    const named = part.match(/^([a-z][a-z0-9]*)?((?:[.#][\w-]+)*)$/);
    if (!named) return false;
    if (named[1] && !markup.includes(`<${named[1]}`)) return false;
    for (const token of named[2].match(/[.#][\w-]+/g) ?? []) {
      const value = token.slice(1);
      const found = token[0] === '#'
        ? markup.includes(`id="${value}"`)
        : new RegExp(`class="(?:[^"]*\\s)?${value}(?:\\s[^"]*)?"`).test(markup);
      if (!found) return false;
    }
    return true;
  });
}

test('docs: every custom property the stylesheet declares reaches a reader', () => {
  // The stylesheet opens by saying every value in it comes from
  // DESIGN_LANGUAGE.md, and that file is the site's record of why each value is
  // what it is - so a property declared there, measured in one of its tables,
  // and read only by a rule that matches nothing on any page is a row measuring
  // something no reader ever sees. `--good`, `--bad` and `--warp` were dropped
  // for the first half of that and `--warn` for the second, and both halves are
  // invisible without this: the value resolves correctly either way.
  const markup = PAGES.map(pageText).join('\n');

  const declared = new Set();
  for (const rule of style.rules) {
    if (!rule.selectors.includes(':root')) continue;
    for (const name of Object.keys(rule.declarations)) {
      if (name.startsWith('--')) declared.add(name);
    }
  }
  assert.ok(declared.size, 'the stylesheet declares custom properties on :root');

  for (const name of declared) {
    // A page may read a property inline, which is how the brand ship's three
    // colours reach it: the svg in the nav carries them as fill attributes.
    if (reads(markup, name)) continue;

    const readers = style.rules.filter((rule) => reads(rule.body, name));
    assert.ok(readers.length, `${name} is declared and nothing reads it`);
    assert.ok(
      readers.some((rule) => rule.selectors.some((sel) => namesSomething(sel, markup))),
      `${name} is read only by rules that match nothing on any page: `
      + readers.flatMap((rule) => rule.selectors).join(', ')
    );
  }
});
