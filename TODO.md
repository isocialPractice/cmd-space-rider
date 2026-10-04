# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.
  - From: Polish
- [ ] **Leaderboard with name entry** — After game over, if the player beat their best score, show a 3-character name entry screen (classic arcade style). Store top 10 scores in `localStorage`. Display on the title screen.
  - From: Bigger Features
- [ ] **Replay ghost** — Record the player's inputs during a run. On the next run, show a ghosted version of the previous ship flying the same path. Motivates beating your own performance.
  - From: Bigger Features

### UI/UX Override - the inset figures the glyph comment states

#### Resolve Issues

- [ ] Inset Figures 1 - the range and the two zeroes the narrowed comment adds
  are derived from an advance Courier New does not have
  - **Issue**: The narrowing itself landed - the `geometricPrecision` mechanism
    claim is gone from all four places. What it added in its place is a new
    paragraph in `tuneText`'s doc comment at `index.html:308-313`, repeated in
    `CHANGELOG.md:30-35`, giving the inset's range and two sizes where it is
    said to be zero. All three of its figures are wrong, measured in chromium
    against the page's own `measureCell` at every size `fitGrid` can settle on.
    Courier New advances at `1229/2048` em, which is `0.6000977`, not at `0.6`
    em: the measured advance matches `1229/2048 * size` at all eleven sizes to
    within half a thousandth of a pixel and matches `0.6 * size` at none of
    them. Because `cellW` is the ceiling of that advance, the four
    ten-thousandths of an em decide the cell at exactly the two sizes the
    comment singles out - at font 10 an advance of `6.001` ceils to `7` where
    `6.000` would ceil to `6`, and at font 15 `9.001` ceils to `10` where
    `9.000` would ceil to `9`. So the two sizes recorded as having no inset at
    all carry the largest insets in the range, `0.500px` and `0.499px`, and no
    size in the range has an inset of zero. The stated range of `0.100px to
    0.400px` is really `0.099px to 0.500px`. The claim is not merely off; at
    the two sizes it names it is inverted, and those are the two sizes where
    the centring does the most good. The bound the same paragraph states - the
    slack always under a pixel, the inset always half of it and never reaching
    half a pixel - was checked and holds.
  - **Goal**: Resolve to [inset-figures.prompt.md](.claude/prompts/inset-figures.prompt.md)
  - From: UI/UX Override - what the glyph tuning is recorded as doing

#### Found Issues

- [ ] "Halves the seam" holds at four of the eleven font sizes, does nothing at
  four and reverses at three
  - **Issue**: `docs/how-it-works.html` publishes that centring the glyph
    "halves the seam between two of the box characters the tunnel walls are
    built from", and `index.html`'s comment and `CHANGELOG.md` say the same.
    Measured at the junction between two tiling wall glyphs - the wall is a ring
    outline two cells thick, so the tunnel holds pairs rather than runs, four of
    each glyph on screen at every size - by repainting the live buffer twice in
    one synchronous pass, once through `ScreenBuffer.render` with the page's own
    `cellAdvance` and once with `advance = cellW`, which is the left-packed grid
    this replaced. Taking the darkest of the two pixel columns either side of a
    junction, as a level out of 255: at an inset of 0.5px (fonts 15, 10) it
    rises 41.7 to 68.7 and the spread across the junction falls 82.3 to 23.3;
    at 0.4px (fonts 12, 7) it rises 55.3 to 72.0 and the spread falls 68.7 to
    36.3, which is the halving as described. At 0.3px (fonts 14, 9) the reading
    is exactly mirrored - 97.0/124.0 becomes 124.0/97.0, the deficit swapping
    sides with the darkest column and the spread unchanged to a tenth of a
    level. At 0.1px (fonts 13, 8) nothing moves at all. At 0.2px (fonts 16, 11,
    6) it goes the wrong way: the darkest column falls 111.7 to 102.0 and the
    spread widens 12.7 to 31.3, because left-packed was already nearly even
    there and the inset tips it past centre. Related: there is no gap between
    two of these glyphs to remove in the first place - of 28 glyph-and-size
    pairs, 24 ink wider than their cell and four ink exactly it, and `▒ ▓ █`
    each reach a whole pixel left of the origin they are drawn at, so two
    adjacent cells overlap. What the inset moves is where the soft edge of that
    overlap falls. The feature is worth having and the numbers say so - the
    worst seam in the build is at fonts 15 and 10 and that is where it helps
    most - but the sentence claims a uniform effect the raster does not show.
  - **Goal**: Narrow the three copies to what the measurement supports: the
    centring lifts the seam most where the slack is widest, which is where it
    was worst, and does nothing or a little harm where the slack is narrow. The
    figures are in [inset-figures.prompt.md](.claude/prompts/inset-figures.prompt.md)
    and in the `2026-10-04` entry of
    `test-results/ui-ux-tester.agent/ui-ux-tester.log`. The published sentence
    is the one that matters most, since it is the only one a visitor reads.
    Leave `docs/how-it-works.html`'s "a fifth of a pixel nobody sees" alone - at
    font 16 the inset is 0.199px and that is right.
  - From: UI/UX Override - the inset figures the glyph comment states
