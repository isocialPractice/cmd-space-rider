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

### UI/UX Override - the figures the overlap sentence states

- [ ] The reflowed probe paragraph in the 0.8.2-alpha entry leaves a four-word
  orphan line
  - **Issue**: Rewording the narrowed-workload sentence at `CHANGELOG.md:153-155`
    rewrapped the first two lines and left the remainder of the sentence on a
    line of its own - "report; and the `column`", 26 characters in a file that
    wraps at 80. Nothing is wrong with what it says; it reads as a dropped line
    to anyone scanning the entry.
  - **Goal**: Reflow that one paragraph to the file's width. No wording change.
  - From: UI/UX Override - the figures the overlap sentence states

#### Resolve Issues

- [ ] Seam Measurement 2 - the right-of-advance figure that replaced the removed
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
- [ ] Seam Measurement 3 - the same right-of-advance figure went into a third
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
- [ ] Narrowed Guard 1 - the new NARROWED assertion checks for `undefined` while
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

#### Found Issues

- [ ] The three glyphs that reach left of their origin are not the three shade
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
- [ ] Nothing in the suite pins the four glyphs every wall figure is counted from
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
  five sets of numbers that only a scratch script can rebuild: the 96
  hinted-against-precise comparisons behind "the fractional position is honoured
  either way", the per-size table behind the inset's 0.099px to 0.500px range
  and the `1229/2048` em advance it follows from, the junction levels behind
  "lifts the seam most where the slack is widest", the left bearing recorded
  beside `glyphInset` as a known limit at font 13 and font 8, and the ink widths
  of the four wall glyphs against their cells. That last one was published as
  "24 of 28 glyph-and-size pairs ink wider than their cell and four ink exactly
  it" and 0.8.3-alpha removed it: the walls are drawn from four glyphs at eleven
  sizes, which is 44 pairs, and 28 is those glyphs against the seven distinct
  cell widths the sizes produce. Ink width follows the advance rather than the
  cell, so the sixteen merged pairs are unmeasured rather than covered - fonts 8
  and 7 share a 5px cell off advances of 4.801px and 4.201px. Re-taking it over
  all eleven sizes is the browser-only half of this item; the overlap conclusion
  it was quoted under does not depend on it, resting on the left bearing, which
  was read at every size. The first set is from 0.8.1-alpha and the other four
  from 0.8.2-alpha, which corrected the figures the first version of this item
  quoted; every one of them was read in chromium and none is reproducible from
  the repository. The arithmetic half
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

> 107 earlier items in `TODO-archive.md`, newest last.

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
- [x] **Narrowed Guard**: The narrowed probe workload is not pinned to the flag
  table it is keyed by
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
- [x] "One placement" names a workload `free-flight` does not run
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
- [x] Seam Measurement 1 - the 28 glyph-and-size pairs behind the overlap claim
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
