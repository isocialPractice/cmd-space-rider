# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.
  - From: Bigger Features

### UI/UX Override - the middle drop is under the tracer

#### Resolve Issues

- [ ] Encounter Legibility 3 - the hold keeps the three in three cells and the
  middle one spends all of it under the ship's own tracer
  - **Issue**: `BOSS_DROP_HOLD` does what its docstring claims and the far kill
    still reads as two. Verified on the painted canvas of a real browser: the
    three now hold three distinct cells for 43 to 48 frames against 1 to 15
    before, and staged far kills - the same `killBoss`, the same burst, an
    empty bullet list - read as three inside the first second at 27 of 27 grid
    and depth combinations against 12 of 27 on the build before this one. The
    drift is fixed. What is left is that `dropBossPowerups` centres the spread
    on the boss's `x`, `spawnBoss` fixes that at `0`, and the middle drop is
    therefore always `rapid` at exactly `x: 0` - the tunnel axis, which is the
    screen column a bolt travels up and the only column the twentieth hit can
    have been landed from. `drawBullets` paints `│` in `C.BRIGHT_CYAN` at the
    bolt's cell and `C.CYAN` one row above, and it runs after
    `drawEntitiesFar`, so the middle drop's cell carries a cyan `│` rather than
    its own `!` for as long as any bolt projects into it. Ten flown far kills
    at the 60-column floor - ENTER from the title screen, the pilot dodging on
    the page's own key listeners, SPACE through the real `keydown` handler, the
    kill landed by the engine's own collision, the trigger released on the kill
    frame - across five tap rates from 15 Hz down to 3.8 Hz: every one landed
    far, z between -151 and -188, and not one read as three glyphs inside the
    1.2 s hold. A bolt sat on the middle drop's own cell for 31 to 47 of the 48
    frames watched at every rate. The rate does not rescue it because one
    screen row at the floor is about 12 units of depth and `BULLET_SPEED` 60
    puts a bolt every 12 units along the column at 5 Hz. Naming one frame, 800
    ms after a kill at z=-194.40 at 60x20: shield at cell 28,4 shows `+` in ink
    10 READABLE, rapid at 30,4 shows `│` in ink 6 COVERED, slow at 31,4 shows
    `~` in ink 13 READABLE. Releasing the trigger does not cure it, which is
    what the request expected it to do: `fireVolley` pushes three bolts on
    every `justPressed.SPACE` with no cadence gate and each lives about 103
    frames, so the release stops new bolts and does nothing about the column
    already strung the length of the tunnel - measured from the release frame,
    the three first read as three at frame 69 with the pilot steering and never
    inside 150 frames with the ship held on the axis, against a hold ending at
    frame 36. It is worst at the floor and not only the floor: at 128 columns
    the same on-axis seat covers the middle cell on 32 of 36 frames. The
    release's own new case `a far kill is read as three glyphs once its burst
    clears` passes because it stages the kill into a tunnel with no bolts in
    it.
  - **Goal**: Resolve to [boss-drop-tracer-column.prompt.md](.claude/prompts/boss-drop-tracer-column.prompt.md)
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

> 157 earlier items in `TODO-archive.md`, newest last.

- [x] Encounter Legibility 2 - the three drops are placed three cells apart and
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
- [x] `bossDropSpread`'s docstring names the 60-column floor as the only grid
  the derived gap ever widens on, and nine grids widen on it
  - **Issue**: `src/types.ts:645` closes the derivation paragraph with "at 80
    columns and up the figure is the constant at every depth, and only the
    60-column floor ever widens it", and `index.html:845` carries the same
    clause. The "80 columns and up" half is right; the "only" is wrong by eight
    grids. The derived gap beats the 1.5 floor whenever
    `tunnelRadius / (colRange * scale)` exceeds it, which at the 0.15 scale
    floor is every width up to 77 - `(w - 6) / 2 < 8 / (1.5 * 0.15)` solves to
    `w < 77.11` - and over the depths a drop is actually drawn at, where the
    deepest is z=-195 and the scale there is 0.17125, it is every width from 60
    to 68. Walked over 60..82 columns against z in -195..-1: 60 widens to
    1.7302, 61 to 1.6987, and so on down to 68 at 1.5069, with 69 and up
    constant across the drawn range and 78 and up constant at every depth.
    Name the input: a 64-column terminal, which `MIN_WIDTH` 60 admits, places
    the three drops 1.611 apart at z=-195, and a reader who believed this
    sentence would have predicted 1.5 and looked for a bug in `bossDropSpread`
    on finding otherwise. The two figures the sentence then quotes are both
    correct and worth keeping - 1.730 is the 60-column floor at z=-195 and
    1.975 is the same grid at the 0.15 the scale floors out at, which is past
    every depth a drop is drawn at.
  - **Goal**: Replace "only the 60-column floor ever widens it" in both builds
    with the real band, and say which of the two ranges each figure belongs to:
    78 columns and up is the constant at every depth, 60 to 68 widens over the
    range a drop is drawn in, and 69 to 77 widens only past it. The
    `CHANGELOG.md` copy of the same clause in the 1.0.0-alpha.0.11.1 entry has
    already been corrected in place, so the two builds are what is left. Both
    bounds are arithmetic off constants the suite already exports, so a case in
    `test/boss.test.mjs` asserting `bossDropSpread` returns the floor at 78
    columns and more than the floor at 68 and at 60, at the scale of the
    deepest drawn depth, would stop the band drifting again.
  - From: UI/UX Override - the drops are three cells for one frame
- [x] `test/hud-row.test.mjs`' header still measures the shared row against the
  banner's own width, and the row is now blanked a fixed 20 columns wide
  - **Issue**: That file is the one place the shared HUD row's margins are
    reasoned about, and its header at `test/hud-row.test.mjs:13` to `:18` says
    "the margin between them is arithmetic rather than a check: the counter
    tops out at COMBO x8, ten columns wide ending at column 9, and
    `>> WARP LEVEL 2 <<` is eighteen columns centred, which starts at column 21
    on the 60-column floor. Widen the banner or raise COMBO_MAX and the two
    meet". This release replaced every `putStringCenter` on that row with
    `drawBanner`, which blanks `BANNER_FIELD` cells - a fixed 20, starting at
    column 20 on the 60-column floor - before it writes. So the span that can
    reach the combo counter is no longer any banner's text: it is one column
    further left than the header's figure and two columns wider, and it is the
    same 20 for `[ NEW BEST ]` at 12 characters as for
    `>> ASTEROID FIELD <<` at 20, where under the old code the short banner
    reached only column 24. "Widen the banner" is no longer the thing to watch
    either. Name the input: an editor adding a banner that needs
    `BANNER_FIELD` at 42 reads this header, checks the widest banner text
    against column 10, concludes the counter is clear, and ships a row where
    the blanked field starts at column 9 and eats the `8` of `COMBO x8` at the
    60-column floor. Nothing in the file is wrong as a test - its own
    assertions read drawn characters and would catch that - but the arithmetic
    it tells the next editor to do is arithmetic on the wrong span.
  - **Goal**: Rewrite that paragraph against `BANNER_FIELD` rather than against
    a banner's text: the field is 20 wide and centred, so it opens at column 20
    at the 60-column floor and leaves the counter 10 columns, and the figure to
    watch when adding a banner is the field rather than the string. The file's
    opening paragraph also lists the row's centred tenants as "the debug label,
    the warp banner and the NEW BEST banner" while `drawHUD` now writes four
    banners through one function, so the same rewrite wants the asteroid field
    and boss warning banners named and `drawBanner` pointed at. The file is not
    in this release's diff, which is why the release left it behind.
  - From: UI/UX Override - the drops are three cells for one frame
- [x] Nothing compares `bossDropSpread` between the two builds, and the four
  points that do read it cannot see the divergence that matters
  - **Issue**: `test/parity.test.mjs` exists because the browser build is a
    hand port - "easy to break by touching one file and not the other" - and it
    pins `BOSS_DROP_SPREAD` as a constant at `:66` and `blockSize` across five
    scales at `:70`. `bossDropSpread` is the function that now decides where
    the drops actually land, it is written out by hand in both
    `src/types.ts:661` and `index.html:850`, and no test compares the two
    builds' answers. The only reader is
    `test/boss.test.mjs`'s "the spread only widens where the projection is
    tight", which is inside the per-build loop and so asserts the same four
    numbers against each build separately. Those four cannot catch a port that
    drifted: change `colRange` to `(screenWidth - 4) / 2` in one build only and
    the three floor assertions still return 1.5, because the floor wins at all
    three, while the fourth bound only requires `1.5 < far < 2` and the drifted
    build returns 1.905. Both builds then place a boss's drops at different
    world coordinates and the whole suite passes - which is the exact failure
    the parity file was written to stop.
  - **Goal**: Add a `bossDropSpread` case to `test/parity.test.mjs` beside the
    `blockSize` one, comparing the two builds over a grid of widths and scales
    rather than a single point - 60, 68, 78 and 128 columns against the scale
    floor and the scale at the deepest drawn depth covers both sides of the
    floor. Then re-check it fails on a drifted port by editing one build's
    `colRange` and running `node --test test/parity.test.mjs`.
  - From: UI/UX Override - the drops are three cells for one frame
- [x] `BANNER_FIELD`'s docstring measures its clearance from the two readouts
  and not from the play area the row also belongs to
  - **Issue**: `src/render.ts:499` says the 20 "is what keeps that blanking
    clear of the two readouts that share the row", and names the gaps it leaves
    `COMBO x8` and `BOSS 20/20` at the 60-column floor. Both figures check out.
    What the paragraph does not say is that `HUD_ROWS` is also `gameTop`, so
    `drawBanner` blanks 20 cells of the play area's top row, and `drawHUD` runs
    after `drawTunnel` and `drawEntitiesFar`. Measured by rendering a flown run
    at three grids with no banner live and collecting the non-space columns of
    row 3: at 60 and 80 columns the far tunnel mouth sits inside the span
    `>> WARNING <<` already covered, so nothing changes, but at 128 columns the
    mouth reaches columns 55, 56, 70 and 71 while the warning covers 57 to 69 -
    so a warning or a `[ NEW BEST ]` now blanks four cells of tunnel that the
    old draw left standing. It is four cells for two or three seconds and the
    trade is almost certainly the right one; what is missing is any record that
    the trade was made, in the one docstring whose subject is how far the
    blanking reaches.
  - **Goal**: Add a sentence to `BANNER_FIELD` saying the field is blanked out
    of the play area's own top row as well as clear of the readouts, with the
    four cells at 128 columns as the cost and the reason it is accepted. No
    code change is wanted unless the measurement says otherwise.
  - From: UI/UX Override - the drops are three cells for one frame
