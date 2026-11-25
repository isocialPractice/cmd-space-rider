# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### Code Review Override - the account's membership, and the clone's changelog

#### Found Issues

- [ ] Nothing reads `EXCLUSION_ACCOUNT`'s membership, which is why the same
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
- [ ] `npm test` cannot pass in a fresh clone - `CHANGELOG.md` points at a file
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

> 224 earlier items in `TODO-archive.md`, newest last.

- [x] **Exclusion Provenance**: Harness Form Reader 2
  - **Issue**: `HARNESS_IMPORT`'s docstring (`test/probes.test.mjs:158-160`)
    says "test/probes/overlay-anchor.mjs's header says it 'imports nothing from
    test/engagement.mjs' - prose, unquoted, and no match". That probe's header
    never mentions `engagement.mjs`; grepping it for `engagement` returns
    nothing, and its imports are `node:fs`, `node:path`, `../helpers.mjs` and
    `../page-style.mjs`. The sentence quoted is this same test file's own
    `HARNESS_EXCLUSIONS` docstring at `test/probes.test.mjs:92-94`. The comment
    on the fixtures that pattern is pinned against
    (`test/probes.test.mjs:356-357`) carries the same error from the other side:
    "Both of these are real lines from probes" is true only of the second
    fixture, which is `test/probes/frame-rate.mjs:15`.
  - **Goal**: name the real source of the first fixture in both places - the
    `HARNESS_EXCLUSIONS` docstring in `test/probes.test.mjs`, not the probe -
    and narrow the fixture comment to the one line that does come from a probe.
    A reader sent to `overlay-anchor.mjs` to see the prose the pattern must not
    match finds no such prose, and may conclude the negative fixture is pinned
    by a probe file when nothing pins it at all.
  - From: UI/UX Override - the marker is no longer a test boundary
- [x] Rolled Changelog Pointer 1
  - **Issue**: `test/changelog-roll.test.mjs:13-14` states "`CHANGELOG-2026.md`
    holds 17 of 2026's 66 entries". It holds 18 of 67: `grep -c '^## \['` reads
    18 in the archive and 49 in `CHANGELOG.md`, and `CHANGELOG.md:3` says 18.
    The archive pass rolled `0.6.2-alpha` out later in the same turn, which the
    run's own log records watching ("the archive pass rolled one more entry and
    rewrote the pointer from 17 to 18 on its own"), so the header was left
    quoting a figure the turn had already seen move. That header is the file's
    argument for keeping the year name and it is made entirely out of counts, so
    a wrong count is the one thing in it a later reader cannot check against the
    file without finding the argument wrong too. The same figure was corrected
    in `CHANGELOG.md` by this review, which leaves the two disagreeing.
  - **Goal**: give the header a figure that cannot go stale, or state the count
    as of a named version rather than in the present tense. The surrounding
    argument does not need the exact number - "a fraction of 2026's entries"
    carries it - and the paragraph already explains why no file holds all of a
    year, which is the point the count was reached for.
  - From: UI/UX Override - the marker is no longer a test boundary
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
