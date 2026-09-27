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
   * The declarations that apply to a bare selector, later rules winning as the
   * cascade has them. Selectors are matched whole, so `#fire.on` and
   * `body.light #fire` - which carry only colours - are correctly left out.
   */
  function declarationsFor(selector) {
    const out = {};
    for (const rule of rules) {
      if (!rule.selectors.includes(selector)) continue;
      Object.assign(out, rule.declarations);
    }
    return out;
  }

  /**
   * The custom properties the sheet declares on `:root`, read here rather than
   * restated by a caller. `--ctl` is the size the touch controls are drawn at
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
