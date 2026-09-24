# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Shots die short of what the tunnel shows** - A bullet's two second life
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
- [ ] **The page's use of the fitted grid has no check** - `fitGrid` itself is
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
- [ ] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.
  - From: Polish
- [ ] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.
  - From: Polish
- [ ] Verify the documentation site deployed - The site under `docs/` was
  written this run and reaches the remote with this run's commit. GitHub Pages
  serves this repository from the `main` branch root (`build_type: legacy`), so
  the publish is GitHub's own page build rather than an Actions workflow run,
  and `gh api repos/isocialPractice/cmd-space-rider/pages/builds/latest` is the
  endpoint that answers it - not `gh run list`, which has no workflow to report
  on here. Check that the latest build reports `status: built` at the commit
  carrying `docs/`, then fetch
  `https://isocialpractice.github.io/cmd-space-rider/docs/` for a `200`.
  - From: Create and Deploy GitHub Pages Override

### UI/UX Override - touch overlay placement on a landscape phone

#### Resolve Issues

- [ ] Overlay Anchoring 1
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

### Code Review Override - the HUD row's fourth tenant and two figures that do not hold

- [ ] The shared HUD row gained a fourth tenant and its own test file did not
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

#### Found Issues

- [ ] The light palette's entry count is quoted wrong in the CHANGELOG
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
- [ ] A powerups test explains a tolerance by a frame ordering that is the other way round
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
- [ ] The clone command is a placeholder on the page the README sends readers to
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
- [ ] The project structure page does not list the files the site is made of
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

#### Resolve Issues

- [ ] Heading Rank 1
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
- [ ] Site Link Form 1
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
- [ ] Palette Ledger 1
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

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

- [ ] **Shots die short of what the tunnel shows** - A bullet's two second life
  at 60 units a second gives it about 120 units of travel, and a target closes
  on it at the run's speed, so the furthest a shot can reach is a little over
  150 units. The tunnel is drawn to `maxViewZ`, which is 200. Firing straight
  down the middle at a target parked dead ahead lands at every range from 30 to
  150 units and misses at every range from 160 up, so the outer fifth of what
  the player can see cannot be shot at all, with nothing on screen saying why.
  Decide whether the reach should cover the draw distance - a longer `life`, a
  faster shot, or a shorter `maxViewZ` - and pin it in `test/pulse-cannon.test.mjs`
  beside the range bands. Both builds together, as `test/parity.test.mjs` expects.
- [ ] **The page's use of the fitted grid has no check** - `fitGrid` itself is
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
- [ ] **Decide whether Pages should deploy from Actions instead of the branch** -
  `gh api repos/isocialPractice/cmd-space-rider/pages` reports
  `build_type: legacy` with `source: {branch: main, path: /}`, so the site is
  GitHub's own branch build and any workflow added to `.github/workflows/` would
  be ignored rather than run. Nothing is broken: the game serves from the root
  and `docs/` serves beside it. The cost is that what gets published is whatever
  is on the branch, with no build step available to it. Flipping the source on a
  working site can take it down, so this wants a decision rather than a run:
  leave it as it is, or set `build_type=workflow` and add a workflow that
  uploads the root as the artifact. **Do not flip this unattended.**

## Measurement

Probes that produce the figures quoted in comments, tests, TODO items and the
CHANGELOG. Each prints its method beside its numbers - grid, placement walk,
ship heights, range band, frame rate - so a figure can be rebuilt from the
repository alone instead of from scratch files in `.tmp`. Probes report; the
assertions stay in `test/`.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 55 earlier items in `TODO-archive.md`, newest last.

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
