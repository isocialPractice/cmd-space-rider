# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.
  - From: Bigger Features
- [ ] **A probe for the glyph tuning's own figures** - the glyph tuning quotes
  six sets of numbers that only a scratch script can rebuild: the 96
  hinted-against-precise comparisons behind "the fractional position is
  honoured either way", the per-size table behind the inset's 0.099px to
  0.500px range and the `1229/2048` em advance it follows from, the junction
  levels behind "lifts the seam most where the slack is widest", the left
  bearing recorded beside `glyphInset` as a known limit at font 13 and font 8,
  the overhang past the cell that 0.8.4-alpha put in that same comment -
  `actualBoundingBoxRight` is a whole number never less than the cell at any
  size, and 0.299px to 1.200px past it once the inset is counted - and the ink
  widths of the four wall glyphs against their cells. That last one was
  published as "24 of 28 glyph-and-size pairs ink wider than their cell and
  four ink exactly it" and 0.8.3-alpha removed it: the walls are drawn from
  four glyphs at eleven sizes, which is 44 pairs, and 28 is those glyphs
  against the seven distinct cell widths the sizes produce. Ink width follows
  the advance rather than the cell, so the sixteen merged pairs are unmeasured
  rather than covered - fonts 8 and 7 share a 5px cell off advances of 4.801px
  and 4.201px. Re-taking it over all eleven sizes is the browser-only half of
  this item; the overlap conclusion it was quoted under does not depend on it,
  resting on the overhang past the cell, which was read at every size. The
  first set is from 0.8.1-alpha, four are from 0.8.2-alpha, which corrected the
  figures the first version of this item quoted, and the overhang is from
  0.8.4-alpha; every one of them was read in chromium and none is reproducible
  from the repository. The arithmetic half needs no browser and belongs beside
  the other probes; the rasterizer half needs chromium, which the project has
  so far declined, so this wants a decision on whether a browser probe lives
  here at all or whether the figure is quoted with its method and left
  unrebuildable. The pad release reading from 0.8.1-alpha has the same problem
  - `ArrowLeft` surviving a resting pad was measured against a patched copy of
  `index.html`, and nothing in the repository reproduces it.
  - From: Measurement

### UI/UX Override - the light palette's bright-and-base pairs

#### Found Issues

- [ ] Every chromatic bright colour is quieter than its base in light mode
  - **Issue**: A base-and-bright pair marks the live thing on a screen by
    drawing it in the bright index and its neighbours in the base one, which
    works only while the bright one reads louder against the page. Measured off
    `themePalette('light')` and `THEME_BG` in chromium as each ink's distance
    from its own paper, all six chromatic pairs invert: `CYAN`/`BRIGHT_CYAN`
    goes from 340/595 in dark to 547/484 in light, and
    `MAGENTA`/`BRIGHT_MAGENTA` from 340/595 to 507/380. Only `WHITE` and `GRAY`
    against `BRIGHT_WHITE` still hold, which are the two the `LIGHT_INK`
    comment says it inverts on purpose. Two drawing sites pair them: the live
    name slot's character in `renderNameEntry`, which is the faintest of the
    three for about half of every 1.047s blink period in light mode, and the
    selected row's prefix in `renderDebugMenu`. Neither loses its cursor - the
    bar under the live name slot beats the grey rule in both phases and both
    schemes, at 484 and 676 against 304 - so this is the character reading
    backwards rather than the marked thing going missing. Not a regression from
    the cursor blink fix: that change left the character's colour expression
    exactly as it was and only moved the blink onto the bar. Nothing in the
    suite compares two inks with each other, so the six pairs were published
    with nothing to catch them.
  - **Goal**: Resolve to [light-palette-bright-pair-order.prompt.md](.claude/prompts/light-palette-bright-pair-order.prompt.md)
  - From: UI/UX Override - the light palette's bright-and-base pairs

### Create and Deploy GitHub Pages Override

## Quick Wins

Small, self-contained changes that build on state and rendering the engine
already has. Most touch a single flag, key binding, or HUD field.

## Medium Effort

Features that add a new system to the engine: audio, new entity types, or a
second input path. Each one spans both the terminal and browser versions.

## Bigger Features

Substantial additions that change how a run plays or how the screen is laid
out. These carry the most risk to existing gameplay and are sequenced last.

- [ ] **Asteroid field variant** — Every few minutes, replace the tunnel walls with an open asteroid field section. No walls, but dense obstacles from all directions. Tunnel returns after 15 seconds.
- [ ] **Boss encounters** — Every 3 minutes, spawn a large mine that takes 20 hits, fires projectiles back at the player, and drops 3 powerups on destruction. Flash "WARNING" in the HUD before it arrives.
- [ ] **Multiplayer split-screen (browser)** — Divide the canvas into two halves. Player 1 uses WASD+Space, Player 2 uses IJKL+Enter. Shared tunnel, separate scores. Competitive survival.

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

