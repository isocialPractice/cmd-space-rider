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

### Create and Deploy GitHub Pages Override

### Code Review Override - the offset that outgrows a short viewport, and a figure nothing reads

#### Resolve Issues

- [ ] Overlay Anchoring 2
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

#### Found Issues

- [ ] Nothing reads the figure the overlay fix hangs on
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
- [ ] The changelog describes a README sentence the same release rewrote
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
- [ ] The widened README claim still overshoots by six files
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

> 65 earlier items in `TODO-archive.md`, newest last.

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
