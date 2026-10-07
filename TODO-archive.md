# TODO archive

Completed items rolled out of `TODO.md`, oldest first. Nothing reads
this file to decide what to work on: it is here so a finished item can
still be found by name.

## Archived 09-14-26

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
- [x] Deep Link Audio Burst 1
  - **Issue**: Every cue raised before the player's first keypress is scheduled for the same instant and they all sound together when that keypress wakes the audio context. A browser will not start a context without a gesture, so the one `RetroAudio.context()` builds on the first cue starts suspended, and a suspended context's `currentTime` stays at `0`. `play()` reads that clock for its start, its sweep and its envelope (`index.html:1278-1291`), so every queued tone is scheduled at `t = 0` at full gain, and `resume()` on the first `keydown` (`index.html:1270`, called from `index.html:1408`) releases the lot at once. Routing every node bound for the speakers through an `AnalyserNode` and reading the amplitude back: `?mode=chaos` left 3s before a key had 24 tones queued and peaked at 1.0520, left 10s it had 85 queued and peaked at 4.1566, against 0.0300 for a single cannon shot and 0.0935 for the hum alone. Anything above 1.0 clips, and the backlog grows for as long as the page is left alone. Reachable from every documented debug link (`?mode=mines`, `?mode=orbs`, `?mode=obstacleCollision`, `?mode=mineCollision`, `?mode=chaos`); a run started from the title screen is clean, because the title screen raises no cues and Enter is itself the gesture.
  - **Goal**: Resolve to [deep-link-audio-burst.prompt.md](.claude/prompts/deep-link-audio-burst.prompt.md)
  - From: Medium Effort
- [x] Roll Key Repeat 1
  - **Issue**: In the terminal build, holding `Q` or `E` rolls the ship over and over instead of once, on any terminal whose key-repeat rate is slower than the 150ms movement decay window. The roll acts on the press (`src/game.ts:400`, `index.html:472`), but `Q` and `E` are not in `TOGGLE_KEYS` (`src/input.ts:41`), so they decay after `KEY_DECAY_MS` and every repeat character that arrives after that re-arms `justPressed` as a fresh press. Driving `InputState` and `Game` together for a 6s hold: at the fast repeat rates the stream outruns the decay and the press lands once, 8.8% of frames invincible, matching the browser; at 2 characters per second, which is the slowest setting on the Windows keyboard repeat-rate slider, the same hold starts 4 rolls and leaves the ship invincible for 35.4% of frames, and at 5 per second, 5 rolls and 44.2%. The browser build gives 1 roll for the same hold at every rate, because its `keydown` handler is gated on `keys[k]`. This defeats the cooldown's stated purpose of bounding how much of a run can be spent untouchable, and it is the same fault `TOGGLE_KEYS` was added to fix for `P` and `M`.
  - **Goal**: Add `Q` and `E` to `TOGGLE_KEYS` in `src/input.ts`, so a repeat character inside `TOGGLE_DECAY_MS` cannot read as a fresh press. The 800ms window costs nothing here, since `ROLL_COOLDOWN` already refuses a second roll for 1200ms. Cover it in `test/input.test.mjs` beside the existing repeat-suppression checks, which sweep the platform repeat delays but not the repeat rates that follow them.
  - From: Medium Effort
- [x] Combo Chain Cap 1
  - **Issue**: The combo multiplier has no ceiling, so an ordinary run's score runs into the millions and the best score it is measured against stops meaning anything. `registerKill` increments without bound (`src/game.ts:266`, `index.html:356`) and every kill is paid at `200 * combo` or `500 * combo`, so the 343rd kill in a chain pays 68,600. Three simulated minutes of a normal run reached x343 and 12,024,295 points; the same run with the multiplier pinned at 1 scored 111,295, a 91x inflation. The chain barely breaks, because obstacle density rises with difficulty and two seconds is longer than the gap between kills: at a leisurely 2 shots per second it dropped 9 times in 3 minutes and still peaked at x255, and `?mode=chaos` reached x2158 and 471,075,832. The item asked for a counter reading `x3` or `x5`; nothing in either build stops it at x2158. Best-score persistence is the concrete casualty - one long chain sets a stored best that ordinary play can never approach again, and the queued leaderboard item would inherit the same scale.
  - **Goal**: Cap the multiplier at a value that keeps the chain worth chasing without swamping the rest of the scoring, in both builds together, and decide whether the counter should read the cap or keep counting past it. The cap belongs in `src/types.ts` beside `COMBO_TIME` with its browser twin in `index.html`, so `test/parity.test.mjs` keeps the two honest. Extend `test/combo.test.mjs`, which pins the x1/x2/x3 progression but stops before any ceiling, and correct the `and so on` in the `0.3.0-alpha` CHANGELOG entry and the README once the cap is chosen.
  - From: Medium Effort
- [x] Roll Key Repeat 2
  - **Issue**: Putting `Q` and `E` in `TOGGLE_KEYS` stopped the repeat stream re-rolling, but it also deadzones the roll key for up to `TOGGLE_DECAY_MS` after a hold, and the roll is the game's escape move. `ROLL_COOLDOWN` runs from the start of the roll while the window restarts on every repeat character (`src/input.ts:128-132`, which re-reads `lastSeen`), so the two clocks only line up for a single tap. Driving `InputState` and `Game` together: hold `Q` for 2000ms at 10 characters a second, release, then press it again 100ms, 300ms, 500ms or 700ms later and the ship rolls once - the cooldown expired at 1200ms and the second roll is refused anyway. It lands only at 850ms and beyond. A player who holds the key through a dense stretch and then wants a roll on the way out waits up to 800ms for a key that reads as dead. The comment claiming this window costs nothing was corrected in `fix: correct the roll key suppression window's stated cost`, and `test/input.test.mjs` now pins the behaviour, so this item is the behaviour itself rather than its description.
  - **Goal**: Decide whether the escape move should carry that deadzone at all, and if not, separate the two clocks rather than widening or narrowing the one window: measure the press-suppression from the first character of a hold instead of the last, or track the release explicitly so a re-press after a hold re-arms as soon as `ROLL_COOLDOWN` allows. `P`, `M` and `ESCAPE` should keep the current behaviour either way, since a beat between taps is the documented cost there and no cooldown competes with it. Update the deadzone test in `test/input.test.mjs` and the `Controls` note in `README.md` to whatever is chosen.
  - From: Medium Effort
- [x] Deep Link Audio Burst 2
  - **Issue**: Withholding the audio context until the page has had a keypress fixed the backlog, but it also silences a browser that would have permitted the sound outright. `context()` returns `null` whenever `gestured` is false (`index.html:1284`), so `play()` and `engineOn()` build nothing no matter what the browser would have allowed. Chrome unblocks autoplay for an origin with a high Media Engagement Index, which a returning player accumulates, and for any site given the `Sound: Allow` permission; such a browser hands back a context already `running`, with a clock that advances from the moment it is built. Driving `RetroAudio` with one of those: ten seconds of `?mode=chaos` frames before any key builds 0 contexts and plays 0 tones, where the same browser used to play the run from the first frame. It self-heals on the first keypress, so the exposure is the opening seconds of a debug link, but the capability was removed rather than traded.
  - **Goal**: Keep the backlog fixed without withholding sound from a browser that allows it: build the context lazily on the first cue as before, and gate `play()` and `engineOn()` on `ctx.state === 'running'` instead of on the gesture. A blocked browser then hands back a suspended context whose cues are dropped rather than queued at `t = 0`, which is the same outcome the current fix reaches, while a permitting browser plays from the first frame. `resume()` stays as the keydown nudge. Extend `test/sound.test.mjs`, which covers the suspended path well but has no running-without-a-gesture case, and correct the browser-differences paragraph in `README.md` if the behaviour changes.
  - From: Medium Effort
- [x] Roll Key Repeat 3
  - **Issue**: Narrowing the roll key's release detection to the repeat rate also narrows what a stall in stdin delivery can do. The window is `REPEAT_SLACK` intervals floored at `ROLL_RELEASE_MIN_MS` (`src/input.ts:89`, `src/input.ts:96`), so a pause that wide mid-hold reads as a release and the next repeat character re-presses `Q` as a fresh roll. The flat 800ms window absorbed any pause shorter than itself; the measured one absorbs 150ms at a fast repeat rate. `expire()` runs at the top of `press()` (`src/input.ts:198`, `src/input.ts:226`) against the widest gap seen so far, so the stretched gap releases the key before it can widen the measurement, and `widestGap` taking the maximum (`src/input.ts:205`) cannot recover it afterwards. Driving `InputState` and `Game` together over a 4000ms hold of `Q` with one stall injected at 1500ms: at 30 characters a second a 150ms stall starts a second roll, at 10 a second it takes 300ms, and at 5 a second 500ms. A loop hitching 200ms every 400ms across a 10s hold starts 9 rolls and leaves the ship invincible for 42% of frames, against 1 roll and 5% for the same hold on a steady stream. `ROLL_COOLDOWN` still bounds it to one roll per 1200ms, so this degrades the bound rather than losing it, and it needs a stall in the terminal's own delivery that nothing in the suite or the repository measures.
  - **Goal**: Decide how much delivery jitter the release detection has to survive, then hold the window to it rather than to the repeat rate alone. Options worth weighing against each other: raise `ROLL_RELEASE_MIN_MS` to a figure a dropped frame batch cannot cross while staying well inside `ROLL_COOLDOWN`; require two consecutive missed intervals before a roll key reads as released, so one stretched gap cannot do it; or keep `widestGap` across the expiry and let a hold that resumes at its measured cadence rejoin rather than re-press. Measure the terminal build's actual stdin delivery gaps under a full repaint first - the choice is only defensible against a real number, and there is none yet. Whatever is chosen, extend `test/input.test.mjs` with a stalled-stream case beside the existing rate sweep, and correct the deadzone figures in the `holdWindow` comment, the `0.3.2-alpha` CHANGELOG entry and the `Controls` note in `README.md` if the window moves.
  - From: Medium Effort

## Archived 09-15-26

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

## Archived 09-16-26

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
- [x] The figures behind `SHOT_SLACK_ROWS` cannot be reproduced from anything the repository ships
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
  - **Closed**: There is no table left to reproduce. The pulse cannon work
    below retired `SHOT_SLACK_ROWS` and its table from `src/types.ts`,
    `index.html` and `test/parity.test.mjs`, and corrected the sentence in the
    `0.3.7-alpha` entry that stated an 80x24 row as a general measurement. What
    the finding asked for - a figure a reader can rebuild from the repository -
    is answered for the figures that remain: `test/probes/` reports them off the
    two real engines, through the same `test/engagement.mjs` the tests fly, and
    each probe prints its grid, placement walk, ship heights, band and frame
    rate above its table. `.tmp/hits/horizontal.mjs` is superseded by the column
    probe; `.tmp/hits/vertical.mjs` measured the retired constant.
  - From: Code Review Override - the tuning table is right and the repository cannot check it
- [x] Pulse cannon: a tracer drawn straight through an enemy does not destroy it
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
  - [x] Run the pulse cannon checks at the size the game is played
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
    - From: User Overrides
  - [x] Register the hit where the screen shows it
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
    - From: User Overrides
  - [x] Retire the rules that make height an aiming axis
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
    - From: User Overrides
- [x] **Unlit Tracer Kill**: Long shots fall off on wide screens
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

## Archived 09-17-26

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

## Archived 09-19-26

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

## Archived 09-20-26

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

## Archived 09-21-26

- [x] **A kill's contact is read against every shot the frame spent**
  - **Issue**: `freeFlight` reduces both readings - `now` over `stepped` and
    `before` over `drawnShots` - across every bullet the frame spent, for each
    block the frame killed (`test/engagement.mjs`, the `for (const killed of
    gone)` loop). Nothing pairs a spent shot to the block it actually killed, so
    the verdict recorded for one kill can be another shot's contact. Measured
    over the same matrix the test flies, 1200 frames at both heights, all three
    grids, both builds: 95 of 884 kills - 11% - landed on a frame that spent
    more than one shot. The check's own comment says the opposite, "with both
    readings taken against the killing shot alone", as does the docstring in
    `engagement.mjs`, "the killing shots against the killed block and nothing
    else". A shot drawn wide of the block it killed is recorded as `on` whenever
    a sibling shot spent in the same frame was standing on that block, so the
    98% the test reports is a ceiling on what it can catch, not a measurement.
    Second leniency in the same reading: `gone` filters on `o.ref.z < o.z - 100
    && o.z <= 5`, which `updateObstacles` satisfies for a ram as well as
    `updateBullets` does for a kill, so a frame that rams and spends a shot
    scores the rammed obstacle as a kill. It does not bite today - a flight rams
    0 or 1 times in 1200 frames and never on a frame that also spent a shot -
    but nothing in the reading keeps it that way.
  - **Goal**: Pair each killed block to the shot that killed it before reading
    the contact, or say in the comment and the docstring what the reduction
    actually does. Pairing is the stronger answer and needs the frame's own
    resolution order: `updateBullets` walks the bullets from the end and breaks
    on the first obstacle it registers against, so the pairing is derivable
    rather than guessable. Exclude a rammed obstacle from `gone` either way -
    the shield drop already names the frame, and `updateObstacles` runs before
    `updateBullets`, so the two are separable. Re-measure the kill-contact
    shares after the change and move the figures in the test comment,
    `test/probes/free-flight.mjs` and the `0.5.0-alpha` CHANGELOG entry with
    them. Both builds together, as `test/parity.test.mjs` expects.
  - From: Code Review Override - the free flight guard reads looser than it states
- [x] **Flight Figures**: **The free flight's figures cannot be rebuilt from the repository**
  - **Issue**: `freeFlight` flies the run `startGame` opens, which seeds sixty
    obstacles from `Math.random` with nothing seeding it, so every pass flies a
    different run. The figures the repository quotes for it were taken from one
    draw and the first rerun falls outside them. `npm run probe -- free-flight`
    on a clean tree gives 824 kills over the whole matrix against the
    `0.5.0-alpha` CHANGELOG's "847 to 870 kills a pass", and terminal at 205x50
    held at 0 gives 140 volleys and 44 kills against the test comment's "a
    flight fires 145 to 297 volleys, lands 45 to 117 kills" - while browser at
    60x20 held at 6.5 gives 121 kills, over the same comment's ceiling. The
    assertions themselves hold with room to spare (`>= 100` volleys, `>= 25`
    kills, and 98% on-or-beside against a 90% floor, stable over 8 consecutive
    runs of the file), so this is the quoted measurement drifting rather than
    the check being flaky. `## Measurement` exists so a figure can be rebuilt
    from the repository alone, and these cannot be.
  - **Goal**: Either seed the flight so a figure is reproducible - a seeded RNG
    the two builds share, which nothing in the engine has today and which the
    parity check would have to cover - or state the figures as what they are,
    the spread over a named number of passes, and widen them until a rerun lands
    inside. Whichever way, the numbers in the test comments, in
    `test/probes/free-flight.mjs` and in the `0.5.0-alpha` CHANGELOG entry come
    from the same source and say the same thing. The dark walk beside it is
    already deterministic and its 9,477,000 / 594 / 2241 / 76 figures reproduce
    exactly, so only the flown half needs this.
  - From: Code Review Override - the free flight guard reads looser than it states