- [ ] **A probe for the glyph tuning's own figures** - the glyph tuning quotes
  six sets of numbers that only a scratch script can rebuild: the 96
  hinted-against-precise comparisons behind "the fractional position is
  honoured either way", the per-size table behind the inset's 0.099px to
  0.500px range and the `1229/2048` em advance it follows from, the junction
  levels behind "lifts the seam most where the slack is widest", the left
  bearing recorded beside `glyphInset` as a known limit at font 13 and font 8,
  the overhang past the cell that 0.8.4-alpha put in that same comment -
  `actualBoundingBoxRight` is a whole number never less than the cell at any
  size, and 0.299px to 1.200px past it once the inset is counted - and the ink
  widths of the four wall glyphs against their cells. That last one was
  published as "24 of 28 glyph-and-size pairs ink wider than their cell and
  four ink exactly it" and 0.8.3-alpha removed it: the walls are drawn from
  four glyphs at eleven sizes, which is 44 pairs, and 28 is those glyphs
  against the seven distinct cell widths the sizes produce. Ink width follows
  the advance rather than the cell, so the sixteen merged pairs are unmeasured
  rather than covered - fonts 8 and 7 share a 5px cell off advances of 4.801px
  and 4.201px. Re-taking it over all eleven sizes is the browser-only half of
  this item; the overlap conclusion it was quoted under does not depend on it,
  resting on the overhang past the cell, which was read at every size. The
  first set is from 0.8.1-alpha, four are from 0.8.2-alpha, which corrected the
  figures the first version of this item quoted, and the overhang is from
  0.8.4-alpha; every one of them was read in chromium and none is reproducible
  from the repository. The arithmetic half needs no browser and belongs beside
  the other probes; the rasterizer half needs chromium, which the project has
  so far declined, so this wants a decision on whether a browser probe lives
  here at all or whether the figure is quoted with its method and left
  unrebuildable. The pad release reading from 0.8.1-alpha has the same problem
  - `ArrowLeft` surviving a resting pad was measured against a patched copy of
  `index.html`, and nothing in the repository reproduces it.

## Complete

Finished items, archived from `## Current` with the `From:` line recording
the roadmap section each one came from.

> 124 earlier items in `TODO-archive.md`, newest last.

- [x] The quarter-second terminal write is named as a sample the guard discards,
  and the guard does not reach it
  - **Issue**: The comment on the stall guard in `trackFrameRate`
    (`src/game.ts:223-230`) lists three examples of "a loop that stopped", the
    third being "a terminal write blocks for a quarter of a second at a time on a
    console that cannot keep up", and concludes "None of those says anything about
    how fast the device draws". The guard is
    `elapsed >= DETAIL_WINDOW_FRAMES * TARGET_FRAME_TIME`, which is 30 * (1/30) =
    1.000s exactly, so a 0.250s frame is not discarded - it is averaged in, and
    two of them in one window take the mean to 47.8ms against the 41.7ms drop
    threshold and cost a tier. The same sentence is published in
    `CHANGELOG.md:121-124`. `index.html`'s copy of the comment names only the
    backgrounded tab and the sleeping laptop, so the browser build does not carry
    the error. Nothing fails at runtime: a console blocking that long arguably
    should drop a tier. What is wrong is the claim that the guard covers it.
  - **Goal**: Decide which the guard is meant to do and make the two agree. Either
    drop the terminal-write example from the comment and the CHANGELOG, leaving
    the two cases the 1.000s cut-off does catch, or say plainly that a write that
    blocks under a second is counted and is meant to be. Do not lower the cut-off:
    `a loop that stopped is not a slow frame` pins that a device at 2 frames a
    second still has to be detected.
  - From: UI/UX Override - the three 0.9.0-alpha features in the browser
- [x] The ghost's frame-rate figure counts a repeated interval, and names the
  wrong longest frame
  - **Issue**: `CHANGELOG.md:69-71` publishes the parity of the ghost as flown
    "at five frame lengths from a sixtieth of a second to a twentieth". The test
    it cites, `the same recording is raced identically at every frame rate` in
    `test/replay-ghost.test.mjs`, flies a base of `FRAME` and then
    `[1/60, 1/20, 1/12, 0.05]` - and `0.05` is `1/20`, the same double, so the
    five entries are four distinct frame lengths: a sixtieth, a thirtieth, a
    twentieth and a twelfth. So the count is one high and the stated upper end is
    wrong in the direction that understates the test: the longest frame flown is
    a twelfth of a second, which is the stronger figure the sentence could have
    quoted. The duplicate also costs the test a case - one of its five slots
    re-checks a rate already covered.
  - **Goal**: Replace the duplicated `0.05` with a frame length the test does not
    already fly, and correct the CHANGELOG sentence to the count and range the
    list then holds. `samples go down a fixed tenth of a second apart` in the same
    file carries four distinct values already and wants no change.
  - From: UI/UX Override - the three 0.9.0-alpha features in the browser
