# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### UI/UX Override - the marker is no longer a test boundary

#### Found Issues

- [ ] The roadmap's standing note still says the wiring below the canvas marker
  is executed by nothing
  - **Issue**: `.claude/current.roadmap.md` lines 81-86 say that below
    `// ===== Canvas Setup & Sizing =====` the frame loop's `versusRematch`
    call, the two `new VersusRound(..., game.state.muted)` openings, the gamepad
    poll and the resize "are only read as source text", and that "a green suite
    is not evidence about any line down there". That stopped being true at
    `1.0.0-alpha.0.15.3`, when `test/browser-wiring.test.mjs` landed:
    `loadBrowserPage` evaluates the whole inline script against a stub DOM and
    drives the frame loop off a manual rAF pump. Its 33 cases cover every line
    the note names - `the rematch carries the mute, and so does the rematch
    after that`, `M inside a round moves both pilots`, `a resize re-seats both
    halves of a round on the new grid`, `in the 60-to-90 column band the grid
    fits and a round does not`, two pad cases, and `?versus` at lines 891 and
    896 - and all 33 pass. `test/helpers.mjs` says it outright: "loadBrowserPage
    runs the same region, which is the reading of what it *does*". The note says
    of itself that it "is what the review requests are written from", so both
    `.claude/full-review.request` and `.claude/ui-ux-test.request` for 11-21-26
    carried the stale claim and scoped this review on it. A browser pass on
    11-21-26 found no defect below the marker in 308 assertions, so nothing is
    broken - what is wrong is the reason the scope was written from.
  - **Goal**: Rewrite that bullet to what is now true. The region is executed by
    `test/browser-wiring.test.mjs` against a stub DOM; what stays outside the
    suite is only what a stub cannot take - the painted pixels and real pointer
    plumbing, which `test/helpers.mjs` already names, plus the real CSS cascade
    that solves `--ctl` against `--playpx`, real resize events, and a physical
    gamepad. Keep 0.13.0, 0.13.1 and 0.13.2 as the reason that harness exists
    rather than as evidence the lines are unrun.
  - From: UI/UX Override - the marker is no longer a test boundary

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

> 213 earlier items in `TODO-archive.md`, newest last.

- [x] Probe Sole Claim 3 - the new test guards the published docs and not the source file that carried half the fault
  - **Issue**: The fault this item was opened for was two files claiming
    opposite sole possession of flying nothing, one of them the header of
    `test/probes/run.mjs`. `PUBLISHED` in `test/probes.test.mjs:342` lists
    `docs/development.html`, `CHEATSHEET.md` and `docs/cheatsheet.html` only,
    so restoring "glyph-tuning is also the one probe that flies nothing" to
    that header passes `npm test` - verified by restoring it to
    `docs/development.html` instead, which does fail the test with the pair
    named, so the guard works and simply does not reach the other half. The
    predicate pattern is narrow in the same direction: it requires the
    predicate to open on `that` or `whose`, so "`glyph-tuning` is the one
    probe flying nothing" is not read as a claim at all.
  - **Goal**: Read the rig's own source comments beside the published files -
    `test/probes/run.mjs` at least, and each probe's own header is the same
    kind of sentence - and widen the predicate shape so a claim phrased
    without `that` or `whose` is still matched. Both halves want a case that
    fails before the change and passes after, since a guard nothing has been
    shown to catch anything is the position this item started from.
  - From: Code Review Override - the overlay probe is said to be the only one flying nothing
- [x] Probe Sole Claim 4 - the new test says the repository carried a sentence it never held
  - **Issue**: The comment opening `probes: the sole-claim reader catches the
    shapes that got past it` reads, at `test/probes.test.mjs:481`, "These are
    the three sentences the repository actually carried, read on their own, and
    what became of each before 0.16.2" - and the third of the three was never
    in any file here. `git log --all -S"probe flying nothing"` puts that string
    in `TODO.md`, where the review that queued `Probe Sole Claim 3` coined it as
    the shape the old pattern would miss, and in `docs/development.html` at
    `d79ea2a` inside a different sentence, "two of them naming one of that pair
    as the only probe flying nothing", which is the page's account of the 0.16.1
    fix rather than a claim of sole possession about a probe. No file ever held
    `glyph-tuning is the one probe flying nothing`. The bullet at
    `test/probes.test.mjs:488` then says the participle form "got past on the
    pattern alone", in the same past tense as the two sentences that really did
    get past, so a reader is told a third defect shipped and was corrected and
    is sent into the history after it. The 0.16.2 `CHANGELOG.md` entry made the
    same claim and was corrected in place by this review, so the comment and the
    release note now disagree.
  - **Goal**: Say that two of the three were carried and that the third is the
    shape the second pattern was added for; the `### Added` entry for 0.16.2
    carries that wording already and can be borrowed from. Keep all three
    fixtures - the participle one is the only case pinning the shape that was
    widened, and its worth does not rest on the repository ever having held it.
    Nothing executes the comment, so `npm test` staying at 974 of 974 is the
    whole check.
  - From: Code Review Override - the overlay probe is said to be the only one flying nothing
