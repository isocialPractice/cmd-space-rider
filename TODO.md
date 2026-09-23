# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

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
  - From: Quick Wins
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
  - From: Quick Wins
- [ ] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.
  - From: Polish
- [ ] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.
  - From: Polish

### UI/UX Override - touch overlay placement on a landscape phone

#### Resolve Issues

- [ ] Overlay Anchoring 1
  - **Issue**: The overlay is positioned in viewport units while everything it
    has to avoid is positioned in character cells, and the two come apart the
    moment the viewport stops being a portrait phone. Measured in chromium with
    `hasTouch` set and a run in progress, across eight device shapes. First,
    `#boost{bottom:calc(6vh + 26vw)}` was written as FIRE's width plus a gap,
    but `#fire`'s height is `min(24vw, 118px)` - `max-width:118px` with
    `aspect-ratio:1` - so past a viewport of about 492px the offset keeps
    growing and the height does not. The gap BOOST leaves above FIRE runs 7.5px
    at 375 wide, 8.3px at 412, 55.4px at 667, 74.4px at 740, 95.2px at 820,
    119.9px at 915, 124.3px at 932 and 188.8px at 1180. On a phone held in
    landscape BOOST is not above FIRE at all: at 915x412 (grid 91x22) it covers
    rows 1-8, at 740x360 (74x20) rows 1-8, at 932x430 (93x23) rows 2-8 - the
    SCORE / DIST / SHIELD row and the shield bar. Second, `#stick` and `#fire`
    sit at `bottom:6vh`, which is under the footer's own two character rows
    (36px at the 16px font, against 22.5px of 6vh on a 375-high viewport), so
    at 667x375, 915x412 and 932x430 both controls cover both footer rows -
    including the status strip carrying `SPD`, the powerup badges and `MUTED`.
    In portrait neither happens: at 412x915 BOOST is 8.3px above FIRE and the
    stick stops five rows clear of the footer. Everything else about the
    controls checked out - hidden until a real touchstart, the nub clamped at
    the ring, the eight sectors, FIRE sending ENTER off a run and SPACE in one,
    BOOST reaching 1.8x with the magenta lines, two thumbs independent, and no
    scroll, zoom or selection on a drag.
  - **Goal**: Resolve to [overlay-anchoring.prompt.md](.claude/prompts/overlay-anchoring.prompt.md)
  - From: Medium Effort

### Code Review Override - the HUD row's fourth tenant and two figures that do not hold

- [ ] The shared HUD row gained a fourth tenant and its own test file did not
  - **Issue**: `test/hud-row.test.mjs` exists for one invariant - the combo
    counter is left-aligned on `HUD_ROWS` while the debug label and the NEW BEST
    banner centre themselves on it, and none of the three may overwrite another.
    The warp banner is now a fourth thing drawn on that row, and it is drawn
    after the counter, so it is the one that would cover it. `test/warp.test.mjs`
    pins the banner against the debug label and against NEW BEST but never
    against the counter, and `hud-row.test.mjs` still opens by saying the row is
    shared by three. The pairing holds today at every supported width - the
    counter tops out at `COMBO x8`, ten columns wide ending at column 9, and
    `>> WARP LEVEL 2 <<` is eighteen columns centred, which starts at column 21
    on the 60-column floor - but nothing says so, and the margin is arithmetic
    rather than a check: widen the banner or raise `COMBO_MAX` and the two meet
    with no test to say they did.
  - **Goal**: Extend `test/hud-row.test.mjs` to the fourth tenant rather than
    leaving it in `warp.test.mjs`: stage a chain and a live `warpFlash` together
    and walk the supported widths the file already walks, asserting the counter
    ends before the banner begins. Correct the file's opening comment, which
    names three. Both builds together, as the rest of that file already does.
  - From: Code Review Override - the HUD row's fourth tenant and two figures that do not hold

#### Found Issues

- [ ] The light palette's entry count is quoted wrong in the CHANGELOG
  - **Issue**: The `0.7.0-alpha` entry says light mode "re-inks the 26 indices
    the game actually draws with". `LIGHT_INK` in `index.html` has 24 entries,
    and `C` names 24 colours at 24 distinct indices - the two agree exactly,
    which is what `test/browser-shell.test.mjs` asserts in `every colour the
    game draws with is re-inked for light mode`. So the sentence's claim is
    right and only its number is wrong, which is the worse failure of the two:
    a reader checking it against the file finds a table that does not match and
    has no way to tell which of the two is the error.
  - **Goal**: Change `26` to `24` in that bullet. Nothing else in the entry
    depends on the figure. Do not restate the version or re-cut the release.
  - From: Code Review Override - the HUD row's fourth tenant and two figures that do not hold
- [ ] A powerups test explains a tolerance by a frame ordering that is the other way round
  - **Issue**: `a drop lands where the mine was` in `test/powerups.test.mjs`
    carries `// It is dropped at the mine and then moved by the same frame, so
    the check is that it started there rather than that it is still there`, and
    that is not the order the frame runs in. `updatePlaying` calls
    `updatePowerups` before `updateBullets`, and `dropPowerup` is called from
    inside `updateBullets` where a bullet takes a mine's last hit point, so a
    drop created on a frame is not touched again until the next one. What the
    20-unit tolerance on z is actually absorbing is the mine's own `advance`:
    `updateMines` carries it forward before the bullet kills it, while the
    `where` the test captured is the position from before the frame. The
    assertion holds either way - the comment is what is wrong - but it is the
    comment a later reader would use to decide whether a tightened tolerance is
    safe, and it would send them to the wrong number.
  - **Goal**: Say what the tolerance covers: one frame of `advance` between the
    captured position and the kill, with the drift never having run on the drop
    at all. Check the same claim in the `dropPowerup` doc comment in
    `src/game.ts` and `index.html` while there, which says a drop costs the seed
    a draw but says nothing about when the drop first moves.
  - From: Code Review Override - the HUD row's fourth tenant and two figures that do not hold

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

> 49 earlier items in `TODO-archive.md`, newest last.

- [x] **Warp speed transition** — Visual effect when crossing difficulty thresholds (every 60s). Brief tunnel color shift, speed lines intensify, and a "WARP LEVEL 2" flash in the HUD.
  - From: Medium Effort
- [x] **Powerup drops** — When a mine is destroyed, chance to drop a powerup that drifts toward the player:
  - Shield Regen (green +) — restores 25 shield
  - Rapid Fire (cyan !) — 3x fire rate for 10 seconds
  - Slow Motion (magenta ~) — halves game speed for 5 seconds
  - From: Medium Effort
- [x] **Overlay Anchoring**: **Touch controls (mobile browser)** — Add on-screen virtual joystick (left side) and fire/boost buttons (right side) for mobile play. Only show when touch events are detected. The canvas grid system already works at any viewport size.
  - From: Medium Effort
- [x] **Favicon from icon.svg** — Inline the icon SVG as a data URI favicon in index.html so the browser tab shows the ship icon.
  - From: Polish
- [x] **Prefers-color-scheme** — Detect system dark/light mode. Default is dark (game natural state). Light mode could invert to white background with dark tunnel walls for accessibility.
  - From: Polish
