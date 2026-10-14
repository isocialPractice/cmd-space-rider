// test/probes/glyph-tuning.mjs — The figures the glyph tuning in index.html
// quotes about itself.
//
// Six sets of numbers sit in the comments around `glyphInset` and `tuneText`,
// and until this file none of them could be rebuilt from the repository: every
// one was read in chromium against a scratch copy of the page and written down.
// The `## Measurement` item in TODO.md asked for a probe and asked, in the same
// breath, whether a browser probe belongs here at all.
//
// The answer this file takes, which is recorded at the foot of its output as
// well as here: the arithmetic is rebuilt and the rasterizer readings are not.
// Those two halves are not the same kind of figure.
//
// The arithmetic half needs one measured input - that Courier New advances at
// 1229/2048 em - and everything after that is a ceiling, a subtraction and a
// halving. The per-size cell table, the inset range and its ends, the cycle of
// five, the flat-0.6 near miss and the glyph-and-size pair counts all fall out
// of it, and this probe prints them from EM_ADVANCE and the page's own
// `glyphInset` rather than from a transcription. A figure in that half is now
// wrong only if this arithmetic is wrong.
//
// The rasterizer half - what a pixel column came back at, what a glyph's ink
// box measured - cannot be got at without a rasterizer, and this probe does not
// pretend otherwise. It names each of those figures, says which instrument took
// it and what it concluded, and leaves it unrebuildable. The last section of
// the output is that list, which is the method published beside the number.
//
// The one figure that moved between the halves is the overhang past the cell.
// It was recorded as a rasterizer reading, and it turns out to be arithmetic
// resting on a single rasterizer premise - see `OVERHANG_PREMISE` below, which
// is careful about what that does and does not establish.
//
//   npm run probe -- glyph-tuning
//
// Browser only, and it takes no flags: the range it walks is the page's own
// FONT_SIZE down to MIN_FONT_SIZE, and there is no grid, build, placement walk
// or pass in it. The CLI build writes characters into a terminal, which places
// them in its own cells, so there is nothing here for test/parity.test.mjs to
// pair with either.

import { loadBrowserEngine } from '../helpers.mjs';

/**
 * Courier New's advance, in units of the em. The one measured input in the
 * arithmetic half, and the only number here that a reader has to take on trust.
 *
 * It is a property of the font file rather than of this repository or of any
 * browser, which is what makes it a safe thing to restate: the same metric is
 * in every copy of Courier New, where a pixel column read off one rasterizer is
 * a reading from one build of one engine on one machine.
 *
 * Not 0.6, and the comments in index.html turn on the difference. See the
 * `flat 0.6` rows below for where the two actually part company.
 */
const EM_ADVANCE = 1229 / 2048;

/** The flat em the font is near enough to be taken for, and is not. */
const FLAT_EM = 0.6;

/**
 * The rasterizer reading the overhang arithmetic rests on, and the reason this
 * is a reconstruction rather than a measurement.
 *
 * What index.html records, from chromium: `actualBoundingBoxRight` is a whole
 * number at every size, never less than the cell, and the overhang past the
 * cell once the inset is counted runs 0.299px to 1.200px across the eleven
 * sizes. Eleven numbers, none of them derivable, is how that stood.
 *
 * They are all derivable from one rule - the ink box ends at `round(advance) +
 * 1` - and this probe prints the eleven it gives and the range they span. Two
 * things agree with that rule and one would settle it:
 *
 * - It reproduces both published ends exactly, 0.299px and 1.200px, and lands
 *   every size inside them. A per-size fudge could do that; a rule this short
 *   doing it is a different kind of coincidence.
 * - The `+ 1` is separately recorded. The comment beside `glyphInset` says
 *   three of the four wall glyphs reach a whole pixel left of the origin they
 *   are drawn at, read off `actualBoundingBoxLeft`, which is where a box one
 *   pixel wider than the rounded advance comes from.
 * - What would settle it is reading `actualBoundingBoxRight` at the eleven
 *   sizes and comparing. That needs the rasterizer, and this probe does not
 *   have one.
 *
 * So the figure is quoted here as a reconstruction that the published range
 * agrees with, and not as a rebuild of it. The distinction is the whole point
 * of the rig: a probe reports its method, and the method here includes a
 * premise nothing in the repository can check.
 */
