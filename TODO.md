# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **A probe for how often a section's rocks reach the ship** - 0.15.2 quotes
  a rate in `test/asteroid-field.test.mjs` and in the CHANGELOG that nothing in
  the repository can rebuild: over 60,000 unseeded runs of the open-and-close
  sequence, the terminal build shook 237 times and misread the walls the same
  237 times, and the browser build shook 258 times and misread none. Those
  figures came from a scratch script in `.tmp`, which is the thing this section
  exists to replace. The reading is a natural probe - it walks a sequence many
  times and reports a rate and a contingency rather than asserting one - and it
  would also carry the figure that explains the pair, which is that a hit
  jolts the terminal build's grid a whole column and the browser build's not at
  all. Nothing is wrong today: the two cases it came from are seeded and
  deterministic, so this is a figure needing a home rather than a defect.
  - From: Measurement

### Create and Deploy GitHub Pages Override

### UI/UX Override - the label clip on a wide short window

#### Found Issues

- [ ] `overflow:hidden` shears the `BOOST` label on a fitted window wider than
  about 1620px and shorter than about 190px
  - **Issue**: Not the overlay change, which passes - `#touch` is `hidden` at
    all 50 refused viewports swept from 300x60 to 1000x300, and the notice has
    the screen to itself at every one. This is the other half of the same turn:
    the `overflow:hidden` added to `#fire` and `#boost` at `index.html:117`. It
    does clip, and on a refused grid that is the whole point - at 320x60 with
    the overlay forced up, the bands either side of the two controls carry 0
    cyan and 0 magenta pixels, against 30 and 74 with the one declaration
    removed. On a window the game draws on it can clip the glyphs instead of a
    stray edge. `--ctl` subtracts `2vw`, so a window of a given height gives a
    smaller control the wider it gets: at 1920x160, a fitted grid of 480x20
    publishing `--playpx: 120px`, `#fire` solves to 36px against a 39px `BOOST`
    label, and the button reads `OOST` with the `B` and the `T` sheared off.
    The band is bounded and extreme - about 1620px wide and up at 160-165px
    tall, 2020px and up at 170-175px, 2360px and up at 180-185px, and nothing
    at 150px or at 190px - but every window in it is one the game is drawing
    on. Before this change those same windows painted the whole label about
    1.5px past each side of the circle, onto the tunnel, which cost a player
    nothing. The pair of screenshots is beside the agent log, as
    `ui-ux-tester.overlay1107.9-fitted-1920x160-clipped.png` and
    `ui-ux-tester.overlay1107.10-fitted-1920x160-unclipped.png`.
  - **Goal**: A decision rather than a defect to chase, and cosmetic either
    way. Accept it and say so where the rule is argued, since the comment
    above `#fire,#boost` claims the declaration "costs one declaration and
    holds at any size" without naming the sizes where what it costs is a
    readable label; or solve the label's font size out of `--ctl` the way the
    box already is, so the text shrinks with the circle instead of being cut
    by it.
  - From: UI/UX Override - the label clip on a wide short window
- [ ] The `#touch` rule's comment still says the overlay is revealed once and
  then left up
  - **Issue**: `index.html:42-43` introduces the `#touch` rule with "The page
    reveals them on the first touchstart and then leaves them up." That held
    until this turn and is now the opposite of what the page does:
    `syncTouchOverlay` at `index.html:5531` sits on a resize listener of its
    own and writes `touchLayer.hidden=!touchOverlayUp(touchShown,gridFits)`, so
    the overlay comes down on every window `fitGrid` refuses and back up on the
    first one that holds the grid. What it costs is where the sentence sits. It
    is the only account of the overlay's lifecycle in the stylesheet, about
    5,490 lines above `touchOverlayUp`'s docstring at `index.html:4079`, which
    now argues the opposite at length - so a reader working down the file from
    the top, or one reading the CSS section on its own, takes the pre-0.15.4
    behaviour as current and has nothing to tell them otherwise. The release
    note, `docs/features.html` and `docs/how-it-works.html` were all brought up
    to date on the same turn; this sentence was the one place that was not.
  - **Goal**: Say what the page does now, naming the window rather than only
    the touch: a touch is what reveals them, a window the fitter refuses is
    what takes them down again, and the touch is remembered so the first window
    that holds the grid brings them back. `touchOverlayUp`'s docstring already
    carries the whole argument, so this wants a clause rather than a paragraph.
    Nothing executes either sentence, so the suite staying at 964 of 964 is the
    whole check.
  - From: UI/UX Override - the label clip on a wide short window
