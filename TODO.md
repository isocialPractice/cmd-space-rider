# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### UI/UX Override - the two re-inked hint rows, and the depth ramp left alone

#### Resolve Issues

- [ ] Hint Row Ink 1
  - **Issue**: the footer row is sound and the pause box is not. Read in
    Chromium at 1400x900 as the brightest pixel of each glyph against the
    10th-percentile pixel of its own cell, off a composited screenshot with
    `#crt` up, which is on by default: `P to resume` in `WHITE` is 9.04:1 at
    screen centre, where the vignette is transparent, while `[ PAUSED ]`
    alternates `BRIGHT_YELLOW` `#ffff55` at 19.69:1 and `YELLOW` `#aa5500` at
    4.01:1 on `drawPauseOverlay`'s own `sin(uiTime*3)*0.5+0.5 > 0.3`. In the
    dim half the hint is **2.18x the label's stroke contrast and 2.54x its
    light per cell** - the label is meant to be the louder of the two, and for
    part of every pulse it is the quieter. Counted off painted frames rather
    than taken from the sine: 150 of 400 frames at 60.1fps, so 37.5% of the
    cycle, in unbroken spans of 0.77s against the sine's own 36.9%. `GRAY` was
    2.82:1, under the dim rung's 4.01:1, so before this change the ordering
    held through the whole pulse. Light mode inverts the same way and narrower:
    label 8.40:1 against hint 8.93:1 in the dim phase, with ink per cell dead
    level in both phases, 0.98x and 1.02x. Two things are NOT wrong: the box's
    `BRIGHT_CYAN` border still frames the pair rather than being outshone -
    16.52:1 dark, 11.51:1 light, and the most total ink of the three in both
    schemes - and the footer hint row clears 3:1 everywhere it was asked to,
    6.38:1 average with the overlay up, 5.69:1 at the worst cell, 3.49:1 on the
    scanlined pixel rows, 9.04:1 with the overlay down, and 7.62:1 / 7.85:1 in
    light.
  - **Goal**: decide whether the pause label should outrank its hint through
    the whole pulse, and move whichever ink the decision names. The label's dim
    rung is the cheaper end - `YELLOW` at 4.01:1 is the only thing in the box
    under the hint - and the hint's own ink is the other, somewhere between
    `GRAY`'s 2.82:1 and whatever the label's dim rung settles at. Then pin it
    where every other figure these two rows were re-inked on now lives:
    `test/palette-contrast.test.mjs`, one case walking both pulse rungs of the
    label and asserting each is at least the hint's own contrast, in both
    schemes, written the way `the tunnel depth ramp climbs far to near on every
    pulse arrangement` is - a ramp assertion whose failure message names the
    rung that collapsed, not a floor to clear. It fails on today's palette, and
    that is the defect rather than a reason to soften it.
  - From: UI/UX Override - the five readings a stub DOM cannot take

#### Found Issues