const OVERHANG_PREMISE = 'actualBoundingBoxRight = round(advance) + 1, fitted to the published range';

/** The four glyphs drawTunnel draws the walls from, which the pair counts are over. */
const WALL_GLYPHS = ['░', '▒', '▓', '█'];

const px = (n) => n.toFixed(3);

/**
 * Every size `fitGrid` walks, with the arithmetic each one produces.
 *
 * `cell` is `measureCell`'s own `max(1, ceil(advance))` and `inset` is the
 * page's own `glyphInset` of the pair, so the two figures that matter are taken
 * off index.html rather than restated. `measureCell` itself cannot be called -
 * it asks a canvas context for the advance - which is why the advance is
 * modelled from the em metric and the cell is taken the way that function takes
 * it.
 */
function table(engine) {
  const rows = [];
  for (let size = engine.FONT_SIZE; size >= engine.MIN_FONT_SIZE; size--) {
    const advance = size * EM_ADVANCE;
    const cell = Math.max(1, Math.ceil(advance));
    const inset = engine.glyphInset(cell, advance);
    const inkRight = Math.round(advance) + 1;
    rows.push({
      size,
      advance,
      cell,
      inset,
      inkRight,
      overhang: inkRight + inset - cell,
      flatAdvance: size * FLAT_EM,
      flatCell: Math.max(1, Math.ceil(size * FLAT_EM)),
    });
  }
  return rows;
}

/**
 * The sizes `fitGrid` can actually settle on, found by walking viewports rather
 * than assumed to be the whole range.
 *
 * The comments say "every size fitGrid can settle on" and then quote a range of
 * eleven. That is two claims - that the fitter reaches all eleven, and what the
 * arithmetic is at each - and only the second one is arithmetic. This walks the
 * first.
 *
 * Measured with the real em rather than the flat 0.6 that
 * test/browser-shell.test.mjs models, since the question is which font sizes the
 * page would settle on in front of a player.
 */
function reachable(engine) {
  const measure = (size) => ({
    w: Math.max(1, Math.ceil(size * EM_ADVANCE)),
    h: size + engine.CELL_LEADING,
  });
  const found = new Map();
  // Every integer viewport over the range a window or a phone occupies. The
  // fitter walks the font range from the top down and returns the first size
  // that holds the game's floor, so a size is only reachable at viewports too
  // small for every size above it - which makes the small end of this walk the
  // part that does the work.
  for (let w = 200; w <= 2200; w++) {
    for (let h = 150; h <= 1400; h += 7) {
      const grid = engine.fitGrid(w, h, measure);
      if (!grid.fits) continue;
      found.set(grid.fontSize, (found.get(grid.fontSize) ?? 0) + 1);
    }
  }
  return found;
}