## Archived 09-22-26

- [x] **The corridor has one definition and the test keeps a second**
  - **Issue**: `tracerLit` was added to `src/types.ts` and to `index.html` this
    run so that drawTunnel, drawBullets and the hit test read one corridor.
    `test/engagement.mjs` then defines its own `tracerLit(build, col, row, ...)`
    that reads `build.tunnelSpan` and restates the boundary as `col > span.left
    && col < span.right`, and its docstring says it does not: "read out of the
    build that is flying rather than restated here ... a test carrying its own
    copy would be pinning the copy". `darkWalk` decides which configurations are
    dark from that copy and then asserts the engine registers nothing on them,
    so widening the engine's corridor to include its walls would leave the walk
    calling those configurations dark and the assertion failing against code
    that is right, while narrowing it would let the walk stop reaching the
    frames the check exists for. The copy is reachable only because
    `tracerLit` is exported from neither build's test surface: it is absent from
    `EXPORTS` in `test/helpers.mjs` and from `BUILDS` in `test/engagement.mjs`.
  - **Goal**: Add `tracerLit` to `EXPORTS` and to both entries of `BUILDS`
    beside `tunnelSpan`, and have the test's helper call `build.tracerLit`
    rather than restate the boundary - or drop the helper and call it directly.
    The walk's counts must not move: 594 candidates at 80x24, 2241 at 60x20 and
    76 at 205x50, with 0 registered, and the same in both builds.
  - From: Code Review Override - the free flight guard reads looser than it states
- [x] Flight Figures 1
  - **Issue**: The item restated the flight's figures as spreads over a named
    number of passes, but did not widen them far enough for a rerun to land
    inside, which is what its **Goal** asked for. Every one of these was quoted
    this run and missed on the first rerun: `test/pulse-cannon.test.mjs` says a
    flight "fired 136 to 298 volleys" and "drew 12 to 34 blocks at once", and
    reruns gave 118 volleys and 36 blocks; the `0.5.0-alpha` CHANGELOG entry
    says "90 to 197 kills a grid a pass", and reruns gave 80 and 87; the same
    test comment says the share on or beside is "96% or better at every grid and
    in both builds", and a rerun gave 95% at browser 205x50. Two ten-pass runs
    of the whole matrix do not even agree with each other - 80 to 191 kills a
    grid a pass against 87 to 194 - so ten passes is not enough to bound an
    unseeded distribution, and no number of passes quoted this way will settle.
    The assertions themselves are unaffected and hold with room to spare: the
    floors sit well under the spreads, as that comment says they deliberately
    do. This is the quoted measurement, not the check.
  - **Goal**: Take the other branch the archived item offered and seed the
    flight, so a figure is arithmetic rather than a sample: a seeded RNG the two
    builds share, which nothing in the engine has today and which
    `test/parity.test.mjs` would have to cover. Failing that, stop quoting
    spreads that a rerun falls outside - quote the floor and the ceiling the
    checks actually assert, and leave the sampled figures to the probe, which
    prints them with their pass count and is rebuilt by running it. Whichever
    way, the numbers in the test comments, in `test/probes/free-flight.mjs` and
    in the CHANGELOG entries come from one source and say the same thing.
  - From: Measurement

## Archived 09-23-26

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

## Archived 09-24-26

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
- [x] Plan the site and record the design language
  - From: Create and Deploy GitHub Pages Override

## Archived 09-25-26

- [x] **Heading Rank**: Split the README's level 2 sections into pages under `docs/`
  - From: Create and Deploy GitHub Pages Override
- [x] **Site Link Form**: Write `QUICKSTART.md` and `CHEATSHEET.md`, and their site pages
  - From: Create and Deploy GitHub Pages Override
- [x] **Palette Ledger**: Write the stylesheet and the menu script from `DESIGN_LANGUAGE.md`
  - From: Create and Deploy GitHub Pages Override
- [x] Trim `README.md` to a front door with linked section headings
  - From: Create and Deploy GitHub Pages Override
- [x] Add `.nojekyll` at the published root
  - From: Create and Deploy GitHub Pages Override
- [x] Verify the documentation site deployed - The site under `docs/` was
  written this run and reaches the remote with this run's commit. GitHub Pages
  serves this repository from the `main` branch root (`build_type: legacy`), so
  the publish is GitHub's own page build rather than an Actions workflow run,
  and `gh api repos/isocialPractice/cmd-space-rider/pages/builds/latest` is the
  endpoint that answers it - not `gh run list`, which has no workflow to report
  on here. Check that the latest build reports `status: built` at the commit
  carrying `docs/`, then fetch
  `https://isocialpractice.github.io/cmd-space-rider/docs/` for a `200`.
  - From: Create and Deploy GitHub Pages Override
- [x] Overlay Anchoring 1
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
- [x] The shared HUD row gained a fourth tenant and its own test file did not
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
- [x] The light palette's entry count is quoted wrong in the CHANGELOG
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
- [x] A powerups test explains a tolerance by a frame ordering that is the other way round
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

## Archived 09-26-26

- [x] The clone command is a placeholder on the page the README sends readers to
  - **Issue**: `docs/getting-started.html` still carries `git clone
    <repository-url>` under "Install from source", which is what the README
    said before the split. The trimmed `README.md` and `QUICKSTART.md` both now
    give `git clone https://github.com/isocialPractice/cmd-space-rider.git`, and
    the README's own line under that block reads "See Getting Started for the
    browser debug parameters and the rest" - so a reader who follows the link
    for more detail lands on the one copy of the command that cannot be pasted.
  - **Goal**: Put the real URL on the page, matching `README.md` and
    `QUICKSTART.md`. Three files then give the same command.
  - From: Code Review Override - the HUD row's fourth tenant and two figures that do not hold
- [x] The project structure page does not list the files the site is made of
  - **Issue**: `docs/project-structure.html` lists `.gitattributes` among the
    root files but none of what this run added beside it: `QUICKSTART.md`,
    `CHEATSHEET.md`, `DESIGN_LANGUAGE.md`, and `.nojekyll` - which is the file
    the publish depends on, since without it GitHub runs the branch through
    Jekyll. The tree's `docs/` entry says only "This project's documentation
    site" and does not open, so `assets/style.css`, `assets/docs.js` and
    `assets/icon.svg` appear nowhere either. Someone reading the page to learn
    what is in the repository comes away without the four files that put the
    page in front of them.
  - **Goal**: Add the three markdown files and `.nojekyll` to the root block,
    each with the one-line comment the other entries carry, and open `docs/`
    one level the way `src/` and `test/` are opened. `README.md`,
    `CHANGELOG.md`, `TODO.md` and `LICENSE` were never in this tree and are not
    part of this.
  - From: Code Review Override - the HUD row's fourth tenant and two figures that do not hold
