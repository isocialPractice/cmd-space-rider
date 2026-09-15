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