export async function run() {
  const engine = loadBrowserEngine();
  const rows = table(engine);
  const sizes = rows.length;

  console.log('glyph-tuning');
  console.log(
    `  method: advance = size * ${EM_ADVANCE.toFixed(11)} (1229/2048 em, the one measured input);`
    + ' cell = max(1, ceil(advance)) as measureCell takes it;'
  );
  console.log("    inset = index.html's own glyphInset(cell, advance)");
  console.log(
    `  sizes: FONT_SIZE ${engine.FONT_SIZE} down to MIN_FONT_SIZE ${engine.MIN_FONT_SIZE},`
    + ` ${sizes} of them, the range fitGrid walks`
  );
  console.log(`  overhang premise: ${OVERHANG_PREMISE}`);
  console.log('');

  // ----- the per-size table, which every figure below reads off -----

  console.log('  size   advance    cell   inset    ink right   overhang    flat 0.6   flat cell');
  for (const r of rows) {
    console.log(
      `  ${String(r.size).padStart(4)}   ${px(r.advance).padStart(7)}`
      + `   ${String(r.cell).padStart(4)}   ${px(r.inset)}`
      + `   ${String(r.inkRight).padStart(9)}   ${px(r.overhang).padStart(8)}`
      + `   ${px(r.flatAdvance).padStart(8)}   ${String(r.flatCell).padStart(9)}`
    );
  }
  console.log('');

  // ----- the inset range, quoted beside tuneText -----

  const insets = rows.map((r) => r.inset);
  const low = rows.reduce((a, b) => (b.inset < a.inset ? b : a));
  const high = rows.reduce((a, b) => (b.inset > a.inset ? b : a));
  console.log('  the inset range, quoted beside tuneText as 0.099px to 0.500px:');
  console.log(
    `    ${px(low.inset)}px at font ${low.size} to ${px(high.inset)}px at font ${high.size};`
    + ` zero at ${insets.filter((i) => i === 0).length} of the ${sizes} sizes`
  );
  console.log(
    `    and never as much as half a pixel, which the three-place figure above hides: the cell is`
    + ` the ceiling of the advance, so the slack is under a pixel and the inset is half of it -`
    + ` the largest here is ${high.inset.toFixed(11)}`
  );
  console.log(
    `    that is what reconciles two sentences beside tuneText that look as though they disagree.`
    + ` "the inset runs 0.099px to 0.500px" and "can never reach half a pixel" are both true: the`
    + ` published 0.500 is ${high.inset.toFixed(11)} rounded, and nothing here is 0.5 or over.`
  );
  console.log('');

  // ----- the near miss, which is why both ends are where they are -----

  const whole = rows.filter((r) => Number.isInteger(r.flatAdvance));
  console.log('  the flat 0.6 near miss, quoted beside tuneText:');
  console.log(
    `    0.6 * size is a whole number at ${whole.map((r) => `font ${r.size}`).join(' and ')},`
    + ' so under a flat 0.6 those sizes would have no slack at all'
  );
  console.log(
    `    under the font's own metric they have the most of any:`
    + ` ${whole.map((r) => `${px(r.inset)}px`).join(' and ')}`
  );
  const parted = rows.filter((r) => r.cell !== r.flatCell);
  console.log(
    `    a ceiling is at its most sensitive either side of an integer, and that is where the two`
    + ` models part: ${parted.length} of ${sizes} sizes get a different cell -`
  );
  for (const r of parted) {
    console.log(
      `      font ${r.size}: ${px(r.advance)} ceils to ${r.cell},`
      + ` where the flat ${px(r.flatAdvance)} would ceil to ${r.flatCell}`
      + ` - ${(r.advance - r.flatAdvance).toFixed(8)}px of advance buying a whole pixel of cell`
    );
  }
  console.log(
    `    worth saying twice: test/browser-shell.test.mjs and the overlay-anchor probe model the`
    + ` cell at a flat 0.6 on purpose, and so disagree with the font at exactly these`
    + ` ${parted.length} sizes. That is a layout model answering a layout question, not a`
    + ` reading of Courier New - do not quote its cell as the font's.`
  );
  console.log('');

  // ----- the cycle of five, and the drift that keeps it from being exact -----

  const cycle = 5;
  // Read upward, from each size to the one five larger, so a cell that gains
  // three pixels over the step reads as a gain. The table walks downward.
  const drift = rows
    .filter((r) => rows.some((o) => o.size === r.size + cycle))
    .map((r) => {
      const up = rows.find((o) => o.size === r.size + cycle);
      return { from: r, to: up, dInset: up.inset - r.inset, dCell: up.cell - r.cell };
    });
  console.log(`  the cycle of ${cycle}, quoted beside tuneText:`);
  console.log(
    `    ${cycle} * ${EM_ADVANCE.toFixed(11)} is ${(cycle * EM_ADVANCE).toFixed(11)}, three pixels`
    + ` and ${(cycle * EM_ADVANCE - 3).toFixed(11)} over`
  );
  console.log(
    `    the cell steps by exactly 3 across all ${drift.length} pairs`
    + ` (${[...new Set(drift.map((d) => d.dCell))].join(', ')} each), so each step up the cycle`
    + ` loses half the remainder off the inset:`
    + ` ${[...new Set(drift.map((d) => d.dInset.toFixed(11)))].join(', ')}`
  );
  console.log(
    `    which is why the table reads 0.499 and 0.500 for one step of the cycle and 0.299 and`
    + ` 0.300 for another: the repeat is a repeat to within a half-thousandth, not exactly`
  );
  console.log('');

  // ----- the tenth-of-a-pixel groups the junction commentary is organised by -----

  const groups = new Map();
  for (const r of rows) {
    const tenth = Math.round(r.inset * 10) / 10;
    if (!groups.has(tenth)) groups.set(tenth, []);
    groups.get(tenth).push(r.size);
  }
  console.log('  the slack groups the junction reading beside drawTunnel is organised by:');
  for (const tenth of [...groups.keys()].sort((a, b) => b - a)) {
    console.log(
      `    ${tenth.toFixed(1)}px: ${groups.get(tenth).map((s) => `font ${s}`).join(', ')}`
    );
  }
  console.log(
    '    the grouping is arithmetic and is rebuilt above; the levels read at each group are not,'
    + ' and are listed at the foot of this output with the instrument that took them'
  );
  console.log('');

  // ----- the pair counts, which 0.8.3-alpha removed a figure over -----

  const cells = rows.map((r) => r.cell);
  const distinct = [...new Set(cells)];
  const shared = new Map();
  for (const r of rows) {
    if (!shared.has(r.cell)) shared.set(r.cell, []);
    shared.get(r.cell).push(r);
  }
  const merged = [...shared.values()].filter((g) => g.length > 1);
  console.log('  the glyph-and-size pair counts, from the comment above glyphInset:');
  console.log(`    cells, largest font first: ${cells.join(', ')}`);
  console.log(
    `    ${WALL_GLYPHS.length} wall glyphs x ${sizes} sizes = ${WALL_GLYPHS.length * sizes} pairs,`
    + ` which is what a reading over the whole range would cover`
  );
  console.log(
    `    ${WALL_GLYPHS.length} wall glyphs x ${distinct.length} distinct cells`
    + ` (${distinct.join(', ')}) = ${WALL_GLYPHS.length * distinct.length} pairs, which is what`
    + ` the removed "24 of 28" figure was counted over`
  );
  console.log(
    `    so ${WALL_GLYPHS.length * sizes - WALL_GLYPHS.length * distinct.length} pairs are merged`
    + ` rather than covered. Ink width follows the advance and not the cell, and two sizes sharing`
    + ` a cell differ by most of a pixel of advance:`
  );
  for (const group of merged) {
    console.log(
      `      a ${group[0].cell}px cell at ${group.map((r) => `font ${r.size}`).join(' and ')}`
      + `, off advances of ${group.map((r) => px(r.advance)).join(' and ')}`
      + ` - ${px(Math.abs(group[0].advance - group[group.length - 1].advance))}px apart`
    );
  }
  console.log('');

  // ----- the overhang, rebuilt from the premise above -----

  const overLow = rows.reduce((a, b) => (b.overhang < a.overhang ? b : a));
  const overHigh = rows.reduce((a, b) => (b.overhang > a.overhang ? b : a));
  const past = rows.filter((r) => r.inkRight >= r.cell);
  console.log('  the overhang past the cell, published as 0.299px to 1.200px:');
  console.log(
    `    ${px(overLow.overhang)}px at font ${overLow.size} to ${px(overHigh.overhang)}px at font`
    + ` ${overHigh.size}, over ${sizes} sizes - the published ends, exactly`
  );
  console.log(
    `    the ink box ends at or past the right edge of the cell at ${past.length} of ${sizes}`
    + ` sizes, which is the "never less than the cell" the comment records`
  );
  console.log(
    `    resting on: ${OVERHANG_PREMISE}. Not a reading. See OVERHANG_PREMISE in this file for`
    + ` what agrees with it and what would settle it.`
  );
  console.log('');

  // ----- which sizes the fitter actually reaches -----

  const found = reachable(engine);
  const missing = rows.map((r) => r.size).filter((size) => !found.has(size));
  console.log('  the sizes fitGrid can settle on, walked rather than assumed:');
  console.log(
    `    ${found.size} of ${sizes} reached over the viewport walk`
    + `${missing.length ? `; not reached: ${missing.join(', ')}` : ''}`
  );
  console.log(
    `    ${[...found.keys()].sort((a, b) => b - a).map((s) => `${s}: ${found.get(s)}`).join(', ')}`
    + '  (font size: viewports)'
  );
  console.log('');

  // ----- what is left, and the decision about it -----

  console.log('  not rebuildable here, and left that way deliberately:');
  for (const [figure, method] of Object.entries(UNREBUILDABLE)) {
    console.log(`    ${figure}`);
    console.log(`      ${method}`);
  }
  console.log('');
  console.log(
    '  the decision, from the `## Measurement` item that asked for this probe: no browser probe'
  );
  console.log(
    '  lives in this repository. Every probe in the rig loads the real engine through the module'
  );
  console.log(
    '  the tests load and runs in node, so a chromium probe would split the rig into probes that'
  );
  console.log(
    '  run anywhere and probes that need a browser downloaded first. What each of the readings'
  );
  console.log(
    '  above bought was a one-off verification of a tuning decision that has since been taken and'
  );
  console.log(
    '  recorded - two of them recorded as limits left in place on purpose - and nothing re-reads'
  );
  console.log(
    '  them. So they are quoted with their method, which is the list above, and left'
  );
  console.log(
    '  unrebuildable. A figure nothing can rebuild and nothing depends on is a note; a figure'
  );
  console.log(
    '  nothing can rebuild that something depends on would be a reason to reopen this.'
  );
  console.log('');
}