- [x] The new test pins which phrase of SHARED_BY_THE_PAIR matched, so reordering the list fails it
  - **Issue**: `test/probes.test.mjs:534` asserts that
    `SHARED_BY_THE_PAIR.find((phrase) => claims[0].property.includes(phrase))`
    equals the fixture's own `shared` string, and `find` answers in array order
    over phrases that are prefixes of one another. The third fixture expects
    `flying nothing`, which wins only because `flying no` is written after it in
    the list. Sorting `SHARED_BY_THE_PAIR` alphabetically - the obvious thing to
    do to an 18-entry list - puts `flying no` first, and that fixture then fails
    with the guard itself working exactly as before: the main check reads the
    same `find` only for its message and asserts on `!shared`, so order cannot
    reach it. What the fixture is standing in for, that the participle
    inflection is in the list at all, does not depend on order either.
  - **Goal**: Split the assertion into the two things it means - that
    `SHARED_BY_THE_PAIR` carries `shared`, and that the property read out of the
    sentence matches some phrase in the list - both of which hold whatever order
    the list is in. The three fixtures are the check, so `npm test` staying at
    974 of 974 covers it.
  - From: Code Review Override - the new guard's account of what it was shown
- [x] The suite reads SHARED_BY_THE_PAIR in the order it is written and in no other
  - **Issue**: 0.16.3 exists because the three fixtures in `probes: the
    sole-claim reader catches the shapes that got past it` pinned which phrase
    of `SHARED_BY_THE_PAIR` matched, and its `CHANGELOG.md` entry closes by
    saying the suite "passes with the list sorted alphabetically". Nothing in
    `test/` reads that list in any order but the one it is written in at
    `test/probes.test.mjs:410`, so the release note is the only record of the
    property and no run checks it. Putting the pre-0.16.3 assertion back in
    place of `test/probes.test.mjs:565` - `assert.equal(SHARED_BY_THE_PAIR
    .find((phrase) => claims[0].property.includes(phrase)), shared, ...)` -
    leaves `npm test` at 974 of 974 on the list as written, and fails all
    three fixtures the moment anybody sorts it, the published fixture first:
    verified this review by doing both. That is the state 0.16.2 shipped in
    and the state this release was cut to leave, and the suite cannot tell the
    two apart. The file's own standard is the opposite - the fixtures exist
    because "a guard nothing has been shown to catch anything" was the
    position the item behind them started from, and order-freedom is now in
    exactly that position.
  - **Goal**: Read the three fixtures against a reordered copy of the list as
    well as the written one, so an assertion consulting a position rather than
    a phrase fails on the spot. `[...SHARED_BY_THE_PAIR].sort()` is the
    ordering that broke them and is the one to read; reversed is a cheap
    second. The loop over `sentences` already carries everything needed - what
    wants deciding is whether the ordering becomes a parameter of that loop or
    a case beside it, and either is fine as long as the sorted order is one of
    the orders read. Verify it the way 0.16.3 was verified by hand: with the
    `find` form restored the new case must fail, and with the shipped form it
    must pass. The suite goes to 975 or stays at 974 depending on which shape
    is chosen; say which in the release note rather than quoting a count that
    does not match.
  - From: Code Review Override - nothing exercises the order-freedom 0.16.3 claims
- [x] Two of the three phrase orders can coincide without the guard refusing it
  - **Issue**: `test/probes.test.mjs:558-571` asserts that each of
    `sorted alphabetically` and `reversed` is a permutation of
    `SHARED_BY_THE_PAIR` and differs from the list as written, but never
    compares the two orders against each other. The comment it sits under at
    line 552 says "Each order has to be a different order", and that is more
    than the four assertions enforce. The state that gets past them: a later
    edit that writes the list out in reverse-alphabetical order leaves
    `[...written].sort()` and `[...written].reverse()` holding the identical
    array, because reversing an already reverse-sorted list sorts it. Both
    still differ from `as written`, so all four assertions pass while the loop
    over `sentences` reads two identical orders where the comment promises
    three different ones. Verified this review by building that list in node:
    `sorted === reversed` with both still unequal to the list as written. The
    harness still catches the pre-0.16.3 `find` form in that state, `as written`
    and the coinciding pair being two distinct orders, so what this costs is
    the redundant third order rather than the order-freedom itself - which is
    why it is queued rather than fixed.
  - **Goal**: Compare each order against the orders before it rather than only
    against `as written`. A nested loop over `PHRASE_ORDERS` indices, or an
    assertion that the number of distinct serialized orders equals
    `PHRASE_ORDERS.length`, is enough; the message wants to name the two orders
    that coincide, since the edit that causes it is a rewrite of the list rather
    than a change to `PHRASE_ORDERS`. Verify it by hand the way 0.16.4 was: with
    `SHARED_BY_THE_PAIR` written out in reverse-alphabetical order the new
    assertion must fail, and with the list as it stands it must pass, the suite
    staying at 974 of 974. The `CHANGELOG.md` 0.16.4 entry was corrected this
    review to claim only what the four assertions check, so once the comparison
    exists both it and the comment at line 552 can state the stronger guarantee.
  - From: Code Review Override - the order guard never compares the orders against each other
