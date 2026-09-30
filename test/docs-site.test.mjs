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
import { styleSheet, specificity, compareSpecificity } from './page-style.mjs';

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

/* ===== A page against the file it is published from ===== */

/**
 * The named entities and numeric references these pages actually carry.
 *
 * The four the site uses today are `lt`, `gt`, `mdash` and `middot`; the rest are
 * here because a page that gains one should not fail this as though a paragraph
 * had gone missing. The non-ASCII values are written as escapes rather than as
 * the characters themselves, so the repository's own rule against an em dash in
 * its text holds for this file too - these are what an entity decodes to, not
 * punctuation anybody wrote.
 */
const ENTITY = {
  lt: '<', gt: '>', amp: '&', quot: '"', apos: "'",
  nbsp: '\u00a0', mdash: '\u2014', ndash: '\u2013', middot: '\u00b7', hellip: '\u2026',
};
const unescapeEntities = (text) => text.replace(
  /&(#x?[0-9a-f]+|[a-z]+);/gi,
  (whole, name) => {
    if (name[0] !== '#') return ENTITY[name.toLowerCase()] ?? whole;
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
  }
);

/**
 * One string to compare both sides as: whitespace collapsed and the inline code
 * markers dropped, so a hard wrap in one and not the other is not a difference
 * and `` `x` `` in the file matches `<code>x</code>` on the page.
 */
const flatten = (text) => text.replace(/`/g, '').replace(/\s+/g, ' ').trim();

/**
 * A page's `<main>` as the text a reader sees.
 *
 * Tags are removed rather than replaced with a space: the pages put each block
 * element on its own line, so the newlines already separate them, while an
 * inserted space would put one either side of every `<code>` and stop
 * `<code>P</code>,` matching the file's `` `P`, ``.
 */
function mainText(name) {
  const html = pageText(name);
  const open = html.indexOf('<main');
  const close = html.indexOf('</main>');
  assert.ok(open >= 0 && close > open, `${name} carries no <main>`);
  return flatten(unescapeEntities(html.slice(open, close).replace(/<[^>]*>/g, '')));
}

/**
 * The emphasis markers taken off, leaving the words. `**x**` becomes
 * `<strong>x</strong>` on the page and the tags are already gone from that side,
 * so the file has to shed its own markers or the first paragraph to gain one is
 * reported as missing from a page that carries it.
 *
 * The guards either side of the single-marker forms are what keep `THEME_BG` and
 * `snake_case` whole: a marker only opens emphasis where a word character does
 * not run into it.
 */
const emphasis = (text) => text
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/__([^_]+)__/g, '$1')
  .replace(/(^|[^\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1$2')
  .replace(/(^|[^\w_])_(?!\s)([^_]+?)_(?!\w)/g, '$1$2');

/**
 * The blocks of a markdown file worth comparing against its page: paragraphs and
 * list items, with the fenced blocks, headings, tables and blockquotes left out.
 *
 * A fenced block or a table is reformatted on its way to the page - the tables
 * gain a scroll wrapper, the blocks become `<pre><code>` - so comparing those
 * would report the publishing rather than a difference. A bullet list is not:
 * `- text` becomes `<li>text</li>`, and the tag stripping on the page side
 * leaves exactly the words the file holds. Leaving list items out anyway skipped
 * 9 of QUICKSTART.md's 15 blocks and 4 of CHEATSHEET.md's 13, which is the same
 * silent drift this check was written to end: the whole gameplay list could be
 * deleted from quickstart.html with every test here green.
 *
 * An item's indented continuation lines join the item, because the page joins
 * them - they are one `<li>`.
 */
function blocks(markdown) {
  const found = [];
  let lines = [];
  let fenced = false;
  let listing = false;
  const flush = () => { if (lines.length) found.push(lines.join(' ')); lines = []; };

  for (const raw of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(raw)) { fenced = !fenced; flush(); listing = false; continue; }
    if (fenced) continue;

    const text = raw.trim();
    if (!text) { flush(); continue; }

    // A list item opens a block of its own, without its marker. The marker is
    // the page's `<li>`, not part of what the item says.
    const item = text.match(/^(?:[-*+]|\d+\.)\s+(.*)$/);
    if (item) { flush(); lines.push(item[1]); listing = true; continue; }
    // An indented line under one continues it rather than starting a paragraph.
    if (listing && /^\s{2,}/.test(raw)) { lines.push(text); continue; }
    listing = false;

    if (/^#{1,6}\s/.test(text) || text.startsWith('|') || text.startsWith('>')) { flush(); continue; }
    lines.push(text);
  }
  flush();

  // A link reads as its own text on the page, where the target is an attribute.
  return found.map((text) => flatten(emphasis(text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))));
}

test('docs: a page published from a repository file carries all of that file', () => {
  // docs/project-structure.html calls two of its pages "X.md as a page", and
  // until now nothing compared either pair - so an edit to the file that missed
  // the page was silent, and it was missed on two consecutive runs in the same
  // paragraph of CHEATSHEET.md: 0.7.3 added ", and which flags each probe takes"
  // and 0.7.4 added the paragraph naming test/probes/probes.mjs, neither
  // reaching the page.
  //
  // The pairing is read off that page's own listing rather than named here, so a
  // third file published as a page is covered without a second edit.
  //
  // One direction only. The pages carry a nav and a pager the files have no
  // equivalent of, and their headings gain ids, so a page holding more than its
  // file is the publishing working rather than a fault.
  const pairs = [...pageText('project-structure.html')
    .matchAll(/([\w.-]+\.html)\s+#\s+([\w.-]+\.md) as a page/g)]
    .map((found) => ({ page: found[1], file: found[2] }));
  assert.ok(pairs.length, 'project-structure.html names no page as a published file');

  for (const { page, file } of pairs) {
    assert.ok(PAGES.includes(page), `project-structure.html names ${page}, which is not a page`);

    const said = blocks(readFileSync(join(REPO_ROOT, file), 'utf8'));
    assert.ok(said.length, `${file} has nothing to compare against ${page}`);

    // Every missing block rather than the first: both times this was missed it
    // was one paragraph of a pair, and a report that stops at the first turns
    // one edit into two runs.
    const published = mainText(page);
    const missing = said.filter((block) => !published.includes(block));
    assert.deepEqual(
      missing, [],
      `${file} says ${missing.length} thing(s) ${page} does not carry:\n`
      + missing.map((block) => `  ${block}`).join('\n')
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
 * Which layout a width query selects, or null for a prelude that is not one.
 *
 * `max-width` is the narrow layout's half of the boundary and `min-width` is the
 * wide layout's, so the bound decides which side a block belongs to and the
 * property alone does not. Reading `width:` and stopping there put every width
 * block in the narrow layout, which is backwards in both directions at once for
 * a `min-width` one: folded into the layout it is switched off in, and left out
 * of the layout it is switched on in. Nothing showed it while the sheet carried
 * exactly one query.
 */
function widthBound(prelude) {
  if (/\bmax-width\s*:/.test(prelude)) return 'narrow';
  if (/\bmin-width\s*:/.test(prelude)) return 'wide';
  return null;
}

/**
 * Whether a rule applies in one of the site's two layouts.
 *
 * The two layouts are the top-level cascade, and that cascade plus whichever
 * width blocks that side of the boundary turns on. Blocks keyed on anything
 * other than width - the colour re-inking, the reduced-motion rule - are in
 * neither: they carry no geometry, and folding them in would answer for a
 * condition nothing here asked about. That is the same reason page-style.mjs
 * leaves every at-rule out of its own `declarationsFor`, which is the wide
 * answer.
 *
 * The breakpoint test below asserts the sheet names no width query this cannot
 * place, so a query written in some third form fails there rather than being
 * sorted into a layout by default.
 */
function appliesIn(rule, layout) {
  if (!rule.at.length) return true;
  return rule.at.every((prelude) => widthBound(prelude) === layout);
}

/**
 * The declarations that apply to a selector in one layout, folded as the
 * cascade folds them: specificity first, document order breaking a tie. Several
 * selectors fold together, so the caret button is read as the button rule plus
 * the `.sub-toggle` rule that narrows it, the way a browser reads it.
 *
 * Document order alone is not enough, and the caret is why. A media query
 * contributes no specificity, so the narrow block's `.has-sub > button::after`
 * at (0,1,2) loses to the top-level `[aria-expanded="true"]` rule at (0,2,2)
 * however the file is ordered - a rule the narrow layout appears to override and
 * does not.
 */
function declIn(layout, ...selectors) {
  const matched = [];
  style.rules.forEach((rule, order) => {
    if (!appliesIn(rule, layout)) return;
    const named = rule.selectors.filter((sel) => selectors.includes(sel));
    if (!named.length) return;
    // A rule's selector list is several rules as far as the cascade is
    // concerned, so the most specific of the ones the caller named is the one
    // that weighs.
    const [spec] = named.map(specificity).sort(compareSpecificity).reverse();
    matched.push({ rule, spec, order });
  });
  matched.sort((a, b) => compareSpecificity(a.spec, b.spec) || a.order - b.order);

  const decl = {};
  for (const { rule } of matched) Object.assign(decl, rule.declarations);
  return decl;
}

/** The padding and border a box adds around its own content, top and bottom. */
function framing(decl, named) {
  const pad = (which) => px(decl[`padding-${which}`] ?? side(decl.padding ?? '0', which), `${named} padding-${which}`);
  return pad('top') + pad('bottom')
    + px(borderWidth(decl.border ?? '0'), `${named} border width`) * 2;
}

/**
 * The line box a control states for itself.
 *
 * A control with no line box of its own inherits one from the body, in a unit
 * this resolver has no font size to turn into pixels. That is not a gap in the
 * resolver - it is the fault itself, and it is why the caret button drew a
 * 34.50px box beside a 41.09px link. It is also why `.brand` and `.nav-toggle`
 * now state theirs: both are children of the bar, so both decide its height.
 */
function lineBox(layout, ...selectors) {
  const decl = declIn(layout, ...selectors);
  const named = selectors.join(' + ');
  assert.ok(decl['line-height'], `${named} states no line box of its own`);
  return px(decl['line-height'], `${named} line-height`);
}

/**
 * The border-box height one of the menu's controls draws, from the three things
 * that decide it for a single line: the line box, the padding above and below
 * it, and the border.
 */
function controlHeight(layout, ...selectors) {
  return lineBox(layout, ...selectors) + framing(declIn(layout, ...selectors), selectors.join(' + '));
}

/**
 * The direct children of an element, each as its own opening tag.
 *
 * Depth-tracked rather than matched, so the svg's seven shapes inside the brand
 * are not read as children of the bar. A self-closing tag opens nothing.
 */
function childTags(markup, openTag) {
  const at = markup.indexOf(openTag);
  assert.ok(at >= 0, `the markup carries no ${openTag}`);

  const tags = [];
  let depth = 0;
  for (const found of markup.slice(at + openTag.length).matchAll(/<(\/?)[a-z][\w-]*\b([^>]*)>/gi)) {
    if (found[1] === '/') {
      if (depth === 0) break;  // the container's own closing tag
      depth--;
      continue;
    }
    if (depth === 0) tags.push(found[0]);
    if (!found[2].trimEnd().endsWith('/')) depth++;
  }
  return tags;
}

/** The single class on a tag, which is the selector the stylesheet reaches it by. */
function classOf(tag) {
  const named = tag.match(/class="([^"]*)"/);
  assert.ok(named, `a child of the bar carries no class, so no rule here names it: ${tag}`);
  const classes = named[1].trim().split(/\s+/);
  assert.equal(classes.length, 1, `a child of the bar carries ${classes.length} classes: ${tag}`);
  return `.${classes[0]}`;
}

/**
 * How each direct child of `.nav-bar` decides its own content height, before its
 * own padding and border are added around it.
 *
 * A stylesheet read as text cannot work this out: it would have to know that the
 * brand holds a sized mark beside its text and that the menu is a row of
 * controls. So it is stated here - and the walk below asserts this table names
 * exactly the children the markup holds, so a fourth child added to the bar
 * fails rather than being quietly left out of the maximum.
 */
const BAR_CHILDREN = {
  // The mark and the text beside it, whichever is taller. Both are --s5 today,
  // which is the point of stating the brand's line box at all.
  '.brand': (layout) => Math.max(
    lineBox(layout, '.brand'),
    px(declIn(layout, '.brand svg').height, '.brand svg height'),
  ),
  '.nav-toggle': (layout) => lineBox(layout, '.nav-toggle'),
  // The menu's own box adds nothing - its margin and padding are both asserted
  // at zero below - so its height is the tallest entry in it. The three shapes
  // an entry can take are folded rather than assumed equal; the caret test above
  // asserts two of them match, and this does not rest on that holding.
  '.menu': (layout) => Math.max(
    controlHeight(layout, '.menu a'),
    controlHeight(layout, '.has-sub > button'),
    controlHeight(layout, '.has-sub > button', '.has-sub > .sub-toggle'),
  ),
};

/** Whether a child of the bar is drawn, and drawn in the bar's own flow. */
function inFlow(decl) {
  return (decl.display ?? 'inline') !== 'none'
    && !['absolute', 'fixed'].includes(decl.position ?? 'static');
}

test('docs: the caret button draws the same box as the link beside it', () => {
  // Three of the four groups are a link and a caret button side by side, and
  // both take the same hover border, so a box that does not match is a box that
  // shrinks and re-centres as the pointer crosses between them. On usage.html
  // it showed without any interaction at all: the current page's underline and
  // the caret's bottom border were painted 3.29px apart.
  // The wide layout, which is the one that draws the caret at all: the narrow
  // block hides the three caret-only buttons and blanks the glyph on the fourth.
  const link = controlHeight('wide', '.menu a');

  assert.equal(
    controlHeight('wide', '.has-sub > button', '.has-sub > .sub-toggle'), link,
    'the caret-only button and the link beside it draw the same border box'
  );
  // Reference is the one group whose button carries its own text, so it is
  // read without the .sub-toggle rule and still has to match its neighbours.
  assert.equal(
    controlHeight('wide', '.has-sub > button'), link,
    'the Reference button and the menu links draw the same border box'
  );
});

/** A `content` value as the glyph it draws, with the quotes CSS writes it in off. */
const glyph = (value) => String(value ?? '').replace(/^(["'])(.*)\1$/, '$2');

test('docs: the caret glyph follows the layout and the state it describes', () => {
  // The caret says what the button does, so a layout where the button does
  // nothing has to draw no caret - and the narrow layout is exactly that: it
  // opens every group, hides the three caret-only buttons and turns Reference's
  // into a label with `cursor: default`.
  //
  // Blanking it took two rules rather than one. A media query contributes no
  // specificity, so the narrow block's `.has-sub > button::after` at (0,1,2)
  // could not reach the top-level `[aria-expanded="true"]` rule at (0,2,2), and
  // a group opened on the wide layout carried its `^` across the breakpoint onto
  // a label - `Reference ^`, advertising a control that no longer toggles
  // anything. Nothing in the suite could see it: the resolver folded rules in
  // document order and modelled no specificity at all.
  //
  // Both states are reachable on both layouts, because the attribute survives a
  // resize on its own; docs.js now clears it as well, which the test below pins.
  const caret = (layout, expanded) => glyph(declIn(
    layout,
    '.has-sub > button::after',
    ...(expanded ? ['.has-sub > button[aria-expanded="true"]::after'] : []),
  ).content);

  assert.equal(caret('wide', false), 'v', 'a closed group points down on the wide layout');
  assert.equal(caret('wide', true), '^', 'an open group points up on the wide layout');
  assert.equal(caret('narrow', false), '', 'the narrow layout draws no caret on a closed group');
  assert.equal(
    caret('narrow', true), '',
    'the narrow layout draws no caret on a group left open across the breakpoint'
  );
});

test('docs: a group left open on the wide layout does not stay open across the breakpoint', () => {
  // The stylesheet takes the glyph away, but the attribute underneath it is the
  // DOM's and only the script can clear it: `aria-expanded="true"` on a button
  // the narrow layout has made a static label announces a state the page cannot
  // change. docs.js sets the attribute only while `wide.matches`, so without a
  // listener on that same MediaQueryList nothing ever put it back.
  const script = readFileSync(join(DOCS, 'assets', 'docs.js'), 'utf8');
  assert.match(
    script, /wide\.add(EventListener\(\s*'change'|Listener\()/,
    'docs.js listens for the layout changing under it'
  );
  assert.match(
    script, /if\s*\(!wide\.matches\)\s*closeSubs\(null\)/,
    'crossing into the narrow layout closes every group, so no button is left announcing one'
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

  // The bar is a flex row, so its height is the tallest of its children, and
  // every child is one of them. Reading the menu column alone answered the
  // question the test's own name asks for one child out of three: `.brand` and
  // `.nav-toggle` are children too, and `.brand` states no line box, so adding
  // `padding: var(--s3) 0` to it took its 26.40px box to 50.40px, past the
  // link's 42px, and drew a 68.40px bar against the 60px --bar declared with the
  // whole suite green. So the children are walked and the maximum taken, and the
  // walk is checked against the markup rather than listed here.
  const barChildren = childTags(navOf(PAGES[0]), '<div class="nav-bar">').map(classOf);
  assert.deepEqual(
    [...barChildren].sort(), Object.keys(BAR_CHILDREN).sort(),
    'every child the bar holds has a stated content height, and none is stated that the bar does not hold'
  );

  const navBar = style.declarationsFor('.nav-bar');
  const around = px(side(navBar.padding, 'top'), '.nav-bar padding-top')
    + px(side(navBar.padding, 'bottom'), '.nav-bar padding-bottom')
    + px(borderWidth(style.declarationsFor('.nav')['border-bottom']), '.nav border-bottom width');

  /** What the bar draws in a layout, and which child decided it. */
  function barIn(layout) {
    let tallest = { selector: null, height: 0 };
    for (const selector of barChildren) {
      const decl = declIn(layout, selector);
      if (!inFlow(decl)) continue;
      const height = BAR_CHILDREN[selector](layout) + framing(decl, selector);
      if (height > tallest.height) tallest = { selector, height };
    }
    assert.ok(tallest.selector, `the ${layout} bar shows none of its children`);
    return { ...tallest, drawn: tallest.height + around };
  }

  // Both layouts, against the --bar each declares. The wide bar is the menu; the
  // narrow one is the MENU button, with the menu hanging off the bottom of the
  // bar out of flow, so the same walk covers a figure a browser was the only
  // thing that had ever seen.
  const bar = {};
  for (const layout of ['wide', 'narrow']) {
    bar[layout] = barIn(layout);
    assert.equal(
      bar[layout].drawn, px(declIn(layout, ':root')['--bar'], `${layout} --bar`),
      `the ${layout} bar draws the height --bar declares, `
      + `and its tallest child is ${bar[layout].selector} at ${bar[layout].height}px`
    );
  }
  assert.equal(bar.wide.selector, '.menu', 'the wide bar is decided by the menu');
  assert.equal(bar.narrow.selector, '.nav-toggle', 'the narrow bar is decided by the MENU button');

  // And the two things that land underneath a fixed bar read that height rather
  // than a figure of their own. --s8 was that figure, and it was 19px short.
  // Both read --clear, which reads --bar, so both follow it down to the narrow
  // layout's shorter bar without either naming a second figure.
  assert.match(style.properties['--clear'], /var\(\s*--bar\s*[,)]/, '--clear is derived from --bar');
  const drawn = bar.wide.drawn;
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

test('docs: the two halves of the layout breakpoint name adjacent widths', () => {
  // The switch between the two layouts is one boundary written twice, in two
  // files in two syntaxes: `@media (max-width: ...)` in the stylesheet, and the
  // `matchMedia('(min-width: ...)')` docs.js reads to decide whether to collapse
  // a dropdown at all. Out of step in one direction the script collapses lists
  // the stylesheet has already opened and turned into labels; out of step in the
  // other there is a band where the menu is behind the MENU button and the
  // script still will not open a group inside it. Neither shows up in any single
  // file, which is why it is checked across the pair.
  //
  // The pair moved this turn - 860/861 to 950/951 - because the wide row of
  // eight entries does not wrap and is 951px wide, so the old breakpoint painted
  // the last group off the right edge of a bar that, being fixed, could not
  // scroll to it.
  //
  // It also holds the boundary to being one boundary. `appliesIn` above sorts a
  // rule into a layout by the bound its query names, and the whole geometry walk
  // rests on there being two layouts to sort into, so this is where a query that
  // fits neither half is caught - while it is still a stylesheet edit rather
  // than a figure reported for a layout the site does not have.
  //
  // What this does not catch: the row outgrowing the breakpoint again. That
  // needs the drawn width of eight entries of text, so it needs font metrics,
  // and the suite has no browser and must not gain one. A browser is still the
  // only thing that measures the row itself; this only holds the two halves of
  // the boundary together once a measurement has set them.
  // Every width query the sheet carries, sorted by the bound it names rather
  // than filtered down to max-width. `appliesIn` above places a rule in a layout
  // by that bound, so a query it cannot place is a block of rules silently in
  // neither layout - and a second bound at some other width is a third layout
  // the two-layout model does not have. Both are faults here, where the figure
  // is being read, rather than surprises in whatever reads the resolver next.
  const widths = { narrow: new Set(), wide: new Set() };
  const unplaceable = new Set();
  for (const rule of style.rules) {
    for (const prelude of rule.at) {
      const rest = prelude.replace(
        /\(\s*(min|max)-width:\s*(\d+)px\s*\)/g,
        (whole, bound, value) => {
          widths[bound === 'max' ? 'narrow' : 'wide'].add(Number(value));
          return '';
        }
      );
      // Any mention of a width left over, not just a `width:` one. Range syntax
      // writes the bound as a comparison - `(width <= 950px)` - so a guard
      // keyed on the colon reads it as naming no width at all, and the block
      // goes into neither layout with nothing said. `prefers-color-scheme` and
      // `prefers-reduced-motion`, the sheet's other two preludes, carry no
      // `width` to trip on.
      if (/\bwidth\b/.test(rest)) unplaceable.add(prelude);
    }
  }
  assert.deepEqual(
    [...unplaceable], [],
    'every width query in the stylesheet names a min-width or a max-width in px, '
    + 'which is what sorts the rules inside it into one of the two layouts'
  );

  assert.equal(
    widths.narrow.size, 1,
    `the stylesheet names one narrow breakpoint, not ${[...widths.narrow].join(', ')}`
  );
  const narrow = [...widths.narrow][0];
  assert.deepEqual(
    [...widths.wide].filter((width) => width !== narrow + 1), [],
    `the stylesheet goes narrow at ${narrow}px, so its only wide side is ${narrow + 1}px; `
    + 'a min-width query at any other width is a third layout, and there are two'
  );

  const script = readFileSync(join(DOCS, 'assets', 'docs.js'), 'utf8');
  const queried = [...script.matchAll(/matchMedia\(\s*'\(\s*min-width:\s*(\d+)px\s*\)'\s*\)/g)];
  assert.equal(queried.length, 1, `docs.js names one wide breakpoint, not ${queried.length}`);
  const wide = Number(queried[0][1]);

  assert.equal(
    wide, narrow + 1,
    `the stylesheet goes narrow at ${narrow}px and docs.js goes wide at ${wide}px, `
    + 'so the two layouts do not meet'
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
