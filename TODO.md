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

### Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips

- [ ] **The layout resolver reads any width query as the narrow one** -
  `test/docs-site.test.mjs:349-352` decides a rule applies to the narrow layout
  when every at-rule prelude around it matches `/\bwidth:/`, and to the wide
  layout only when the rule sits at the top level with no prelude at all.
  - **Issue**: Nothing fails today, because `docs/assets/style.css` carries
    exactly one width query. A `@media (min-width: ...)` block added later is
    folded into the narrow layout and left out of the wide one, which is
    backwards in both directions, and the breakpoint check beside it collects
    `max-width` preludes only - `assert.equal(widths.size, 1, ...)` at `:604` -
    so nothing names the new query either. The bar walk would then report a
    height for a layout the stylesheet does not have, silently and with the
    suite green, which is the exact failure this file was written to end.
  - **Goal**: Read the bound as well as the property, so a `max-width` prelude
    applies to the narrow layout and a `min-width` one to the wide, and have the
    breakpoint check assert the sheet names no width query it did not account
    for - the way it already asserts there is exactly one `max-width`.
  - From: Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips

#### Found Issues

- [ ] **A group left open on the wide layout keeps its caret on the narrow one** -
  `docs/assets/style.css:181` declares
  `.has-sub > button[aria-expanded="true"]::after { content: "^"; }` at the top
  level, and the narrow block's `.has-sub > button::after { content: ""; }` at
  `:309` is the rule meant to take that glyph away. A media query contributes no
  specificity, so (0,2,2) beats (0,1,2) whichever comes later in the file, and
  the narrow layout cannot blank the caret of a button that is expanded.
  - **Issue**: `docs/assets/docs.js:38-42` sets `aria-expanded="true"` only
    while `wide.matches`, and nothing ever resets it - there is no `change`
    listener on the `wide` MediaQueryList and no resize handler - so the
    attribute survives a layout change. The failing sequence: open
    `docs/index.html` at 1280px, click the Reference caret, then narrow the
    window to 900px. Reference is the one `.has-sub > button` the narrow layout
    still shows, because the three `.sub-toggle` buttons are `display: none` at
    `:307`, and it reads `Reference ^` as a static label with `cursor: default`,
    advertising a control that no longer toggles anything. The stale
    `aria-expanded="true"` rides along on that same label. Not introduced this
    turn - the two rules are byte-identical at `HEAD` - but newly reachable
    across the 90px this turn moved into the narrow layout, since at 900px the
    old 861px boundary still gave the wide layout, where the caret was correct.
  - **Goal**: Either blank the glyph in the narrow block at a specificity that
    wins, `.has-sub > button[aria-expanded="true"]::after { content: ""; }`
    beside the rule already there, or reset the attribute from `docs.js` on the
    `wide` MediaQueryList's `change` event, which clears the stale
    `aria-expanded` as well as the caret. Verifying either from text needs
    something the rig does not have: `test/page-style.mjs` folds rules in
    document order and models no specificity at all, which is the same blind
    spot that let this sit unseen while the bar walk was being built on top of
    it. Give the resolver a specificity ordering, then assert which `content`
    wins for `.has-sub > button::after` in each layout and each `aria-expanded`
    state. A browser is not needed for any of it.
  - From: Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips
- [ ] **The new page-against-file check compares prose and skips every list item** -
  `prose()` at `test/docs-site.test.mjs:254-282` drops list items and the
  indented lines that continue them, so the check added this turn compares 6 of
  QUICKSTART.md's 15 blocks and 9 of CHEATSHEET.md's 13.
  - **Issue**: The gameplay list at `QUICKSTART.md:44-53` and the terminal floor
    list at `CHEATSHEET.md:126-129` are not compared against their pages at all,
    which is the same silent drift the item was opened to end. Verified by
    mutation: delete the whole `<li>Kills inside two seconds of each other
    chain, up to <code>COMBO x8</code>.</li>` from `docs/quickstart.html` and
    `node --test test/docs-site.test.mjs` reports 10 of 10 passing. The comment
    at `:246-252` justifies the exclusion by reformatting - "a table or a fenced
    block is reformatted on its way to the page" - which holds for those two and
    not for a bullet list, which becomes `<ul><li>` and survives the normalizing
    the function already does.
  - **Goal**: Take list items as well as paragraphs - marker stripped, indented
    continuations joined onto their item, through the same link-stripping and
    `flatten` - and keep the fenced-block and table exclusions, for which the
    reformatting argument does hold. Measured before queuing this: pulling all
    13 list items out of both files that way, every one is already on its page,
    so the gap closes with nothing else to fix. While in that function,
    `flatten` at `:226` drops backticks but not `**` or `_`, so the first prose
    paragraph to gain emphasis is reported as missing from a page that carries
    it; strip the emphasis markers on the file side too.
  - From: Code Review Override - the caret the narrow layout cannot blank, and the list items the new check skips

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