- [ ] Taking the overlay down does not let go of what a thumb is holding
  - **Issue**: `syncTouchOverlay` at `index.html:5531` writes `hidden` and
    nothing else. Until this turn the overlay could not go down once it was up,
    so a control was only ever released by the pointer that pressed it; now an
    orientation change from a window that fits to one the fitter refuses can
    hide `#touch` while the stick, `#fire` or `#boost` is held, and the
    `pointerup`, `pointercancel` and `pointerleave` listeners that call
    `releaseStick` at `index.html:5549` and `holdButton`'s `release` at
    `index.html:5603` are on elements that are `display:none` by then. If none
    of the three fires, `keys.BOOST` - or `SPACE`, or a direction - stays
    `true`, and it stays true for the whole of the notice: the branch at
    `index.html:5695` deletes every `justPressed` key on each frame and never
    touches `keys`, so the held key is still held on the window that brings the
    overlay back.

    Whether it does stick is a browser question rather than a Node one, and
    nobody has observed it. Both the stick and `holdButton`'s element take
    pointer capture, and what a browser does with a captured pointer whose
    element becomes `display:none` decides all three outcomes: release the
    capture and `pointerleave` fires at the old target and the key is let go;
    keep it and the `pointerup` still lands on the hidden element and the key
    is let go; release it with no boundary event and the key sticks. The
    harness cannot answer any of them - `test/browser-wiring.test.mjs`'s own
    header says real pointer plumbing is the browser's and that a stub proves
    only that a handler was called with an id - which is why this is queued
    rather than fixed.

    The repository already reasons about this exact hazard one input layer
    over. `pollGamepads()` is deliberately above the notice branch, at
    `index.html:5682`, because "a pad that stopped reporting under the floor
    would come back with keys still held from before the resize". The touch
    path now has a way to reach that state and no answer for it.
  - **Goal**: Settle it in a browser first - a thumb on `BOOST`, a resize onto
    a refused grid, then back, reading `keys.BOOST` at each step. If the key
    sticks, make taking the overlay down release the controls as well as hide
    them: `releaseStick` is a hoisted function declaration `syncTouchOverlay`
    can already call, while `holdButton`'s `release` is a closure and would
    have to be handed back for the same to reach `#fire` and `#boost`, which is
    why this is more than the one-line edit it reads as. If it does not stick,
    the thing to leave behind is the reading that says so, in
    `test/browser-wiring.test.mjs` beside the two cases this turn added, since
    the answer is a browser's and the next browser may not give the same one.
  - From: UI/UX Override - the label clip on a wide short window

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

## Medium Effort

Features that add a new system to the engine: audio, new entity types, or a
second input path. Each one spans both the terminal and browser versions.

## Bigger Features

Substantial additions that change how a run plays or how the screen is laid
out. These carry the most risk to existing gameplay and are sequenced last.

## Polish

Presentation and platform refinements that do not change gameplay: rendering
quality, browser integration, accessibility, and performance headroom.

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

> 192 earlier items in `TODO-archive.md`, newest last.

- [x] Nothing in the suite executes the page wiring below the canvas marker
  - **Issue**: Not a defect. A browser pass on 11-05-26 drove that region and
    found it sound: 128 assertions over the mute label on all three menu
    screens, a muted round and two rematches, the on-screen FIRE and gamepad
    seat, and the resize path at six window sizes, all passing, and every
    figure reproduced on a second full run. What it showed instead is that it
    was the first thing ever to run those lines.
    `test/browser-shell.test.mjs` opens `index.html`, finds
    `// ===== Canvas Setup & Sizing =====`, and asserts over the characters
    after it, so the frame loop, the two `new VersusRound(...,game.state.muted)`
    openings, the `versusRematch` call, the gamepad poll and `handleResize` are
    covered by a reader and executed by nothing. The cost is already on the
    record - `0.13.0`, `0.13.1` and `0.13.2` were all defects on that side of
    the marker, and `0.13.2` was a defect in the cases written to pin it - and
    the verification that just cleared the region leaves no check behind,
    because it runs only when the agent runs.
  - **Goal**: Resolve to [browser-wiring-regression-harness.prompt.md](.claude/prompts/browser-wiring-regression-harness.prompt.md)
  - From: UI/UX Override - the wiring below the canvas marker
