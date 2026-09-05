# Changelog

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
