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

### Create and Deploy GitHub Pages Override

### Code Review Override - the seam count and the narrowed probe workload

- [ ] The narrowed probe workload is not pinned to the flag table it is keyed by
  - **Issue**: `NARROWED` at `test/probes.test.mjs:57` carries one value per
    argument property, and `narrowedArgs` resolves a probe's flags through it -
    `args[FLAG_ARG[flag]] = NARROWED[FLAG_ARG[flag]]`. Two checks in the same
    file pin the pieces either side of it: `the table names every flag the rig
    parses, and no others` pins `FLAG_ARG` against `parseArgs`, and `every probe
    takes exactly the flags the table lists for it` pins the table against each
    `run()`. Nothing pins `NARROWED` against `FLAG_ARG`. Add a flag to
    `parseArgs`, to `FLAG_ARG` and to a probe - the shape the rig has grown
    twice already - and `NARROWED` hands that probe `undefined` for it, which
    the probe reads as "not passed" and answers with its own default, the full
    walk. Every assertion still passes, and the workload the two new checks
    promise to narrow stops being narrow with nothing saying so. `free-flight`
    is the one that would hurt: its `passes` default is every seed in
    `FREE_SEEDS`.
  - **Goal**: Assert that `NARROWED` holds a value for every property
    `FLAG_ARG` maps, beside the check that `FLAG_ARG` matches `parseArgs`, so a
    flag added without a narrowed value fails the suite rather than widening the
    walk inside it.
  - From: Code Review Override - the seam count and the narrowed probe workload
- [ ] "One placement" names a workload `free-flight` does not run
  - **Issue**: `NARROWED`'s doc comment at `test/probes.test.mjs:46`, the
    paragraph added to `CHEATSHEET.md`, and the matching sentences in
    `docs/cheatsheet.html` and `docs/development.html` all describe the new run
    as "one grid, one build and one placement". `count` is a placement walk for
    `column`, `frame-rate` and `seen-versus-kill`, and `free-flight` reads the
    same flag as frames - `const frames = count ?? FREE_FRAMES` at
    `test/probes/free-flight.mjs:57` - so `count: 1` flies one frame there. Its
    flight table comes back all zeroes, since no volley is fired in a single
    frame, and what actually reaches the harness for that probe is the rate walk
    at `FREE_RATE_FRAMES` and `darkWalk`, neither of which `count` narrows. The
    coverage holds; the sentence describing it is wrong for a quarter of the
    probes it covers, in two published pages.
  - **Goal**: Say what the narrowed `count` means per probe, or name the
    workload by what it is - one grid, one build, the smallest `count` the rig
    takes - rather than by a unit only three of the four probes share.
  - From: Code Review Override - the seam count and the narrowed probe workload

#### Resolve Issues

- [ ] Seam Measurement 1 - the 28 glyph-and-size pairs behind the overlap claim
  are not the pairs the walls are drawn from
  - **Issue**: The narrowing landed, and the junction levels behind it are
    recorded where a reader can find them. What it added beside them is a count
    the repository contradicts. `index.html:286-290` says "Of the 28
    glyph-and-size pairs the walls are drawn from, 24 ink wider than their cell
    and four ink exactly it", and the 0.8.2-alpha `CHANGELOG.md` entry repeats
    it. `drawTunnel` picks the wall glyph from four characters - `░ ▒ ▓ █` at
    `index.html:1555-1558` - and `fitGrid` settles on eleven font sizes,
    `FONT_SIZE` 16 down to `MIN_FONT_SIZE` 6 in whole steps. That is 44
    glyph-and-size pairs, not 28. 28 is four glyphs against the seven distinct
    cell widths those eleven sizes produce: `ceil(1229/2048 * size)` runs 4, 5,
    5, 6, 7, 7, 8, 8, 9, 10, 10, so four of the sizes share a cell with another.
    Grouping by cell instead of by size merges sizes whose advance differs by
    most of a pixel - fonts 7 and 8 share a 5-pixel cell off advances of 4.201px
    and 4.801px - and ink width follows the advance, not the cell. So either
    sixteen pairs went unmeasured or the reading answers a different question
    from the one the sentence asks. The conclusion it supports is probably safe,
    since the left bearing the `glyphInset` comment records separately is read
    at every size; the number a reader can check is the part that is wrong.
  - **Goal**: Re-take the ink widths over all eleven sizes, or say which sizes
    the 28 covers and why, and correct both copies. If the count stays
    unrebuildable, add it to the browser-only half of the `## Measurement` item
    below, which already carries the junction levels and the left bearing but
    not this.
  - From: UI/UX Override - the inset figures the glyph comment states

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

- [ ] **A probe for the glyph tuning's own figures** - the glyph tuning quotes
  four sets of numbers that only a scratch script can rebuild: the 96
  hinted-against-precise comparisons behind "the fractional position is honoured
  either way", the per-size table behind the inset's 0.099px to 0.500px range
  and the `1229/2048` em advance it follows from, the junction levels behind
  "lifts the seam most where the slack is widest", and the left bearing recorded
  beside `glyphInset` as a known limit at font 13 and font 8. The first set is
  from 0.8.1-alpha and the last three from 0.8.2-alpha, which corrected the
  figures the first version of this item quoted; every one of them was read in
  chromium and none is reproducible from the repository. The arithmetic half
  needs no browser and belongs beside the other probes; the rasterizer half
  needs chromium, which the project has so far declined, so this wants a
  decision on whether a browser probe lives here at all or whether the figure is
  quoted with its method and left unrebuildable. The pad release reading from
  0.8.1-alpha has the same problem - `ArrowLeft` surviving a resting pad was
  measured against a patched copy of `index.html`, and nothing in the repository
  reproduces it.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 104 earlier items in `TODO-archive.md`, newest last.

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
- [x] Inset Figures 1 - the range and the two zeroes the narrowed comment adds
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
- [x] **Seam Measurement**: "Halves the seam" holds at four of the eleven font
  sizes, does nothing at four and reverses at three
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
- [x] A run of block glyphs still inks the column left of its first cell at the
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
- [x] The probe call into the harness that changed signature this turn is run
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
