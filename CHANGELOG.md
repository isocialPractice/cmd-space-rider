# Changelog

## [0.8.2-alpha] - 2026-10-05

### Fixed

- The paragraph 0.8.1-alpha added to `tuneText`'s doc comment gave the inset's
  range and named two sizes where it is zero, and all three of its figures were
  derived rather than measured, from an advance of 0.6 em Courier New does not
  have. The font advances at `1229/2048` em, which is 0.6000977: read through
  the page's own `measureCell` in chromium, the measurement matches
  `1229/2048 * size` at all eleven sizes `fitGrid` can settle on to within half
  a thousandth of a pixel, and matches `0.6 * size` at none of them.

  Four ten-thousandths of an em would be beneath notice except that `cellW` is
  the ceiling of the advance, and a ceiling is at its most sensitive a
  ten-thousandth either side of an integer. `0.6 * size` is a whole number at
  exactly size 10 and size 15, so those are the two sizes the near-miss decides:
  at font 10 an advance of 6.001 ceils to 7 where 6.000 would ceil to 6, and at
  font 15 9.001 ceils to 10 where 9.000 would ceil to 9. So the two sizes the
  comment recorded as having no inset at all carry the largest insets in the
  range, 0.500px and 0.499px, and no size in the range has an inset of zero. The
  range itself is 0.099px to 0.500px rather than 0.100px to 0.400px, and the
  insets repeat in a cycle of five because `1229/2048` is so nearly three fifths.

  What the paragraph had right is kept: `cellW` is the ceiling of the advance at
  every size, the inset is exactly half the slack at every size, and it never
  reaches half a pixel. The arithmetic was never at fault - `glyphInset`,
  `tuneText`, `fitGrid` and `measureCell` all do what they are written to do, and
  the suite's assertions about them hold. `test/menu-layout.test.mjs` is
  untouched: its `modelCell` takes `Math.ceil(size * 0.6)`, which is the
  assumption corrected here, but it is a stand-in cell for testing `fitGrid`'s
  walk rather than a claim about Courier New, and no test in it asserts a zero
  inset at any size. The 0.8.1-alpha entry below is corrected in place.

- "Centred, the seam between two of them is halved" claimed a uniform effect the
  raster does not show, in four places: the comment on the placement in
  `index.html`, the 0.8.0-alpha entry below, the comment above
  `a glyph is centred in the slack its cell has over the advance` in
  `test/menu-layout.test.mjs`, and the published sentence in
  `docs/how-it-works.html`.

  Measured at the junction between two tiling wall glyphs by repainting the live
  buffer twice in one synchronous pass, once through `ScreenBuffer.render` with
  the page's own `cellAdvance` and once with `advance = cellW`, which is the
  left-packed grid the centring replaced. Taking the darkest of the two pixel
  columns either side of a junction, as a level out of 255: at an inset of 0.5px,
  fonts 15 and 10, it rises 41.7 to 68.7 and the spread across the junction falls
  82.3 to 23.3. At 0.4px, fonts 12 and 7, it rises 55.3 to 72.0 and the spread
  falls 68.7 to 36.3, which is the halving as it was described. At 0.3px, fonts
  14 and 9, the reading is mirrored exactly: 97.0/124.0 becomes 124.0/97.0, the
  deficit swapping sides with the darkest column and the spread unchanged to a
  tenth of a level. At 0.1px, fonts 13 and 8, nothing moves. At 0.2px, fonts 16,
  11 and 6, it goes the wrong way - the darkest column falls 111.7 to 102.0 and
  the spread widens 12.7 to 31.3, because left-packed was already nearly even
  there and the inset tips it past centre.

  So the four now say what the measurement supports: the centring lifts the seam
  most where the slack is widest, which is where it read worst, and does nothing
  or a little harm where the slack is narrow. The feature is worth
  having on those numbers - the worst seam in the build is at fonts 15 and 10,
  and that is where it helps most - and `docs/how-it-works.html`'s "a fifth of a
  pixel nobody sees" is right as it stands, since the inset at font 16 is
  0.199px. The comment in `index.html` also records that there is no gap between
  two of these glyphs to close in the first place: of the 28 glyph-and-size pairs
  the walls are drawn from, 24 ink wider than their cell and four ink exactly it,
  and the three shade blocks each reach a whole pixel left of the origin they are
  drawn at, so two adjacent cells overlap and what the inset moves is where the
  soft edge of that overlap falls.

- The `column` probe's call into the engagement harness was run by nothing in
  `npm test`. `ghostFlight` gained a leading `build` parameter in 0.8.1-alpha and
  `creep` in `test/probes/column.mjs` was updated to pass it, correctly, but the
  suite globs `test/*.test.mjs`, so a probe is reached only by `npm run probe`,
  and `test/probes.test.mjs` imported each probe to read what its `run()`
  destructures without ever calling it. `ghostFlight`'s own side of the move is
  watched - `the harness steps a bolt at the engine's speed, not a figure of its
  own` in `test/pulse-cannon.test.mjs` calls it at two speeds and fails if the
  parameter goes away - so what nothing reached was the call in the probe. Left
  on its old two-argument form, `creep` would have taken the whole probe down
  with a `TypeError` on the first staged target, with 536 tests passing and
  `npm test` green, because the only thing that runs a probe is `npm run probe`:
  nothing failed, because nothing looked.

  Two assertions now reach past the flag table. Every probe that imports
  `test/engagement.mjs` is run on the smallest workload the rig can describe -
  one grid, one build, one placement, one pass - with what it prints collected
  rather than printed, and has to come back with a report; and the `column`
  probe's two creep rows have to carry a column figure at each of the four
  distances rather than a dash. Which probes are run is read off their own
  source, so a probe that starts calling the harness is covered without a line
  being added, and `overlay-anchor` is the one left out: it imports no harness to
  reach and reads no flags to be narrowed by. Checked against both mispairings,
  and both are throws rather than dashes: the old two-argument call leaves
  `ghostFlight`'s third parameter undefined and it cannot destructure `x` out of
  it, and the swapped argument list reads `state` off the build. Either one
  fails both assertions, since running the probe at all is what meets them. The
  dash the second assertion reads for is the other way a creep row goes wrong -
  `ghostFlight` finding no contact in its 400 frames - which is the one the rig
  prints and exits zero on.

### Internal

- The limit the centring does not cover is recorded beside `glyphInset` rather
  than fixed. The three shade blocks each reach a whole pixel left of the origin
  they are drawn at, at every font size, read off `actualBoundingBoxLeft`. The
  inset normally covers that bearing and at nine of the eleven sizes nothing is
  drawn left of a run's first cell, but at font 13, inset 0.099px, and font 8,
  inset 0.100px, a tenth of a pixel is not enough: a run of the full block with
  an empty cell to its left inks the column left of that cell at level 39 of 255,
  which is the level the left-packed grid put there too. The centring neither
  caused it nor was expected to clear it. Flooring the inset so it always cleared
  the bearing would cost the placement its symmetry, which
  `the inset never pushes a glyph out of its own cell` pins, and would buy that
  at the cost of a defect nobody has reported seeing on two of eleven sizes, so
  the arithmetic is left alone and the bleed is written down where the next
  person to touch the placement will read it.

## [0.8.1-alpha] - 2026-10-04

### Fixed

- The rationale for `geometricPrecision` claimed a mechanism this engine does
  not have, in four places: the doc comment on `tuneText` in `index.html`, the
  0.8.0-alpha entry below, the name and comment of `test/menu-layout.test.mjs`'s
  `the grid is drawn with hinted rounding off`, and the published sentence in
  `docs/how-it-works.html`. All four said the centring was only worth having
  with the request set, on the ground that a canvas left to itself rounds a
  glyph's position to a whole pixel and snaps the inset back to zero.

  It does not, here. A six-glyph run drawn at the page's own `FONT` and `cellW`
  came back byte-identical under `textRendering: 'auto'` and under
  `geometricPrecision` with kerning off, for `░ ▒ ▓ █ ╣ M` at 16, 8, 7 and 6
  pixels, left-packed and centred, in both colour schemes - 96 comparisons in
  chromium with no pixel column differing by one level. The fractional position
  is honoured either way, so the centring stands up on its own and the request
  is insurance against an engine that would round it.

  Both settings and both capability checks stay: nothing measured argues for
  removing them, and the case they cover is real in another engine. What changed
  is the four claims. The test's assertions were correct and are untouched -
  `textRendering`, `fontKerning` and `textBaseline` are all genuinely set - so
  only its name and the comment above it moved, and what it pins is that the
  page asks, which is the part a renderer can lose.

  The comment now also carries what the centring has to work with, which none of
  the four said. `cellW` is the ceiling of the advance, so the slack is always
  under a pixel and the inset, being half of it, can never reach half a pixel:
  across the 6 to 16 font range it runs 0.099px to 0.500px, and it is never zero.
  The three figures this paragraph first carried were derived from an advance of
  0.6 em the font does not have, and are corrected in the 0.8.2-alpha entry
  above.

- The gamepad entry below recorded its release rule as verified by a `D` held on
  the keyboard. `D` is not one of the nine names `PAD_CONTROL_KEYS` holds -
  `LEFT`, `RIGHT`, `UP`, `DOWN`, `SPACE`, `ENTER`, `F`, `Q` and `E` - so the
  poll's release loop never visits it, and that reading would have come back the
  same with the rule deleted. Re-run on an arrow, which is a collision the
  rule exists for: `ArrowLeft` held for half a second against a resting stubbed
  pad stayed down and carried the ship 4.27 units left, and with
  `padWasHeld?.[k]` dropped from the release branch so every reported up is fed
  straight through, the same reading came back with the key cleared and the ship
  unmoved. A `D` survives both pages. The rule itself was never in doubt - it is
  pinned at the seam the suite can reach by `the page polls the pad once a frame
  and releases only what it pressed` - and what is corrected is the sentence
  saying how it was checked live.

### Internal

- The engagement harness steps a bolt at the engine's speed rather than a figure
  of its own. `BULLET_SPEED` arrived in both builds in 0.8.0-alpha and `BUILDS`
  has carried it for each since, but three sites in `test/engagement.mjs` still
  wrote the travel out as `60 * dt`, in `ghostFlight`, `watchEngagement` and
  `flyFreely`. Nothing failed, because 60 is what the constant holds; the cost
  was that the rebuilt frame those three compute is what every reach, band and
  pairing reading is measured against, so moving `BULLET_SPEED` would have left
  the harness measuring the old cannon while the parity check on the pair still
  passed. All three read `build.BULLET_SPEED` now, the way `volleyLife` already
  reads the life off `build.BULLET_LIFE_SLACK`. `ghostFlight` takes the build to
  do it, and `creep` in `test/probes/column.mjs` passes it through.

  The `advance` 60 beside each one is a different figure - units of depth per
  unit of speed, the engine's own literal in `updateObstacles`, read against
  `s.speed` - and is left alone, with a word at each site saying which figure it
  is.

  Pinned two ways, because one site flown is not three sites covered. A walk
  flown with the speed doubled has to meet its target before it closes as far,
  which fails on the written-out figure and passes on the constant; and the
  harness is read as source for a bare `60 * dt` on any line, which reaches all
  three at once.

## [0.8.0-alpha] - 2026-10-03

### Added

- A standard-layout gamepad is the browser build's third way in, beside the
  keyboard and the touch controls. The left stick steers, `A` fires during a run
  and confirms everywhere else, `B` boosts, and the two triggers roll left and
  right. It feeds the same two key maps the other two feed, so nothing
  downstream knows which one is flying a run.

  Read by position in the standard layout, and only from a pad that reports
  that layout: a wheel or a flight stick read by the same indices would steer on
  whatever axis happened to come first, which is worse for the player than a
  controller the game ignores. The stick goes through the on-screen
  thumbstick's own reading at a radius of 1, so one dead zone and one set of
  eight even sectors govern a thumb on glass and a thumb on a controller, and a
  change to either tuning moves both or neither. `A` picks its key through the
  same function the on-screen `FIRE` button asks, because the title screen, the
  debug menu and the game over screen all wait on an `ENTER` a pad has no other
  way to send.

  Polled once a frame rather than listened to, since the Gamepad API has no
  button events - it hands out a snapshot when asked and nothing else. The poll
  releases only the keys it pressed: a controller reports everything it is not
  holding as up, and feeding those straight through would have a pad left on a
  desk clearing the keyboard's keys sixty times a second. Every slot is read
  together rather than one being chosen, because which slot a controller lands
  in is not the player's business - browsers leave gaps, fill a different slot
  after a reconnect, and some drivers report one physical pad twice.

  `A` also keeps the key it went down on until it comes up, which a poll needs
  and a listener does not: the mode it reads against changes under a button
  nobody moved. A run ending with fire held was the case that mattered - the
  poll after the death read the same unmoved button as the `ENTER` the game over
  screen waits on, so the screen was confirmed one frame after it appeared and
  the score was never there to read. On a flight with `A` held throughout, the
  run died on frame 2089 with 8425 points and was already back at zero on frame
  2090. `holdButton` has never had the problem, because it resolves the
  on-screen `FIRE` button's key once at the pointerdown and holds it to the
  release, and this is the same rule for a button that is polled. It errs the
  same way too: a hold carried across a mode change sends the key it was pressed
  for, so the next thing has to be pressed for rather than fallen into.

  Verified in a chromium window against a stubbed `navigator.getGamepads`: the
  stick moved the ship and let go of it, `A` raised a volley of three, `B` set
  the boost and cleared it, the left trigger rolled to `rollDir -1`, and an
  arrow held on the keyboard survived a resting pad. An arrow is a collision the
  release rule exists for, since `PAD_CONTROL_KEYS` is `LEFT`, `RIGHT`, `UP`,
  `DOWN`, `SPACE`, `ENTER`, `F`, `Q` and `E` - the keys the release loop visits,
  and `mapKey` reaches all nine, the four directions through the arrows rather
  than through `WASD`. `ArrowLeft` held for half a second against a resting pad
  stayed down and carried the ship 4.27 units left; with `padWasHeld?.[k]`
  dropped from the release branch so every reported up is fed straight through,
  the same reading came back with the key cleared and the ship unmoved. A `D`
  survives both pages, which is why it is not the key this is checked on.

### Changed

- A bolt now reaches the whole depth the tunnel is drawn to. Its life was a flat
  two seconds and it travels sixty units a second, so about 120 units of travel
  plus whatever the target closed in that time put the furthest reach a little
  over 150; `maxViewZ` is 200. Flown dead ahead at every ten units from 30, this
  landed to 170 and missed from 180 up at 80x24 in both builds - the outer fifth
  of what the player could see, with nothing on screen saying why.

  The life is read off the draw distance now rather than written down as a
  figure, so the two cannot drift apart again, and the reach itself is enforced
  where it belongs: `updateBullets` retires a bolt that was already out past
  `maxViewZ` when the frame opened. Out there it has nothing left to register
  against - `contacts` drops every target drawn beyond that depth - and the
  projection clamps, so carrying it on would leave it frozen at the vanishing
  point still taking contacts against whatever shared its column. Read before
  the step rather than after it, so the frame that carried a bolt across is
  taken in full first: that is the frame a target parked at the far edge dies
  on. It also keeps the exit exclusive with a kill, which is what lets the free
  flight tell a bolt that was spent from one that simply ran out of reach.

  Every range from 30 to 200 now lands dead ahead, single shot and volley, in
  both builds at all three grids. The placement walk out at 140 to 200 lands
  52/58, 60/60 and 47/60 with the volley, which is the band pinned beside the
  existing ones in `test/pulse-cannon.test.mjs`.

