# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Warp speed transition** — Visual effect when crossing difficulty thresholds (every 60s). Brief tunnel color shift, speed lines intensify, and a "WARP LEVEL 2" flash in the HUD.
  - From: Medium Effort
- [ ] **Powerup drops** — When a mine is destroyed, chance to drop a powerup that drifts toward the player:
  - Shield Regen (green +) — restores 25 shield
  - Rapid Fire (cyan !) — 3x fire rate for 10 seconds
  - Slow Motion (magenta ~) — halves game speed for 5 seconds
  - From: Medium Effort
- [ ] **Touch controls (mobile browser)** — Add on-screen virtual joystick (left side) and fire/boost buttons (right side) for mobile play. Only show when touch events are detected. The canvas grid system already works at any viewport size.
  - From: Medium Effort
- [ ] **Favicon from icon.svg** — Inline the icon SVG as a data URI favicon in index.html so the browser tab shows the ship icon.
  - From: Polish
- [ ] **Prefers-color-scheme** — Detect system dark/light mode. Default is dark (game natural state). Light mode could invert to white background with dark tunnel walls for accessibility.
  - From: Polish

### Code Review Override - the tuning table is right and the repository cannot check it

- [ ] The figures behind `SHOT_SLACK_ROWS` cannot be reproduced from anything the repository ships
  - **Issue**: Every number in the table is correct - this review checked all of
    them - but the only instruments that produce them are `.tmp/hits/vertical.mjs`
    and `.tmp/hits/horizontal.mjs`, scratch files in a directory the repository
    does not ignore, does not track and does not mention. The comment gives the
    method as "aiming dead on one axis and biasing the ship off the target on the
    other before firing", and that description also fits `sweep` in
    `test/pulse-cannon.test.mjs`, which answers differently over the same 80 to
    140 band: 28/58 where the table says 39% for a world unit of vertical error,
    57/58 where it says 100%, and 55/60 where it says 82% a column out. Neither
    reading is wrong - the probes walk 30 placements over target heights 1.5 to
    4.0 and fire within 0.05 units, `sweep` walks 60 over 0.5 to 4.5 and fires
    within 0.15 - but nothing written down says which produced the table. A
    reader who checks it against the suite concludes the table is wrong. This
    review did exactly that, rewrote the figures in all three copies, and only
    caught it on finding the probes in `.tmp`; the numbers were restored.
  - **Goal**: Make the table checkable without `.tmp`. Either record the harness
    beside the figures - placements, target height range, firing tolerance, range
    band - so a reader can rebuild it, or pin the probes into the suite: `engage`
    already takes `dy`, so a `dcol` bias beside it would let one test walk both
    axes and hold the table to its own numbers. If they are pinned, say which
    walk is canonical, because the two disagree and only one can be the figure
    the comment quotes. The table is duplicated in `src/types.ts`, `index.html`
    and the `0.3.7-alpha` CHANGELOG entry, so all three move together, the way
    `test/parity.test.mjs` already holds the constants themselves.
  - From: Code Review Override - the tuning table is right and the repository cannot check it

### User Overrides

