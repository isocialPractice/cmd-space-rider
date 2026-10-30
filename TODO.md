# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

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

> 178 earlier items in `TODO-archive.md`, newest last.

- [x] The ENTER that asks for a rematch is also pilot 2's first shot of it
  - **Issue**: the frame loop reads the rematch and then steps the round it
    opened with the same keypress still in the map:
    `if(versus.settled&&justPressed.ENTER)versus=versus.rematch();` is followed
    immediately by `versus.step(dt,keys,justPressed)` (`index.html:5300-5301`),
    and ENTER is pilot 2's trigger in `VERSUS_BINDINGS` (`:4118`). The clear at
    `:5363` does not run until the end of the frame. Measured: settle a round,
    call `rematch()`, then step the new round once with `{ENTER:true}` - pilot 2
    opens with 3 bullets and a `shot` cue while pilot 1 opens with none. So the
    two seats do not launch alike in the one mode whose premise is that they fly
    the same thing, and the pilot who asked for the rematch is the one who gets
    the free volley. `VersusRound.settled` exists for the mirror case - the
    ENTER that ended a round relaunching it - so this is the same key read twice
    in the other direction, and it is not handled.
  - **Goal**: Spend the keypress on the rematch rather than on both, by clearing
    ENTER from `justPressed` on the frame a rematch opens. The edit is in the
    frame loop, which sits below the `// ===== Canvas Setup & Sizing =====`
    marker and so is not reachable from the suite - `test/versus.test.mjs` says
    as much in its own header - so either the read moves above the marker where
    a case can reach it, or the fix is taken with the frame loop's other
    untested wiring and the reasoning recorded beside it.
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [x] The debug-mode allow-list is written five times and compared nowhere
  - **Issue**: one list of five mode names is restated in five places - the
    `DebugMode` union (`src/types.ts:4`), `DEBUG_MODES` (`src/types.ts:6` and
    its browser copy `index.html:1283`), and a `validModes` literal in each
    build's parameter handler (`src/index.ts:108`, `index.html:4964`) - plus a
    sixth copy in `test/asteroid-field.test.mjs:51`. Only the first three are
    tied to anything; the two `validModes` copies are hand-written and nothing
    in the suite compares them against `DEBUG_MODES`. The terminal copy also
    discards the one check its build could have made: `validModes` is inferred
    `string[]`, so `validModes.includes(explicitMode)` does not narrow
    `explicitMode`, and `game.startGame(explicitMode as any)`
    (`src/index.ts:110`) silences what would otherwise be a type error. Name the
    change that breaks it: add a sixth mode to `DebugMode` and `DEBUG_MODES` in
    both builds and it appears in both debug menus and `startGame` takes it,
    while `--mode=<new>` exits 1 reporting "Unknown mode" and listing only the
    five, and `?mode=<new>` falls through to the title screen with no word about
    why. `tsc` catches neither, the first because of the cast and the second
    because the browser build is untyped. The lists do agree today, so nothing
    fails now - this is the drift being unguarded rather than present.
  - **Goal**: Read the allow-list off `DEBUG_MODES` in both parameter handlers
    instead of restating it. In `src/index.ts` that also removes the `as any`:
    `DEBUG_MODES.find((m) => m === explicitMode)` narrows to `DebugMode` on its
    own, and the error path can report `DEBUG_MODES.join(', ')`. The browser
    handler reads the same constant, which is already declared above it at
    `:1283`. A case pairing each build's accepted modes against `DEBUG_MODES`
    would hold it, and `test/asteroid-field.test.mjs:51` can take the constant
    rather than its own copy.
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [x] Pin the three frame-loop call sites the suite cannot see
  - **Issue**: two of this run's fixes are split across the
    `// ===== Canvas Setup & Sizing =====` marker - a function above it, and
    the call that reaches it below - and `test/versus.test.mjs` only reaches
    the half above. `versusRematch` has three cases of its own; nothing checks
    that `frame()` calls it. `VersusRound`'s `muted` argument has two; nothing
    checks that either opening path hands it `game.state.muted`. Measured by
    reverting the one line at `index.html:5503` to the
    `if(versus.settled&&justPressed.ENTER)versus=versus.rematch();` it
    replaced: `node --test test/versus.test.mjs test/parity.test.mjs
    test/browser-shell.test.mjs` still reports 122 of 122 passing, while the
    same page driven in chromium opens the rematch with pilot 2 holding six to
    eight bullet cells against pilot 1's none, and a shot cue on the frame. So
    the defect comes back in full with the suite green. Nothing is broken
    today - this is the wiring being unguarded rather than wrong, the same
    shape as `The debug-mode allow-list is written five times and compared
    nowhere`, which this run closed for the other below-marker handler.
  - **Goal**: Assert the three call sites as the text of `index.html`, in
    `test/browser-shell.test.mjs` - it already reads the file at module level
    and is written for "the seam where the arithmetic stops and the DOM
    starts". The matches are `versus=versusRematch(versus,justPressed)` in the
    frame loop and `new VersusRound(versusSeed(),layout,game.state.muted)` at
    both the `V` branch and the `?versus` branch, which is the same technique
    `test/parity.test.mjs` now uses for `DEBUG_MODES.includes(explicitMode)`
    and for the reason it states there, that neither handler is reachable from
    the suite. Worth a fourth assertion that `versus.rematch()` appears nowhere
    in the loop, since the shape this defect would return in is the direct call
    coming back beside the guarded one rather than replacing it. A source-text
    case should say in its own comment that it pins the wiring as written and
    not as behaving, and name where the behaviour was confirmed instead.
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [x] The mute check tells two openings apart by line, so one line can hide an
      unmuted round
  - **Issue**: `test/browser-shell.test.mjs:1089` subtracts the openings that
    read `game.state.muted` from the openings found, but both sides are the
    `index.html:<line>` strings `wiringAt` returns, so two openings sharing a
    source line are one entry as far as `includes` is concerned. Measured by
    collapsing a second, unmuted opening onto `index.html:5178` beside the
    `?versus` one -
    `...layout,game.state.muted);else if(params.has('v2'))versus=new VersusRound(versusSeed(),layout,false);`
    - and removing the `V` key's so the count still reads 2: `muted` comes back
    holding `index.html:5178`, `opens.filter((at) => !muted.includes(at))` comes
    back empty, and 'browser: both openings hand the round the page's mute'
    reports a tick with `layout,false)` standing in the file. That is the one
    thing the case exists to refuse, and its own comment at 1076 says so:
    "counted rather than matched branch by branch, so a third way into a round
    is a failure here instead of a silently unmuted one". Nothing is wrong in
    `index.html` today - the two openings are at 5178 and 5490, a line apart in
    the only arrangement the file has had - and the sibling case 'the V key and
    the ?versus link are the two openings' did fail on the arrangement above by
    its own route, so what is blind is this assertion rather than the suite.
  - **Goal**: Give each match an identity the source line does not decide. Have
    `wiringAt` return the match offset alongside the line - the
    `index.html:<line>` string for the failure text, `m.index` for the
    comparison - so the subtraction is exact while the messages read as they do
    now. Then rebuild the collapsed-line arrangement above and confirm the mute
    case is what fails, since today it is the only one of the four that does
    not.
  - From: Code Review Override - the versus wiring cases