- Characters are drawn centred in their cells rather than packed against the
  left edge. A cell is a whole number of pixels wide, because a grid laid out on
  fractional columns accumulates the fraction across the row and loses its last
  column off the canvas, so every cell carries the difference between its width
  and the advance the font draws at - all of which used to sit in one gap on the
  glyph's right. Measured live at font 16 the advance is 9.60 in a 10-pixel
  cell, and at the small end 6.60 in a 7-pixel cell: a fifth of a pixel either
  way, which is a real share of a cell at `MIN_FONT_SIZE` and matters most to
  the box characters the tunnel walls are built from, since those are drawn to
  tile edge to edge. Centred, the seam between two of them reads best where that
  difference is widest, which is where it read worst left-packed; where the
  difference is narrow the centring does nothing, or a little harm. The figures
  are in the comment on the placement in `index.html` and in the 0.8.2-alpha
  entry above, which is where the uniform claim this sentence used to make was
  narrowed.

  The canvas is asked for `geometricPrecision` text and no kerning. That is
  insurance rather than what makes the centring worth having: chromium honours
  the fractional position either way, so an engine that rounded a glyph's
  position to a whole pixel - and snapped the inset back to zero - is the case
  the request covers rather than the case this build is in. The cell is measured
  under the same tuning it is drawn under, or the figure would be the hinted
  width while the drawing used the precise one. Both properties are set behind a
  capability check and neither has a fallback, because neither has anything to
  fall back to: a context without them draws the grid exactly as this build drew
  it before.

### Fixed

- The free flight's kill pairing read a contact as a tracer nothing drew when
  the frame's two ends had failed for opposite reasons. `unlit` says a block was
  drawn with no tracer on it and `hidden` says there was no block drawn to read,
  and one of each means both halves of the pair were drawn during the frame and
  never in the same reading - out at the far end of the tunnel, where a frame's
  travel is worth several rows, a tracer can climb out of the play area as the
  block it met comes up into it. The contact the sweep took sits on a step
  between the two ends, so neither end speaks for it; the ranking preferred
  `unlit` and reported the frame as a kill with no bolt behind it. It abstains
  now, which is what `hidden` already meant for a shot raised inside the frame
  that resolved it.

### Internal

- The page's re-seating of a run on a new grid is a function of its own,
  `seatGrid`, lifted out of `handleResize` the way `fitGrid` already was and
  exported through `test/helpers.mjs`. What is left in the handler is the
  window's business - the canvas, the font string, the CSS variables - while the
  one place a resize reaches into a live run is now somewhere the suite can
  reach. Both it and the `frame()` branch that draws the too-small notice sat
  below the `// ===== Canvas Setup & Sizing =====` marker, so a browser was the
  only thing that had ever checked either.

  Pinned at both ends and across the round trip: re-seating a playing run at a
  grid under the floor and again at one above it leaves `mode`, `score` and
  `distance` untouched and leaves the buffer at the new grid's size, the
  starfield is re-laid inside every grid it is seated on, the handler is read as
  source to confirm it still routes through the lift, and the notice branch is
  read to confirm it returns before the run is advanced. Confirmed live in a
  chromium window: a run at 900x600 taken down to 200x120 and back came up on
  the same run, score 701 both ways down and `fits` false in between.

  Browser only. A terminal cannot be made smaller than the grid it is showing,
  so the CLI build has no equivalent and `test/parity.test.mjs` has nothing to
  pair any of it with.

- `BULLET_SPEED` and `BULLET_LIFE_SLACK` are named constants in both builds, and
  `test/parity.test.mjs` holds them to the same figures along with the draw
  distance they are sized against.

## [0.7.8-alpha] - 2026-10-02

### Fixed

- The opened Reference dropdown on the documentation site overran the viewport
  from 951px to 1049px. The breakpoint move in 0.7.5-alpha put the wide layout
  where the *collapsed* row fits, and nothing more; `.menu` is left-packed, so
  every panel hangs rightward from the left edge of its own group, and the last
  group's left edge is far enough along the row that its panel needed 1050px.
  Measured in chromium over HTTP, identical in both colour schemes: the panel ran
  841.47px to 1049.73px at every wide width up to 1049px, which is 98.73px past
  the edge of a 951px viewport with the panel 52.6% on screen, `Project Structure`
  clipped to `Project Str`, and all four entries taking focus with their outline
  off-screen. Nothing could scroll to them - `.nav` is `position: fixed`, so
  `scrollWidth` stayed equal to the viewport width across the whole band. The last
  group's panel is now anchored to its own right edge instead, hanging inward into
  room the row has by definition, which puts it at 742.89px to 951.16px at 951px.
  Positional rather than naming Reference, so an entry added after it is covered
  too.

  The breakpoint stays at 950/951, which is a decision rather than an oversight.
  The row's natural width is 951.16px, so a right-anchored panel inherits a sixth
  of a pixel of overhang at a 951px viewport; it paints nothing outside,
  `scrollWidth` stays equal to `clientWidth`, and 951.16px is a font metric that
  moves with any change to the eight entries' text. Moving to 952px would spend
  the fraction at the price of pinning a layout boundary to the fractional part of
  a measurement, so the integer stands and the stylesheet and
  `DESIGN_LANGUAGE.md` both record why.

### Added

- A check that the last menu group anchors its dropdown to its own right edge,
  read as the agreement between two declarations rather than as a drawn width -
  the project has no browser runner and must not gain one. It is the same shape as
  the caret checks beside it: which of two rules naming `.sub` wins, per layout.
  It also asserts the override outweighs the base rule rather than merely
  following it, that the narrow layout leaves `.sub` static where neither offset
  applies, and that all ten pages still end their menu with a group - the selector
  is positional, so a plain entry in the last place would match nothing, silently,
  and put the panel back over the edge.

### Changed

- `styleSheet` in `test/page-style.mjs` walks every rule it parsed and refuses a
  sheet carrying a functional pseudo-class, where before only `specificity` refused
  one, and only for a selector a caller had already named. That left the silent
  case open, because every reader in this module matches a selector whole: add
  `.has-sub:not([aria-expanded]) > .sub { display: none }` to the site's sheet and
  the dropdown fold returned exactly what it returned before, with a rule that
  really applies left out of it, and measured against the previous commit, 479 of
  479 passing. The same rule now fails the suite naming the selector, and the two
  sheets this repository ships are asserted to still be readable, so the guard is
  pinned as off today rather than assumed to be. Each of the two is read through
  the call the rest of the suite reads it through: `styleSheet` for the site's
  `.css` file, `pageStyle` for the game page. So that half of the assertion is over
  the page's stylesheet rather than over the whole file, whose markup and script a
  brace-walking parser takes for 237 further rules of their own.
- Two records of what that work covered, corrected in the 0.7.7-alpha entry above
  and in the test files themselves. `specificity` was weighed by one test file
  before it got tests of its own, not three; three files read a stylesheet through
  the module, two for lengths and one of those a probe. And the throw answered for
  a selector a caller weighed rather than for a sheet, which is the gap the walk
  above closes.
- `DESIGN_LANGUAGE.md` records the anchoring and the sixth of a pixel beside the
  breakpoint bullet that measured the row, since the one is what the other does not
  guarantee. `docs/development.html` and `docs/project-structure.html` name the new
  check and the sheet-wide refusal in their accounts of the suite.

## [0.7.7-alpha] - 2026-10-01

### Fixed

- The emphasis stripper added to the page-against-file check last turn reached
  inside inline code. It ran before `flatten` drops the backticks, so it had no
  way to tell a code span from prose and took the markers out of both: `` `__init__` ``
  resolved to `` `init` `` on the file side while the page carried
  `<code>__init__</code>` and resolved to `__init__`, reporting a block as
  missing from a page that holds it verbatim. That is a false failure in the one
  check written to catch real drift. The code spans are now held out of the
  stripping, each one standing in as a single character while the markers are
  taken off and put back afterwards, which is the order markdown itself resolves
  the two in. The function is pinned on its own, because nothing in
  `QUICKSTART.md` or `CHEATSHEET.md` carries a `*` or a `_` yet, so the check
  that calls it never reaches it.
- The same fault in the other direction, found reviewing the fix above. Taking
  the spans aside by splitting the text at them and stripping each run of prose
  between them separately keeps a marker that sits inside a span, which was the
  reported half, and loses the pair that wraps one: `` **`--debug`** `` is
  `**`, a span and `**`, so the two markers land in different runs, no pass sees
  a pair, and both survive onto a side whose page writes them as
  `<strong><code>` and carries neither. Measured on the helper: four shapes of
  wrapped emphasis resolved to a file side the page could not match, so a block
  carrying any of them was reported missing from a page holding it word for word.
  `DESIGN_LANGUAGE.md` writes five of its list items that way, and the pairing is
  read off `docs/project-structure.html`'s own "X.md as a page" lines, so the
  next file published as a page brings the shape with it. Standing a span in as
  one opaque character answers both halves at once, and all four shapes are
  pinned beside the two that were.

### Added

- A check that the narrow layout shows every dropdown list, in both
  `aria-expanded` states. `docs/assets/style.css` gives the narrow `.sub` a
  `display: block`, and that one declaration is the only thing drawing the four
  pages under Reference below the breakpoint - the reveal rule is keyed on
  `aria-expanded="true"`, and last turn's script change clears that attribute on
  the way down, which made the narrow rule load-bearing rather than a second
  route. Nothing in the suite read either rule: taking `display: block` out left
  472 of 472 passing with `Project Structure`, `Terminal Requirements`,
  `How It Works` and `Cheatsheet` unreachable at every narrow width, which is
  the 0.7.5 defect back. Both layouts are read, because the wide half alone
  would not have caught it.
- `test/page-style.test.mjs`, the resolver's own tests. One test file weighed
  `specificity` before this one, `test/docs-site.test.mjs`, where the nav geometry
  walk rests on the order it returns - and its only exercise there was the two
  selectors that file's caret check names, so every count was trusted and none was
  read. Two weigh it now. Three files read a stylesheet through the module for
  what it says, two of them for lengths rather than for cascade order and one of
  the three a probe rather than a test. It now pins a table of selectors
  against the triples CSS weighs them at - the id, class, attribute,
  pseudo-class, pseudo-element and `*` cases, and both colon spellings of all
  four CSS2 pseudo-elements, since `a:before` weighs (0,0,2) as a pseudo-element
  while `a:hover` weighs (0,1,1) as a pseudo-class - plus the comparator's
  ordering of the caret pair that the specificity work was done for.

### Changed

- `specificity` in `test/page-style.mjs` throws on a selector carrying `:not(`,
  `:is(`, `:where(` or `:has(` rather than answering. CSS takes the first three
  from the most specific selector inside the parentheses and `:where()` from
  nothing at all, while the pseudo-class pass counts any of the four as one
  plain class - a plausible count, and sometimes the right one. The guard answers
  for a selector a caller hands in; the sheet-wide half of it arrived in
  0.7.8-alpha. It matches the colon, so `.has-sub`, which the site's nav is
  full of, is not read as a `:has()`.

## [0.7.6-alpha] - 2026-09-30

### Fixed

- A documentation-site dropdown left open on the wide layout kept its caret
  after the window narrowed. The narrow block's
  `.has-sub > button::after { content: "" }` is (0,1,2) and the top-level
  `.has-sub > button[aria-expanded="true"]::after { content: "^" }` is (0,2,2),
  and a media query contributes no specificity, so the narrow rule could not
  reach the open state however the file was ordered. Reference is the one
  dropdown button the narrow layout still shows, and it shows it as a static
  label with `cursor: default` - so the label read `Reference ^`, advertising a
  control that no longer toggles anything. The narrow block now blanks both
  states.
- The same sequence left `aria-expanded="true"` on that label. `docs/assets/docs.js`
  set the attribute only while the wide query matched and had no listener to put
  it back, so the state survived a resize onto a layout that cannot change it.
  The script now closes every group when the layout changes under it.
- The site's layout resolver in `test/docs-site.test.mjs` read any width query as
  the narrow layout's. It matched on the property and not the bound, so a
  `min-width` block would have been folded into the layout it is switched off in
  and left out of the one it is switched on in - wrong in both directions at
  once, and invisible while the stylesheet carried exactly one query. The bound
  now decides: `max-width` is the narrow layout's half of the boundary and
  `min-width` is the wide layout's.
- The check that a page carries all of the file it is published from compared
  prose and dropped every list item, so it read 6 of `QUICKSTART.md`'s 15 blocks
  and 9 of `CHEATSHEET.md`'s 13. The gameplay list and the terminal-requirements
  list were not compared against their pages at all: deleting a whole `<li>` from
  `docs/quickstart.html` left the suite green. A bullet becomes `<li>` and
  survives the normalizing the check already does, unlike a table or a fenced
  block, so list items are now compared too - marker off, indented continuations
  joined onto their item. Every one of the 13 was already on its page.

### Added

- Specificity to `test/page-style.mjs`, as the three counts CSS orders by. The
  resolver folded rules in document order and modelled no specificity at all,
  which is why the caret above could sit unseen while the bar-height walk was
  built on top of the same module. `test/docs-site.test.mjs` now folds a
  selector's rules the way the cascade does - specificity first, document order
  breaking a tie - and asserts which `content` wins for
  `.has-sub > button::after` in each layout and each `aria-expanded` state.
- A check that the stylesheet names no width query the layout resolver cannot
  place. It already asserted there was exactly one `max-width`; it now accounts
  for every query naming a width, so a second bound at some other value fails as
  the third layout it would be rather than being sorted into one of the two by
  default. The leftover it looks for is any mention of a width rather than a
  `width:` one, because media range syntax writes the bound as a comparison -
  `(width <= 950px)` - and a guard keyed on the colon reads that as naming no
  width at all and lets the block into neither layout.
- A check that `docs/assets/docs.js` listens for the layout changing under it
  and closes the groups when it does. The stylesheet can take the caret away,
  but the attribute underneath it is the DOM's and only the script can clear it.

### Changed

- Emphasis markers are stripped from the file side of the page-against-file
  check, alongside the inline code markers already dropped. `**x**` reaches the
  page as `<strong>x</strong>` and the tags are gone from that side, so the first
  paragraph to gain emphasis would have been reported as missing from a page
  carrying it. Identifiers survive: a marker only opens emphasis where a word
  character does not run into it, so `THEME_BG` and `snake_case` are left whole.

## [0.7.5-alpha] - 2026-09-29

### Fixed