- [x] Heading Rank 1
  - **Issue**: The four pages made from a README section that had `###`
    subsections carry that level through verbatim, so the first heading below
    `<h1>` on each is an `<h3>`: `docs/usage.html` (Controls, Gameplay, Debug
    Modes), `docs/development.html` (Line Endings, Tests, Probes),
    `docs/how-it-works.html` (Terminal Version, Browser Version) and
    `docs/getting-started.html`, which then goes on to `<h4>` for
    Prerequisites, Install from source and Run the game. The three pages not
    made that way - `index.html`, `quickstart.html`, `cheatsheet.html` - use
    `<h2>` for the same rank. Two failures follow. A screen reader walking the
    heading outline of `usage.html` reads level 1 then level 3 with no level 2
    between them, which is what WCAG 1.3.1 is about. And the stylesheet gives
    `h2` a section rule - `border-bottom: 1px solid var(--rule)`, 25px - that
    `h3` does not have, so the same rank of section is drawn one way on
    Quickstart and another on Usage. On `getting-started.html` "Prerequisites"
    lands on `h4`, which the stylesheet sets at 16px in `--text-strong`:
    identical to a bold paragraph.
  - **Goal**: Promote `h3` to `h2` and `h4` to `h3` in those four pages. The
    `id` attributes stay as they are, so the six dropdown anchors in the shared
    nav keep resolving - check that they still do. Nothing else on the site
    moves.
  - From: Create and Deploy GitHub Pages Override
- [x] Site Link Form 1
  - **Issue**: `docs/quickstart.html` and `docs/cheatsheet.html` link to their
    own siblings by absolute deployed URL rather than by file name - five
    `href="https://isocialpractice.github.io/cmd-space-rider/docs/..."` between
    them, reaching the site home, `usage.html`, `cheatsheet.html` and
    `development.html`. They came across from `QUICKSTART.md` and
    `CHEATSHEET.md`, where the absolute form is right because GitHub renders
    those files at a different path. On the pages it contradicts
    `DESIGN_LANGUAGE.md`, which declares under **Layout**: "Relative links
    throughout. The site is served from `/cmd-space-rider/docs/` rather than
    from a domain root, so absolute paths would break. Relative links also mean
    the pages open correctly straight off the filesystem." Open
    `docs/quickstart.html` from a clone with no network and every one of those
    five leaves the local copy; the other eight pages have no such link.
  - **Goal**: Make the five relative - `index.html`, `usage.html`,
    `cheatsheet.html`, `development.html` - matching every other in-site link
    on the site. Leave `QUICKSTART.md` and `CHEATSHEET.md` absolute: they are
    read on GitHub, where relative would be wrong.
  - From: Create and Deploy GitHub Pages Override

## Archived 09-27-26

- [x] Palette Ledger 1
  - **Issue**: `docs/assets/style.css` opens by saying "Every value here comes
    from DESIGN_LANGUAGE.md ... Change the two together or they stop agreeing",
    and the two have stopped agreeing in three places. The light block declares
    `--warn: #8f7300` (`LIGHT_INK[11]`) and the design file's light table has no
    row for it, though the dark table lists its counterpart. The light block
    splits `--rule: #00757f` from `--edge: #8a8a94` while the design file's
    light table gives one "Rules, borders" row at `#8a8a94`, so the file names
    the decoration value for the role the stylesheet gives to the link colour.
    And `--good`, `--bad` and `--warp` are declared in both schemes and
    referenced nowhere in the stylesheet or in any page, so three of the rows
    the design file measures describe nothing on the site. Separately the
    stylesheet carries three sizes off the declared scales: `.lede` at 18px and
    the dropdown caret at 10px, against a type scale the file gives as 14, 16,
    20, 25 and 31; and `max-height: calc(100vh - 56px)` on the narrow menu,
    against a spacing scale of 4, 8, 12, 16, 24, 32, 48, 64. Nothing renders
    wrong today - every measured ratio in the design file is correct, and the
    two sub-4.5:1 values carry no text - but the file is the site's record of
    why each value is what it is, and it no longer matches.
  - **Goal**: Bring the two back together, deciding each way round rather than
    editing one to match the other: give the light table a "Accent, warn" row
    and a "Decoration only" row the way the dark table has, drop the three
    unused properties or use them, and either add 18px and 10px to the type
    scale or move `.lede` and the caret onto it. The `56px` is the fixed bar's
    own height written twice - tie it to the bar or put it on the scale.
  - From: Create and Deploy GitHub Pages Override
- [x] Overlay Anchoring 2
  - **Issue**: The anchoring holds at the eight shapes the new tests walk and
    comes apart below about 340px of viewport height, where BOOST is back on the
    HUD. `#boost` stacks four terms on the footer band - `var(--footerpx) + 1vh
    + min(24vw,118px) + 2vw` - and then stands its own `min(24vw,118px)` of
    height on top of them, so what the offset costs is driven by the viewport's
    width while the room for it is driven by the viewport's height, and nothing
    bounds the total against the playable band. Resolved through the repository's
    own resolver in `test/browser-shell.test.mjs`, BOOST covers rows 0-8 at
    1180x300 and 820x300, rows 1-9 at 932x330 and 667x300, and rows 2-9 at
    740x330 and 740x320. Rows 0 to 2 are the SCORE / DIST / SHIELD row and the
    shield bar, which is the failure `Overlay Anchoring 1` was opened for. The
    stick and FIRE stay inside rows 3 to `rows - 3` at every one of those shapes
    - BOOST is the only one that fails - and `fitGrid` reports `fits: true` at
    all of them, so the game draws normally and the overlay is live as soon as a
    touch arrives.
  - **Goal**: Bound the stack rather than lengthening the shape list. Three ways
    round it, and the choice is a layout decision rather than an arithmetic one:
    publish the HUD's own band the way `handleResize` now publishes the footer's
    and clamp BOOST against it; cap the control size by height as well as width
    so the whole stack shrinks with the viewport; or place BOOST beside FIRE
    under a height media query. Each of the three changes how the controls look
    at six of the eight shapes a browser measured this run, so this wants the
    UI/UX tester on it. Add the short shapes to `SHAPES` in
    `test/browser-shell.test.mjs` either way, so the bound is pinned rather than
    argued.
  - From: Medium Effort
- [x] **Published Figure**: Nothing reads the figure the overlay fix hangs on
  - **Issue**: `--footerpx` is the whole of this run's fix, and its value is
    asserted nowhere. `index.html:2253` publishes
    `canvas.height-(termHeight-FOOTER_ROWS)*cellH`, and the only assertion that
    reaches that line is `assert.match(html, /setProperty\(\s*'--footerpx'/)` -
    the call has to be present, not correct. The four new tests then compute the
    figure for themselves in `viewport()`, out of `browser.fitGrid` and
    `browser.FOOTER_ROWS`, so they agree with a second implementation rather
    than with the page. Verified by mutation: substituting `HUD_ROWS` for
    `FOOTER_ROWS` at `index.html:2254` leaves all 452 tests green, while on a
    915x412 phone `--footerpx` would resolve to 70px instead of 52px and every
    control would sit 18px too high. `handleResize` is below the
    `// ===== Canvas Setup & Sizing =====` marker `test/helpers.mjs` stops at,
    which is why nothing executes it.
  - **Goal**: Lift the figure out of `handleResize` into a pure function of a
    fitted grid and a viewport height, export it through `test/helpers.mjs`, and
    have `viewport()` call it instead of restating the arithmetic. The
    `## Current` item *The page's use of the fitted grid has no check* proposes
    the same lift for the `ScreenBuffer` re-seating in the same function, so the
    two are one piece of work if they land together.
  - From: Code Review Override - the offset that outgrows a short viewport, and a figure nothing reads
- [x] The changelog describes a README sentence the same release rewrote
  - **Issue**: `CHANGELOG.md:95-98`, inside `## [0.7.1-alpha] - 2026-09-25`,
    closes "the README claims only what the page holds: every file under `src/`
    and `test/`". That bullet came from the run before this one. This run changed
    `README.md:68` to read "Every file under `src/`, `test/` and `docs/` is
    listed on the Project Structure page, with the root files the game and the
    site are built from", and left the bullet alone, so one release section both
    quotes the old sentence as its end state and ships the new one. A reader
    checking the bullet against the file finds three directories claimed where
    the changelog says two. This run's own project-structure bullet never
    mentions the README edit either, so the change is recorded nowhere.
  - **Goal**: Bring the bullet to what `README.md` now says, in the same
    release section rather than a new one - the sentence it describes shipped in
    this version. Do not restate the version or re-cut the release.
  - From: Code Review Override - the offset that outgrows a short viewport, and a figure nothing reads
- [x] The widened README claim still overshoots by six files
  - **Issue**: `README.md:68` now claims every file under `src/`, `test/` and
    `docs/` is listed on the Project Structure page. `docs/` is listed in full -
    ten pages and three assets, which is every tracked file under it - and
    `src/` is too. `test/` is not: `docs/project-structure.html` gives
    `probes/` a line and a comment but never opens it, so `column.mjs`,
    `frame-rate.mjs`, `free-flight.mjs`, `run.mjs`, `seen-versus-kill.mjs` and
    `suite-replay.mjs` appear nowhere on the page. The `test/` half of the
    overclaim predates this run - the sentence said `src/` and `test/` before it
    - but this run rewrote the sentence and carried it forward, and the earlier
    review that narrowed this same sentence narrowed it for exactly this reason.
  - **Goal**: Settle it either way round, not both: open `probes/` on the page
    with the one-line comment its siblings carry, or narrow the sentence to what
    the page holds. If the sentence narrows, say which directory it stops at
    rather than dropping the claim.
  - From: Code Review Override - the offset that outgrows a short viewport, and a figure nothing reads

## Archived 09-28-26

