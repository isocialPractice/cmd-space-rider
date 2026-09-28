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

/* ===== The nav's own geometry =====
   Everything below is decided by the stylesheet as text, so it runs without a
   browser - which is the point. A browser was the only thing that had ever
   checked the bar's height or the caret's box, and neither was right. */

const VIEWPORT = { w: 1280, h: 900 };
const px = (value, what) => style.lengthPx(value, VIEWPORT, what);

/** One side of a box shorthand, by CSS's own one-to-four value order. */
function side(shorthand, which) {
  const parts = String(shorthand).trim().split(/\s+/);
  const [top, right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left }[which];
}

/** The width out of a border shorthand, which leads with it. */
const borderWidth = (shorthand) => String(shorthand).trim().split(/\s+/)[0];

/**
 * The border-box height one of the menu's controls draws, from the three things
 * that decide it for a single line: the line box, the padding above and below
 * it, and the border.
 *
 * Several selectors fold in cascade order, so the caret button is read as the
 * button rule plus the `.sub-toggle` rule that narrows it, the way a browser
 * reads it.
 */
function controlHeight(...selectors) {
  const decl = {};
  for (const selector of selectors) Object.assign(decl, style.declarationsFor(selector));
  const named = selectors.join(' + ');

  // A control with no line box of its own inherits one from the body, in a unit
  // this resolver has no font size to turn into pixels. That is not a gap in
  // the resolver - it is the fault itself, and it is why the caret button drew
  // a 34.50px box beside a 41.09px link.
  assert.ok(decl['line-height'], `${named} states no line box of its own`);

  const pad = (which) => px(decl[`padding-${which}`] ?? side(decl.padding ?? '0', which), `${named} padding-${which}`);
  return px(decl['line-height'], `${named} line-height`)
    + pad('top') + pad('bottom')
    + px(borderWidth(decl.border ?? '0'), `${named} border width`) * 2;
}

test('docs: the caret button draws the same box as the link beside it', () => {
  // Three of the four groups are a link and a caret button side by side, and
  // both take the same hover border, so a box that does not match is a box that
  // shrinks and re-centres as the pointer crosses between them. On usage.html
  // it showed without any interaction at all: the current page's underline and
  // the caret's bottom border were painted 3.29px apart.
  const link = controlHeight('.menu a');

  assert.equal(
    controlHeight('.has-sub > button', '.has-sub > .sub-toggle'), link,
    'the caret-only button and the link beside it draw the same border box'
  );
  // Reference is the one group whose button carries its own text, so it is
  // read without the .sub-toggle rule and still has to match its neighbours.
  assert.equal(
    controlHeight('.has-sub > button'), link,
    'the Reference button and the menu links draw the same border box'
  );
});

test('docs: the bar draws the height --bar declares, and the offsets clear it', () => {
  // The nav's lists are lists, so `ul { margin-bottom }` and `li { margin-bottom }`
  // reach them unless something stops it. Inside a fixed bar those land in its
  // height: the bar drew 83.09px against the 50px --bar declared, and the
  // scroll offset picked to clear 50px parked seven of the nav's eight in-page
  // anchors underneath it.
  for (const selector of ['.menu', '.sub', '.menu li']) {
    const decl = style.declarationsFor(selector);
    assert.ok(
      'margin' in decl,
      `${selector} declares no margin of its own, so it takes the prose rhythm meant for body text`
    );
    assert.equal(px(decl.margin, `${selector} margin`), 0, `${selector} carries a margin into the bar`);
  }

  const navBar = style.declarationsFor('.nav-bar');
  const drawn = controlHeight('.menu a')
    + px(side(navBar.padding, 'top'), '.nav-bar padding-top')
    + px(side(navBar.padding, 'bottom'), '.nav-bar padding-bottom')
    + px(borderWidth(style.declarationsFor('.nav')['border-bottom']), '.nav border-bottom width');

  assert.equal(drawn, px('var(--bar)', '--bar'), 'the wide bar draws the height --bar declares');

  // And the two things that land underneath a fixed bar read that height rather
  // than a figure of their own. --s8 was that figure, and it was 19px short.
  assert.match(style.properties['--clear'], /var\(\s*--bar\s*[,)]/, '--clear is derived from --bar');
  const clear = px(style.properties['--clear'], '--clear');
  assert.ok(clear > drawn, `--clear is ${clear}px against a ${drawn}px bar, so it does not clear it`);

  assert.equal(
    px(style.declarationsFor('html')['scroll-padding-top'], 'scroll-padding-top'), clear,
    'an in-page anchor scrolls its heading clear of the bar'
  );
  assert.equal(
    px(side(style.declarationsFor('.wrap').padding, 'top'), '.wrap padding-top'), clear,
    'the page frame starts clear of the bar'
  );
});