- The documentation site's nav switched to its wide layout 90px before that
  layout fitted. The wide row of eight entries does not wrap and is 951px wide,
  measured in chromium, but the switch happened at 861px - so between 861px and
  950px the Reference group was painted past the right edge of the screen, 17.8%
  of it visible at 861px and 9.4% with the list open. Nothing could reach it:
  `.nav` is `position: fixed`, so the overflow never reached the document and
  there was no horizontal scrollbar at any of those widths, and keyboard focus
  landed on a control the browser cannot scroll into view. Four of the site's ten
  pages had no usable route in that band. The breakpoint now sits where the row
  fits - `max-width: 950px` in the stylesheet, `min-width: 951px` in
  `docs/assets/docs.js` - and the 90px band goes to the narrow layout, which
  stacks the entries and was already verified across it.
- `DESIGN_LANGUAGE.md` said one rule read the spacing scale's 64px step. Two did:
  the scroll offset for an in-page anchor at `:64` of the stylesheet as it stood,
  and the page frame's top padding at `:151`. The changelog entry for the same
  removal said two, so the two records of it could not both be read as written,
  and the design file is the one the stylesheet's own header points at as the
  record of where each value came from. It now names both.

### Added

- A check in `test/docs-site.test.mjs` that the two halves of the layout
  breakpoint name adjacent pixel values. It is carried in two files in two
  syntaxes - a `max-width` media query and a `matchMedia('(min-width: ...)')` -
  and out of step in either direction the script and the stylesheet disagree
  about which layout is showing. It does not catch the row outgrowing the
  breakpoint, which needs font metrics; that limit is recorded in the test, and a
  browser is still the only thing that measures the row.
- A check that a page published from a repository file carries every prose
  paragraph of that file. `docs/project-structure.html` calls two of its pages
  "X.md as a page" and nothing compared either pair, so an edit to the file that
  missed the page was silent - and it was missed on two consecutive runs in the
  same paragraph of `CHEATSHEET.md`. The pairing is read off that listing rather
  than named in the test, so a third file published as a page is covered without
  a second edit. Prose only, and one direction only: tables and fenced blocks are
  reformatted on their way to a page, and the pages carry a nav and a pager the
  files have no equivalent of.

### Changed

- The bar's height check walks every direct child of `.nav-bar` and takes the
  tallest, in both layouts, rather than reading the menu column and calling it
  the bar. The check was named for the bar and answered for one child out of
  three: adding `padding: var(--s3) 0` to `.brand` took its box to 50.40px, past
  the menu link's 42px, and drew a 68.40px bar against the 60px `--bar` declared
  with the whole suite green. The walk is checked against the markup, so a fourth
  child added to the bar fails rather than being left out of the maximum, and the
  narrow layout's `--bar` is now covered by the same walk against the MENU
  button - a figure a browser had been the only thing to see.
- `.brand` and `.nav-toggle` state their own line box, the way `.menu a` and
  `.has-sub > button` already do. Both are children of the bar, so both decide
  its height, and `.brand` was deciding it off the body's 1.65 ratio against a
  16px base - 26.40px that no token named. The brand's ship is sized from `--s5`
  for the same reason, so the mark and the text beside it are one height.
- The narrow layout's `--bar` is written as the terms it is made of rather than as
  `--s7` plus 2px. The sum is the same 50px, but `--s7` folded the MENU button's
  own box together with the bar's padding into one token that named neither, so a
  change to `--s2` moved the wide `--bar` and left the narrow one declaring a
  height nothing drew.

## [0.7.4-alpha] - 2026-09-28

### Added

- `test/probes.test.mjs`, the first coverage the measurement rig has. Four
  checks: every probe takes exactly the flags `test/probes/probes.mjs` lists for
  it, read off the parameters its own `run()` destructures; the table names
  every flag the rig parses and no others; a refused flag exits non-zero with a
  message naming it; and naming no probe prints the table. The last two are
  spawned end to end, because a non-zero exit is what `CHEATSHEET.md`,
  `docs/cheatsheet.html` and `docs/development.html` all promise a caller.
- `test/probes/probes.mjs`, the probe table in a module something can import.
  `test/probes/run.mjs` reads `process.argv` at the top level and awaits the
  probe it names, so nothing could read the table without running a probe -
  which is why the table went unchecked for as long as it did.
- Four checks in `test/docs-site.test.mjs`, all decided from the stylesheet as
  text and none needing a browser: the caret button draws the same border box as
  the link beside it, the bar draws the height `--bar` declares and the scroll
  offset clears it, every dropdown button is named by an `aria-label`, and the
  sheet resolves to the scheme it is written in. A browser was the only thing
  that had ever checked the first two, and neither was right.
- `--clear` in `docs/assets/style.css`: what it takes to clear the fixed bar,
  as `--bar` plus a `--s2` gap. The scroll offset for an in-page anchor and the
  page frame's top padding both read it.

### Changed

- `declarationsFor` in `test/page-style.mjs` folds the top-level cascade only.
  A rule inside an at-rule is left out rather than folded in, because the module
  has no viewport and no colour scheme to test a prelude against. A caller that
  wants a conditional block walks `rules` and reads `at` itself, which is what
  `test/docs-site.test.mjs` already does for the rule that reveals a dropdown.
- `--bar` is declared once per layout rather than once. Wide it is a menu entry
  - a `--s5` line box with `--s2` above and below it inside a 1px border - in
  the bar's own `--s2` padding under its 2px bottom border, which is 60px.
  Narrow the menu hangs off the bottom of the bar instead of sitting in it, so
  the bar is the MENU button and stays at `--s7` plus 2px, 50px.
- The menu's links and its dropdown buttons state their line box as `--s5`
  rather than inheriting the body's 1.65. That is the one term in the bar's
  height that was not already a token, and it is what makes the link and the
  caret beside it the same height.
- The spacing scale's 64px step is gone from the stylesheet. `--s8` had exactly
  two readers, the scroll offset and the page frame's top padding, and both read
  `--clear` now; `DESIGN_LANGUAGE.md` records the scale as `--s1` through
  `--s7` and says why.
- `test/probes/run.mjs` imports the table instead of declaring it, and its
  header says where the table went and what reads it.

### Fixed

- The fixed bar drew 83.09px on a desktop against the 50px `--bar` declared.
  `.menu` is a `ul` and its entries are `li`, so `p, ul, ol, table, pre` gave
  the menu a 16px bottom margin and `li` gave each entry 8px, and both landed
  inside a bar that reasoned about neither. Measured in chromium at every width
  from 861px to 1920px; 860px and below were correct all along, which is why the
  one rule that reads `--bar` - the collapsed menu's `max-height` - never looked
  wrong. The nav's lists state their own spacing now, with the `--s2` between
  the open phone menu's entries restated as the menu's `gap`. The drawn bar is
  60.00px at every one of those widths and `--bar` resolves to 60px.
- Seven of the eight in-page anchors the nav carries parked their heading
  underneath the bar. `scroll-padding-top` was `--s8`, 64px, picked to clear a
  50px bar and 19px short of the 83px one: at 1280x900 `usage.html#controls` was
  19.15px behind it, `development.html#tests` 19.06px, and
  `getting-started.html#play-in-terminal` 13.75px, with roughly the top half of
  each `h2` hidden and nothing on screen saying why. All eight clear the bar
  now, by 7.94px to 9.34px. `.wrap`'s top padding was the same miscalculation
  and was 2px under the bar on a phone.
- The caret buttons drew a shorter box than the link beside them. Their only
  flex item is the 10px `::after`, so the line box came to 16.50px where the
  link's was 23.10px, and the border boxes to 34.50px against 41.09px -
  `.has-sub`'s `align-items: center` then centred the shorter one, so moving the
  pointer or the focus from a page link onto its own caret shrank and re-centred
  the outlined box. On `docs/usage.html` it showed with no interaction at all:
  the current page's underline was painted at y 49.09 and the caret's bottom
  border at y 45.80. Both are 42px now at every wide width measured. The glyph
  is still 10px - that is its font size, not its box.
- The Reference button announced the caret glyph as part of its name. CSS
  generated content is not in the DOM but does take part in the accessible name,
  and Reference is the one group whose button carries its own text, so its name
  was computed from contents: read out of the accessibility tree in chromium it
  was `"Reference v"` closed and `"Reference ^"` open, which reads the
  decoration aloud and re-reads the name on every toggle that `aria-expanded`
  already carries. It carries `aria-label="Reference"` now, the same mechanism
  the three caret-only buttons already used, and
  `getByRole('button', { name: 'Reference', exact: true })` matches it.
- `test/page-style.mjs` recorded the at-rule preludes every rule sits inside and
  then folded rules regardless of them. On `index.html` this could not show -
  one `:root`, no `@media` - but on `docs/assets/style.css`, which
  `test/docs-site.test.mjs` points the same module at, `styleSheet(css).properties`
  came back as the light scheme: `--page` resolved to `#f2f2f4` where the base
  block declares `#000000`. The doc comment called those "the custom properties
  the sheet declares on `:root`", which is the dark scheme, so the function and
  its own description disagreed.
- The probe rig's flag table was the contract and nothing checked it. Its own
  comment says "a probe gaining or losing an argument is a line changed here
  rather than a flag silently ignored", and nothing in `test/` reached it:
  dropping `count` from the destructuring in `test/probes/column.mjs` left
  `npm run probe -- column --grid 80x24 --build browser --count 6` accepted,
  still printing "contact: 24 placements" and still reporting a figure a caller
  reads as a narrowed walk, with all 460 tests green. That mutation now fails
  the suite, naming the probe and what it destructures against what the table
  lists.
- `docs/cheatsheet.html` is the page `CHEATSHEET.md` is published as, and it was
  two edits behind it. This release's paragraph naming `test/probes/probes.mjs`
  and `test/probes.test.mjs` was missing from the page entirely, and 0.7.3's
  "and which flags each probe takes" was missing from the sentence above it, so
  the site's Probes section had said neither. Both are on the page now, and
  every prose paragraph of `CHEATSHEET.md` and of `QUICKSTART.md` is carried by
  the page it is published as. Nothing in the suite compares the two, which is
  why it went twice.

### Notes

- 468 tests, from 460. All eight new ones were checked by mutation: each fix was
  reverted in turn and the assertion written for it failed, including the two
  that only a browser had ever caught.

## [0.7.3-alpha] - 2026-09-27

### Added

- `test/docs-site.test.mjs`, the first coverage the suite has of the
  documentation site. It needs no browser: the menu and the palette are checked
  as the text of their own files, the way `test/browser-shell.test.mjs` already
  reads `index.html`. Four checks - the nav is the same markup on all ten pages,
  every group carrying in-page anchors has the control that reveals it, every
  in-page anchor names an `id` that exists on the page it points at, and every
  custom property the stylesheet declares reaches a reader.
- `test/page-style.mjs`, the CSS resolver lifted out of
  `test/browser-shell.test.mjs` so the suite and `test/probes/overlay-anchor.mjs`
  read one copy of it. It parses a stylesheet rule by rule, folds the
  declarations that apply to a selector, and resolves a length against a
  viewport - custom properties, `calc`, `min`, `max`, `px`, `vw` and `vh` - or
  throws. Rules are walked brace by brace rather than matched with a regex over
  `{...}`: the regex finds the rules inside an `@media` block but reads them as
  though they were top level, so nothing downstream can ask which block a rule
  belongs to.
- `overlayVars` in `index.html`: the two custom properties the touch overlay
  reads, as a map of property name to CSS length, above the
  `// ===== Canvas Setup & Sizing =====` marker where the suite can execute it.
  `handleResize` now hands that map to the root element's style and works out
  nothing of its own.

### Changed

- The probe rig refuses a flag the named probe does not read instead of
  discarding it. `npm run probe -- overlay-anchor --grid 80x24` was accepted and
  silently ignored, so a figure could be quoted from a grid nothing ever looked
  at. It now exits non-zero and says which flags that probe takes, and
  `npm run probe` with no name prints the flag list for all six.
- `test/probes/overlay-anchor.mjs` resolves `--ctl` and `--stick` out of the
  stylesheet through `test/page-style.mjs` rather than restating them in
  JavaScript. The resolved sizes were checked against the arithmetic they replace
  at all 682,500 viewports the probe walks and agree to the pixel at every one,
  so the probe's reported figures are unchanged: 158,235 viewports misplaced a
  control before the band bounded the controls, and none do after. The
  historical pair stays written out, because those two lengths are gone from the
  stylesheet and this file is the only record of them.
- The three dropdown groups that are pages as well as groups keep their link at
  the top level and gained a caret button beside it that opens the list, so the
  page stays one click away and its sections are two. Reference has no page of
  its own and is still a button alone. `docs/assets/docs.js` needed no change:
  it already collects `.has-sub > button`.
- `--warn` is gone from both colour schemes, with the `blockquote` rules that
  read it and the three places in `DESIGN_LANGUAGE.md` that measured it.
  `BRIGHT_YELLOW` joins `BRIGHT_GREEN`, `BRIGHT_RED` and `BRIGHT_MAGENTA` in the
  paragraph recording the accents the site deliberately does not carry.

### Fixed

- Three of the four nav dropdown groups could not be opened on a desktop.
  `.has-sub > button[aria-expanded="true"] + .sub` is the only rule that reveals
  a dropdown, and Getting Started, Usage and Development each labelled
  themselves with an `<a>`, so it never matched them; `docs/assets/docs.js`
  binds the same selector, so there was no handler on those three either. Their
  eight in-page anchors kept `display: none` with no control anywhere that
  changed it, and the caret is scoped to `> button` too, so the three dead
  labels advertised nothing. Below the 860px breakpoint every group is open
  already and all eight worked, which is what made it a desktop-only failure
  nobody saw. The nav is repeated verbatim in all ten pages and all ten are
  changed; a fix applied to nine of them now fails.
- The one accent `DESIGN_LANGUAGE.md` said the site used was on nothing the site
  has. `--warn` was declared in both schemes and read by exactly one rule, the
  4px left edge of a blockquote, and no page under `docs/` has a blockquote - so
  the value resolved correctly and reached no reader. Settled the way
  `--good`, `--bad` and `--warp` were settled one release ago, by dropping the
  property and the rule rather than keeping an accent the site has available and
  does not use.
- The probe rig's own header said every probe runs against both engines and that
  every probe takes a grid and a build, eleven lines above registering
  `overlay-anchor`, which loads the browser alone and whose `run()` takes no
  parameters. `CHEATSHEET.md`, `docs/cheatsheet.html` and `docs/development.html`
  were corrected for exactly this last release and the rig was left saying the
  old thing, so the three documents about the rig disagreed with the rig.
- `overlay-anchor` restated the rule it measures instead of reading it. The
  `bounded by the band` sizes were written out in JavaScript while the page
  carries them at `index.html:81-82`, so changing `--ctl` in the stylesheet left
  the probe reporting `0 of 682,500` for a rule the page no longer had, with the
  changelog quoting that 0 as a fact about the page. Unbinding `--ctl` now moves
  the figure to 158,235.
- `--footerpx` and `--playpx` were checked for being published, not for being
  published under the right names. The only assertions that reached the two
  `setProperty` lines were `assert.match(html, /setProperty\(\s*'--footerpx'/)`
  and its twin, so swapping the two arguments left all 454 tests green. That is
  not a near miss in a browser: swapped, a 375x667 phone resolves
  `--footerpx: 600px` and `--playpx: 31px`, which draws FIRE 4.4px across and
  607px up a 667px viewport instead of 90px across and 38px up, and no control
  is reachable by a thumb. The pairing is stated in `overlayVars` now and the
  suite reads both figures back off that map by name, so the same swap fails two
  tests.

