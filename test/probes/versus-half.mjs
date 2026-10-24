// test/probes/versus-half.mjs - How narrow a half the HUD can still be read in.
//
// The split screen gives each pilot half the grid, and the half carries the
// whole HUD: SCORE pinned to its left, DIST centred, SHIELD pinned to its
// right. Three readings placed from three different edges, so whether they
// clear each other is a question about the width they are placed on and about
// how many digits each of them has reached - and both of those are facts about
// a flight rather than about a constant.
//
// `VERSUS_MIN_HALF_WIDTH` in index.html is the figure this produces. It is the
// floor a round opens on, and the reason it is a measured figure rather than
// half of `MIN_WIDTH` is that the two answer different questions: MIN_WIDTH is
// the width the tunnel wants, and this is the width the readings over it want.
//
// The method, which is the part worth reading:
//
//   fly     one run per build, held alive, out to the seconds `count` names.
//           The score and the distance are read off that run at each mark
//           below, so the readings walked are the ones a flight of that length
//           actually produces - not digits picked to be awkward.
//   sweep   every half width from 20 columns up, rendering a frame with those
//           readings in it, and take the narrowest at which the three stop
//           overlapping.
//   mouth   the tunnel's own span at that width, counted off the wall columns
//           of the nearest play row, so what the floor costs the player is
//           beside what it buys them.
//
// The overlap is counted rather than looked for. Every write the frame makes to
// the HUD's reading row is tallied by column, and a column written twice is two
// readings on one cell - which is what a reader sees as `SCORE: 1234DIST:`.
// Tallying is what keeps this off a copy of the three formats: a probe carrying
// its own `SHIELD: 100%` would go on reporting a figure about a HUD the game no
// longer draws. The starfield is emptied for the same reason it is emptied in
// the suite's own staging - a star on that row is a write this would count.
//
//   npm run probe -- versus-half [--count 1200]
//
// `count` is the seconds of game time the flight runs out to, which is this
// probe's own reading of the flag - `column` and `frame-rate` read it as a
// placement walk and `free-flight` as frames. The marks inside it are fixed, so
// a narrowed walk reports the marks it reached and says which it skipped.
//
// Both builds, because the HUD is shared and the floor is therefore a figure
// about `drawHUD` rather than about the browser. The two agreeing is itself
// worth printing: test/parity.test.mjs pins the state and the constants the
// readings are drawn from, and nothing in it reads this row at a narrow width.
// Only the browser has halves to apply the figure to.

import { BUILDS, FRAME, FREE_SEEDS, HUD_ROWS, FOOTER_ROWS, WALL_CHARS } from '../engagement.mjs';

/** Seconds of game time the flight runs out to. */
const SECONDS = 1200;

/**
 * The world the flight is flown in.
 *
 * One of `FREE_SEEDS`, because this is a flight through the run the game opens
 * for itself and those are the worlds every other such flight here is flown in.
 * Seeded rather than sampled for the rig's own reason: a figure is rebuilt by
 * running the probe again. Unseeded, the two builds flew two different runs and
 * reported two different scores at the same mark, which reads as the builds
 * disagreeing about the HUD when it was the flights that differed.
 */
const SEED = FREE_SEEDS[0];

/**
 * The points along the flight the readings are taken at.
 *
 * Spread so each one is about where a digit arrives rather than evenly: a run
 * crosses five digits of score inside its first minute and six after about ten,
 * so an even walk would spend most of its marks on the same readings.
 */
const MARKS = [30, 60, 120, 300, 600, 1200];

/** Widths swept, from under anything playable up to a whole small screen. */
const FROM = 20;
const TO = 90;

/** The row the three readings are drawn on, which is the HUD's second. */
const READING_ROW = 1;

/**
 * Fly one run to each mark, reading the score and the distance off it there.
 *
 * The shield is pinned at the top of every frame, because a run flown with
 * nobody steering it does not survive thirty seconds and the readings wanted
 * here are a long flight's. The mode is put back with it, since enough damage
 * in one frame ends a run whatever the shield was set to at the start of it, and
 * the count of those is reported rather than hidden: it says the figures came
 * off a held flight and not off a flown one.
 */
function flight(build, seconds, marks) {
  build.seedRng(SEED);
  try {
    const game = new build.Game();
    game.startGame();
    const s = game.state;
    const taken = [];
    let revived = 0;
    let at = 0;

    // Two frames past the last mark, because a mark is crossed on the frame the
    // clock reaches it and the clock is a sum of thirtieths: flown to exactly
    // the mark's own frame count, the last mark lands a rounding error short and
    // goes unread.
    const frames = Math.ceil(seconds / FRAME) + 2;
    for (let f = 0; f < frames; f++) {
      s.shield = 100;
      if (s.mode !== 'playing') { s.mode = 'playing'; revived++; }
      game.update(FRAME, {}, {});
      while (at < marks.length && s.gameTime >= marks[at]) {
        taken.push({ at: marks[at], score: s.score, distance: s.distance });
        at++;
      }
    }
    return { taken, revived, flew: s.gameTime };
  } finally {
    build.seedRng(null);
  }
}

