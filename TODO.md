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

### UI/UX Override - the re-inked light brights

#### Found Issues

- [ ] Nothing pins how close two inks drawn on one screen may sit
  - **Issue**: The six re-inked brights all read correctly - the name entry
    screen, the debug menu's selected row, the tunnel, the ship, the HUD, the
    obstacles, the orbs and both flashes were driven in chromium under an
    emulated light scheme and every observation the release asked for holds.
    What also happened, unmeasured, is that light mode's inks closed up.
    Measured as channel distance over every index `index.html` draws with -
    all of `LIGHT_INK` bar `DARK_GREEN` and `DARK_CYAN`, which no drawing site
    reaches for - the six tightest light pairs are now 49, 52, 53, 56, 56 and
    58, against 75, 85, 170, 170, 170 and 170 in dark. Five of the six involve
    a bright this release moved, and each was two to four times wider before
    it: `BLUE`/`BRIGHT_BLUE` 127 to 52, `BRIGHT_CYAN`/`DARK_BLUE` 175 to 53,
    `BRIGHT_GREEN`/`BRIGHT_CYAN` 114 to 56, `BRIGHT_BLUE`/`DARK_BLUE` 215 to
    56, `BRIGHT_GREEN`/`BRIGHT_WHITE` 152 to 58. The sixth, `BRIGHT_WHITE`
    against `DARK_BLUE` at 49, moved neither ink and is the pre-existing floor.
    None of this is a defect today: the tightest pair was read off the canvas
    on the name entry screen, where the hint line is `BRIGHT_GREEN` and the
    active slot blinks through `BRIGHT_WHITE`, and came back `#7d9381` against
    `#727276`, 55 apart as painted, both clearing the paper at 13.15:1 and
    16.98:1. The gap is that nothing can see it. `light mode keeps a bright ink
    louder than its base` compares an ink with its paper; no test compares two
    inks with each other, so the next re-inking can close one of these margins
    to nothing and the suite will pass. The margin is a third of what it was
    and it was not chosen - it fell out.
  - **Goal**: Resolve to [light-ink-separation-floor.prompt.md](.claude/prompts/light-ink-separation-floor.prompt.md)
  - From: UI/UX Override - the re-inked light brights

### Code Review Override - the band that counts a short return, and the weights nothing holds

#### Resolve Issues

- [ ] Return Frame Sample 3
  - **Issue**: Bounding the post-stall discard to a band on the discarded
    sample closed the alternating-stall hole and reopened the one the discard
    was written for. A post-stall sample under the band floor is now counted,
    and one sample carries a window of thirty on its own past about 283ms -
    twenty-nine frames at the target are 966.7ms against the 1250ms a 41.7ms
    mean needs - so a return fragment from roughly 290ms to just under 650ms
    costs a tier in both builds. Fed three frames at the 1.000s cut-off, then
    one fragment, then thirty at the target: 0.283 leaves `detail` at 0, 0.29
    through 0.64 take it to 1, and 0.65 and up are discarded and leave it at 0.
    That is the outcome the comment above the guard still names as the thing it
    prevents, in both builds - "the player looks at another tab and comes back
    to a thinner starfield" - and before this release no fragment length could
    produce it. The same comment argues both sides: the band is cut from three
    fragments measured at 650ms, 750ms and 850ms and reads 650ms as their floor,
    two sentences after saying the return "lands anywhere in the interval",
    which puts over a third of all returns inside the band's own gap. Nothing in
    the suite feeds a short fragment after a stall, so the case is invisible -
    the one fragment `the partial frame on the way back from a stall is not a
    sample either` tries is 0.7s, which the band discards.
  - **Goal**: Resolve to [stall-return-band-counts-a-short-return.prompt.md](.claude/prompts/stall-return-band-counts-a-short-return.prompt.md)
  - From: Polish

#### Found Issues