## [0.7.2-alpha] - 2026-09-26

### Added

- `test/probes/overlay-anchor.mjs`, which walks the touch overlay over every
  viewport the game will play at rather than over a list of device shapes. A
  claim about every viewport is not something a list can support, and both
  figures quoted under Fixed below come from it: run
  `npm run probe -- overlay-anchor` to rebuild them. It takes no grid and no
  build, which is new for a probe here - a terminal has no overlay, and the
  viewport is the thing being walked rather than a setting.
- `footerBandPx` and `playBandPx`, the two figures the overlay is laid out
  against, lifted out of `handleResize` into functions of a fitted grid. The
  first was already published as `--footerpx`; the second is new and published
  as `--playpx`. `handleResize` sits below the
  `// ===== Canvas Setup & Sizing =====` marker `test/helpers.mjs` stops at, so
  nothing in the suite could execute either figure while it lived there.

### Changed

- The touch controls are sized against the band the game is played in rather
  than against the viewport. `--ctl` and `--stick` are each solved out of
  `--playpx`: whatever is left of the band once the offset and the gap are
  taken, shared between however many controls stand in it, capped as before by
  a share of the screen width and a pixel ceiling. On the eight device shapes
  the suite already walked, every control is drawn at exactly the size it was;
  only viewports too short for the old size shrink.
- `test/browser-shell.test.mjs` resolves the page's own custom properties
  instead of restating their arithmetic. Its CSS resolver reads the `:root`
  block out of the stylesheet and substitutes `var()` until the text stops
  carrying one, and its viewport model calls `footerBandPx` and `playBandPx`
  rather than computing the same figures a second way. Six short shapes and
  two at the floor of what the game plays at join the eight it walked.

### Fixed

- BOOST climbed back onto the HUD on a short viewport, which is the half of
  the anchoring fault the previous release did not reach. The controls were
  sized in viewport width while the room for them is measured in character
  rows, so the two came apart on anything short and wide: BOOST covered rows
  0-8 at 1180x300 and 820x300, rows 1-8 at 667x300, rows 1-9 at 932x330, and
  rows 2-9 at 740x330 and 740x320, where rows 0 to 2 are the SCORE / DIST /
  SHIELD row and the shield bar. The stick had the same fault on a narrow
  viewport and reached row 2 at 349x160. Walked over every viewport the game
  will play at, 158,235 of 682,500 placed a control on the HUD or the footer -
  BOOST at all of them, the stick at 51,843 - against none now.
- The figure the overlay hangs on was asserted nowhere. `--footerpx` was
  published from a function the suite cannot execute, and the only check on it
  was that the call appears in the file; the tests then computed the figure
  for themselves, so they agreed with a second implementation rather than with
  the page. Substituting `HUD_ROWS` for `FOOTER_ROWS` in that line left the
  whole suite green while every control sat a row too high. It now fails two
  tests.
- The Project Structure page gave `test/probes/` a line but never opened it,
  so the six files under it appeared nowhere while the README claimed every
  file under `src/`, `test/` and `docs/` was listed. The page opens `probes/`,
  and every tracked file under the three directories is now named on it.
- The `0.7.1-alpha` entry above described a README sentence that same release
  had rewritten, quoting the claim as `src/` and `test/` where the shipped
  README says `src/`, `test/` and `docs/`. The bullet now says what the file
  says.
- The development and cheatsheet pages both said every probe takes a grid and
  a build, which `overlay-anchor` does not. Both now say it is the probes that
  fly a shot that do, and name the exception.

## [0.7.1-alpha] - 2026-09-25

### Added

- The documentation is now a site under `docs/`, published by GitHub Pages
  alongside the game. The README had grown to 309 lines, past the 300-line
  threshold the automation measures it against, so its seven level 2 sections
  were split one to a page: Features, Getting Started, Usage (CLI), Project
  Structure, Development, Terminal Requirements and How It Works. The text was
  moved rather than rewritten - every word of those sections is carried into
  the pages, checked word by word against the README as it stood before the
  split - so nothing that was documented has been lost or shortened in the
  move.
- `QUICKSTART.md` and `CHEATSHEET.md`, both also site pages. The quickstart is
  the shortest path to flying, in a browser or a terminal. The cheatsheet is
  for someone who has already read the documentation and wants the keys, the
  flags, the scripts and the figures on one screen.
- `DESIGN_LANGUAGE.md`, recording where the site's look came from. Nothing in
  it was invented: the palette is the game's own `base16` table, the light
  theme is the game's own `LIGHT_INK` re-inking of it, and the geometry is read
  off `icon.svg`, which holds seven shapes and not one curve - which is why
  nothing on the site is rounded. Two values are not quoted from the game, and
  both are named there with the reason: `GRAY` (8) reaches only 2.82:1 on black
  and `LIGHT_INK[8]` only 3.06:1 on paper, so neither carries text, and muted
  text uses a compliant tone in each scheme instead. Every text pair on the
  site was measured and reaches at least 4.5:1.
- `.nojekyll` at the published root, so nothing on the site is dropped for
  beginning with an underscore.
- The touch overlay's geometry is pinned in `test/browser-shell.test.mjs`. Four
  checks resolve the `#stick`, `#fire` and `#boost` rules the way a browser does
  - `vw` and `vh` against the viewport, `aspect-ratio:1` taking the height off
  the resolved width, `max-width` capping both - then walk eight device shapes:
  two phones in portrait, four in landscape and a tablet each way. Each box is
  converted to the character rows it covers and checked against the rows the HUD
  and the footer own. Run against the rules as they stood before the fix below,
  they reproduce that fault's measured figures exactly - 55.4px of gap at a
  667px viewport, and the stick in row 19 of a 66x20 grid - which is how the
  assertions were checked before being trusted.
- `test/hud-row.test.mjs` covers the fourth thing drawn on the shared HUD row.
  The file was written for three tenants - the combo counter left-aligned, the
  debug label and the NEW BEST banner centred on it - and the warp banner has
  since become a fourth, drawn after the counter and so the one that would cover
  it. The counter and the banner are now walked together across the supported
  widths at three chain lengths and two warp levels, and the both-builds check
  covers three stagings rather than one. The margin held on arithmetic alone
  until now: the counter ends at column 9, and an eighteen-column banner starts
  at column 21 on the 60-column floor.

### Changed

- `README.md` is now a front door rather than a manual: 116 lines and 6,815
  characters, down from 309 and 23,059. Each section keeps a short stand-in -
  the install block, the flag list, the five keys that matter, the npm scripts
  - and its heading links to the page carrying the full text.
- The on-screen controls are anchored to the character grid rather than to the
  window. `handleResize` publishes `--footerpx` - the band at the foot of the
  viewport holding the footer's two rows and whatever the grid leaves unpainted
  below them - and the three control rules read it. No viewport unit can know
  how tall two character rows are, because that depends on the font the fitter
  settled on.
- `DESIGN_LANGUAGE.md` and `docs/assets/style.css` agree again. The stylesheet
  opens by saying every value in it comes from the design file, and three things
  had come apart: the light scheme declared an accent the light table had no row
  for, it split the rule colour from the decoration colour while the table gave
  one row for both, and three accent properties were declared in both schemes
  and used nowhere. The light table now carries the two rows the dark table
  already had, measured the same way - `#00757f` at 4.88:1 for rules, `#8a8a94`
  at 3.06:1 for decoration - plus the warn accent at 4.07:1, held to decoration
  in both schemes since the light value does not reach 4.5:1. The three unused
  properties are gone from the stylesheet and from both tables, with a note
  saying why: ten pages of prose have no success state, no error state and no
  warp transition to colour.
- Three sizes that were off the declared scales are on them or recorded as
  exceptions. The lede moves from 18px to 20px, which is the type scale's own
  step. The collapsed menu's height cap reads `--bar` - the fixed bar's height,
  declared once as `--s7` plus its 2px border - rather than repeating `56px`.
  The 10px dropdown caret stays as it is and is now recorded under Type as the
  one size on the site below the scale's floor, because at 14px it reads as
  another character of the button's label instead of as a caret.

### Fixed

- The quickstart page split every wrapped list item in "How to survive" into a
  bullet and a stray paragraph, so four of the six ended mid-sentence - a
  bullet reading "has about a one" followed by a paragraph reading "in three
  chance of dropping a powerup". The six items are one list again, each
  carrying the whole of its sentence.
- The site home claimed every figure in the documentation comes from a probe.
  The probes back the measured figures in this repository's comments, tests and
  changelog; the figures the pages quote - shield costs, point values, timings -
  are constants in `src/types.ts` and `src/game.ts`. The sentence now says what
  the probes actually cover, which is what the development page already said.
- The README's structure tree named `docs/` and the Project Structure page it
  links to did not list it, while the README claimed the page listed every file.
  The page's tree now carries `docs/` opened one level, and the README names the
  directories the page covers: every file under `src/`, `test/` and `docs/`,
  with the root files the game and the site are built from.
- The on-screen controls covered the HUD and the footer on a phone held in
  landscape, which is the orientation a 60x20 tunnel is widest in. BOOST's
  offset was written as FIRE's width plus a gap, but `max-width` caps FIRE's
  height at 118px and not the offset, so past a viewport of about 492px the gap
  grew without bound: 7.5px at 375 wide, 55.4px at 667, 119.9px at 915 and
  188.8px at 1180, by which point BOOST had floated to the top right corner and
  onto the shield bar. Separately the stick and FIRE both sat at `6vh`, which is
  under the footer's two character rows - 22.5px against 36px on a 375-high
  viewport - so on a short viewport they covered the status strip carrying
  `SPD`, the powerup badges and `MUTED`. Neither happens at any of the eight
  shapes the tests now walk.
- Four site pages opened on an `<h3>` below their `<h1>`, with no level 2
  between. `usage.html`, `development.html`, `how-it-works.html` and
  `getting-started.html` were made from README sections that had `###`
  subsections, and carried that level through verbatim, so a screen reader
  walking the outline read level 1 then level 3 - which is what WCAG 1.3.1 is
  about - and the stylesheet drew the same rank of section two ways, since `h2`
  carries a section rule and `h3` does not. On `getting-started.html`
  "Prerequisites" landed on `h4`, which the stylesheet sets at 16px in
  `--text-strong`: indistinguishable from a bold paragraph. Each of the four is
  promoted one rank. The `id` attributes are untouched, and all 51 in-site
  anchors were checked to still resolve.
- Five links on `docs/quickstart.html` and `docs/cheatsheet.html` reached their
  own siblings by deployed URL rather than by file name, so opening either page
  from a clone with no network left the local copy. They came across from
  `QUICKSTART.md` and `CHEATSHEET.md`, where the absolute form is right because
  GitHub renders those files at another path: the two markdown files keep it,
  and the pages are relative, as `DESIGN_LANGUAGE.md` says the site is
  throughout.
- `docs/getting-started.html` still gave `git clone <repository-url>`, the
  placeholder the README carried before the split - on the one page the README's
  install block sends a reader to for the rest of the detail. All three files
  now give the same command.
- `docs/project-structure.html` listed none of the files the site is made of:
  `QUICKSTART.md`, `CHEATSHEET.md`, `DESIGN_LANGUAGE.md`, and `.nojekyll`, which
  is the file the publish depends on. Its `docs/` entry did not open either, so
  the stylesheet, the menu script and the site icon appeared nowhere. The root
  block now carries the four files, and `docs/` is opened one level the way
  `src/` and `test/` already were.
- The `0.7.0-alpha` entry below said light mode re-inks 26 indices. `LIGHT_INK`
  holds 24, and `C` names 24 colours at 24 distinct indices - which is what
  `test/browser-shell.test.mjs` asserts - so the claim was right and only the
  figure was wrong, which is the worse way round: a reader checking it against
  the file finds a table that disagrees and no way to tell which is the error.
- A comment in `test/powerups.test.mjs` explained the 20-unit tolerance on a
  drop's z by a frame ordering that runs the other way round. `updatePowerups`
  is called before `updateBullets`, and `dropPowerup` is called from inside
  `updateBullets`, so a drop created on a frame is not drifted until the next
  one. What the tolerance absorbs is one frame of the mine's own `advance`,
  carried forward by `updateMines` before the bullet takes its last hit point.
  The assertion was never wrong; the comment a later reader would use to judge
  whether a tighter tolerance was safe was. The `dropPowerup` doc comment in
  `src/game.ts` and `index.html` now says when a drop first moves.

### Notes

- The site needed no deploy workflow and none was added. This repository's
  Pages source is the `main` branch root, which serves every path on the
  branch, so `docs/` publishes on push and the game keeps the root URL. A
  workflow would have been ignored rather than run. Whether to move Pages onto
  Actions instead is queued as a roadmap item rather than done here, since
  flipping the source on a working site can take it down.
- The first deploy is confirmed. GitHub's own branch build reports `built` at the
  commit carrying `docs/`, and the site answers 200. Because Pages serves this
  repository from the branch root rather than from Actions, the build is
  GitHub's and `gh api .../pages/builds/latest` is what reports it; `gh run list`
  has no workflow to report on here and its empty result is not a failure.

## [0.7.0-alpha] - 2026-09-23

### Added

- Every minute the run steps up a difficulty level, and the step now announces
  itself. `updateObstacleScaling` has thickened the field on the whole-minute
  boundary since it was written, and nothing on screen said so: the obstacles
  simply arrived. The crossing raises `warpLevel` and a two-second `warpFlash`,
  and three things read it. The tunnel's whole colour ramp shifts across -
  `warpWallColor` carries the five wall colours from blue and cyan to magenta
  and white, picked after the depth band and the pulse rather than instead of
  them, so the walls keep reading as depth while they are shifted. The floor
  dots strung between the walls on a near ring row go with them, since they are
  drawn in a wall colour rather than one of their own and a row of blue dots
  between two magenta walls is the one thing on the tunnel left unshifted. The
  speed lines down both margins go from every third row to every second, at
  twice the scroll rate, in white, with a second line one column further in; a
  boost taken through a warp draws the warp's pattern rather than laying both
  over each other, which lights so many rows that neither reads as motion. And a
  `>> WARP LEVEL 2 <<` banner blinks on the HUD row the combo counter, the debug
  label and the NEW BEST banner already share. It loses to both of the others: a
  debug run keeps its label, since that label is up for the whole run and says
  which scenario is being flown, and NEW BEST is drawn after the warp banner and
  covers it on the rare frame the two coincide. The counter is the run's own
  rather than `lastObstacleIncreaseMinute`, which is held still in the scenarios
  that do not scale their field - a run whose obstacles are fixed still gets
  faster and still crosses the boundary.