- [ ] Pulse cannon: a tracer drawn straight through an enemy does not destroy it
  - **Issue**: Reopens "pulse cannon hit detection: Collision still not
    registering", archived complete while its symptom - about one kill in
    five - is still there. A screen capture of a run shows six kills in about
    16 seconds with volleys in the air through most of it, and on frames 159
    to 163 (0-indexed) a bolt climbing through a red block, overwriting its
    cells, with no explosion. The capture's cells are about 9x19 px, so the
    play field is roughly 205 columns by 50 rows. Every check in
    `test/pulse-cannon.test.mjs`, and every figure behind `SHOT_SLACK_COLS`
    and `SHOT_SLACK_ROWS`, was taken at 80x24, and the hit test is not
    size-neutral, which is how the item closed with the fault still live.
  - **Goal**: The three children land in one run: the suite at the size the
    game is played, the hit taken where the screen shows it, and the height
    rules the second one retires. Done when a tracer drawn on an enemy's cells
    always destroys it, at any grid size, and no enemy is destroyed by a
    tracer that never reached it. The figures below were taken on an
    untracked sandbox copy of the engine; the probes under `## Measurement`
    are their tracked replacements, and where a probe disagrees its figure is
    the one to use. Both builds together, as `test/parity.test.mjs` expects.
  - From: User Overrides
  - [ ] Run the pulse cannon checks at the size the game is played
    - **Issue**: `W = 80` and `H = 24` are module constants, read by
      `emptyRun`, `seeShip`, `seeBlock`, `stagedShot`, `sweepByEye` and both
      column-slack checks. Replayed at 205x50, the file's own `sweep` walk
      fails four of its guards: at 15 to 35 only 12 of 60 engagements resolve
      (48 are rams), under `shots > 20`; a lone shot lands 43/52 at 35 to 80
      (floor 90%) and 16/57 at 80 to 140 (floor 65%); the volley lands 45/57
      at 80 to 140 (floor 90%). The same replay at 80x24 resolves 21 at 15 to
      35 and lands 58/58, 44/58 and 57/58 - the figures the file and the
      CHANGELOG already quote - so the walk is the suite's and the difference
      is the grid. Flown as the capture shows it, ship held at the floor and
      lined up by column, a volley kills 35/120 at 20 to 60 and 30/120 at 60
      to 140 at 205x50, against 109/120 and 100/120 at 80x24.
    - **Goal**: Take the grid as a parameter and run the engagement checks at
      80x24, at the 60x20 minimum the browser enforces, and at 205x50. Add the
      check the capture asks for, read off the rendered grid: over a walked
      set of engagements at several ship heights, any frame where a tracer
      cell lands on a cell of the target's block is followed by that target's
      destruction, and no kill is registered unless the killing shot's tracer
      was on the block, or within `SHOT_SLACK_COLS` beside it, on the kill
      frame or the one before. Take the block's cells from a render with the
      bullet list emptied, since `drawBullets` overwrites them. These fail at
      205x50 against the engine as it stands, so they land with the fix, not
      ahead of it. The shared engagement module described under
      `## Measurement` is the same move; whichever lands first makes it.
  - [ ] Register the hit where the screen shows it
    - **Issue**: `updateBullets` tests a shot against a target once, at the
      depth where `crossing()` says the two pass, comparing rows projected at
      that depth. The drawn row mixes depth and height, so when shot and
      target differ in height they meet on screen on a different frame from
      the one where they meet in depth - and the screen is all the player
      has. At the crossing the rows are
      `(o.y - b.y) * gameH * 0.4 * scale / 8` apart: 0.95 rows per unit of
      height at full scale on a 24-row screen, 2.25 on a 50-row one, so a row
      of slack covers less than half the height at the capture's size. The
      test misses, `crossing()` never fires for that pair again, and the
      tracer climbs through the block frames later with nothing tested.
      Measured on a copy of `index.html`'s projection, hit test and draw
      geometry - 150 walked placements (x -4.5 to 4.5, y 0.5 to 4.5), ship at
      heights 0, 1, 2.5 and 4.5 lined up by column, volley fired, every frame
      rendered - the engine kills 50% at 20 to 60 and 33% at 60 to 140 at
      205x50, and 52% and 66% of the flights whose tracer was drawn on the
      block end without a kill. At 80x24 it is 93% and 84%, with 7% and 18%
      drawn through: smaller, the same fault. Sizing the vertical slack in
      world units instead of rows lifts 205x50 to 93% and 67% but still
      leaves 9% and 30% drawn through alive, so that is not the fix.
    - **Goal**: For obstacles and mines alike, register a shot when its
      tracer cells - both halves, placed as `drawBullets` places them - meet
      the cells `drawEntitiesFar` gives the target (same `size` and `half`),
      with `SHOT_SLACK_COLS` either side and no row slack, and only for a
      target that is being drawn. Test the relative row across the frame as
      well as at its end, so a long `dt` cannot step a tracer over a block,
      and leave the held column alone. Prototyped that way with the volley
      unchanged, it kills 98% and 83% at 205x50 and 99% and 98% at 80x24,
      leaves no drawn-through tracer without a kill, and registers no kill
      without at least side-by-side contact. The prototype still changed its
      verdict across `dt` 1/60 to 1/6 on 7 of 300 placements at 205x50 (1 of
      300 at 80x24), so tighten the sweep until "a shot resolves the same way
      at any frame rate" passes on a walk at both sizes, not only its three
      placements. A kill will land with the shot well off the target's
      depth, from -33 to +46 units at 205x50, which is what this projection
      draws and needs no gate beyond "is drawn".
  - [ ] Retire the rules that make height an aiming axis
    - **Issue**: Once the hit is taken on screen, height stops deciding a
      kill: a tracer climbs its whole column and meets whatever is drawn in
      it. On the prototype at 205x50 the kill rate is flat across the height
      gap between ship and target - 85/94 at 0 units, 172/187 at 1, 130/150
      at 2, 98/111 at 3, 44/57 at 4. The capture asks for exactly that, and
      it contradicts rules the repository states: "the vertical slack is a
      cell of forgiveness, not an aimbot" requires nothing to land four units
      off; the vertical-slack pair and "a volley survives the vertical aim
      error" place shots by `unitsPerRow`; `stagedShot` aims at the crossing
      depth; and `SHOT_SLACK_ROWS` carries its table in `src/types.ts`,
      `index.html`, the `0.3.7-alpha` entry and a README note. That table's
      premise, "one row spans about two world units", is an 80x24 fact: at
      205x50 a row is 0.7 to 1.1 units across the same 80 to 140 band.
    - **Goal**: The user has confirmed that height is not to stay an aiming
      axis, so there is no alternative to weigh. Replace the aimbot ceiling
      with the rule that now holds - a tracer that never touches a block
      never destroys it, at any height - replace the vertical-slack pair with
      the contact checks above, re-aim `stagedShot` by screen contact, and
      retire `SHOT_SLACK_ROWS` from both builds and `test/parity.test.mjs`.
      That removes the table the open Code Review Override item wants made
      reproducible; close that item with a note saying so. Correct the
      `0.3.7-alpha` entry's "one row spans about two world units" where it
      stands, since it states an 80x24 measurement as a general fact, and
      write the new entry and README note around the screen rule.

