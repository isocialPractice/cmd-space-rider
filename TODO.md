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

### UI/UX Override - the caret's box, and the bar the anchors land under

#### Resolve Issues

- [ ] Caret Box 1 - the caret button's box is shorter than the link beside it
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

#### Found Issues

- [ ] The fixed bar is 83px on a desktop, not the 50px `--bar` declares
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
- [ ] The Reference button announces the caret glyph as part of its name
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

> 74 earlier items in `TODO-archive.md`, newest last.

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
- [x] The probe rig's own header still says every probe takes a grid and a build
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
