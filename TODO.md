# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### Code Review Override - the corrected docstring's new premise

#### Resolve Issues

- [ ] Exclusion Provenance 1 - the corrected docstring now says the exclusion
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

> 221 earlier items in `TODO-archive.md`, newest last.

- [x] **Rolled Changelog Pointer**: The rolled changelog is named for a year
  that does not partition it, and nothing reads the pointer
  - **Issue**: This turn moved the oldest 17 entries out of `CHANGELOG.md` into
    a new `CHANGELOG-2026.md` and left a pointer at `CHANGELOG.md:3` reading
    "17 earlier entries in `CHANGELOG-2026.md`, newest first". The move itself is
    clean - the 959 moved lines are byte for byte what `CHANGELOG.md` held at
    `dcf3db8`, and 49 released entries plus 17 account for all 66 - but the name
    says something the split does not do. Every entry in both files is dated
    2026: the new file holds `2026-02-08` and `2026-09-05` to `2026-09-21`,
    while `CHANGELOG.md` keeps `2026-09-22` to `2026-11-20`. So a file named for
    the year holds 17 of that year's 66 entries, a reader who finds it by its
    name and looks up `2026-10-15` meets a gap, and the scheme has no next step:
    the next roll moves more 2026 entries and there is no second year to name a
    file after. The repository's own precedent is `TODO-archive.md`, named for
    what it is rather than for a date and pointed at from `TODO.md` in this same
    shape. Nothing in `test/` reads either changelog, so neither the name nor
    the count in the pointer is pinned - a later roll can move entries and leave
    `17` behind with the suite green.
  - **Goal**: Rename to `CHANGELOG-archive.md`, which matches `TODO-archive.md`
    and what the new file's own header already says it is ("Entries rolled out
    of `CHANGELOG.md`"), or keep a year name and roll by year so the name is
    true. Say which was chosen and why in the note, since the next roll inherits
    it. Then pin the pointer: a case reading `CHANGELOG.md`'s pointer line
    against the `## [` headings in the file it names, so a roll that moves
    entries and leaves the count behind fails rather than publishing a figure
    nothing read. Decide the name first - the check has to name the file.
  - From: UI/UX Override - the marker is no longer a test boundary
- [x] The roadmap note says this turn changed one tracked file, and it changed
  the changelog in two places
  - **Issue**: `.claude/current.roadmap.md` line 17 reads "The one change to a
    tracked file is this turn's `## [Unreleased]` note in `CHANGELOG.md`". The
    same turn also rolled 17 entries out of `CHANGELOG.md` - 960 lines deleted
    from a tracked file - and created `CHANGELOG-2026.md`, which is neither
    ignored nor tracked yet and becomes a tracked file at the next commit. Both
    files carry the turn's own timestamp, so the roll was not a later edit the
    sentence predates. The cost is the same one this file has already shown
    today: it says of itself that it "is what the review requests are written
    from", and the stale marker bullet in **Where the work has been coming
    from** is why both of this turn's review requests were scoped on a claim
    that stopped being true at `1.0.0-alpha.0.15.3`. A run reading "one change"
    looks at one change.
  - **Goal**: Say both changes in **What this run did** - the `## [Unreleased]`
    note and the 17-entry roll with the file it went to. The canvas-marker
    bullet in the same file belongs to the first item under this header and is
    not this one's to rewrite.
  - From: UI/UX Override - the marker is no longer a test boundary
- [x] Harness Form Reader 1
  - **Issue**: the third block of `probes: a harness call is read whichever
    import form it is written in` (`test/probes.test.mjs:368-381`) asserts
    `callsHarness(name) === false` for each name in `HARNESS_EXCLUSIONS`, and
    its comment says that is "the one reading the assertions above cannot stand
    in for" because "nothing else in the file refuses it". Both halves are
    false. `test/probes.test.mjs:596-600` has asserted the same thing since
    before this turn -
    `pair.filter((name) => !callsHarness(name)).sort()` against `pair`, through
    the same function - and the two-direction `deepEqual` at
    `test/probes.test.mjs:301` is a third reader. Appending
    `import { BUILDS } from '../engagement.mjs';` to
    `test/probes/overlay-anchor.mjs` fails three cases, two of them pre-dating
    the new one. The misread the item was raised about - `callsHarness`
    answering `false` for a probe that does import the engagement - is caught by
    none of the three, including the new block: all three assert `false`, which
    is what a misread returns. What does catch it is the `forms` loop above the
    block, and that loop is the whole of the fix.
  - **Goal**: either drop the `HARNESS_EXCLUSIONS` block and say in the comment
    that the `forms` loop is what covers the declared pair, since a misread is a
    property of the pattern rather than of those two files; or keep it and
    rewrite the comment to what it does - a third reading of a condition two
    older assertions already hold, named as deliberate duplication rather than
    as the only reader. Do not leave the comment claiming sole coverage either
    way: a later reader deleting `test/probes.test.mjs:596-600` would be told by
    that comment that the new block stands in for it, and a reader deleting the
    new block would be told the opposite by nothing at all.
  - From: UI/UX Override - the marker is no longer a test boundary
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