> 83 earlier items in `TODO-archive.md`, newest last.

- [x] The new resolver collects at-rule context and then ignores it
  - **Issue**: `test/page-style.mjs:30-60` records for every rule the at-rule
    preludes it sits inside, and `declarationsFor` at `:92` then folds every rule
    naming a selector regardless of that context. On `index.html` this cannot
    show: the page has one `:root` and no `@media` at all. On
    `docs/assets/style.css`, which `test/docs-site.test.mjs:26` already points
    the same module at, it does. `:root` is declared twice - the dark block at
    `:9` and the light block inside `@media (prefers-color-scheme: light)` at
    `:39` - so `styleSheet(css).properties` comes back as the light scheme:
    `--page` is `#f2f2f4` where the base block declares `#000000`, and `--text`,
    `--heading` and `--rule` likewise. The doc comment at `:102` says these are
    "the custom properties the sheet declares on `:root`", which is the dark
    scheme, so the function and its own description disagree. Nothing reads
    `properties` or `declarationsFor` for the docs sheet yet, which is the only
    reason the suite is green - `test/docs-site.test.mjs` walks `style.rules`
    directly and filters on `rule.at.length` itself.
  - **Goal**: Decide what the two folding functions mean by a sheet with a media
    query in it, and say it in one place rather than leaving each caller to
    remember. Either `declarationsFor` takes the top-level cascade only and a
    caller asking for a media block's rules goes through `rules`, or it takes a
    condition and folds what matches - the first is the smaller change and is
    what both current callers want. Correct the `properties` comment to whichever
    it becomes. Worth an assertion in `test/docs-site.test.mjs` either way, since
    the site's stylesheet is the repository's only sheet that declares `:root`
    twice and is therefore the only thing that can catch this: resolve `--page`
    off `docs/assets/style.css` and pin which scheme answers.
  - From: Code Review Override - the resolver's at-rule context, and the rig's unchecked flag table
- [x] **The Reference group sits off the right edge between 861px and 950px** -
  The wide nav lays its eight entries on one unwrapped row, and that row is
  wider than the width it switches on at, so the last group is painted past the
  right edge of the screen across the first 90px of the wide range.
  - **Issue**: Measured in chromium on `docs/index.html`, identical in both
    colour schemes. At 861px the Reference group's box runs 841.47px to
    951.16px in an 861px viewport, so 17.8% of the control is on screen;
    `.nav-bar` overflows by 90px, by 51px at 900px, and first fits at 951px.
    Opening it is worse than leaving it shut - the list runs to 1049.73px, 9.4%
    visible, with `Project Structure`, `Terminal Requirements`, `How It Works`
    and `Cheatsheet` all laid out between 846px and 1045px. Nothing can scroll
    to them: `.nav` is `position: fixed`, so the overflow never reaches the
    document and `scrollWidth` stays equal to `clientWidth` at every one of
    these widths. Keyboard focus does land on the button, but a fixed ancestor
    cannot be scrolled, so `window.scrollX` stays 0 and the focused control
    stays invisible. Between 861px and 950px the nav offers no usable route to
    four of the site's ten pages. Not this turn's doing: the same figures come
    back from `git show HEAD:docs/assets/style.css` served in place of the
    working tree's, so the defect predates the bar fix it was found beside.
  - **Goal**: Resolve to [nav-reference-offscreen.prompt.md](.claude/prompts/nav-reference-offscreen.prompt.md)
  - From: UI/UX Override - the width the wide nav switches on at
