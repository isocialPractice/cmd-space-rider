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

### UI/UX Override - the pulse cannon in a real browser window

#### Found Issues

- [ ] **Small windows draw more grid than the canvas can show**
  - **Issue**: `handleResize` clamps `termWidth` and `termHeight` at the 60x20
    floor and builds a 60x20 ScreenBuffer, but the canvas is only as large as
    the window, so below that floor the extra cells are painted where nothing
    can display them. Measured in a real chromium window against the furthest
    painted cell: 600x360 shows the whole 60x20 grid; 500x320 loses 10 columns
    and 3 rows; 380x240 loses 22 columns and 7 rows. What goes is the right of
    the HUD, including the SHIELD readout, and the whole footer with the control
    hints and the speed. Nothing tells the player anything is missing. Pre-dates
    the screen-space hit rule - `MIN_WIDTH`, `MIN_HEIGHT` and `handleResize` are
    untouched by it - and the terminal build has no equivalent, since a terminal
    cannot be smaller than its own grid.
  - **Goal**: Decide what a window under the floor should do and make the page
    do it. Scaling the font down until 60x20 fits keeps the whole screen
    readable and matches the terminal build's promise that 60x20 is the minimum;
    drawing at the window's real size below the floor gives up the menu layouts
    the floor exists to protect. Either way the HUD and footer stay on screen or
    the player is told they cannot be. Pin it in `test/menu-layout.test.mjs` or
    beside it, against the grid the buffer is built at rather than the window.
  - From: UI/UX Override - the pulse cannon in a real browser window
- [ ] **The screen-space hit rule has no free-flight guard**
  - **Issue**: `test/pulse-cannon.test.mjs` pins both contact invariants at
    three grids in both builds, but every one of them flies a staged engagement:
    one target parked in an emptied run. The fault this work answers was found
    in free flight, with sixty obstacles in the air and volleys overlapping, and
    that is the shape no check in the suite has. Verified in a real browser
    instead - 1200 frames a flight at 192x60, 205x50 and 60x20, held on the
    floor and at the roof, with 0 frames showing a tracer drawn on a live block
    against 164 for the same detector with the hit rule switched off - which
    means the only guard against this regressing runs when the UI/UX agent runs,
    and not on a change.
  - **Goal**: Add a free-flight check to `test/pulse-cannon.test.mjs` on a pilot
    in `test/engagement.mjs` that flies a real run rather than staging one: hold
    the ship at a fixed height, line up on a target's drawn column off the
    rendered buffer, fire, and render every frame with `renderGame`. Assert over
    the run that no rendered frame leaves a tracer drawn on a block that is
    still there the frame after with the shot still in the air, and that every
    kill's contact sits inside `shotSlackCols` of the block's drawn edge. Fly it
    at all three grids in `GRIDS` and in both builds, as
    `test/parity.test.mjs` expects. Check it against the fault before trusting
    it, by forcing `contacts` to false and confirming it fails.
  - From: UI/UX Override - the pulse cannon in a real browser window

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

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 32 earlier items in `TODO-archive.md`, newest last.

- [x] **Probe rig on the real engines** - A tracked home for the probes, such
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
  - From: Measurement
- [x] **Seen-versus-kill probe** - Whether a kill agrees with what the screen
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
  - From: Measurement
- [x] **Suite replay at any grid** - Run the test file's own bands at a given
  grid - `sweep` at 15 to 35, 35 to 80 and 80 to 140 for a lone shot, 80 to
  140 for the volley, and `sweepByEye` at 35 to 80 and 80 to 140 - and print
  each as landed over resolved beside the floor the test pins, with the ram
  count. This is how a floor is checked at a new size before a test is
  written for it. The sandbox copy gave, at 80x24, 21 resolved at 15 to 35
  (39 rams), then 58/58, 44/58 and 57/58; at 205x50, 12 resolved (48 rams),
  then 43/52, 16/57 and 45/57. `sweepByEye` was not replayed and has no
  figure at 205x50 yet.
  - From: Measurement
- [x] **Frame-rate walk** - Fly each placement at `dt` 1/60, 1/30, 1/20, 1/12
  and 1/6 and count the placements whose verdict changes, over 300 flights:
  150 placements between 20 and 140 units at ship heights 0 and 2.5. The
  existing check holds three placements; this is the walk the pulse cannon
  item asks it to pass. The screen-space prototype changed on 1 of 300 at
  80x24 and 7 of 300 at 205x50, against a target of none.
  - Note: Reported two ways. The staged walk answers for the hit test alone,
    since a slow frame steers the ship in longer strides and so flies a
    different engagement; the flown walk at ship heights 0 and 2.5 is reported
    beside it.
  - From: Measurement
- [x] **Column probe** - The measurement for "Long shots fall off on wide
  screens": the side bullets' distance from the centre bullet in columns at
  the muzzle (1.16 at 80 wide, 3.11 at 205), a target's column creep over a
  flight at each range, and the 60 to 140 kill rate for a given column slack
  and volley spread, with the seen-versus-kill contact shares beside it so a
  wider slack cannot buy kills the tracer did not reach. The sandbox
  prototype gave 98% at 80x24 and 83% at 205x50 with the volley as it is,
  and 54% at 205x50 with the side bullets pinned one column out. Takes over
  from `.tmp/hits/horizontal.mjs`.
  - From: Measurement