- [x] Four comments illustrate the route-dependent mode with `?mode=tunnel`,
  which `DEBUG_MODES` rejects
  - **Issue**: `inputMode`'s docstring at `index.html:5000` and `index.html:5019`
    argues that which seat a pad's A button landed in "depended on the route in,
    since `?mode=tunnel&versus` leaves the solo game at `'playing'`", and
    `test/browser-shell.test.mjs:722` and `:887` carry the same sentence beside
    the cases that pin the behaviour. `tunnel` is not a debug mode and never has
    been: `DEBUG_MODES` is `['mines','orbs','obstacleCollision','mineCollision','chaos']`
    at `index.html:1283` and has held those five unchanged since `0.3.0-alpha`
    (`git log -S"'tunnel'"` over `index.html` and `src/types.ts` is empty). The
    page gates on `DEBUG_MODES.includes(explicitMode)` at `index.html:5313`, so
    `?mode=tunnel` falls through to the title screen and leaves the solo game at
    `'menu'` - confirmed by running the gate: `?mode=tunnel&versus` answers
    `'menu'` and `?mode=chaos&versus` answers `'playing'`.

    So the example inverts the point it is making. `'menu'` is the state these
    passages contrast the route against, which makes `tunnel` the one value that
    cannot demonstrate the contrast, and a reader who tries the link to see the
    behaviour for themselves gets the title screen and no word about why. The
    second cost is that four places in two files name `tunnel` as a mode a URL
    can ask for, one of them a test file read as the record of what the wiring
    below the canvas marker does.

    Not a defect in `inputMode`. The reading it takes is right and the behaviour
    it describes is real - a valid mode does leave the solo game at `'playing'`,
    which is why it is the gate rather than `game.state.mode` that both call
    sites now ask. Only the worked example is impossible.
  - **Goal**: Substitute a mode the allow-list holds - `chaos` reproduces every
    sentence as written, verified above - at all four sites: `index.html:5000`,
    `index.html:5019`, `test/browser-shell.test.mjs:722` and
    `test/browser-shell.test.mjs:887`. Nothing executes, so the suite staying at
    930 of 930 is the whole check. The two copies in `CHANGELOG.md` at `:360`
    and `:391` are already corrected and are not part of this item - release
    note prose is fixed in place rather than queued - so leave them alone and do
    not re-open 0.15.2's entry over it.
  - From: Code Review Override - a debug mode the allow-list has never held
- [x] `overlayVars` publishes a negative `--playpx` on the grids `fitGrid`
  refuses, and nothing reads that half of its domain
  - **Issue**: `playBandPx` at `index.html:4030` is
    `(grid.rows-HUD_ROWS-FOOTER_ROWS)*grid.cellH`, which goes negative whenever
    a grid has fewer rows than the HUD and footer want. `fitGrid` hands back
    exactly such a grid by design: when no font reaches the floor it returns the
    notice grid, which needs only `NOTICE_ROWS` of 3. A 300x60 window gives
    `{cols:30,rows:3,fits:false}` and `overlayVars(grid,60)` then answers
    `{'--footerpx':'42px','--playpx':'-36px'}` - reproduced against the harness's
    own `fitGrid` and `overlayVars`.

    `handleResize` publishes the map unconditionally at `index.html:5268`,
    before `frame()` ever reads `gridFits`, so the negative length reaches the
    root element on any window in that band. What stops it costing a player
    anything is circumstantial rather than intended: the overlay stays `hidden`
    until a `touchstart`, and a viewport 60px tall shows the too-small notice.
    `revealTouch` does not consult `gridFits`, so a touch arriving there would
    size the controls against it.

    The gap is the reason this is worth a line rather than the figure itself.
    `overlayVars`' own docstring argues it exists above the DOM marker so the
    pairing of the two properties is "where the suite can read it", and
    `test/browser-shell.test.mjs:1016` reads it at fitting grids only - so the
    half of its domain `fitGrid` is documented to produce is the half nothing
    asks about.
  - **Goal**: Decide which of the two this is, because they are different edits.
    Either the band is a state the overlay should not be sized for at all, and
    `handleResize` should skip the publish - or defer to `frame()` - when
    `grid.fits` is false; or the figure should floor at 0, in `playBandPx` where
    every caller gets it rather than at the one call site. Then cover it:
    extend the `overlayVars` case to the grids `fitGrid` returns with
    `fits:false`, which is the assertion that would have caught this, and assert
    the property is a length a control can be sized against rather than only
    that the two names are paired.
  - From: Code Review Override - a debug mode the allow-list has never held
