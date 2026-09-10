# Changelog

## [0.3.2-alpha] - 2026-09-10

### Fixed

- The barrel roll no longer goes dead for the best part of a second after a
  hold. Suppressing the repeat stream on `Q` and `E` stopped a hold rolling over
  and over, but it did it with the flat 800ms window `P`, `M` and `ESCAPE` use,
  and that window restarts on every repeat character while `ROLL_COOLDOWN` runs
  from the start of the roll. The two clocks only lined up for a single tap:
  held for two seconds at ten characters a second, the cooldown expired at
  1200ms and a deliberate re-press 100ms, 300ms, 500ms or 700ms after letting go
  was swallowed anyway, so the escape move read as dead at the exact moment a
  player coming out of a dense stretch wanted it. The roll pair now measure
  their own window off the repeat stream instead: the first gap of a hold is the
  OS delay before repeat starts and is ignored, and the gaps after it are the
  rate, so the key re-arms about two repeat intervals after the last character
  rather than 800ms. A re-press 300ms after that hold now rolls. What is left is
  those two intervals, or 150ms where the stream is fast enough for the floor to
  be the wider of the two: 400ms at five characters a second, 200ms at ten, and
  150ms from about thirteen upwards. The slowest end keeps the old cost in full,
  because two intervals of the two-a-second floor on the Windows repeat-rate
  slider overrun the flat window and the cap holds it at 800ms, which is the one
  rate the measurement buys nothing at. One of those two intervals is not
  recoverable at any rate, since a press arriving exactly when the next repeat
  character was due is the same bytes at the same spacing as the hold carrying
  on; the second is the price of reading a stream the game loop delivers
  unevenly. `P`, `M` and `ESCAPE` keep the flat window, which costs them
  a beat between deliberate taps and nothing else, since no cooldown competes
  for those keys.
- A browser that would have allowed the sound outright is no longer silenced for
  the opening seconds of a `?mode=` link. Withholding the audio context until the
  page had been touched fixed the backlog of cues scheduled against a stopped
  clock, but it withheld it from every browser rather than from the ones that
  needed it: Chrome unblocks autoplay for an origin with a high media engagement
  score, and for any site given a sound permission, and hands such a page a
  context that is already running on a clock that advances. Ten seconds of
  `?mode=chaos` before a key was pressed built nothing and played nothing there,
  where the same browser used to play the run from its first frame. The context
  is built lazily on the first cue again, and the cues are gated on it actually
  running rather than on the keypress. A blocked browser hands back a suspended
  context whose cues are dropped rather than queued at `t = 0`, which is the same
  outcome as withholding it, and a permitting one plays from the first frame. The
  keypress stays as the nudge that wakes a suspended context.

## [0.3.1-alpha] - 2026-09-09

### Fixed

- A run opened straight from a `?mode=` debug link no longer opens with a loud
  clipped crack on the first keypress. A browser will not start an audio context
  before the page has been touched, and the one built for the first cue came
  back suspended with its clock stopped at zero, so every cue raised before that
  first key was scheduled for the same instant at full gain and the whole
  backlog sounded together the moment the context woke. Ten seconds of
  `?mode=chaos` before a key had 85 tones queued and peaked at more than four
  times full scale, against 0.03 for a single cannon shot. Nothing is built
  until the page has had its gesture now: the cues raised before it were never
  going to be audible, so they are dropped, and sound starts from the first key
  and plays forward. A run started from the title screen was never affected, and
  is unchanged.
- Holding `Q` or `E` in the terminal build rolls the ship once rather than over
  and over. The roll acts on the press, but the two keys were missing from the
  toggle key table, so they decayed on the 150ms movement window and every
  repeat character arriving after it re-armed as a fresh press. At two
  characters a second, the slowest setting on the Windows repeat-rate slider, a
  six second hold started four rolls and left the ship invincible for 35% of
  frames, which is exactly what the roll cooldown exists to bound. The browser
  build gates its `keydown` handler on the held key and never shared the fault.
  The suppression is not free: the window restarts on every repeat character
  while the cooldown runs from the start of the roll, so releasing a key held
  past the cooldown leaves the next press of it ignored for the rest of the
  window. That is the beat `P` and `M` have always needed between taps, and it
  is the better failure of the two.

### Changed

- The combo multiplier now stops at x8. It had no ceiling, so a chain that
  barely ever broke - obstacle density rises with difficulty, and two seconds is
  longer than the gap between kills - carried an ordinary run into the millions:
  three simulated minutes reached x343 and 12,024,295 points, against 111,295
  for the same run scored without a multiplier. The casualty was best-score
  persistence, where one long chain set a stored best that ordinary play could
  never approach again. Kills past the cap still hold the chain open, they just
  do not raise it, and the HUD counter reads the cap rather than counting past
  it, so the number shown is always the multiplier being paid. The cap sits in
  `src/types.ts` beside `COMBO_TIME` with its browser twin in `index.html`, so
  the parity suite holds the two builds to the same value.

## [0.3.0-alpha] - 2026-09-08

### Added

