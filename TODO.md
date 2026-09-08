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

### UI/UX Override - a debug link wakes the audio with a backlog

#### Resolve Issues

- [ ] Deep Link Audio Burst 1
  - **Issue**: Every cue raised before the player's first keypress is scheduled for the same instant and they all sound together when that keypress wakes the audio context. A browser will not start a context without a gesture, so the one `RetroAudio.context()` builds on the first cue starts suspended, and a suspended context's `currentTime` stays at `0`. `play()` reads that clock for its start, its sweep and its envelope (`index.html:1278-1291`), so every queued tone is scheduled at `t = 0` at full gain, and `resume()` on the first `keydown` (`index.html:1270`, called from `index.html:1408`) releases the lot at once. Routing every node bound for the speakers through an `AnalyserNode` and reading the amplitude back: `?mode=chaos` left 3s before a key had 24 tones queued and peaked at 1.0520, left 10s it had 85 queued and peaked at 4.1566, against 0.0300 for a single cannon shot and 0.0935 for the hum alone. Anything above 1.0 clips, and the backlog grows for as long as the page is left alone. Reachable from every documented debug link (`?mode=mines`, `?mode=orbs`, `?mode=obstacleCollision`, `?mode=mineCollision`, `?mode=chaos`); a run started from the title screen is clean, because the title screen raises no cues and Enter is itself the gesture.
  - **Goal**: Resolve to [deep-link-audio-burst.prompt.md](.claude/prompts/deep-link-audio-burst.prompt.md)
  - From: Medium Effort

### Code Review Override - a held roll key and a chain that never caps

#### Resolve Issues

- [ ] Roll Key Repeat 1
  - **Issue**: In the terminal build, holding `Q` or `E` rolls the ship over and over instead of once, on any terminal whose key-repeat rate is slower than the 150ms movement decay window. The roll acts on the press (`src/game.ts:400`, `index.html:472`), but `Q` and `E` are not in `TOGGLE_KEYS` (`src/input.ts:41`), so they decay after `KEY_DECAY_MS` and every repeat character that arrives after that re-arms `justPressed` as a fresh press. Driving `InputState` and `Game` together for a 6s hold: at the fast repeat rates the stream outruns the decay and the press lands once, 8.8% of frames invincible, matching the browser; at 2 characters per second, which is the slowest setting on the Windows keyboard repeat-rate slider, the same hold starts 4 rolls and leaves the ship invincible for 35.4% of frames, and at 5 per second, 5 rolls and 44.2%. The browser build gives 1 roll for the same hold at every rate, because its `keydown` handler is gated on `keys[k]`. This defeats the cooldown's stated purpose of bounding how much of a run can be spent untouchable, and it is the same fault `TOGGLE_KEYS` was added to fix for `P` and `M`.
  - **Goal**: Add `Q` and `E` to `TOGGLE_KEYS` in `src/input.ts`, so a repeat character inside `TOGGLE_DECAY_MS` cannot read as a fresh press. The 800ms window costs nothing here, since `ROLL_COOLDOWN` already refuses a second roll for 1200ms. Cover it in `test/input.test.mjs` beside the existing repeat-suppression checks, which sweep the platform repeat delays but not the repeat rates that follow them.
  - From: Medium Effort