- [ ] Long shots fall off on wide screens
  - **Issue**: With the hit taken on screen, a lined-up volley at 60 to 140
    kills 83% at 205x50 against 98% at 80x24. What remains is a visible miss -
    the tracer passing a column or more beside a one-cell target - and it
    grows with width. `SHOT_SLACK_COLS` was tuned at 80 columns, while a
    target's outward creep over a long flight scales with `colRange`, 37 at 80
    wide and 99.5 at 205. The volley is sized in world units too: the side
    bullets sit 1.16 columns out at 80 wide and 3.11 at 205, not the
    "one-column spread" the comments in `updateBullets` and the test file
    describe. Pinning them at one column made the prototype worse (54% at 60
    to 140), because the wide spread is absorbing part of the creep.
  - **Goal**: Bring the long band at 205x50 within a few points of 80x24
    without a kill the tracer did not visibly reach: scale the column slack
    with `colRange`, or lead the shot by the creep it will meet, and hold
    either to the contact checks. Measure it with the column probe under
    `## Measurement`. Correct the one-column wording whichever way it goes.
    Both builds together, as `test/parity.test.mjs` expects.
  - From: User Overrides

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

- [ ] **Shots die short of what the tunnel shows** - A bullet's two second life
  at 60 units a second gives it about 120 units of travel, and a target closes
  on it at the run's speed, so the furthest a shot can reach is a little over
  150 units. The tunnel is drawn to `maxViewZ`, which is 200. Firing straight
  down the middle at a target parked dead ahead lands at every range from 30 to
  150 units and misses at every range from 160 up, so the outer fifth of what
  the player can see cannot be shot at all, with nothing on screen saying why.
  Decide whether the reach should cover the draw distance - a longer `life`, a
  faster shot, or a shorter `maxViewZ` - and pin it in `test/pulse-cannon.test.mjs`
  beside the range bands. Both builds together, as `test/parity.test.mjs` expects.

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

- [ ] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.
- [ ] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.
- [ ] **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.

## Measurement

Probes that produce the figures quoted in comments, tests, TODO items and the
CHANGELOG. Each prints its method beside its numbers - grid, placement walk,
ship heights, range band, frame rate - so a figure can be rebuilt from the
repository alone instead of from scratch files in `.tmp`. Probes report; the
assertions stay in `test/`.

