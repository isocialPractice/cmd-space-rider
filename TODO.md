# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **CRT scanline overlay** — Add a subtle CSS overlay of horizontal scanlines and slight vignette to the browser version for extra retro feel. Toggle with a key (`C`).
  - From: Quick Wins

- [ ] **Sound effects (Web Audio API)** — Synthesized retro beeps and boops. Pulse cannon shot, orb collect chime, damage crunch, mine explosion, engine hum that pitches up with boost. No audio files needed — generate all tones procedurally.
  - From: Medium Effort

- [ ] **Barrel roll visual** — Q and E are already bound but do nothing. Implement a barrel roll animation: tilt the ship sprite left/right for ~0.5s, grant brief invincibility during the roll, and add a cooldown.
  - From: Medium Effort

- [ ] **Combo scoring** — Track rapid successive hits. Display a combo counter ("x3", "x5") that multiplies score for quick kills. Resets after 2 seconds without a hit.
  - From: Medium Effort

### UI/UX Override - pause leaves the world animating

#### Found Issues

- [ ] **Pause freezes positions but not animation**
  - **Issue**: Pausing a run stops the simulation correctly, but the screen keeps moving. Over 3s of pause the browser build logged 22 glyph changes and 413 non-label colour changes in a normal run, and 1156 glyph changes in `?mode=mines`: the tunnel walls cycle colour, mines blink between `■` and `◈`, orbs bob a row and pulse, and the ship's engine glow flickers. The `[ PAUSED ]` label pulse is meant to be the only motion, so that it reads as paused rather than crashed, and it is lost among the rest. Cause: `s.time += dt` sits above the pause gate (`index.html:309`, `src/game.ts:249`) and is the animation clock for the whole render layer, not just the three effects meant to outlive a pause. Both builds share the structure.
  - **Goal**: Resolve to [pause-animation-clock.prompt.md](.claude/prompts/pause-animation-clock.prompt.md)
  - From: UI/UX Override - pause leaves the world animating

### Code Review Override - terminal key repeat double-toggles P and M

#### Resolve Issues

- [ ] **Pause support** - Press `P` to pause the game. Show a "PAUSED" overlay. Useful for the browser version where there's no terminal interrupt.
  - **Issue**: In the terminal build, holding `P` for longer than the OS key-repeat delay toggles pause twice, so the run pauses and immediately resumes and the player sees nothing happen. `KEY_DECAY_MS` is 150ms (`src/index.ts:85`) and every platform's repeat delay is longer than that (Windows 250-750ms, X11 660ms), so `keys['P']` has already decayed to false when the first auto-repeat character arrives, `pressKey` re-arms `justPressed['P']` (`src/index.ts:95`), and `Game.update` flips `s.paused` a second time (`src/game.ts:245`). `M` has the same fault (`src/game.ts:244`), as would any toggle key added later. The browser build is correct and does not share it: its `keydown` handler is gated on `keys[k]`, which only `keyup` clears (`index.html:1096-1107`), so repeat never re-arms the press. The parity suite cannot see the difference because it feeds `justPressed` to `update()` directly and never exercises either input layer.
  - **Goal**: Make `P` and `M` edge-triggered in `src/index.ts` independently of the movement decay timer - a repeat-suppression window longer than any platform's key-repeat delay for toggle keys, leaving `KEY_DECAY_MS` as it is for the held movement and fire keys, where re-arming is what those keys want. Verifying it first needs `pressKey` and the key tables lifted out of `src/index.ts` into a module the suite can import, since `src/index.ts` claims the TTY and starts the loop at import time; do that, then cover the repeat case in `test/`.
  - From: Quick Wins

#### Found Issues

- [ ] **README overstates the screen shake for the browser build**
  - **Issue**: `README.md:22` says taking damage jolts the view "leaving the HUD and border anchored". That holds for the terminal build, which shifts only the play-area rows, but not for the browser build, which translates the whole canvas in `frame()` (`index.html:1153-1157`) so the HUD and border move with everything else. The Browser Version section lower down describes the pixel-offset difference but never corrects the blanket claim, and the browser build is what the README's deployed link opens.
  - **Goal**: Reword the feature bullet so the anchored HUD reads as the terminal build's behaviour rather than the game's, matching the accurate wording already in `CHANGELOG.md` for 0.2.0-alpha.
  - From: Code Review Override - terminal key repeat double-toggles P and M

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

## Medium Effort

Features that add a new system to the engine: audio, new entity types, or a
second input path. Each one spans both the terminal and browser versions.

- [ ] **Touch controls (mobile browser)** — Add on-screen virtual joystick (left side) and fire/boost buttons (right side) for mobile play. Only show when touch events are detected. The canvas grid system already works at any viewport size.

- [ ] **Powerup drops** — When a mine is destroyed, chance to drop a powerup that drifts toward the player:
  - Shield Regen (green +) — restores 25 shield
  - Rapid Fire (cyan !) — 3x fire rate for 10 seconds
  - Slow Motion (magenta ~) — halves game speed for 5 seconds

- [ ] **Warp speed transition** — Visual effect when crossing difficulty thresholds (every 60s). Brief tunnel color shift, speed lines intensify, and a "WARP LEVEL 2" flash in the HUD.

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

- [ ] **Favicon from icon.svg** — Inline the icon SVG as a data URI favicon in index.html so the browser tab shows the ship icon.

- [ ] **Prefers-color-scheme** — Detect system dark/light mode. Default is dark (game natural state). Light mode could invert to white background with dark tunnel walls for accessibility.

- [ ] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.

- [ ] **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

- [x] **High score persistence (browser)** — Save best score to `localStorage` so it survives page reloads. Show "NEW BEST" flash on the HUD when beaten.
  - From: Quick Wins
- [x] **Pause support** — Press `P` to pause the game. Show a "PAUSED" overlay. Useful for the browser version where there's no terminal interrupt.
  - From: Quick Wins
- [x] **Speed readout in HUD** — Show current speed multiplier (e.g., `SPD: 1.4x`) in the HUD footer or stats row. Gives the player awareness of difficulty scaling.
  - From: Quick Wins
- [x] **Mute/sound toggle placeholder** — Add an `M` key binding that toggles a `muted` flag in state. Prep for when sound is added.
  - From: Quick Wins
- [x] **Screen shake on damage** — Offset the canvas rendering by a few pixels for ~200ms when the ship takes damage. Simple, impactful juice.
  - From: Quick Wins
