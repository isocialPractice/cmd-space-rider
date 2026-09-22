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
- [ ] **The page's use of the fitted grid has no check** - `fitGrid` itself is
  pinned in `test/menu-layout.test.mjs`, but what the page does with it is not:
  `handleResize` carrying the fitted grid through to the `ScreenBuffer` the
  renderer writes into, and `frame()` drawing the notice and returning early
  while the window is under the floor. Both sit below the
  `// ===== Canvas Setup & Sizing =====` marker `test/helpers.mjs` stops at, so
  nothing in the suite can reach them, and the browser is the only thing that
  has ever checked either. Measured in a real chromium window: a run at 900x600
  taken down to 200x120 and back came up on the same run, score 159 to 189 and
  distance 18.0 to 21.0, with no title screen in between. Lift the re-seating
  out of `handleResize` the way `fitGrid` was already lifted out of it - a pure
  function taking the game and a fitted grid - and export it through
  `test/helpers.mjs`. Then assert that re-seating a playing run at a grid under
  the floor and again at one above it leaves `mode`, `score` and `distance`
  untouched and leaves the buffer at the new grid's size. Browser only: a
  terminal cannot be smaller than its own grid, so the CLI build has no
  equivalent and `test/parity.test.mjs` has nothing to pair it with.

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

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 44 earlier items in `TODO-archive.md`, newest last.

- [x] **A slow frame rate leaves the flight unable to pair any of its kills**
  - **Issue**: `freeFlight` takes `dt` as a parameter, and `DEBRIS_DRIFT` in
    `test/engagement.mjs` bounds a burst against its own block at a flat half a
    unit. That bound is one frame of a particle's own velocity, so it grows with
    the frame: `spawnParticles` draws `vx` and `vy` from -3 to 3 and `vz` from
    -1 to 2, and `updateParticles` carries z by `(vz + advance) * dt`, so at
    `dt` of 1/6 the z term alone clears half a unit on its own. The burst then
    names no block, and the kill goes unread. Flown over the whole matrix, the
    share of kills left unpaired is 4%, 3%, 2% and 3% at `dt` of 1/60, 1/30,
    1/20 and 1/12, and 83% at 1/6 - which would take the `read / kills >= 0.75`
    floor the same run added straight through the floor. Nothing reaches it
    today, since no caller passes `dt` and the default is `FRAME`, but the frame
    rates the suite's own frame-rate walk uses go to 1/6, so the parameter reads
    as though those rates were supported.
  - **Goal**: Decide whether the flight supports a slow frame at all. If it
    does, the drift bound has to be derived from the frame rather than fixed -
    `3 * dt` on x and y and `(2 + advance) * dt` on z, with `advance` already in
    hand at the call site - and the naming re-checked at each rate, since a
    wider bound can also let a second block inside it and name nothing. If it
    does not, say so where `dt` is taken and pin the rates the flight is flown
    at. Widening the bound blind is the one thing not to do: it trades a kill
    left unread for a kill read against the wrong block.
  - From: Code Review Override - the flight's spreads and its frame rate
- [x] **The derived drift bound restates the engine with nothing holding it there**
  - **Issue**: `DEBRIS_VXY`, `DEBRIS_VZ_MIN` and `DEBRIS_VZ_MAX` in
    `test/engagement.mjs` restate the ranges `spawnParticles` draws `vx`, `vy`
    and `vz` from, and nothing in the suite compares the two. The comment over
    them argues the restatement is safe because "a restatement that drifts from
    the engine makes the pairing fail loudly, at every rate at once", and that
    holds in one direction only. A bound gone too tight does fail loudly. A
    bound gone too loose - which is what a narrowing in `spawnParticles` leaves
    behind - is silent: flown with all three widened tenfold, to 30 on x and y
    and -10 to 20 on z, the seeded matrix still clears every floor the flight
    pins, at 97.7%, 97.9% and 96.9% of kills read against the 75% floor, 99% to
    100% on or beside against the 90% floor, and no `unlit` at any grid.
  - **Goal**: Pin the three constants to the engine rather than to a comment.
    Draw a burst out of each build and assert every particle's `vx`, `vy` and
    `vz` sits inside what `debrisDrift` assumes, in both builds as
    `test/parity.test.mjs` expects, so a change to `spawnParticles` fails on a
    check rather than on nothing. Correct the claim over the constants either
    way: as it stands it credits the pairing with a guard half of it does not
    have.
  - From: Code Review Override - the drift bound and the flight's heights
- [x] **The free flight's ship heights are still a copy in each file**
  - **Issue**: This run moved the frame rates and the flight lengths into
    `test/engagement.mjs` and wrote the reason beside them - "One list rather
    than three", because "a rate added to one of them said nothing about the
    other two" - and left the heights where they were. `FREE_HEIGHTS` in
    `test/pulse-cannon.test.mjs` and `HEIGHTS` in `test/probes/free-flight.mjs`
    are both `[0, 6.5]`, written out twice, and every figure the probe prints
    for the suite to be checked against is summed over them. Change one and the
    probe prints a flight the suite does not fly, which is the drift
    `FRAME_RATES`, `FREE_FRAMES` and `FREE_RATE_FRAMES` were centralised to
    prevent.
  - **Goal**: Export the pair from `test/engagement.mjs` beside `FREE_SEEDS`
    and the flight lengths, and read it in both files. Leave `HEIGHTS` in
    `test/probes/frame-rate.mjs` alone - it is `[0, 2.5]` and belongs to the
    staged walk rather than to the flight.
  - From: Code Review Override - the drift bound and the flight's heights
- [x] **The three window constants are exported with nothing importing them**
  - **Issue**: This run promoted `DEBRIS_VXY`, `DEBRIS_VZ_MIN` and
    `DEBRIS_VZ_MAX` in `test/engagement.mjs` from `const` to `export const`,
    and nothing outside that file reads them - a grep over `test/`,
    `test/probes/` and the rest of the repository returns no importer. The
    check that needed them reads `DEBRIS_DRAWN`, which the same run added a few
    lines below and which already carries all three values, and
    `test/pulse-cannon.test.mjs` imports `killBurst`, `DEBRIS_DRAWN` and
    `BURST_REACH` and none of the three. `DRIFT_SLACK` sits in the same block
    doing the same job for `debrisDrift` and stays module-private, which is
    this file's convention for a number the checks never name, so the three are
    now in the module's public surface on their own.
  - **Goal**: Drop the `export` from the three and leave `DEBRIS_DRAWN` as the
    surface the checks read. If they are meant to be public instead, say beside
    them what is expected to read them. `npm test` stays at 325 passing either
    way.
  - From: Code Review Override - the burst check's exports and the changelog heading
- [x] **The heights centralisation is filed as a fix where its precedent is a change**
  - **Issue**: The `0.6.1-alpha` CHANGELOG entry puts both of its bullets under
    `### Fixed`. The second centralises the free flight's ship heights into
    `test/engagement.mjs` so two files stop keeping their own copy, which is
    the same kind of change, to the same file, for the same stated reason, that
    `0.6.0-alpha` recorded one version earlier under `### Changed` - "The frame
    rates every rate walk flies are one list in `test/engagement.mjs`". One
    refactor is described in two sections of the same changelog, so a reader
    scanning `### Fixed` for repaired defects meets a deduplication instead.
  - **Goal**: Move the heights bullet to a `### Changed` section under
    `0.6.1-alpha`, matching the `0.6.0-alpha` precedent, and leave the debris
    window bullet under `### Fixed` - that one repaired a guard that did not
    hold. Do not restate the version or re-cut the release.
  - From: Code Review Override - the burst check's exports and the changelog heading