- [ ] **Probe rig on the real engines** - A tracked home for the probes, such
  as `test/probes/`, which `node --test "test/*.test.mjs"` does not pick up,
  run through an `npm run probe -- <name> --grid <W>x<H>` script that builds
  `out/` first, as `npm test` does. The rig loads the browser engine through
  `loadBrowserEngine` and the terminal engine from `out/`, and runs every
  probe against both, so no probe measures a transcription: the pulse cannon
  figures under `## Current` were taken on a sandbox copy, and a copy drifts.
  Move `engage`, `sweep`, `stagedShot`, `seeShip` and `seeBlock` out of
  `test/pulse-cannon.test.mjs` into a shared module that takes the grid as a
  parameter, so the tests and the probes fly the same engagement; the pulse
  cannon item's first child needs the same move, and whichever lands first
  makes it. Every probe prints the grid, the placement walk, the ship
  heights, the band and `dt` above its table. `.tmp/hits/horizontal.mjs`
  folds into the column probe below; `.tmp/hits/vertical.mjs` measures
  `SHOT_SLACK_ROWS`, which the pulse cannon item retires, so it goes with it.
  Say which happened to each in the CHANGELOG.
- [ ] **Seen-versus-kill probe** - Whether a kill agrees with what the screen
  drew, which is the measurement behind the pulse cannon item. Walk 150
  placements - x = -4.5 + 9i/149, y = 0.5 + 4((7i) mod 150)/149,
  z = -(near + (far - near)((13i) mod 150)/149) - at ship heights 0, 1, 2.5
  and 4.5, set the ship on the target's drawn column, fire the volley, and
  render every frame with `renderGame`. Report per grid and per band (20 to
  60, 60 to 140): the kill rate; the share of flights with a tracer drawn on
  the block that end without a kill; the share of kills with no tracer on the
  block; and the share with no tracer even beside it within
  `SHOT_SLACK_COLS`. Score the kill frame from the target as it stood before
  the kill recycled it and from the killing shot before it was spliced - read
  after the frame, every kill looks unseen. Tell a ram apart by the shield,
  as `engage` does. Break the kills down by the height gap between ship and
  target, rounded to a unit, and give the spread of shot z minus target z at
  the kill, since those two say whether height still decides a hit. Also fly
  the ship held at the floor alone, which is how the capture was played. The
  sandbox copy gave, at 80x24, kills of 93% and 84% with 7% and 18% drawn
  through, and at 205x50, 50% and 33% with 52% and 66%; floor-held over a
  120-placement walk, 109/120 and 100/120 at 80x24 and 35/120 and 30/120 at
  205x50.
- [ ] **Suite replay at any grid** - Run the test file's own bands at a given
  grid - `sweep` at 15 to 35, 35 to 80 and 80 to 140 for a lone shot, 80 to
  140 for the volley, and `sweepByEye` at 35 to 80 and 80 to 140 - and print
  each as landed over resolved beside the floor the test pins, with the ram
  count. This is how a floor is checked at a new size before a test is
  written for it. The sandbox copy gave, at 80x24, 21 resolved at 15 to 35
  (39 rams), then 58/58, 44/58 and 57/58; at 205x50, 12 resolved (48 rams),
  then 43/52, 16/57 and 45/57. `sweepByEye` was not replayed and has no
  figure at 205x50 yet.
- [ ] **Frame-rate walk** - Fly each placement at `dt` 1/60, 1/30, 1/20, 1/12
  and 1/6 and count the placements whose verdict changes, over 300 flights:
  150 placements between 20 and 140 units at ship heights 0 and 2.5. The
  existing check holds three placements; this is the walk the pulse cannon
  item asks it to pass. The screen-space prototype changed on 1 of 300 at
  80x24 and 7 of 300 at 205x50, against a target of none.
- [ ] **Column probe** - The measurement for "Long shots fall off on wide
  screens": the side bullets' distance from the centre bullet in columns at
  the muzzle (1.16 at 80 wide, 3.11 at 205), a target's column creep over a
  flight at each range, and the 60 to 140 kill rate for a given column slack
  and volley spread, with the seen-versus-kill contact shares beside it so a
  wider slack cannot buy kills the tracer did not reach. The sandbox
  prototype gave 98% at 80x24 and 83% at 205x50 with the volley as it is,
  and 54% at 205x50 with the side bullets pinned one column out. Takes over
  from `.tmp/hits/horizontal.mjs`.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 24 earlier items in `TODO-archive.md`, newest last.

