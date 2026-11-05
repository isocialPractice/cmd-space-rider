# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] **A probe for how often a section's rocks reach the ship** - 0.15.2 quotes
  a rate in `test/asteroid-field.test.mjs` and in the CHANGELOG that nothing in
  the repository can rebuild: over 60,000 unseeded runs of the open-and-close
  sequence, the terminal build shook 237 times and misread the walls the same
  237 times, and the browser build shook 258 times and misread none. Those
  figures came from a scratch script in `.tmp`, which is the thing this section
  exists to replace. The reading is a natural probe - it walks a sequence many
  times and reports a rate and a contingency rather than asserting one - and it
  would also carry the figure that explains the pair, which is that a hit
  jolts the terminal build's grid a whole column and the browser build's not at
  all. Nothing is wrong today: the two cases it came from are seeded and
  deterministic, so this is a figure needing a home rather than a defect.
  - From: Measurement

### Create and Deploy GitHub Pages Override

### UI/UX Override - the wiring below the canvas marker

#### Found Issues

- [ ] Nothing in the suite executes the page wiring below the canvas marker
  - **Issue**: Not a defect. A browser pass on 11-05-26 drove that region and
    found it sound: 128 assertions over the mute label on all three menu
    screens, a muted round and two rematches, the on-screen FIRE and gamepad
    seat, and the resize path at six window sizes, all passing, and every
    figure reproduced on a second full run. What it showed instead is that it
    was the first thing ever to run those lines.
    `test/browser-shell.test.mjs` opens `index.html`, finds
    `// ===== Canvas Setup & Sizing =====`, and asserts over the characters
    after it, so the frame loop, the two `new VersusRound(...,game.state.muted)`
    openings, the `versusRematch` call, the gamepad poll and `handleResize` are
    covered by a reader and executed by nothing. The cost is already on the
    record - `0.13.0`, `0.13.1` and `0.13.2` were all defects on that side of
    the marker, and `0.13.2` was a defect in the cases written to pin it - and
    the verification that just cleared the region leaves no check behind,
    because it runs only when the agent runs.
  - **Goal**: Resolve to [browser-wiring-regression-harness.prompt.md](.claude/prompts/browser-wiring-regression-harness.prompt.md)
  - From: UI/UX Override - the wiring below the canvas marker

### Code Review Override - a debug mode the allow-list has never held

#### Found Issues

- [ ] Four comments illustrate the route-dependent mode with `?mode=tunnel`,
  which `DEBUG_MODES` rejects
  - **Issue**: `inputMode`'s docstring at `index.html:5000` and `index.html:5019`
    argues that which seat a pad's A button landed in "depended on the route in,
    since `?mode=tunnel&versus` leaves the solo game at `'playing'`", and
    `test/browser-shell.test.mjs:722` and `:887` carry the same sentence beside
    the cases that pin the behaviour. `tunnel` is not a debug mode and never has
    been: `DEBUG_MODES` is `['mines','orbs','obstacleCollision','mineCollision','chaos']`
    at `index.html:1283` and has held those five unchanged since `0.3.0-alpha`
    (`git log -S"'tunnel'"` over `index.html` and `src/types.ts` is empty). The
    page gates on `DEBUG_MODES.includes(explicitMode)` at `index.html:5313`, so
    `?mode=tunnel` falls through to the title screen and leaves the solo game at
    `'menu'` - confirmed by running the gate: `?mode=tunnel&versus` answers
    `'menu'` and `?mode=chaos&versus` answers `'playing'`.

    So the example inverts the point it is making. `'menu'` is the state these
    passages contrast the route against, which makes `tunnel` the one value that
    cannot demonstrate the contrast, and a reader who tries the link to see the
    behaviour for themselves gets the title screen and no word about why. The
    second cost is that four places in two files name `tunnel` as a mode a URL
    can ask for, one of them a test file read as the record of what the wiring
    below the canvas marker does.

    Not a defect in `inputMode`. The reading it takes is right and the behaviour
    it describes is real - a valid mode does leave the solo game at `'playing'`,
    which is why it is the gate rather than `game.state.mode` that both call
    sites now ask. Only the worked example is impossible.
  - **Goal**: Substitute a mode the allow-list holds - `chaos` reproduces every
    sentence as written, verified above - at all four sites: `index.html:5000`,
    `index.html:5019`, `test/browser-shell.test.mjs:722` and
    `test/browser-shell.test.mjs:887`. Nothing executes, so the suite staying at
    930 of 930 is the whole check. The two copies in `CHANGELOG.md` at `:360`
    and `:391` are already corrected and are not part of this item - release
    note prose is fixed in place rather than queued - so leave them alone and do
    not re-open 0.15.2's entry over it.
  - From: Code Review Override - a debug mode the allow-list has never held