- [ ] The far end does not fade, and the far pair is a doubled blue channel
  - **Issue**: `index.html:2904-2932` records the decision to leave the two far
    depth bands alone and rests it on two things a screen had never been asked
    for - that "the far end fades into the dark, which is what aerial
    perspective looks like", and that the far pair is "below the contrast at
    which a difference can be seen". Both were read this pass on a frozen
    screen: a paused run stops `state.time` and `state.distance`, so the pulse
    holds its phase and `ringOffset` holds its place, which is what makes a
    screenshot and the glyph list it was picked from the same frame. Neither
    holds. **It does not fade.** On a frame whose band 1 is all `#0000aa`, with
    `#crt` off every row of the band reads the same whole-cell mean, `0,0,23`:
    dE76 0.00 from the farthest row to the nearest, WCAG 1:1, and 0.00 between
    any two neighbours. With the overlay up the same band runs `0,0,18` to
    `0,0,20`, dE76 0.96 end to end, under a just-noticeable difference and
    supplied by the vignette rather than by the ramp. What the band does is
    stop: the row above the corridor is the HUD shield bar, dE76 104 from band
    1 with the overlay up and 127 with it off. **The far pair is not
    invisible.** Frozen where both bands carry `#0000aa`, so that only glyph
    coverage separates them, the whole-cell mean goes `0,0,23.5` for U+2591's
    quarter to `0,0,48.9` for U+2592's half with the overlay off - the blue
    channel doubles. WCAG 1.0311:1, dL\* 1.42, dE76 20.43; with the overlay up,
    `0,0,19.4` to `0,0,40.8`, WCAG 1.0218:1, dL\* 0.99, dE76 16.65. The WCAG
    figure is the one that misleads here: its own +0.05 flare term is a hundred
    times the light being compared, so it reports a hundredth where the screen
    shows a doubling, and the boundary is a straight horizontal line across the
    width of the screen at one row. Whether a person sees it turns on the
    display's black level, which is why this is written as a reading and not a
    verdict - but it is not the null the comment claims. The half of the
    decision that **does** survive is where the recession comes from: the walls
    taper from 6 columns at the far end to 136 at the mouth, the ring ends run
    12.75:1 against the backdrop (17.13:1 over the near half, 7.33:1 over the
    far) at 10 rows a frame on a 4-row spacing, and the one large ink step is
    at t=0.5, +419% Weber from band 2's 1.86:1 to band 3's 5.26:1. Two cues
    carry nothing measurable: the floor dots are `DARK_BLUE` at 1.14:1, and the
    wall thickness has two tiers rather than three - its own item below. On a
    warp the closeness goes away outright, as the comment's own aside allows:
    flown the full minute to `WARP_INTERVAL` in `?mode=orbs` and probed for 60
    frames inside the 2s flash, the tightest band-1-against-band-2 instant is
    1.2794:1 against the blue ramp's 1:1, pooled 1.9634:1 against 1.5096:1, and
    band 1 against the backdrop 2.4641:1 against 1.1941:1.
  - **Goal**: take the decision again with the screen's own readings beside the
    arithmetic, and rewrite whichever half of the comment the answer leaves
    standing. The two repairs the comment already lists are unchanged by this -
    inks the far pair cannot both land on, or lifting the far end off black -
    and the reading adds a third that was not visible from the figures: the far
    band's termination against the shield bar is what a player meets at the top
    of the corridor, so a decision about the far end is partly a decision about
    that boundary. Whatever lands, the two sentences this item quotes should
    not be left as they are, because the next reader will take them for
    observations. The arithmetic half is already pinned in
    `test/palette-contrast.test.mjs` and needs nothing here.
  - From: UI/UX Override - the two re-inked hint rows, and the depth ramp left
    alone

- [ ] The tunnel wall's thickness cue never reaches its third tier
  - **Issue**: `drawTunnel` sets `const thickness=max(1,floor(t*3))` and the
    comment above the ramp counts thickness among the cues the depth is carried
    by. `t` is `(row-gameTop)/gameH` over `row < gameBottom`, so it never
    reaches 1 and `floor(t*3)` never reaches 3: the expression gives 0 over the
    first third, 1 over the second and 2 over the last, and `max(1, ...)` folds
    the first two into one. Counted over 150 frames at 1400x900, every row from
    3 to 32 drew 1 cell per side and every row from 33 to 46 drew 2, with no
    row anywhere drawing 3. So the cue has two tiers rather than three, its one
    step sits at t=0.667, and that step lands inside band 3 rather than on any
    of the glyph ramp's own boundaries at 0.2, 0.5 and 0.8.
  - **Goal**: decide whether two tiers were meant. `1+floor(t*3)` is the
    three-tier form and steps at 0.333 and 0.667, neither of which is a glyph
    boundary either, so the choice is really between leaving it at two and
    picking steps that agree with the ramp. It is not free: a third cell per
    side takes two more columns out of the visible corridor at the mouth, which
    is the drawing rather than the geometry - `tunnelSpan` is what the ship is
    held between and nothing here touches it - so it wants eyes on a screen
    before it is taken. `test/warp.test.mjs` walks outward from `tunnelSpan`
    collecting whatever glyph it finds, over the four-glyph set, and a thicker
    wall adds cells without adding a fifth glyph, so it is not in the way.
  - From: UI/UX Override - the two re-inked hint rows, and the depth ramp left
    alone