- [x] **Caret Box**: Three of the nav's four dropdown groups cannot be opened on a desktop
  - **Issue**: `docs/assets/style.css:139` is the only rule that reveals a
    dropdown - `.has-sub > button[aria-expanded="true"] + .sub` - and three of
    the four `.has-sub` groups label themselves with an `<a>` rather than a
    `<button>`, so it never matches them. `docs/assets/docs.js:12` binds the
    same selector, so there is no handler on those three either. Measured in
    chromium at 1280x900 on every page under `docs/`: Getting Started (2
    anchors), Usage (3) and Development (3) keep `display: none` with no
    control that changes it, while Reference, whose label is a `<button>`,
    opens and carries no in-page anchors at all. The caret is scoped to
    `> button` too, so the three dead labels advertise nothing and the failure
    is silent. Below the 860px breakpoint `docs/assets/style.css:217` opens
    every group and all eight anchors work - each scrolls its heading to 64px,
    clear of the 50px bar, and closes the menu behind it - so they are
    reachable on a phone and unreachable on a desktop. The nav predates this
    run: it landed whole in `c36ae4c` and no item since has touched it.
  - **Goal**: Resolve to [nav-dropdown-anchors.prompt.md](.claude/prompts/nav-dropdown-anchors.prompt.md)
  - From: UI/UX Override - the nav's dropdown anchors, and an accent on nothing
- [x] The one accent the design file says the site uses is on nothing the site has
  - **Issue**: `DESIGN_LANGUAGE.md:82` says `LIGHT_INK[11]`, `#8f7300`, "is the
    one accent the site uses, down the left edge of a blockquote", and the two
    `Accent, warn` rows at `DESIGN_LANGUAGE.md:45` and `:72` measure it. No page
    under `docs/` has a blockquote. `--warn` is read by exactly one rule,
    `docs/assets/style.css:191`, and that rule matches nothing on any of the ten
    pages, so neither scheme's `--warn` ever reaches a reader. The value itself
    is intact - a blockquote placed into `docs/index.html` at runtime resolves
    to `4px solid rgb(255, 255, 85)` in dark and `4px solid rgb(143, 115, 0)` in
    light - so this is absent markup rather than a broken property. It is the
    condition `Palette Ledger 1` deleted `--good`, `--bad` and `--warp` for, one
    level up: the property is referenced, but the rule referencing it describes
    nothing on the site.
  - **Goal**: Settle it one way, as `Palette Ledger 1` settled the other three:
    either give the site the blockquote the rule was written for, or drop the
    rule, `--warn` from both schemes, and the three places in
    `DESIGN_LANGUAGE.md` that measure it. Do not leave the rule and rewrite the
    claim to say the accent is available but unused - that is the state the
    ledger item was opened to end.
  - From: UI/UX Override - the nav's dropdown anchors, and an accent on nothing
- [x] **Probe Flags**: The probe rig's own header still says every probe takes a grid and a build
  - **Issue**: `test/probes/run.mjs:8` reads "Every probe runs against both real
    engines, loaded through the same module the tests use. That is the point of
    the rig", and `:17` reads "With no --grid the probe runs at every grid in
    GRIDS. With no --build it runs both." Neither is true of `overlay-anchor`,
    which the same run registered eleven lines below the first of them at `:42`:
    it loads `loadBrowserEngine()` alone and its `run()` takes no parameters, so
    the `args` the rig hands it are discarded. The run corrected exactly this
    sentence in `CHEATSHEET.md`, `docs/cheatsheet.html` and
    `docs/development.html` and left the rig's own header, so the three
    documents about the rig now disagree with the rig. The usage line at `:70`
    advertises `--grid` and `--build` unconditionally too, and
    `npm run probe -- overlay-anchor --grid 80x24` is accepted and silently
    ignored rather than refused.
  - **Goal**: Bring the header to what the three documents now say - the probes
    that fly a shot take a grid and a build, and `overlay-anchor` takes neither.
    Then settle what the rig does with a flag the named probe does not take:
    either refuse it, or say in the usage line which flags apply to which probe.
    Silently ignoring it is the one option to rule out, since a figure quoted
    from `--grid 80x24` would then be a figure from a walk that never happened.
  - From: UI/UX Override - the nav's dropdown anchors, and an accent on nothing
- [x] The new probe restates the rule it measures instead of reading it
  - **Issue**: `test/probes/overlay-anchor.mjs:40-50` writes both sizing rules
    out in JavaScript. The `'before the band'` half has to be written out - the
    rule is gone from the stylesheet - but `'bounded by the band'` is the rule
    that is in `index.html:81-82` right now, restated rather than read, so the
    two can come apart with nothing saying so: change `--ctl` in the stylesheet
    and the probe goes on reporting "0 of 682,500" for a rule the page no longer
    has, while the CHANGELOG quotes that 0 as a fact about the page. This is the
    fault the same run fixed one file over - `test/browser-shell.test.mjs:259`
    now reads the `:root` block out of the stylesheet into `ROOT_VARS` instead
    of restating it - so the repository has a resolver for this and the probe
    does not use it.
  - **Goal**: Give the two one resolver. Lift `declarationsFor` and `lengthPx`
    out of `test/browser-shell.test.mjs` into `test/helpers.mjs`, or into a
    small module beside it, and have the test and the probe both resolve `--ctl`
    and `--stick` through it. The probe then states only the historical rule,
    which is the one figure it has no other source for.
  - From: UI/UX Override - the nav's dropdown anchors, and an accent on nothing
- [x] Published Figure 1
  - **Issue**: The arithmetic moved above the marker and the suite executes it
    now, but the line that binds each figure to its property name did not, and
    that line is still checked only by `assert.match(html,
    /setProperty\(\s*'--footerpx'/)` and its twin for `--playpx`
    (`test/browser-shell.test.mjs:485-486`) - the calls have to be present, not
    correct. Verified by mutation: swapping the two arguments at
    `index.html:2314-2315`, so `--footerpx` is given `playBandPx(grid)` and
    `--playpx` is given `footerBandPx(grid,canvas.height)`, leaves all 454 tests
    green. In a browser that is not a near miss. At 375x667 it publishes
    `--footerpx: 600px` and `--playpx: 31px`, so FIRE is drawn 4.4px across and
    sits 607px up a 667px viewport instead of 90px across and 38px up; at
    932x430 it is 10.5px across and 328px up instead of 118px and 56px. Every
    control is a dot near the top of the screen and none of them is reachable by
    a thumb. `handleResize` is still below the
    `// ===== Canvas Setup & Sizing =====` marker `test/helpers.mjs` stops at,
    so nothing in the suite executes the call itself.
  - **Goal**: Pin the pairing rather than the presence. Either lift the
    publishing above the marker as well - a pure function of a fitted grid and a
    viewport height returning the two properties as a map, which `handleResize`
    then only hands to the style - and assert the map; or parse the two
    `setProperty` lines out of the file and assert each names the function that
    belongs to it. The first is the same lift the `## Current` item *The page's
    use of the fitted grid has no check* proposes for the `ScreenBuffer`
    re-seating in that function, so the two are one piece of work if they land
    together.
  - From: Code Review Override - the offset that outgrows a short viewport, and a figure nothing reads

## Archived 09-29-26

- [x] Caret Box 1 - the caret button's box is shorter than the link beside it
  - **Issue**: The dropdowns themselves work. Measured in chromium at 1280x900
    on `docs/index.html` and `docs/usage.html`, all four groups draw a caret,
    each caret opens its own list and closes whichever other was open, the glyph
    flips `v` to `^`, Escape and an outside click both close, the link and the
    caret are consecutive separate tab stops, the caret takes the 2px
    `:focus-visible` ring, Enter and Space both open it, and the three page
    links still navigate on one click. What does not hold is the last of the
    item's own criteria: the caret's border box is 34.50px against the link's
    41.09px, a 6.59px difference, and `.has-sub`'s `align-items: center` centres
    the shorter box so it sits 3.30px inside the link's at the top and 3.29px
    inside it at the bottom. `.menu a:hover` and `.has-sub > button:hover` draw
    the same `var(--rule)` border, so moving the pointer or the focus from a
    page link onto its caret shrinks and re-centres the outlined box. On
    `docs/usage.html` it needs no interaction at all: the Usage link's
    `aria-current="page"` border is painted at y 49.09 and a hover on the caret
    beside it draws its bottom border at y 45.80. The cause is that the three
    caret-only buttons are flex containers whose only item is the 10px `::after`
    at `docs/assets/style.css:141`, giving a 16.50px line box where the link has
    23.10px. Reference is unaffected, because it has text. The narrow layout is
    clean: at 375x667 every group's list is open, the three `.sub-toggle`
    buttons are `display: none` with a zero box, no empty bordered box is drawn
    anywhere in the menu, and all eight anchors still close the menu behind
    them.
  - **Goal**: Resolve to [caret-box-height.prompt.md](.claude/prompts/caret-box-height.prompt.md)
  - From: UI/UX Override - the nav's dropdown anchors, and an accent on nothing
- [x] The fixed bar is 83px on a desktop, not the 50px `--bar` declares
  - **Issue**: `docs/assets/style.css:31` declares the bar's height once as
    `--bar: calc(var(--s7) + 2px)`, 50px, and `DESIGN_LANGUAGE.md:168-173`
    records that as the figure the site reads rather than repeats. Measured in
    chromium, the drawn bar is 83.09px at every width from 861px to 1920px and
    50px at 860px and below. `.menu` is a `ul` and its entries are `li`, so
    `docs/assets/style.css:161` gives the menu a 16px bottom margin and `:163`
    gives each entry 8px, neither of which `.menu`'s own `padding: 0` at `:111`
    touches. The consequence is that `scroll-padding-top: var(--s8)` at `:64`,
    64px, is 19px short of the bar it was chosen to clear, and seven of the
    eight in-page anchors the nav carries park their heading underneath it at
    1280x900 - `usage.html#controls` by 19.15px, `development.html#tests` by
    19.06px, `getting-started.html#play-in-terminal` by 13.75px, and so on.
    `usage.html#debug-modes` is clear only because the scroll runs out of
    document first. Roughly the top half of each `h2` is behind the bar. This
    predates the caret work: the same measurement against `HEAD` gives an
    identical 83.09px bar and an identical 19.15px of `usage.html#controls`
    behind it. What changed is that three of the four groups could not be opened
    on a desktop until this run, so seven of these eight anchors were
    unreachable from the wide nav and nobody arrived at them by clicking.
  - **Goal**: Resolve to [nav-bar-height.prompt.md](.claude/prompts/nav-bar-height.prompt.md)
  - From: UI/UX Override - the caret's box, and the bar the anchors land under
- [x] The Reference button announces the caret glyph as part of its name
  - **Issue**: The item's request records that each caret button's `aria-label`
    "is the only name it has, since the caret glyph comes from CSS `content` and
    is not in the DOM". The glyph is not in the DOM, but it is in the accessible
    name: CSS generated content takes part in the name computation. For the
    three new caret buttons this is harmless, because their `aria-label`
    outranks their contents. Reference has no `aria-label` - it is the one group
    whose button carries its own text - so its name is computed from contents
    and picks up the `::after`. Read out of the accessibility tree in chromium
    at 1280x900, the button is named `"Reference v"` closed and `"Reference ^"`
    open, so `getByRole('button', { name: 'Reference', exact: true })` matches
    nothing and a screen reader reads the decoration aloud and re-reads the name
    on every toggle, which `aria-expanded` already conveys. Reference is
    unchanged by this run; the `::after` at `docs/assets/style.css:141` has been
    there since the nav landed in `c36ae4c`.
  - **Goal**: Give the Reference button `aria-label="Reference"`, the same
    mechanism the three caret-only buttons already use, so its name is its
    visible label and nothing else. Keep the label equal to the visible text
    rather than expanding it, since the visible label has to be contained in the
    accessible name. Worth an assertion in `test/docs-site.test.mjs`: every
    `.has-sub > button` carries an `aria-label`, which is checkable as text.
  - From: UI/UX Override - the caret's box, and the bar the anchors land under
