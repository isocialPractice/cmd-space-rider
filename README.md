![hero image](hero.png)

# CMD Space Rider

`Ctrl + click` to view [cmd-space-rider documentation](https://isocialpractice.github.io/cmd-space-rider/docs/)

A retro DOS-style terminal space tunnel game. Pilot your ship through an endless neon warp tunnel, dodge obstacles, collect energy orbs, and chase the high score &mdash; right in your command line or browser.

`Ctrl + click` to play [game](https://isocialpractice.github.io/cmd-space-rider/) in the browser.

## [Features](https://isocialpractice.github.io/cmd-space-rider/docs/features.html)

- **DOS terminal graphics** &mdash; Pseudo-3D tunnel rendered with Unicode block elements, box-drawing characters, and 256-color ANSI palette. No graphical window required.
- **Browser preview** &mdash; Open `index.html` in any browser to play the same game rendered as a canvas-based terminal emulator. No build step, no server, no dependencies.
- **Cross-platform** &mdash; Runs on Windows, macOS, and Linux. Any terminal that supports 256 colors and Unicode.
- **Neon warp tunnel** &mdash; Perspective-scrolling walls, animated ring stripes, a parallax starfield, and a warp transition every minute.
- **Ship controls** &mdash; Steer, boost, fire a pulse cannon, and barrel roll out of trouble.
- **Progressive difficulty** &mdash; Speed, obstacle density and mines all escalate with distance.

The [full list](https://isocialpractice.github.io/cmd-space-rider/docs/features.html) covers powerups, combo scoring, retro sound, the CRT overlay, touch controls, light mode, and the five debug scenarios.

## [Getting Started](https://isocialpractice.github.io/cmd-space-rider/docs/getting-started.html)

Open `index.html` in any modern browser, or play the [hosted build](https://isocialpractice.github.io/cmd-space-rider/). That is the whole browser install.

For the terminal, with [Node.js](https://nodejs.org/) v16 or later:

```bash
git clone https://github.com/isocialPractice/cmd-space-rider.git
cd cmd-space-rider
npm install
npm run build
npm start
```

See [Getting Started](https://isocialpractice.github.io/cmd-space-rider/docs/getting-started.html) for the browser debug parameters and the rest, or the [Quickstart](QUICKSTART.md) for the short version.

## [Usage (CLI)](https://isocialpractice.github.io/cmd-space-rider/docs/usage.html)

```
space-rider                          Start in normal mode
space-rider --debug                  Open the debug scenario menu
space-rider --mode <mode>            Start a specific debug mode directly
space-rider --help                   Show help
```

| Input | Action |
|---|---|
| `W` / `A` / `S` / `D` or Arrow keys | Steer ship |
| `Space` | Fire pulse cannon |
| `F` or `Shift` (browser) | Boost |
| `Q` / `E` | Barrel roll |
| `P` | Pause / resume a run |

The [Usage page](https://isocialpractice.github.io/cmd-space-rider/docs/usage.html) carries the full control table, the key repeat and deadzone behaviour, the gameplay rules, and the five debug modes. The [Cheatsheet](CHEATSHEET.md) puts every key, flag and figure on one page.

## [Project Structure](https://isocialpractice.github.io/cmd-space-rider/docs/project-structure.html)

```
cmd-space-rider/
  index.html        # Browser version (canvas terminal emulator, zero dependencies)
  src/              # CLI entry point, input, engine, renderer, menus, screen buffer
  test/             # Both builds, the agreement between them, and the probes
  docs/             # This project's documentation site
  icon.svg          # Ship icon, inlined into index.html as the favicon
  package.json      # CLI tool manifest and dependencies
```

Every file under `src/` and `test/` is listed on the [Project Structure page](https://isocialpractice.github.io/cmd-space-rider/docs/project-structure.html).

## [Development](https://isocialpractice.github.io/cmd-space-rider/docs/development.html)

```bash
npm run build      # Compile TypeScript to out/
npm run start      # Run the compiled game
npm run dev        # Build and run in one step
npm run debug      # Build and run in debug mode
npm run watch      # Watch mode for development
npm test           # Build, then run the test suite
npm run probe      # Build, then run a measurement probe
```

The [Development page](https://isocialpractice.github.io/cmd-space-rider/docs/development.html) covers the line ending policy, how the suite reaches both builds, and what the probes measure and why they are seeded.

## [Terminal Requirements](https://isocialpractice.github.io/cmd-space-rider/docs/terminal-requirements.html)

- **Minimum size**: 60 columns x 20 rows. The browser holds the same floor and shrinks the font to reach it.
- **Color support**: 256-color ANSI (most modern terminals)
- **Unicode support**: Box-drawing and block element characters
- **Recommended terminals**: Windows Terminal, iTerm2, GNOME Terminal, Alacritty, Kitty

## [How It Works](https://isocialpractice.github.io/cmd-space-rider/docs/how-it-works.html)

The terminal build draws through a custom double-buffered screen renderer built on raw ANSI escape codes, flushed to stdout as a single optimized write per frame. The browser build reproduces the same game as a canvas character grid, running identical game logic. Six things differ between them, each because the medium allows or demands it, and the [How It Works page](https://isocialpractice.github.io/cmd-space-rider/docs/how-it-works.html) sets out all six.

## Documentation

The full documentation is a [site](https://isocialpractice.github.io/cmd-space-rider/docs/) built from this README:

| Page | What it covers |
|---|---|
| [Quickstart](https://isocialpractice.github.io/cmd-space-rider/docs/quickstart.html) | The shortest path to flying |
| [Features](https://isocialpractice.github.io/cmd-space-rider/docs/features.html) | Everything the game does |
| [Getting Started](https://isocialpractice.github.io/cmd-space-rider/docs/getting-started.html) | Browser and terminal install |
| [Usage (CLI)](https://isocialpractice.github.io/cmd-space-rider/docs/usage.html) | Controls, gameplay, debug modes |
| [Project Structure](https://isocialpractice.github.io/cmd-space-rider/docs/project-structure.html) | Every file and what it holds |
| [Development](https://isocialpractice.github.io/cmd-space-rider/docs/development.html) | Scripts, tests, probes |
| [Terminal Requirements](https://isocialpractice.github.io/cmd-space-rider/docs/terminal-requirements.html) | Size, colour and Unicode support |
| [How It Works](https://isocialpractice.github.io/cmd-space-rider/docs/how-it-works.html) | The two renderers |
| [Cheatsheet](https://isocialpractice.github.io/cmd-space-rider/docs/cheatsheet.html) | Every key, flag and figure |

The site's look is recorded in [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md).

## License

MIT. See [LICENSE](LICENSE).