- [ ] On paper the hint row reads level with the HUD it sits under
  - **Issue**: `drawFooter`'s comment gives up the hierarchy and argues the HUD
    recovers it through hue - "The HUD keeps its own voice through hue, being
    cyan" - and every figure behind that was the dark scheme's. In light mode
    both halves are weaker, and this is the reading the completed item asked
    for and did not take. At 1400x900 with `#crt` up, ink read as the darkest
    pixel of a cell against its own 90th-percentile paper: the hint row is
    7.62:1 (6.28:1 at the worst cell, 4.52:1 on the scanlined rows) and the HUD
    score row is 7.48:1, so the hint row is the louder of the two by stroke,
    1.02x, by ink per cell, 1.36x, and by the whole element, 1403 against 717.
    With the overlay down the order comes back, 7.85:1 against 13.53:1, so the
    overlay is what decides it: its vignette is a function of distance from the
    screen centre, and the hint row is centred while the HUD sits in the top
    corners. The hue argument is thinner on paper too - the HUD's cyan resolves
    to `#00565f` and reaches the screen at `0,19,21`, 21 of chroma, against the
    hint row's `43,43,48` at 5, where dark gives `85,255,255` at 170 against
    `WHITE`'s 0. Dark mode is where the comment's claim holds and the reading
    says so: there the hint row is 6.38:1 against the score row's 7.45:1 and
    half its light per cell, 4th of six elements by stroke contrast and 3rd by
    total light. The same overlay-dependence shows in the footer's own border:
    with `#crt` up the hint row out-reads the `SPD: 1.0x` strip beside it,
    1.3x by stroke and 1.6x by light per cell, and with the overlay down the
    strip out-reads the hint row 17.01:1 to 9.04:1, because the vignette keeps
    67% of the centred hint row's ink and 24.5% of the corner-set strip's.
  - **Goal**: decide whether light mode wants its own answer for these two
    rows, or whether the figures simply belong beside the dark ones in the
    comment so the next reader is not left with a hue argument that is a third
    as strong on paper. Nothing here is under a contrast floor - every row
    named clears 3:1 in both schemes with the overlay up - so this is a
    hierarchy decision and not a legibility one. If it lands as a re-ink,
    `LIGHT_INK` is where it goes, and `no two inks the game draws sit closer
    than MIN_INK_SEPARATION` is the case it has to get past.
  - From: UI/UX Override - the two re-inked hint rows, and the depth ramp left
    alone

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

> 232 earlier items in `TODO-archive.md`, newest last.

- [x] **Hint Row Ink**: GRAY canvas text is under 3:1 before the CRT overlay and 2.12:1 with it
  - **Issue**: measured off the full-strength stroke pixel of each glyph against
    an unpainted neighbouring cell, in Chromium at 1400x900 on a paused run,
    comparing the same cell with the same glyph and the same ink index in both
    states. `GRAY`, index 8, resolves to `#555555`, which on the `#000000` the
    renderer paints it against is **2.82:1 with the overlay off** - already
    under the 3:1 a large-text minimum asks for, before anything is laid over
    it. With `#crt` up it falls to 2.38:1 on average and 2.12:1 at the worst
    cell, and split by scanline phase the stroke's brightest pixel is 0.0688 on
    the untouched pixel rows and 0.0320 on the scanlined one - 2.38:1 and
    1.64:1. For comparison `BRIGHT_CYAN` goes 17.13:1 to 7.77:1. GRAY is what
    `drawFooter` writes the control hint row in and what `drawPauseOverlay`
    writes `P to resume` in, so the text at the floor is the text that tells a
    player which keys to press. Two things are NOT wrong and should not be read
    into this: the overlay only ever subtracts - 0 of 981 paired cells had
    their ink or their paper raised, so nothing is washed out - and it does
    cross the canvas glyphs, confirmed as a 3px period on a glyph's own pixel
    rows (0.518 / 0.267 / 0.523 / 0.525 / 0.271 ...), which is consistent with
    the archived 11-14-26 item about the touch label: `#touch` paints after
    `#crt` and the canvas paints before it.
  - **Goal**: decide whether the hint rows should be drawn in an ink that clears
    3:1 against the backdrop with the overlay up, and record the figure
    wherever the choice lands. The cheapest candidate is already in the palette:
    moving those rows from `GRAY` to `WHITE` costs nothing structural, since
    both are theme indices and `themePalette` re-inks them for the light scheme
    together. If GRAY is kept, the reason belongs beside the choice - a hint row
    is deliberately quieter than the HUD it sits under - along with the two
    figures, so the next reader is not left to rediscover that the overlay is on
    by default and takes it to 2.12:1. Either way the light scheme wants the
    same measurement taken, which this pass did not take: every figure here is
    the dark scheme.
  - From: UI/UX Override - the five readings a stub DOM cannot take
