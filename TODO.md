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

### UI/UX Override - the label below the size a word can be read at

#### Found Issues

- [ ] The overlay label keeps shrinking past the point it says anything
  - **Issue**: `0.15.5` solves `#fire` and `#boost`'s label out of `--ctl`, and
    that fixed the shearing it was written for - all five of the viewports the
    change was sent to be verified at now letter `BOOST` and `FIRE` whole,
    inside the circle, and legibly. What the rule does not answer is what the
    label should do once the circle is smaller than any readable word. It goes
    on shrinking. Read off Chromium 151 at `deviceScaleFactor: 1` from
    magnified true-pixel crops: `8.00px` at `2560x161` is marginal and legible
    mostly by expectation, `6.00px` at `3200x161` is an undifferentiated run of
    blocks, and `3.99px` at `3840x167` is a smudge with no character
    distinguishable. The `#crt` scanlines cross the glyphs and cost another
    half step of contrast. Nothing escapes the circle and nothing shears at any
    of them, so this is not the clip returning - it is the new rule correctly
    solving to a size not worth drawing. Swept through the project's own
    resolver over `fitGrid` and `overlayVars`, 1,276 of 188,421 fitted
    viewports - 0.68% - letter below `8px`, all of them very wide and very
    short, where `--ctl`'s `2vw` term eats the control faster than the band
    grows.
  - **Goal**: Resolve to [overlay-label-floor.prompt.md](.claude/prompts/overlay-label-floor.prompt.md)
  - From: UI/UX Override - the label below the size a word can be read at

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

> 195 earlier items in `TODO-archive.md`, newest last.

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
- [x] `overflow:hidden` shears the `BOOST` label on a fitted window wider than
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
- [x] The `#touch` rule's comment still says the overlay is revealed once and
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
- [x] Taking the overlay down does not let go of what a thumb is holding
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