- A barrel roll behind `Q` and `E`, which have been bound in both builds since
  the start and did nothing at all until now. The ship rolls for half a second,
  its wings turning through four positions and its hull going white so the
  invincibility the move grants is visible rather than something to remember,
  and nothing can touch it for the duration. A press the other way mid-roll
  neither restarts nor reverses it. The cooldown runs from the start of the roll
  rather than its end, so it bounds how much of a run can be spent untouchable.
- Combo scoring. Kills strung together inside two seconds chain: the second is
  worth double, the third triple, and every further kill one step higher with
  no ceiling, with a `COMBO x3` counter on the HUD row reading the multiplier
  back and colouring up as the chain lengthens. (0.3.1-alpha caps it.)
  Two quiet seconds drop it. Orbs are a pickup rather than a kill and never
  chain, and the two collision-tracking debug scenarios score nothing, so they
  chain nothing either.
- Sound in the browser version, synthesized with the Web Audio API. No audio
  files and nothing to load: a pulse cannon zap, an orb chime, a damage crunch,
  a mine explosion, and an engine hum whose pitch follows the speed readout the
  HUD shows, so a boost is heard as well as read. The engine names the events
  and queues them for the frame it has just simulated; only the browser turns
  those names into tones. `M`, which has raised a `MUTED` indicator and driven
  nothing since it was added, now silences all of it.
- A CRT overlay in the browser version: scanlines and a soft vignette laid over
  the canvas in CSS rather than drawn into the character grid. On out of the
  box, toggled with `C`, and written through to storage so a reload comes back
  the way it was left. A browser that will not hand over its storage gets the
  default rather than an error.
- Tests for all three systems, run against both builds wherever the code is
  shared: the roll's timing, its invincibility, its cooldown and its wing
  frames; the combo chain's multiplier, decay and HUD counter; and the cue queue
  raised by firing, collecting, taking a hit and destroying a mine. The browser
  synthesizer is driven against a recording stand-in for an `AudioContext`, so
  the pitch sweep and envelope behind every cue are read back rather than
  assumed, along with the hum being held open instead of restarted each frame
  and a browser refusing an audio context leaving the game silent rather than
  throwing.
- A test pinning the debug menu's navigation hint to its pulse at the documented
  60x20 minimum. The hint is the only animated thing on that screen, so a change
  that stopped it moving would have left the screen completely still with every
  existing test passing.

## [0.2.2-alpha] - 2026-09-07

### Fixed

- The debug menu no longer loses rows off the bottom of a short screen. Its mode
  list and its navigation hint were placed by counting rows down from the title
  with nothing clamping the result, and the screen buffer discards an
  out-of-range write without complaint, so at the documented 60x20 minimum the
  fifth mode and the whole navigation hint were silently gone, and the classic
  80x24 lost the hint alone. That hint is the only thing on the screen that
  animates, so a clipped debug menu was also a completely still one. The screen
  now picks the fullest layout the height allows, giving up the blank row
  between entries and the rule above the selected one first, then the per-mode
  descriptions, then the title art, and the hint takes the last row inside the
  border when there is no room for its usual one. All five modes and the hint
  are drawn at every height from 20 to 44 rows, at 60 columns and at 80.
- Menu screens no longer draw over their own bottom border. At the documented
  60x20 minimum the debug menu wrote `[4] MINE SWEEPER` onto it and the title
  screen wrote its start prompt there; at 80x24 it was the fifth mode's
  description row.
- The menu starfield is drawn behind the text rather than over it. It was the
  last thing drawn on the title screen, the debug menu and the game over screen,
  so stars punched holes through whatever was already there: a mode name reading
  `+3] COLLISION COURSE`, a star inside the brackets of the navigation hint, and
  two gaps in the title art. Both builds shared the fault and both are fixed.

### Added

- Tests covering the menu layout in both builds: every debug menu height from 20
  to 44 rows at 60 and 80 columns drawing all five modes and the navigation hint,
  nothing written onto the border or off the buffer, the two builds laying the
  screen out identically, and the starfield leaving every drawn cell alone on all
  three menu screens.

### Changed

- The browser test that proves the screens outside a run keep redrawing is back
  on the suite's 80x24 default. It had been staged at 100x30 because the debug
  menu needed 28 rows before its navigation hint, the only animated thing on that
  screen, was drawn at all.

## [0.2.1-alpha] - 2026-09-06

### Fixed

- Pausing now stops the world. One animation clock drove the whole render layer
  and kept running through a pause, so tunnel walls cycled colour, mines blinked
  between glyphs, orbs bobbed and pulsed, and the engine glow flickered on what
  was meant to be a still image. The pulsing `[ PAUSED ]` label was lost among
  it and carried no signal. The clock is now split in two, and the label pulse is
  the only motion left on a paused screen.
- Holding `P` or `M` in the terminal build no longer toggles twice. The key decay
  window was shorter than every platform's delay before the first repeat
  character, so that character read as a fresh press and a run paused and
  immediately resumed. Toggle keys now hold a window that outlasts the repeat
  delay, while the movement and fire keys keep the short window, where re-arming
  on repeat is what a held direction wants. The browser build never had the
  fault, since its handler is gated on a key state only `keyup` clears.