- [x] Tracer Wall Clip 1
  - **Issue**: The corridor test admits the wall columns themselves, so the
    tracer now erases the wall instead of stopping inside it. `drawTunnel`
    draws the wall glyph *on* `leftWall` and `rightWall` (`src/render.ts:143`,
    `src/render.ts:147`), with thickness growing outward from there, so the
    corridor is `left + 1` to `right - 1`. `inCorridor` tests
    `col >= span.left && col <= span.right` (`src/render.ts:252`), and
    `drawBullets` runs after `drawTunnel` in `renderGame`, so a tracer landing
    on a wall column overwrites it. Read off the grid at 80x24: fired from
    -4.5, 24 of the flight's 218 tracer cells sit on a wall column; from 4.5,
    24 of 242; from -6.5, 12 of 47; from 6.5, 23 of 70. Down the middle it
    never happens. Wall thickness is `max(1, floor(t * 3))`, which is a single
    cell for every row above t = 2/3, so on rows 3 to 15 the wall is not
    thinned but erased: fired from -4.5, frame 28 leaves row 13 reading `││`
    where rows 11, 12, 15 and 16 still carry `▒` and `▓`, a one cell hole in
    the wall that travels up with the shot. The ring rows go the same way,
    since `╣` and `╠` are drawn on those exact columns (`src/render.ts:154`,
    `src/render.ts:155`). The docstring above `drawBullets` says the tracer is
    "drawn only while it is still inside the corridor", and the two new tests
    assert the inclusive bound instead, so the test pins the defect rather
    than the intent.
  - **Goal**: Decide whether a wall column counts as inside the corridor, then
    make the code, the docstring and the tests say the same thing. Excluding
    it (`col > span.left && col < span.right`) is the reading that matches the
    docstring and stops the erasure; measured, it costs the centre nothing
    (59 of 59 frames), takes -4.5 from 46 drawn frames to 40 and -6.5 from 17
    to 11, and leaves 4.5 and 6.5 untouched at 46 and 17. Weigh that
    asymmetry first: it comes from `center = floor(w / 2)` sitting half a cell
    off the true centre on an even width, so the left wall is reachable and
    the right one is not, and it may deserve fixing ahead of the bound. Then
    move what the change moves: `TRACER_FLIGHTS` in
    `test/pulse-cannon.test.mjs` pins `minDrawn: 12` for the wall shots, which
    11 fails, and `minDrawn: 40` for ±4.5, which would sit with no margin; the
    span assertions in both new tests carry the inclusive bound; and the
    `0.3.5-alpha` CHANGELOG entry quotes 46 and 17 as single figures for a
    pair of sides that would no longer agree. Confirm with the probe the entry
    already rests on - that no kill lands on a dark frame - since the clip
    tightening by a column moves the tracer dark earlier. Both builds
    together, as `test/parity.test.mjs` expects.
  - From: UI/UX Override - pulse cannon tracer leaves the drawn tunnel
- [x] The CHANGELOG credits a `.gitignore` the repository does not have
  - **Issue**: The `0.3.5-alpha` entry says "The repository's `.gitignore`
    un-ignores the file, because a global dotfile rule on this machine hid it
    from `git add` entirely." No `.gitignore` is tracked here - `git ls-files`
    lists no dotfile at all, and `git log --all -- .gitignore` is empty - and
    the file cannot be added, because the global excludes file carries both
    `.*` and a bare `.gitignore`. So the five line comment and the
    `!.gitattributes` rule this run wrote live in a file that will never be
    committed, while a published CHANGELOG points readers at it;
    `.claude/commit-mode.request` is `update`, so that entry is pushed.
    Nothing is broken today: `.gitattributes` is currently untracked and not
    ignored, `git add` carries it, and ignore rules stop applying to it once
    it is tracked. The exposure is the next dotfile the project needs -
    `.editorconfig`, `.npmrc`, `.nvmrc` all match `.*` - which would be
    invisible to `git add` with no error, and the only thing that would
    un-ignore it is a file that is itself never committed.
  - **Goal**: Make the entry describe what is actually in the repository.
    Either say plainly that the un-ignore is a local, untracked workaround for
    this machine's global excludes and that `.gitattributes` is what every
    clone gets, or track the `.gitignore` so the sentence becomes true - which
    also puts the `out/`, `node_modules/` and `test-results/` rules in the
    repository, where none of them are today. The global excludes file names
    `.gitignore` twice, so treat not committing it as deliberate until the
    user says otherwise, and prefer correcting the sentence. The README's new
    "Line Endings" section ends "Nothing to configure locally", which holds
    for `.gitattributes` and not for the un-ignore, so move it either way.
  - From: Code Review Override - the tracer is clipped to the wall, not to the corridor
