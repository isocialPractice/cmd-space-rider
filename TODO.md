# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.
  - From: Bigger Features
- [ ] **A probe for the glyph tuning's own figures** - the glyph tuning quotes
  six sets of numbers that only a scratch script can rebuild: the 96
  hinted-against-precise comparisons behind "the fractional position is
  honoured either way", the per-size table behind the inset's 0.099px to
  0.500px range and the `1229/2048` em advance it follows from, the junction
  levels behind "lifts the seam most where the slack is widest", the left
  bearing recorded beside `glyphInset` as a known limit at font 13 and font 8,
  the overhang past the cell that 0.8.4-alpha put in that same comment -
  `actualBoundingBoxRight` is a whole number never less than the cell at any
  size, and 0.299px to 1.200px past it once the inset is counted - and the ink
  widths of the four wall glyphs against their cells. That last one was
  published as "24 of 28 glyph-and-size pairs ink wider than their cell and
  four ink exactly it" and 0.8.3-alpha removed it: the walls are drawn from
  four glyphs at eleven sizes, which is 44 pairs, and 28 is those glyphs
  against the seven distinct cell widths the sizes produce. Ink width follows
  the advance rather than the cell, so the sixteen merged pairs are unmeasured
  rather than covered - fonts 8 and 7 share a 5px cell off advances of 4.801px
  and 4.201px. Re-taking it over all eleven sizes is the browser-only half of
  this item; the overlap conclusion it was quoted under does not depend on it,
  resting on the overhang past the cell, which was read at every size. The
  first set is from 0.8.1-alpha, four are from 0.8.2-alpha, which corrected the
  figures the first version of this item quoted, and the overhang is from
  0.8.4-alpha; every one of them was read in chromium and none is reproducible
  from the repository. The arithmetic half needs no browser and belongs beside
  the other probes; the rasterizer half needs chromium, which the project has
  so far declined, so this wants a decision on whether a browser probe lives
  here at all or whether the figure is quoted with its method and left
  unrebuildable. The pad release reading from 0.8.1-alpha has the same problem
  - `ArrowLeft` surviving a resting pad was measured against a patched copy of
  `index.html`, and nothing in the repository reproduces it.
  - From: Measurement

### Create and Deploy GitHub Pages Override

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

## Medium Effort

Features that add a new system to the engine: audio, new entity types, or a
second input path. Each one spans both the terminal and browser versions.

## Bigger Features

Substantial additions that change how a run plays or how the screen is laid
out. These carry the most risk to existing gameplay and are sequenced last.

- [ ] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.
- [ ] **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.

## Polish

Presentation and platform refinements that do not change gameplay: rendering
quality, browser integration, accessibility, and performance headroom.

- [ ] **Decide whether Pages should deploy from Actions instead of the branch** -
  `gh api repos/isocialPractice/cmd-space-rider/pages` reports
  `build_type: legacy` with `source: {branch: main, path: /}`, so the site is
  GitHub's own branch build and any workflow added to `.github/workflows/` would
  be ignored rather than run. Nothing is broken: the game serves from the root
  and `docs/` serves beside it. The cost is that what gets published is whatever
  is on the branch, with no build step available to it. Flipping the source on a
  working site can take it down, so this wants a decision rather than a run:
  leave it as it is, or set `build_type=workflow` and add a workflow that
  uploads the root as the artifact. **Do not flip this unattended.**

## Measurement

Probes that produce the figures quoted in comments, tests, TODO items and the
CHANGELOG. Each prints its method beside its numbers - grid, placement walk,
ship heights, range band, frame rate - so a figure can be rebuilt from the
repository alone instead of from scratch files in `.tmp`. Probes report; the
assertions stay in `test/`.