- [ ] Combo Chain Cap 1
  - **Issue**: The combo multiplier has no ceiling, so an ordinary run's score runs into the millions and the best score it is measured against stops meaning anything. `registerKill` increments without bound (`src/game.ts:266`, `index.html:356`) and every kill is paid at `200 * combo` or `500 * combo`, so the 343rd kill in a chain pays 68,600. Three simulated minutes of a normal run reached x343 and 12,024,295 points; the same run with the multiplier pinned at 1 scored 111,295, a 91x inflation. The chain barely breaks, because obstacle density rises with difficulty and two seconds is longer than the gap between kills: at a leisurely 2 shots per second it dropped 9 times in 3 minutes and still peaked at x255, and `?mode=chaos` reached x2158 and 471,075,832. The item asked for a counter reading `x3` or `x5`; nothing in either build stops it at x2158. Best-score persistence is the concrete casualty - one long chain sets a stored best that ordinary play can never approach again, and the queued leaderboard item would inherit the same scale.
  - **Goal**: Cap the multiplier at a value that keeps the chain worth chasing without swamping the rest of the scoring, in both builds together, and decide whether the counter should read the cap or keep counting past it. The cap belongs in `src/types.ts` beside `COMBO_TIME` with its browser twin in `index.html`, so `test/parity.test.mjs` keeps the two honest. Extend `test/combo.test.mjs`, which pins the x1/x2/x3 progression but stops before any ceiling, and correct the `and so on` in the `0.3.0-alpha` CHANGELOG entry and the README once the cap is chosen.
  - From: Medium Effort

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

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
- [x] **Pause freezes positions but not animation**
  - **Issue**: Pausing a run stops the simulation correctly, but the screen keeps moving. Over 3s of pause the browser build logged 22 glyph changes and 413 non-label colour changes in a normal run, and 1156 glyph changes in `?mode=mines`: the tunnel walls cycle colour, mines blink between `■` and `◈`, orbs bob a row and pulse, and the ship's engine glow flickers. The `[ PAUSED ]` label pulse is meant to be the only motion, so that it reads as paused rather than crashed, and it is lost among the rest. Cause: `s.time += dt` sits above the pause gate (`index.html:309`, `src/game.ts:249`) and is the animation clock for the whole render layer, not just the three effects meant to outlive a pause. Both builds share the structure.
  - **Goal**: Resolve to [pause-animation-clock.prompt.md](.claude/prompts/pause-animation-clock.prompt.md)
  - From: UI/UX Override - pause leaves the world animating
- [x] **Pause support** - Press `P` to pause the game. Show a "PAUSED" overlay. Useful for the browser version where there's no terminal interrupt.
  - **Issue**: In the terminal build, holding `P` for longer than the OS key-repeat delay toggles pause twice, so the run pauses and immediately resumes and the player sees nothing happen. `KEY_DECAY_MS` is 150ms (`src/index.ts:85`) and every platform's repeat delay is longer than that (Windows 250-750ms, X11 660ms), so `keys['P']` has already decayed to false when the first auto-repeat character arrives, `pressKey` re-arms `justPressed['P']` (`src/index.ts:95`), and `Game.update` flips `s.paused` a second time (`src/game.ts:245`). `M` has the same fault (`src/game.ts:244`), as would any toggle key added later. The browser build is correct and does not share it: its `keydown` handler is gated on `keys[k]`, which only `keyup` clears (`index.html:1096-1107`), so repeat never re-arms the press. The parity suite cannot see the difference because it feeds `justPressed` to `update()` directly and never exercises either input layer.
  - **Goal**: Make `P` and `M` edge-triggered in `src/index.ts` independently of the movement decay timer - a repeat-suppression window longer than any platform's key-repeat delay for toggle keys, leaving `KEY_DECAY_MS` as it is for the held movement and fire keys, where re-arming is what those keys want. Verifying it first needs `pressKey` and the key tables lifted out of `src/index.ts` into a module the suite can import, since `src/index.ts` claims the TTY and starts the loop at import time; do that, then cover the repeat case in `test/`.
  - From: Quick Wins
- [x] **README overstates the screen shake for the browser build**
  - **Issue**: `README.md:22` says taking damage jolts the view "leaving the HUD and border anchored". That holds for the terminal build, which shifts only the play-area rows, but not for the browser build, which translates the whole canvas in `frame()` (`index.html:1153-1157`) so the HUD and border move with everything else. The Browser Version section lower down describes the pixel-offset difference but never corrects the blanket claim, and the browser build is what the README's deployed link opens.
  - **Goal**: Reword the feature bullet so the anchored HUD reads as the terminal build's behaviour rather than the game's, matching the accurate wording already in `CHANGELOG.md` for 0.2.0-alpha.
  - From: Code Review Override - terminal key repeat double-toggles P and M
