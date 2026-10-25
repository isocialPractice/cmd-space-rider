# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

### Create and Deploy GitHub Pages Override

### Code Review Override - the result panel's glyphs nothing reads back

- [ ] Fourteen of the seventeen glyph escapes the split screen now writes are
  checked by nothing that reads them off the buffer
  - **Issue**: this turn rewrote 17 literal glyphs in `drawVersus`,
    `drawVersusResult` and `versusResultLines` as `\uXXXX` escapes, and the only
    property the edit could get wrong is which character each escape names.
    `test/versus.test.mjs` reads three of them back off the drawn buffer - the
    seam `║` at `:594` and `:844`, and the two corners a half opens with at
    `:601` and `:603`. Nothing reads the other fourteen: the rules and the hint
    row's `╠ ═ ╣` in `drawVersus` (`index.html:4330`, `:4339` to
    `:4341`), the whole eight-line frame of `drawVersusResult` (`:4367` to
    `:4379`), and the bullet in the two result lines (`:4292`, `:4293`). The
    panel's two cases check its text (`test/versus.test.mjs:716`) and that it
    stays on the grid (`:742`), and a box glyph changing moves neither - the
    bullet is not inside any asserted substring, and a wrong frame character is
    the same width as the right one. Name the state: write `┍` at `:4367`
    and `+` at `:4292` and `:4293`, and the panel draws a mismatched corner
    and a `+` where the bullet goes while `npm test` holds at 881 pass, 0 fail -
    measured, not inferred. The repository reads glyphs back off the buffer
    everywhere else it draws a frame (`test/leaderboard.test.mjs:882`,
    `test/menu-layout.test.mjs:138`, `test/browser-engine.test.mjs:596`), so the
    versus result panel is the one framed thing in either build with no such
    assertion.
  - **Goal**: Assert the result panel's frame and the bullet off the drawn
    buffer, the way `test/menu-layout.test.mjs:138` asserts a border row: the
    four corners and the two rules at the panel's own `x`, `y`, `w` and `h`, and
    `•` present in the scores line and the rematch line. `drawVersusResult`
    centres the panel, so derive the origin from the buffer rather than
    restating it. Browser only - the split screen has no terminal half, so
    nothing in `test/parity.test.mjs` pairs with it. The suite should come out
    above 881 with no existing case changed.
  - From: Code Review Override - the result panel's glyphs nothing reads back

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

> 168 earlier items in `TODO-archive.md`, newest last.

- [x] `test/probes/drop-clip.mjs` reached the rig and none of the published
  probe listings
  - **Issue**: the probe is wired correctly - `test/probes/probes.mjs` declares
    it and `test/probes.test.mjs` discovers it off its own source, so the suite
    runs it without a line being added. The published pages are the half that
    did not move. `docs/project-structure.html:33` to `:41` lists all nine other
    files in `test/probes/` by name with a one-line description each and omits
    this one, so the tree publishes a directory the repository no longer has.
    `docs/development.html:33` explains the flag as "the placement walk in
    `column`, `frame-rate` and `seen-versus-kill`, and the frame count in
    `free-flight`", and `CHEATSHEET.md:136` with its published copy
    `docs/cheatsheet.html:59` says the same; `drop-clip` reads `--count` as
    frames per figure and `--passes` as measurements of the pair, which its own
    header says at `test/probes/drop-clip.mjs:28`, so both enumerations are a
    probe short. Name the reader: someone working out what
    `npm run probe -- drop-clip --count 1` narrows finds the probe in neither
    list and the file in neither tree.
  - **Goal**: Add `drop-clip.mjs` to the tree in `docs/project-structure.html`
    in the shape the other nine use, and name it in the `--count` sentences in
    `docs/development.html` and `CHEATSHEET.md`. The cheatsheet's published copy
    has to move with the markdown, since `test/docs-site.test.mjs` reads every
    published page against the repository file it is published from. While in
    `docs/development.html`, close the blank line this release left at `:50`
    between the new `drop-clip` paragraph and the one after it - no other pair
    of paragraphs in that file carries one.
  - From: Code Review Override - the second clip, and the probe nothing published