- [ ] **A probe for the glyph tuning's own figures** - the glyph tuning quotes
  six sets of numbers that only a scratch script can rebuild: the 96
  hinted-against-precise comparisons behind "the fractional position is
  honoured either way", the per-size table behind the inset's 0.099px to
  0.500px range and the `1229/2048` em advance it follows from, the junction
  levels behind "lifts the seam most where the slack is widest", the left
  bearing recorded beside `glyphInset` as a known limit at font 13 and font 8,
  the overhang past the cell that 0.8.4-alpha put in that same comment -
  `actualBoundingBoxRight` is a whole number never less than the cell at any
  size, and 0.299px to 1.200px past it once the inset is counted - and the ink
  widths of the four wall glyphs against their cells. That last one was
  published as "24 of 28 glyph-and-size pairs ink wider than their cell and
  four ink exactly it" and 0.8.3-alpha removed it: the walls are drawn from
  four glyphs at eleven sizes, which is 44 pairs, and 28 is those glyphs
  against the seven distinct cell widths the sizes produce. Ink width follows
  the advance rather than the cell, so the sixteen merged pairs are unmeasured
  rather than covered - fonts 8 and 7 share a 5px cell off advances of 4.801px
  and 4.201px. Re-taking it over all eleven sizes is the browser-only half of
  this item; the overlap conclusion it was quoted under does not depend on it,
  resting on the overhang past the cell, which was read at every size. The
  first set is from 0.8.1-alpha, four are from 0.8.2-alpha, which corrected the
  figures the first version of this item quoted, and the overhang is from
  0.8.4-alpha; every one of them was read in chromium and none is reproducible
  from the repository. The arithmetic half needs no browser and belongs beside
  the other probes; the rasterizer half needs chromium, which the project has
  so far declined, so this wants a decision on whether a browser probe lives
  here at all or whether the figure is quoted with its method and left
  unrebuildable. The pad release reading from 0.8.1-alpha has the same problem
  - `ArrowLeft` surviving a resting pad was measured against a patched copy of
  `index.html`, and nothing in the repository reproduces it.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 138 earlier items in `TODO-archive.md`, newest last.

- [x] The site's provenance walk reads one `:root` block per scheme
  - **Issue**: `rootBlock` in `test/docs-site.test.mjs` resolves a scheme with
    `style.rules.find(...)`, taking the first `:root` whose at-rule preludes
    match, and
    `docs: every site colour says whether it is the game's or the site's own`
    then asserts that the hex-valued custom properties of that one block are
    exactly the keys of `PROVENANCE`. More than one `:root` is not
    hypothetical: the sheet already carries a third at
    `docs/assets/style.css:326`, inside a width media query. Appending
    `:root { --accent: #ff0000; }` to `docs/assets/style.css` leaves both new
    tests green - the dark branch matches on `!rule.at.length` and `find` has
    already returned the block at line 9, so the added colour reaches neither
    the table nor the completeness check. The in-code comment is accurate at
    "Nothing in the block escapes the table"; the `### Added` entry in
    `CHANGELOG.md` states it as "Nothing in either block escapes the table, so a
    colour added to the stylesheet cannot carry an unrecorded provenance", which
    is the broader claim a reader would rely on and the one that does not hold.
  - **Goal**: Collect every `:root` a scheme resolves rather than the first -
    `filter` in place of `find`, merging the declarations - and assert the union
    of their hex-valued properties against `PROVENANCE`, which also covers a
    light block split in two. The width media query's `:root` carries a layout
    token today and would need either a provenance entry or an explicit
    exclusion naming why a block with no colour in it is skipped. Keep the
    present assertions of both new tests green, and if the narrower scope is
    deliberate, bring the CHANGELOG sentence back to what the code checks.
  - From: UI/UX Override - the glyph half of the tunnel ramp
- [x] Two places say nothing fed a short fragment after a stall, and one did
  - **Issue**: The new case in `test/performance-mode.test.mjs` opens "nothing
    in this file fed a short fragment after a stall - the one case the test
    above tries is 0.7s, which the band discards", and the `### Fixed` entry in
    `CHANGELOG.md` repeats it as "nothing in the suite fed a short fragment
    after a stall before, which is why the hole was invisible". The test above
    feeds one. Its band-edge case runs `trackFrameRate(window)` and then
    `trackFrameRate(floor * 0.999)`, which is 649.35ms after a single stall, and
    asserts `frameSeen === 1` - a short fragment after a stall, fed and pinned
    as counted. What was missing is the step after the sample rather than the
    sample: nothing closed a window on a counted fragment, so nothing said what
    one costs the ladder, which is the figure the 283ms boundary turns on.
  - **Goal**: Say in both places what was actually uncovered - that a short
    fragment after a stall was already fed and pinned as counted at the band
    edge, and that no case carried one into a closed window, so the tier it
    costs went unmeasured. The two new cases are the right ones and want no
    change.
  - From: UI/UX Override - the glyph half of the tunnel ramp