- [x] Probe Flags 1 - the rig's flag table is the new contract and nothing checks it
  - **Issue**: The settlement works when run by hand - `npm run probe` prints the
    table, `npm run probe -- overlay-anchor --grid 80x24` prints "overlay-anchor
    does not take --grid" and exits 1, and each `flags` list matches the
    parameters its probe's `run()` destructures today. Nothing in `test/` reaches
    any of that, and the table's own comment at `test/probes/run.mjs:42-46` says
    "a probe gaining or losing an argument is a line changed here rather than a
    flag silently ignored", which is the thing no longer true the moment the two
    fall out of step. The failing direction is the one the completed item was
    opened to end. Verified by mutation: drop `count` from the destructuring at
    `test/probes/column.mjs:47` so the probe stops reading it, and
    `npm run probe -- column --grid 80x24 --build browser --count 6` is still
    accepted, still prints "contact: 24 placements" and still reports a figure a
    caller will read as a narrowed walk - with all 460 tests green, because the
    table still lists the flag. `CHEATSHEET.md:101-103`,
    `docs/cheatsheet.html:53` and `docs/development.html:30` all promise the
    non-zero exit as well, so three documents now rest on behaviour nothing
    exercises.
  - **Goal**: Pin the table against the probes rather than against itself.
    `run.mjs` executes a probe at import - top-level `await` on
    `process.argv` - so the suite cannot import it as it stands: either move
    `PROBES` into a module `run.mjs` imports and a test can too, or read both
    files as text the way `test/browser-shell.test.mjs` reads `index.html`.
    Then assert, for every probe, that its `flags` list is exactly the parameter
    names its `run()` destructures - so a probe losing `count` fails here rather
    than going quiet - and assert the refusal end to end with one `spawnSync` of
    `node test/probes/run.mjs overlay-anchor --grid 80x24`, checking the exit
    code and the message naming the flag it refused. Browser and terminal both: the rig
    is neither, so `test/parity.test.mjs` has nothing to pair this with.
  - From: UI/UX Override - the nav's dropdown anchors, and an accent on nothing

## Archived 09-30-26

- [x] The new resolver collects at-rule context and then ignores it
  - **Issue**: `test/page-style.mjs:30-60` records for every rule the at-rule
    preludes it sits inside, and `declarationsFor` at `:92` then folds every rule
    naming a selector regardless of that context. On `index.html` this cannot
    show: the page has one `:root` and no `@media` at all. On
    `docs/assets/style.css`, which `test/docs-site.test.mjs:26` already points
    the same module at, it does. `:root` is declared twice - the dark block at
    `:9` and the light block inside `@media (prefers-color-scheme: light)` at
    `:39` - so `styleSheet(css).properties` comes back as the light scheme:
    `--page` is `#f2f2f4` where the base block declares `#000000`, and `--text`,
    `--heading` and `--rule` likewise. The doc comment at `:102` says these are
    "the custom properties the sheet declares on `:root`", which is the dark
    scheme, so the function and its own description disagree. Nothing reads
    `properties` or `declarationsFor` for the docs sheet yet, which is the only
    reason the suite is green - `test/docs-site.test.mjs` walks `style.rules`
    directly and filters on `rule.at.length` itself.
  - **Goal**: Decide what the two folding functions mean by a sheet with a media
    query in it, and say it in one place rather than leaving each caller to
    remember. Either `declarationsFor` takes the top-level cascade only and a
    caller asking for a media block's rules goes through `rules`, or it takes a
    condition and folds what matches - the first is the smaller change and is
    what both current callers want. Correct the `properties` comment to whichever
    it becomes. Worth an assertion in `test/docs-site.test.mjs` either way, since
    the site's stylesheet is the repository's only sheet that declares `:root`
    twice and is therefore the only thing that can catch this: resolve `--page`
    off `docs/assets/style.css` and pin which scheme answers.
  - From: Code Review Override - the resolver's at-rule context, and the rig's unchecked flag table
- [x] **The Reference group sits off the right edge between 861px and 950px** -
  The wide nav lays its eight entries on one unwrapped row, and that row is
  wider than the width it switches on at, so the last group is painted past the
  right edge of the screen across the first 90px of the wide range.
  - **Issue**: Measured in chromium on `docs/index.html`, identical in both
    colour schemes. At 861px the Reference group's box runs 841.47px to
    951.16px in an 861px viewport, so 17.8% of the control is on screen;
    `.nav-bar` overflows by 90px, by 51px at 900px, and first fits at 951px.
    Opening it is worse than leaving it shut - the list runs to 1049.73px, 9.4%
    visible, with `Project Structure`, `Terminal Requirements`, `How It Works`
    and `Cheatsheet` all laid out between 846px and 1045px. Nothing can scroll
    to them: `.nav` is `position: fixed`, so the overflow never reaches the
    document and `scrollWidth` stays equal to `clientWidth` at every one of
    these widths. Keyboard focus does land on the button, but a fixed ancestor
    cannot be scrolled, so `window.scrollX` stays 0 and the focused control
    stays invisible. Between 861px and 950px the nav offers no usable route to
    four of the site's ten pages. Not this turn's doing: the same figures come
    back from `git show HEAD:docs/assets/style.css` served in place of the
    working tree's, so the defect predates the bar fix it was found beside.
  - **Goal**: Resolve to [nav-reference-offscreen.prompt.md](.claude/prompts/nav-reference-offscreen.prompt.md)
  - From: UI/UX Override - the width the wide nav switches on at
- [x] **The bar check reads one column of the bar and calls it the bar** -
  `test/docs-site.test.mjs:275-281` builds the drawn height out of `.menu a`
  alone: the link's box, `.nav-bar`'s padding, and `.nav`'s bottom border. The
  bar is a flex row and its height is the tallest of its children, and `.brand`
  and `.nav-toggle` are children too.
  - **Issue**: The check is named "the bar draws the height `--bar` declares"
    and answers for the menu column only, so the fault it was written to end
    comes back through any other child with all 468 tests green. Verified by
    mutation: add `padding: var(--s3) 0` to `.brand` at
    `docs/assets/style.css:104` and the brand's 26.4px line box becomes 50.4px,
    taller than the link's 42px, so the bar draws 68.4px against the 60px
    `--bar` declares - and `node --test test/docs-site.test.mjs` reports 8 of 8
    passing. That is the same shape as the defect just fixed: something inside
    the bar grew, the bar grew with it, and `--bar` went on declaring a figure
    nothing drew. `.brand` is the child that can do it, because it states no
    line box of its own and takes the body's 1.65 off a 16px base.
  - **Goal**: Have the check take the tallest child rather than an assumed one.
    That needs `controlHeight` to resolve a control with no `line-height` of its
    own, which it deliberately refuses today - the refusal is what caught the
    caret button - so the decision is either to give `test/page-style.mjs` an
    inherited font size and line height to resolve a unitless ratio against, or
    to have `.brand` and `.nav-toggle` state their own line box the way
    `.menu a` and `.has-sub > button` now do and keep the refusal as it is. The
    second is the smaller change and keeps every term in `--bar` a token. Either
    way the check should fold every direct child of `.nav-bar` the layout shows
    and assert the maximum, so the narrow layout's `--bar` is covered by the
    same walk against the MENU button.
  - From: Code Review Override - the bar check that reads one column, and the step with two readers

## Archived 10-01-26

- [x] **Two documents in one commit disagree on how many rules read `--s8`** -
  `DESIGN_LANGUAGE.md:116` says "the only thing that read it was the offset that
  holds content clear of the fixed bar", and `CHANGELOG.md:44` in the same
  commit says "`--s8` had exactly two readers, the scroll offset and the page
  frame's top padding".
  - **Issue**: The changelog is the accurate one. `git show HEAD:docs/assets/style.css`
    carries `var(--s8)` twice - `scroll-padding-top` at `:64` and `.wrap`'s top
    padding at `:151` - so the design file undercounts by one and the two
    records of the same removal cannot both be read as written. Nothing is
    broken by it; the cost is that `DESIGN_LANGUAGE.md` is the file the
    stylesheet's own header points at as the record of where each value came
    from, so a reader checking why the step went is told one rule read it and
    finds two.
  - **Goal**: Say two in `DESIGN_LANGUAGE.md`, naming both the way the changelog
    does, or drop the count and say only that the step's readers now derive from
    the bar's own height. Either agrees with the stylesheet; the present wording
    does not.
  - From: Code Review Override - the bar check that reads one column, and the step with two readers
- [x] **Nothing checks that a page and the file it is published from agree** -
  `docs/project-structure.html` calls `cheatsheet.html` "CHEATSHEET.md as a
  page" and `quickstart.html` "QUICKSTART.md as a page", and no test compares
  either pair. An edit to the file that misses the page is silent.
  - **Issue**: It has now been missed on two consecutive runs, in the same
    paragraph. 0.7.3 added ", and which flags each probe takes" to
    `CHEATSHEET.md` and left it off the page; 0.7.4 added the paragraph naming
    `test/probes/probes.mjs` and `test/probes.test.mjs` and left that off too.
    Both were found by reading the two files side by side, which is the only
    thing that has ever checked them. Normalizing away the markup on both sides
    and asking which of `CHEATSHEET.md`'s prose paragraphs the page carries
    answered it in one pass, and answered 2 before this review's fix and 0
    after.
  - **Goal**: Assert it in `test/docs-site.test.mjs`, which already reads the
    pages as text. Strip the tags out of the page's `<main>`, unescape the
    entities, take the prose paragraphs out of the markdown with the fenced
    blocks and tables removed, collapse whitespace and inline code markers on
    both sides, and assert every paragraph of the file is on the page. Pin both
    pairs the site names - `CHEATSHEET.md` and `QUICKSTART.md` - and read the
    pairing off `docs/project-structure.html`'s own "X.md as a page" lines
    rather than listing it here, so a third page added later is covered without
    a second edit. One direction only: the pages carry a pager and a nav the
    files have no equivalent of, so the page holding more than the file is not
    the fault.
  - From: Code Review Override - the bar check that reads one column, and the step with two readers
