# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.
  - From: Bigger Features

### Code Review Override - the second clip, and the probe nothing published

#### Found Issues

- [ ] Four docstrings still say `drawBullets` has one clip and the hit test
  reads it, and this release gave it a second one the hit test does not read
  - **Issue**: `drawBullets` now draws by `inCorridor(col, row) && !onDrop(col,
    row)` (`src/render.ts:476`, `index.html:3022`) while `contacts` still reads
    `tracerDrawn` alone (`src/game.ts:1702`). Four passages state the single
    clip as an invariant, and none was touched: `drawBullets`' own docstring,
    eleven lines above the paragraph that introduces the second clip - "The hit
    test reads the same clip, and that is the whole of what it shares with this:
    a frame that draws no tracer registers nothing on that frame"
    (`src/render.ts:399`, `index.html:2953`); `tracerDrawn`'s - "Read by
    `drawBullets` and by the pulse cannon's hit test, which is the whole reason
    it is one function" (`src/types.ts:303`); and `contacts`' in both builds -
    "neither a target that is not being drawn nor a tracer that is not being
    drawn can be half of a contact" and "the two cannot come to state different
    corridors" (`src/game.ts:1596` and `:1601`, `index.html:2391` and `:2394`).
    Name the state: the release's own staged scene, the ship held at `x: 0`, a
    boss killed at z=-190, the axis column strung with bolts. A bolt projects
    into the middle drop's cell, `drawBullets` paints no bar there - which is
    what the three new `test/boss.test.mjs` cases assert, and disabling the clip
    in both builds fails exactly those six and nothing else - and `tracerDrawn`
    still returns true for that cell, so `contacts` counts a tracer the player
    was not shown. The behaviour is the right one, since a pickup absorbing a
    shot would be worse than the defect being fixed; what is wrong is that one
    docstring now contradicts itself inside a single comment block and three
    others state a property the code stopped having.
  - **Goal**: Leave the behaviour alone and reconcile the four passages. Say
    that the corridor clip is the one the hit test shares and the drop clip is
    deliberately not, with the reason: the drop clip is about what the player is
    being asked to read in a cell, not a statement that the shot is not in it.
    Worth saying in the same breath how far the exposure reaches, because it
    bounds the "saw no bolt, the block died anyway" case the corridor clip was
    added for: a drop's block is `size = max(1, floor(scale * 2))`, which is 1
    at every scale under 1 and so one cell at every depth in front of the ship,
    so the clip can take at most one of a bolt's two cells and the other is
    still painted - except where `bScr.row - 1 < gameTop` left the bolt one cell
    to begin with. Both builds, and `src/types.ts` as well as the two renderers.
  - From: Code Review Override - the second clip, and the probe nothing published
- [ ] `drawBullets` calls 48 frames "the read window" and `BOSS_DROP_HOLD` makes
  that window 36
  - **Issue**: `src/render.ts:425` and `index.html:2977` say a bolt "sat on that
    cell for 31 to 47 of the 48 frames of the read window". `BOSS_DROP_HOLD` is
    1.2 (`src/types.ts:716`), which is 36 frames at 30 fps, and that is how the
    suite derives the window - `Math.round(build.BOSS_DROP_HOLD * 30)` in all
    three of the new `test/boss.test.mjs` cases. The same release's changelog
    entry keeps the two figures apart on purpose, writing "inside the 1.2 s
    hold" for the window and "the 48 frames watched" for the measurement, so the
    docstring is the one copy that merges them. Name the reader: anyone deriving
    the read window from the constant gets 36 and finds a docstring in both
    builds claiming it is 48.
  - **Goal**: Call the 48 what the changelog calls it - the frames watched - in
    both builds, and leave "read window" for the 36 that `BOSS_DROP_HOLD` buys.
  - From: Code Review Override - the second clip, and the probe nothing published
