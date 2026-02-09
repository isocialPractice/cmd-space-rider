# TODO — CMD Space Rider

## Quick Wins

- [ ] **High score persistence (browser)** — Save best score to `localStorage` so it survives page reloads. Show "NEW BEST" flash on the HUD when beaten.

- [ ] **Screen shake on damage** — Offset the canvas rendering by a few pixels for ~200ms when the ship takes damage. Simple, impactful juice.

- [ ] **CRT scanline overlay** — Add a subtle CSS overlay of horizontal scanlines and slight vignette to the browser version for extra retro feel. Toggle with a key (`C`).

- [ ] **Pause support** — Press `P` to pause the game. Show a "PAUSED" overlay. Useful for the browser version where there's no terminal interrupt.

- [ ] **Speed readout in HUD** — Show current speed multiplier (e.g., `SPD: 1.4x`) in the HUD footer or stats row. Gives the player awareness of difficulty scaling.

- [ ] **Mute/sound toggle placeholder** — Add an `M` key binding that toggles a `muted` flag in state. Prep for when sound is added.

## Medium Effort

- [ ] **Sound effects (Web Audio API)** — Synthesized retro beeps and boops. Pulse cannon shot, orb collect chime, damage crunch, mine explosion, engine hum that pitches up with boost. No audio files needed — generate all tones procedurally.

- [ ] **Barrel roll visual** — Q and E are already bound but do nothing. Implement a barrel roll animation: tilt the ship sprite left/right for ~0.5s, grant brief invincibility during the roll, and add a cooldown.

- [ ] **Touch controls (mobile browser)** — Add on-screen virtual joystick (left side) and fire/boost buttons (right side) for mobile play. Only show when touch events are detected. The canvas grid system already works at any viewport size.

- [ ] **Powerup drops** — When a mine is destroyed, chance to drop a powerup that drifts toward the player:
  - Shield Regen (green +) — restores 25 shield
  - Rapid Fire (cyan !) — 3x fire rate for 10 seconds
  - Slow Motion (magenta ~) — halves game speed for 5 seconds

- [ ] **Warp speed transition** — Visual effect when crossing difficulty thresholds (every 60s). Brief tunnel color shift, speed lines intensify, and a "WARP LEVEL 2" flash in the HUD.

- [ ] **Combo scoring** — Track rapid successive hits. Display a combo counter ("x3", "x5") that multiplies score for quick kills. Resets after 2 seconds without a hit.

## Bigger Features

- [ ] **Leaderboard with name entry** — After game over, if the player beat their best score, show a 3-character name entry screen (classic arcade style). Store top 10 scores in `localStorage`. Display on the title screen.

- [ ] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.

- [ ] **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.

- [ ] **Replay ghost** — Record the player's inputs during a run. On the next run, show a ghosted version of the previous ship flying the same path. Motivates beating your own performance.

- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.

## Polish

- [ ] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.

- [ ] **Favicon from icon.svg** — Inline the icon SVG as a data URI favicon in index.html so the browser tab shows the ship icon.

- [ ] **Prefers-color-scheme** — Detect system dark/light mode. Default is dark (game natural state). Light mode could invert to white background with dark tunnel walls for accessibility.

- [ ] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.

- [ ] **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.