test('docs: every dropdown control is named by an aria-label and nothing else', () => {
  // The caret glyph comes from CSS `content`, which is not in the DOM but is in
  // the accessible name: generated content takes part in the name computation.
  // The three caret-only buttons have an aria-label that outranks it. Reference
  // had none, so its name was computed from contents and came out "Reference v"
  // closed and "Reference ^" open - the decoration read aloud, and the state
  // re-read on every toggle, which aria-expanded already carries.
  for (const name of PAGES) {
    for (const group of groupsOf(navOf(name))) {
      const button = group.match(/<button\b[^>]*>(.*?)<\/button>/s);
      assert.ok(button, `${name}: a .has-sub group with no button to label`);

      const labelled = button[0].match(/aria-label="([^"]*)"/);
      assert.ok(labelled, `${name}: ${button[0]} carries no aria-label, so its name is its contents and the caret`);
      assert.ok(labelled[1].trim(), `${name}: ${button[0]} carries an empty aria-label`);

      // A visible label has to be contained in the accessible name, so a button
      // that shows text is labelled with that text rather than around it.
      const visible = button[1].replace(/<[^>]*>/g, '').trim();
      if (visible) {
        assert.ok(
          labelled[1].includes(visible),
          `${name}: the button reads "${visible}" and is named "${labelled[1]}"`
        );
      }
    }
  }
});

test('docs: the sheet resolves to the scheme it is written in', () => {
  // This stylesheet is the repository's only one that declares :root twice - the
  // dark block it is written in, and the light re-inking inside
  // @media (prefers-color-scheme: light) - so it is the only thing that can
  // catch a resolver folding a conditional block into the top-level cascade.
  // Folded, `styleSheet(css).properties` came back as the light scheme for a
  // sheet whose base scheme is dark, and said so nowhere.
  const light = style.rules.find((rule) => rule.selectors.includes(':root')
    && rule.at.some((prelude) => prelude.includes('prefers-color-scheme: light')));
  assert.ok(light, 'the sheet re-inks :root for a light scheme');
  assert.ok(light.declarations['--page'], 'the light block re-inks --page');

  assert.equal(style.properties['--page'], '#000000', 'the resolved --page is the base scheme, which is dark');
  assert.notEqual(
    style.properties['--page'], light.declarations['--page'],
    'the resolved --page is not the light block value, which is the answer a folded resolver gives'
  );

  // The bar is the other property this sheet declares twice, and the same rule
  // decides it: --bar is the wide layout's, and the narrow block's own figure
  // belongs to a caller that asks the narrow block for it.
  const narrow = style.rules.find((rule) => rule.selectors.includes(':root')
    && rule.at.some((prelude) => prelude.includes('max-width')));
  assert.ok(narrow, 'the narrow block redeclares --bar, because the bar is a different height there');
  assert.notEqual(
    px(style.properties['--bar'], '--bar'), px(narrow.declarations['--bar'], 'narrow --bar'),
    'the two blocks declare two different bars, which is the whole reason they are two blocks'
  );
});
