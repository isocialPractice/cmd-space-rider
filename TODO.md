# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
  - From: Bigger Features

### Create and Deploy GitHub Pages Override

### Code Review Override - the section cadence figure and the drawn span premise

- [ ] The warp banner's comment sits on the asteroid banner's code
  - **Issue**: `drawHUD` in `src/render.ts:508` opens the rewritten
    "Warp banner." paragraph, and the next thing under it is the
    "Asteroid field banner." paragraph at line 516 and then the
    `if (state.asteroidTime > 0 ...)` block at 526. The `if (state.warpFlash
    > 0 ...)` block the first paragraph describes is at 533 with nothing
    above it, so the terminal build reads as though the warp banner's
    precedence note were about the asteroid code. `index.html:2568` has the
    two in the other order - asteroid paragraph, asteroid block, warp
    paragraph, warp block - which is the order this repository's comments are
    written in everywhere else and the order the paragraphs themselves
    describe. The two builds' comments diverged in the one edit that touched
    both.
  - **Goal**: Move the "Warp banner." paragraph down to sit directly above
    `if (state.warpFlash > 0 ...)`, leaving the asteroid paragraph on the
    asteroid block, so `src/render.ts` reads as `index.html` does. No code
    moves and no test changes.
- [ ] Nothing pins the new probe's exclusion from the harness run
  - **Issue**: `callsHarness` in `test/probes.test.mjs:79` decides which
    probes `probes: every probe that calls the harness is run against it`
    executes, by reading each probe's source for an import of
    `test/engagement.mjs`. Its docstring says "`overlay-anchor` is the one
    this excludes", and the test closes at line 203 by asserting only
    `!reached.includes('overlay-anchor')`. `test/probes/glyph-tuning.mjs`
    imports `loadBrowserEngine` from `../helpers.mjs` and nothing from the
    engagement, so it is now a second exclusion that the comment denies
    exists and no assertion records. `docs/development.html` already states
    the pair - "`overlay-anchor` and `glyph-tuning` are left out" - so the
    published docs and the test that enforces it disagree. Nothing fails
    today; what is missing is the check that would fail if `glyph-tuning`
    later picked up an engagement import and started buying a full font-size
    walk on every suite run.
  - **Goal**: Say "the two this excludes" in the docstring and name both with
    the reason each is excluded, and extend the closing assertion to cover
    `glyph-tuning` alongside `overlay-anchor` - or assert over a named list
    of the exclusions so a third one has to be declared rather than silently
    inferred.

#### Found Issues

- [ ] The section cadence comment quotes a fifth where it is a half
  - **Issue**: `ASTEROID_INTERVAL`'s comment at `src/types.ts:315` says that
    reading the cadence off `gameTime` would put openings on multiples of
    150, "and 150 and 60 share 30, so a fifth of the sections would open on
    the frame a warp transition did". `CHANGELOG.md:26` publishes the same
    claim as "a fifth of all sections". It is a half, not a fifth, and the
    fifth belongs to the other side of the pairing. Coincidences fall on
    multiples of `lcm(150, 60) = 300` - 300, 600, 900 - so of the openings at
    150, 300, 450, 600 every second one lands on a warp: 10 of 20 sections
    over the first 3000 seconds, and 10 of 50 warps. A fifth of the *warps*
    coincide; half the *sections* do. Checkable with no browser and no
    engine: count multiples of 150 up to any bound and ask how many divide by
    60. The design decision the figure is offered for is unaffected and in
    fact strengthened - a half is a worse collision rate than a fifth - so
    only the number and its noun are wrong.
  - **Goal**: Correct both places to the measured pairing: half the sections
    would open on a warp frame, which is a fifth of the warps. `index.html:686`
    stops at "150 and 60 share 30" and states no fraction, so the browser
    build needs no edit - which also makes it the wording to settle on if one
    of the three is to be the canonical sentence.
  - From: Code Review Override - the section cadence figure and the drawn span premise
- [ ] Three new comments rest on a span premise the geometry does not support
  - **Issue**: `SHIP_MARGIN`'s comment at `src/types.ts:157`, `placeObstacle`'s
    at `src/game.ts:494` and the `the run's own field stays in the corridor`
    case at `test/asteroid-field.test.mjs:324` each identify the run's own
    world-space band with a claim about the drawn span, quoting `drawBullets`
    as saying "every target sits inside the drawn span at every depth" and "a
    shot that has left the corridor is in a column no target can occupy". The
    section is then presented as the exception to it. The premise is false for
    the run's own field, so the exception is not where the three say it is.
    `drawEntitiesFar` projects an obstacle's column off the depth scale while
    `tunnelSpan` narrows by row, and an obstacle high or low in the band at a
    far depth lands outside its own row's span. Walked as a lattice over the
    band with no RNG - x in -4.5..4.5 and y in 0.5..4.5 by tenths, z by whole
    units to -200, on an 80x24 grid - 49702 of the 729638 points that draw
    into the play area have their column outside `tunnelSpan`, which is 6.8%,
    and the furthest are 3 columns out. The first in that walk is the corner
    of the spawn band itself: an obstacle at x -4.5, y 0.5, z -151 draws as a
    single cell at column 32 of row 6, where `tunnelSpan(6, 3, 22, 80)` is
    `{left: 32, right: 48}`, so `tracerLit(32, 6, 3, 22, 80)` is false. The
    block is drawn - `drawEntitiesFar` runs after `drawTunnel`, so it paints
    over the left margin - and the pulse cannon registers nothing against it,
    because `tracerDrawn` falls through to `tracerLit` with the tunnel up. A
    rock the player can see and aim at cannot be shot. The behaviour is
    pre-existing and deliberate in its mechanism; what this release added is
    three fresh restatements of a premise that was already wrong, and a test
    name that reads as though it pinned the drawn span when what it asserts is
    the world-space band.
  - **Goal**: Two separable pieces, and the comment half is the one this
    override is for. Say in all three places what the band actually is - the
    world-space span obstacles are placed in - and drop the claim that it puts
    every target inside the drawn span, since the three inherited it from
    `drawBullets` rather than measuring it. `drawBullets`' own paragraph in
    `src/render.ts` and `index.html` is where the claim originates and wants
    the same correction, with the 6.8% and the lattice above recorded as the
    method. Whether the clip should admit a target drawn outside the span is a
    gameplay change with the pulse cannon hit rates riding on it, and is not
    part of this: queue it separately if it is wanted, with the hit-rate bands
    re-measured.
  - From: Code Review Override - the section cadence figure and the drawn span premise

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

## Medium Effort

Features that add a new system to the engine: audio, new entity types, or a
second input path. Each one spans both the terminal and browser versions.

## Bigger Features

Substantial additions that change how a run plays or how the screen is laid
out. These carry the most risk to existing gameplay and are sequenced last.

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

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 140 earlier items in `TODO-archive.md`, newest last.

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
- [x] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.
  - From: Bigger Features
- [x] **A probe for the glyph tuning's own figures** - the glyph tuning quotes
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
