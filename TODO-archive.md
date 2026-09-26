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