- A mine shot down now has about a one in three chance of leaving a powerup
  behind, and the drop drifts toward the ship while the tunnel carries it in.
  Three kinds: a green `+` restores 25 shield, a cyan `!` gives ten seconds of
  rapid fire, and a magenta `~` halves the world's speed for five. The drift is
  what makes a drop worth chasing rather than a coin flip about where the mine
  happened to die - it closes on the ship at 2.5 units a second, so a mine killed
  dead ahead falls into the ship and one killed out by a wall is a decision about
  whether to go and get it. Collection is the bounding-box overlap the orbs
  already use, against the ship's drawn sprite, and is not gated on the barrel
  roll: the roll is invincibility to damage, not a state of not being there. A
  drop that gets past the ship is gone rather than recycled to the back of the
  tunnel, because a drop is the record of one mine and putting it back would pay
  the same kill twice. Ramming a mine destroys it and drops nothing - that one
  already cost 35 shield, and paying a reward out for it would undercut the one
  move the mine is there to punish - and the two collision-tracking scenarios
  drop nothing at all, being diagnostics rather than scored runs. Measured over
  the two hundred seeded kills `test/powerups.test.mjs` walks: 64 drops, a rate
  of 0.320 against the 0.35 `POWERUP_DROP_CHANCE` names, with all three kinds
  turning up.
- Rapid Fire holds the trigger down. The press itself is untouched and still
  fires on the frame it arrives, with or without the pickup, because a cannon
  that swallows a keypress to buy a powerup something to improve reads as a
  broken cannon. What the pickup adds is the held trigger: keep SPACE down and
  the volleys repeat every 0.12 seconds, which is `FIRE_INTERVAL` over
  `RAPID_FIRE_MULT` and the 3x the pickup promises. That interval comes out at
  the cadence the chaos scenario has auto-fired at since it was written, which is
  the useful coincidence - it has been played against the densest field in the
  game. Chaos keeps its own constant rather than reading this one: a stress test
  and a reward should not be tuned by the same number. Every shot in the game now
  comes out of one `fireVolley`, so the trigger, the held trigger and the
  auto-fire cannot come to fire different spreads.
- Slow Motion runs the whole world at half speed for five seconds, the ship
  included. It is one multiplication at one place - the `dt` handed to
  `updatePlaying` - so everything in the world slows together and the geometry of
  a dodge is exactly what it was, with twice the real time to read it. Both
  pickup clocks are counted in real seconds and outside that scaling, for two
  reasons that pull the same way: a pause stops them, so a pickup held across a
  paused screen is not ten free seconds, and Slow Motion does not stretch itself,
  since the clock it slows is the one that would otherwise count it down. The
  world's own `gameTime` does slow with it, so difficulty progresses at the speed
  the world is actually running at.
- The footer's status strip counts the two timed pickups down beside the speed
  readout, as ` RAPID 7.3s ` and ` SLOW 3.5s `. A badge is drawn only where there
  is room for it before the mute slot, on the same rule the hint list above it
  already follows. Both fit at the 60-column floor with the mute indicator up;
  the guard is there for the grid below that, where a badge written past the slot
  would take the border corner with it.
- The browser build grows touch controls: a thumbstick bottom left, and FIRE and
  BOOST bottom right. They are hidden until an actual `touchstart` arrives rather
  than shown on a capability check, because a laptop with a touchscreen reports
  touch support and is nearly always being driven by its keyboard, and a
  thumbstick parked over the tunnel there is worse than none at all. The stick
  reading is arithmetic and sits above the DOM marker where the suite can walk
  it: a dead zone measured as a share of the stick's own drawn radius, so it
  scales with a control sized in viewport units, and an axis share of 0.38 - a
  little under sin(22.5 degrees) - that cuts the circle into eight even sectors.
  Walked a degree at a time, each of the eight holds 45 degrees give or take two,
  and no push ever holds two opposite keys. FIRE sends SPACE during a run and
  ENTER everywhere else, since the title screen, the debug menu and the game over
  screen all wait on a key a phone has no way to press. Pointers are tracked by
  id, so a thumb on the stick and a thumb on FIRE do not take each other's
  events.
- The browser build follows the system colour scheme. Dark is the game's natural
  state and stays the default, including when the system says nothing:
  `themePalette` hands the dark scheme the base palette itself rather than a copy
  that happens to agree. Light re-inks the 24 indices the game actually draws
  with - BLACK becomes the paper, BRIGHT_WHITE becomes the ink, and the tunnel's
  blues and cyans come down to dark blues and teals that read against white - and
  leaves the 216-colour cube and the grey ramp behind them as xterm defines them,
  since nothing reaches for one of those by number. It is a palette swap and not
  a second renderer: every glyph already carries an ANSI index, so changing what
  those indices resolve to changes the whole screen at once and no drawing code
  knows which scheme is up. The page colour behind the grid moves with it,
  because the renderer leaves a BLACK cell unpainted and lets the page show
  through. A run in progress is untouched by the switch.
- The browser tab shows the ship. `icon.svg` is new - the item asked for a
  favicon from it and the file did not exist - and it is inlined into
  `index.html` as a data URI so the page stays one file with nothing to fetch.
  Every `#` is percent-encoded, which is not cosmetic: an unencoded one starts
  the URI's fragment and truncates the icon at the first colour.
- A `powerup` sound cue, swept up on a triangle from 520 to 1760 over 0.28
  seconds. It is told from the orb chime by ear on every axis a single swept tone
  has - the wave, both ends and the length - because the two are both pickups and
  both sweep upward, and that is the pair that has to stay apart.

### Changed

- `README.md` documents the warp transition, the powerups, the touch controls
  and light mode, and its file tree now lists `icon.svg` in place of an
  `icon.png` the repository does not contain. It has crossed the 300-line mark
  the over-long README check reads, at 309 lines and 23,059 characters.

### Notes

- A drop costs the seeded RNG one draw per mine kill and a second on the kills
  that do drop, so a seeded run's sequence now depends on how many mines it shot.
  Nothing the suite pins moved: of the six seeded flights `test/engagement.mjs`
  flies, five never run long enough for a mine to spawn at all - 1200 frames at
  1/30 is 40 seconds of game time and the first mine arrives at 60 - and the
  sixth, 600 frames at a sixth of a second, sees one mine in the whole flight.
  The dark walk is geometry rather than a flight and is unaffected: still 594
  configurations at 80x24 and 2241 at 60x20 that drew no tracer and would
  otherwise have met, none of them registering.
- The suite is 442 passing, up from 325. `test/warp.test.mjs` and
  `test/powerups.test.mjs` fly both builds; `test/browser-shell.test.mjs` is
  browser-only, because a terminal has neither a colour scheme to follow nor a
  touchscreen to be played on.

## [0.6.2-alpha] - 2026-09-22

### Changed

- The debris window's three numbers are module-private again. Pinning the
  window to the draw last run exported `DEBRIS_VXY`, `DEBRIS_VZ_MIN` and
  `DEBRIS_VZ_MAX` out of `test/engagement.mjs`, and nothing outside that file
  ever read them: the check that needed them reads `DEBRIS_DRAWN` a few lines
  below, which carries all three values already, and
  `test/pulse-cannon.test.mjs` imports that rather than the numbers behind it.
  They are `const` again, which is what `DRIFT_SLACK` does in the same block
  for the same reason - a number the checks never name stays inside the module.
  `DEBRIS_DRAWN` is the surface the checks read, and the suite is unchanged at
  325 passing.
- The heights bullet in the `0.6.1-alpha` entry below is filed under
  `### Changed` rather than `### Fixed`. It centralises the free flight's ship
  heights so two files stop keeping their own copy, which is the same kind of
  work, on the same file, for the same stated reason as the frame rates one
  version earlier - and that one was recorded under `### Changed`. One refactor
  was described in two sections of the same changelog, so a reader scanning
  `### Fixed` for repaired defects met a deduplication. The debris window
  bullet stays where it is: that one repaired a guard that did not hold. The
  version is not re-cut.

## [0.6.1-alpha] - 2026-09-21

### Fixed

- The debris window the kill pairing matches in restated the engine, and
  nothing held it there. `test/engagement.mjs` pairs each kill to the block it
  killed by matching a fresh burst against where the blocks are, and the window
  it matches in is built out of the velocities `spawnParticles` draws, written
  out a second time as three constants. The comment over them argued the
  restatement held itself honest, because a bound that drifted from the engine
  would make the pairing fail loudly at every frame rate at once. That is true
  of half of it. A window gone too tight does fail loudly - it reaches nothing,
  the bursts name no block, and the kills go unread. A window gone too loose,
  which is what a narrowing in `spawnParticles` leaves behind, passes in
  silence: with all three numbers widened tenfold, to 30 on x and y and -10 to
  20 on z, every floor the seeded flight pins still cleared, at both ship
  heights, both builds and all three grids, with no unread burst anywhere. The
  window is now pinned to the draw instead of to the comment. A hundred kills'
  worth of debris is drawn out of each build from a fixed seed, and every
  piece of it has to sit inside the window and come within a twentieth of a
  unit of each end, so `spawnParticles` moving either way fails on an
  assertion rather than on nothing. Checked both ways round: narrowing the
  draw to 2 on x and y and -0.5 to 1 on z fails the new check alone and
  nothing else in the suite, and widening it to 5 and -1 to 4 fails the new
  check along with ten of the flight's own.

### Changed

- The free flight's ship heights were a copy in each file. The frame rates and
  the flight lengths were centralised into `test/engagement.mjs` last run,
  because a rate added to one file said nothing about the other two, and the
  heights were left behind: `FREE_HEIGHTS` in `test/pulse-cannon.test.mjs` and
  `HEIGHTS` in `test/probes/free-flight.mjs` were both `[0, 6.5]`, written out
  twice, with every figure the probe prints for the flight summed over them and
  every floor the suite pins read against them. Changing one meant the probe
  printing a flight the suite does not fly, with nothing saying so. The pair is
  now exported from `test/engagement.mjs` beside the seeds and the flight
  lengths, and both files read it. `HEIGHTS` in `test/probes/frame-rate.mjs` is
  unchanged: it is `[0, 2.5]` and belongs to the staged walk rather than to the
  flight.

## [0.6.0-alpha] - 2026-09-20

### Added

- A seeded random source, shared by both builds. Every draw either of them
  makes now goes through one function - the sixty obstacles a run opens with,
  the orbs among them, the mine timers, the starfield, the debris a burst is
  thrown in - and `seedRng` pins it. Unseeded it is `Math.random`, which is
  what the game plays on; seeded, a run is the same run every time it is
  flown. It is mulberry32, written out in `src/types.ts` and again in
  `index.html`, and the parity suite pins the two copies to the same sequence,
  the same world out of `startGame` at the same seed, and the release of the
  seed afterwards.
- A frame-rate check on the free flight. The flight takes a `dt` and every
  reading it takes off a frame has to be derived from that frame, so it is now
  flown at each of the rates the staged walk beside it uses - 1/60 down to 1/6
  of a second a frame - at one grid and in both builds. Per build, both ship
  heights together: 28 of 29 kills read at 1/60, 69 of 70 at 1/30, 124 of 125
  at 1/20, 220 of 229 at 1/12 and 525 of 542 at 1/6, with 99% or better of each
  on or beside the block and none landing with no tracer drawn.
- A check on the pairing alone, over the kills whose frame spent more than one
  shot. Those are the only kills a pairing can get wrong, and they are a tenth
  of the kills, so a pairing fault barely moves the share taken over all of
  them: flown with the spent shots walked from the wrong end, that share never
  falls below 90.4% on any of the five seeded worlds, so it clears its floor at
  all fifteen grids and catches the fault at none of them. Taken over the
  crowded frames alone it is 44 of 44 on or beside against 20 of 44 walked the
  wrong way.
- The flight reports why a kill went unread rather than only how many did: a
  frame that spent a shot elsewhere and cannot say which shot killed what, a
  debris burst that named no block, and one that named more than one. The probe
  prints the three separately.

### Fixed

- A slow frame left the free flight unable to pair its kills. The bound on how
  far a kill's debris can have drifted from the block it came off was fixed at
  half a unit, which is one frame of a particle's own velocity at a thirtieth
  of a second and a fraction of one at a sixth: `spawnParticles` draws `vz`
  from -1 to 2 and `updateParticles` carries z by `(vz + advance) * dt`, so
  past about a seventh of a second the z term alone clears the bound. The burst
  then names no block, the kill cannot be paired to the shot that made it, and
  it goes unread - 83% of them at a sixth of a second a frame, against 2% to 4%
  at the rates above it, which would take the three-quarters floor the flight
  asserts straight through. Nothing reached it, since no caller passed a `dt`,
  but the rate walk beside the flight goes to a sixth and the parameter read as
  though those rates were supported. The bound is derived from the frame now -
  `3 * dt` on x and y, and the frame's own advance on z, as a one-sided window
  rather than a magnitude - and the rates it is flown at are pinned. A wider
  bound can let a second block inside it, which the flight counts rather than
  guesses at: 10 bursts naming nothing and 14 naming more than one, out of
  8,266 kills over the whole matrix at 1/6.
- The free flight's figures still could not be rebuilt from the repository.
  Stating them as spreads over a named number of passes did not settle it: a
  rerun fell outside the spreads, and two ten-pass runs of the whole matrix
  disagreed with each other, so no pass count quoted that way ever would. The
  flight is seeded now, at the five worlds in `FREE_SEEDS`, and every figure
  the suite quotes is taken at the first of them while the probe prints all
  five. Across the whole set - both builds, three grids, two heights each - a
  1200-frame flight lands 84 to 191 kills a grid, reads 92% to 100% of them
  against the shot that made them, puts 98% to 100% of those on or beside the
  block and none of them unlit. Both builds return identical numbers at every
  seed, which is itself the parity check. The flight figures quoted in the
  0.5.0-alpha and 0.5.1-alpha entries below were taken from unseeded draws and
  do not reproduce; each is marked where it stands rather than restated,
  because the code that produced it is not the code running now.

### Changed

- The frame rates every rate walk flies are one list in `test/engagement.mjs`
  rather than a copy in each of the three places that walked them, which is how
  the free flight came to take a `dt` the suite never flew it at while the walk
  beside it went to a sixth of a second. The flight lengths moved there with
  them, for the same reason the floors already live there: a probe printing a
  different flight from the one the suite pins prints a figure the suite cannot
  be checked against.
- `--passes` on the probe rig narrows a probe to the first N of its seeded
  worlds instead of asking for N fresh samples. No probe here is a sample any
  more, so a figure is rebuilt by running the probe again rather than by
  averaging it.

## [0.5.1-alpha] - 2026-09-19

### Fixed

- The free-flight guard read a kill's contact against every shot the frame
  spent. It reduced both readings - the kill frame and the one before - over
  every bullet in the air, for each block the frame killed, with nothing pairing
  a spent shot to the block it actually killed. On a crowded frame that lets one
  shot's contact answer for another shot's kill: 11% of kills landed on a frame
  that spent more than one shot, so the share the check reported was a ceiling
  on what it could catch rather than a measurement, while its own comment said
  the readings were taken against the killing shot alone. Each kill is now
  paired to the shot that made it before either reading is taken, by the frame's
  own resolution order - `updateBullets` walks the bullets from the end, and the
  debris a kill throws is pushed where the kill resolved, so walking the spent
  shots and the kill bursts from the same end pairs them. A frame that also
  spends a shot on a mine cannot say which shot went where; those kills are
  counted and left unread rather than read against a shot that was never near
  them, and the check pins how few of them there are. On the honest reading the
  share on or beside the block is 96% or better at every grid and in both
  builds, against the 98% the pooled reading used to report.
