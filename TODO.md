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

### UI/UX Override - two claims the label floor was justified with

#### Found Issues

- [ ] The new sweep's docstring quotes a count from no sweep in the repository
  - **Issue**: `test/browser-shell.test.mjs` carries `188,421` twice, and
    nothing produces it. The docstring above `floorSweep` says "The whole space
    is 188,421 fitted viewports and test/probes/overlay-anchor.mjs walks it,
    which is where the figures the CHANGELOG quotes come from", and the comment
    opening the case below it says "1,276 of the 188,421 fitted viewports letter
    under 8px". Three readings disagree with that. `node test/probes/run.mjs
    overlay-anchor` reports `3581 of 682500 viewports unlettered (0.52%)`, which
    is what `index.html` and the `0.15.6` CHANGELOG entry both quote. The
    `floorSweep` lattice itself - every 23rd width from 240 and every 11th
    height from 120 - yields 14,915 fitted viewports, of which 123 letter under
    `8px`; 14,915 is the figure the CHANGELOG's own **Added** entry uses for
    this very case. And the CHANGELOG's **Notes** say of `1,276 of 188,421`
    that it "came from the review's own sweep" and that "Nothing published
    carries it" - which this file does, in the two places above. So the
    docstring attributes the review's scratch lattice to the probe, and the case
    comment describes a space it does not walk.
  - **Goal**: Give each figure the sweep it belongs to. The docstring should
    name what `floorSweep` actually produces - 14,915 fitted viewports, 123 of
    them under the floor - and point at the probe for the 682,500 walk the
    CHANGELOG quotes, rather than merging the two into one number. `188,421` and
    `1,276` should leave the file, since nothing in the repository can rebuild
    them.
  - From: UI/UX Override - two claims the label floor was justified with
- [ ] The floor's reading says the CRT crosses the glyphs, and it paints under them
  - **Issue**: `index.html`'s comment on `#touch.unlettered #fire,#touch.unlettered
    #boost`, and the `0.15.6` CHANGELOG entry in the same words, say "The `#crt`
    scanline gradient crosses the glyphs and costs another half step of contrast
    on all three, so those are the sizes as a player sees them rather than as
    the font would draw them on a clean background". `#crt` and `#touch` are
    both `position:fixed`, `grep -n "z-index" index.html` returns nothing, and
    `#touch` is the later element in the body - so the label paints over the
    gradient. Measured in Chromium `151.0.7922.34` at `deviceScaleFactor: 1`,
    with the glyph's own pixels isolated by taking `BOOST` out of the markup and
    the CRT toggled by the page's own `C` key: of 220 glyph pixels at `13px`, 0
    change; of 106 at `7.99844px`, 1 changes by 0.7 of 255 a channel; of 26 at
    `3.98906px`, 2 change by 1.7. The gradient is on - it changes 18,659 pixels
    of the `1400x800` window - and it is not on the glyphs. What it does band is
    the circle's own 35%-alpha fill, so the word is read against a striped
    backdrop, which is the half of the claim that holds. The three sizes
    themselves are exact and are not in question.
  - **Goal**: Resolve to [crt-does-not-cross-the-glyphs.prompt.md](.claude/prompts/crt-does-not-cross-the-glyphs.prompt.md)
  - From: UI/UX Override - two claims the label floor was justified with
- [ ] The new sweep's docstring justifies its height step with a factor it shares
  - **Issue**: `floorSweep`'s docstring in `test/browser-shell.test.mjs` says
    "Neither step shares a factor with any cell the fitter produces, so the
    lattice cannot step over the band the floor is about". The height step is
    11, and the fitter produces a `6x11` cell at font size 9 - the whole set it
    can produce is `4x8`, `5x9`, `5x10`, `6x11`, `6x12`, `7x13`, `8x14`, `8x15`,
    `9x16`, `9x17` and `10x18`, and the sweep itself settles on `6x11` at some
    of its viewports - so the height step is exactly a cell height rather than
    coprime to all of them. Nothing fails, and the sentence's own conclusion is
    carried by the clause after it: heights 164, 175, 186 and 197 fall inside
    the band and the sweep does find 123 viewports under the floor. A step equal
    to the cell height also moves the row count by exactly one a sample, which
    is full coverage rather than a gap. The width step 23 is prime and shares no
    factor with any cell width, so that half is right. What is wrong is the
    reason given for the step, which a reader changing either axis would trust.
  - **Goal**: Either drop the coprimality claim and keep the reason that holds -
    the band is 2563-3837px wide by 160-197px tall and both steps land inside it
    - or say what is actually true of the height step. `axis`'s docstring in
    `test/probes/overlay-anchor.mjs` makes the same claim of its coarse step of
    7, and `7x13` is a cell the fitter produces, so a fix wants to cover both
    rather than leave two sentences disagreeing about one fact.
  - From: UI/UX Override - two claims the label floor was justified with
