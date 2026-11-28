// test/palette-contrast.test.mjs — The contrast figures this repository quotes,
// taken as arithmetic rather than off a canvas.
//
// Two readings found something on 11-27-26, and both were taken in a browser:
// the tunnel's two far depth bands sitting a hundredth of black apart, and the
// GRAY the footer's control hints were drawn in sitting under the 3:1 a
// large-text minimum asks for. A browser is the one place neither will be taken
// again - it needs an agent with a Chromium, which visits when it visits - and
// neither actually needs one.
//
// A glyph the renderer draws is one `PALETTE` hex over another at a coverage the
// glyph fixes. U+2591 is a quarter, U+2592 a half, U+2593 three quarters, U+2588
// all of it. Relative luminance and the WCAG ratio are closed-form from there,
// so every figure in those two readings is arithmetic over `themePalette` and
// runs on every change instead of when an agent passes through.
//
// **What is asserted here is a pinning and not a floor.** Two of the inks the
// renderer writes text in sit under 3:1 against the dark backdrop, and both are
// deliberate - see TEXT_CONTRAST below, which says which and why. A figure that
// moves is what fails, so a re-inking that takes an ink somewhere nobody meant
// is named with both numbers rather than passing because it is still above some
// threshold.
//
// **The CRT overlay's composite is out of scope, and that is a finding rather
// than a gap.** `#crt` is CSS over the canvas, so the two alphas are read off
// the stylesheet below and pinned - but the composite is not asserted, because
// the arithmetic does not reproduce what the browser measured. Multiplying GRAY
// by the scanline's `1 - .26` gives 1.99:1 where the browser pass read 1.64:1 on
// a scanlined pixel row, and the untouched rows came back at 2.38:1 where the
// arithmetic says they are untouched and so still 2.82:1. A 1px band in a
// repeating gradient is sampled at whatever device pixel ratio the display has,
// which is a reading no closed form here owns. Putting the composite in would
// put a second figure for one thing into the suite, disagreeing with the figure
// in index.html's own comment - which is the shape of defect this repository has
// spent four versions on. The alphas are the half that is pinnable from text: a
// change to either fails here and sends the next reader back to take the
// composite in a browser again.
//
// Nothing here pairs with test/parity.test.mjs. `themePalette` and the light
// scheme are the browser build's alone, and a terminal's colours belong to its
// emulator.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, fakeStorage } from './helpers.mjs';
import { pageStyle } from './page-style.mjs';

const browser = loadBrowserEngine(fakeStorage());
const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');

/**
 * The page with its line comments taken off, so a name can only be a usage.
 *
 * The same reader test/browser-shell.test.mjs uses on the same file and for the
 * same reason: the comments above the ramp and above the footer's hint row both
 * name inks in order to say something about them, and a scan over the raw page
 * reads every one of those as a drawing site.
 *
 * The first `//` that is not the tail of a scheme - the page carries two
 * `https://` links, and a stripper that took those for comments would silently
 * shorten the lines they sit on.
 */
function pageCode() {
  return html.split('\n').map((line) => {
    const at = line.search(/(^|[^:/])\/\//);
    if (at < 0) return line;
    return line.slice(0, at === 0 ? 0 : at + 1);
  }).join('\n');
}

// ----- The arithmetic -----

/**
 * One channel's share of relative luminance, sRGB's own transfer curve.
 *
 * Written out rather than approximated, because the whole point of this file is
 * that the browser's figures are rebuildable: a gamma of 2.2 instead of the
 * piecewise curve moves the far bands in the third decimal, which is exactly
 * where the depth ramp's interesting figure lives.
 */
const channel = (value) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance of a hex colour, 0 for black and 1 for white. */
function relativeLuminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255)
    + 0.7152 * channel((n >> 8) & 255)
    + 0.0722 * channel(n & 255);
}

