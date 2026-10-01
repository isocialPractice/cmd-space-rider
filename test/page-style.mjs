// test/page-style.mjs — Reading a stylesheet this repository ships, rather than
// restating it.
//
// Two callers resolve the same three overlay rules out of index.html:
// test/browser-shell.test.mjs, which pins where the touch controls sit at a list
// of device shapes, and test/probes/overlay-anchor.mjs, which walks the whole
// viewport space instead. A second copy of a length is a copy that drifts -
// change --ctl in the page and a restated figure goes on reporting about a rule
// the page no longer has, while the CHANGELOG quotes that figure as a fact about
// the page. So the resolving lives here, once, and both read the page through it.
//
// test/docs-site.test.mjs reads the documentation site's own stylesheet through
// the same module, for the rules rather than for the lengths.
//
// This is a model of a browser and not a browser. It covers what the rules it is
// pointed at actually use: custom properties, calc, min, max, px, vw and vh. A
// length it cannot resolve throws instead of resolving to something plausible,
// which is the whole reason it is trustworthy at all.
//
// `specificity` at the foot of the file is the other half of reading a rule the
// way a browser does: which of two rules naming the same element wins is decided
// by specificity first and document order only as a tie, and a media query adds
// nothing to either. Folding in document order alone is what let a top-level
// caret rule beat the narrow layout's attempt to blank it.

/**
 * Every rule in a stylesheet, in cascade order, each with its own declarations
 * and the at-rule preludes it sits inside.
 *
 * Walked brace by brace rather than matched with one regex over `{...}`: the
 * regex finds the rules inside an `@media` block but reads them as though they
 * were top level, so nothing downstream can ask which block a rule belongs to -
 * which is the question test/docs-site.test.mjs puts to the rule that reveals a
 * dropdown, since the narrow layout opens every list unconditionally.
 */
function parseRules(css) {
  const out = [];
  const at = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const prelude = css.slice(start, i).trim();
      if (prelude.startsWith('@')) {
        at.push(prelude);
      } else {
        // Plain CSS, so a declaration block never opens a brace of its own and
        // the next `}` closes it.
        const close = css.indexOf('}', i);
        const end = close < 0 ? css.length : close;
        const body = css.slice(i + 1, end);
        out.push({
          selectors: prelude.split(',').map((sel) => sel.trim()).filter(Boolean),
          at: [...at],
          body,
          declarations: declarations(body),
        });
        i = end;
      }
      start = i + 1;
    } else if (css[i] === '}') {
      at.pop();
      start = i + 1;
    }
  }
  return out;
}

/** The `name: value` pairs in one rule's body. */
function declarations(body) {
  const out = {};
  for (const decl of body.split(';')) {
    const at = decl.indexOf(':');
    if (at < 0) continue;
    out[decl.slice(0, at).trim()] = decl.slice(at + 1).trim();
  }
  return out;
}

/**
 * A resolver bound to one stylesheet's text.
 *
 * `rules` is every rule in cascade order, `declarationsFor` folds the ones that
 * name a given selector, `properties` is the custom properties declared on
 * `:root`, and `lengthPx` resolves one of their values against a viewport.
 */