- [x] **The layout resolver reads any width query as the narrow one** -
  `test/docs-site.test.mjs:349-352` decides a rule applies to the narrow layout
  when every at-rule prelude around it matches `/\bwidth:/`, and to the wide
  layout only when the rule sits at the top level with no prelude at all.
  - **Issue**: Nothing fails today, because `docs/assets/style.css` carries
    exactly one width query. A `@media (min-width: ...)` block added later is
    folded into the narrow layout and left out of the wide one, which is
    backwards in both directions, and the breakpoint check beside it collects
    `max-width` preludes only - `assert.equal(widths.size, 1, ...)` at `:604` -
    so nothing names the new query either. The bar walk would then report a
    height for a layout the stylesheet does not have, silently and with the
    suite green, which is the exact failure this file was written to end.
  - **Goal**: Read the bound as well as the property, so a `max-width` prelude
    applies to the narrow layout and a `min-width` one to the wide, and have the
    breakpoint check assert the sheet names no width query it did not account
    for - the way it already asserts there is exactly one `max-width`.
  - From: Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips

## Archived 10-02-26

- [x] **A group left open on the wide layout keeps its caret on the narrow one** -
  `docs/assets/style.css:181` declares
  `.has-sub > button[aria-expanded="true"]::after { content: "^"; }` at the top
  level, and the narrow block's `.has-sub > button::after { content: ""; }` at
  `:309` is the rule meant to take that glyph away. A media query contributes no
  specificity, so (0,2,2) beats (0,1,2) whichever comes later in the file, and
  the narrow layout cannot blank the caret of a button that is expanded.
  - **Issue**: `docs/assets/docs.js:38-42` sets `aria-expanded="true"` only
    while `wide.matches`, and nothing ever resets it - there is no `change`
    listener on the `wide` MediaQueryList and no resize handler - so the
    attribute survives a layout change. The failing sequence: open
    `docs/index.html` at 1280px, click the Reference caret, then narrow the
    window to 900px. Reference is the one `.has-sub > button` the narrow layout
    still shows, because the three `.sub-toggle` buttons are `display: none` at
    `:307`, and it reads `Reference ^` as a static label with `cursor: default`,
    advertising a control that no longer toggles anything. The stale
    `aria-expanded="true"` rides along on that same label. Not introduced this
    turn - the two rules are byte-identical at `HEAD` - but newly reachable
    across the 90px this turn moved into the narrow layout, since at 900px the
    old 861px boundary still gave the wide layout, where the caret was correct.
  - **Goal**: Either blank the glyph in the narrow block at a specificity that
    wins, `.has-sub > button[aria-expanded="true"]::after { content: ""; }`
    beside the rule already there, or reset the attribute from `docs.js` on the
    `wide` MediaQueryList's `change` event, which clears the stale
    `aria-expanded` as well as the caret. Verifying either from text needs
    something the rig does not have: `test/page-style.mjs` folds rules in
    document order and models no specificity at all, which is the same blind
    spot that let this sit unseen while the bar walk was being built on top of
    it. Give the resolver a specificity ordering, then assert which `content`
    wins for `.has-sub > button::after` in each layout and each `aria-expanded`
    state. A browser is not needed for any of it.
  - From: Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips
- [x] **The new page-against-file check compares prose and skips every list item** -
  `prose()` at `test/docs-site.test.mjs:254-282` drops list items and the
  indented lines that continue them, so the check added this turn compares 6 of
  QUICKSTART.md's 15 blocks and 9 of CHEATSHEET.md's 13.
  - **Issue**: The gameplay list at `QUICKSTART.md:44-53` and the terminal floor
    list at `CHEATSHEET.md:126-129` are not compared against their pages at all,
    which is the same silent drift the item was opened to end. Verified by
    mutation: delete the whole `<li>Kills inside two seconds of each other
    chain, up to <code>COMBO x8</code>.</li>` from `docs/quickstart.html` and
    `node --test test/docs-site.test.mjs` reports 10 of 10 passing. The comment
    at `:246-252` justifies the exclusion by reformatting - "a table or a fenced
    block is reformatted on its way to the page" - which holds for those two and
    not for a bullet list, which becomes `<ul><li>` and survives the normalizing
    the function already does.
  - **Goal**: Take list items as well as paragraphs - marker stripped, indented
    continuations joined onto their item, through the same link-stripping and
    `flatten` - and keep the fenced-block and table exclusions, for which the
    reformatting argument does hold. Measured before queuing this: pulling all
    13 list items out of both files that way, every one is already on its page,
    so the gap closes with nothing else to fix. While in that function,
    `flatten` at `:226` drops backticks but not `**` or `_`, so the first prose
    paragraph to gain emphasis is reported as missing from a page that carries
    it; strip the emphasis markers on the file side too.
  - From: Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips
- [x] **Nothing pins that the narrow layout opens every group** -
  `docs/assets/style.css:305` gives the narrow `.sub` a `display: block`, and
  that is the only thing showing the four pages under Reference below the
  breakpoint. It wins over the top-level `.sub { display: none }` at `:182` on
  document order alone, because both are a lone class at (0,1,0), and nothing in
  the suite reads either one.
  - **Issue**: This run's script change made that rule load-bearing.
    `docs/assets/docs.js:52-56` now sets `aria-expanded="false"` on every group
    when the layout narrows, so the reveal rule at `:187` no longer applies on
    the narrow layout either, and the narrow `.sub` rule is the last thing left
    drawing those pages. Verified by mutation: delete `display: block;` from
    `:305` and `npm test` reports 472 of 472 passing, with `Project Structure`,
    `Terminal Requirements`, `How It Works` and `Cheatsheet` unreachable at
    every narrow width. That is the 0.7.5 defect back, and the script change
    makes it total rather than partial - before it, a group opened above the
    breakpoint at least carried its revealed `.sub` down.
  - **Goal**: Assert in `test/docs-site.test.mjs` that `.sub` resolves to a
    shown `display` on the narrow layout in both `aria-expanded` states, the way
    the caret test already reads `content` per layout and state. `declIn` and the
    new specificity ordering already answer it; the walk at `:610` reads `.sub`
    for its margins and is the place to read its display beside them.
  - From: Code Review Override - the emphasis stripper inside code spans, and the open groups nothing pins

## Archived 10-03-26

- [x] **The specificity model has no checks of its own** -
  `test/page-style.mjs:219` is a new exported function that three test files now
  resolve rules through, and its only exercise is the two selectors the caret
  test names. Nothing reads the counts it returns.
  - **Issue**: The answers are not obvious enough to leave unpinned - `a:before`
    and `a::before` both weigh (0,0,2) because the legacy spelling is still a
    pseudo-element, while `a:hover` weighs (0,1,1). The doc comment at `:206-218`
    names its own blind spots, `:not()`, `:is()` and `:has()`, whose argument
    specificity it does not model, and asks a caller who adds one to teach the
    function rather than trust it. Nothing enforces that: neither stylesheet uses
    one today, so the first `:not()` added gets a silently wrong count and the
    rule it decides folds in the wrong order.
  - **Goal**: Pin a table of selectors against their expected triples, covering
    the id, class, attribute, pseudo-class, pseudo-element and `*` cases and both
    colon spellings. Then make the blind spot loud rather than silent: throw on a
    selector carrying `:not(`, `:is(`, `:where(` or `:has(`, so a sheet that
    gains one fails in the resolver instead of resolving to a plausible count.
  - From: Code Review Override - the emphasis stripper inside code spans, and the open groups nothing pins
- [x] **The emphasis stripper reaches inside inline code** -
  `test/docs-site.test.mjs:254-258` strips `**`, `__`, `*` and `_` from the file
  side of the page-against-file check, and `:304` runs it before `flatten` at
  `:226` drops the backticks, so it has no way to tell a code span from prose and
  takes the markers out of both.
  - **Issue**: Markdown holds emphasis markers literal inside a code span, and so
    does the page: `` `__init__` `` reaches `<code>__init__</code>` and
    `mainText` strips the tags to `__init__`, while the file side resolves to
    `init`. The block is then reported as missing from a page that carries it
    verbatim, which is a false failure in the one check written to catch real
    drift. Measured on the helper directly: `` `__init__` in code `` resolves to
    `` `init` in code ``, and `` `**not bold**` in code `` to
    `` `not bold` in code ``. Nothing fails today only because neither
    `QUICKSTART.md` nor `CHEATSHEET.md` contains a single `*` or `_` - the whole
    function is unreached, so the first file to gain either is also the first
    thing to exercise it.
  - **Goal**: Hold the code spans out of the stripping - take the backticked runs
    aside, strip emphasis from what is left, then put them back - or strip the
    backticks first and mark their contents so the emphasis passes skip them.
    Either way pin it with the two cases above plus the identifiers the comment
    already claims survive, `THEME_BG` and `snake_case`, since those claims are
    untested too.
  - From: Code Review Override - the emphasis stripper inside code spans, and the open groups nothing pins
- [x] **The opened Reference dropdown overruns the viewport from 951px to 1049px** -
  The breakpoint move put the wide layout where the collapsed row fits. The
  opened Reference panel needs 1050px, so across the first 99px of the wide
  range it is painted past the right edge of a bar nothing can scroll.
  - **Issue**: Measured in chromium on `docs/index.html` served over HTTP,
    identical in both colour schemes. `.menu` is left-packed at its natural
    width, so the Reference group's left edge is pinned at 841.47px at every
    wide viewport up to 1049px, and the panel hangs rightward from there at a
    fixed 208.27px, ending at 1049.73px however narrow the window is. That is
    98.73px past the edge at 951px, 9.73px at 1040px, and it first fits at
    1050px. At 951px the panel is 52.6% on screen and the four entries are
    clipped mid-word: `Project Structure` reads `Project Str`,
    `Terminal Requirements` reads `Terminal Re`. Nothing can scroll to them -
    `.nav` is `position: fixed`, so `document.documentElement.scrollWidth`
    stays equal to the viewport width across the whole band and
    `scrollIntoView()` on an entry leaves `window.scrollX` at 0. Keyboard is
    the same defect: open the group at 951px and the next four Tabs land on
    `Project Structure`, `Terminal Requirements`, `How It Works` and
    `Cheatsheet`, each with its box ending at 1044.73px of a 951px viewport.
    The three other groups sit further left and never overrun, clearing the
    edge by 313.41px, 140.50px and 49.63px at 951px.

    Not a reopening of **The Reference group sits off the right edge between
    861px and 950px**, which is complete and verified clean this run: at 861px,
    900px and 950px the narrow layout shows, nothing inside `.nav-bar` passes
    the right edge, the Reference group's box ends at 853px, 892px and 942px,
    and all ten pages are reachable with every tabbed control on screen. That
    item's own issue text recorded the 1049.73px figure, but its goal was the
    breakpoint, and the breakpoint is where its fix landed. This is the band
    just above the one it fixed.
  - **Goal**: Resolve to [nav-dropdown-overruns-at-951.prompt.md](.claude/prompts/nav-dropdown-overruns-at-951.prompt.md)
  - From: UI/UX Override - the dropdown that needs more room than the row does
