# Quickstart

The shortest path to flying. For the full documentation, see the
[site](https://isocialpractice.github.io/cmd-space-rider/docs/).

## Play in a browser

Nothing to install. Open the hosted build:

```
https://isocialpractice.github.io/cmd-space-rider/
```

Or clone the repository and open `index.html` in any modern browser. It is a
single self-contained file: no build step, no server, no dependencies.

## Play in a terminal

Node.js v16 or later is the only prerequisite.

```bash
git clone https://github.com/isocialPractice/cmd-space-rider.git
cd cmd-space-rider
npm install
npm run build
npm start
```

## The five keys that matter

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` or arrows | Steer |
| `Space` | Fire the pulse cannon |
| `F` or `Shift` | Boost |
| `Q` / `E` | Barrel roll, and nothing can touch you during it |
| `P` | Pause |

`Enter` launches a run, `Esc` returns to the menu, and `Ctrl+C` quits the
terminal build outright.

## How to survive

- Obstacles cost 25 shield, mines cost 35. Orbs restore 10 and pay 500 points.
- Mines take 5 pulse hits. Shooting one is worth 500 points and has about a one
  in three chance of dropping a powerup.
- A shot holds the column it was fired down, so line the ship up under the
  target. Height is not an aiming axis.
- Kills inside two seconds of each other chain, up to `COMBO x8`.
- Roll out of trouble rather than steering out of it. The roll is half a second
  of invulnerability on a cooldown.
- The run steps up a difficulty level every minute, and the warp banner is a few
  seconds of warning rather than decoration.

## A terminal that fits

The floor is 60 columns by 20 rows, with 256-colour and Unicode support. A
window smaller than that shows a notice instead of the game. Windows Terminal,
iTerm2, GNOME Terminal, Alacritty and Kitty all work.

## Next

- [Controls, gameplay and debug modes](https://isocialpractice.github.io/cmd-space-rider/docs/usage.html)
- [Cheatsheet](https://isocialpractice.github.io/cmd-space-rider/docs/cheatsheet.html)
- [Development and tests](https://isocialpractice.github.io/cmd-space-rider/docs/development.html)
