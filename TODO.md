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

> 92 earlier items in `TODO-archive.md`, newest last.

- [x] **The specificity model has no checks of its own** -
  `test/page-style.mjs:219` is a new exported function that three test files now
  resolve rules through, and its only exercise is the two selectors the caret
  test names. Nothing reads the counts it returns.
  - **Issue**: The answers are not obvious enough to leave unpinned - `a:before`
    and `a::before` both weigh (0,0,2) because the legacy spelling is still a
    pseudo-element, while `a:hover` weighs (0,1,1). The doc comment at `:206-218`
    names its own blind spots, `:not()`, `:is()` and `:has()`, whose argument
    specificity it does not model, and asks a caller who adds one to teach the
    function rather than trust it. Nothing enforces that: neither stylesheet uses
    one today, so the first `:not()` added gets a silently wrong count and the
    rule it decides folds in the wrong order.
  - **Goal**: Pin a table of selectors against their expected triples, covering
    the id, class, attribute, pseudo-class, pseudo-element and `*` cases and both
    colon spellings. Then make the blind spot loud rather than silent: throw on a
    selector carrying `:not(`, `:is(`, `:where(` or `:has(`, so a sheet that
    gains one fails in the resolver instead of resolving to a plausible count.
  - From: Code Review Override - the emphasis stripper inside code spans, and the open groups nothing pins
- [x] **The emphasis stripper reaches inside inline code** -
  `test/docs-site.test.mjs:254-258` strips `**`, `__`, `*` and `_` from the file
  side of the page-against-file check, and `:304` runs it before `flatten` at
  `:226` drops the backticks, so it has no way to tell a code span from prose and
  takes the markers out of both.
  - **Issue**: Markdown holds emphasis markers literal inside a code span, and so
    does the page: `` `__init__` `` reaches `<code>__init__</code>` and
    `mainText` strips the tags to `__init__`, while the file side resolves to
    `init`. The block is then reported as missing from a page that carries it
    verbatim, which is a false failure in the one check written to catch real
    drift. Measured on the helper directly: `` `__init__` in code `` resolves to
    `` `init` in code ``, and `` `**not bold**` in code `` to
    `` `not bold` in code ``. Nothing fails today only because neither
    `QUICKSTART.md` nor `CHEATSHEET.md` contains a single `*` or `_` - the whole
    function is unreached, so the first file to gain either is also the first
    thing to exercise it.
  - **Goal**: Hold the code spans out of the stripping - take the backticked runs
    aside, strip emphasis from what is left, then put them back - or strip the
    backticks first and mark their contents so the emphasis passes skip them.
    Either way pin it with the two cases above plus the identifiers the comment
    already claims survive, `THEME_BG` and `snake_case`, since those claims are
    untested too.
  - From: Code Review Override - the emphasis stripper inside code spans, and the open groups nothing pins
- [x] **The opened Reference dropdown overruns the viewport from 951px to 1049px** -
  The breakpoint move put the wide layout where the collapsed row fits. The
  opened Reference panel needs 1050px, so across the first 99px of the wide
  range it is painted past the right edge of a bar nothing can scroll.
  - **Issue**: Measured in chromium on `docs/index.html` served over HTTP,
    identical in both colour schemes. `.menu` is left-packed at its natural
    width, so the Reference group's left edge is pinned at 841.47px at every
    wide viewport up to 1049px, and the panel hangs rightward from there at a
    fixed 208.27px, ending at 1049.73px however narrow the window is. That is
    98.73px past the edge at 951px, 9.73px at 1040px, and it first fits at
    1050px. At 951px the panel is 52.6% on screen and the four entries are
    clipped mid-word: `Project Structure` reads `Project Str`,
    `Terminal Requirements` reads `Terminal Re`. Nothing can scroll to them -
    `.nav` is `position: fixed`, so `document.documentElement.scrollWidth`
    stays equal to the viewport width across the whole band and
    `scrollIntoView()` on an entry leaves `window.scrollX` at 0. Keyboard is
    the same defect: open the group at 951px and the next four Tabs land on
    `Project Structure`, `Terminal Requirements`, `How It Works` and
    `Cheatsheet`, each with its box ending at 1044.73px of a 951px viewport.
    The three other groups sit further left and never overrun, clearing the
    edge by 313.41px, 140.50px and 49.63px at 951px.

    Not a reopening of **The Reference group sits off the right edge between
    861px and 950px**, which is complete and verified clean this run: at 861px,
    900px and 950px the narrow layout shows, nothing inside `.nav-bar` passes
    the right edge, the Reference group's box ends at 853px, 892px and 942px,
    and all ten pages are reachable with every tabbed control on screen. That
    item's own issue text recorded the 1049.73px figure, but its goal was the
    breakpoint, and the breakpoint is where its fix landed. This is the band
    just above the one it fixed.
  - **Goal**: Resolve to [nav-dropdown-overruns-at-951.prompt.md](.claude/prompts/nav-dropdown-overruns-at-951.prompt.md)
  - From: UI/UX Override - the dropdown that needs more room than the row does
- [x] **The record says three test files weigh `specificity`, and one did** -
  `test/page-style.test.mjs:4` opens "Three test files resolve rules through it",
  and `CHANGELOG.md:47-48` repeats it as "`specificity` is weighed by three test
  files".
  - **Issue**: Before this turn exactly one file imported it,
    `test/docs-site.test.mjs:21`, and this turn's new file makes two. Three files
    do resolve a stylesheet through the module `test/page-style.mjs` -
    `test/browser-shell.test.mjs`, `test/docs-site.test.mjs` and
    `test/probes/overlay-anchor.mjs` - but two of them import only `pageStyle`,
    for lengths rather than for cascade order, and one of the three is a probe
    rather than a test file, so the count is wrong under either reading. The
    header contradicts itself a sentence later as well: it says the function's
    only exercise was the two selectors the caret check in one named file names,
    which cannot be true of something three test files resolve rules through.
    Nothing fails. The cost is that the sentence giving the new file its reason
    to exist overstates what was already covered, and that sentence is what a
    reader checks when deciding whether the resolver still needs tests.
  - **Goal**: Say what is there - one test file weighed `specificity` before this
    turn and two do now, while three files read a stylesheet through the module,
    two of them for lengths and one of them a probe. Correct the same claim in
    `CHANGELOG.md:47-48`.
  - From: Code Review Override - what the specificity resolver is recorded as covering
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
