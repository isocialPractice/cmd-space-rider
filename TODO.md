# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### UI/UX Override - the five readings a stub DOM cannot take

#### Found Issues

- [ ] The two far tunnel depth bands can take the same ink, and then read as one
  - **Issue**: read off the real canvas with `getImageData` in Chromium at
    1400x900, 300 wall cells per band over 30 frames, wall cells identified by
    `drawTunnel`'s own `max(1, floor(t*3))` thickness rather than by colour. The
    ramp itself is sound: mean linear luminance is 0.00211, 0.01720, 0.16064 and
    0.46728 far-to-near, it climbs on 30 of 30 frames with no band ever dimmer
    than the one behind it, and far wall to near wall is 167x. What the ramp
    does not survive is being converted to contrast. Against the black backdrop
    band 1 is 1.04:1, band 2 is 1.34:1, band 3 is 4.21:1 and band 4 is 10.35:1;
    band against band is 1.29:1, 3.13:1 and 2.46:1. The weakest instant measured
    was 1.043:1 between bands 1 and 2, and 8 of 30 frames had their weakest
    neighbouring pair under 1.1:1. The mechanism is the pulse at
    `index.html:2904-2907`: band 1 takes `DARK_BLUE` or `BLUE` and band 2 takes
    `BLUE` or `BRIGHT_BLUE`, so whenever both land on `BLUE` the two bands carry
    the same ink and are separated only by glyph density, `U+2591` against
    `U+2592`, 25% coverage against 50%, at a level where both sit within a
    hundredth of black. The inks measured bear that out: band 1 was `#00005f`
    167 times and `#0000aa` 133, band 2 `#0000aa` 211 times and `#5555ff` 89.
  - **Goal**: a decision rather than a repair, because the drawing may be right.
    A tunnel whose far end fades into the dark is aerial perspective, and the
    screenshot this was read from shows it reading that way. Three answers, and
    the item wants whichever is taken recorded where the ramp is chosen: accept
    it and say in the comment above those four lines that the far pair is below
    the threshold a difference can be seen at, and deliberately so, which stops
    the next reader treating the four as four distinguishable bands; or give the
    two far bands inks that cannot coincide, so that the pulse moves brightness
    within a band rather than across the boundary between two; or lift the far
    end off black so that band 1 is separable from the backdrop at all, which is
    the larger change and the one most likely to cost the depth cue. Whichever
    is chosen, `test/warp.test.mjs` already walks outward from `tunnelSpan` over
    the four-glyph set, so the glyphs must stay four.
  - From: UI/UX Override - the five readings a stub DOM cannot take
- [ ] GRAY canvas text is under 3:1 before the CRT overlay and 2.12:1 with it
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
- [ ] Nothing records that the gamepad poll is unreadable by an unattended run
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
- [ ] Both contrast readings above are arithmetic, and the suite could hold them
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

> 226 earlier items in `TODO-archive.md`, newest last.

- [x] **Exclusion Provenance 1** - the corrected docstring now says the exclusion
  could not be read off the probe, which the same file denies twice
  - **Issue**: the correction to `HARNESS_IMPORT`'s docstring closes on a
    causal clause that is false about the code. `test/probes.test.mjs:161-162`
    reads "test/probes/overlay-anchor.mjs never names the engagement at all,
    which is why the exclusion had to be written down here rather than read off
    the probe". The exclusion *is* read off the probe: `callsHarness`
    (`test/probes.test.mjs:178-181`) reads that probe's source, finds no
    engagement import, answers `false`, and the `if (!callsHarness(name))
    continue` at `test/probes.test.mjs:290` is what drops it from the harness
    run. `HARNESS_EXCLUSIONS`'s own docstring says so twice over, at
    `test/probes.test.mjs:86-90` - "declared rather than inferred, so a third
    one has to be written down here before the suite will accept it", and
    "`callsHarness` below is what actually decides, by reading each probe's
    source, and this list does not drive that - it pins it" - and
    `callsHarness`'s own docstring at `test/probes.test.mjs:167-169` promises
    the same thing from the other side, "read off its own source rather than
    listed here, so a probe that starts calling it is covered without a line
    being added". The probe not naming the engagement is not an obstacle to
    reading it; it is exactly what the reading returns. The clause also
    distinguishes nothing: `glyph-tuning` names no engagement either
    (`grep -n engagement test/probes/glyph-tuning.mjs` returns nothing, its one
    import being `../helpers.mjs`), so whatever the clause explains is true of
    both halves of the pair.
  - **Goal**: drop or rewrite that clause so the file states one account of the
    list rather than two. What is true is the sentence it is attached to - the
    negative fixture's prose lives in this file because neither probe mentions
    the engagement, so there is no probe line to quote - and the list is a
    pinning of what `callsHarness` already decides. A later reader who believes
    the clause has been told `HARNESS_EXCLUSIONS` decides exclusions, which is
    the inference `callsHarness`'s docstring was written to refuse, and acting
    on it would turn the read-off-source design back into a hand-maintained
    list.
  - From: UI/UX Override - the marker is no longer a test boundary