- [ ] A run of block glyphs still inks the column left of its first cell at the
  two sizes with the smallest inset
  - **Issue**: `▒`, `▓` and `█` reach a whole pixel left of the origin they are
    drawn at, at every font size, measured off `actualBoundingBoxLeft`. The
    inset normally clears it, and at nine of the eleven sizes nothing is drawn
    left of a run's first cell. At font 13 (inset 0.099px) and font 8 (inset
    0.100px) a tenth of a pixel is not enough: a run of `█` with an empty cell
    to its left inks the column left of that cell at level 39 of 255, the same
    level the left-packed grid put there. It is faint and it is not a
    regression - the centring neither caused it nor was expected to fix it -
    but the grid does bleed one column outside the cells it is laid out on at
    those two sizes, and nothing in the repository says so.
  - **Goal**: A decision rather than a change, and probably a sentence rather
    than code. Either record it beside `glyphInset` as a known limit of the
    placement at the narrow-slack sizes, or floor the inset so it always clears
    the left bearing - which would cost the centring its symmetry and wants
    weighing against a defect nobody has reported seeing. Do not change
    `glyphInset`'s arithmetic without the second decision: the suite pins the
    two margins being equal, in `the inset never pushes a glyph out of its own
    cell` in `test/menu-layout.test.mjs`, and a floor would break that
    deliberately. The open `## Measurement` item above, "A probe for the glyph
    tuning's own figures", is where this belongs if a browser probe is ever
    admitted - it is the same question of a figure that only chromium can
    produce.
  - From: UI/UX Override - the inset figures the glyph comment states
- [ ] The probe call into the harness that changed signature this turn is run
  by nothing in `npm test`
  - **Issue**: `ghostFlight` gained a leading `build` parameter at
    `test/engagement.mjs:536`, and its only caller outside that file is
    `creep` at `test/probes/column.mjs:38`, which was updated to match and is
    correct today. Nothing in the suite runs it. `npm test` globs
    `test/*.test.mjs`, so `test/probes/column.mjs` is reached only by
    `npm run probe -- column`, and `test/probes.test.mjs` imports each probe to
    read what its `run()` destructures without ever calling it. So the pairing
    is unverified in the direction that just moved: pass the old argument list
    and `build` binds to the `game` object, `build.BULLET_SPEED` is
    `undefined`, `travel` is `NaN`, every row comparison in the walk is false,
    and `ghostFlight` returns `null` after its 400 frames. Checked by calling
    `ghostFlight(game, game, ...)` against a staged target at x 4.5, z -80:
    the correct call reports contact at z -66.2 and the old one returns
    `null`, which `creep` prints as `-`. All eight creep figures in the probe
    table would read `-` with 536 tests passing - the failure
    `test/probes.test.mjs` opens by naming, "Nothing failed, because nothing
    looked."
  - **Goal**: One assertion that reaches a probe's call into the harness
    rather than only its flag contract with the rig. `creep` is not exported,
    so the two openings are to invoke the probe's `run()` itself on a narrowed
    workload - one grid, one build, `count` 1 - and assert it resolves without
    throwing, which reaches every probe's harness calls at once; or to export
    `creep` and assert it returns a finite column figure for a staged target.
    The first covers more and is the better buy if a probe can be run quietly,
    since the rig prints as it goes. A probe reports and never asserts, so
    either way the assertion belongs in `test/probes.test.mjs`.
  - From: UI/UX Override - the inset figures the glyph comment states

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