- [x] Nothing records that the gamepad poll is unreadable by an unattended run
  - **Issue**: `pollGamepads` is the one input path no run of this agent can
    verify, and the repository does not say so anywhere a reader would look.
    Checked this pass rather than assumed: `navigator.getGamepads()` returned
    four null slots in both a headless and a headed Chromium, with no
    `gamepadconnected` event in three seconds either time, and the one HID
    device Windows calls a game controller here is
    `HID\VID_BEEF&UP:0001_U:0004` from a `3DXKMJ_HIDMINI` collection - a 3D
    input driver's virtual HID collection rather than a pad. Chromium also only
    surfaces a pad after a physical button press on it, so even a pad that was
    plugged in would stay invisible to a run with nobody at the keyboard. The
    suite answers `navigator.getGamepads` from a stub table and the probe rig
    does not reach it at all, so the chain from a real axis reading through
    `padKeys`, `padFireKey` and `PAD_CONTROL_KEYS` to a key going down has never
    been exercised against hardware. Every previous UI/UX pass has reached the
    same wall and said so only in its own log, which is machine output that
    `.gitignore` keeps out of the repository - so the gap is rediscovered each
    time and recorded nowhere that survives.
  - **Goal**: write the gap down where it is read, not where it is hit. Add a
    sentence to `docs/development.html` beside the account of what the suite
    does and does not execute, naming the pad poll as the one input path that is
    stub-only and saying what that leaves unchecked - that the stub proves the
    mapping and the release rule and cannot prove that a real pad reports
    `mapping: 'standard'` or that its axes land where `PAD_STICK_X` and
    `PAD_STICK_Y` expect. `test/docs-site.test.mjs` holds that page to the
    repository's prose, so the same sentence wants a home in the source it is
    about: the docstring on `padKeys` is the natural one. If the owner would
    rather the reading were taken, the item is instead a note of who takes it
    and where the result is recorded - a pad held against a browser is a minute
    of someone's time and would close this outright.
  - From: UI/UX Override - the five readings a stub DOM cannot take