- [x] **The record says three test files weigh `specificity`, and one did** -
  `test/page-style.test.mjs:4` opens "Three test files resolve rules through it",
  and `CHANGELOG.md:47-48` repeats it as "`specificity` is weighed by three test
  files".
  - **Issue**: Before this turn exactly one file imported it,
    `test/docs-site.test.mjs:21`, and this turn's new file makes two. Three files
    do resolve a stylesheet through the module `test/page-style.mjs` -
    `test/browser-shell.test.mjs`, `test/docs-site.test.mjs` and
    `test/probes/overlay-anchor.mjs` - but two of them import only `pageStyle`,
    for lengths rather than for cascade order, and one of the three is a probe
    rather than a test file, so the count is wrong under either reading. The
    header contradicts itself a sentence later as well: it says the function's
    only exercise was the two selectors the caret check in one named file names,
    which cannot be true of something three test files resolve rules through.
    Nothing fails. The cost is that the sentence giving the new file its reason
    to exist overstates what was already covered, and that sentence is what a
    reader checks when deciding whether the resolver still needs tests.
  - **Goal**: Say what is there - one test file weighed `specificity` before this
    turn and two do now, while three files read a stylesheet through the module,
    two of them for lengths and one of them a probe. Correct the same claim in
    `CHANGELOG.md:47-48`.
  - From: Code Review Override - what the specificity resolver is recorded as covering

## Archived 10-04-26

- [x] **The functional-pseudo guard is recorded as covering the sheet and covers
  the selectors a caller names** - `test/page-style.mjs:222` says "a sheet that
  gains one fails here, where the gap is", and `CHANGELOG.md:63-65` has the throw
  answering for "the first sheet to gain one".
  - **Issue**: `specificity` is only ever reached for a selector a caller already
    listed. `declIn` at `test/docs-site.test.mjs:529` weighs only
    `rule.selectors.filter((sel) => selectors.includes(sel))` and skips a rule
    naming nothing in that list, and `declarationsFor` in `test/page-style.mjs`
    never calls `specificity` at all. So add
    `.has-sub:not([aria-expanded]) > .sub { display: none }` to
    `docs/assets/style.css` and the guard never fires: `declIn('narrow', '.sub')`
    returns exactly what it returns today, a rule that really applies is left out
    of the fold, and the suite stays green. That is the same silent wrong answer
    the throw was added to end, reached by a selector no test names rather than by
    one some test does. The guard is correct for what it covers; the two
    sentences claim more than it covers.
  - **Goal**: Either narrow both sentences to what the guard does - a selector a
    caller weighs, not a sheet - or close the gap so they come true: walk every
    rule in the sheet once and throw on a functional pseudo-class anywhere in it,
    the way the breakpoint check already asserts the sheet names no width query it
    could not place. The second is the stronger of the two and is what this module
    already does for a length it cannot resolve.
  - From: Code Review Override - what the specificity resolver is recorded as covering
- [x] **Shots die short of what the tunnel shows** - A bullet's two second life
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
- [x] **The page's use of the fitted grid has no check** - `fitGrid` itself is
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
- [x] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.
  - From: Polish

## Archived 10-05-26

- [x] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.
  - From: Polish
- [x] The test harness restates the bolt speed the engine now names
  - **Issue**: `BULLET_SPEED` was added to both builds this turn and both now
    read their travel off it, and `BUILDS` in `test/engagement.mjs:37-56` carries
    it for each build (`:44` and `:53`) so the harness has it to hand. Three places in that file
    still write the figure out instead: `const travel = 60 * dt` at
    `test/engagement.mjs:535`, `:818` and `:1362`. Nothing fails, because 60 is
    what the constant holds. The cost is that the rebuilt frame these three
    compute is the thing every reach, band and pairing reading is measured
    against, so a change to `BULLET_SPEED` leaves the harness measuring the old
    cannon and the parity check at `test/parity.test.mjs:59` passes while every
    figure quoted beside it is wrong. The adjacent `advance` lines use a 60 of
    their own - units per unit of speed, not bullet travel - so the two have to
    be told apart rather than replaced together.
  - **Goal**: Read the travel off `build.BULLET_SPEED` at all three sites, the
    way `volleyLife` already reads the life off `build.BULLET_LIFE_SLACK`, and
    leave the `advance` 60 alone with a word saying which figure it is.
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] **Inset Figures**: `tuneText`'s comment credits `geometricPrecision` with
  work the centring does on its own
  - **Issue**: The doc comment at `index.html:291-306` says
    "`geometricPrecision` is what makes the centring above worth having", on the
    stated ground that "left to itself a canvas rounds a glyph's position and
    its advance to whole pixels, which snaps the inset straight back to zero".
    Measured in chromium against the shipped page, it does not. A six-glyph run
    drawn at the page's own `FONT` and `cellW` came back byte-identical under
    `textRendering: 'auto'` and under `geometricPrecision` with kerning off, for
    `░ ▒ ▓ █ ╣ M` at 16px, 8px, 7px and 6px, in both colour schemes - 96
    comparisons with no pixel column differing by one level. The fractional x is
    honoured either way, so the centring stands up without the request and the
    reason given for it is not the engine's behaviour. The centring itself does
    land: at 7px, where the slack is worst, the darkest column at a junction
    between two tiling glyphs rose from 192 to 205 for `▒ ▓ █` and 144 to 162
    for `░`, the one-pixel left overhang went away, and the part-inked columns
    in a run halved from 14 to 7. Nothing is broken; the comment claims a
    mechanism the measurement contradicts, which is the kind of claim the next
    person to touch the renderer would reason from.
  - **Goal**: Resolve to [tune-text-rationale.prompt.md](.claude/prompts/tune-text-rationale.prompt.md)
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] The same `geometricPrecision` rationale is recorded in three more places
  - **Issue**: The override above covers the doc comment at `index.html:291-306`
    and its prompt file says plainly what not to touch, naming
    `test/menu-layout.test.mjs` under **What not to change**. The claim it
    corrects is not only there. `CHANGELOG.md:0.8.0-alpha` has "asked for
    `geometricPrecision` text and no kerning, which is what makes the centring
    worth having: left to itself a canvas rounds both a glyph's position and its
    advance to whole pixels, snapping the inset back to zero";
    `test/menu-layout.test.mjs` opens the test `the grid is drawn with hinted
    rounding off` with "The centring is only worth having with this set. Left to
    itself a canvas rounds both a glyph's position and its advance to whole
    pixels, which snaps the inset back to zero and puts the grid back where it
    started"; and `docs/how-it-works.html` publishes "the canvas is asked for
    exact glyph positions rather than hinted ones so the centring survives being
    drawn". All three are the mechanism the 96 chromium comparisons in the prompt
    file contradict, and the third is on the public site. Worked as written, the
    override narrows one of four copies and leaves three standing, one of them in
    the test whose name asserts it.
  - **Goal**: Narrow all four together when the prompt file is worked, on the
    measurement it already carries: keep both settings and both capability
    checks, and say the fractional x is honoured either way in this engine, so
    the request is insurance rather than the thing doing the work. The test's
    assertions are correct and stay - `textRendering`, `fontKerning` and
    `textBaseline` are all genuinely set; it is the comment above them and the
    test's name that claim the mechanism.
  - From: UI/UX Override - what the glyph tuning is recorded as doing

## Archived 10-06-26

- [x] The pad's release rule is recorded as verified by a key the pad cannot hold
  - **Issue**: `CHANGELOG.md:0.8.0-alpha` closes the gamepad entry with "Verified
    in a chromium window against a stubbed `navigator.getGamepads`: ... and a `D`
    held on the keyboard survived a resting pad." `D` is not one of the nine
    names `PAD_CONTROL_KEYS` holds - the pad steers on `LEFT`, `RIGHT`, `UP` and
    `DOWN`, and the keyboard reaches those through the arrow keys rather than
    through `WASD`. So the poll's loop never visits `D` whatever `padWasHeld`
    says, and that reading would have come back the same with the release rule
    deleted. The rule itself holds, and is pinned at the seam the suite can reach
    by `the page polls the pad once a frame and releases only what it pressed` in
    `test/browser-shell.test.mjs`. What is wrong is the sentence recording how it
    was checked live, which is what a reader consults when deciding whether the
    rule still needs watching.
  - **Goal**: Either re-run that check on a key the pad does reach - an arrow
    held on the keyboard while a pad rests, which is the collision the rule
    exists for - and record the result, or narrow the sentence to what the `D`
    reading can show, which is that the poll does not clear keys outside
    `PAD_CONTROL_KEYS`.
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] Inset Figures 1 - the range and the two zeroes the narrowed comment adds
  are derived from an advance Courier New does not have
  - **Issue**: The narrowing itself landed - the `geometricPrecision` mechanism
    claim is gone from all four places. What it added in its place is a new
    paragraph in `tuneText`'s doc comment at `index.html:308-313`, repeated in
    `CHANGELOG.md:30-35`, giving the inset's range and two sizes where it is
    said to be zero. All three of its figures are wrong, measured in chromium
    against the page's own `measureCell` at every size `fitGrid` can settle on.
    Courier New advances at `1229/2048` em, which is `0.6000977`, not at `0.6`
    em: the measured advance matches `1229/2048 * size` at all eleven sizes to
    within half a thousandth of a pixel and matches `0.6 * size` at none of
    them. Because `cellW` is the ceiling of that advance, the four
    ten-thousandths of an em decide the cell at exactly the two sizes the
    comment singles out - at font 10 an advance of `6.001` ceils to `7` where
    `6.000` would ceil to `6`, and at font 15 `9.001` ceils to `10` where
    `9.000` would ceil to `9`. So the two sizes recorded as having no inset at
    all carry the largest insets in the range, `0.500px` and `0.499px`, and no
    size in the range has an inset of zero. The stated range of `0.100px to
    0.400px` is really `0.099px to 0.500px`. The claim is not merely off; at
    the two sizes it names it is inverted, and those are the two sizes where
    the centring does the most good. The bound the same paragraph states - the
    slack always under a pixel, the inset always half of it and never reaching
    half a pixel - was checked and holds.
  - **Goal**: Resolve to [inset-figures.prompt.md](.claude/prompts/inset-figures.prompt.md)
  - From: UI/UX Override - what the glyph tuning is recorded as doing