- A block the ship rammed was scored as a kill. A block leaves the tunnel three
  ways - shot, rammed, or wrapped round after passing the ship - and all three
  put it back at the same depth, so the reading that watched the depth alone
  could not tell them apart. `updateObstacles` runs before `updateBullets`, so a
  frame that rammed and fired counted the rammed block among its kills. Only a
  kill throws debris in the obstacle's own colour, and that is what the kill
  count now reads; the wrap is arithmetic, and the rams are what is left over.
- Two blocks shot in the same frame could be read as one kill. The reading that
  told one kill's debris from the next kill's grouped the pieces by where they
  landed, within half a unit on each axis, on the grounds that blocks are spread
  over nine units of x and four of y. The two blocks that have to be told apart
  are not spread over that, though: they are the two a single frame shot, and
  the pilot closes on the nearest drawn block's column before it fires, so a
  frame that kills twice usually kills twice down the same column. Over 60
  flights of the matrix, adjacent bursts came as close as 0.19 units on every
  axis at once. Merging two of them dropped a kill, and - since the rams are
  taken as what is left over once the kills and the wraps are accounted for -
  handed the count a ram that never happened: one flight reported a ram against
  a true count of none. The boundary is counted rather than measured now, since
  a kill throws a fixed number of pieces in one push, so the frame's fresh kill
  debris is its bursts laid end to end. Checked against the exact debris count
  and the shield drops over 168 flights, the kills and the rams now agree
  with both on every flight.
- The corridor had one definition and the test kept a second.
  `test/engagement.mjs` restated the boundary as `col > span.left && col <
  span.right` while its own docstring said it read the corridor out of the build
  that was flying, which was reachable only because `tracerLit` was exported
  from neither build's test surface. It is on both now, beside `tunnelSpan`, and
  the test calls it. The walk over the undrawn-tracer configurations comes back
  on the counts it had: 594 at 80x24, 2241 at 60x20, 76 at 205x50, none
  registering, in both builds.
- The free flight's figures could not be rebuilt from the repository. It flies
  the run `startGame` opens, which seeds sixty obstacles from an unseeded
  `Math.random`, so every pass flies a different run - and the figures quoted in
  the test comments, in `test/probes/free-flight.mjs` and in the `0.5.0-alpha`
  entry above were taken from one draw, which the first rerun fell outside of.
  They are stated as spreads over a named number of passes now, and each says
  which number. The floors the suite asserts sit well under the low end of each
  spread rather than against it, since the next pass is another draw: over ten
  passes a flight fired 136 to 298 volleys and landed 27 to 129 kills, against
  floors of 80 and 15. The walk beside the flight is arithmetic and reproduces
  exactly, so only the flown half needed this. (Not reproducible: the spreads
  in this entry are drawn from unseeded flights and a rerun falls outside them,
  which is what 0.6.0-alpha seeds the flight to settle.)

### Added

- `--passes` on the probe rig, for the probes whose walk is not deterministic.
  `free-flight` prints every flight figure as the spread over the passes it was
  asked for, with the two ship heights summarised together underneath in the
  shape the suite pins them, and reports the kills it could not pair to a shot
  beside the ones it could.

## [0.5.0-alpha] - 2026-09-17

### Fixed

- A small browser window drew more grid than it could show. `handleResize`
  clamped the grid up to the 60x20 floor the game is laid out against while the
  canvas stayed the size of the window, so the cells past the edge were painted
  where nothing displayed them. Measured in a chromium window against the
  furthest painted cell, 600x360 showed the whole grid, 500x320 lost 10 columns
  and 3 rows, and 380x240 lost 22 columns and 7 rows - taking the SHIELD readout
  off the right of the HUD and the whole footer with the control hints and the
  speed, with nothing on screen saying so. The font shrinks to reach the floor
  instead, down to 6 pixels: 500x320 now gives a 62x21 grid at 13 pixels and
  380x240 a 63x20 grid at 10. A window too small for 60x20 even at the smallest
  font gets the notice the CLI build shows in a terminal it cannot fit, drawn at
  the largest font that still holds it, and the run is left where it stood so
  resizing back brings the same game up. The engine hum is cut on the way into
  the notice: the frame that draws it returns before reaching the audio layer,
  which is the only thing that ever stops the hum, so a run shrunk below the
  floor would otherwise have droned on at its last pitch while it was not
  advancing. The terminal build has no equivalent of any of this, since a
  terminal cannot be smaller than its own grid.
- A kill could register where the tracer was never drawn. `drawBullets` stops
  drawing a tracer whose column has left the corridor, `drawEntitiesFar` draws a
  target's block whether or not the corridor reaches it, and `contacts` never
  asked - so the player saw the block, saw no bolt, and the block died anyway.
  Walked over every firing column and height the ship can hold, every depth of a
  shot's life and every legal target placement, 594 configurations at 80x24,
  2241 at 60x20 and 76 at 205x50 registered a kill from a frame that drew
  nothing. All three are nil now. It costs nothing: every band the suite pins
  came back on the figure it had, at all three grids and in both builds, and the
  0.4.0-alpha kill rates stand unchanged.

### Changed

- The corridor has one definition. `tunnelSpan` moves from the renderer to
  `types.ts` with `tracerLit` beside it, and drawTunnel, drawBullets and the hit
  test now read the same pair. The clip stops the tracer being drawn and stops a
  shot registering while it is dark; it does not cut the flight short, so a shot
  that crosses back into the corridor lights and registers again.
- `contactOf` tells a tracer drawn wide of the block from one not drawn at all.
  The two shared a `clear` bucket, which is why the share of kills that were the
  clip fault was never known - "nothing is destroyed by a tracer that never
  reached it" allowed 5% there and attributed all of it to mid-sweep contacts.
  Split, the staged walk gives 8 `wide` in 860 kills and no `unlit` at all, and
  a free flight 0 to 6% `wide` and no `unlit` either, over ten passes of the
  whole matrix. (Not reproducible: the flight was unseeded when this was
  measured. Seeded, it gives 0 to 2% `wide`.) The staged walk pins `unlit` at nil rather than allowing it a
  share, and `wide` keeps the 5% the sweep inside a frame earns.

### Added

- A free-flight check, on a pilot that flies the run `startGame` opens rather
  than staging one: sixty obstacles in the tunnel, the ship held at a height and
  steered onto a block's drawn column read off the rendered buffer, firing every
  0.12 seconds, for 1200 frames at each of the three grids in both builds. Both
  contact invariants are asked of it. No frame of any flight drew a tracer on a
  block that was still there the frame after with the shot still in the air, and
  96% or better of kills had their tracer on the killed block or within the
  grid's column slack of it - measured over ten passes of the whole matrix, 90
  to 197 kills a grid a pass and none at all landing with no tracer drawn. The
  flight is the run `startGame` opens and is seeded from nothing, so every
  figure off it is the spread over a stated number of passes rather than a
  number; `npm run probe -- free-flight --passes 10` prints them again.
  Replacing `contacts` with a flat refusal turns the first figure into 406 to
  27,514 ignored contacts a flight over five passes, which is the same detector
  that counted 164 of them in a real browser window with the hit rule switched
  off. (Not reproducible: every figure in this item is drawn from unseeded
  flights, and the share it quotes was also taken before 0.5.1-alpha corrected
  how a kill's contact is read. `npm run probe -- free-flight` prints what the
  seeded flight gives today.)
- A walk over the hit test itself, for the shots no flown engagement can
  produce. Every engagement in the suite steers onto the target's column before
  firing and no target spawns outside four and a half units of the axis, so a
  flown shot is never taken from a column the tunnel has stopped reaching - and
  the ship can hold six and a half. Of 9,477,000 configurations walked, 3.5 to
  3.9 million draw no tracer at each grid, and the few hundred of those whose
  cells would otherwise have met are put to the engine one frame at a time.
- `test/probes/free-flight.mjs`, printing both of the above: the flight's
  volleys, kills, ignored contacts and kill-contact shares per ship height, with
  the dark walk's counts under them.
- The browser grid fitting is pinned in `test/menu-layout.test.mjs`, against the
  grid the buffer is built at rather than against the window: every grid fits
  the window it was measured for, every window with room for the floor at some
  font reaches it, the too-small notice writes nothing off the buffer it was
  given, and the frame that draws that notice cuts the hum before it returns.
  Walked over 106 window sizes, the sizing this replaces painted outside
  the window on 29 of them.

## [0.4.0-alpha] - 2026-09-16

### Changed

- The pulse cannon registers a hit on the screen rather than in the world. A
  shot destroys what its tracer is drawn on and nothing else: the cells
  `drawBullets` gives the tracer against the cells `drawEntitiesFar` gives a
  target's block, with the column slack either side and no row slack, and only
  for a target that is actually being drawn. Depth is no longer compared at all.
  The old test projected shot and target onto the one plane where they crossed
  in depth, which asks a question the player is never shown the answer to: the
  two are drawn at their own depths, so a pair level in depth can be rows apart
  on the screen and a pair a frame apart in depth can share a cell. A kill now
  lands with the shot anywhere from 32 units in front of its target to 44
  behind, against a band of 132 units behind to level with it before.
- Height stops deciding a kill. A tracer climbs its whole column and meets
  whatever is drawn in it, so the gap between the ship's height and the
  target's no longer matters: walked at 205x50 over 60 to 140 units, the kill
  rate by height gap was 16/18 level with the target, 24/35 a unit off, 3/27 two
  off, 0/19 three off and 0/12 four off, and is now 18/18, 35/35, 27/27, 19/19
  and 12/12. The same walk at 80x24 went from 19/19, 35/35, 27/29, 15/20 and
  4/12 to 19/19, 35/35, 29/29, 20/20 and 12/12.
- The column slack scales with the grid. Both faults it answers are measured in
  columns and both grow with the window: a target's outward creep over a long
  flight scales with `colRange`, which is 37 columns at 80 wide and 99.5 at 205,
  so a target at x 4.5 shot at from 140 units creeps 2.44 columns at 80x24 and
  7.28 at 205x50. A fixed column was a generous slack on a narrow grid and none
  at all on a wide one. `shotSlackCols` holds it at a constant share of the
  tunnel's width instead - still one column at 80x24 and at the 60x20 floor, and
  three at 205x50. At 205x50 that took a lone shot at 60 to 140 from 24/56 to
  42/56 and the volley from 50/56 to 56/56, with the share of kills whose tracer
  was neither on the block nor within the slack beside it unchanged at nil.
- The frame is swept rather than sampled at its two ends. A contact is a pair of
  cells meeting, and a cell is worth well under a unit of depth, so a long `dt`
  could step a tracer clean over a block between frames. `SWEEP_STEP` samples
  every three quarters of a unit of closure. Walked over 300 staged shots at
  each grid, aimed at the target and a column past everything the hit test
  allows, and flown at 1/60, 1/30, 1/20, 1/12 and 1/6 of a second a frame, no
  shot changes its verdict with the rate. The cheap column test that skips the
  sweep bounds the whole frame and not only its ends: the target's column moves
  monotonically across the frame, so it passes nearer the shot mid-frame than at
  either end whenever the shot's column lies between the two, and measuring the
  distance to the nearer end instead dropped 703 of 7625 contacts at 205x50 at a
  sixth of a second a frame.

### Fixed

- A tracer drawn through a block destroyed nothing about one time in five, which
  is the fault the screen capture behind this work caught. Walked over 30
  placements a band at ship heights 0, 1, 2.5 and 4.5, the engine as it stood
  left a target standing under a tracer drawn on its own cells on 4 flights of
  92 at 20 to 60 units and 15 of 116 at 60 to 140, both at 80x24, and on 33 of
  87 and 28 of 112 at 205x50. It is now nil in all four. Flown as the capture
  was - ship held on the floor, lined up by column and nothing else - the kill
  rate went from 23/25 and 24/29 at 80x24 to 26/26 and 29/29, and from 9/26 and
  8/28 at 205x50 to 24/26 and 28/28.
- The suite was pinned at 80x24 alone and passed while the game a player sees
  missed. Replayed against the engine as it stood, five of its six range bands
  fell below their own floors at 205x50: a lone shot at 35 to 80 landed 43/52
  against a floor of 90%, at 80 to 140 it landed 15/57 against 65%, the volley
  at 80 to 140 landed 45/57 against 90%, and the two bands flown by eye landed
  26/37 and 18/38 against 95% and 90%. The same bands now land 52/52, 38/57,
  56/57, 37/37 and 38/38.
- The engagement checks run at three grids: the 80x24 a terminal opens at, the
  60x20 floor the browser build clamps a small window to, and the 205x50 a
  full-screen window gives at the default font. The floors that legitimately
  differ by grid are written per grid rather than levelled down to whichever
  size is hardest.

### Added

- `test/engagement.mjs`, holding one pulse cannon engagement flown at whatever
  grid the caller names. The tests and the probes fly the same flight out of it,
  and the floors the bands are pinned at live there with it, so a floor a test
  pins and a figure a probe prints cannot drift apart. `suite-replay` reads those
  floors rather than carrying its own copy, and says "unpinned here" at a grid
  the suite pins nothing at, which is the size a floor is checked at before a
  test is written for it.
- `test/probes/`, run by `npm run probe -- <name> [--grid WxH] [--build <name>]`.
  Four probes: `seen-versus-kill`, which asks whether a kill agrees with what
  the screen drew; `suite-replay`, which runs the test file's own bands at a
  given grid; `frame-rate`, which walks a staged shot across five frame rates;
  and `column`, which reports the volley's spread, a target's column creep and
  the far band's kill rate with the contact shares beside it. Every probe prints
  its method - grid, placement walk, ship heights, band and frame rate - above
  its table, and runs against both real engines rather than a copy. `column`
  takes over from the scratch horizontal probe the figures behind the old
  vertical-slack table came from; the vertical one measured `SHOT_SLACK_ROWS`,
  which is gone, and has nothing left to measure.
- `shotSlackCols` and `SLACK_REF_WIDTH` in both builds. The parity test pins the
  two builds to the same slack at every width from 60 to 240, since the slack is
  now a function of the grid rather than a number.
- Checks for what the screen showed, per build and per grid: that a tracer drawn
  on a block always destroys it, that nothing is destroyed by a tracer that
  never reached it, and that height is not an aiming axis. All three read the
  rendered grid, with the block taken from a render with the volley out of the
  way - `drawBullets` runs after `drawEntitiesFar` and a tracer standing on the
  block replaces the very cell the reading is about.

### Removed

- `SHOT_SLACK_ROWS`, from both builds and from the parity test. Its premise was
  that one row spans about two world units of height, which is an 80x24
  measurement: at 205x50 a row is 0.7 to 1.1 units across the same band. Under
  the screen rule there is nothing for it to forgive, since a tracer meets
  whatever is drawn in its column at any height. Its table of what a vertical
  error cost went with it, and with it the open review finding that the table
  could not be reproduced from anything the repository shipped.

## [0.3.7-alpha] - 2026-09-15

