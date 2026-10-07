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

> 113 earlier items in `TODO-archive.md`, newest last.

- [x] Seam Measurement 2 - the right-of-advance figure that replaced the removed
  count reaches one pixel at five of the eleven sizes
  - **Issue**: The removal landed. The 24-of-28 count is gone from both places
    that published it, what 28 actually counted is explained, and the re-take is
    recorded as open work in `## Measurement`. The sentence written in its place
    states a figure that was not there before and that does not hold: `index.html:286-291`
    and `CHANGELOG.md:26-29` say the shade blocks reach "one to two pixels right
    of the advance, read off ... actualBoundingBoxRight at every size fitGrid can
    settle on". Measured in chromium through the page's own `measureCell` and
    `tuneText` at every one of those sizes, `actualBoundingBoxRight - advance`
    runs 1.3984, 0.9985, 0.5986, 1.1987, 0.7988, 1.3989, 0.9990, 0.5991, 1.1992,
    0.7993, 1.3994 for fonts 16 down to 6. The range is 0.5986px to 1.3994px: it
    reaches one pixel at five of the eleven sizes and two pixels at none of them,
    so the claim is wrong at both ends and at six sizes outright. No other
    reading saves it - `right - cell` is 0 at six sizes and never 2, and the
    whole ink width past the advance exceeds 2px at five. The conclusion the
    figure is offered for does hold and was checked separately: ink past the
    right edge of its own cell, `inset + right - cell`, is positive at all
    eleven sizes, and the page's own `ScreenBuffer.render` driven at all eleven
    shows no unpainted column between two inked cells across 44 glyph-and-size
    pairs, byte-identical to the same reading off `HEAD`. `glyphInset` is
    unchanged and correct.
  - **Goal**: Resolve to [seam-measurement-2.prompt.md](.claude/prompts/seam-measurement-2.prompt.md)
  - From: UI/UX Override - the inset figures the glyph comment states
- [x] Seam Measurement 3 - the same right-of-advance figure went into a third
  place, which Seam Measurement 2 does not name
  - **Issue**: Resolving `Seam Measurement 2` as written leaves the figure
    published. The turn put the clause into the released 0.8.2-alpha entry as
    well, at `CHANGELOG.md:129-131`, where the sentence previously ended at the
    left bearing: it now reads "a whole pixel left of the origin they are drawn
    at and one to two pixels right of the advance, **at every size**" - more
    emphatic than the 0.8.3-alpha copy, which omits "at every size". The
    measured table in
    [seam-measurement-2.prompt.md](.claude/prompts/seam-measurement-2.prompt.md)
    gives `actualBoundingBoxRight - advance` as 0.5986px to 1.3994px, under one
    pixel at six of the eleven sizes and never two, so this copy is wrong at
    both ends. `Seam Measurement 2` names only `index.html:286-291` and
    `CHANGELOG.md:26-29`, and the prompt file closes by saying to "apply it to
    both" - so a run that works that item correctly still ships the figure.
  - **Goal**: Whichever of the prompt file's three wordings is chosen, apply it
    to this copy too, and drop the "at every size" the other two do not carry.
    One decision, three places - do not resolve this separately from
    `Seam Measurement 2`.
  - From: UI/UX Override - the inset figures the glyph comment states
- [x] Narrowed Guard 1 - the new NARROWED assertion checks for `undefined` while
  the probes it guards read with `??`
  - **Issue**: `test/probes.test.mjs:268-273` asserts
    `assert.notEqual(NARROWED[prop], undefined, ...)`. The file imports
    `node:assert/strict`, where `notEqual` is `notStrictEqual`, so the check is
    `!==` and `null` satisfies it. The probes read these values with `??` -
    `count ?? FREE_FRAMES` at `test/probes/free-flight.mjs:57`,
    `passes ?? FREE_SEEDS.length` at :58 - and `??` treats `null` exactly as
    absent. So writing `passes: null` into `NARROWED`, which is a natural way
    to spell "nothing narrows this one yet", passes both of the new
    assertions and silently restores the full walk at every seed in
    `FREE_SEEDS` - the outcome the assertion's own comment says it exists to
    prevent, with 539 tests green. The key-set `deepEqual` above it does not
    help: the key is present.
  - **Goal**: Match the guard to the operator it guards. `assert.ok(NARROWED[prop] != null, ...)`
    covers both nullish values in one check; keep the message, which already
    explains the consequence. Worth a line in the comment saying the check is
    nullish because `??` is.
  - From: Code Review Override - the seam count and the narrowed probe workload
