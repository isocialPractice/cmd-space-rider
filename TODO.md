# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.
  - From: Bigger Features

### UI/UX Override - the banner row and the far drops

#### Resolve Issues

- [ ] Encounter Legibility 1 - two things the encounter draws cannot be read as
  what they are, in both builds
  - **Issue**: Two defects, each measured on the painted canvas and each
    reproduced identically in the terminal build and the browser build.
    **First**, the HUD banner row keeps the ends of the banner it drew over.
    `drawHUD` centres each banner with `putStringCenter` and writes them in
    order with nothing clearing the row between two writes, so a shorter string
    centred over a longer one covers the longer one's middle and leaves its ends
    standing. A warning inside an asteroid field section renders row 3 as
    `>> >> WARNING <<D <<` - the stray `D` is the `D` of `FIELD` - and a warning
    across a warp step renders `>>>> WARNING << <<`, at 60x20, 80x24 and 128x45
    alike, so it is a draw-order defect rather than a narrow-grid one. The two
    comments in `drawHUD` that describe this overlap resolve it by draw order
    and name the exact frame it is for, so the case is anticipated and only the
    mechanism is wrong. The frame is reachable from engine state: the gate in
    `updateBossEncounter` holds a warning off while a banner is already up but
    not for the three seconds it then runs, and `updateAsteroidField` runs before
    it and is held off only by a warp flash, so a section coming due inside a
    live warning opens under it - stepped from `bossTimer = BOSS_INTERVAL -
    FRAME / 2` and `asteroidTimer = ASTEROID_INTERVAL - 1.5`, both builds reach
    frame 45 with `bossWarning` 1.50 s and `asteroidTime` 15.00 s together and
    render that row. The same defect predates this release on the warp and
    section pair, which renders `>>> WARP LEVEL 2 <<<`. **Second**, two of the
    three drops a destroyed boss leaves land in one cell at 60 columns.
    `BOSS_DROP_SPREAD` is a world distance and the drawn gap narrows with depth
    and with the grid's width together, so killing a boss a unit at a time gives
    three distinct glyphs down to z=-188 and two from z=-189, where the three
    are placed at columns 29, 30 and 30 and the row renders `+~` in place of
    `+ ! ~`. At 80 and 128 columns they never collapse at any depth they are
    drawn at. The window is the first 786 ms of a 14.3-second approach, and it
    is reachable: holding the trigger from the start of the WARNING, the
    twentieth hit lands at z=-189.7 tapped at 10 Hz with Rapid Fire and at
    z=-192.5 tapped at 15 Hz. `dropBossPowerups`' own comment says "none is
    hidden behind another".
  - **Goal**: Resolve to [encounter-legibility.prompt.md](.claude/prompts/encounter-legibility.prompt.md)
  - From: Bigger Features

#### Found Issues

- [ ] Three figures in BOSS_SIZE_MULT's docstring describe something other than
  what is drawn
  - **Issue**: `src/types.ts:509` to `:513` closes with "At 3.5 the block is 8
    cells across when the boss reaches the ship and 1 at the edge of sight,
    against a mine's 2 and 1. On the 24-row floor the play area is 19 rows, so a
    close boss is about two fifths of the height of it". Three of those figures
    are wrong about the screen. **8 and 2 are what `blockSize` returns, not what
    `drawBlock` draws**: that function takes `half = floor(size / 2)` and loops
    `-half` to `+half` inclusive, so a size of 8 is drawn 9 cells across and a
    size of 2 is drawn 3. Rendered at z=0 in both builds, the boss block
    measures 9x9 cells and the mine 3x3. **24 is not the floor**: both builds
    declare `MIN_HEIGHT = 20` - `src/index.ts:55` and `index.html:3563` - and
    the 24 at `src/index.ts:52` is the fallback for an undefined `stdout.rows`.
    **Two fifths is neither grid's share**: 9 rows of the 19 a 24-row grid gives
    is 47.4%, and at the real 20-row floor the play area is 15 rows and the
    block is clipped to 8 of them, which is 53.3% - over half, which is the
    opposite of the reassurance the sentence is making. The browser build's
    mirror of this comment at `index.html:773` carries the 8-and-2 sentence and
    not the floor sentence, so only the first correction crosses to it. Nothing
    is broken on screen - a close boss at the 20-row floor is large but legible,
    and every other reading of it passed - this is a committed comment quoting
    figures a reader cannot rebuild.
  - **Goal**: Say which number is which. Keep 8 and 2 if they are named as
    `blockSize`'s return and give the drawn extent as 9 and 3 beside them, or
    quote the drawn figures alone; name the floor as 20 rows and 15 play rows;
    and replace "about two fifths" with the share at the floor, 53.3%, or at
    both grids. Mirror the `blockSize` half into `index.html`. The suite pins
    `blockSize` itself rather than the drawn extent, so the sentence and the test
    are currently measuring different things - a case in
    `test/boss.test.mjs`'s drawn-block section asserting the rendered 9x9 and
    3x3 would tie the two together.
  - From: UI/UX Override - the banner row and the far drops

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

> 148 earlier items in `TODO-archive.md`, newest last.

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
- [x] **Harness Exclusions 1**
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
- [x] Drawn Span Premise 1
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
- [x] Harness Exclusions 2
  - **Issue**: The sentence 0.10.2 added to close the harness-exclusions
    paragraph at `docs/development.html:33` tells a future editor the wrong thing
    to preserve. It says the pair "is matched by the words *are left out* closing
    it, which is the one part of the paragraph a rewrite has to keep".
    The regex at `test/probes.test.mjs:118` matches a run of
    `<code>name</code>` spans followed by those words, so it needs two things
    kept, not one: the closing words, and the probe names wrapped in
    `<code>` immediately before them. A rewrite that keeps only what the page
    asks for fails - dropping the markup to plain text, "overlay-anchor and
    glyph-tuning are left out", returns no match, so the test stops at
    `assert.ok(sentence, ...)` with "docs/development.html states no ... sentence"
    rather than at the pair comparison. Checked by running that regex against the
    page with the markup removed. The docstring at `test/probes.test.mjs:112` has
    it right - "the probe names in `<code>` immediately before" - so the
    published copy is the one that is wrong, and it is the copy whoever rewrites
    that paragraph reads. The same sentence also opens "The pair named in this
    sentence" while the pair is named in the sentence before it.
  - **Goal**: Rewrite that closing clause to name both halves of the shape the
    test matches - the probe names in `<code>`, and the words "are left out"
    immediately after them - instead of "the one part". Point "this sentence" at
    the preceding sentence in the same rewrite. Then `npm test`, and re-check the
    guard still fails on a drifted pair by publishing a different name and
    running `node --test test/probes.test.mjs`.
  - From: Code Review Override - the section cadence figure and the drawn span premise
- [x] **Encounter Legibility**: **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
  - From: Bigger Features