/**
 * The figures that need a rasterizer, with the instrument that took each and
 * what it concluded.
 *
 * This is the "quoted with its method" half of the decision, and the reason the
 * list is in the probe rather than only in the comments it came from: a reader
 * running `npm run probe -- glyph-tuning` for the arithmetic gets told in the
 * same breath which numbers are not in it and why.
 */
const UNREBUILDABLE = {
  'the 96 hinted-against-precise comparisons, beside tuneText':
    'a six-glyph run of the four wall glyphs with the ring end and an M, drawn at 16, 8, 7 and 6'
    + ' pixels, left-packed and centred, in both schemes, compared byte for byte under'
    + " textRendering 'auto' and under the page's tuning. No pixel column differed by one level,"
    + ' which is why geometricPrecision is insurance and not what the centring rests on. Needs a'
    + ' canvas and a pixel readback.',

  'the junction levels, above drawTunnel':
    'the darkest column across a wall junction and the spread across it, read per slack group:'
    + ' 41.7 to 68.7 and 82.3 to 23.3 at 0.5px, 55.3 to 72.0 and 68.7 to 36.3 at 0.4px, mirrored'
    + ' at 0.3px, unmoved at 0.1px, and 12.7 to 31.3 the wrong way at 0.2px. The grouping is'
    + ' arithmetic and is printed above; the levels need a rasterizer.',

  'the left bearing at font 13 and font 8, beside glyphInset':
    "three of the four wall glyphs reach a whole pixel left of their origin at every size, read"
    + ' off actualBoundingBoxLeft, and the light shade reaches nothing left of it. At the two'
    + ' sizes whose inset is a tenth of a pixel the bearing is not covered: a run of the full'
    + ' block with an empty cell to its left inks that column at level 39 of 255. Recorded as a'
    + ' limit and left in place, so nothing re-reads it.',

  'the ink widths of the four wall glyphs, above glyphInset':
    'published as "24 of 28 glyph-and-size pairs ink wider than their cell and four ink exactly'
    + ' it" and removed in 0.8.3-alpha, because 28 counts the four glyphs against seven distinct'
    + ' cells while the walls are drawn at eleven sizes. The pair arithmetic is printed above;'
    + ' re-taking the widths over all eleven needs a rasterizer. The overlap conclusion it was'
    + ' quoted under does not depend on it - that rests on the overhang, read at every size.',

  'the pad release reading, from 0.8.1-alpha':
    'ArrowLeft surviving a resting gamepad, measured against a patched copy of index.html rather'
    + ' than against the page. Nothing in the repository reproduces the patch, so the reading'
    + ' stands on its own description. Not a glyph figure, and listed here because it is the'
    + ' other number in this repository with the same problem.',
};