- [x] **The bar check reads one column of the bar and calls it the bar** -
  `test/docs-site.test.mjs:275-281` builds the drawn height out of `.menu a`
  alone: the link's box, `.nav-bar`'s padding, and `.nav`'s bottom border. The
  bar is a flex row and its height is the tallest of its children, and `.brand`
  and `.nav-toggle` are children too.
  - **Issue**: The check is named "the bar draws the height `--bar` declares"
    and answers for the menu column only, so the fault it was written to end
    comes back through any other child with all 468 tests green. Verified by
    mutation: add `padding: var(--s3) 0` to `.brand` at
    `docs/assets/style.css:104` and the brand's 26.4px line box becomes 50.4px,
    taller than the link's 42px, so the bar draws 68.4px against the 60px
    `--bar` declares - and `node --test test/docs-site.test.mjs` reports 8 of 8
    passing. That is the same shape as the defect just fixed: something inside
    the bar grew, the bar grew with it, and `--bar` went on declaring a figure
    nothing drew. `.brand` is the child that can do it, because it states no
    line box of its own and takes the body's 1.65 off a 16px base.
  - **Goal**: Have the check take the tallest child rather than an assumed one.
    That needs `controlHeight` to resolve a control with no `line-height` of its
    own, which it deliberately refuses today - the refusal is what caught the
    caret button - so the decision is either to give `test/page-style.mjs` an
    inherited font size and line height to resolve a unitless ratio against, or
    to have `.brand` and `.nav-toggle` state their own line box the way
    `.menu a` and `.has-sub > button` now do and keep the refusal as it is. The
    second is the smaller change and keeps every term in `--bar` a token. Either
    way the check should fold every direct child of `.nav-bar` the layout shows
    and assert the maximum, so the narrow layout's `--bar` is covered by the
    same walk against the MENU button.
  - From: Code Review Override - the bar check that reads one column, and the step with two readers
- [x] **Two documents in one commit disagree on how many rules read `--s8`** -
  `DESIGN_LANGUAGE.md:116` says "the only thing that read it was the offset that
  holds content clear of the fixed bar", and `CHANGELOG.md:44` in the same
  commit says "`--s8` had exactly two readers, the scroll offset and the page
  frame's top padding".
  - **Issue**: The changelog is the accurate one. `git show HEAD:docs/assets/style.css`
    carries `var(--s8)` twice - `scroll-padding-top` at `:64` and `.wrap`'s top
    padding at `:151` - so the design file undercounts by one and the two
    records of the same removal cannot both be read as written. Nothing is
    broken by it; the cost is that `DESIGN_LANGUAGE.md` is the file the
    stylesheet's own header points at as the record of where each value came
    from, so a reader checking why the step went is told one rule read it and
    finds two.
  - **Goal**: Say two in `DESIGN_LANGUAGE.md`, naming both the way the changelog
    does, or drop the count and say only that the step's readers now derive from
    the bar's own height. Either agrees with the stylesheet; the present wording
    does not.
  - From: Code Review Override - the bar check that reads one column, and the step with two readers
- [x] **Nothing checks that a page and the file it is published from agree** -
  `docs/project-structure.html` calls `cheatsheet.html` "CHEATSHEET.md as a
  page" and `quickstart.html` "QUICKSTART.md as a page", and no test compares
  either pair. An edit to the file that misses the page is silent.
  - **Issue**: It has now been missed on two consecutive runs, in the same
    paragraph. 0.7.3 added ", and which flags each probe takes" to
    `CHEATSHEET.md` and left it off the page; 0.7.4 added the paragraph naming
    `test/probes/probes.mjs` and `test/probes.test.mjs` and left that off too.
    Both were found by reading the two files side by side, which is the only
    thing that has ever checked them. Normalizing away the markup on both sides
    and asking which of `CHEATSHEET.md`'s prose paragraphs the page carries
    answered it in one pass, and answered 2 before this review's fix and 0
    after.
  - **Goal**: Assert it in `test/docs-site.test.mjs`, which already reads the
    pages as text. Strip the tags out of the page's `<main>`, unescape the
    entities, take the prose paragraphs out of the markdown with the fenced
    blocks and tables removed, collapse whitespace and inline code markers on
    both sides, and assert every paragraph of the file is on the page. Pin both
    pairs the site names - `CHEATSHEET.md` and `QUICKSTART.md` - and read the
    pairing off `docs/project-structure.html`'s own "X.md as a page" lines
    rather than listing it here, so a third page added later is covered without
    a second edit. One direction only: the pages carry a pager and a nav the
    files have no equivalent of, so the page holding more than the file is not
    the fault.
  - From: Code Review Override - the bar check that reads one column, and the step with two readers