- [ ] **Leaderboard with name entry** — After game over, if the player beat their best score, show a 3-character name entry screen (classic arcade style). Store top 10 scores in `localStorage`. Display on the title screen.
- [ ] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.
- [ ] **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
- [ ] **Replay ghost** — Record the player's inputs during a run. On the next run, show a ghosted version of the previous ship flying the same path. Motivates beating your own performance.
- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.

## Polish

Presentation and platform refinements that do not change gameplay: rendering
quality, browser integration, accessibility, and performance headroom.

- [ ] **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.
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

- [ ] **A probe for the glyph tuning's own figures** - 0.8.1-alpha quotes three
  sets of numbers that only a scratch script can rebuild: the 96 hinted-against-
  precise comparisons behind "the fractional position is honoured either way",
  the inset's 0.100px to 0.400px range with its zeroes at font 10 and 15, and
  the seam levels in the prompt file that measured the centring landing. The
  arithmetic half needs no browser and belongs beside the other probes; the
  rasterizer half needs chromium, which the project has so far declined, so this
  wants a decision on whether a browser probe lives here at all or whether the
  figure is quoted with its method and left unrebuildable. The pad release
  reading from the same version has the same problem - `ArrowLeft` surviving a
  resting pad was measured against a patched copy of `index.html`, and nothing
  in the repository reproduces it.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 100 earlier items in `TODO-archive.md`, newest last.

- [x] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.
  - From: Polish
