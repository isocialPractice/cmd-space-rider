# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.
  - From: Polish
- [ ] **Leaderboard with name entry** — After game over, if the player beat their best score, show a 3-character name entry screen (classic arcade style). Store top 10 scores in `localStorage`. Display on the title screen.
  - From: Bigger Features
- [ ] **Replay ghost** — Record the player's inputs during a run. On the next run, show a ghosted version of the previous ship flying the same path. Motivates beating your own performance.
  - From: Bigger Features

### UI/UX Override - what the glyph tuning is recorded as doing

#### Found Issues

- [ ] `tuneText`'s comment credits `geometricPrecision` with work the centring
  does on its own
  - **Issue**: The doc comment at `index.html:291-306` says
    "`geometricPrecision` is what makes the centring above worth having", on the
    stated ground that "left to itself a canvas rounds a glyph's position and
    its advance to whole pixels, which snaps the inset straight back to zero".
    Measured in chromium against the shipped page, it does not. A six-glyph run
    drawn at the page's own `FONT` and `cellW` came back byte-identical under
    `textRendering: 'auto'` and under `geometricPrecision` with kerning off, for
    `░ ▒ ▓ █ ╣ M` at 16px, 8px, 7px and 6px, in both colour schemes - 96
    comparisons with no pixel column differing by one level. The fractional x is
    honoured either way, so the centring stands up without the request and the
    reason given for it is not the engine's behaviour. The centring itself does
    land: at 7px, where the slack is worst, the darkest column at a junction
    between two tiling glyphs rose from 192 to 205 for `▒ ▓ █` and 144 to 162
    for `░`, the one-pixel left overhang went away, and the part-inked columns
    in a run halved from 14 to 7. Nothing is broken; the comment claims a
    mechanism the measurement contradicts, which is the kind of claim the next
    person to touch the renderer would reason from.
  - **Goal**: Resolve to [tune-text-rationale.prompt.md](.claude/prompts/tune-text-rationale.prompt.md)
  - From: UI/UX Override - what the glyph tuning is recorded as doing

### Create and Deploy GitHub Pages Override

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

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

> 96 earlier items in `TODO-archive.md`, newest last.

- [x] **The functional-pseudo guard is recorded as covering the sheet and covers
  the selectors a caller names** - `test/page-style.mjs:222` says "a sheet that
  gains one fails here, where the gap is", and `CHANGELOG.md:63-65` has the throw
  answering for "the first sheet to gain one".
  - **Issue**: `specificity` is only ever reached for a selector a caller already
    listed. `declIn` at `test/docs-site.test.mjs:529` weighs only
    `rule.selectors.filter((sel) => selectors.includes(sel))` and skips a rule
    naming nothing in that list, and `declarationsFor` in `test/page-style.mjs`
    never calls `specificity` at all. So add
    `.has-sub:not([aria-expanded]) > .sub { display: none }` to
    `docs/assets/style.css` and the guard never fires: `declIn('narrow', '.sub')`
    returns exactly what it returns today, a rule that really applies is left out
    of the fold, and the suite stays green. That is the same silent wrong answer
    the throw was added to end, reached by a selector no test names rather than by
    one some test does. The guard is correct for what it covers; the two
    sentences claim more than it covers.
  - **Goal**: Either narrow both sentences to what the guard does - a selector a
    caller weighs, not a sheet - or close the gap so they come true: walk every
    rule in the sheet once and throw on a functional pseudo-class anywhere in it,
    the way the breakpoint check already asserts the sheet names no width query it
    could not place. The second is the stronger of the two and is what this module
    already does for a length it cannot resolve.
  - From: Code Review Override - what the specificity resolver is recorded as covering
- [x] **Shots die short of what the tunnel shows** - A bullet's two second life
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
- [x] **The page's use of the fitted grid has no check** - `fitGrid` itself is
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
- [x] **Gamepad support (browser)** — Map standard gamepad API inputs: left stick for steering, A button for fire, B for boost, triggers for barrel roll.
  - From: Polish
- [x] **Smooth font rendering** — Experiment with subpixel positioning and canvas font smoothing for crisper character rendering at small cell sizes.
  - From: Polish