- [x] **Debug menu is clipped at the documented minimum screen size**
  - **Issue**: `renderDebugMenu` places the navigation hint at
    `menuY + DEBUG_MODES.length * 3 + 1` and never clamps it to the screen, and
    `ScreenBuffer.put` drops out-of-range writes without complaint. Rendered
    with the starfield suppressed and swept over height, the hint is missing
    below 28 rows and the fifth mode is missing below 23 rows, identically at
    60 and 80 columns. `README.md` gives the minimum as 60x20, where the menu
    loses both `CHAOS PROTOCOL` and the line saying the arrows select and Enter
    launches. The hint is also the only animated thing on that screen, so a
    clipped debug menu is completely still. Shared by `index.html` and
    `src/menu.ts:124`.
  - **Goal**: Resolve to [debug-menu-nav-hint-clipped.prompt.md](.claude/prompts/debug-menu-nav-hint-clipped.prompt.md)
  - From: UI/UX Override - menu screens clipped and speckled
- [x] **Menu starfield is drawn over the menu text instead of behind it**
  - **Issue**: `drawMenuStars` is the last call in `renderTitleScreen`,
    `renderDebugMenu` and `renderGameOver`, so stars overwrite whatever the
    screen already drew. On a real 100x31 browser render the debug menu showed
    `[3] COLLISION COURSE` as `+3]`, `Log collisions.` as `Lo* collisions.`,
    a star inside the brackets of the navigation hint, and two punched into the
    title art. Comparing starred against starless renders over 300 seeds, all
    300 lost drawn cells at 100x30, mean 5.4 and up to 12 of the 40 stars, with
    287 of 300 at 128x44 and 294 of 300 on the title screen. Both builds.
  - **Goal**: Draw the starfield before the text on all three screens, or have
    `drawMenuStars` skip any cell whose character is not blank. The three call
    sites are `index.html:935`, `index.html:977`, `index.html:1006` and their
    counterparts in `src/menu.ts`; keep both builds identical, as
    `test/parity.test.mjs` expects.
  - From: UI/UX Override - menu screens clipped and speckled
- [x] **CRT scanline overlay** — Add a subtle CSS overlay of horizontal scanlines and slight vignette to the browser version for extra retro feel. Toggle with a key (`C`).
  - From: Quick Wins
- [x] **Deep Link Audio Burst**: **Sound effects (Web Audio API)** — Synthesized retro beeps and boops. Pulse cannon shot, orb collect chime, damage crunch, mine explosion, engine hum that pitches up with boost. No audio files needed — generate all tones procedurally.
  - From: Medium Effort
- [x] **Roll Key Repeat**: **Barrel roll visual** — Q and E are already bound but do nothing. Implement a barrel roll animation: tilt the ship sprite left/right for ~0.5s, grant brief invincibility during the roll, and add a cooldown.
  - From: Medium Effort
- [x] **Combo Chain Cap**: **Combo scoring** — Track rapid successive hits. Display a combo counter ("x3", "x5") that multiplies score for quick kills. Resets after 2 seconds without a hit.
  - From: Medium Effort
- [x] **Pin the debug menu hint's pulse at the minimum size** - The navigation hint is the only animated thing on the debug menu, so a change that stopped it pulsing would leave that screen completely still with every existing test still passing. `test/browser-engine.test.mjs` samples the pulse only at the suite's 80x24 default, and `test/menu-layout.test.mjs` asserts the hint is drawn at every height but not that it moves. Add a check to `test/menu-layout.test.mjs` that renders the debug menu at 60x20 twice with `state.time` set either side of the `sin(time * 3) * 0.5 + 0.5 > 0.3` threshold, and asserts the hint's foreground colour differs between the two renders, in both builds.
  - From: UI/UX verification 2026-09-07