- [x] Exclusion Provenance 2 - the guard written for the account claims a
  completeness and an affirmation it does not hold
  - **Issue**: two claims the new case makes about itself are wider than what it
    checks. **The list.** `EXCLUSION_ACCOUNT`'s docstring
    (`test/probes.test.mjs:396`) says of its three declarations "Nothing else in
    the file states it". `READING_DENIED`'s own docstring, written in the same
    turn, states the same account at `test/probes.test.mjs:433-435` -
    "`callsHarness` is what decides, by reading each source, and the `continue`
    in the harness test above is where that answer is spent; HARNESS_EXCLUSIONS
    pins it rather than supplying it" - and is not in the list, so nothing reads
    it. Its omission is a gap rather than a necessity: adding
    `'const READING_DENIED'` to `EXCLUSION_ACCOUNT` and running
    `node --test test/probes.test.mjs` leaves the case green, checked. It is
    also the paragraph a denial is likeliest to reach, being the one written
    about denials, and `docs/development.html` now publishes the same count -
    "the three paragraphs that state the account" - so the page inherits the
    claim. **The affirmation.** The case is titled `probes: all three docstrings
    say the exclusion is read off the probe` (`test/probes.test.mjs:467`) and
    holds only that none of the three denies it. Delete the sentence 0.16.8
    wrote at `test/probes.test.mjs:163-166`, "The exclusion itself is read off
    those same two sources...", leaving that paragraph silent on the reading,
    and the case passes under a name saying the paragraph says it. The file
    names its other guards by the refusal they make - `probes: no sentence
    singles a probe out by a property the pair shares` - and `READING_DENIED`'s
    docstring says as much at `test/probes.test.mjs:443`, "What is matched is
    the denial rather than the subject". A reader who goes by the name believes
    the affirmative half is pinned when only its denial is, which is the same
    belief about the same paragraphs that 0.16.7 and 0.16.8 were each spent on.
  - **Goal**: close each claim to what is checked, either by widening the check
    or by narrowing the sentence, and say which was chosen. For the list: add
    `const READING_DENIED`, and anything else in the file that states the
    account, to `EXCLUSION_ACCOUNT` and rewrite the "Nothing else" sentence to
    say what the list holds and how a later paragraph joins it; or keep three
    and name the paragraphs that are out of it and on what ground.
    `docs/development.html`'s "three paragraphs" sentence moves with whichever
    is taken. For the name: rename the case to the refusal it makes, or hold the
    affirmation as well - a fixture per docstring for the sentence that affirms
    the reading, so deleting one fails - and keep the name only if the second is
    chosen. Neither half needs a new reader; `readingDenials` already takes text
    rather than a path.
  - From: UI/UX Override - the marker is no longer a test boundary
- [x] The engagement-mention reader matches against the path it printed, not
  only against the probe's line
  - **Issue**: `probes: neither excluded probe names the engagement, in an
    import or in prose` (`test/probes.test.mjs:525-527`) maps every line of a
    probe to `` `${file}:${i + 1} ${line.trim()}` `` and then filters that
    composed string for `engagement`, so the path the reader wrote is part of
    what the match is made against. For the declared pair it reads right -
    neither `glyph-tuning` nor `overlay-anchor` holds the word anywhere. A probe
    whose own name holds it does not: an `engagement-trace` added to
    `HARNESS_EXCLUSIONS` for importing no engagement reports every one of its
    lines as a mention, and the message names the file as naming the engagement
    when no line of it does. The guard's whole subject is text read off a file
    rather than text the reader supplied, which is the one property the composed
    string gives up.
  - **Goal**: filter on the probe's own line and compose the message afterwards,
    keeping the index - `.filter(...)` before `.map(...)`, or a filter over
    `line` with `i` carried - so what is matched is the line and nothing the
    reader added. `node --test test/probes.test.mjs` stays green, and the check
    that it still catches a mention is the one the changelog already records:
    add a comment naming the engagement to `test/probes/glyph-tuning.mjs`, see
    the case fail with the file and line named, and revert.
  - From: Code Review Override - the new guard's account of itself