- [x] pulse cannon hit detection: Collision still not registering
  - **Issue**: Hit detection works for maybe 1 out of 5 enemies
  - **Goal**: Hit detection works for all enemies
  - From: User Overrides
- [x] The left wall's climb floor is zero, and the comment above it says why in terms the grid does not show
  - **Issue**: `TRACER_FLIGHTS` pins `minClimb: 0` for `shipX: -6.5`
    (`test/pulse-cannon.test.mjs:361`), and the assertion it feeds reads
    `flight.firstRow - flight.lastRow >= minClimb`
    (`test/pulse-cannon.test.mjs:392`), so that row of the table is `0 >= 0`
    and cannot fail for any flight - including one drawn on a single row, and
    including one drawn on no rows at all, where `flyTracer` leaves both ends
    `null` and `null - null` is `0`. The comment above the table justifies it
    with "Fired from the left wall a shot goes dark before it has climbed a
    row at all" (`test/pulse-cannon.test.mjs:354`), and the flight does climb.
    Read off the rendered grid at 80x24, both builds identically, the -6.5
    volley is drawn on 11 frames whose topmost tracer row runs 19, 19, 19, 19,
    18, 18, 18, 18, 18, 18, 18, so `firstRow - lastRow` is 1. `minClimb: 1` -
    the value this run replaced - still passes. Every other row of the table
    keeps a margin of one or two below its measured climb: the centre climbs
    10 against a floor of 8, -4.5 climbs 6 against 4, 4.5 climbs 7 against 5,
    and 6.5 climbs 2 against 1. Only the left wall's floor was dropped to a
    number that pins nothing, and the drawn-frame floor beside it
    (`minDrawn: 9` against a measured 11) is doing all the work that row does.
  - **Goal**: Put the floor back at a value that can fail - 1 is both the
    measured climb and the figure the run replaced - and rewrite the comment
    to say what the flight does, which is climb one row over its 11 drawn
    frames before the clip takes it. If a floor of 0 is wanted deliberately,
    say plainly that the left wall's climb is not pinned and why, rather than
    stating a climb the grid contradicts. Both builds together, as
    `test/parity.test.mjs` expects.
  - From: Code Review Override - two claims the run wrote that its own measurements do not support
- [x] The README and CHANGELOG say `git add` fails silently on an ignored dotfile, and it does not
  - **Issue**: The README's Line Endings section tells a reader that a global
    excludes file "hides it from `git add` with no error and no output, so if
    a dotfile you staged never appears in `git status`" they should go looking
    (`README.md:211`), and the amended `0.3.5-alpha` CHANGELOG entry repeats
    it as a global excludes file "that hides dotfiles from `git add` with no
    error" (`CHANGELOG.md:95`). Naming the path is the case that does report.
    Run in this repository with the global rule live, `git add .gitignore`
    prints "The following paths are ignored by one of your .gitignore files:",
    the path, and "hint: Use -f if you really want to add them.", and exits 1.
    Only the bulk forms - `git add .` and `git add -A` - pass over an ignored
    path without saying so. Both documents are published:
    `.claude/commit-mode.request` is `update`. The cost is the diagnosis the
    README hands the reader, which sends someone whose `git add <file>` just
    failed loudly looking for a silent failure, when the error git already
    printed names the `-f` the README goes on to recommend.
  - **Goal**: Narrow both sentences to the form they are true of: a bulk
    `git add .` skips an ignored dotfile silently, while naming the path
    reports it and exits non-zero. Keep the `git check-ignore -v --no-index
    <file>` and `git add -f <file>` advice, which is right either way. The
    `0.3.5-alpha` entry is tagged, so correct its sentence where it stands -
    what is wrong is that entry's own account of how the file came to be
    added, not something a later entry can supersede.
  - From: Code Review Override - two claims the run wrote that its own measurements do not support
