# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.
  - From: Bigger Features

### UI/UX Override - the drops are three cells for one frame

#### Resolve Issues

- [ ] Encounter Legibility 2 - the three drops are placed three cells apart and
  are back to two by the next frame at the 60-column floor
  - **Issue**: The banner half of the release verifies clean and the drop half
    does not. `bossDropSpread` solves for exactly one column of separation at
    the depth of the kill, and `updatePowerups` spends that column on the next
    frame: it pulls every drop toward the ship at `POWERUP_DRIFT` 2.5 units per
    second, 0.0833 per frame, and when the ship is on the boss's axis - where it
    has to be to have landed the twentieth hit, since `spawnBoss` puts the boss
    at `x: 0, y: 2.5` and a bolt holds the screen column it was fired down - the
    middle drop is already at the ship's `x` and does not move while the outer
    two close on it at the full rate. One column is 1.53 units at z=-190 on a
    60-column grid, so two frames in, an outer drop and the middle one are
    inside one column. `killBoss` then raises a 20-particle burst on those same
    cells and `drawParticles` runs after `drawEntitiesFar`, so the one frame the
    three really are three cells is a frame the explosion is covering. Measured
    on the painted canvas, five far kills flown from a real ENTER with SPACE
    tapped at 15 Hz from inside the WARNING, at 60x20: every one places three
    and holds three for one frame, two of the five never read as three own
    glyphs inside 90 frames, and the three that did read at frames 38, 63 and
    79 - 1.27 s, 2.10 s and 2.63 s after the kill, long after the player has
    stopped looking at it. Staged with the ship held on the axis, the three hold
    three cells for 1, 2 and 1 frames at z=-194, -192 and -190 against the 15
    the burst takes to clear, and for 9 at z=-150; the build before this release
    held 0, 0 and 0 there, so the change improved the far end without reaching
    the goal. At 80 and 128 columns the constant 1.5 is already more than one
    column, the three hold 11 to 12 frames, and they read as three inside about
    300 ms - this is a 60-column case. Off the axis the three hold for a whole
    60-frame sweep at every grid, so the axis seat is the condition.
    `dropBossPowerups`' own comment still says the derived gap "is what keeps
    none of the three hidden behind another".
  - **Goal**: Resolve to [boss-drop-read-window.prompt.md](.claude/prompts/boss-drop-read-window.prompt.md)
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

> 152 earlier items in `TODO-archive.md`, newest last.

- [x] **Encounter Legibility**: **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
  - From: Bigger Features
- [x] Encounter Legibility 1 - two things the encounter draws cannot be read as
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
- [x] Three figures in BOSS_SIZE_MULT's docstring describe something other than
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
- [x] BOSS_INTERVAL's comment counts two asteroid field sections where a run
  has flown one
  - **Issue**: `src/types.ts:468` closes with "Three minutes puts the first
    encounter after two asteroid field sections and three warp steps, so a
    player meets it already knowing what the tunnel does on its own." The warp
    figure is right and the section figure is double. `asteroidTimer` only
    accumulates while `asteroidTime` is zero and `openAsteroidField` resets it
    to 0, so sections open at 150 seconds of flying and then at 150 + 15 + 150
    = 315 - one opening before three minutes, not two, and no reading of the
    cadence gives two, since even off `gameTime` 180 / 150 is 1.2. Measured by
    flying an unseeded run with the shield held up and counting the frames
    `asteroidTime` rises off zero: the first warning lands at `gameTime`
    182.03 - 180 plus the 2 seconds the warp gate holds it, which is the
    comment's own first-collision case working - and exactly 1 section and 3
    warp steps have gone by, with `warpLevel` at 4. The claim the figure is
    offered for survives either way, since one section and three warp steps is
    still a tunnel a player has been shown; only the count is wrong. The
    browser build's mirror of this comment ends at `index.html:751` with "this
    interval minus however long the last one ran" and states no such figure, so
    the correction does not cross to it.
  - **Goal**: Say one asteroid field section, or drop the section count and
    name the three warp steps alone. If the sentence is worth a figure a reader
    can rebuild, give the cadence beside it - sections at 150 and 315 seconds
    of flying against an encounter at 180 - rather than a bare count. A case in
    `test/asteroid-field.test.mjs` or `test/boss.test.mjs` walking a run to the
    first warning and asserting the 1 and the 3 would stop the pair drifting
    again, since both figures are engine state and neither is pinned now.
  - From: UI/UX Override - the banner row and the far drops
- [x] The ship's own collision box still sizes the drawn block longhand, so
  `blockSize` is not the one place its docstring says it is
  - **Issue**: `blockSize` was added to end two readers of one formula
    disagreeing, and its docstring at `src/types.ts:215` states the scope as
    "it is read twice from two different places: `drawEntitiesFar` draws the
    block, and `contacts` decides what the pulse cannon met", closing "so there
    is one function now and both ends call it". There are four readers of that
    block, not two. The ship's own collision boxes still write
    `max(1, floor(scale * 2.5))` out by hand against the same drawn block -
    `src/game.ts:1430` for an obstacle and `:1519` for a mine, mirrored at
    `index.html:2192` and `:2255` - and none of the four was converted. They
    agree today, so nothing is broken on screen; what is wrong is that the
    docstring tells a later reader the formula lives in one place. Name the
    input: change the 2.5 in `blockSize` to any other figure and both builds
    draw a block of the new size which the pulse cannon tests correctly and the
    ship collides with on the old one - the player would clip an obstacle a
    character short of touching it, or pass through the edge of one, which is
    the same see-it-but-it-does-not-register defect in the other direction and
    the one the function exists to rule out. The hazard is the docstring's
    promise rather than the duplication: a reader who believes it will change
    the 2.5 and not go looking.
  - **Goal**: Either finish the consolidation or narrow the claim, and
    finishing it is the better of the two since the formula is identical at all
    four sites. Have the obstacle and mine ship-collision boxes call
    `blockSize(oScr.scale)` and `blockSize(mScr.scale)` in both builds, then
    say in the docstring that every reader of the block goes through it and
    name them. `drawBlock`'s caller is the renderer and takes the same figure,
    so no projection changes. The suite pins `blockSize` itself and the
    cannon's agreement with it, but nothing asserts the ship's box reads the
    same size, so a case staging an obstacle at a known depth and walking the
    ship in until contact registers would hold the fourth reader too.
  - From: UI/UX Override - the banner row and the far drops