- [ ] `overlayVars` publishes a negative `--playpx` on the grids `fitGrid`
  refuses, and nothing reads that half of its domain
  - **Issue**: `playBandPx` at `index.html:4030` is
    `(grid.rows-HUD_ROWS-FOOTER_ROWS)*grid.cellH`, which goes negative whenever
    a grid has fewer rows than the HUD and footer want. `fitGrid` hands back
    exactly such a grid by design: when no font reaches the floor it returns the
    notice grid, which needs only `NOTICE_ROWS` of 3. A 300x60 window gives
    `{cols:30,rows:3,fits:false}` and `overlayVars(grid,60)` then answers
    `{'--footerpx':'42px','--playpx':'-36px'}` - reproduced against the harness's
    own `fitGrid` and `overlayVars`.

    `handleResize` publishes the map unconditionally at `index.html:5268`,
    before `frame()` ever reads `gridFits`, so the negative length reaches the
    root element on any window in that band. What stops it costing a player
    anything is circumstantial rather than intended: the overlay stays `hidden`
    until a `touchstart`, and a viewport 60px tall shows the too-small notice.
    `revealTouch` does not consult `gridFits`, so a touch arriving there would
    size the controls against it.

    The gap is the reason this is worth a line rather than the figure itself.
    `overlayVars`' own docstring argues it exists above the DOM marker so the
    pairing of the two properties is "where the suite can read it", and
    `test/browser-shell.test.mjs:1016` reads it at fitting grids only - so the
    half of its domain `fitGrid` is documented to produce is the half nothing
    asks about.
  - **Goal**: Decide which of the two this is, because they are different edits.
    Either the band is a state the overlay should not be sized for at all, and
    `handleResize` should skip the publish - or defer to `frame()` - when
    `grid.fits` is false; or the figure should floor at 0, in `playBandPx` where
    every caller gets it rather than at the one call site. Then cover it:
    extend the `overlayVars` case to the grids `fitGrid` returns with
    `fits:false`, which is the assertion that would have caught this, and assert
    the property is a length a control can be sized against rather than only
    that the two names are paired.
  - From: Code Review Override - a debug mode the allow-list has never held

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

> 187 earlier items in `TODO-archive.md`, newest last.

- [x] The repository's `.gitignore` is not in the repository
  - **Issue**: `git ls-files --error-unmatch .gitignore` answers `did not match
    any file(s) known to git` and `git status --short --ignored .gitignore`
    answers `!! .gitignore`, so the file has never been committed. The global
    excludes file hides every dotfile with a bare `.*`, which is the same trap
    `.gitignore` itself already answers for two other files - it carries a `!`
    line and a paragraph of reasoning for `.gitattributes` and another for
    `.nojekyll` - and never answers for itself. What it costs is every rule in
    it: a clone ignores nothing, so `out/`, `node_modules/` and
    `test-results/ui-ux-tester.agent/` all read as untracked there, and the LF
    pinning the `.gitattributes` note describes as settled "for every editor,
    on every machine" is settled only on this one, because the file that
    un-ignores `.gitattributes` is not in the clone either.
  - **Goal**: Add a `!.gitignore` line beside the existing `!.gitattributes`
    and `!.nojekyll` ones, with a comment in the same voice saying why a
    dotfile needs un-ignoring here, then `git add -f .gitignore` once - the
    `-f` is needed for the first add, since the global rule still hides it
    until the file is tracked. Worth checking the same way afterwards: a
    `git ls-files .gitignore` that prints the path is the whole confirmation.
  - From: UI/UX Override - the mute label on the menu screens
- [x] Verify git tracks `.gitignore` once this run's commit has landed.
  `git ls-files .gitignore` printing the path is the whole confirmation, and no
  call that writes the rule can have it: the line takes the file from `!!` to
  `??`, and the index only changes at the commit afterwards.
  - From: version.control = null
