# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
  - From: Bigger Features

### Create and Deploy GitHub Pages Override

### Code Review Override - the unpinned docs pair and a percentage of the wrong population

#### Resolve Issues

- [ ] Harness Exclusions 1
  - **Issue**: `HARNESS_EXCLUSIONS`' docstring at `test/probes.test.mjs:76` closes
    by saying "`docs/development.html` states the same pair, and the assertion at
    the foot of the harness test is what keeps the three of them from drifting
    apart". The assertion keeps two of the three. It compares the probes
    `callsHarness` actually left out against `HARNESS_EXCLUSIONS` and reads
    nothing outside `test/`; nothing in the suite reads `docs/development.html`,
    and `test/docs-site.test.mjs` names neither probe. Verified by editing the
    published pair to "`overlay-anchor` and `frame-rate`" and running
    `npm test`: 684 pass, 0 fail, which is exactly the drift the docstring says
    cannot happen. The direction the item did buy works - undeclaring
    `glyph-tuning` fails with both lists named in the message - so what is
    missing is only the third party the sentence claims.
  - **Goal**: Either pin the third or stop claiming it. Pinning is the better of
    the two, since the docs sentence is what exposed the undeclared exclusion in
    the first place: read the pair out of `docs/development.html` in the harness
    test and `deepEqual` it against `HARNESS_EXCLUSIONS` beside the walked set,
    so a doc naming a different pair fails. Otherwise narrow the docstring to the
    two it does pin and say the published copy is unenforced.
  - From: Code Review Override - the section cadence figure and the drawn span premise
- [ ] Drawn Span Premise 1
  - **Issue**: Two pieces of prose the correction left behind, each saying
    something the lattice does not. First, the renamed case `the run's own field
    stays in the band it is placed in` still fails with the word the rename
    removed: `test/asteroid-field.test.mjs:337` and `:340` print "an obstacle at
    x ... left the corridor" and "an obstacle at y ... left the corridor" for a
    break of `OWN_X`, `OWN_Y_LOW` or `OWN_Y_HIGH`, which are the world-space
    placement band. The name and the comment above it were moved off "corridor"
    precisely because it read as the drawn span, so the one sentence a failure
    actually prints is now the only place in the case that still conflates the
    two. Second, `6.8%` is attached to the wrong population in every summary of
    it: `src/game.ts:498` and `src/types.ts:160` say "6.8% of the band's
    points", `src/types.ts:208` and `index.html:639` say "6.8% of the run's own
    band", `index.html:1376` says "6.8% of its points" and
    `test/asteroid-field.test.mjs:327` says "6.8% of this band". The figure is
    49702 of 729638 and 729638 is the subset of the walk that draws into the
    play area, not the band. The band walked as stated - x in -4.5..4.5 and y in
    0.5..4.5 by tenths, z by whole units to -200 - is 91 x 41 x 201 = 749931
    points, so 6.8% of the band is 6.63%, and a reader rebuilding the figure off
    any of the six summaries gets a number that does not match the one
    `drawBullets` publishes. `drawBullets` in both builds, and the archived item
    itself, state the denominator correctly.
  - **Goal**: Name the band in the two assertion messages - "left the placement
    band", or the `x` or `y` bound each one broke - so a failure says what
    broke. Then give the six summaries the denominator `drawBullets` already
    carries, "of the band's points that draw into the play area", or drop the
    percentage from the summaries and leave it where the method is recorded. The
    `index.html:639` copy is the terminal wording mirrored into the browser build
    by the review that queued this, so the two move together.
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

> 144 earlier items in `TODO-archive.md`, newest last.

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
- [x] The warp banner's comment sits on the asteroid banner's code
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
  - From: Code Review Override - the section cadence figure and the drawn span premise
- [x] **Harness Exclusions**: Nothing pins the new probe's exclusion from the harness run
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
  - From: Code Review Override - the section cadence figure and the drawn span premise
- [x] The section cadence comment quotes a fifth where it is a half
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
- [x] **Drawn Span Premise**: Three new comments rest on a span premise the geometry does not support
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