/** The WCAG contrast ratio between two hex colours, lighter over darker. */
function contrast(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/**
 * A glyph's cell as one colour: `ink` laid over `paper` at the coverage the
 * glyph fixes.
 *
 * Mixed in channel values rather than in luminance, which is the one step that
 * cannot be taken the other way round. Luminance is not linear in the channel,
 * so averaging two luminances at a coverage answers a different number from
 * averaging the channels and taking the luminance of the result - and the second
 * is what a screen does.
 *
 * This is a model of the glyph as flat coverage and not of a rasterizer. Read
 * back off a real canvas a cell at a time, the four wall bands cover 14%, 29%,
 * 75% and 86% of their cells rather than the quarter, half, three quarters and
 * all the glyphs specify, because a shade glyph is a dither pattern and a font
 * draws it at whatever size the cell is. test/warp.test.mjs says the same thing
 * about the same four percentages and declines to assert them, for the same
 * reason: they belong to one browser's font. What the coverage below is, is what
 * the ramp was picked against.
 */
function over(ink, paper, coverage) {
  const front = parseInt(ink.slice(1), 16);
  const back = parseInt(paper.slice(1), 16);
  let out = 0;
  for (let shift = 16; shift >= 0; shift -= 8) {
    const mixed = Math.round(
      ((front >> shift) & 255) * coverage + ((back >> shift) & 255) * (1 - coverage)
    );
    out = (out << 8) | mixed;
  }
  return `#${out.toString(16).padStart(6, '0')}`;
}

// ----- The depth ramp -----

/**
 * The share of its cell each shade glyph inks.
 *
 * A property of Unicode rather than of this page, which is why it is written
 * here and the bands are read off the page: U+2591 LIGHT SHADE is a quarter,
 * U+2592 MEDIUM SHADE a half, U+2593 DARK SHADE three quarters, U+2588 FULL
 * BLOCK all of it. A fifth glyph, or one of these swapped for something else,
 * fails `tunnelBands` below rather than being weighed at a coverage somebody
 * guessed at.
 */
const GLYPH_COVERAGE = {
  2591: 0.25,
  2592: 0.5,
  2593: 0.75,
  2588: 1,
};

/**
 * `drawTunnel`'s four depth bands, read off the page's own source, far end
 * first: the glyph each is drawn in and the two inks its pulse picks between.
 *
 * Read rather than restated, because a restated ramp is a ramp that goes on
 * reporting about a tunnel the page no longer draws. The four lines it matches
 * are one `if`/`else if`/`else` chain written in exactly this shape; a rewrite
 * that keeps the behaviour and changes the shape fails the count below, which is
 * the right outcome - the figures want re-taking either way.
 */
function tunnelBands() {
  const read = [...pageCode().matchAll(
    /wallChar='\\u([0-9a-f]{4})';wallColor=pulse>[\d.]+\?C\.([A-Z_]+):C\.([A-Z_]+)/gi
  )];
  assert.equal(read.length, 4,
    `drawTunnel's ramp reads as ${read.length} depth bands rather than four - the figures `
    + 'above those lines in index.html are counted over four, so a fifth band or a rewritten '
    + 'chain wants them taken again rather than carried over');
  return read.map(([, glyph, bright, dim]) => {
    const coverage = GLYPH_COVERAGE[glyph.toLowerCase()];
    assert.ok(coverage !== undefined,
      `the ramp draws a band in U+${glyph.toUpperCase()}, whose share of a cell this file does `
      + 'not know - the four shade glyphs are the set every wall figure is counted over');
    // `pulse > 0.6` takes the first of the pair and the rest of the sine takes
    // the second, so `bright` is the branch the page writes first and is the
    // dimmer of the two at the far end. Named for position in the source rather
    // than for lightness, which the assertions below are what settle.
    return { coverage, inks: [bright, dim] };
  });
}

/**
 * Every ink the four bands can be on at one instant: one of each band's pair,
 * independently, which is 16 arrangements and not 2.
 *
 * Independent because `pulse` is a function of the row - `sin(time*3 +
 * row*0.15)` - so two rows in two bands are at different phases of it on the
 * same frame. That is the whole mechanism behind the far pair: band 1 takes
 * DARK_BLUE or BLUE and band 2 takes BLUE or BRIGHT_BLUE, and a frame holding a
 * band-1 row below the threshold and a band-2 row above it has both bands
 * carrying BLUE at once.
 */
function arrangements(bands) {
  const out = [];
  for (let mask = 0; mask < 2 ** bands.length; mask++) {
    out.push(bands.map((band, at) => ({
      coverage: band.coverage,
      ink: band.inks[(mask >> at) & 1],
    })));
  }
  return out;
}

/**
 * The tightest the ramp ever gets, band against band, and where.
 *
 * Stated as the expected value rather than as a floor to clear, because the
 * answer is 1.0930:1 and no floor worth writing admits it. index.html's comment
 * above the ramp is where the decision to accept that lives; this is what makes
 * it a figure rather than a recollection, and what fails when a re-inking moves
 * it in either direction.
 *
 * Bands 1 and 2 are where it sits for the reason that comment gives: the pulse
 * overlaps the ramp by one rung, so the two can carry the same ink and be
 * separated by coverage alone, a quarter of a cell against a half.
 *
 * The browser pass that found this read 1.04:1 instead, off the mean luminance
 * of 300 wall cells per band over 30 frames. That is a different measurement of
 * the same thing and not a disagreement: a mean mixes the two branches and the
 * font's own antialiasing, and at a level this close to black the antialiasing
 * is most of what is being averaged. Both figures are below anything a reader
 * can see, which is the finding either way.
 */
const TIGHTEST_RAMP_PAIR = { ratio: 1.093, bands: '1/2' };

/**
 * Far wall to near wall, as a factor of linear luminance, over every
 * arrangement.
 *
 * The browser pass put this at 221x, re-derived from its own four band means
 * after it published 167x - which was the count of `#00005f` readings in band 1
 * and not a ratio at all. 221x sits inside the range below, which is the whole
 * of what this file can say about a figure measured off means it cannot rebuild.
 */
const FAR_TO_NEAR = { low: 181.5, high: 1223.3 };

test('the tunnel depth ramp climbs far to near on every pulse arrangement', () => {
  // The ordering is what the ramp is for, and it holds on all sixteen: the
  // dimmest a band can be is still brighter than the brightest the band behind
  // it can be. Asserted over the arrangements rather than over the pairs the
  // page writes, because a player sees one row of each band at once and the
  // rows are at different phases of the same sine.
  const palette = browser.themePalette('dark');
  const paper = browser.THEME_BG.dark;
  const bands = tunnelBands();

  let tightest = { ratio: Infinity, bands: '' };
  let span = { low: Infinity, high: 0 };

  for (const arrangement of arrangements(bands)) {
    const cells = arrangement.map(({ ink, coverage }) => {
      const hex = palette[browser.C[ink]];
      assert.ok(hex, `the ramp draws in C.${ink}, which the palette has no entry for`);
      return { ink, hex: over(hex, paper, coverage) };
    });
    const read = cells.map(({ hex }) => relativeLuminance(hex));
    const named = arrangement.map(({ ink }) => ink).join(' -> ');

    for (let at = 0; at + 1 < read.length; at++) {
      assert.ok(read[at + 1] > read[at],
        `${named}: band ${at + 2} is at ${read[at + 1].toFixed(5)} of luminance behind band `
        + `${at + 1} at ${read[at].toFixed(5)}, so the tunnel dips where it should climb`);
      const ratio = (read[at + 1] + 0.05) / (read[at] + 0.05);
      if (ratio < tightest.ratio) tightest = { ratio, bands: `${at + 1}/${at + 2}` };
    }

    const factor = read[read.length - 1] / read[0];
    span = { low: Math.min(span.low, factor), high: Math.max(span.high, factor) };
  }

  assert.deepEqual(
    { ratio: Number(tightest.ratio.toFixed(4)), bands: tightest.bands },
    { ratio: TIGHTEST_RAMP_PAIR.ratio, bands: TIGHTEST_RAMP_PAIR.bands },
    `the tightest the ramp gets is now ${tightest.ratio.toFixed(4)}:1 between bands `
    + `${tightest.bands}, where index.html's comment above the ramp states `
    + `${TIGHTEST_RAMP_PAIR.ratio}:1 between bands ${TIGHTEST_RAMP_PAIR.bands} - whichever `
    + 'moved, the comment and this figure are one decision written in two places'
  );

  assert.deepEqual(
    { low: Number(span.low.toFixed(1)), high: Number(span.high.toFixed(1)) },
    FAR_TO_NEAR,
    `far wall to near wall now spans ${span.low.toFixed(1)}x to ${span.high.toFixed(1)}x of `
    + `linear luminance against the ${FAR_TO_NEAR.low}x to ${FAR_TO_NEAR.high}x index.html `
    + 'publishes above the ramp'
  );

  // And the browser's own figure, re-derived from its band means, is inside that
  // range - which is the only thing this file can check about it.
  assert.ok(221 > span.low && 221 < span.high,
    `the 221x the browser pass re-derived from its band means sits outside ${span.low} to `
    + `${span.high}, so one of the two readings is of something other than this ramp`);
});

// ----- The text inks -----

/**
 * The three calls that put text on the character grid, read for the ink each
 * names.
 *
 * `drawBanner` is here because it takes its ink from the caller, so a call site
 * is where the ink is actually chosen - the `C.WHITE` inside it blanks the
 * banner's field with spaces and is paper rather than text. `hLine`, `vLine`,
 * `fillRect` and `put` are out for the opposite reason: they draw a glyph or a
 * run of one, which is a drawing and not a reading.
 *
 * What this cannot see is a second wrapper of the same shape. `drawBanner` is
 * the only one the page has today, checked by reading every call that reaches
 * `putString` with an ink it did not name itself, and a new one wants adding
 * here - the set assertion below is what makes that loud, since a wrapper's own
 * call sites would take their inks out of the set.
 */
const TEXT_CALLS = ['putStringCenter', 'putString', 'drawBanner'];

/** Every ink the renderer writes text in, read off the page's own calls. */
function textInks() {
  const code = pageCode();
  const found = new Set();
  for (const call of TEXT_CALLS) {
    let at = 0;
    while ((at = code.indexOf(`${call}(`, at)) >= 0) {
      let depth = 0;
      let end = at + call.length;
      for (; end < code.length; end++) {
        if (code[end] === '(') depth++;
        else if (code[end] === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      // The argument list, paren-matched rather than read to the end of the
      // line: the page writes eight of these calls across two lines, with the
      // ink on the second, and a line-wise reader misses every one of them.
      const args = code.slice(at + call.length + 1, end);
      for (const [, name] of args.matchAll(/\bC\.([A-Z_]+)\b/g)) found.add(name);
      at = end;
    }
  }
  // BLACK is the background argument of nearly every one of those calls, and
  // the page a cell is left unpainted against. It is the second operand below,
  // not a text ink.
  found.delete('BLACK');
  return [...found].sort();
}

/**
 * Every ink the renderer writes text in, against the paper of each scheme.
 *
 * Pinned rather than bounded, and the two figures under 3:1 are why. A floor
 * would have to be written at 2.7 to admit the table as it stands, which admits
 * every re-inking anyone would make by accident; the figures catch one and name
 * both numbers.
 *
 * **GRAY at 2.82:1 dark is deliberate, and narrower than it was.** Until
 * 0.16.11 it drew the footer's control hint row and the pause overlay's `P to
 * resume` - the two rows on screen that tell a player which keys to press - and
 * both moved to WHITE, at 9.04:1 dark and 7.85:1 light. What GRAY still draws is
 * quiet by design and carries no instruction: the spent cells of the shield bar,
 * the fading end of a particle, the ghost ship, an unselected menu row beside a
 * cyan selected one, an eliminated pilot's name in the versus standings. Light
 * mode's 3.06:1 clears the floor by a hundredth.
 *
 * DESIGN_LANGUAGE.md reached both of those figures first, for the documentation
 * site: it rules GRAY out of carrying text there at 2.82:1 and LIGHT_INK[8] out
 * at 3.06:1, and picks WHITE at 9.04:1 for the site's body text. The site held
 * to that and the game did not, which is what 0.16.11 closed and what the two
 * figures below are now read against on every change.
 *
 * **RED at 2.71:1 dark is one phase of a blink.** Its single text site is
 * `drawBanner(screen, '>> ASTEROID FIELD <<', blink ? C.BRIGHT_RED : C.RED)`, so
 * the banner alternates with BRIGHT_RED at 6.68:1 and is never held at 2.71:1 -
 * a reader of this table should not take the figure for a static one. Nothing
 * was changed about it.
 *
 * Every other ink clears 3:1 in both schemes, and the quietest of them is
 * MAGENTA at 3.29:1 dark.
 */
const TEXT_CONTRAST = {
  dark: {
    BRIGHT_CYAN: 17.13,
    BRIGHT_GREEN: 15.82,
    BRIGHT_MAGENTA: 8,
    BRIGHT_RED: 6.68,
    BRIGHT_WHITE: 21,
    BRIGHT_YELLOW: 19.69,
    CYAN: 7.33,
    GRAY: 2.82,
    GREEN: 6.75,
    MAGENTA: 3.29,
    RED: 2.71,
    WHITE: 9.04,
    YELLOW: 4.01,
  },
  light: {
    BRIGHT_CYAN: 12.1,
    BRIGHT_GREEN: 13.15,
    BRIGHT_MAGENTA: 14.54,
    BRIGHT_RED: 12.71,
    BRIGHT_WHITE: 16.98,
    BRIGHT_YELLOW: 11.22,
    CYAN: 7.52,
    GRAY: 3.06,
    GREEN: 6.06,
    MAGENTA: 10.02,
    RED: 8.3,
    WHITE: 7.85,
    YELLOW: 6.27,
  },
};

test('every ink the renderer writes text in is held to its own contrast figure', () => {
  // The set first, in both directions. An ink that joins the text inks without
  // a figure beside it is the half that matters - a new drawing site in a colour
  // nobody weighed - and an ink that leaves takes a figure with it that is then
  // about nothing.
  assert.deepEqual(
    textInks(), Object.keys(TEXT_CONTRAST.dark).sort(),
    'the inks index.html writes text in and the inks this table holds figures for have come '
    + 'apart - a new text ink wants its two figures taken, and a retired one wants its row '
    + 'removed rather than left standing for a drawing site that is gone'
  );

  for (const scheme of ['dark', 'light']) {
    const palette = browser.themePalette(scheme);
    const paper = browser.THEME_BG[scheme];
    for (const [name, published] of Object.entries(TEXT_CONTRAST[scheme])) {
      const hex = palette[browser.C[name]];
      const read = contrast(hex, paper);
      assert.equal(
        Number(read.toFixed(2)), published,
        `${scheme}: ${name} at ${hex} reads ${read.toFixed(2)}:1 against the ${paper} paper, `
        + `where this file publishes ${published}:1 - a re-inking moved it, and GRAY's and `
        + "WHITE's figures are quoted in index.html, src/render.ts and DESIGN_LANGUAGE.md "
        + 'as well as here'
      );
    }
  }
});

// ----- The CRT overlay -----

/**
 * The two alphas `#crt` lays over the canvas, read off the page's own
 * stylesheet.
 *
 * Read rather than restated for the reason test/page-style.mjs exists: a second
 * copy of a length is a copy that drifts, and these two are quoted in
 * index.html's comment above the footer's hint row as the reason that row's
 * figures fall where they do. The scanline is a 1px band of `rgba(0,0,0,.26)`
 * in a 3px repeat; the vignette runs from transparent at 55% of the ellipse to
 * `rgba(0,0,0,.55)` at its edge.
 *
 * The composite is not asserted - see this file's header. The arithmetic gives
 * 1.99:1 for GRAY on a scanlined row where the browser read 1.64:1, and says the
 * untouched rows are untouched where the browser read 2.38:1 against their
 * unoverlaid 2.82:1, because a 1px band in a repeating gradient is sampled at
 * the display's device pixel ratio. So what is held here is the premise: change
 * either alpha and this fails, which is the signal to take the composite in a
 * browser again rather than to carry the old figures forward.
 */
const CRT_ALPHAS = { scanline: 0.26, vignette: 0.55 };

test('the CRT overlay lays down the two alphas the hint-row figures were read under', () => {
  const sheet = pageStyle(html);
  const background = sheet.declarationsFor('#crt').background;
  assert.ok(background, '#crt resolves no background, so the overlay this pins is not there');

  // Every alpha the declaration names, in the order it writes them, with the
  // transparent stops dropped - those are the gaps between the bands rather
  // than a level anything is darkened by.
  const laid = [...String(background).matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g)]
    .map(([, alpha]) => Number(alpha))
    .filter((alpha) => alpha > 0);

  assert.deepEqual(
    [...new Set(laid)], [CRT_ALPHAS.scanline, CRT_ALPHAS.vignette],
    `#crt now lays down ${laid.join(', ')} where the figures above the footer's hint row in `
    + `index.html were read under ${CRT_ALPHAS.scanline} and ${CRT_ALPHAS.vignette} - those `
    + 'figures want taking again in a browser rather than carrying over'
  );

  // And the scanline is one row in three, which is the other half of what makes
  // the overlay a period rather than a flat wash. Read off the same declaration,
  // since the two stops are what the repeat is built from.
  const stops = [...String(background).matchAll(/(\d+)px/g)].map(([, px]) => Number(px));
  assert.deepEqual(
    [...new Set(stops)], [1, 3],
    `#crt's scanline band and repeat now read ${stops.join(', ')}px where the hint-row `
    + "figures were read under a 1px band in a 3px repeat - the browser pass confirmed that "
    + 'period on a glyph\'s own pixel rows, and a different one is a different measurement'
  );
});
