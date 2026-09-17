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

> 35 earlier items in `TODO-archive.md`, newest last.

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
- [x] **Small windows draw more grid than the canvas can show**
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
- [x] **The screen-space hit rule has no free-flight guard**
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
- [x] Unlit Tracer Kill 1
  - **Issue**: `contacts` decides a kill on the cells `drawBullets` would put
    down, but does not apply the clip `drawBullets` applies. A tracer whose
    column has left the corridor is not drawn at all (`src/render.ts:276`), and
    `contacts` never asks (`src/game.ts:679`). `drawEntitiesFar` draws a
    target's block whether or not the corridor reaches it, so on one of those
    frames the player sees the block, sees no bolt, and the block dies anyway.
    Walked as geometry at dt 1/60 over every firing column the ship can hold,
    every depth in a shot's life and every legal target placement: at 80x24,
    2796 of 28320 undrawn-tracer frames can still register a kill - a shot at
    screen column 17 of row 14 (aim x -4.91, y 0, z -59) registers against a
    target at x -4.50, y 4.06, z -2. It is not introduced here: at 80x24 and
    60x20 the scaled slack is still one column and the figure is the same
    either way. It is widened here - at 205x50 the scaling took it from 74
    configurations to 296.
  - **Goal**: Decide whether the corridor clip belongs in the hit test, then
    make the code, both docstrings and the check say the same thing. It is not
    free: `drawBullets` records that the drawn span "runs a little narrower than
    the tunnel radius projects to, so culling the bullet on it would cost real
    hits at the far end", so testing `contacts` against that span moves every
    kill rate the `0.4.0-alpha` entry pins. Measure it with
    `npm run probe -- suite-replay` and the column probe before choosing, and
    move the floors in `AIMED_BANDS`, `VOLLEY_BAND` and `EYE_BANDS` in
    `test/engagement.mjs` with it. If the clip is deliberately left out of the
    hit test, say so where the rule is stated - `updateBullets`'s "one that is
    not drawn on it does not", in both builds - rather than stating a rule the
    code does not hold. Either way, split `contactOf`'s `clear` verdict into a
    tracer drawn wide of the block and a tracer not drawn at all: the two share
    one bucket today, so "nothing is destroyed by a tracer that never reached
    it" allows 5% of kills there and attributes them in its comment to
    mid-sweep contacts, and the share that is this fault is not known. Both
    builds together, as `test/parity.test.mjs` expects.
  - From: User Overrides
