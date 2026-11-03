# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] Verify git tracks `.gitignore` once this run's commit has landed.
  `git ls-files .gitignore` printing the path is the whole confirmation, and no
  call that writes the rule can have it: the line takes the file from `!!` to
  `??`, and the index only changes at the commit afterwards.
  - From: version.control = null

### Create and Deploy GitHub Pages Override

### Found Issue Override - the asteroid field's wall comparison

#### Found Issues

- [ ] `the walls come back with the tunnel` fails about one run in twelve
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

### Code Review Override - the structure page's test census, and a git read with no answer

#### Found Issues

- [ ] `docs/project-structure.html` lists every test file but the one 0.15.1 added
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

- [ ] `excludedByRules` reads a git it could not ask as a git that answered "no"
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

> 183 earlier items in `TODO-archive.md`, newest last.

- [x] The title screen never says the page is muted
  - **Issue**: `M` works on the title screen and nothing on that screen reports
    it. Driven in chromium at 1280x800 against `index.html` served over
    `http://127.0.0.1`: one `M` on the title screen takes `game.state.muted`
    from `false` to `true`, and the 44-row grid is **byte-identical** before and
    after - every row, including the bottom border. No row names the `M` key
    either; the title screen names `WASD or ARROWS`, `F`, `SPACE`, `Q / E`,
    `[ PRESS ENTER TO LAUNCH ]` and `[ V ] TWO-PILOT SPLIT SCREEN`, and no
    more. The setting is live all the same, which is what makes the silence
    cost something: a round opened with `V` straight afterwards reports
    `versus.muted()` true with both pilots muted, and plays no cue and no hum -
    so a player who pressed `M` once too often, or who cannot hear whether the
    page is muted, has no way to read the state until they launch a run and see
    the footer. In a run it is reported properly: `drawFooter` reserves
    `' MUTED '` (`index.html:3402`) and writes it at `:3420`, observed as
    `═ MUTED ═╝` in the status strip. `MUTED` occurs nowhere else in the file,
    and `renderTitleScreen` (`:3711`) takes no reading of `state.muted` at all,
    which is why `case'menu':` (`:5540`) draws the same screen either way.
  - **Goal**: Report the state on the title screen the way the footer already
    does in a run. The bottom border row is already a status line on that
    screen - `drawVersusHint` (`:4536`) writes the versus label centred into
    `screen.height-1` after `renderTitleScreen` (`:5541-5544`) - so a right
    aligned ` MUTED ` at `w-mute.length-2`, the offset `drawFooter` uses, has a
    place to sit that the centred hint does not want. Worth deciding whether it
    belongs inside `renderTitleScreen`, which is handed the state and so can
    read the flag directly, or beside `drawVersusHint` as another thing the
    page writes over the shared title screen; `drawVersusHint`'s own docstring
    in `test/versus.test.mjs:1020` gives the reason that call sits outside
    `renderTitleScreen`, and the same reasoning may or may not apply here.
    Either way the narrow widths want the same guard the hint has, since
    `versusHintText` is gated on width and a label dropped onto a border too
    short for it is the defect `drawVersus` restates its borders to avoid.
    A case holds this without a browser: `renderTitleScreen` is above the
    `// ===== Canvas Setup & Sizing =====` marker and the suite already renders
    it (`test/menu-layout.test.mjs:194`, `test/parity.test.mjs:589`), so
    `test/browser-engine.test.mjs` - whose header already names mute as one of
    its subjects - can render a title screen at `muted:false` and at
    `muted:true` and assert the two buffers differ and that the muted one
    carries the word. That is the sibling of
    `test/browser-engine.test.mjs:520`, 'the mute indicator appears only when
    muted', which pins the footer's indicator the same way.
  - From: UI/UX Override - the title screen's silent mute
- [x] A gamepad in a split-screen round shoots for the wrong pilot
  - **Issue**: both below-marker call sites that resolve a fire key read the
    solo game's mode while a round owns the frame, and a round leaves that mode
    at `menu`: `padsKeys(navigator.getGamepads(),game.state.mode)`
    (`index.html:5250`) and `holdButton(fireEl,()=>touchFireKey(game.state.mode))`
    (`:5392`). `touchFireKey` (`:4799`) answers `SPACE` only for `'playing'`, so
    through a whole round the A button sends `ENTER` - and `ENTER` is pilot 2's
    trigger in `VERSUS_BINDINGS` (`:4142`). Measured through `test/helpers.mjs`
    at a 100x30 grid, one standard-layout pad with A down, the poll at `:5247`
    reconstructed and a fresh round stepped one frame on what it produced:
    pilot 2 opens with 3 bullets and a `shot` cue, pilot 1 with none. The rest
    of the pad lands on the other seat - B sends `F` and the two triggers send
    `Q` and `E`, all three pilot 1's - and the left stick steers nobody, since
    `pilotKeys` (`:4164`) routes the arrows to neither pilot, which is the
    decision `VERSUS_BINDINGS` states in its own docstring. So one controller
    holds pilot 1's boost and both rolls, pilot 2's gun, and nobody's steering,
    in the one mode whose premise is that the two fly the same thing. Which seat
    the trigger lands in also depends on how the round was opened:
    `?mode=tunnel&versus` leaves the solo game at `'playing'`, so the same
    button sends `SPACE` and fires pilot 1 instead - one pad, one button, a
    different pilot by route. The on-screen FIRE button reads the same way at
    `:5392`, reachable on a landscape tablet wide enough for 91 columns. Nothing
    in the suite pairs either input with a round: the poll's own case pins its
    shape and never its mode argument (`test/browser-shell.test.mjs:671`), and
    `padKeys` is only ever asked for `'menu'` and `'playing'` (`:538`), both of
    which are right about the solo game.
  - **Goal**: Decide what a pad does in a round, then wire it to the round
    rather than to the solo game. Three answers are open and choosing is the
    work: drive pilot 1 with the whole pad, which wants the stick routed onto
    that pilot's `W`/`A`/`S`/`D` as well as A onto `SPACE`, and is the only one
    that makes the boost and rolls the pad already lands there coherent; seat
    the pad as pilot 1 against pilot 2's keyboard, which is a feature rather
    than a fix; or feed it nothing while a round runs, which is one line and
    gives up the three controls that already work. Whichever is taken, the mode
    handed to `padsKeys` and `touchFireKey` has to be a reading of what is being
    played rather than of `game.state`, which is the shape every other
    below-marker read already has - `shakeOffset` is gated `versus?{x:0,y:0}:`
    at `:5560`, and the render and audio calls sit inside the solo branch.
    `docs/features.html`'s gamepad bullet says the stick steers and A fires
    during a run, and wants a line about a round once the behaviour is settled.
    A case holds this without a browser: `padsKeys`, `padFireKey`,
    `PAD_CONTROL_KEYS`, `pilotKeys` and `VersusRound` are all above the marker
    and exported by `test/helpers.mjs`, so `test/browser-shell.test.mjs` can
    rebuild the poll the way its own case at 671 does and step a round on what
    it produces. The line that hands the mode over wants the source-text pin the
    three versus wiring lines already have, since no case can execute
    `pollGamepads`, and it should say in its own comment that it pins the wiring
    as written and not as behaving.
  - From: UI/UX Override - the title screen's silent mute