- [x] Both contrast readings above are arithmetic, and the suite could hold them
  - **Issue**: a proposal rather than a defect, raised because the two readings
    that found something this pass were taken in a browser and a browser is the
    one place they will never be taken again. Neither actually needs one. A
    glyph the renderer draws is one `PALETTE` hex over another at a coverage the
    glyph fixes - `U+2591` is a quarter, `U+2592` a half, `U+2593` three
    quarters, `U+2588` all of it - and both the relative luminance and the WCAG
    ratio are closed-form from there. The browser agreed with that arithmetic to
    the third decimal everywhere it was checked this pass, which is what makes
    the Node form worth having: it is the same answer at a thousandth of the
    cost, and it runs on every change rather than when this agent visits.
  - **Goal**: one new case file in `test/`, matching the folder's conventions
    and `node --test`, asserting two things off `themePalette` rather than off
    restated hex values. **The depth ramp**: for every one of the four pulse
    combinations `drawTunnel` can produce, the four bands' coverage-weighted
    luminance climbs far-to-near, and the smallest band-to-band contrast over
    all four combinations is reported in the failure message so a palette edit
    that collapses a pair says which pair. Today that smallest figure is 1.04:1
    between bands 1 and 2, so the case has to be written as a ramp assertion
    with the far pair's closeness stated as the expected value rather than as a
    floor to clear - otherwise it fails the day it lands. **The text inks**: for
    each ink index the renderer writes text in, its contrast against
    `THEME_BG`, in both schemes, with the figures named. That pins `GRAY` at
    2.82:1 dark today and would catch a re-ink that moved it without anyone
    meaning to. The `#crt` composite is the one part that is CSS rather than
    palette, so either leave it out or fold in its two constants - `.26` alpha
    on one pixel row in three, `.55` at the vignette's edge - and say in the
    docstring that those are read from the stylesheet by hand and will drift if
    the rule changes. Both halves want `test/page-style.mjs` looked at first:
    it already resolves declarations out of `index.html`, which is where the
    CRT constants would come from if they are included.
  - From: UI/UX Override - the five readings a stub DOM cannot take
- [x] The depth ramp item's far-to-near figure disagrees with its own four means
  - **Issue**: `TODO.md:19-21` states the four bands' mean linear luminance as
    0.00211, 0.01720, 0.16064 and 0.46728 far-to-near and then closes "far wall
    to near wall is 167x". Those four means give 221.46x. The means are the half
    corroborated: all seven contrast figures in the same item derive from them
    exactly - 1.04:1, 1.34:1, 4.21:1 and 10.35:1 against black, and 1.29:1,
    3.13:1 and 2.46:1 band against band, each reproducing to the stated
    precision - so 167x is the stray, and it is the same number the item gives
    at `TODO.md:32` as a count, "band 1 was `#00005f` 167 times". Not fixed
    here: the figure is a browser reading this review cannot retake, and
    choosing between correcting the ratio and correcting the means is a
    measurement call rather than an arithmetic one.
  - **Goal**: re-derive the far-to-near figure from the four means, or retake it
    if it was measured over something other than the band means, and say which
    it is. Whichever lands, 167x taken at face value makes the far pair look
    three times better separated than the means say it is, which is the opposite
    of what the rest of the item argues.
  - From: Code Review Override - two figures that disagree with what they are read off
- [x] `ignoredByRepo` reads a leading-whitespace rule the lenient way its docstring refuses
  - **Issue**: `test/changelog-roll.test.mjs:131` opens `ignoreRules` with
    `.map((line) => line.trim())`. `trim()` drops leading whitespace as well as
    trailing, and git does not: a `.gitignore` line `  CHANGELOG-2026.md` is a
    pattern for a file whose name begins with two spaces, so git leaves
    `CHANGELOG-2026.md` tracked. Checked against git in a scratch repository
    rather than argued - `git check-ignore -v` reports only the unindented rule,
    while the parser answers `true` for both. The answer is spent at
    `test/changelog-roll.test.mjs:221` as `assert.ok(ignoredByRepo(one.file))`,
    where `true` passes, so a `CHANGELOG.md` pointer naming an absent archive
    would be accepted as excluded-on-purpose when git excludes nothing - the
    hand edit that check exists to catch. That is the lenient direction, and the
    docstring at `:151-153` claims the other one: a file it cannot parse
    "answers false too and leaves the checks at their strict reading - the safe
    direction". Trailing whitespace is read as git reads it, and the two CRLF
    lines in this repository's own `.gitignore` parse correctly, so no input in
    the tree reaches this today.
  - **Goal**: drop only trailing whitespace, `.replace(/\s+$/, '')` in place of
    `.trim()`, which keeps the CR handling the real file depends on and leaves a
    leading-whitespace rule unmatched the way git leaves it. Then either state in
    the docstring that leading whitespace is read as git reads it, or add the
    fixture that pins it: the file's own case at `:254-275` passes
    already-trimmed arrays, so nothing there exercises the trim at all.
  - From: Code Review Override - two figures that disagree with what they are read off
