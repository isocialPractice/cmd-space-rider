# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### Code Review Override - the new cases' accounts of themselves

#### Resolve Issues

- [ ] Harness Form Reader 1
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
- [ ] Harness Form Reader 2
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
- [ ] Rolled Changelog Pointer 1
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

> 218 earlier items in `TODO-archive.md`, newest last.

- [x] The roadmap's standing note still says the wiring below the canvas marker
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
- [x] **Harness Form Reader**: `callsHarness` reads one import form, and for the
  two declared exclusions a misread is not refused
  - **Issue**: `test/probes.test.mjs:146` decides whether a probe calls the
    harness with `/from '\.\.\/engagement\.mjs'/.test(src)`, which matches the
    static single-quoted import and nothing else. Checked in node against that
    exact pattern: `await import('../engagement.mjs')` reads `false`, and so
    does `from "../engagement.mjs"`. The two-direction `deepEqual` at
    `test/probes.test.mjs:265` catches a misread for the eight probes expected
    to call the harness - the probe drops out of `reached`, so `excluded` stops
    matching `HARNESS_EXCLUSIONS` and the message names it. It cannot catch one
    for `glyph-tuning` or `overlay-anchor`: a `false` there agrees with the
    declared list, `excluded` still equals `declared`, the suite stays at 974 of
    974, and that probe's harness calls are reached by nothing - `npm test`
    globs `test/*.test.mjs`, and this test is the only path in the suite that
    runs a probe at all. The dynamic form is not hypothetical in this folder:
    `test/probes/probes.mjs:22-31` loads every one of the ten probes with
    `import()`. This is the shape the file's own header is an argument against,
    and `callsHarness`'s docstring promises the opposite of it - "so a probe
    that starts calling it is covered without a line being added".
  - **Goal**: Decide a probe's harness use from something a quote style cannot
    move. Widening the pattern to the forms this repository can produce -
    `from` and `import(` against either quote - is the small answer and is
    enough. Whatever is chosen, give it a case that fails before the change and
    passes after, and take the source text as a parameter the way `claimsIn`
    already does at `test/probes.test.mjs:338` rather than by editing a probe:
    that is the same file's own precedent for reading a form the repository does
    not currently hold, and it is what lets all three forms be read in one case.
  - From: UI/UX Override - the marker is no longer a test boundary
- [x] The sole-claim reader accepts `constructor` as the name of a probe
  - **Issue**: `test/probes.test.mjs:477` asserts `probe in PROBES`, and `in`
    walks the prototype chain. `PROBES` is a plain object literal
    (`test/probes/probes.mjs:21`), so every `Object.prototype` key answers
    `true`, and the `([a-z][a-z-]+)` capture in `CLAIM_SHAPES` can produce
    exactly one of them - `constructor`, the rest carrying capitals or
    underscores. Checked in node: `'constructor' in PROBES` is `true` where
    `Object.hasOwn(PROBES, 'constructor')` is `false`, and the first shape reads
    `the constructor is the one that flies nothing.` as a claim naming
    `constructor`. So that sentence passes the assertion whose own message is
    "is not a probe", and the check written to catch a sentence outliving a
    renamed probe does not catch it. No file in `READ_FOR_CLAIMS` carries such a
    sentence today, so this costs nothing now; `test/probes/*.mjs` headers are
    in the read set and a constructor is an ordinary thing for one of them to
    name.
  - **Goal**: `Object.hasOwn(PROBES, probe)` in place of `probe in PROBES`. It
    is a guard nothing has been shown to catch anything until a case reads a
    sentence whose subject is an inherited key, which is the position the three
    fixtures above it were written from, so add one: `claimsIn` takes the text,
    so the sentence can be read on its own and the name it yields asserted
    against both forms - failing on `in` and passing on `hasOwn`.
  - From: UI/UX Override - the marker is no longer a test boundary
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