- [ ] One contrast figure is a heading weight in one file and a strong-text
  weight in two others
  - **Issue**: `#00343a` at 12.10:1 is the reason the site stopped quoting
    `LIGHT_INK[14]`, and the three files that record the decision describe its
    weight two different ways. `docs/assets/style.css:53` calls it "a heading
    weight rather than a rule weight"; `DESIGN_LANGUAGE.md:85` and
    `CHANGELOG.md:119` both call it "a strong-text weight". The design file's own
    light table is the authority and puts headings at 7.52:1 and strong text at
    16.98:1, so 12.10:1 is between its two named rows and matches neither - 4.58
    above the heading figure and 4.88 below the strong-text one. A reader
    checking either sentence against the table finds the other sentence
    contradicting it, and the one thing both are trying to say, that the index is
    far too heavy for a rule, is the part neither needs a weight name for.
  - **Goal**: Say the same thing in all three places, measured rather than
    labelled: the index is 12.10:1 where the rule it replaced was 4.88:1, which
    is two and a half times the weight the prose was ruled at and above the
    7.85:1 the body text is set in. Drop the comparison to a named role, or name
    the two rows it sits between rather than picking one.
  - From: Code Review Override - the band that counts a short return, and the weights nothing holds
- [ ] Nothing holds the site's light teal apart from the game's re-inked index
  - **Issue**: The release decided, in three documents, that
    `docs/assets/style.css` keeps `--link` and `--rule` at the site teal
    `#00757f` and no longer tracks `LIGHT_INK[14]`, while `--ship-hull` and
    `--ship-wing` do follow the game to `#00343a` and `#04116e`. Both halves of
    that are deliberate and neither is asserted anywhere.
    `test/docs-site.test.mjs` reads the stylesheet through `styleSheet` and pins
    a great deal of geometry, and makes no colour assertion at all, so a later
    run that re-reads `DESIGN_LANGUAGE.md`'s opening claim - "Nothing here was
    invented for the site: ... the light theme is the game's own re-inking of
    it" - can re-sync the two properties to the game in one edit, take every
    rule and cell border on ten pages to 12.10:1, and the suite will pass. This
    is the shape of the defect the same release fixed in the palette: the entry
    says six inverted pairs shipped because "nothing in the suite compared two
    inks with each other", and the divergence written on the way out is held by
    nothing either.
  - **Goal**: Pin the pair of facts the release decided, in
    `test/docs-site.test.mjs`, against `loadBrowserEngine`'s own `LIGHT_INK`
    rather than against a table of hex values: that the light `--link` and
    `--rule` are not `LIGHT_INK[14]`, and that `--ship-hull`, `--ship-wing` and
    `--ship-engine` are `LIGHT_INK[14]`, `[12]` and `[6]`. The dark block tracks
    the base palette the same way and can be pinned in the same walk.
  - From: Code Review Override - the band that counts a short return, and the weights nothing holds
- [ ] `NEON_MAGENTA` is the one drawn index the light re-inking left behind
  - **Issue**: The re-inking took the six chromatic bright indices below their
    base ones and left the named neons where they were, and one of those neons
    is drawn. `WARP_WALLS` (`src/render.ts:85`, `index.html:2001`) carries the
    tunnel across for a warp, and its second rung is `BLUE` to `NEON_MAGENTA`
    while the two above it are `BRIGHT_BLUE` and `CYAN` to `BRIGHT_MAGENTA`.
    `BRIGHT_MAGENTA` moved from `#a81a9a` to `#3d0839` and `NEON_MAGENTA` did
    not, so the light warp ramp, far to near, is now 507, 393, 602, 602 and 676
    in channel distance from the paper against 340, 510, 595, 595 and 765 in
    dark: the rung one step in from the far wall reads 114 quieter than the far
    wall itself and 209 quieter than the rung above it, where dark climbs the
    whole way. The ramp did dip here before the release, at 507, 393, 380, 380
    and 676, so this is an index left behind rather than a new inversion - but
    the jump off it is two and a half times the widest step dark takes. The new
    test is scoped to base-and-bright pairs and `NEON_MAGENTA` is in none, so
    the comment's claim that it "pins the ordering for every pair the game draws
    with" is true and still leaves the only live neon unchecked. The comment
    above the neons in `LIGHT_INK` (`index.html:246`) reads "each to the same
    value as the base colour it echoes", which was already not so - `#a3129a`
    against `MAGENTA` at `#6b0f63` - and is now wrong by 114.
  - **Goal**: Decide what the light value of a drawn neon is for, and make the
    comment say it. If the neons are meant to sit above the bright index they
    echo, `201` wants a value below `#3d0839`'s 602 and the warp ramp climbs in
    both schemes; if they are a mid-tone on purpose, say that instead of "the
    same value as the base colour it echoes", and say which rung of the warp
    ramp is allowed to read quieter than the one behind it. Either way the walk
    wants widening past base-and-bright pairs to the ramps the renderer actually
    orders - `WARP_WALLS` is a five-rung table that can be read straight out of
    both builds. `NEON_CYAN`, `NEON_GREEN`, `NEON_RED` and `ORANGE` are in `C`
    and drawn nowhere in either build, which is a separate question and not this
    one.
  - From: Code Review Override - the band that counts a short return, and the weights nothing holds

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

