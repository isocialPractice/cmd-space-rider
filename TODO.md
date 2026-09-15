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

### User Override

- [ ] pulse cannon hit detection: Collision still not registering
  - **Issue**: Hit detection works for maybe 1 out of 5 enemies
  - **Goal**: Hit detection works for all enemies
  - From: User Overrides

### Code Review Override - two claims the run wrote that its own measurements do not support

- [ ] The left wall's climb floor is zero, and the comment above it says why in terms the grid does not show
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
- [ ] The README and CHANGELOG say `git add` fails silently on an ignored dotfile, and it does not
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

> 21 earlier items in `TODO-archive.md`, newest last.

- [x] **pulse cannon hit detection**: Resolve "pulse cannon" collision detection is off
  - **Issue**: Collision detection for the "pulse cannon" is off nearly 2/3 of the time.
  - **Goal**: Address and improve:
    - Hit registration
    - Hit scan
    - Target leading
  - From: User Overrides
- [x] **Tracer Wall Clip**: **A shot fired from a tunnel wall is drawn outside the tunnel**
  - **Issue**: Holding a screen column means a tracer no longer converges on
    the vanishing point, and the drawn tunnel does, so a shot fired from near
    a wall flies out of the corridor it was fired down. Read off the rendered
    character grid at 80x24, both builds identically: fired from the left wall
    the volley crosses the drawn wall on frame 16 of its 59 drawn frames,
    about half a second into a two second flight, and finishes 16 columns
    clear of the wall in the black margin; from the right wall it is 15. Fired
    from half a tunnel radius out it stays inside the corridor the whole way,
    so this is a wall effect, and the walls are where the aiming fix mattered
    most. It costs nothing in play - targets sit inside the tunnel and a shot
    aimed at one stays with it - and the previous build kept the tracer inside
    the corridor only by drifting away from the column the player aimed at.
    What is new is the reading: a cyan tracer climbing through empty space
    with the tunnel some distance to one side.
  - **Goal**: Decide whether a tracer may be drawn outside the drawn tunnel at
    all, and pin whichever way it goes. The flight itself should not move - the
    held column is the aiming fix and the hit rates depend on it - so the
    choice is a drawing one: clamp the glyph's column into the tunnel's span on
    its row so the shot rides the wall, stop drawing a tracer once it leaves
    the corridor, or accept it and say why in the comment above
    `updateBullets`. Both builds together, as `test/parity.test.mjs` expects,
    and pinned in `test/pulse-cannon.test.mjs` beside the drawn-tracer check
    added this run, which already reads the glyph's column off the grid.
  - From: UI/UX Override - pulse cannon tracer leaves the drawn tunnel
- [x] **This run's edits converted seven files from LF to CRLF**
  - **Issue**: The repository is LF, and every file this run did not edit still
    is: `src/index.ts`, `src/input.ts`, `src/menu.ts`, `src/render.ts`,
    `src/screen.ts`, `tsconfig.json` and the eight older `test/*.test.mjs`
    files carry no CR bytes at all. `core.autocrlf` is `false` and there is no
    `.gitattributes`, so whatever a tool writes is what gets committed. The
    editing this run did rewrote six tracked files wholesale as CRLF -
    `CHANGELOG.md`, `index.html`, `package.json`, `src/game.ts`,
    `test/helpers.mjs` and `test/parity.test.mjs` - and committed
    `test/pulse-cannon.test.mjs` as CRLF in 56adb56. Two files edited this same
    run, `README.md` and `src/types.ts`, stayed LF, so it is the editing path
    and not a global setting. Nothing fails: the suite passes 228 and `tsc` is
    clean, because CRLF is legal in every one of those formats. The cost is to
    the history. `git diff` reports 3098 insertions against 2895 deletions where
    the real change is 230 against 27, so the diff is unreadable without
    `--ignore-cr-at-eol`; committing it rewrites every line of those six files,
    which takes `git blame` on all of them to this commit and makes any later
    branch conflict on every line; and `.claude/commit-mode.request` is
    `update`, so it will be pushed. `TODO.md` went the same way on an earlier
    run and is already CRLF in `HEAD`, so this is a recurrence, not a one-off.
  - **Goal**: Settle the repository's line ending instead of leaving it to
    whichever tool writes a file next. LF is what is already committed, so
    convert the seven files back, which restores the diff to its real size.
    Then add a `.gitattributes` pinning it - `* text=auto eol=lf` across the
    `.ts`, `.mjs`, `.html`, `.md` and `.json` files here - so the next editor
    cannot reintroduce it. Verify with `git diff --stat` matching
    `git diff --stat --ignore-cr-at-eol`, and with `npm test` still at 228.
  - From: Code Review Override - line endings rewritten across seven files
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