- [ ] `test/probes/drop-clip.mjs` reached the rig and none of the published
  probe listings
  - **Issue**: the probe is wired correctly - `test/probes/probes.mjs` declares
    it and `test/probes.test.mjs` discovers it off its own source, so the suite
    runs it without a line being added. The published pages are the half that
    did not move. `docs/project-structure.html:33` to `:41` lists all nine other
    files in `test/probes/` by name with a one-line description each and omits
    this one, so the tree publishes a directory the repository no longer has.
    `docs/development.html:33` explains the flag as "the placement walk in
    `column`, `frame-rate` and `seen-versus-kill`, and the frame count in
    `free-flight`", and `CHEATSHEET.md:136` with its published copy
    `docs/cheatsheet.html:59` says the same; `drop-clip` reads `--count` as
    frames per figure and `--passes` as measurements of the pair, which its own
    header says at `test/probes/drop-clip.mjs:28`, so both enumerations are a
    probe short. Name the reader: someone working out what
    `npm run probe -- drop-clip --count 1` narrows finds the probe in neither
    list and the file in neither tree.
  - **Goal**: Add `drop-clip.mjs` to the tree in `docs/project-structure.html`
    in the shape the other nine use, and name it in the `--count` sentences in
    `docs/development.html` and `CHEATSHEET.md`. The cheatsheet's published copy
    has to move with the markdown, since `test/docs-site.test.mjs` reads every
    published page against the repository file it is published from. While in
    `docs/development.html`, close the blank line this release left at `:50`
    between the new `drop-clip` paragraph and the one after it - no other pair
    of paragraphs in that file carries one.
  - From: Code Review Override - the second clip, and the probe nothing published

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

> 161 earlier items in `TODO-archive.md`, newest last.

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
- [x] Encounter Legibility 3 - the hold keeps the three in three cells and the
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
- [x] `COMBO x8` is eight columns wide, not the ten its own header claims
  - **Issue**: `test/hud-row.test.mjs:23` says the counter "tops out at COMBO
    x8, ten columns wide ending at column 9". `drawHUD` writes it with
    `screen.putString(2, HUD_ROWS, combo, ...)` at `src/render.ts:612` and
    `COMBO x8` is eight characters, so it occupies columns 2 through 9 - eight
    columns wide, not ten. Both figures the paragraph derives from it are
    right: it does end at column 9, and `BANNER_FIELD`'s 20 does open at
    column 20 on the 60-column floor, which is the 10 columns of gap the
    header claims. Only the width is wrong. This is the one file the
    repository points the next editor at to do that arithmetic, so it is the
    figure a reader would carry into the next change, and the `COMBO_MAX` end
    of the margin is the one it would be carried into. The phrase predates
    this turn; the turn rewrote the paragraph around it without correcting it.
  - **Goal**: Say eight columns wide, or drop the width figure and keep
    "ending at column 9", which is what the gap is actually derived from.
  - From: UI/UX Override - the middle drop is under the tracer
- [x] Three em dashes entered `test/hud-row.test.mjs` against the house style
  - **Issue**: The rewritten header uses em dashes mid-sentence at
    `test/hud-row.test.mjs:3`, `:4` and `:23`. Twenty of the repository's
    twenty-one `test/*.test.mjs` files carry exactly one em dash - the
    one on their title line, after the file's own path - and spaced hyphens
    everywhere else. Every
    other file this turn edited added none: `src/types.ts`, `src/game.ts`,
    `src/render.ts`, `index.html`, `test/parity.test.mjs` and `CHANGELOG.md`
    are all hyphens. This file now carries four.
  - **Goal**: Replace the three mid-sentence em dashes with spaced hyphens and
    leave the title line on line 1 as it is, since that one is the convention.
  - From: UI/UX Override - the middle drop is under the tracer
- [x] `test/powerups.test.mjs` builds drops without the `hold` the type now requires
  - **Issue**: Eight fixtures - lines 188, 201, 218, 234, 243, 255, 270 and
    419 - build `{ x, y, z, kind }`, but `Powerup` now requires `hold`
    (`src/types.ts:137`) and both of the engine's two creation sites set it.
    The tests still pass and still exercise what they mean to, because
    `undefined > 0` is false and so the drift branch runs - but they pass on
    that coercion rather than on a declared value, and this file is the
    repository's whole coverage of the drift. The hazard is not hypothetical:
    an assertion of the form `assert.equal(p.hold, build.BOSS_DROP_HOLD)`
    passes vacuously while both sides are `undefined`, which is what
    `test/boss.test.mjs:663` would have done until `test/helpers.mjs` exported
    the constant this turn.
  - **Goal**: Add `hold: 0` to the eight fixtures so they match the shape
    `dropPowerup` produces. Nothing should change behaviourally and the suite
    should stay green.
  - From: UI/UX Override - the middle drop is under the tracer