- [x] The `wiring` docstring credits a `doesNotMatch` the block does not use
  - **Issue**: `test/browser-shell.test.mjs:36` explains slicing to the end of
    the file rather than to `</script>` by saying the wider slice "leaves the
    `doesNotMatch` below reading the larger region". No assertion in the file
    reads `wiring` through `doesNotMatch`. The four the file holds are at 460,
    929, 990 and 991, and every one reads `html` or a data URI, so none is
    affected by where the slice ends. The case that would have been that
    `doesNotMatch` is 'browser: nothing in the wiring opens a rematch directly'
    at 1057, and it deliberately does the opposite - it collects locations and
    asserts `deepEqual(at, [])` - for the reason the block comment gives at
    1029: "a regex assertion over a 20,000-character slice prints the slice, and
    a failure nobody can read is a failure nobody acts on". So the docstring
    states the design the block was written to replace, 993 lines above the note
    saying why it was replaced, and a reader taking it at its word would restore
    the assertion form that note argues against.
  - **Goal**: Rewrite the docstring's second paragraph around the reason that
    still holds - nothing after `</script>` carries JavaScript, 26 characters of
    `</body></html>`, so slicing to the end costs a case nothing and leaves the
    marker as the only index the block needs - and drop the clause naming
    `doesNotMatch`.
  - From: Code Review Override - the versus wiring cases
