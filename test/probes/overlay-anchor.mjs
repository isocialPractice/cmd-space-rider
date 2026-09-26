// test/probes/overlay-anchor.mjs — How many viewports the touch overlay is
// placed wrongly on, before and after bounding it by the playable band.
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
// A viewport counts only when fitGrid reports `fits: true`. Below that the
// game draws the too-small notice and there is no overlay to place.
//
//   npm run probe -- overlay-anchor
//
// Browser only. A terminal has no overlay, so test/parity.test.mjs has nothing
// to pair this with and the --grid and --build flags do not apply.

import { loadBrowserEngine } from '../helpers.mjs';

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

/** The rules as they stand, and as they stood before the band bounded them. */
const RULES = {
  'before the band': (w, h, play) => ({
    stick: Math.min(34 * w / 100, 170),
    ctl: Math.min(24 * w / 100, 118),
  }),
  'bounded by the band': (w, h, play) => ({
    stick: Math.min(34 * w / 100, 170, play - h / 100 - 8),
    ctl: Math.min(24 * w / 100, 118, (play - h / 100 - 2 * w / 100 - 8) / 2),
  }),
};

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

  for (const [name, sizes] of Object.entries(RULES)) {
    let playable = 0;
    let failing = 0;
    const perControl = new Map();
    let smallest = Infinity;

    for (const w of widths) {
      for (const h of heights) {
        const grid = b.fitGrid(w, h, cell);
        if (!grid.fits) continue;
        playable++;

        const play = b.playBandPx(grid);
        const { stick, ctl } = sizes(w, h, play);
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
  console.log('');
}