- [x] The test harness restates the bolt speed the engine now names
  - **Issue**: `BULLET_SPEED` was added to both builds this turn and both now
    read their travel off it, and `BUILDS` in `test/engagement.mjs:37-56` carries
    it for each build (`:44` and `:53`) so the harness has it to hand. Three places in that file
    still write the figure out instead: `const travel = 60 * dt` at
    `test/engagement.mjs:535`, `:818` and `:1362`. Nothing fails, because 60 is
    what the constant holds. The cost is that the rebuilt frame these three
    compute is the thing every reach, band and pairing reading is measured
    against, so a change to `BULLET_SPEED` leaves the harness measuring the old
    cannon and the parity check at `test/parity.test.mjs:59` passes while every
    figure quoted beside it is wrong. The adjacent `advance` lines use a 60 of
    their own - units per unit of speed, not bullet travel - so the two have to
    be told apart rather than replaced together.
  - **Goal**: Read the travel off `build.BULLET_SPEED` at all three sites, the
    way `volleyLife` already reads the life off `build.BULLET_LIFE_SLACK`, and
    leave the `advance` 60 alone with a word saying which figure it is.
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] **Inset Figures**: `tuneText`'s comment credits `geometricPrecision` with
  work the centring does on its own
  - **Issue**: The doc comment at `index.html:291-306` says
    "`geometricPrecision` is what makes the centring above worth having", on the
    stated ground that "left to itself a canvas rounds a glyph's position and
    its advance to whole pixels, which snaps the inset straight back to zero".
    Measured in chromium against the shipped page, it does not. A six-glyph run
    drawn at the page's own `FONT` and `cellW` came back byte-identical under
    `textRendering: 'auto'` and under `geometricPrecision` with kerning off, for
    `░ ▒ ▓ █ ╣ M` at 16px, 8px, 7px and 6px, in both colour schemes - 96
    comparisons with no pixel column differing by one level. The fractional x is
    honoured either way, so the centring stands up without the request and the
    reason given for it is not the engine's behaviour. The centring itself does
    land: at 7px, where the slack is worst, the darkest column at a junction
    between two tiling glyphs rose from 192 to 205 for `▒ ▓ █` and 144 to 162
    for `░`, the one-pixel left overhang went away, and the part-inked columns
    in a run halved from 14 to 7. Nothing is broken; the comment claims a
    mechanism the measurement contradicts, which is the kind of claim the next
    person to touch the renderer would reason from.
  - **Goal**: Resolve to [tune-text-rationale.prompt.md](.claude/prompts/tune-text-rationale.prompt.md)
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] The same `geometricPrecision` rationale is recorded in three more places
  - **Issue**: The override above covers the doc comment at `index.html:291-306`
    and its prompt file says plainly what not to touch, naming
    `test/menu-layout.test.mjs` under **What not to change**. The claim it
    corrects is not only there. `CHANGELOG.md:0.8.0-alpha` has "asked for
    `geometricPrecision` text and no kerning, which is what makes the centring
    worth having: left to itself a canvas rounds both a glyph's position and its
    advance to whole pixels, snapping the inset back to zero";
    `test/menu-layout.test.mjs` opens the test `the grid is drawn with hinted
    rounding off` with "The centring is only worth having with this set. Left to
    itself a canvas rounds both a glyph's position and its advance to whole
    pixels, which snaps the inset back to zero and puts the grid back where it
    started"; and `docs/how-it-works.html` publishes "the canvas is asked for
    exact glyph positions rather than hinted ones so the centring survives being
    drawn". All three are the mechanism the 96 chromium comparisons in the prompt
    file contradict, and the third is on the public site. Worked as written, the
    override narrows one of four copies and leaves three standing, one of them in
    the test whose name asserts it.
  - **Goal**: Narrow all four together when the prompt file is worked, on the
    measurement it already carries: keep both settings and both capability
    checks, and say the fractional x is honoured either way in this engine, so
    the request is insurance rather than the thing doing the work. The test's
    assertions are correct and stay - `textRendering`, `fontKerning` and
    `textBaseline` are all genuinely set; it is the comment above them and the
    test's name that claim the mechanism.
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] The pad's release rule is recorded as verified by a key the pad cannot hold
  - **Issue**: `CHANGELOG.md:0.8.0-alpha` closes the gamepad entry with "Verified
    in a chromium window against a stubbed `navigator.getGamepads`: ... and a `D`
    held on the keyboard survived a resting pad." `D` is not one of the nine
    names `PAD_CONTROL_KEYS` holds - the pad steers on `LEFT`, `RIGHT`, `UP` and
    `DOWN`, and the keyboard reaches those through the arrow keys rather than
    through `WASD`. So the poll's loop never visits `D` whatever `padWasHeld`
    says, and that reading would have come back the same with the release rule
    deleted. The rule itself holds, and is pinned at the seam the suite can reach
    by `the page polls the pad once a frame and releases only what it pressed` in
    `test/browser-shell.test.mjs`. What is wrong is the sentence recording how it
    was checked live, which is what a reader consults when deciding whether the
    rule still needs watching.
  - **Goal**: Either re-run that check on a key the pad does reach - an arrow
    held on the keyboard while a pad rests, which is the collision the rule
    exists for - and record the result, or narrow the sentence to what the `D`
    reading can show, which is that the poll does not clear keys outside
    `PAD_CONTROL_KEYS`.
  - From: UI/UX Override - what the glyph tuning is recorded as doing
