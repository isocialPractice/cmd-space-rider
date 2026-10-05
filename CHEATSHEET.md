# Cheatsheet

Every key, flag, script and figure on one page, for someone who has already read
the documentation. The full text lives on the
[site](https://isocialpractice.github.io/cmd-space-rider/docs/).

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrows | Steer |
| `F` or `Shift` (browser) | Boost |
| `Space` | Fire pulse cannon |
| `Q` / `E` | Barrel roll |
| `P` | Pause / resume |
| `M` | Mute toggle |
| `C` (browser) | CRT scanline overlay |
| `Enter` | Launch / relaunch |
| `Esc` | Menu / quit |
| `Ctrl+C` | Quit immediately (terminal) |
| Thumbstick / `FIRE` / `BOOST` | Touch: steer / fire or confirm / boost |
| Left stick / `A` / `B` | Gamepad: steer / fire or confirm / boost |
| Triggers | Gamepad: barrel roll, left and right |

Press-not-hold keys are `P`, `M`, `Esc`, `Q` and `E`. They fire once per press
and take a short deadzone after a hold.

A gamepad has to report the standard layout before it drives anything, and its
stick takes the same dead zone and eight sectors the on-screen thumbstick does.
Any pad plugged in can fly the run, and a second one alongside does no harm.

## CLI

```
space-rider                          Start in normal mode
space-rider --debug                  Open the debug scenario menu
space-rider --mode <mode>            Start a specific debug mode directly
space-rider --help                   Show help
```

## Browser URL parameters

```
index.html?debug                     Open the debug scenario menu
index.html?mode=chaos                Start a specific debug mode directly
index.html?mode=mines                Mine Field
index.html?mode=orbs                 Orb Harvest
index.html?mode=obstacleCollision    Collision Course
index.html?mode=mineCollision        Mine Sweeper
```

## Debug modes

| # | Mode | Flag / param | What it isolates |
| --- | --- | --- | --- |
| 1 | Mine Field | `mines` | Pure evasion |
| 2 | Orb Harvest | `orbs` | Collection |
| 3 | Collision Course | `obstacleCollision` | Obstacle impacts |
| 4 | Mine Sweeper | `mineCollision` | Mine collisions |
| 5 | Chaos Protocol | `chaos` | Everything, permanent boost, auto-fire |

Debug runs never record a best score.

## Numbers

| Thing | Value |
| --- | --- |
| Obstacle collision | 25 shield |
| Mine collision | 35 shield |
| Mine hit points | 5 pulse hits |
| Orb pickup | 10 shield, 500 points |
| Obstacle destroyed | 200 points |
| Mine destroyed | 500 points |
| Powerup drop chance | about 1 in 3 mines shot down |
| Shield Regen `+` | 25 shield |
| Rapid Fire `!` | 10 seconds, 3x cadence |
| Slow Motion `~` | 5 seconds, half world speed |
| Combo window | 2 seconds, caps at `COMBO x8` |
| Barrel roll | 0.5 seconds invulnerable, then a cooldown |
| Warp step | every 60 seconds, banner for 2 seconds |
| Grid floor | 60 columns by 20 rows |

## Scripts

```bash
npm run build      # Compile TypeScript to out/
npm run start      # Run the compiled game
npm run dev        # Build and run in one step
npm run debug      # Build and run in debug mode
npm run watch      # Watch mode for development
npm test           # Build, then run the test suite
npm run probe      # Build, then run a measurement probe
```

## Probes

`npm run probe` with no arguments lists what there is to measure, and which
flags each probe takes. The probes that fly a shot take a grid and a build:

```bash
npm run probe -- seen-versus-kill
npm run probe -- column --grid 205x50 --build browser
npm run probe -- free-flight --passes 2
npm run probe -- overlay-anchor    # no grid, no build: it walks viewports
```

A flag the named probe does not read is refused rather than discarded, so
`npm run probe -- overlay-anchor --grid 80x24` exits non-zero instead of
reporting a figure from a walk that never used the grid.

The table the rig checks against lives in `test/probes/probes.mjs`, and
`test/probes.test.mjs` reads it against the probes themselves: every probe takes
exactly the flags listed for it, so a probe that stops reading an argument fails
the suite rather than going on accepting the flag in silence. Every probe that
calls the shared engagement is run there too, on one grid, one build and one
placement, because reading a probe's argument list never reaches the calls the
probe makes.

A probe reports; it never asserts. Every walk is seeded, so the same command
gives the same numbers every time.

## Test grids

The pulse cannon checks run at three sizes, because the hit test is not
size-neutral:

| Grid | Why |
| --- | --- |
| 80x24 | What a terminal opens at |
| 60x20 | The floor a small browser window is clamped to |
| 205x50 | A full-screen window at the default font |

## Terminal requirements

- 60 columns by 20 rows minimum
- 256-colour ANSI
- Unicode box-drawing and block elements
- Windows Terminal, iTerm2, GNOME Terminal, Alacritty, Kitty

## Browser-only features

High score persistence, sound, the CRT overlay (`C`), light mode, touch
controls, and a canvas-offset screen shake. The terminal build jolts the play
area by a whole character column instead, and keeps a best score for the
session only.
