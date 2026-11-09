// test/probes/overlay-anchor.mjs — How many viewports the touch overlay is
// placed wrongly on, before and after bounding it by the playable band, and how
// many shear the label inside a control, before and after sizing it the same
// way.
//
// The browser build's three controls are laid out in CSS while the grid under
// them is laid out by fitGrid, so neither file alone can say whether the two
// agree. test/browser-shell.test.mjs pins the agreement at a list of device
// shapes; this walks the whole space instead, which is what a claim about
// *every* viewport needs and what a list of shapes can never support.
//
// The fault it measures: what a control costs is driven by how wide the
// viewport is, and the room for it by how tall the viewport is, in character
// rows that no viewport unit can measure. On anything short and wide the two
// came apart, and a control ended up on the HUD's rows - over SCORE, DIST and
// the shield bar - or on the footer's.
//
// The second fault, measured over the same space: bounding the box by the band
// is what gave the label something to overflow. The label was the 13px the
// #touch rule sets, inherited as a constant, and --ctl subtracts 2vw - so a
// window of a given height gives a *smaller* control the wider it gets, and
// past about 1620px at 160px tall the box was narrower than the word standing
// in it. `overflow:hidden` then sheared the glyphs rather than a stray edge.
//
// A viewport counts only when fitGrid reports `fits: true`. Below that the
// game draws the too-small notice and there is no overlay to place.
//
//   npm run probe -- overlay-anchor
//
// Browser only, and it takes no flags: it walks its own viewports and loads the
// browser engine alone, so run() ignores the rig's arguments entirely. A
// terminal has no overlay, so test/parity.test.mjs has nothing to pair this
// with. The rig refuses --grid and --build for this probe rather than accepting
// and discarding them, because a figure quoted from a flag nothing read is a
// figure from a walk that never happened.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, loadBrowserEngine, EM_ADVANCE } from '../helpers.mjs';
import { pageStyle } from '../page-style.mjs';

/**
 * Viewports walked. Every integer width and height over the range a phone or a
 * small window actually occupies, then a coarser step out to 4K - 7px, which
 * shares no factor with any cell the fitter produces, so the sampling cannot
 * land on a lattice that steps over a failure.
 */
function axis(tightFrom, tightTo, coarseTo, step = 7) {
  const out = [];
  for (let v = tightFrom; v <= tightTo; v++) out.push(v);
  for (let v = tightTo + 1; v <= coarseTo; v += step) out.push(v);
  return out;
}

/**
 * The page's own --stick and --ctl, resolved out of index.html through the same
 * module test/browser-shell.test.mjs resolves them through.
 *
 * Restating them here is what this probe used to do, and it is the one thing it
 * must not: change --ctl in the stylesheet and a restated copy goes on reporting
 * a figure about a rule the page no longer has, while the CHANGELOG quotes that
 * figure as a fact about the page.
 */
const page = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
const style = pageStyle(page);

/**
 * The rules as they stand, and as they stood before the band bounded them.
 *
 * The historical pair is written out because it has to be - those two lengths
 * are gone from the stylesheet and this file is the only remaining record of
 * them. The current pair is read, which is the difference the two comments are
 * here to keep visible.
 */
const RULES = {
  'before the band': { stick: 'min(34vw,170px)', ctl: 'min(24vw,118px)' },
  'bounded by the band': {
    stick: style.properties['--stick'],
    ctl: style.properties['--ctl'],
  },
};

/**
 * The second reading, and the one a list of shapes cannot support either: how
 * much room the label has inside the control it stands in, over the same space.
 *
 * Where the control lands is not the whole of whether it is right. The box is
 * solved out of the band while the label was a constant 13px, and --ctl
 * subtracts 2vw, so a window of a given height gives a *smaller* control the
 * wider it gets - and past about 1620px at 160px tall the control was narrower
 * than its own label, which `overflow:hidden` then sheared. 0.15.5 solves the
 * size out of --ctl as well, and what that needs measuring over is the whole
 * viewport space rather than a band somebody noticed: the tightest viewport
 * there is, and whether any viewport is tighter than tight.
 *
 * Read off the page like everything else here. The two labels come out of the
 * markup and the font size and border out of the stylesheet, so a label
 * renamed longer than BOOST reports as the smaller slack it is rather than
 * going unnoticed behind a figure this file remembers. The advance is Courier
 * New's own em, which is the one reading test/helpers.mjs says is safe to
 * restate because it is a property of the font file rather than of a browser.
 */
