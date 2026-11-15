# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### Code Review Override - the new guard's account of what it was shown

#### Resolve Issues

- [ ] Probe Sole Claim 4 - the new test says the repository carried a sentence it never held
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

#### Found Issues

- [ ] The new test pins which phrase of SHARED_BY_THE_PAIR matched, so reordering the list fails it
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

> 209 earlier items in `TODO-archive.md`, newest last.

- [x] Section Jolt Probe 1 - the docs call it the only probe reporting a rate
  - **Issue**: The new probe's published prose calls it the only probe that
    reports a rate, and three others do. `CHEATSHEET.md:186` and
    `docs/cheatsheet.html:84` say "`section-jolt` is the one probe that reports
    a rate", and `docs/development.html:57` says "`section-jolt` is the one that
    reports a rate" in a series with `drop-clip`'s "reports a time rather than a
    count" and `versus-half`'s "reports a width", which reads the claim as
    exclusive. `npm run probe -- column --count 3 --grid 80x24 --build terminal`
    prints a block the probe itself labels `rates:` and three percentages off
    it - "lone shot 60 to 140: 52/58 90%", "volley 98%", and "contact at 60 to
    140: 9/12 killed 75%". `seen-versus-kill` prints a kill rate per band and
    aim - 80%, 63%, 100% and 50% at `--count 2` - and the `AIMED_BANDS`
    docstring at `test/engagement.mjs:111` quotes `free-flight`'s own bands the
    same way, "lands 88% at 80x24, 93% at 60x20 and 67% at 205x50". So a reader
    sent to the one probe that reports a rate finds four, and the sentence meant
    to say what makes this probe unlike the others states something the rig
    disproves on request.
  - **Goal**: Name the property that is this probe's alone. What separates it is
    the shape of the walk and its subject rather than the kind of figure: it is
    the only probe whose rate is how often an event falls out of seeded worlds
    of a whole sequence, rather than a hit rate over staged placements, and the
    only one whose subject is the asteroid field rather than the pulse cannon.
    Rewrite the opening clause in all three files to that and leave the rest of
    each paragraph as it stands - every figure in them is correct, and the walk
    was re-run this review to confirm it. Leave the other probes' "the one
    that ..." sentences alone; each of those is true.
  - From: Measurement
- [x] **Probe Sole Claim**: The docs call the overlay probe the only one that flies nothing
  - **Issue**: `docs/development.html:54` says "`overlay-anchor` is the one
    that flies nothing", and `glyph-tuning` flies nothing by the same test.
    Neither probe names a grid or a build - both are `flags: []` in
    `test/probes/probes.mjs` - neither imports `test/engagement.mjs`, and
    `grep -n "startGame\|emptyRun\|freeFlight\|openAndClose\|walk(" ` over
    `test/probes/glyph-tuning.mjs` and `test/probes/overlay-anchor.mjs`
    returns nothing for either: each imports `loadBrowserEngine` only to read
    constants and functions off the page. The adjacent paragraph says as much
    about `glyph-tuning` itself - it "rebuilds the figures ... out of Courier
    New's `1229/2048` em advance and the page's own `glyphInset`" - so the
    counterexample is two paragraphs above the claim. This is the same defect
    class as `Section Jolt Probe 1`, found while checking that item's fix and
    left for a run of its own rather than widened into it.
  - **Goal**: Give `overlay-anchor` the property that is actually its own. What
    separates it from `glyph-tuning` is that it walks a space and counts
    outcomes over it - 682,500 viewports - where `glyph-tuning` derives figures
    and counts nothing, so "the one that walks a space without flying it" or
    similar is true of one and not the other. Check the replacement against all
    ten probes in `PROBES` before writing it, and re-check the other
    "the one that ..." sentences in `docs/development.html` and `CHEATSHEET.md`
    the same way: `drop-clip`'s "reports a time rather than a count" and
    `versus-half`'s "reports a width" were each read as plausible this review
    but not walked against every probe, and `versus-half`'s shares the ground
    `overlay-anchor` reports px bands over.
  - From: Code Review Override - the overlay probe is said to be the only one flying nothing
- [x] Probe Sole Claim 1 - the page's account of the fix names two paragraphs where it had one
  - **Issue**: `docs/development.html:35` now closes with "Three of the
    paragraphs below made exactly that claim until 0.16.1, two of them naming
    one of that pair as the only probe flying nothing while the other flew
    nothing beside it". One paragraph below made that claim, not two:
    `git show aed6a65:docs/development.html` - the page as it stood before
    this rewrite - carries exactly one, the `overlay-anchor` one at line 54,
    and `git grep -n "flies nothing" aed6a65` puts the second in the header of
    `test/probes/run.mjs` at line 17 - a source file, not a paragraph on this
    page. The three paragraphs below did
    each make a sole-possession claim, but they claimed measuring nothing,
    flying nothing and reporting a width, one apiece. A reader who goes
    looking on the page for the second flying-nothing paragraph the sentence
    promises will not find one, and the `CHANGELOG.md` entry for 0.16.1 gets
    this right in the same words, so the two disagree.
  - **Goal**: Say where the second claim actually lived. The page is free to
    name `test/probes/run.mjs` as the other half of the disagreement, which is
    what makes the fault worth describing at all - two files stating opposite
    sole possession of one property. Keep the count of paragraphs below at
    three and the count of flying-nothing claims on the page at one.
  - From: Code Review Override - the overlay probe is said to be the only one flying nothing
- [x] Probe Sole Claim 2 - the new test's docstring sits on the wrong constant and points at the wrong paragraph
  - **Issue**: Two defects in the comments the new test added to
    `test/probes.test.mjs`. First, the block at line 313 opening "The
    predicates that single out neither probe in HARNESS_EXCLUSIONS" documents
    `SHARED_BY_THE_PAIR`, but a second `/** */` block for `PUBLISHED` was
    written between it and the code, so the predicates docstring lands on
    `const PUBLISHED` - a list of three file paths - and
    `SHARED_BY_THE_PAIR` at line 344 is left with no docstring at all. Any
    reader or editor hovering `PUBLISHED` is told it is a list of predicates.
    Second, that same block ends "test/probes/run.mjs says so in those words
    two paragraphs above where it used to say the other thing": the words
    "Two load the browser alone" are in the paragraph at lines 8-15 and the
    claim it replaced was the paragraph at lines 17-26, so it is one paragraph
    above, and two paragraphs up is "A probe produces the figures ...", which
    says nothing about loading a browser.
  - **Goal**: Move the predicates block down so it sits immediately above
    `SHARED_BY_THE_PAIR`, leaving `PUBLISHED` with its own block, and correct
    the paragraph count to one. Neither edit changes what the test executes,
    so `npm test` staying at 973 of 973 is the whole check.
  - From: Code Review Override - the overlay probe is said to be the only one flying nothing
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