export function styleSheet(css) {
  // Comments are stripped first: they sit between rules, so an uncommented
  // parser reads one into the following rule's selector list and the rule then
  // matches nothing.
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = parseRules(text);

  /**
   * The declarations that apply to a bare selector in the top-level cascade,
   * later rules winning as the cascade has them.
   *
   * A rule inside an at-rule is left out rather than folded in. This module has
   * no viewport and no colour scheme to test a prelude against, so folding a
   * conditional block would answer for a layout the caller never asked about -
   * and silently, since the value that comes back is a real value from the
   * sheet. `docs/assets/style.css` declares `:root` twice, the base block and
   * again inside `@media (prefers-color-scheme: light)`, so the folded answer
   * for `--page` was the light scheme's `#f2f2f4` for a sheet whose base
   * scheme is dark. A caller that wants a conditional block walks `rules` and
   * reads `at` itself, which is what test/docs-site.test.mjs already does for
   * the rule that reveals a dropdown.
   *
   * Selectors are matched whole, so `#fire.on` and `body.light #fire` - which
   * carry only colours - are correctly left out.
   */
  function declarationsFor(selector) {
    const out = {};
    for (const rule of rules) {
      if (rule.at.length) continue;
      if (!rule.selectors.includes(selector)) continue;
      Object.assign(out, rule.declarations);
    }
    return out;
  }

  /**
   * The custom properties the sheet declares on `:root` at the top level, read
   * here rather than restated by a caller. Top level because `declarationsFor`
   * is: a property redeclared under a media query - the docs sheet re-inks the
   * palette for a light scheme, and gives the bar a second height for the
   * narrow layout - answers with the base block's value, which is the one the
   * page carries until a condition takes it away.
   *
   * `--ctl` is the size the touch controls are drawn at
   * and the height BOOST's offset stands on, and a caller carrying its own copy
   * of that figure would agree with itself rather than with the page.
   *
   * `--footerpx` and `--playpx` are deliberately not among them: the page
   * publishes both at runtime from handleResize, so they vary per viewport and
   * the caller supplies them through `vp.vars`.
   */
  const properties = Object.fromEntries(
    Object.entries(declarationsFor(':root')).filter(([name]) => name.startsWith('--'))
  );

  /**
   * Resolve a CSS length against a viewport, in device pixels.
   *
   * `vp` is `{ w, h, vars }`: the viewport in device pixels, and whatever custom
   * properties the caller is publishing at runtime. Those win over the sheet's
   * own `:root` block exactly as an inline style on the root element does in a
   * browser, which is how handleResize's two properties arrive.
   */
  function lengthPx(value, vp, what) {
    const vars = { ...properties, ...(vp.vars ?? {}) };
    let expr = String(value).trim();
    // A property may be written in terms of another - --ctl is solved out of
    // --playpx - so substitute until the text stops carrying one. The pass limit
    // is what makes a property that refers to itself throw below rather than
    // spin here.
    for (let pass = 0; pass < 8 && expr.includes('var('); pass++) {
      const before = expr;
      expr = expr.replace(
        /var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g,
        (whole, name) => (name in vars ? `(${vars[name]})` : whole)
      );
      if (expr === before) break;
    }
    expr = expr
      .replace(/\bcalc\(/g, '(')
      .replace(/\bmin\(/g, 'Math.min(')
      .replace(/\bmax\(/g, 'Math.max(')
      .replace(/(-?[\d.]+)vw/g, (_, n) => `(${n} * ${vp.w} / 100)`)
      .replace(/(-?[\d.]+)vh/g, (_, n) => `(${n} * ${vp.h} / 100)`)
      .replace(/(-?[\d.]+)px/g, '$1');
    // Nothing but arithmetic is ever evaluated: an unresolved unit, or a var()
    // this resolver does not know about, leaves a name behind and throws here
    // rather than quietly resolving to something plausible. This is the one
    // place in the suite that builds code out of file text, and that guard is
    // what makes it safe - the input is the repository's own stylesheet, and the
    // transformed expression is proved to hold nothing else first.
    if (!/^[-+*/(),.\s\d]+$/.test(expr.replace(/Math\.(min|max)/g, ''))) {
      throw new Error(`${what} carries a length this resolver cannot resolve: ${value}`);
    }
    return Function(`"use strict";return (${expr});`)();
  }

  return { text, rules, declarationsFor, properties, lengthPx };
}

/** The resolver for a page carrying its stylesheet inline, as index.html does. */
export function pageStyle(html) {
  const open = html.indexOf('<style>');
  const close = html.indexOf('</style>');
  if (open < 0 || close < 0) throw new Error('the page has no <style> block');
  return styleSheet(html.slice(open + '<style>'.length, close));
}

/**
 * The four pseudo-elements CSS2 spelled with one colon. A browser still accepts
 * that spelling, and it counts as an element either way, so `:after` and
 * `::after` have to weigh the same here or a sheet written in the older form
 * resolves to the wrong rule.
 */
const PSEUDO_ELEMENTS = /^(before|after|first-line|first-letter)$/;

/**
 * A selector's specificity, as the three counts CSS orders by: ids, then
 * classes, attributes and pseudo-classes, then types and pseudo-elements.
 *
 * Needed because a media query contributes no specificity of its own. The
 * narrow block's `.has-sub > button::after` is (0,1,2) and the top-level
 * `.has-sub > button[aria-expanded="true"]::after` is (0,2,2), so the top-level
 * rule wins inside the narrow layout however the file is ordered - which is how
 * an expanded group kept its caret on a layout that has no dropdowns to open.
 * A resolver that folds in document order alone cannot see that at all.
 *
 * What it does not model: the specificity of a `:not()`, `:is()`, `:where()` or
 * `:has()` argument. CSS takes the first three from the most specific selector
 * inside the parentheses and `:where()` from nothing at all, while the
 * pseudo-class pass below would count any of the four as one plain class. So
 * the four throw rather than answer. A wrong count here is silent in the worst
 * way - it is a plausible count, so the rule it decides folds in the wrong
 * order with nothing failing - and neither stylesheet this module is pointed at
 * carries one today, which makes the first to gain one also the first to
 * exercise the gap. Teaching this function the argument rule is what lifts the
 * guard; until then a sheet that gains one fails here, where the gap is.
 */
const FUNCTIONAL_PSEUDO = /:(?:not|is|where|has)\(/i;

export function specificity(selector) {
  // Matched with the colon, so `.has-sub` - which this sheet is full of - is not
  // read as a `:has()`.
  if (FUNCTIONAL_PSEUDO.test(selector)) {
    throw new Error(
      'specificity does not model the argument of a functional pseudo-class, '
      + `so this selector has no count to trust: ${selector}`
    );
  }

  let ids = 0;
  let classes = 0;
  let types = 0;
  let rest = String(selector);

  // Attribute selectors first. Their values carry `.`, `#` and `:` freely -
  // `[href="#play"]` holds what reads as an id - so taking them out ahead of
  // everything else is what stops the value being counted as a selector.
  rest = rest.replace(/\[[^\]]*\]/g, () => { classes++; return ' '; });

  rest = rest.replace(/::?[\w-]+(\([^)]*\))?/g, (whole) => {
    const name = whole.replace(/^::?/, '').replace(/\(.*$/, '');
    if (whole.startsWith('::') || PSEUDO_ELEMENTS.test(name)) types++;
    else classes++;
    return ' ';
  });

  rest = rest.replace(/#[\w-]+/g, () => { ids++; return ' '; });
  rest = rest.replace(/\.[\w-]+/g, () => { classes++; return ' '; });

  // Whatever is left is element names and combinators. `*` counts for nothing.
  for (const part of rest.split(/[\s>+~,]+/)) {
    if (part && part !== '*') types++;
  }
  return [ids, classes, types];
}

/** Orders two specificities weakest first, for a sort whose ties document order breaks. */
export const compareSpecificity = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
