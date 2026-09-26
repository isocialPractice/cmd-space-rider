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

### UI/UX Override - the nav's dropdown anchors, and an accent on nothing

#### Found Issues

- [ ] Three of the nav's four dropdown groups cannot be opened on a desktop
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
- [ ] The one accent the design file says the site uses is on nothing the site has
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
- [ ] The probe rig's own header still says every probe takes a grid and a build
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
- [ ] The new probe restates the rule it measures instead of reading it
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

#### Resolve Issues

- [ ] Published Figure 1
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

> 69 earlier items in `TODO-archive.md`, newest last.

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