- [x] Unshared Drop Clip 1 - two of the four reconciled passages state a bound
  the code does not support, and a symbol the pass they sit in does not have
  - **Issue**: Both are in the passages 0.11.4 rewrote, and both are the same
    paragraph read in two builds.

    First, `contacts`' new paragraph closes on "a bolt still painted a row away
    from it except on the play area's top row, where `bScr.row - 1 < gameTop`
    left the bolt one cell to begin with" (`src/game.ts:1607` and
    `index.html:2405`) - one exception, where `drawBullets`' paragraph in the
    same release lists three and the changelog entry lists the same three. The
    two it drops are both reachable. A bolt whose upper half has already left
    the corridor is one cell before any drop is involved: `tunnelSpan`'s
    `halfSpan` is `floor(3 + t * (center - 4))` with `t` climbing with the row
    (`src/types.ts:268`), so the span is narrower a row up and
    `inCorridor(col, row - 1)` can fail while `inCorridor(col, row)` holds -
    which is exactly the narrowing `drawBullets` says the two halves are tested
    separately for. And two drops a row apart in one column take both cells, a
    boss kill not producing that only because `dropBossPowerups` gives its
    three one `y` and one `z` (`src/game.ts:1239`). Name the reader: anyone
    bounding the exposure off the hit test's own docstring - which is where a
    reader asking what the hit test counts goes - concludes a drop can never
    leave the player nothing to see off the top row, which is the one thing
    this paragraph was rewritten to bound.

    Second, `drawBullets`' own paragraph names `bScr.row - 1 < gameTop` as what
    "left it one cell to begin with" (`src/render.ts:433` and
    `index.html:3001`). `bScr` is `contacts`' local (`src/game.ts:1699`,
    `index.html:2485`); `drawBullets` projects into `pos` and guards with
    `pos.row - 1 >= gameTop` (`src/render.ts:511`, `index.html:3070`), and
    `bScr` appears nowhere else in `src/render.ts`. The sentence is about what
    is painted, which is this pass, so the symbol a reader is sent to look for
    is not in the function or the file the docstring sits in. 0.11.4 corrected
    this same class of drift in `contacts`' comment - `tracerLit` where both
    builds read `tracerDrawn` - and introduced it in the renderer on the same
    turn.
  - **Goal**: Give `contacts`' paragraph the three cases `drawBullets` carries,
    or drop its `except` clause and point at `drawBullets` for the bound rather
    than naming a partial one - the second is the smaller edit and keeps one
    copy of the list. Name the draw pass's own guard in `drawBullets`'
    paragraph, `pos.row - 1 < gameTop`, in both builds. No behaviour change,
    and nothing in the suite reads either comment, so `npm test` staying at 843
    is the whole of the check.
  - From: Code Review Override - the second clip, and the probe nothing published
- [x] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.
  - From: Bigger Features
- [x] The split screen draws its box glyphs as literal characters where the rest
  of both builds writes `\uXXXX`
  - **Issue**: `drawVersus`, `drawVersusResult` and `versusResultLines` carry 17
    lines of literal non-ASCII - the frame corners and rules at
    `index.html:4329` to `:4345` and `:4367` to `:4379`, and the bullet in the
    two result lines at `:4292` and `:4293`. Before this turn `index.html` held
    no non-ASCII at all outside its comments: `drawHUD` writes `'╔'`,
    `drawFooter` `'╠'` and `nameEntryHint` `'•'`, and `src/render.ts`
    and `src/menu.ts` write the escape with the glyph in a trailing comment.
    Nothing fails today, since the page declares `charset="UTF-8"` and
    `.gitattributes` pins the endings, so this is drift rather than a defect -
    but it is total, and one function stating its glyphs a way no other function
    in either build does is what a later reader copies.
  - **Goal**: Write the 17 literals as the `\uXXXX` escapes the surrounding code
    uses, with the glyph in a trailing comment where `src/render.ts` does.
    `test/versus.test.mjs` already reads those glyphs back off the drawn buffer,
    so `npm test` holding at 881 is the check.
  - From: Code Review Override - the half-width figure and the renderer's bare glyphs
- [x] `VERSUS_MIN_HALF_WIDTH` and the published probe page put 42 columns at ten
  minutes, where the probe puts it at five
  - **Issue**: the docstring reads "40 holds the first thirty seconds, 42 holds
    out to about ten minutes, and 45 holds every mark to the end of the walk"
    (`index.html:4056`), and `docs/development.html:51` carries the same sentence
    word for word. `npm run probe -- versus-half` clears 42 at the 30s, 60s, 120s
    and 300s marks and wants 45 from 600s on, identically in both builds - so the
    ten minute mark is the first one 42 fails rather than the last one it holds,
    and five minutes is where it stops. Name the reader: anyone sizing a half off
    the comment concludes 42 columns carries a ten minute round, which is a round
    the probe says that width cannot read. The release note's copy of the
    sentence was corrected in place this turn, so the three copies now disagree
    with each other as well.
  - **Goal**: Say in both that 42 holds out to five minutes and that 45 is what
    the ten and twenty minute marks want, which is the wording `CHANGELOG.md`
    now carries. `docs/development.html` is published, so
    `test/docs-site.test.mjs` is what checks the edit lands; no measured figure
    moves and `npm test` holding at 881 is the rest of it.
  - From: Code Review Override - the half-width figure and the renderer's bare glyphs