### Fixed

- The pulse cannon now registers a hit the player aimed vertically by eye. The
  hit test carried a column of slack either side of a target's block and none at
  all above or below it, so the axis a player can read off the screen was the
  forgiving one and the axis they cannot read demanded sub-cell precision.
  Measured at 80 to 140 units out on an 80x24 grid, where one row spans about
  two world units of height - a fact about that grid rather than about the
  game, and nearer one unit a row on the 205x50 a full-screen browser window
  gives: a volley aimed dead on the target's height still landed 82% of the
  time a whole column wide, while the same volley aimed dead on the target's
  column landed 95% at a tenth of a world unit of vertical error, 73% at half a
  unit and 39% at a whole one - half a row of vertical error costing more than
  three whole columns of horizontal error did. `SHOT_SLACK_ROWS` now puts a row
  of slack on that axis too, taking all three to 100%.
- Height is the axis with nothing to line up, which is why it needed the slack.
  Y_FACTOR squashes the tunnel's whole height into a few rows, and the target's
  glyph moves at its depth's scale while the ship's moves at full scale, so the
  two never meet on a row even when the shot is dead on. The columns have no
  such problem: ship and target sit in countable columns and can be lined up by
  eye.
- The slack forgives a misread, not an aim. At that range and on that grid a
  shot a row clear of the target - two world units there - still misses a third
  of the time, one a row and a half clear misses four times in five, and one two
  rows clear, which is a target at the floor of the tunnel shot at from the roof,
  never lands at all. Nearer in the block is taller than a cell and the fall-off
  starts later still.
- `TRACER_FLIGHTS` pinned the left wall's climbed-row floor at 0, which pins
  nothing: `firstRow - lastRow` cannot go below zero, so that row passed a
  tracer drawn on a single row and passed one never drawn at all. The comment
  above the table justified it by saying the shot goes dark before climbing a
  row, and the grid says otherwise - read at 80x24, both builds alike, the -6.5
  volley's 11 drawn frames carry topmost tracer rows of 19, 19, 19, 19, 18, 18,
  18, 18, 18, 18, 18, a climb of one. The floor is back at 1 and the comment now
  reports the climb rather than denying it.
- The 0.3.5-alpha entry and README's Line Endings section both said a global
  excludes file hides a dotfile from `git add` with no error. Only the bulk
  forms do. Naming the path reports it - `git add .gitattributes` prints the
  ignored-paths warning, points at `-f`, and exits 1 - so the old wording sent a
  reader whose `git add <file>` had just failed loudly looking for a silent
  failure, past the error that already named the fix. Both now say which form is
  quiet and which is not; the `git check-ignore -v --no-index` and `git add -f`
  advice was right either way and is unchanged.

### Added

- `SHOT_SLACK_ROWS` in both builds, carrying the measurement that sets it and
  the reason the two axes are not symmetric in what they ask of a player. The
  parity test pins the two builds to the same value, as it already does for
  `SHOT_SLACK_COLS`.
- Five checks per build in `test/pulse-cannon.test.mjs`. The first flies the
  engagement with nothing but the painted screen to aim by: the hull is found by
  its nose glyph, the target by its red block, and the height is simply the
  middle of the tunnel, since that is the only standing guess the screen
  supports. Every other rate in the file reads the target's height out of the
  world, which no player can do, so this is the closest the suite comes to the
  complaint the slack answers - a shot the player believes is lined up, missing
  anyway. It lands 39 of 39 in both range bands, where the same walk against the
  unslacked engine landed 35 of 39 at 35 to 80 and 31 of 39 at 80 to 140. The
  other four place the shot directly: that one inside the vertical slack
  registers from above the target and from below it, that one clear of the band
  does not, that the long-range sweep holds 95% when the ship's height is
  deliberately biased off the target's, and a ceiling saying the slack is
  forgiveness rather than an aimbot - nothing lands four world units out, and no
  better than half lands three units out. `engage` and `sweep` take that
  vertical bias as an option, since aiming dead on was the one case the file
  could already measure.
- A README note that height is the forgiving axis and why, beside the existing
  aim-by-column tip.

## [0.3.6-alpha] - 2026-09-14

### Fixed

- The tracer no longer erases the tunnel wall it is clipped against. The clip
  admitted the two columns the walls are drawn on, and `drawBullets` runs after
  `drawTunnel`, so a shot that reached a wall column replaced the wall glyph
  with its own bar instead of stopping at it. The wall is a single cell thick
  on every row above the bottom third, so there was nothing behind the bar: at
  80x24, fired from -4.5, frame 28 left row 13 reading two bars where the rows
  either side carried blocks, and the hole climbed the wall with the shot. Read
  off the grid across a whole flight, 24 of the 218 tracer cells from -4.5 sat
  on a wall column, 24 of 242 from 4.5, 12 of 47 from -6.5 and 23 of 70 from
  6.5. Down the middle it never happened. The corridor is now what the walls
  enclose rather than the walls themselves, which is what the comment above
  `drawBullets` always claimed.
- The figures the 0.3.5-alpha entry gave for how long a tracer is drawn are
  superseded by the tighter clip, and the two sides no longer agree. A shot down
  the middle is still drawn for all 59 of its frames. From 4.5 it is drawn for
  46 and from -4.5 for 40; from the wall at 6.5 for 17 and at -6.5 for 11. That
  split is quantisation, not a second fault: the corridor is symmetric about
  `floor(w / 2)` while the projection floors a continuous column, so a shot at
  -x sits a column further out than its mirror and meets the wall sooner.
  Rounding the column instead makes the two agree exactly and costs real hits -
  over the suite's own long-range sweep it took the centre bullet from 44/58 to
  37/60, under the 65% that band is pinned at, because `SHOT_SLACK_COLS` is
  tuned against the floor. Drawing rounded while registering floored is worse
  again, putting the glyph a player aims by a column off what the hit test
  reads on half of all positions. The flight, the hit rates and the drawn tunnel
  are all unchanged; only the clip moved.
- The 0.3.5-alpha entry credited `.gitattributes` to a `.gitignore` the
  repository does not have. `.gitattributes` is tracked and is what every clone
  gets; the `.gitignore` that un-ignores it lives in the working tree of the
  machine the work was done on, is matched by the same global rule it works
  around, and is never committed. The entry now says so, and README's Line
  Endings section says what a clone actually needs, which is nothing, and what
  staging a new dotfile can need, which is `git add -f`.

### Added

- A check per build in `test/pulse-cannon.test.mjs` read off the wall rather
  than off the tracer: every wall column of every row carries one of the four
  block glyphs or a ring end, on every frame of a flight from each of the five
  firing positions. The span checks read where the tracer went, which a clip
  that ate the wall still satisfied; this reads what the wall looks like while
  it goes there. The two span checks now take the strict bound, and
  `TRACER_FLIGHTS` carries its drawn-frame and climbed-row floors per firing
  position instead of one figure per pair, since the sides are not mirrors.

## [0.3.5-alpha] - 2026-09-13

### Fixed

- A pulse tracer is no longer drawn outside the tunnel it was fired down.
  Holding the screen column is what makes the cannon hit what it is pointed at,
  but the drawn tunnel converges on the vanishing point and a held column does
  not, so a shot fired from near a wall crossed that wall partway up and the
  rest of the flight was drawn out in the black margin. Read off the character
  grid at 80x24, both builds alike: fired from the left wall the shot crossed
  the wall on frame 10 of the 59 it is alive and finished 16 columns clear of
  it, and from the right wall on frame 16 and 15 columns clear. The tracer now
  stops at the wall. That is also the point the shot stops being able to hit
  anything - targets spawn no further out than 4.5 units and so sit inside the
  drawn span at every depth - so the tracer now runs exactly as long as the shot
  is still in playable space: the whole flight down the middle, 46 of 59 frames
  from the outermost column a target spawns in, and 17 from the wall, where the
  shot could never have reached a target in the first place.
- The flight itself is untouched, and deliberately so. Cutting the bullet where
  the tracer stops would have been cheaper, but the walls are drawn a little
  narrower than the tunnel radius projects to, so a shot can still be inside the
  tunnel and outside the drawn span out at the far end. The clip is in
  `drawBullets` alone; `updateBullets` is unchanged, and the hit rates that
  depend on the held column with it.
- Line endings are settled at LF, which is what the repository was written in.
  Nothing pinned them - `core.autocrlf` is off and there was no
  `.gitattributes` - so whichever tool wrote a file last decided its endings,
  and eight tracked files had drifted to CRLF. The cost was to the history
  rather than to anything running: measured over the nine files changed at the
  point of conversion, git reported 3,860 insertions against 3,685 deletions
  where the real change was 277 lines. A diff that size takes `git blame` on
  every rewritten file to one commit and leaves any later branch conflicting on
  every line. Four of the eight drifted files had no content change at all.

### Added

- `.gitattributes`, pinning `* text=auto eol=lf` with `*.png binary` over it.
  Git now normalizes on the way into the index, so an editor that writes CRLF
  still commits LF and the recurrence is closed rather than cleaned up again
  next time. Verified by hashing a CRLF copy of `src/render.ts` through
  `git hash-object --path`, which returns the same blob as the LF original.
  It is tracked, so every clone gets it and ignore rules stop applying to it.
  Adding it in the first place needed a local step: the authoring machine
  carries a global excludes file matching `.*`, so `git add .gitattributes`
  refuses the path and exits non-zero, and a bulk `git add .` passes over it
  without a word. The untracked `.gitignore` in the working tree, which
  un-ignores `.gitattributes`, is what let either form reach it. That file is
  matched by the same global rule and is never committed, so it is a workaround
  on one machine rather than part of the repository. Anywhere else configured
  that way, a new dotfile needs `git add -f`.
- Three checks per build in `test/pulse-cannon.test.mjs`: that no tracer cell
  is ever drawn outside the tunnel's span on its own row, that a tracer once
  dark stays dark, and that clipping the drawing leaves the shot itself in
  flight for as many frames as a centre shot. The existing drawn-tracer check
  now walks five firing positions from wall to wall rather than three, with the
  frames drawn and rows climbed pinned per position.

## [0.3.4-alpha] - 2026-09-12

### Fixed

- The pulse cannon now hits what it is pointed at. A shot held a constant world
  x while the only aim the player has is the screen, and perspective pulls those
  two apart: a shot converges on the vanishing point as it recedes, while the
  target it was lined up against diverges from it, so the error grew with both
  the range and how far off-centre the target sat. Flying engagements against
  the engine - steer until the ship's glyph is in the target's column, fire,
  peel off - the centre bullet landed 93.1% of the time at 15-35 units out,
  47.2% at 35-80 and 5.7% at 80-140; the three-shot volley 100%, 72.5% and
  21.3%. Every miss measured was a miss on the column, none on the row, with the
  ship a median 0.85 world units off the target's line at the moment of firing.
  A shot now holds the screen column it was fired down instead, which is also
  what it looks like it does, and the same engagements land 100%, 96.5% and 74%
  for the centre bullet and 100%, 99.1% and 95% for the volley.
- The hit itself is resolved at the depth where a shot crossed its target rather
  than wherever the frame happened to leave it. The old test compared the two
  projected up to 10 units apart, which distorted the columns it was comparing,
  and sampled only where each frame landed. The same engagement now resolves the
  same way from 60 frames a second down to 6.
- A target's block is a single character past about 47 units out, so a shot had
  to land on one exact column to count. Both positions are floored to a cell, so
  a shot dead on in world terms read as a column adrift whenever the two fell
  either side of a cell boundary, and a target's own column creeps outward
  during a long shot's flight by about a column more. `SHOT_SLACK_COLS` now
  allows one column either side of the target's block, so a shot registers where
  it passes through it or immediately beside it.

### Added

- `test/pulse-cannon.test.mjs`, covering both builds: the hit rate a player
  actually gets at three range bands, a shot holding its column across its whole
  flight, the verdict on one shot staying the same from 60 frames a second down
  to 6, and the slack registering a shot beside the target while refusing one a
  column past it. The suite had no test that aimed anything - every existing
  check placed a bullet on top of an obstacle, which passes whatever the aiming
  does, which is how this went unnoticed through three releases.

## [0.3.3-alpha] - 2026-09-11

### Fixed

- A terminal that cannot keep up with the repaint no longer re-rolls the ship
  under a held `Q` or `E`. Measuring the roll keys' release window off the
  repeat stream narrowed it to 150ms at a fast rate, and it narrowed what a
  stall in stdin delivery can do by exactly as much. That stall is the game's
  own: each finished frame goes to stdout in a single write, which is
  synchronous on Windows for a console and a pipe alike, so a terminal applying
  backpressure blocks the write and the whole loop behind it, and nothing is
  read until it clears. Driven against the real render loop, a 200x60 frame
  blocked for 264ms against a consumer draining every 250ms and the repeat
  stream arrived in one batch on the far side of it, so one unbroken six second
  hold of `Q` read as 20 presses and rolled the ship twice; an 80x24 frame
  blocked for 234ms against a consumer draining every 500ms, and the same hold
  rolled four times. A terminal keeping up blocked for 6ms at most and rolled
  once. Time the loop spent blocked is now taken off the clock before anything
  is released, so a character landing on the far side of a blocked repaint
  rejoins the hold it belongs to rather than re-pressing the key, and both of
  those holds now read one press and roll once. What the credit cannot cover is
  a deliberate re-press that lands inside a block, which reads as the hold
  carrying on and is lost; the game was frozen for that quarter second either
  way, and the alternative is a roll nobody asked for. It is claimed by an
  arriving character and by nothing else, so a key genuinely let go is credited
  nothing and expires on its own window however slowly the loop has come to
  tick. Every held key gets the same treatment rather than the roll pair alone,
  so a block longer than the flat 800ms window cannot double-toggle `P`, `M` or
  `ESCAPE` either - the longest block measured was 470ms, so that one was not
  reachable yet, but it was a wider terminal away.
- The roll keys no longer read the gaps a blocked repaint leaves as the repeat
  rate. The release window is measured off the widest gap the hold has shown,
  which only ever grows, so a gap taken for the rate while it is really too
  narrow pins the window under the true interval for the rest of the hold and
  every ordinary gap after it reads as the key having been let go. Two kinds of
  gap do that. A chunk of stdin carrying two characters presses both on the
  same clock, which is a gap of nothing; a floor of 150ms was supposed to cover
  it, but 150ms is itself narrower than the interval at every repeat rate below
  about 13 characters a second. And a character freed by a block is read late,
  which compresses the gap to the one behind it. Sweeping one unbroken six
  second hold of `Q` across every block length from 70ms to 700ms: at 5
  characters a second, 270 of them re-pressed the key, up to 8 presses and 3
  rolls at a 384ms block, and at 2 a second every block from 594ms up gave 2
  presses - while 264ms and 513ms, either side of the worst band, came through
  clean, which is how four sampled block sizes all missed it. Neither kind of
  gap is now taken for the rate, and the sweep is clean at every rate the
  repeat sliders offer. On a terminal keeping up the window is measured exactly
  as before, 150ms at 30 characters a second and 412ms at 5; on one blocking
  every frame it runs there is no clean gap to measure, so it stays at the
  800ms flat window, which is where an unmeasured stream has always left it and
  about three frames on a loop ticking that slowly. The browser build has real
  key-up events and never shared any of this.