const LABELS = Object.fromEntries(['fire', 'boost'].map((id) => {
  const found = page.match(new RegExp(`<div id="${id}">([^<]*)</div>`));
  if (!found) throw new Error(`#${id} carries no label in the markup`);
  const d = style.declarationsFor(`#${id}`);
  return [id, { text: found[1], border: d.border.split(/\s+/)[0], font: d['font-size'] }];
}));

export async function run() {
  const b = loadBrowserEngine();
  // What Courier New draws, near enough - the same cell test/browser-shell
  // models, so the two answer with one arithmetic.
  const cell = (size) => ({ w: Math.max(1, Math.ceil(size * 0.6)), h: size + b.CELL_LEADING });

  const widths = axis(200, 700, 3840);
  const heights = axis(150, 700, 2160);

  console.log(
    `browser overlay: ${widths.length} widths x ${heights.length} heights, ` +
    `every viewport fitGrid reports fits:true for`
  );
  console.log(
    `  a control is misplaced when it covers any of rows 0-${b.HUD_ROWS - 1} (the HUD) ` +
    `or the last ${b.FOOTER_ROWS} (the footer), or leaves the viewport`
  );

  for (const [name, lengths] of Object.entries(RULES)) {
    let playable = 0;
    let failing = 0;
    const perControl = new Map();
    let smallest = Infinity;

    for (const w of widths) {
      for (const h of heights) {
        const grid = b.fitGrid(w, h, cell);
        if (!grid.fits) continue;
        playable++;

        // The viewport the lengths resolve against, carrying the two properties
        // the page publishes at runtime. Read back by name off the page's own
        // map, so a probe cannot disagree with the page about which is which.
        const vp = { w, h, vars: b.overlayVars(grid, h) };
        const stick = style.lengthPx(lengths.stick, vp, `${name} --stick`);
        const ctl = style.lengthPx(lengths.ctl, vp, `${name} --ctl`);
        smallest = Math.min(smallest, stick, ctl);

        // The bottom offsets the rules declare, in the order they stack.
        const base = b.footerBandPx(grid, h) + h / 100;
        const boxes = {
          stick: [base, stick],
          fire: [base, ctl],
          boost: [base + ctl + 2 * w / 100, ctl],
        };

        const lastPlayable = grid.rows - 1 - b.FOOTER_ROWS;
        let bad = false;
        for (const [id, [bottom, size]] of Object.entries(boxes)) {
          const top = h - bottom - size;
          const foot = h - bottom;
          const first = Math.min(grid.rows - 1, Math.max(0, Math.floor(top / grid.cellH)));
          const last = Math.min(grid.rows - 1, Math.max(0, Math.floor((foot - 1) / grid.cellH)));
          if (first < b.HUD_ROWS || last > lastPlayable || top < 0 || foot > h || size <= 0) {
            bad = true;
            perControl.set(id, (perControl.get(id) || 0) + 1);
          }
        }
        if (bad) failing++;
      }
    }

    const by = [...perControl].map(([id, n]) => `${id} ${n}`).join(', ') || 'none';
    console.log(
      `  ${name.padEnd(20)}: ${failing} of ${playable} viewports misplace a control ` +
      `(${by}); smallest control drawn ${smallest.toFixed(1)}px`
    );
  }

  // ----- What fits inside the control, over the same space -----
  //
  // Two sizings of the label against one box, which is the band-bounded --ctl
  // either way: the 13px the #touch rule sets, inherited as a constant, and the
  // size 0.15.5 solves out of --ctl. The historical `before the band` --ctl is
  // deliberately not walked here - it is min(24vw,118px), which is 48px at the
  // narrowest viewport this walks, so the label always fitted and there was
  // nothing for a clip to shear. The shearing arrived *with* the box being
  // bounded by the band, which is why it is measured against that box alone.
  const border = style.lengthPx(LABELS.fire.border, { w: 0, h: 0 }, 'the control border');
  const SIZINGS = {
    'label fixed at 13px': null,
    'label solved out of --ctl': LABELS.fire.font,
  };

  console.log(
    `  a label is sheared when it is painted wider than --ctl less the ` +
    `${border}px border each side`
  );

  for (const [name, declared] of Object.entries(SIZINGS)) {
    let playable = 0;
    let sheared = 0;
    let tightest = { slack: Infinity };
    let smallestFont = Infinity;

    for (const w of widths) {
      for (const h of heights) {
        const grid = b.fitGrid(w, h, cell);
        if (!grid.fits) continue;
        playable++;

        const vp = { w, h, vars: b.overlayVars(grid, h) };
        const content = style.lengthPx(style.properties['--ctl'], vp, '--ctl') - 2 * border;
        // The fixed sizing is the inherited constant, so there is nothing to
        // resolve for it and the one declaration is read for the other.
        const font = declared === null
          ? 13
          : style.lengthPx(declared, vp, 'the label size');
        smallestFont = Math.min(smallestFont, font);

        for (const { text } of Object.values(LABELS)) {
          const label = text.length * font * EM_ADVANCE;
          const slack = content - label;
          if (slack < tightest.slack) tightest = { slack, w, h, text, label, content, font };
          if (slack < 0) sheared++;
        }
      }
    }

    const where = `${tightest.w}x${tightest.h}`;
    console.log(
      `  ${name.padEnd(26)}: ${sheared} of ${playable * 2} labels sheared; ` +
      `tightest ${where} ${tightest.text} at ${tightest.label.toFixed(2)}px ` +
      `in ${tightest.content.toFixed(2)}px (${tightest.slack >= 0 ? '' : '-'}` +
      `${Math.abs(tightest.slack).toFixed(2)}px of slack), smallest label ` +
      `${smallestFont.toFixed(1)}px`
    );
  }

  // ----- What the floor takes away, over the same space -----
  //
  // The third reading, and the half solving the label out of --ctl left open:
  // the rule is correct all the way down to a smudge. --ctl goes on solving
  // smaller than any size a word can be read at, so the page unletters a
  // control below LABEL_FLOOR_PX - and the figures that justify where that
  // floor is, rather than one step either side of it, are a count over the
  // whole viewport space rather than a reading at a shape somebody noticed.
  //
  // Both the floor and the label's size are read off the page: the figure out
  // of the constant above the DOM marker, and the size out of the declaration
  // it governs, so a change to either reports as the count it moves.
  const FLOORS = [b.LABEL_FLOOR_PX - 1, b.LABEL_FLOOR_PX, b.LABEL_FLOOR_PX + 1, b.LABEL_FLOOR_PX + 2];
  const counts = new Map(FLOORS.map((px) => [px, 0]));
  const band = new Map(FLOORS.map((px) => [px, { w: [Infinity, -1], h: [Infinity, -1] }]));
  let fitted = 0;
  let lettered = Infinity;

  for (const w of widths) {
    for (const h of heights) {
      const grid = b.fitGrid(w, h, cell);
      if (!grid.fits) continue;
      fitted++;

      const vp = { w, h, vars: b.overlayVars(grid, h) };
      const font = style.lengthPx(LABELS.fire.font, vp, 'the label size');
      if (b.lettersFit(font)) lettered = Math.min(lettered, font);
      for (const px of FLOORS) {
        if (font >= px) continue;
        counts.set(px, counts.get(px) + 1);
        const reach = band.get(px);
        reach.w = [Math.min(reach.w[0], w), Math.max(reach.w[1], w)];
        reach.h = [Math.min(reach.h[0], h), Math.max(reach.h[1], h)];
      }
    }
  }

  console.log(
    `  a label is unlettered when it solves below the floor; the page's own is ` +
    `${b.LABEL_FLOOR_PX}px, and the smallest it letters is ${lettered.toFixed(2)}px`
  );
  for (const px of FLOORS) {
    const n = counts.get(px);
    const reach = band.get(px);
    const where = n
      ? `${reach.w[0]}-${reach.w[1]}px wide by ${reach.h[0]}-${reach.h[1]}px tall`
      : 'nowhere';
    console.log(
      `  floor ${String(px).padStart(2)}px${px === b.LABEL_FLOOR_PX ? ' (the page)' : '           '}` +
      `: ${String(n).padStart(5)} of ${fitted} viewports unlettered ` +
      `(${(100 * n / fitted).toFixed(2)}%), ${where}`
    );
  }
  console.log('');
}