- [x] Nothing reads `EXCLUSION_ACCOUNT`'s membership, which is why the same
  paragraph was omitted from it twice
  - **Issue**: the list at `test/probes.test.mjs:419-425` is hand-kept, and the
    case below it only holds the paragraphs that are *in* it. Nothing answers
    whether a paragraph stating the account is missing from it, so the omission
    has now happened in two consecutive versions: 0.16.8 wrote the list and left
    out `READING_DENIED`, which its own turn created, and 0.16.9 added
    `READING_DENIED` and left out `READING_AFFIRMED`, which its own turn created.
    Both were paragraphs written in the same turn as the edit to the list, and
    both state the reading in the same words as paragraphs already listed. This
    review fixed the second instance; the mechanism that produced both is
    untouched, and the next declaration whose docstring affirms the reading will
    be unread the same way. The published half is the same shape:
    `docs/development.html`'s third-reading paragraph enumerates the account
    member by member - "the declared pair, the import pattern, the function that
    decides, and the two sets of shapes it reads a denial and an affirmation
    by" - which 0.16.9 wrote in place of the count "the three paragraphs"
    precisely because a count goes stale when a paragraph joins. An enumeration
    goes stale the same way, and nothing reads it against the list.
  - **Goal**: pin the membership rather than the members. Read every top-level
    declaration's docstring with the `docstringAbove` the case already has, take
    the ones `readingAffirmations` answers for, and compare that set against
    `EXCLUSION_ACCOUNT` in both directions, so a new paragraph affirming the
    reading has to be listed and a listed one that stops affirming is named. The
    comparison answers exactly the five current members today, checked by
    reading every top-level declaration in the file, so the case is green as it
    stands. Decide and record the cost first: `docstringAbove`'s own docstring
    (`test/probes.test.mjs:427-434`) argues for bounding the read rather than
    running it over the whole file, and a future docstring that says "read off a
    source" about something else would be pulled in - either narrow what counts
    as the account's subject, or say in the docstring why the false positive is
    the cheaper half. Whichever is chosen, the `docs/development.html`
    enumeration wants pinning to the list or replacing with a sentence that no
    new member can falsify; `publishedExclusions` is the precedent for reading a
    sentence back out of that page by its shape.
  - From: Code Review Override - the account's membership, and the clone's
    changelog
- [x] `npm test` cannot pass in a fresh clone - `CHANGELOG.md` points at a file
  `.gitignore` keeps out of the repository
  - **Issue**: `CHANGELOG.md:3` reads "> 20 earlier entries in
    `CHANGELOG-2026.md`, newest first.", and `.gitignore:29` is
    `CHANGELOG-*.md`, so `git ls-tree HEAD` holds no such file.
    `test/changelog-roll.test.mjs`'s first case compares its pointers against
    the year files beside it with a `deepEqual` in both directions, so in a clone
    it reads one pointer and no file and fails: "CHANGELOG.md points at
    CHANGELOG-2026.md and the archives beside it are none". The second case
    already anticipates the clone - "A clone where the roll has never run has no
    archive, which is an ordinary state rather than a fault. The check above
    already holds it to having no pointer either" - but the pointer is in the
    tracked file, so the clone has the pointer without the archive. It passes
    here only because the working copy still holds the ignored file. Nothing in
    this turn caused it: `66e5131` ignored and untracked `CHANGELOG-*.md` and
    `TODO-archive.md` deliberately, and this turn only rewrote the pointer's
    figure from 19 to 20. `TODO.md`'s own pointer names `TODO-archive.md` the
    same way, and no test reads that one.
  - **Goal**: this is a decision rather than a repair, and it is the owner's.
    Three answers, and the item wants whichever they pick recorded wherever the
    reason belongs: track the archives again, which undoes `66e5131`; keep them
    ignored and stop publishing a pointer to them in a tracked file, which means
    the roll is the automation tool's behaviour and not this repository's to
    change; or keep both and have `test/changelog-roll.test.mjs` read a pointer
    whose file is absent as the ignored-archive state rather than as drift, which
    gives up the half of the check that catches a hand-edited pointer. Do not
    flip the `.gitignore` unattended - `66e5131` is the owner's own commit and
    says in its message what it was for.
  - From: Code Review Override - the account's membership, and the clone's
    changelog
