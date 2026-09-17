# Changelog

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
  a free flight 5 to 8 in 850. The staged walk pins `unlit` at nil rather than
  allowing it a share, and `wide` keeps the 5% the sweep inside a frame earns.

### Added

- A free-flight check, on a pilot that flies the run `startGame` opens rather
  than staging one: sixty obstacles in the tunnel, the ship held at a height and
  steered onto a block's drawn column read off the rendered buffer, firing every
  0.12 seconds, for 1200 frames at each of the three grids in both builds. Both
  contact invariants are asked of it. No frame of any flight drew a tracer on a
  block that was still there the frame after with the shot still in the air, and
  98% or better of kills had their tracer on the killed block or within the
  grid's column slack of it - measured over three passes of the whole matrix,
  847 to 870 kills a pass with 5 to 8 outside it, and none at all landing with
  no tracer drawn. Replacing `contacts` with a flat refusal turns the first
  figure into 662 to 29,594 ignored contacts a flight, which is the same
  detector that counted 164 of them in a real browser window with the hit rule
  switched off.
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