- [x] `the walls come back with the tunnel` fails about one run in twelve
  - **Issue**: The per-build test at `test/asteroid-field.test.mjs:409` renders
    a quiet run, opens and closes an asteroid section, and asserts the wall
    glyphs afterwards are the set that was there before. On 11-03-26 it failed
    once in 12 full-suite runs, and passed 926/926 on the other 11. The report
    was `actual: ["█","▓"]` against `expected: ["╠","╣","█","░","▒","▓"]`, so
    `before` held all six and the render after the section came back with two
    of the four depth bands and neither ring end. Which build it was did not
    survive the output, since both carry the same test name.

    An unseeded draw is in the path it walks. `RNG.next` is `Math.random` by
    default (`src/types.ts:356`), the two tests above this one seed and then
    hand it back with `build.seedRng(null)` (lines 316 and 347), and this test
    neither seeds nor is isolated from them - so it runs on real
    `Math.random`. `openAsteroidField` draws once per rock through
    `rand(20, RECYCLE_Z)` (`src/game.ts:975`), which is the only randomness the
    sequence reaches.

    Not from the turn that filed this. The only code 0.15.1 added is
    `test/repo-files.test.mjs`, which reads `.gitignore` and shells out to
    `git check-ignore`; it imports `REPO_ROOT` alone and touches no engine,
    render or game state. The rate is the same order as the suite's age, so
    this reads as long-standing rather than new.
  - **Goal**: Find the draw first and decide second, because the two answers are
    opposite. Walk the test under `seedRng` across a range of seeds until one
    reproduces the two-glyph render, then read what that seed makes the section
    do. If the walls genuinely do not come back for some draws, the defect is in
    the engine and seeding the test would bury it; if the sequence is sound and
    only the comparison is loose - a ring end that happens to be off screen two
    frames later, say - then the test wants the seed the two above it already
    use, and a note saying which. Do not reach for the seed before the
    reproduction: a green suite is the thing this finding is warning about.
  - From: Found Issue Override - the asteroid field's wall comparison
- [x] `docs/project-structure.html` lists every test file but the one 0.15.1 added
  - **Issue**: The page's own `<meta name="description">` is "Every file in the
    CMD Space Rider repository and what it holds", and its `test/` listing
    names 22 `.test.mjs` files with a comment each. The folder holds 23:
    `repo-files.test.mjs` is the only one absent, and the same turn that added
    it edited this page's root listing to add `.gitignore`. So a reader of the
    tree counts a suite one file short of the one `npm test` runs, on the page
    the site publishes as the file census. The omission is also the second of
    its kind here - `docs/development.html`'s Tests paragraph enumerates what
    the suite covers ("both builds, the agreement between them, the
    documentation site, and the measurement rig") and the repository's own
    ignore rules are now a fifth thing it covers, though that sentence claims
    no exhaustiveness and so is the lesser half.
  - **Goal**: Add the `repo-files.test.mjs` line to the `test/` listing beside
    `parity.test.mjs`, aligned on the same comment column, saying what it
    holds - the `!` lines in `.gitignore`, read against git's own answer. Then
    close the gap that let it through: `test/docs-site.test.mjs` already reads
    `test/probes/` off disk and holds it against the probe table the page
    declares, so extend that pattern to the page's `test/` listing, which is
    the one census in the file that nothing compares against the folder. A
    sentence in the Tests paragraph naming the ignore rules is worth the same
    edit while the file is open.
  - From: Code Review Override - the structure page's test census, and a git read with no answer
- [x] `excludedByRules` reads a git it could not ask as a git that answered "no"
  - **Issue**: `test/repo-files.test.mjs:66` guards with
    `if (got.error || got.status > 1) return null`, and its docstring above says
    the point of that line is that "anything above that is the failure to ask
    rather than an answer, which is why the two are told apart here instead of
    being read as 'not excluded'". One shape of failure-to-ask is not told
    apart: `spawnSync` reports `status: null` with `signal` set when the child
    is killed rather than exiting, `null > 1` is `false`, and the return falls
    through to `got.status === 0`, which is `false` - so a git that never
    answered is read as "this path is not excluded", which is the passing
    answer for every path the check walks. A `check-ignore` killed mid-run
    therefore turns both negations green instead of skipping the case, in a
    file whose own header is an argument against a check that passes because
    nothing looked.
  - **Goal**: Guard on the status being a number before comparing it -
    `if (got.error || typeof got.status !== 'number' || got.status > 1)` - so
    `null` joins 128 in the branch the docstring describes and the caller skips
    on it. Exercise it: the function is not exported, so either export it for
    the test or pass the spawn in, and assert that a reading with no numeric
    status skips rather than passes. A test that cannot distinguish the two is
    the defect restated.
  - From: Code Review Override - the structure page's test census, and a git read with no answer