- [x] The three glyphs that reach left of their origin are not the three shade
  blocks
  - **Issue**: Five places say "the three shade blocks each reach a whole pixel
    left of the origin they are drawn at" - `index.html:286-291` and
    `CHANGELOG.md:26-29`, both written this turn, and `index.html:325-327`,
    `CHANGELOG.md:128` and `CHANGELOG.md:171`, which are older. Measured off
    `actualBoundingBoxLeft` in chromium at every size `fitGrid` can settle on,
    the light shade `░` reads 0.0000 at all eleven, while `▒`, `▓` and the full
    block `█` read 1.0000 at all eleven. So the set of three that reach left is
    `▒ ▓ █`, not the three shades, and the sentence both names a glyph that does
    not qualify and omits the one outside its category that does. Corroborated
    off the grid rather than only the metrics: rendering four inked cells with an
    empty cell either side inks the column left of the run at font 13 and font 8
    only, and there only for `▒`, `▓` and `█`, never for `░` at any size - which
    is the same two-size limit `glyphInset`'s doc comment already records.
    `index.html:325-327` is the worst of the five, because the sentence after it
    cites "a run of the full block" as the case that bleeds, contradicting the
    category its own paragraph opens with. The repository already holds the
    correct reading: the completed item "A run of block glyphs still inks the
    column left of its first cell at the two sizes with the smallest inset", in
    `## Complete`, names `▒`, `▓` and `█`.
  - **Goal**: Resolve to [shade-block-left-bearing.prompt.md](.claude/prompts/shade-block-left-bearing.prompt.md)
  - From: UI/UX Override - the figures the overlap sentence states
- [x] Nothing in the suite pins the four glyphs every wall figure is counted from
  - **Issue**: The figures in the `glyphInset` comment are all built on the walls
    being drawn from four characters - 44 glyph-and-size pairs is four by eleven,
    28 is four by seven, and the left bearing and the overlap are both stated per
    glyph. `drawTunnel` picks that character from a four-branch depth ramp at
    `index.html:1571-1574`. Nothing asserts the ramp has four branches. The one
    place the suite names the characters is `WALL_CHARS` at
    `test/warp.test.mjs:36`, and it is a filter, not an assertion: it collects the
    cells a wall column is allowed to hold so the warp checks can read their
    colours, and it is deliberately wider than the ramp, carrying the two ring
    characters as well. Add a fifth shade to the ramp and that set simply does
    not collect it, every one of the 539 tests still passes, and four figures in a
    published comment become wrong with nothing saying so. This is the same shape
    as the count the turn just removed - a figure whose premise moved out from
    under it - and the removal cost two releases to find.
  - **Goal**: One assertion, no browser needed, in whichever of
    `test/browser-engine.test.mjs` or `test/warp.test.mjs` already has a
    full-height tunnel to hand. Drive a quiet run tall enough that `t` crosses
    all four of the ramp's bands, collect the distinct characters `drawTunnel`
    leaves on the wall columns with the ring characters and the floor dot
    excluded, and assert the set is exactly `░ ▒ ▓ █` - so a fifth band, or a
    substituted glyph, fails the suite and sends someone to the figures that
    counted the old four. Worth running in both builds, since `drawTunnel` is
    shared and the parity suite would otherwise be the only thing watching it.
    Leave `WALL_CHARS` as it is; it is doing a different job and widening the
    assertion to match it would defeat the point.
  - From: UI/UX Override - the figures the overlap sentence states