- [ ] The stub's new style resolver folds rules a browser would have gated
  - **Issue**: `resolvedStyle` in `test/helpers.mjs` walks `PAGE_SHEET.rules`
    and never reads `rule.at`, so a declaration inside an `@media` or
    `@supports` block is folded as though it were top level. Its own docstring
    offers the opposite behaviour as the model - "left out rather than guessed
    at, exactly as `declarationsFor` leaves out a rule inside an at-rule" - and
    `declarationsFor` in `test/page-style.mjs` opens its loop with
    `if (rule.at.length) continue;`. Nothing fails today: `@media` appears in
    `index.html` only inside a comment, so the page declares no at-rule and the
    two resolvers cannot disagree. The state that makes them disagree is the
    first at-rule naming `#fire` or `#boost` - a narrow-screen or
    `prefers-reduced-motion` override of the label's size - at which point
    `window.getComputedStyle` on the stub answers with a length the browser only
    uses under the query, and the label-floor cases pass or fail on a size no
    player sees.
  - **Goal**: Skip an at-rule's rules in `resolvedStyle` the way
    `declarationsFor` does, so the docstring's claim is the code's behaviour,
    and leave a conditional block to a caller that reads `rule.at` itself. A
    case pinning it needs a sheet of its own, since `index.html` has no at-rule
    to exercise.
  - From: UI/UX Override - two claims the label floor was justified with

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

> 198 earlier items in `TODO-archive.md`, newest last.

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
- [x] The overlay label keeps shrinking past the point it says anything
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
- [x] The new label case calls `3840x200` a viewport that was clear before the
  fix, and it was the worst-sheared of the seven
  - **Issue**: `CLIP_SHAPES`' docstring in `test/browser-shell.test.mjs` sorts
    the seven viewports into five that sheared and two on "the far side" of the
    band - "`1920x190` was always clear, and `3840x200` is the widest window
    there is at a height that still holds a control" - and then says the
    Chromium reading was "clipped at the first five and clear at the last two
    beforehand". `3840x200` is not on the far side of that band and was not
    clear. `fitGrid(3840,200)` reports `fits: true` on a grid of 768x20
    publishing `--playpx: 150px`, `--ctl` solves to `31.60px`, the content box
    the two `2px` borders leave is `27.60px`, and a `BOOST` fixed at `13px` is
    `39.01px` - `11.41px` over, against `7.04px` at the worst of the five the
    comment does call clipped (`1920x165`, `31.97px` of box). At 3840 wide the
    band does not clear until about `231px` tall, where the content box reaches
    `40.45px`. So the one viewport in the list chosen to stand for *not*
    shearing is the strongest shearing case in it, and the probe beside it
    already says so - it counts 21,540 sheared labels over the walk, and the
    `TODO` item above puts them "all of them very wide and very short".
  - **Goal**: Say what `3840x200` is - the far corner of the shearing band
    rather than the far side of it, which is what makes it the strongest case
    in the list - and leave the "clear beforehand" claim on `1920x190`, which
    holds (`43.85px` of box against a `39.01px` label). The `after` half of the
    sentence is right for all seven and wants no change. Nothing in the
    docstring executes, so the suite staying at 967 of 967 is the whole check.
  - From: UI/UX Override - the label below the size a word can be read at
- [x] The features page says the controls are not sized out of the window, and
  on most devices they are
  - **Issue**: `docs/features.html`'s touch bullet gained "All three are sized
    out of the band between the HUD and the footer rather than out of the
    window, in character rows no viewport unit can measure". Each size is a
    `min()` of three terms, not one -
    `--ctl:min(24vw,118px,calc((var(--playpx,9999px) - 1vh - 2vw - 8px) / 2))`
    and `--stick:min(34vw,170px,calc(var(--playpx,9999px) - 1vh - 8px))` at
    `index.html:84-85` - and the band term is not the one that binds on most of
    the 16 device shapes `test/browser-shell.test.mjs` walks. For `--ctl` the
    band wins on 8 of the 16; on the two portrait phones (`375x667`, `412x915`)
    `24vw` wins, and on six more (`667x375` through `1180x820`) the `118px`
    ceiling does. For `--stick` the band wins on 2 of the 16 - only `349x160`
    and `400x180` - with `34vw` on the two portrait phones and `170px` on the
    other twelve. The page's own comment above `:root` states the shape the
    bullet flattens: "Three caps, because three different things bound a
    control... And the room actually available, which is the one that was
    missing." The cost is that the one published sentence describing how big
    these controls are tells a phone user the window plays no part in it, when
    on a phone in portrait the window's width is the only thing that decides
    it.
  - **Goal**: Keep the consequence, which is correct and is the half worth
    publishing - a short wide window gets smaller controls instead of controls
    over the shield bar - and say the band is the cap that was missing rather
    than the only cap, so the bullet agrees with the `:root` comment it
    describes. The clause about the `FIRE` and `BOOST` lettering shrinking with
    the circle is accurate and wants no change. Nothing on the page executes,
    so the suite staying at 967 of 967 is the whole check.
  - From: UI/UX Override - the label below the size a word can be read at