- Holding `ESC` in the terminal build no longer quits the game. The first press
  backs a run out to the title screen, and the first auto-repeat character was
  read as a second press, which took the quit branch from that title screen and
  ended the process. `ESC` now shares the repeat-suppression window the pause
  and mute keys use. The browser build has no quit branch and never had it.
- The feature list no longer claims the screen shake leaves the HUD and border
  anchored in both builds. That is the terminal build's behaviour; the browser
  build translates the whole canvas, as the Browser Version section already said.

### Added

- `uiTime` game state field: the presentation clock behind the screen shake, the
  `[ NEW BEST ]` blink, and the `[ PAUSED ]` pulse. Those three effects are meant
  to outlive a pause, and everything else now freezes with the run.
- Tests covering the paused screen freezing in both builds, the two builds
  freezing the same cells, the label still pulsing while paused, an in-flight
  shake still decaying to no offset, and the terminal input layer's decoding,
  decay windows, and repeat suppression for every key that acts on the press.

### Changed

- The terminal key tables, raw stdin decoding, and key decay moved out of
  `src/index.ts` into `src/input.ts`. The entry point claims the TTY and starts
  the loop at import time, so nothing in it could be reached by a test; the
  input layer now can be. Decay is checked once per frame against a supplied
  clock rather than on a timer, which leaves no pending handles behind.
- The pause gate names the mode as well as the flag. The title screen, debug
  menu, and game over screen animate off the world clock and are not a run in
  progress, so they keep moving while a paused run does not.

## [0.2.0-alpha] - 2026-09-05

### Added

- High score persistence in the browser build. The best score is written to
  `localStorage` and restored on load, so it survives a page reload. Every
  access is guarded, so a browser that refuses storage falls back to a
  session-only best instead of failing.
- `[ NEW BEST ]` HUD banner, raised the first time a run passes the stored best
  and fading after two seconds. It stays quiet on a first run, when there is no
  previous best to beat.
- Pause support on the `P` key, with a centered `[ PAUSED ]` overlay. Pausing
  halts movement, scoring, spawning, and collision while leaving animation
  timers running, so an in-flight damage flash finishes rather than freezing.
- Speed readout in the footer status strip, shown as a multiple of the starting
  speed (`SPD: 1.4x`). It reflects both boost and the difficulty ramp, since
  cruise speed itself climbs with distance.
- Mute toggle on the `M` key, setting a `muted` flag in game state and showing a
  `MUTED` indicator in the footer. The flag is a placeholder for the sound work
  and drives nothing yet. It is a setting rather than run state, so it carries
  across restarts.
- Screen shake on damage, lasting roughly 200ms and fading out. The browser
  build offsets the canvas by up to five pixels; the terminal build jolts the
  play area by one character column, leaving the HUD and border anchored.
- `ScreenBuffer.shiftRows()` for shifting a range of rows horizontally, which is
  what the terminal shake is built on.
- Test suite covering both builds: persistence, pause, mute, speed readout,
  shake, footer layout at every supported width, and parity between the terminal
  and browser engines. Run with `npm test`. The suite uses the Node built-in test
  runner and adds no dependencies.

### Changed

- Debug scenarios no longer set the best score. They are diagnostics rather than
  scored runs, and letting them write a best made the persisted value
  untrustworthy.
- Footer control hints now list `P:Pause` and `M:Mute`, and fall back to a
  compact form on a terminal too narrow for the full list.
- The starting speed, shake duration, and banner duration are named constants
  shared by both builds instead of inline literals.

## [0.1.0-alpha] - 2026-02-08

### Changed

- **BREAKING**: Converted project from VS Code extension to command-line tool
- Replaced WebGL 3D renderer with DOS-style terminal graphics using ANSI escape codes
- Restructured `src/` from single `extension.ts` to modular architecture: `index.ts`, `game.ts`, `render.ts`, `menu.ts`, `screen.ts`, `types.ts`
- Updated `package.json` from VS Code extension manifest to Node.js CLI tool with `bin` entry
- Changed boost control from `Shift` to `F` key (terminal raw mode cannot detect Shift hold)
- Replaced `@types/vscode` dependency with `terminal-kit` for terminal input handling

### Added

- Double-buffered ANSI screen buffer (`screen.ts`) for flicker-free terminal rendering
- Pseudo-3D perspective tunnel with converging walls, neon color palette, and animated ring stripes
- Parallax starfield background
- ASCII/Unicode ship sprite with animated engine glow
- Depth-scaled entities (obstacles, mines, orbs grow larger as they approach)
- Damage flash and collection flash visual effects via border color changes
- Boost speed lines effect
- `--debug` CLI flag to open debug scenario menu
- `--mode <name>` CLI flag to start a specific debug mode directly
- `--help` CLI flag
- Terminal size detection with minimum size warning (60x20)
- Alternate screen buffer usage for clean terminal restore on exit
- Cross-platform support: Windows, macOS, Linux

### Removed

- VS Code webview panel and extension activation code
- WebGL shader compilation and 3D geometry builders
- `.vscodeignore` file
- `@types/vscode` and `@vscode/vsce` dependencies
