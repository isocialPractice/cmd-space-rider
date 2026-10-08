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

### UI/UX Override - the three 0.9.0-alpha features in the browser

#### Resolve Issues

- [ ] Entry Cursor Blink 1
  - **Issue**: The blink on the name entry screen is carried by the character in
    the slot rather than by the bar under it, so a slot holding a space has no
    blinking cursor at all. `renderNameEntry` draws the bar as a constant `▀` in
    a constant `BRIGHT_CYAN` and alternates only the character's foreground
    between `BRIGHT_WHITE` and `BRIGHT_CYAN`; `ScreenBuffer.render` skips a cell
    whose character is a space, so that alternating colour paints nothing.
    Measured off `ctx.getImageData` over the live canvas in chromium, sampling
    the cursor's glyph cell and the bar cell every 50ms for 1.6s - more than one
    full period of `sin(uiTime*6)` - a slot holding a letter produced 2 distinct
    paintings and a slot holding a space produced 1. The active slot is still
    identifiable, since its bright cyan `▀` differs from the grey `─` under the
    other two, so this is a missing blink rather than a missing cursor; but the
    screen stops moving entirely while the cursor sits on a space, which is the
    case the comment above `renderNameEntry` says the bar exists for. The suite
    cannot see it: `a space in a slot is still a slot the player can see` in
    `test/leaderboard.test.mjs` asserts the `▀` and `─` are drawn and never
    advances the clock. Everything else on the screen verified clean, including
    the alphabet walk and its wrap, the clamp at both ends, `W`/`S`/`A`/`D`, and
    the `ENTER` that files a name without relaunching the run.
  - **Goal**: Resolve to [name-entry-cursor-blink.prompt.md](.claude/prompts/name-entry-cursor-blink.prompt.md)
  - From: Bigger Features
- [ ] Return Frame Sample 1
  - **Issue**: Coming back to the tab mid-run costs a detail tier, which is the
    specific thing the guard in `trackFrameRate` was written to prevent. Verified
    in a headed chromium, since a headless one never withholds frames from a
    backgrounded page. Three spells away from a run at the fullest tier - 4s, 9s
    and 15s - each stepped the ladder `0->1` and then back `1->0`, putting the
    grey `REDUCED` badge on the status strip for 1.00s every time. The guard
    itself works: all 25 of the ~1016ms gaps a throttled background tab produced
    were discarded by `elapsed>=DETAIL_WINDOW_FRAMES*TARGET_FRAME_TIME`. What it
    misses is the last gap, the partial throttle interval straddling the return,
    measured at 650ms, 750ms and 850ms across the three spells. Each is under the
    1.000s cut-off and so is accepted, and one such sample carries a 30-frame
    window on its own: 650ms gives a window mean of 53.9ms, 750ms gives 57.2ms
    and 850ms gives 60.6ms, against a 41.7ms drop threshold. The return gap falls
    anywhere in the throttle interval, so this is near-deterministic rather than
    a race. `a loop that stopped is not a slow frame` in
    `test/performance-mode.test.mjs` covers a 4s stall and a sustained 30 frames
    at 0.5s, and nothing between: a single sample in the band from 41.7ms to
    1.000s is the whole of this defect. That second case also means the cut-off
    cannot simply be lowered, or a device genuinely at 2 frames a second stops
    being detected.
  - **Goal**: Resolve to [detail-ladder-return-frame.prompt.md](.claude/prompts/detail-ladder-return-frame.prompt.md)
  - From: Polish

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

> 116 earlier items in `TODO-archive.md`, newest last.

- [x] The three glyphs that reach left of their origin are not the three shade
  blocks
  - **Issue**: Five places say "the three shade blocks each reach a whole pixel
    left of the origin they are drawn at" - `index.html:286-291` and
    `CHANGELOG.md:26-29`, both written this turn, and `index.html:325-327`,
    `CHANGELOG.md:128` and `CHANGELOG.md:171`, which are older. Measured off
    `actualBoundingBoxLeft` in chromium at every size `fitGrid` can settle on,
    the light shade `░` reads 0.0000 at all eleven, while `▒`, `▓` and the full
    block `█` read 1.0000 at all eleven. So the set of three that reach left is
    `▒ ▓ █`, not the three shades, and the sentence both names a glyph that does
    not qualify and omits the one outside its category that does. Corroborated
    off the grid rather than only the metrics: rendering four inked cells with an
    empty cell either side inks the column left of the run at font 13 and font 8
    only, and there only for `▒`, `▓` and `█`, never for `░` at any size - which
    is the same two-size limit `glyphInset`'s doc comment already records.
    `index.html:325-327` is the worst of the five, because the sentence after it
    cites "a run of the full block" as the case that bleeds, contradicting the
    category its own paragraph opens with. The repository already holds the
    correct reading: the completed item "A run of block glyphs still inks the
    column left of its first cell at the two sizes with the smallest inset", in
    `## Complete`, names `▒`, `▓` and `█`.
  - **Goal**: Resolve to [shade-block-left-bearing.prompt.md](.claude/prompts/shade-block-left-bearing.prompt.md)
  - From: UI/UX Override - the figures the overlap sentence states
- [x] Nothing in the suite pins the four glyphs every wall figure is counted from
  - **Issue**: The figures in the `glyphInset` comment are all built on the walls
    being drawn from four characters - 44 glyph-and-size pairs is four by eleven,
    28 is four by seven, and the left bearing and the overlap are both stated per
    glyph. `drawTunnel` picks that character from a four-branch depth ramp at
    `index.html:1571-1574`. Nothing asserts the ramp has four branches. The one
    place the suite names the characters is `WALL_CHARS` at
    `test/warp.test.mjs:36`, and it is a filter, not an assertion: it collects the
    cells a wall column is allowed to hold so the warp checks can read their
    colours, and it is deliberately wider than the ramp, carrying the two ring
    characters as well. Add a fifth shade to the ramp and that set simply does
    not collect it, every one of the 539 tests still passes, and four figures in a
    published comment become wrong with nothing saying so. This is the same shape
    as the count the turn just removed - a figure whose premise moved out from
    under it - and the removal cost two releases to find.
  - **Goal**: One assertion, no browser needed, in whichever of
    `test/browser-engine.test.mjs` or `test/warp.test.mjs` already has a
    full-height tunnel to hand. Drive a quiet run tall enough that `t` crosses
    all four of the ramp's bands, collect the distinct characters `drawTunnel`
    leaves on the wall columns with the ring characters and the floor dot
    excluded, and assert the set is exactly `░ ▒ ▓ █` - so a fifth band, or a
    substituted glyph, fails the suite and sends someone to the figures that
    counted the old four. Worth running in both builds, since `drawTunnel` is
    shared and the parity suite would otherwise be the only thing watching it.
    Leave `WALL_CHARS` as it is; it is doing a different job and widening the
    assertion to match it would defeat the point.
  - From: UI/UX Override - the figures the overlap sentence states
- [x] **Return Frame Sample**: **Performance mode** — Reduce particle count and star count on low-end devices. Detect frame drops and auto-adjust.
  - From: Polish
- [x] **Entry Cursor Blink**: **Leaderboard with name entry** — After game over, if the player beat their best score, show a 3-character name entry screen (classic arcade style). Store top 10 scores in `localStorage`. Display on the title screen.
  - From: Bigger Features
- [x] **Replay ghost** — Record the player's inputs during a run. On the next run, show a ghosted version of the previous ship flying the same path. Motivates beating your own performance.
  - From: Bigger Features
