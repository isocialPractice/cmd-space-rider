# TODO — CMD Space Rider

## Current

The work queued for the next run, moved from the roadmap sections below.
Each item keeps a nested `From:` line recording the section it came from, so
its origin survives archiving into `## Complete`.

- [ ] Pin the three frame-loop call sites the suite cannot see
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

### Create and Deploy GitHub Pages Override

### UI/UX Override - the dying frame's score, and the HUD below the versus floor

#### Found Issues

- [ ] The frame a run dies on keeps scoring after the score has been filed
  - **Issue**: `updatePlaying` runs `updateObstacles` before `updateOrbs`,
    `updateMines` and `updatePowerups` (`src/game.ts:832-837`, and the inline
    copy in `index.html`). When the shield runs out, `updateObstacles` calls
    `endGame()` and returns - but it returns from itself, not from
    `updatePlaying`, so every pass below it still runs on that frame and can
    still pay out. `endGame` has already read `s.score` to set `bestScore` and
    to decide whether the run qualifies for the table, so both readings are
    stale by the end of the frame, and `commitEntry` later files the larger
    number. Measured in a browser on a cleared profile, from a run at score
    1000 with the shield one obstacle hit from gone and an orb on the same
    spot: the game over screen reads `1505` with `Best Score: 1005` directly
    under it, on the only run ever flown, and the shield reads 10 on a run that
    died of an empty one. The leaderboard files 1505 while
    `cmdSpaceRider.bestScore` holds 1005. Identical in both builds -
    `out/game.js` and `loadBrowserEngine` both give score 1506, best 1006,
    shield 10 after one `update(1/30, {}, {})` - so it is shared rather than
    drifted. Reachable in ordinary play: an orb at the same screen position as
    the obstacle that kills you, which is an ordinary tunnel arrangement.
  - **Goal**: Resolve to [death-frame-score-drift.prompt.md](.claude/prompts/death-frame-score-drift.prompt.md)
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [ ] A round dragged under 45 columns a half eats its own HUD readings
  - **Issue**: `versusLayout`'s docstring says the `fits` gate "gates opening a
    round and not continuing one", so a window dragged narrower mid-flight keeps
    the round on purpose, accepting "two narrow halves" as the lesser cost. But
    the half's HUD is not merely narrow below 45: `drawHUD` writes SCORE from
    the left, DIST centred, then SHIELD from the right, each over whatever is
    already in the row, so they overwrite each other rather than crowd. Measured
    off the drawn buffer at a fresh run's figures - `half=44`
    `SCORE: 0      DIST: 0.0 km  SHIELD: 100%`, `half=40`
    `DIST: 0.0 kmSHIELD: 100%`, `half=36` `DIST: 0.0 SHIELD: 100%`, `half=30`
    `SCORE: DIST: 0SHIELD: 100%`, `half=24` `SCORDISTSHIELD: 100%`. By 30
    columns the score value is gone entirely, in the one mode whose result is
    decided by score and whose panel reports both pilots' scores at the end.
    Seen on screen at a 620px viewport with a round already open. This is the
    same overlap `npm run probe -- versus-half` measures to put the floor at 45
    ("a column written twice is an overlap"); the gate keeps a round below the
    width the probe measured, and nothing re-reads it. Only the HUD breaks -
    `versusHintRow` abbreviates correctly all the way down and the frames,
    labels and seam hold at every width swept from 1600px to 120px. The solo
    game is unaffected: its own floor is `MIN_WIDTH` 60, which clears all three
    readings out to twenty minutes with room to spare, and below the grid floor
    the too-small notice takes the screen for a round as well as for a run.
  - **Goal**: Decide what a round does below its own floor, rather than leaving
    it to whichever reading is written last. Either give `drawVersus` a
    shortened HUD form for a half under `VERSUS_MIN_HALF_WIDTH` - the way
    `versusHintRow` already drops to shorter legends - or have the resize path
    show the round's own "too narrow" notice over the halves while keeping the
    round seated, so dragging the window back restores it as it does today.
    Leaving it as it stands is also a decision, but then the docstring should
    say what "two narrow halves" costs, since it currently reads as a smaller
    tunnel rather than as an unreadable score. Whichever way it goes,
    `test/versus.test.mjs` should read the HUD row back off a half below the
    floor, which nothing does today.
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [ ] `rematch()` opens a round on a layout the `fits` gate would refuse
  - **Issue**: `versusLayout`'s docstring says `fits` "gates opening a round and
    not continuing one", and both paths that open one from the page check it -
    the `V` key (`index.html:5284-5287`) and the `?versus` parameter
    (`:4976-4979`). `rematch()` opens one too and checks nothing:
    `new VersusRound(versusSeed(),this.layout)` (`:4548`) reuses whatever layout
    the round is seated on, and `handleResize` re-seats a round unconditionally
    (`:4921`), so that layout can be one `fits` rejects. Measured off the
    engine: open a round at 100 columns (`half=49`, `fits:true`), call `seat`
    with `versusLayout(60,30)` the way a drag to 60 columns does (`half=29`,
    `fits:false`), then call `rematch()` - the round that comes back reports
    `fits:false` at `half=29`, and the HUD row of the half it renders reads
    `SCORE:DIST: 0SHIELD: 100%`, with the score value gone. Reachable in
    ordinary play, in a band of its own: between 60 and 90 columns `fitGrid`
    still reports `fits:true` (`MIN_WIDTH` 60) so the too-small notice does not
    take the screen, while a half is 29 to 44 columns and under
    `VERSUS_MIN_HALF_WIDTH` 45. So one width is both refused and granted
    depending on which key reaches it: `V` and `?versus` decline to open a round
    there, and ENTER on the result panel opens one.
  - **Goal**: Apply the gate at the rematch as the other two paths apply it, and
    decide what ENTER does on a result panel too narrow for a fresh round -
    refusing silently leaves the players no way to read why. This is the same
    floor as `A round dragged under 45 columns a half eats its own HUD readings`
    above and the two want deciding together: a shortened HUD form below the
    floor answers both at once, where that item's "too narrow notice over the
    halves" option answers the resize and leaves `rematch()` still opening a
    round the gate refuses. Whichever way it goes, `test/versus.test.mjs` should
    re-seat a round below the floor and read back what `rematch()` returns,
    which nothing does today.
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [ ] Mute does not survive opening a round or asking for a rematch
  - **Issue**: the engine's own comment calls M "a global setting toggle, so it
    works in every mode" (`src/game.ts:701`, and the inline copy at
    `index.html:1729`), and `startGame` resets `paused` but deliberately not
    `muted` (`src/game.ts:381`), so mute survives a run in the solo game. A
    round carries it neither way: `VersusRound`'s constructor builds two
    `new Game()` (`index.html:4428`) and `createInitialState` sets `muted:false`
    (`:1320`), so a round opens unmuted whatever the page was, and `rematch()`
    builds a fresh pair the same way. Measured in both directions - mute the
    page's game with M, then open a round, and both pilots read `muted:false`;
    mute a round with M so both pilots read `muted:true` and `versusAudioState`
    reports `muted:true`, then `rematch()`, and both read `muted:false` with
    `versusAudioState` reporting `muted:false`. The sound the players turned off
    returns once when they press `V` and again on every ENTER. Nothing inside a
    round drifts: `VERSUS_SHARED_KEYS` routes M to both pilots, `step` answers
    it for a pilot who is out, and the two copies held in step at every standing
    flown - the setting is lost at the round boundary, not within one.
  - **Goal**: Carry the page's mute into a round when one opens, and the round's
    own into its rematch. The round's value is already `a.muted||b.muted`, which
    is what `versusAudioState` reads, so the rematch half is that expression
    written onto the new pair; the open half needs the two call sites at
    `index.html:5287` and `:4978` to hand `VersusRound` what `game.state.muted`
    holds, which is a constructor argument it does not take today.
    `test/versus.test.mjs` should read `muted` back off both pilots across a
    `rematch()`, which nothing does today.
  - From: UI/UX Override - the dying frame's score, and the HUD below the versus floor
- [ ] The ENTER that asks for a rematch is also pilot 2's first shot of it
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
- [ ] The debug-mode allow-list is written five times and compared nowhere
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

> 169 earlier items in `TODO-archive.md`, newest last.

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
- [x] Fourteen of the seventeen glyph escapes the split screen now writes are
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