- [x] The touch overlay is still laid out on a window the game refuses to draw
  - **Issue**: The floor on `playBandPx` works. A browser pass on 11-06-26 read
    `--playpx` back off the root element at 36 refused viewports and it is
    `0px` at every one of them, never the negative length 0.15.3 removed, and
    `--ctl` genuinely collapses the control's content box to zero width there.
    What the same pass found is a layer up. `revealTouch` sets
    `touchLayer.hidden=false` on the first `touchstart` and nothing ever
    consults `gridFits` again, so a window below the grid floor keeps a
    laid-out overlay on a screen the notice owns. Eight of the 36 paint ink
    either over the notice or off the window: at 320x140 and 300x140 - both
    carrying `--playpx: 36px`, a positive length with the floor not engaged, so
    this predates the floor and is not its to fix - the stick ring sits on
    `Please resize your window.` with `FIRE` on the end of the same line. At
    320x60 and 400x80 nothing reaches the notice glyphs, but the `FIRE` and
    `BOOST` labels are still painted at full size, 31.2px and 39px wide,
    spilling about 13.6px past each side of a 4px control, because a flex
    container with a zero-width content box does not clip its text - `BOOST`
    reaches x 321.5 on a 320px-wide window. Screenshots are beside the agent
    log, prefixed `ui-ux-tester.overlay1106`.
  - **Goal**: Resolve to [touch-overlay-on-refused-grid.prompt.md](.claude/prompts/touch-overlay-on-refused-grid.prompt.md)
  - From: UI/UX Override - the overlay on a grid the fitter refuses
- [x] Two places describe the stub DOM as holding "the six elements the markup
  declares", and the markup declares seven
  - **Issue**: `stubDom`'s docstring at `test/helpers.mjs` says it hands back "a
    document holding the six elements index.html declares", and
    `docs/development.html` says the harness evaluates the script against "a
    stub DOM - a window, the six elements the markup declares, a navigator, a
    clock, and an animation frame queue". The markup declares seven ids:
    `c`, `crt`, `touch`, `stick`, `nub`, `fire` and `boost`, at
    `index.html:124-129`. Six is the number the page *fetches* -
    `getElementById` is called for all of those but `crt`, which is a CSS layer
    driven by a body class instead (`applyCrt` at `index.html:5307` toggles
    `crt` on the body, and `body.crt #crt{opacity:1}` at `index.html:38` does
    the rest), so it needs no handle and the stub rightly has none.

    So the figure is right about the stub and wrong about where it comes from,
    which costs the sentence the one interesting thing in it. A reader
    extending the harness counts the markup, finds seven, and either adds a
    `crt` stub nothing will ever ask for or concludes the six are incomplete -
    and the actual reason there is no seventh handle, that the CRT overlay is
    not driven through one, is what the sentence currently hides. The published
    docs page is the half that matters most, being the one a stranger reads.
  - **Goal**: Say what the six are counted from rather than changing the count -
    "the six elements the page fetches by id" reads correctly in both places -
    and in `test/helpers.mjs` add the clause that makes it worth knowing: that
    `#crt` is declared but never fetched, because the overlay is toggled by a
    class on the body. The release note's copy of the same phrase was corrected
    in place on 11-06-26 and is not part of this item, so leave `CHANGELOG.md`
    alone. Nothing executes either sentence, so the suite staying at 959 of 959
    is the whole check.
  - From: Code Review Override - the element count the stub DOM is described by