- [x] **Seam Measurement**: "Halves the seam" holds at four of the eleven font
  sizes, does nothing at four and reverses at three
  - **Issue**: `docs/how-it-works.html` publishes that centring the glyph
    "halves the seam between two of the box characters the tunnel walls are
    built from", and `index.html`'s comment and `CHANGELOG.md` say the same.
    Measured at the junction between two tiling wall glyphs - the wall is a ring
    outline two cells thick, so the tunnel holds pairs rather than runs, four of
    each glyph on screen at every size - by repainting the live buffer twice in
    one synchronous pass, once through `ScreenBuffer.render` with the page's own
    `cellAdvance` and once with `advance = cellW`, which is the left-packed grid
    this replaced. Taking the darkest of the two pixel columns either side of a
    junction, as a level out of 255: at an inset of 0.5px (fonts 15, 10) it
    rises 41.7 to 68.7 and the spread across the junction falls 82.3 to 23.3;
    at 0.4px (fonts 12, 7) it rises 55.3 to 72.0 and the spread falls 68.7 to
    36.3, which is the halving as described. At 0.3px (fonts 14, 9) the reading
    is exactly mirrored - 97.0/124.0 becomes 124.0/97.0, the deficit swapping
    sides with the darkest column and the spread unchanged to a tenth of a
    level. At 0.1px (fonts 13, 8) nothing moves at all. At 0.2px (fonts 16, 11,
    6) it goes the wrong way: the darkest column falls 111.7 to 102.0 and the
    spread widens 12.7 to 31.3, because left-packed was already nearly even
    there and the inset tips it past centre. Related: there is no gap between
    two of these glyphs to remove in the first place - of 28 glyph-and-size
    pairs, 24 ink wider than their cell and four ink exactly it, and `▒ ▓ █`
    each reach a whole pixel left of the origin they are drawn at, so two
    adjacent cells overlap. What the inset moves is where the soft edge of that
    overlap falls. The feature is worth having and the numbers say so - the
    worst seam in the build is at fonts 15 and 10 and that is where it helps
    most - but the sentence claims a uniform effect the raster does not show.
  - **Goal**: Narrow the three copies to what the measurement supports: the
    centring lifts the seam most where the slack is widest, which is where it
    was worst, and does nothing or a little harm where the slack is narrow. The
    figures are in [inset-figures.prompt.md](.claude/prompts/inset-figures.prompt.md)
    and in the `2026-10-04` entry of
    `test-results/ui-ux-tester.agent/ui-ux-tester.log`. The published sentence
    is the one that matters most, since it is the only one a visitor reads.
    Leave `docs/how-it-works.html`'s "a fifth of a pixel nobody sees" alone - at
    font 16 the inset is 0.199px and that is right.
  - From: UI/UX Override - the inset figures the glyph comment states

## Archived 10-07-26

- [x] A run of block glyphs still inks the column left of its first cell at the
  two sizes with the smallest inset
  - **Issue**: `▒`, `▓` and `█` reach a whole pixel left of the origin they are
    drawn at, at every font size, measured off `actualBoundingBoxLeft`. The
    inset normally clears it, and at nine of the eleven sizes nothing is drawn
    left of a run's first cell. At font 13 (inset 0.099px) and font 8 (inset
    0.100px) a tenth of a pixel is not enough: a run of `█` with an empty cell
    to its left inks the column left of that cell at level 39 of 255, the same
    level the left-packed grid put there. It is faint and it is not a
    regression - the centring neither caused it nor was expected to fix it -
    but the grid does bleed one column outside the cells it is laid out on at
    those two sizes, and nothing in the repository says so.
  - **Goal**: A decision rather than a change, and probably a sentence rather
    than code. Either record it beside `glyphInset` as a known limit of the
    placement at the narrow-slack sizes, or floor the inset so it always clears
    the left bearing - which would cost the centring its symmetry and wants
    weighing against a defect nobody has reported seeing. Do not change
    `glyphInset`'s arithmetic without the second decision: the suite pins the
    two margins being equal, in `the inset never pushes a glyph out of its own
    cell` in `test/menu-layout.test.mjs`, and a floor would break that
    deliberately. The open `## Measurement` item above, "A probe for the glyph
    tuning's own figures", is where this belongs if a browser probe is ever
    admitted - it is the same question of a figure that only chromium can
    produce.
  - From: UI/UX Override - the inset figures the glyph comment states
- [x] The probe call into the harness that changed signature this turn is run
  by nothing in `npm test`
  - **Issue**: `ghostFlight` gained a leading `build` parameter at
    `test/engagement.mjs:536`, and its only caller outside that file is
    `creep` at `test/probes/column.mjs:38`, which was updated to match and is
    correct today. Nothing in the suite runs it. `npm test` globs
    `test/*.test.mjs`, so `test/probes/column.mjs` is reached only by
    `npm run probe -- column`, and `test/probes.test.mjs` imports each probe to
    read what its `run()` destructures without ever calling it. So the pairing
    is unverified in the direction that just moved: pass the old argument list
    and `build` binds to the `game` object, `build.BULLET_SPEED` is
    `undefined`, `travel` is `NaN`, every row comparison in the walk is false,
    and `ghostFlight` returns `null` after its 400 frames. Checked by calling
    `ghostFlight(game, game, ...)` against a staged target at x 4.5, z -80:
    the correct call reports contact at z -66.2 and the old one returns
    `null`, which `creep` prints as `-`. All eight creep figures in the probe
    table would read `-` with 536 tests passing - the failure
    `test/probes.test.mjs` opens by naming, "Nothing failed, because nothing
    looked."
  - **Goal**: One assertion that reaches a probe's call into the harness
    rather than only its flag contract with the rig. `creep` is not exported,
    so the two openings are to invoke the probe's `run()` itself on a narrowed
    workload - one grid, one build, `count` 1 - and assert it resolves without
    throwing, which reaches every probe's harness calls at once; or to export
    `creep` and assert it returns a finite column figure for a staged target.
    The first covers more and is the better buy if a probe can be run quietly,
    since the rig prints as it goes. A probe reports and never asserts, so
    either way the assertion belongs in `test/probes.test.mjs`.
  - From: UI/UX Override - the inset figures the glyph comment states
- [x] **Narrowed Guard**: The narrowed probe workload is not pinned to the flag
  table it is keyed by
  - **Issue**: `NARROWED` at `test/probes.test.mjs:57` carries one value per
    argument property, and `narrowedArgs` resolves a probe's flags through it -
    `args[FLAG_ARG[flag]] = NARROWED[FLAG_ARG[flag]]`. Two checks in the same
    file pin the pieces either side of it: `the table names every flag the rig
    parses, and no others` pins `FLAG_ARG` against `parseArgs`, and `every probe
    takes exactly the flags the table lists for it` pins the table against each
    `run()`. Nothing pins `NARROWED` against `FLAG_ARG`. Add a flag to
    `parseArgs`, to `FLAG_ARG` and to a probe - the shape the rig has grown
    twice already - and `NARROWED` hands that probe `undefined` for it, which
    the probe reads as "not passed" and answers with its own default, the full
    walk. Every assertion still passes, and the workload the two new checks
    promise to narrow stops being narrow with nothing saying so. `free-flight`
    is the one that would hurt: its `passes` default is every seed in
    `FREE_SEEDS`.
  - **Goal**: Assert that `NARROWED` holds a value for every property
    `FLAG_ARG` maps, beside the check that `FLAG_ARG` matches `parseArgs`, so a
    flag added without a narrowed value fails the suite rather than widening the
    walk inside it.
  - From: Code Review Override - the seam count and the narrowed probe workload
- [x] "One placement" names a workload `free-flight` does not run
  - **Issue**: `NARROWED`'s doc comment at `test/probes.test.mjs:46`, the
    paragraph added to `CHEATSHEET.md`, and the matching sentences in
    `docs/cheatsheet.html` and `docs/development.html` all describe the new run
    as "one grid, one build and one placement". `count` is a placement walk for
    `column`, `frame-rate` and `seen-versus-kill`, and `free-flight` reads the
    same flag as frames - `const frames = count ?? FREE_FRAMES` at
    `test/probes/free-flight.mjs:57` - so `count: 1` flies one frame there. Its
    flight table comes back all zeroes, since no volley is fired in a single
    frame, and what actually reaches the harness for that probe is the rate walk
    at `FREE_RATE_FRAMES` and `darkWalk`, neither of which `count` narrows. The
    coverage holds; the sentence describing it is wrong for a quarter of the
    probes it covers, in two published pages.
  - **Goal**: Say what the narrowed `count` means per probe, or name the
    workload by what it is - one grid, one build, the smallest `count` the rig
    takes - rather than by a unit only three of the four probes share.
  - From: Code Review Override - the seam count and the narrowed probe workload
- [x] Seam Measurement 1 - the 28 glyph-and-size pairs behind the overlap claim
  are not the pairs the walls are drawn from
  - **Issue**: The narrowing landed, and the junction levels behind it are
    recorded where a reader can find them. What it added beside them is a count
    the repository contradicts. `index.html:286-290` says "Of the 28
    glyph-and-size pairs the walls are drawn from, 24 ink wider than their cell
    and four ink exactly it", and the 0.8.2-alpha `CHANGELOG.md` entry repeats
    it. `drawTunnel` picks the wall glyph from four characters - `░ ▒ ▓ █` at
    `index.html:1555-1558` - and `fitGrid` settles on eleven font sizes,
    `FONT_SIZE` 16 down to `MIN_FONT_SIZE` 6 in whole steps. That is 44
    glyph-and-size pairs, not 28. 28 is four glyphs against the seven distinct
    cell widths those eleven sizes produce: `ceil(1229/2048 * size)` runs 4, 5,
    5, 6, 7, 7, 8, 8, 9, 10, 10, so four of the sizes share a cell with another.
    Grouping by cell instead of by size merges sizes whose advance differs by
    most of a pixel - fonts 7 and 8 share a 5-pixel cell off advances of 4.201px
    and 4.801px - and ink width follows the advance, not the cell. So either
    sixteen pairs went unmeasured or the reading answers a different question
    from the one the sentence asks. The conclusion it supports is probably safe,
    since the left bearing the `glyphInset` comment records separately is read
    at every size; the number a reader can check is the part that is wrong.
  - **Goal**: Re-take the ink widths over all eleven sizes, or say which sizes
    the 28 covers and why, and correct both copies. If the count stays
    unrebuildable, add it to the browser-only half of the `## Measurement` item
    below, which already carries the junction levels and the left bearing but
    not this.
  - From: UI/UX Override - the inset figures the glyph comment states
- [x] The reflowed probe paragraph in the 0.8.2-alpha entry leaves a four-word
  orphan line
  - **Issue**: Rewording the narrowed-workload sentence at `CHANGELOG.md:153-155`
    rewrapped the first two lines and left the remainder of the sentence on a
    line of its own - "report; and the `column`", 26 characters in a file that
    wraps at 80. Nothing is wrong with what it says; it reads as a dropped line
    to anyone scanning the entry.
  - **Goal**: Reflow that one paragraph to the file's width. No wording change.
  - From: UI/UX Override - the figures the overlap sentence states