- [x] **Band Coverage Figures**: Nothing pins which shade glyph each depth band of the tunnel is drawn in
  - **Issue**: `drawTunnel` picks a glyph and a colour together, four bands
    deep - `░` at the far wall, then `▒`, `▓` and `█` at the mouth - and only
    the colour half is pinned. `the walls are drawn from the four glyphs every
    wall figure counts`, at `test/warp.test.mjs:285`, compares the distinct
    glyphs standing on the wall columns `.sort()`ed against a `.sort()`ed
    `WALL_RAMP` and then counts each as present. Nothing says which glyph
    belongs to which band, so exchanging the first and fourth rows of that
    table - `█` at the far wall and `░` at the mouth - leaves the distinct set
    unchanged, every count non-zero, every wall colour still shifting on a
    warp, and `the light warp ramp climbs the way dark's does` still passing,
    because that test walks inks. The whole suite passes with the tunnel inside
    out. What this release's verification measured is why that matters: read
    off the canvas a cell at a time under an emulated light scheme, with a warp
    held open, the four bands cover 14%, 29%, 75% and 86% of their cells, so
    the inks span 507 to 676 of channel distance from the paper - a factor of
    1.33 - while the cells as painted span 71 to 581, a factor of 8.2. Coverage
    carries the ramp and the ink trims it, and it is the coverage that is
    unordered. Dark mode measures 14%, 30%, 77% and 86%, so the figure is
    the glyph and the font rather than the scheme. (This item first wrote the
    dark reading as five figures against a four-band ramp; `Band Coverage
    Figures 1` corrected it here and in `CHANGELOG.md` to the four that pair
    with light's four, dropping an unrecoverable 88%.)
  - **Goal**: Resolve to [tunnel-ramp-glyph-order.prompt.md](.claude/prompts/tunnel-ramp-glyph-order.prompt.md)
  - From: UI/UX Override - the glyph half of the tunnel ramp
- [x] An assertion in the new band map cannot fail
  - **Issue**: `assert.equal(byBand.size, WALL_RAMP.length, ...)` at the foot of
    `each depth band of the tunnel is drawn in its own shade glyph` in
    `test/warp.test.mjs` is unreachable. `bandOf` returns only 0 through 3, so
    `byBand` can never hold a fifth key, and the `WALL_RAMP.forEach` directly
    above it already asserts that each of those four comes back as exactly one
    glyph - which is what fails, first, for a band that was not reached, since an
    absent band compares `[]` against `[glyph]`. No render makes `byBand.size`
    anything but 4 by the time the equality is evaluated, so its message - "so a
    band the figures count was not reached at 80x24" - names a state the
    assertion above it has already rejected. Verified by reasoning rather than by
    a failing input, which is the point: there is no input.
  - **Goal**: Drop it, or give the thing it was written for somewhere it can
    fail. The question it asks - whether all four bands are reached at 80x24 - is
    the `forEach`'s job now, and if it is wanted separately from the glyph check
    it has to be read before the per-band assertions rather than after them.
  - From: Code Review Override - the band coverage figures and an assertion that cannot fail
- [x] Band Coverage Figures 1
  - **Issue**: The dark half of the coverage measurement is published as five
    figures for a four-band ramp. The `### Added` entry for 1.0.0-alpha.0.9.4 in
    `CHANGELOG.md` gives light as "the four bands cover 14%, 29%, 75% and 86% of
    their cells" and then dark as "Dark mode measures 14%, 30%, 77%, 86% and
    88%", and `drawTunnel` has four bands drawn in four glyphs, so the fifth dark
    figure belongs to nothing either sentence names. The conclusion it is offered
    for - "so the figure is the glyph and the font rather than the scheme" - is a
    comparison between two lists of different lengths, and a reader cannot tell
    which dark figure pairs with light's 29% or what the extra one measured. The
    same five sit in the completed item's own `**Issue**`, where they came from,
    and `test/warp.test.mjs` quotes only the four. The entry says the percentages
    are a property of one browser's font and that nothing in the repository can
    rebuild them, which is why the fifth cannot simply be recomputed and
    corrected.
  - **Goal**: Say what the fifth dark figure is, in the CHANGELOG entry and in
    the item text that carries it, or take it out. If it is the ring-end glyph or
    a fifth wall colour rather than a depth band, name it as that and say why
    dark was read over one more sample than light; if dark was measured at five
    rows rather than four bands, say that instead. Re-measuring needs chromium,
    which this project has so far declined, so the alternative is to publish the
    four that line up with the four bands, record that dark was read the same way
    and reached the same conclusion, and leave the fifth out rather than leave it
    unexplained.
  - From: UI/UX Override - the glyph half of the tunnel ramp