- [x] The mute label stops at the title screen
  - **Issue**: `M` is answered in `Game.update` with no mode gate at all
    (`src/game.ts:703`, `index.html:1731`), whose own comment says so - "M is a
    global setting toggle, so it works in every mode" - and the solo branch of
    the frame loop calls `game.update` unconditionally every frame
    (`index.html:5674`, `src/index.ts:186`). So the key works on all five
    screens. Only two report it. `drawFooter` writes `' MUTED '` during a run
    (`src/render.ts:871`, `index.html:3420`) and `renderTitleScreen` now writes
    the same label into the title screen's bottom border (`src/menu.ts:347`,
    `index.html:3780`), but `renderGameOver` (`src/menu.ts:421`,
    `index.html:3830`), `renderNameEntry` (`src/menu.ts:221`) and
    `renderDebugMenu` (`src/menu.ts:354`) draw no footer and take no reading of
    `state.muted` - `MUTED` occurs in neither build outside the two places
    above. The game over screen is the one that costs most: it is where a player
    arrives straight out of a run, so it is the likeliest screen to press `M`
    on, and the reasoning the title screen's label was added under applies to it
    word for word - the setting outlives the screen and there is no way to read
    it until another run is launched.
  - **Goal**: Carry the label onto the screens that still do not report it,
    reusing what `renderTitleScreen` already does rather than restating it: the
    same `' MUTED '` right aligned at `w-mute.length-2` on `h-1`, under the same
    `mute.length <= w - 4` width gate, in `C.BRIGHT_YELLOW` on `C.BLACK`. Three
    screens now write the identical six lines, which is the point at which it
    wants a helper of its own in each build - a `drawMuteLabel(screen, state)`
    beside the other menu drawing helpers in `src/menu.ts`, with the browser
    copy above the `// ===== Canvas Setup & Sizing =====` marker so the suite
    can reach it - and the title screen's copy folded into it. Worth deciding
    whether the debug menu wants it: a debug scenario is not a session a player
    is listening to, so leaving that one out is defensible, but say which was
    chosen rather than leaving it to the diff. Cases hold all of this without a
    browser, the way the title screen's do
    (`test/browser-engine.test.mjs:534`): both builds render these screens in
    the suite already, and `test/parity.test.mjs:553` renders the name entry
    screen beside the title screen, so it can compare them muted as well as
    unmuted exactly as it now does for the title screen.
  - From: Code Review Override - the mute label's missing screens
- [x] The terminal build's title-screen mute gate has no case
  - **Issue**: the width gate on the new label is written in both builds
    (`src/menu.ts:348`, `index.html:3781`) and exercised in one.
    `test/browser-engine.test.mjs` holds it at a 10-column grid, where the label
    is dropped and the corner still closes the frame, and there is no terminal
    sibling - so the terminal build's `mute.length <= w - 4` could be dropped or
    written as `w - 2` and the suite would stay green. `test/parity.test.mjs`
    does not cover it either: it renders both builds muted at one width wide
    enough for the label, so it compares the two labels rather than the two
    gates. The repository tests the footer's indicator on both sides
    (`test/terminal-engine.test.mjs:310` beside
    `test/browser-engine.test.mjs:520`), which is the convention this one
    departs from. Nothing fails today - the two gates agree - this is the
    terminal gate being unguarded rather than wrong.
  - **Goal**: Give the terminal build the sibling case, mirroring
    'the title screen drops the mute label rather than writing over the border'
    (`test/browser-engine.test.mjs:570`) - render the terminal title screen muted
    at a grid narrower than the label needs, assert the bottom border does not
    carry the word, and assert the corner is still drawn. `test/parity.test.mjs`
    taking the narrow width as a second comparison would cover both gates at
    once and may be the better home; either way it should be one of the two
    rather than neither.
  - From: Code Review Override - the mute label's missing screens
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