## [0.3.2-alpha] - 2026-09-10

### Fixed

- The barrel roll no longer goes dead for the best part of a second after a
  hold. Suppressing the repeat stream on `Q` and `E` stopped a hold rolling over
  and over, but it did it with the flat 800ms window `P`, `M` and `ESCAPE` use,
  and that window restarts on every repeat character while `ROLL_COOLDOWN` runs
  from the start of the roll. The two clocks only lined up for a single tap:
  held for two seconds at ten characters a second, the cooldown expired at
  1200ms and a deliberate re-press 100ms, 300ms, 500ms or 700ms after letting go
  was swallowed anyway, so the escape move read as dead at the exact moment a
  player coming out of a dense stretch wanted it. The roll pair now measure
  their own window off the repeat stream instead: the first gap of a hold is the
  OS delay before repeat starts and is ignored, and the gaps after it are the
  rate, so the key re-arms about two repeat intervals after the last character
  rather than 800ms. A re-press 300ms after that hold now rolls. What is left is
  those two intervals, or 150ms where the stream is fast enough for the floor to
  be the wider of the two: 400ms at five characters a second, 200ms at ten, and
  150ms from about thirteen upwards. The slowest end keeps the old cost in full,
  because two intervals of the two-a-second floor on the Windows repeat-rate
  slider overrun the flat window and the cap holds it at 800ms, which is the one
  rate the measurement buys nothing at. One of those two intervals is not
  recoverable at any rate, since a press arriving exactly when the next repeat
  character was due is the same bytes at the same spacing as the hold carrying
  on; the second is the price of reading a stream the game loop delivers
  unevenly. `P`, `M` and `ESCAPE` keep the flat window, which costs them
  a beat between deliberate taps and nothing else, since no cooldown competes
  for those keys.
- A browser that would have allowed the sound outright is no longer silenced for
  the opening seconds of a `?mode=` link. Withholding the audio context until the
  page had been touched fixed the backlog of cues scheduled against a stopped
  clock, but it withheld it from every browser rather than from the ones that
  needed it: Chrome unblocks autoplay for an origin with a high media engagement
  score, and for any site given a sound permission, and hands such a page a
  context that is already running on a clock that advances. Ten seconds of
  `?mode=chaos` before a key was pressed built nothing and played nothing there,
  where the same browser used to play the run from its first frame. The context
  is built lazily on the first cue again, and the cues are gated on it actually
  running rather than on the keypress. A blocked browser hands back a suspended
  context whose cues are dropped rather than queued at `t = 0`, which is the same
  outcome as withholding it, and a permitting one plays from the first frame. The
  keypress stays as the nudge that wakes a suspended context.

## [0.3.1-alpha] - 2026-09-09

### Fixed

- A run opened straight from a `?mode=` debug link no longer opens with a loud
  clipped crack on the first keypress. A browser will not start an audio context
  before the page has been touched, and the one built for the first cue came
  back suspended with its clock stopped at zero, so every cue raised before that
  first key was scheduled for the same instant at full gain and the whole
  backlog sounded together the moment the context woke. Ten seconds of
  `?mode=chaos` before a key had 85 tones queued and peaked at more than four
  times full scale, against 0.03 for a single cannon shot. Nothing is built
  until the page has had its gesture now: the cues raised before it were never
  going to be audible, so they are dropped, and sound starts from the first key
  and plays forward. A run started from the title screen was never affected, and
  is unchanged.
- Holding `Q` or `E` in the terminal build rolls the ship once rather than over
  and over. The roll acts on the press, but the two keys were missing from the
  toggle key table, so they decayed on the 150ms movement window and every
  repeat character arriving after it re-armed as a fresh press. At two
  characters a second, the slowest setting on the Windows repeat-rate slider, a
  six second hold started four rolls and left the ship invincible for 35% of
  frames, which is exactly what the roll cooldown exists to bound. The browser
  build gates its `keydown` handler on the held key and never shared the fault.
  The suppression is not free: the window restarts on every repeat character
  while the cooldown runs from the start of the roll, so releasing a key held
  past the cooldown leaves the next press of it ignored for the rest of the
  window. That is the beat `P` and `M` have always needed between taps, and it
  is the better failure of the two.

### Changed

- The combo multiplier now stops at x8. It had no ceiling, so a chain that
  barely ever broke - obstacle density rises with difficulty, and two seconds is
  longer than the gap between kills - carried an ordinary run into the millions:
  three simulated minutes reached x343 and 12,024,295 points, against 111,295
  for the same run scored without a multiplier. The casualty was best-score
  persistence, where one long chain set a stored best that ordinary play could
  never approach again. Kills past the cap still hold the chain open, they just
  do not raise it, and the HUD counter reads the cap rather than counting past
  it, so the number shown is always the multiplier being paid. The cap sits in
  `src/types.ts` beside `COMBO_TIME` with its browser twin in `index.html`, so
  the parity suite holds the two builds to the same value.

## [0.3.0-alpha] - 2026-09-08

### Added

- A barrel roll behind `Q` and `E`, which have been bound in both builds since
  the start and did nothing at all until now. The ship rolls for half a second,
  its wings turning through four positions and its hull going white so the
  invincibility the move grants is visible rather than something to remember,
  and nothing can touch it for the duration. A press the other way mid-roll
  neither restarts nor reverses it. The cooldown runs from the start of the roll
  rather than its end, so it bounds how much of a run can be spent untouchable.
- Combo scoring. Kills strung together inside two seconds chain: the second is
  worth double, the third triple, and every further kill one step higher with
  no ceiling, with a `COMBO x3` counter on the HUD row reading the multiplier
  back and colouring up as the chain lengthens. (0.3.1-alpha caps it.)
  Two quiet seconds drop it. Orbs are a pickup rather than a kill and never
  chain, and the two collision-tracking debug scenarios score nothing, so they
  chain nothing either.
- Sound in the browser version, synthesized with the Web Audio API. No audio
  files and nothing to load: a pulse cannon zap, an orb chime, a damage crunch,
  a mine explosion, and an engine hum whose pitch follows the speed readout the
  HUD shows, so a boost is heard as well as read. The engine names the events
  and queues them for the frame it has just simulated; only the browser turns
  those names into tones. `M`, which has raised a `MUTED` indicator and driven
  nothing since it was added, now silences all of it.
- A CRT overlay in the browser version: scanlines and a soft vignette laid over
  the canvas in CSS rather than drawn into the character grid. On out of the
  box, toggled with `C`, and written through to storage so a reload comes back
  the way it was left. A browser that will not hand over its storage gets the
  default rather than an error.
- Tests for all three systems, run against both builds wherever the code is
  shared: the roll's timing, its invincibility, its cooldown and its wing
  frames; the combo chain's multiplier, decay and HUD counter; and the cue queue
  raised by firing, collecting, taking a hit and destroying a mine. The browser
  synthesizer is driven against a recording stand-in for an `AudioContext`, so
  the pitch sweep and envelope behind every cue are read back rather than
  assumed, along with the hum being held open instead of restarted each frame
  and a browser refusing an audio context leaving the game silent rather than
  throwing.
- A test pinning the debug menu's navigation hint to its pulse at the documented
  60x20 minimum. The hint is the only animated thing on that screen, so a change
  that stopped it moving would have left the screen completely still with every
  existing test passing.

## [0.2.2-alpha] - 2026-09-07

### Fixed

- The debug menu no longer loses rows off the bottom of a short screen. Its mode
  list and its navigation hint were placed by counting rows down from the title
  with nothing clamping the result, and the screen buffer discards an
  out-of-range write without complaint, so at the documented 60x20 minimum the
  fifth mode and the whole navigation hint were silently gone, and the classic
  80x24 lost the hint alone. That hint is the only thing on the screen that
  animates, so a clipped debug menu was also a completely still one. The screen
  now picks the fullest layout the height allows, giving up the blank row
  between entries and the rule above the selected one first, then the per-mode
  descriptions, then the title art, and the hint takes the last row inside the
  border when there is no room for its usual one. All five modes and the hint
  are drawn at every height from 20 to 44 rows, at 60 columns and at 80.
- Menu screens no longer draw over their own bottom border. At the documented
  60x20 minimum the debug menu wrote `[4] MINE SWEEPER` onto it and the title
  screen wrote its start prompt there; at 80x24 it was the fifth mode's
  description row.
- The menu starfield is drawn behind the text rather than over it. It was the
  last thing drawn on the title screen, the debug menu and the game over screen,
  so stars punched holes through whatever was already there: a mode name reading
  `+3] COLLISION COURSE`, a star inside the brackets of the navigation hint, and
  two gaps in the title art. Both builds shared the fault and both are fixed.

### Added

- Tests covering the menu layout in both builds: every debug menu height from 20
  to 44 rows at 60 and 80 columns drawing all five modes and the navigation hint,
  nothing written onto the border or off the buffer, the two builds laying the
  screen out identically, and the starfield leaving every drawn cell alone on all
  three menu screens.

### Changed

- The browser test that proves the screens outside a run keep redrawing is back
  on the suite's 80x24 default. It had been staged at 100x30 because the debug
  menu needed 28 rows before its navigation hint, the only animated thing on that
  screen, was drawn at all.

## [0.2.1-alpha] - 2026-09-06

### Fixed

- Pausing now stops the world. One animation clock drove the whole render layer
  and kept running through a pause, so tunnel walls cycled colour, mines blinked
  between glyphs, orbs bobbed and pulsed, and the engine glow flickered on what
  was meant to be a still image. The pulsing `[ PAUSED ]` label was lost among
  it and carried no signal. The clock is now split in two, and the label pulse is
  the only motion left on a paused screen.
- Holding `P` or `M` in the terminal build no longer toggles twice. The key decay
  window was shorter than every platform's delay before the first repeat
  character, so that character read as a fresh press and a run paused and
  immediately resumed. Toggle keys now hold a window that outlasts the repeat
  delay, while the movement and fire keys keep the short window, where re-arming
  on repeat is what a held direction wants. The browser build never had the
  fault, since its handler is gated on a key state only `keyup` clears.
- Holding `ESC` in the terminal build no longer quits the game. The first press
  backs a run out to the title screen, and the first auto-repeat character was
  read as a second press, which took the quit branch from that title screen and
  ended the process. `ESC` now shares the repeat-suppression window the pause
  and mute keys use. The browser build has no quit branch and never had it.
- The feature list no longer claims the screen shake leaves the HUD and border
  anchored in both builds. That is the terminal build's behaviour; the browser
  build translates the whole canvas, as the Browser Version section already said.

### Added

- `uiTime` game state field: the presentation clock behind the screen shake, the
  `[ NEW BEST ]` blink, and the `[ PAUSED ]` pulse. Those three effects are meant
  to outlive a pause, and everything else now freezes with the run.
- Tests covering the paused screen freezing in both builds, the two builds
  freezing the same cells, the label still pulsing while paused, an in-flight
  shake still decaying to no offset, and the terminal input layer's decoding,
  decay windows, and repeat suppression for every key that acts on the press.

### Changed

- The terminal key tables, raw stdin decoding, and key decay moved out of
  `src/index.ts` into `src/input.ts`. The entry point claims the TTY and starts
  the loop at import time, so nothing in it could be reached by a test; the
  input layer now can be. Decay is checked once per frame against a supplied
  clock rather than on a timer, which leaves no pending handles behind.
- The pause gate names the mode as well as the flag. The title screen, debug
  menu, and game over screen animate off the world clock and are not a run in
  progress, so they keep moving while a paused run does not.

## [0.2.0-alpha] - 2026-09-05

### Added

- High score persistence in the browser build. The best score is written to
  `localStorage` and restored on load, so it survives a page reload. Every
  access is guarded, so a browser that refuses storage falls back to a
  session-only best instead of failing.
- `[ NEW BEST ]` HUD banner, raised the first time a run passes the stored best
  and fading after two seconds. It stays quiet on a first run, when there is no
  previous best to beat.
- Pause support on the `P` key, with a centered `[ PAUSED ]` overlay. Pausing
  halts movement, scoring, spawning, and collision while leaving animation
  timers running, so an in-flight damage flash finishes rather than freezing.
- Speed readout in the footer status strip, shown as a multiple of the starting
  speed (`SPD: 1.4x`). It reflects both boost and the difficulty ramp, since
  cruise speed itself climbs with distance.
- Mute toggle on the `M` key, setting a `muted` flag in game state and showing a
  `MUTED` indicator in the footer. The flag is a placeholder for the sound work
  and drives nothing yet. It is a setting rather than run state, so it carries
  across restarts.
- Screen shake on damage, lasting roughly 200ms and fading out. The browser
  build offsets the canvas by up to five pixels; the terminal build jolts the
  play area by one character column, leaving the HUD and border anchored.
- `ScreenBuffer.shiftRows()` for shifting a range of rows horizontally, which is
  what the terminal shake is built on.
- Test suite covering both builds: persistence, pause, mute, speed readout,
  shake, footer layout at every supported width, and parity between the terminal
  and browser engines. Run with `npm test`. The suite uses the Node built-in test
  runner and adds no dependencies.

### Changed

- Debug scenarios no longer set the best score. They are diagnostics rather than
  scored runs, and letting them write a best made the persisted value
  untrustworthy.
- Footer control hints now list `P:Pause` and `M:Mute`, and fall back to a
  compact form on a terminal too narrow for the full list.
- The starting speed, shake duration, and banner duration are named constants
  shared by both builds instead of inline literals.

## [0.1.0-alpha] - 2026-02-08

### Changed

- **BREAKING**: Converted project from VS Code extension to command-line tool
- Replaced WebGL 3D renderer with DOS-style terminal graphics using ANSI escape codes
- Restructured `src/` from single `extension.ts` to modular architecture: `index.ts`, `game.ts`, `render.ts`, `menu.ts`, `screen.ts`, `types.ts`
- Updated `package.json` from VS Code extension manifest to Node.js CLI tool with `bin` entry
- Changed boost control from `Shift` to `F` key (terminal raw mode cannot detect Shift hold)
- Replaced `@types/vscode` dependency with `terminal-kit` for terminal input handling

### Added

- Double-buffered ANSI screen buffer (`screen.ts`) for flicker-free terminal rendering
- Pseudo-3D perspective tunnel with converging walls, neon color palette, and animated ring stripes
- Parallax starfield background
- ASCII/Unicode ship sprite with animated engine glow
- Depth-scaled entities (obstacles, mines, orbs grow larger as they approach)
- Damage flash and collection flash visual effects via border color changes
- Boost speed lines effect
- `--debug` CLI flag to open debug scenario menu
- `--mode <name>` CLI flag to start a specific debug mode directly
- `--help` CLI flag
- Terminal size detection with minimum size warning (60x20)
- Alternate screen buffer usage for clean terminal restore on exit
- Cross-platform support: Windows, macOS, Linux

### Removed

- VS Code webview panel and extension activation code
- WebGL shader compilation and 3D geometry builders
- `.vscodeignore` file
- `@types/vscode` and `@vscode/vsce` dependencies