> 127 earlier items in `TODO-archive.md`, newest last.

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
- [x] Every chromatic bright colour is quieter than its base in light mode
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
- [x] The stall test's comment counts a window of twenty-nine as one that closes
  - **Issue**: `test/performance-mode.test.mjs:313-316` explains why the healthy
    run in `a loop that stopped is not a slow frame` is now fed
    `DETAIL_WINDOW_FRAMES + 1` frames, and closes "so thirty frames after a
    stall close a window of twenty-nine". A window of twenty-nine is precisely
    the window that does not close: `DETAIL_WINDOW_FRAMES` is 30 and
    `trackFrameRate` returns at `s.frameSeen < DETAIL_WINDOW_FRAMES`, so thirty
    frames after a stall leave the window one sample short and decide nothing.
    The sentence states the reverse of the fact it was written to record, and it
    is the only place the extra frame in the call above it is explained, so a
    reader reconciling the two is sent to the wrong conclusion about which
    number closes a window. Nothing fails: the test feeds 31 and the assertion
    on `frameSeen === 0` is the thing that actually proves the window closed.
  - **Goal**: Say what the thirty frames do rather than what they close - that
    the sample straddling the return is discarded, so thirty frames after a
    stall fill only twenty-nine of the window and a thirty-first is what closes
    it. The comment on the same point in the test below it, at
    `test/performance-mode.test.mjs:331-339`, is correct and wants no change.
  - From: UI/UX Override - the light palette's bright-and-base pairs
- [x] Return Frame Sample 2
  - **Issue**: The discard that was added for the frame ending a stall
    (`src/game.ts:258-261`, `index.html:1059`) throws out the first sample after
    any sample at or over the cut-off, and a run whose frame times alternate
    one-for-one across that cut-off therefore contributes no samples at all -
    every long frame arms the flag and every short one is spent clearing it, so
    `frameSeen` never leaves 0 and the ladder never moves in either direction.
    Fed straight into `trackFrameRate` on a live run, 300 pairs of
    `(1.5, 0.2)` leave `frameSeen` at 0 and `detail` at 0 in both builds; so do
    `(1.1, 0.6)`, `(1.01, 0.99)` and `(2.0, 0.05)`. Before the discard the short
    half of such a run was counted, and thirty of the 0.2s samples closed a
    window at a 200ms mean against the 41.7ms drop threshold and cost a tier.
    The hole needs a strict alternation and closes as soon as two short frames
    fall together - `(1.1, 0.6, 0.6)` still reaches the floor tier - which is
    also why the comment's own claim is not false: it is scoped to "a device
    genuinely at two frames a second", and that device is a run of short samples
    rather than every other one. What is new is that a loop stalling on every
    other frame now reads as a device with no measurable frame rate instead of
    as a slow one. A consistently slow device is untouched: 60 samples at 0.9s
    still reach the floor tier.
  - **Goal**: Decide what the discard is allowed to throw out and bound it to
    that. The straddling frame it was written for is a fragment of a withheld
    interval and was measured at 650ms to 850ms, which is most of the cut-off,
    while the samples the alternation loses are ordinary frames at 0.05s to
    0.6s - so a band on the discarded sample rather than a flag on its
    predecessor would separate the two, and picking that band is a measurement
    this turn could not take. Anything chosen has to keep the three assertions
    in `the partial frame on the way back from a stall is not a sample either`
    green, and must not lower the whole-window cut-off, which
    `a loop that stopped is not a slow frame` pins. A case for the alternating
    run belongs beside them either way, since nothing in the suite feeds two
    frame lengths in turn.
  - From: Polish