- [x] The name entry hint is published as 52 columns and is 39
  - **Issue**: The doc comment on `nameEntryHint` opens "The long form is 52
    columns, which clears the documented 60-column minimum with room to spare",
    in `src/menu.ts:199-202` and in `index.html:2544-2546`. The string
    is `[ ↑↓ LETTER • ←→ SLOT • ENTER CONFIRM ]`, which is 39 characters. The
    conclusion holds and holds harder - 39 clears a 60-column grid's 56 columns of
    interior by more than the figure claims - but the number is wrong in both
    builds, and the one assertion near it,
    `the hint is the long form at every supported width`, bounds the length at 56
    rather than pinning it, so nothing would catch the figure drifting again.
  - **Goal**: Correct the figure to 39 in both copies of the comment, and tighten
    the assertion from `<= 56` to the exact length so the comment and the suite
    hold each other up.
  - From: UI/UX Override - the three 0.9.0-alpha features in the browser
- [x] `readGhost` promises a stale cursor cannot give a wrong answer, and it can
  - **Issue**: The doc comment on `readGhost` (`src/types.ts:764-768`, and the
    same comment above `index.html:833`) says the cursor "is only ever a hint: it is
    clamped into the recording and only ever moves forward, so a stale one costs a
    few comparisons rather than a wrong answer", and then that "a run starting over
    is handed back 0". Neither is true of the function. It only walks forward, so a
    cursor sitting ahead of `t` is never corrected: over a 21-sample path one
    second apart, `readGhost(path, 3, 999)` returns `{x: 20, cursor: 20}` where the
    answer at `t=3` is `x: 3`. And it never hands back 0 for a forward cursor - it
    is `startGame` that sets `ghostCursor = 0`, which is why nothing in the shipped
    game reaches this: the cursor only advances within a run and is reset before
    the next one reads it. `the cursor is a hint rather than an answer` in
    `test/replay-ghost.test.mjs` exercises the exact call and asserts only that it
    is non-null with `cursor === 20`, never the position, so the suite pins the
    behaviour the comment denies.
  - **Goal**: Pick one and make the other match. Either add the backward walk -
    `while (i > 0 && samples[i].t > t) i--;` - so the comment becomes true and the
    reading is correct from any cursor, which means updating that assertion in both
    builds and keeping `test/parity.test.mjs`'s cursor sweep green; or drop the two
    claims and say that the cursor must not run ahead of `t`, naming `resetRun` as
    what guarantees it. The first is the smaller surprise for the next caller.
  - From: UI/UX Override - the three 0.9.0-alpha features in the browser
- [x] Move the version into the nested pre-release form
  - **The core is doing the suffix's job.** `package.json` reads `0.9.0-alpha`,
    so the core climbs towards a release while the suffix says the project is
    not released. One of the two numbers should be moving and it is the wrong
    one.
  - **Write `1.0.0-alpha.0.9.0`.** The core becomes the release being worked
    towards and stops moving until the suffix is dropped; the old core moves
    into the suffix, where it keeps the record of how far the project has
    come. The inner triple then moves the way the core used to: a patch to
    `1.0.0-alpha.0.9.1`, a minor to `1.0.0-alpha.0.10.0`, a major to
    `1.0.0-alpha.1.0.0`. `### Version Schemes` in the automation instructions
    is the standing rule.
  - **This is not a release.** It re-expresses the version the project is
    already at, so it earns no step of its own. Items completed alongside it
    earn their step from the corrected form, in one entry under one version.
  - **Change it in `package.json` and in this run's `CHANGELOG.md` heading,
    and nowhere else.** This repository names its current release in several
    places that are not the version - an override heading, the `- From:` lines
    under it, a roadmap paragraph, a test log. Those are history and stay as
    they are. Rewriting an override heading or a `From:` line is the sharp
    one: the two have to match word for word, and editing one of the pair
    breaks the item in the middle of the run working it.
  - **Say in the entry why the version looks smaller than yesterday's.** The
    new version sorts below the last one published, and a reader who meets
    that with no explanation beside it goes looking for a mistake. Name the
    old form and the new one, and say the switch was deliberate.
  - **Leave the three existing tags alone.** They record releases that
    happened. Do not delete one, do not move one, and do not re-tag to make
    the ordering look right - the next releases pass them.
  - **Two traps.** `1.0.0-alpha.0.09.0` is not valid semver, so nothing pads
    an identifier and nothing tidies one. And `npm version patch` is the
    wrong command here: it strips the pre-release and yields a bare `1.0.0`.
    Only the last identifier has a command at all, `npm version prerelease`;
    an inner minor or major is a hand edit.
  - From: Version Scheme Override - re-express the pre-release before the next bump