/**
 * Columns of the reading row written more than once, for a frame carrying the
 * given readings at the given width.
 *
 * The world is emptied so the only thing placing anything is the HUD. `shake`
 * is zeroed because renderGame shifts the play area while it runs, and the
 * shift is not something this row is asking about.
 */
function overlaps(build, width, reading) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = width;
  s.screenHeight = 30;
  s.stars = [];
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  s.bullets = [];
  s.particles = [];
  s.powerups = [];
  s.score = reading.score;
  s.distance = reading.distance;
  s.shield = 100;
  s.shake = 0;

  const screen = new build.ScreenBuffer(width, 30);
  const tally = new Map();
  const put = screen.put.bind(screen);
  screen.put = (x, y, ch, fg, bg) => {
    const py = Math.floor(y);
    if (py === READING_ROW) {
      const px = Math.floor(x);
      tally.set(px, (tally.get(px) ?? 0) + 1);
    }
    put(x, y, ch, fg, bg);
  };
  build.renderGame(screen, s);

  let over = 0;
  for (const written of tally.values()) if (written > 1) over++;
  return over;
}

/** The narrowest width in the sweep at which the three readings clear. */
function clearAt(build, reading) {
  for (let w = FROM; w <= TO; w++) {
    if (overlaps(build, w, reading) === 0) return w;
  }
  return null;
}

/**
 * The tunnel's span on the nearest play row, in columns: the gap between the
 * wall columns the renderer actually put there.
 *
 * Counted off the drawn row rather than worked out from the projection, so what
 * is reported is the mouth the player is flying into and not an arithmetic
 * restatement of it.
 */
function mouth(build, width) {
  const game = new build.Game();
  game.startGame();
  const s = game.state;
  s.screenWidth = width;
  s.screenHeight = 30;
  s.stars = [];
  s.obstacles = [];
  s.orbs = [];
  s.mines = [];
  s.bullets = [];
  s.particles = [];
  s.powerups = [];
  s.shake = 0;

  const screen = new build.ScreenBuffer(width, 30);
  build.renderGame(screen, s);

  const row = 30 - FOOTER_ROWS - 1;
  let left = null;
  let right = null;
  for (let x = 0; x < width; x++) {
    const ch = screen.chars[row * width + x];
    if (!WALL_CHARS.has(ch)) continue;
    if (left === null) left = x;
    right = x;
  }
  return left === null ? null : right - left + 1;
}

export async function run({ count } = {}) {
  const seconds = count ?? SECONDS;
  const reached = MARKS.filter((mark) => mark <= seconds);
  const marks = reached.length ? reached : [seconds];
  const skipped = MARKS.filter((mark) => mark > seconds);

  console.log('versus-half');
  console.log(`  flight: one run per build, seed ${SEED}, shield pinned, flown to ${seconds}s of game time`);
  console.log(`  marks: ${marks.join('s, ')}s${skipped.length ? ` (skipped ${skipped.join('s, ')}s)` : ''}`);
  console.log(`  sweep: ${FROM} to ${TO} columns, HUD row ${READING_ROW}, a column written twice is an overlap`);
  console.log(`  play rows: ${30 - HUD_ROWS - FOOTER_ROWS} of 30, which is what the sweep renders`);
  console.log('');

  const floors = [];
  for (const build of BUILDS) {
    const flown = flight(build, seconds, marks);
    console.log(
      `  ${build.name}: flew ${flown.flew.toFixed(0)}s`
      + `${flown.revived ? `, put back on 'playing' ${flown.revived} time(s)` : ''}`
    );

    let floor = 0;
    for (const reading of flown.taken) {
      const width = clearAt(build, reading);
      if (width !== null) floor = Math.max(floor, width);
      const km = (reading.distance / 10).toFixed(1);
      console.log(
        `    ${String(reading.at).padStart(4)}s`
        + `  score ${String(reading.score).padStart(7)} (${String(reading.score).length} digits)`
        + `  dist ${km.padStart(8)} km`
        + `  clear at ${width === null ? `over ${TO}` : width} columns`
      );
    }
    floors.push({ name: build.name, floor });
    const span = mouth(build, floor);
    console.log(
      `    floor ${floor} columns`
      + `  tunnel mouth ${span === null ? 'unreadable' : `${span} columns`} on the nearest play row`
    );
  }

  console.log('');
  const agreed = floors.every((one) => one.floor === floors[0].floor);
  console.log(
    agreed
      ? `  both builds put the floor at ${floors[0].floor} columns, which is VERSUS_MIN_HALF_WIDTH`
      : `  the builds disagree: ${floors.map((one) => `${one.name} ${one.floor}`).join(', ')}`
  );
  console.log(`  two halves and a seam put the grid a round needs at ${floors[0].floor * 2 + 1} columns`);
}
