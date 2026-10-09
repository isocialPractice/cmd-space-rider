// test/leaderboard.test.mjs — The top ten, the three-character name that earns a
// row on it, and where the table is drawn.
//
// Three separate things are being pinned, and they fail differently.
//
// The table arithmetic is pure and shared by both builds: what qualifies, where
// a new row lands among equal scores, and what a stored table is allowed to say.
// That last one is the only part of this feature reading a value the player can
// edit by hand, so it is checked against the shapes a hand-edited store actually
// takes rather than only against a good one.
//
// The entry screen is input, and the thing to hold onto is that the ENTER which
// names a score is still in `justPressed` for the rest of the frame that read
// it. Name entry is handled after the branch that relaunches a run from the game
// over screen for exactly that reason, and the test for it is the one below that
// presses ENTER once and checks the run did not restart.
//
// The drawing is layout, and it is bounded by rows rather than by columns: ten
// entries down one column needs ten rows that an 80x24 grid has not got.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  REPO_ROOT, loadBrowserEngine, fakeStorage, hostileStorage,
  rowText, screenText,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ScreenBuffer: TerminalScreen } = require(join(REPO_ROOT, 'out', 'screen.js'));
const terminalTypes = require(join(REPO_ROOT, 'out', 'types.js'));
const terminalMenu = require(join(REPO_ROOT, 'out', 'menu.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  {
    name: 'terminal',
    Game: TerminalGame,
    ScreenBuffer: TerminalScreen,
    api: terminalTypes,
    menu: terminalMenu,
  },
  {
    name: 'browser',
    Game: browser.Game,
    ScreenBuffer: browser.ScreenBuffer,
    api: browser,
    menu: browser,
  },
];

const { LEADERBOARD_SIZE } = terminalTypes;

/** A table of `n` entries, descending, so the floor is predictable. */
function table(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ name: 'AAA', score: (n - i) * 1000 });
  return out;
}

/**
 * A run ended with the given score, on an 80x24 grid, against an empty table.
 *
 * The table is cleared rather than inherited. The browser build loads it from
 * storage as the state is created, and the engine under test here is one copy
 * shared by the whole file, so a run that filed a score leaves it in storage for
 * the next test's fresh Game to read back. Stating the table each test starts
 * from is what keeps these checks about the run rather than about their order;
 * the persistence itself is checked below against an engine of its own.
 */
function died(build, score, mode) {
  const game = new build.Game();
  game.state.screenWidth = 80;
  game.state.screenHeight = 24;
  game.state.leaderboard = [];
  game.startGame(mode);
  game.state.score = score;
  game.endGame();
  return game;
}

/** Press a key on the screen the game is showing, as a shell's frame does. */
function press(game, key) {
  game.handleMenuInput({ [key]: true });
}

// ----- What qualifies -----

test('an empty table takes anything that scored at all', () => {
  for (const build of BUILDS) {
    assert.equal(build.api.scoreQualifies([], 1), true, `${build.name}: one point is a score`);
    assert.equal(build.api.scoreQualifies([], 0), false, `${build.name}: nothing is not`);
    assert.equal(build.api.scoreQualifies([], -5), false, `${build.name}: nor is less than nothing`);
  }
});

test('a table with room takes any score, and a full one takes only a better score', () => {
  for (const build of BUILDS) {
    const short = table(LEADERBOARD_SIZE - 1);
    assert.equal(build.api.scoreQualifies(short, 1), true, `${build.name}: there is a row free`);

    const full = table(LEADERBOARD_SIZE);
    const floor = full[full.length - 1].score;
    assert.equal(build.api.scoreQualifies(full, floor + 1), true, `${build.name}: past the floor`);
    assert.equal(build.api.scoreQualifies(full, floor), false, `${build.name}: level with it`);
    assert.equal(build.api.scoreQualifies(full, floor - 1), false, `${build.name}: under it`);
  }
});

test('every new best qualifies, which is the stricter reading this one covers', () => {
  // The item asked for a name on a run that beat the best score. Making the
  // table is the looser rule, and it has to include every case the strict one
  // would have: a score above everything on the table is above its floor too.
  for (const build of BUILDS) {
    const full = table(LEADERBOARD_SIZE);
    const best = full[0].score;
    assert.equal(build.api.scoreQualifies(full, best + 1), true, `${build.name}: a new best`);
  }
});

// ----- What the table does with an entry -----

test('a recorded score lands in rank order and the table stays ten long', () => {
  for (const build of BUILDS) {
    let entries = [];
    for (const score of [500, 9000, 100, 3000]) {
      entries = build.api.recordScore(entries, { name: 'ABC', score });
    }
    assert.deepEqual(
      entries.map((e) => e.score), [9000, 3000, 500, 100],
      `${build.name}: sorted on the way in`
    );

    for (let i = 0; i < 20; i++) entries = build.api.recordScore(entries, { name: 'XYZ', score: i });
    assert.equal(entries.length, LEADERBOARD_SIZE, `${build.name}: trimmed to ten`);
    assert.deepEqual(
      entries.map((e) => e.score), [9000, 3000, 500, 100, 19, 18, 17, 16, 15, 14],
      `${build.name}: and the ten kept are the best ten`
    );
  }
});

test('a score matching one already on the table ranks below it', () => {
  // Stable sort, deliberately: the run that got there first keeps the row, so a
  // second run of the same score does not quietly demote the first.
  for (const build of BUILDS) {
    const first = build.api.recordScore([], { name: 'ONE', score: 4242 });
    const both = build.api.recordScore(first, { name: 'TWO', score: 4242 });
    assert.deepEqual(
      both.map((e) => e.name), ['ONE', 'TWO'],
      `${build.name}: the earlier run holds the higher row`
    );
  }
});

test('a recorded entry is normalized on the way in', () => {
  for (const build of BUILDS) {
    const entries = build.api.recordScore([], { name: 'ab', score: 100.9 });
    assert.equal(entries[0].name, 'AB ', `${build.name}: upper case and padded to three`);
    assert.equal(entries[0].score, 100, `${build.name}: and the score is a whole number`);
  }
});

// ----- Names -----

test('a name is three characters from the alphabet, whatever it arrived as', () => {
  for (const build of BUILDS) {
    const { normalizeName, NAME_LENGTH, NAME_ALPHABET } = build.api;
    for (const [said, want] of [
      ['ABC', 'ABC'],
      ['abc', 'ABC'],
      ['', '   '],
      ['A', 'A  '],
      ['ABCDEFGH', 'ABC'],
      ['a-b', 'A B'],
      ['\n\t!', '   '],
      ['A1 ', 'A1 '],
    ]) {
      const got = normalizeName(said);
      assert.equal(got, want, `${build.name}: ${JSON.stringify(said)}`);
      assert.equal(got.length, NAME_LENGTH, `${build.name}: three characters`);
      for (const ch of got) {
        assert.ok(NAME_ALPHABET.includes(ch), `${build.name}: ${ch} is spellable`);
      }
    }
  }
});

test('the alphabet spells what the entry screen can reach, and nothing it cannot', () => {
  for (const build of BUILDS) {
    const { NAME_ALPHABET, DEFAULT_NAME, normalizeName } = build.api;
    assert.match(NAME_ALPHABET, /^[A-Z0-9 ]+$/, `${build.name}: letters, digits and a space`);
    assert.equal(
      new Set(NAME_ALPHABET).size, NAME_ALPHABET.length,
      `${build.name}: no character twice, or cycling would stall on it`
    );
    assert.equal(
      normalizeName(DEFAULT_NAME), DEFAULT_NAME,
      `${build.name}: the default name is already in the alphabet`
    );
  }
});

// ----- A stored table -----

test('a stored table survives the trip, and a corrupt one does not take the rest with it', () => {
  for (const build of BUILDS) {
    const { sanitizeLeaderboard, DEFAULT_NAME } = build.api;

    assert.deepEqual(
      sanitizeLeaderboard([{ name: 'ABC', score: 500 }, { name: 'DEF', score: 900 }]),
      [{ name: 'DEF', score: 900 }, { name: 'ABC', score: 500 }],
      `${build.name}: read back in rank order`
    );

    // Not a table at all.
    for (const junk of [null, undefined, 0, 'nope', { score: 5 }, true]) {
      assert.deepEqual(
        sanitizeLeaderboard(junk), [],
        `${build.name}: ${JSON.stringify(junk) ?? 'undefined'} is not a table`
      );
    }

    // A table with some rows that are not entries. The good rows survive.
    assert.deepEqual(
      sanitizeLeaderboard([
        { name: 'ABC', score: 300 },
        null,
        7,
        'ABC 400',
        { name: 'DEF' },
        { name: 'GHI', score: 'lots' },
        { name: 'JKL', score: NaN },
        { name: 'MNO', score: Infinity },
        { name: 'PQR', score: -40 },
        { name: 'STU', score: 0 },
        // A fraction under one is a zero once the table has made it a whole
        // number, so the floor is tested against the whole number rather than
        // against the figure in storage.
        { name: 'VWX', score: 0.5 },
        { score: 800 },
        { name: 'this is far too long', score: 100.7 },
      ]),
      [
        { name: DEFAULT_NAME, score: 800 },
        { name: 'ABC', score: 300 },
        { name: 'THI', score: 100 },
      ],
      `${build.name}: every good row and only the good rows`
    );

    // More rows than the table holds.
    const many = [];
    for (let i = 0; i < 40; i++) many.push({ name: 'AAA', score: i + 1 });
    assert.equal(
      sanitizeLeaderboard(many).length, LEADERBOARD_SIZE,
      `${build.name}: trimmed to ten on the way in`
    );
    assert.equal(sanitizeLeaderboard(many)[0].score, 40, `${build.name}: keeping the best ten`);
  }
});

test('the browser build writes the table through and reads it back', () => {
  const storage = fakeStorage();
  const engine = loadBrowserEngine(storage);
  const game = new engine.Game();

  game.startGame();
  game.state.score = 7700;
  game.endGame();
  assert.equal(game.state.mode, 'nameEntry', 'the score made the table');

  game.handleMenuInput({ ENTER: true });
  assert.deepEqual(game.state.leaderboard, [{ name: 'AAA', score: 7700 }]);
  assert.equal(
    storage.read(engine.LEADERBOARD_KEY), JSON.stringify([{ name: 'AAA', score: 7700 }]),
    'the table reached storage'
  );

  // A fresh page against the same storage opens with the table already on it.
  const reopened = loadBrowserEngine(storage);
  assert.deepEqual(new reopened.Game().state.leaderboard, [{ name: 'AAA', score: 7700 }]);
});

test('storage that will not answer leaves an empty table rather than an error', () => {
  // The same rule the best score and the CRT choice already follow: a privacy
  // mode or a file:// sandbox throws on every access, and the game plays on.
  const engine = loadBrowserEngine(hostileStorage());
  const game = new engine.Game();
  assert.deepEqual(game.state.leaderboard, [], 'opened on an empty table');

  game.startGame();
  game.state.score = 1234;
  game.endGame();
  game.handleMenuInput({ ENTER: true });
  assert.deepEqual(game.state.leaderboard, [{ name: 'AAA', score: 1234 }], 'the session keeps it');
  assert.equal(game.state.mode, 'dead', 'and the run closed out normally');
});

test('a stored value that is not JSON at all reads as an empty table', () => {
  const engine = loadBrowserEngine(fakeStorage({ 'cmdSpaceRider.leaderboard': 'not json {' }));
  assert.deepEqual(new engine.Game().state.leaderboard, []);
});

// ----- Reaching the entry screen -----

test('a qualifying run is named before it is buried', () => {
  for (const build of BUILDS) {
    const game = died(build, 5000);
    assert.equal(game.state.mode, 'nameEntry', `${build.name}: the entry screen came up`);
    assert.equal(game.state.entryName, build.api.DEFAULT_NAME, `${build.name}: opening on AAA`);
    assert.equal(game.state.entrySlot, 0, `${build.name}: with the first slot under the cursor`);
  }
});

test('a run that earned nothing goes straight to the game over screen', () => {
  for (const build of BUILDS) {
    assert.equal(died(build, 0).state.mode, 'dead', `${build.name}: no score, no name`);
  }
});

test('a run that missed the table goes straight to the game over screen', () => {
  for (const build of BUILDS) {
    const game = new build.Game();
    game.state.leaderboard = table(LEADERBOARD_SIZE);
    game.startGame();
    game.state.score = 1;
    game.endGame();
    assert.equal(game.state.mode, 'dead', `${build.name}: under the floor, no name`);
    assert.equal(
      game.state.leaderboard.length, LEADERBOARD_SIZE,
      `${build.name}: and the table is as it was`
    );
  }
});

test('a debug scenario is never named, whatever it scored', () => {
  // The same rule the best score and the powerup drop already follow: a
  // scenario is a diagnostic rather than a scored run.
  for (const build of BUILDS) {
    for (const mode of ['mines', 'orbs', 'obstacleCollision', 'mineCollision', 'chaos']) {
      const game = died(build, 999999, mode);
      assert.equal(game.state.mode, 'dead', `${build.name}: ${mode} goes straight to dead`);
      assert.deepEqual(game.state.leaderboard, [], `${build.name}: ${mode} left no row`);
    }
  }
});

// ----- Spelling a name -----

test('up and down walk the alphabet under the cursor, and wrap at both ends', () => {
  for (const build of BUILDS) {
    const { NAME_ALPHABET } = build.api;
    const last = NAME_ALPHABET[NAME_ALPHABET.length - 1];

    const game = died(build, 5000);
    press(game, 'UP');
    assert.equal(game.state.entryName, 'BAA', `${build.name}: A went to B`);
    press(game, 'DOWN');
    assert.equal(game.state.entryName, 'AAA', `${build.name}: and back`);
    press(game, 'DOWN');
    assert.equal(game.state.entryName, last + 'AA', `${build.name}: under A wraps to the end`);
    press(game, 'UP');
    assert.equal(game.state.entryName, 'AAA', `${build.name}: and past the end wraps to A`);
  }
});

test('left and right move the cursor, and stop at the two ends', () => {
  for (const build of BUILDS) {
    const game = died(build, 5000);
    const s = game.state;

    press(game, 'LEFT');
    assert.equal(s.entrySlot, 0, `${build.name}: already at the first slot`);

    press(game, 'RIGHT');
    assert.equal(s.entrySlot, 1, `${build.name}: moved along`);
    press(game, 'UP');
    assert.equal(s.entryName, 'ABA', `${build.name}: and the cursor is what changed`);

    press(game, 'RIGHT');
    press(game, 'RIGHT');
    assert.equal(s.entrySlot, build.api.NAME_LENGTH - 1, `${build.name}: stops at the last slot`);
    press(game, 'UP');
    assert.equal(s.entryName, 'ABB', `${build.name}: editing the last slot`);
  }
});

test('the letter keys spell a name as well as the arrows do', () => {
  // Both builds send both namings: the terminal maps W/A/S/D beside the arrows,
  // and the browser routes its stick and its pad through the arrow names.
  for (const build of BUILDS) {
    const game = died(build, 5000);
    press(game, 'W');
    assert.equal(game.state.entryName, 'BAA', `${build.name}: W is up`);
    press(game, 'S');
    assert.equal(game.state.entryName, 'AAA', `${build.name}: S is down`);
    press(game, 'D');
    assert.equal(game.state.entrySlot, 1, `${build.name}: D is right`);
    press(game, 'A');
    assert.equal(game.state.entrySlot, 0, `${build.name}: A is left`);
  }
});

test('a name can be spelled out and filed', () => {
  for (const build of BUILDS) {
    const game = died(build, 4321);
    const walk = (key, times) => {
      for (let i = 0; i < times; i++) press(game, key);
    };
    walk('UP', 'J'.charCodeAt(0) - 'A'.charCodeAt(0));
    press(game, 'RIGHT');
    walk('UP', 'S'.charCodeAt(0) - 'A'.charCodeAt(0));
    press(game, 'RIGHT');
    walk('UP', 'H'.charCodeAt(0) - 'A'.charCodeAt(0));
    assert.equal(game.state.entryName, 'JSH', `${build.name}: spelled`);

    press(game, 'ENTER');
    assert.equal(game.state.mode, 'dead', `${build.name}: on to the game over screen`);
    assert.deepEqual(
      game.state.leaderboard, [{ name: 'JSH', score: 4321 }],
      `${build.name}: filed under the name`
    );
  }
});

test('the ENTER that files a name does not also relaunch the run', () => {
  // Name entry is read after the branch that starts a run from the game over
  // screen, because that branch would see the mode this one leaves behind: the
  // keypress is still in justPressed for the rest of the frame that read it.
  for (const build of BUILDS) {
    const game = died(build, 5000);
    press(game, 'ENTER');
    assert.equal(game.state.mode, 'dead', `${build.name}: the run did not restart`);
    assert.equal(game.state.leaderboard.length, 1, `${build.name}: and the name was filed`);
  }
});

test('escaping the entry screen files the score rather than losing it', () => {
  // The score was earned before the screen came up, so ESCAPE is a choice about
  // the name. The mode it leaves behind is 'dead', which is what both shells
  // then read as "go to the title screen".
  for (const build of BUILDS) {
    const game = died(build, 6000);
    press(game, 'ESCAPE');
    assert.equal(game.state.mode, 'dead', `${build.name}: left on the game over screen`);
    assert.deepEqual(
      game.state.leaderboard, [{ name: build.api.DEFAULT_NAME, score: 6000 }],
      `${build.name}: filed under the name showing`
    );
  }
});

test('a second qualifying run opens on a fresh name', () => {
  for (const build of BUILDS) {
    const game = died(build, 5000);
    press(game, 'UP');
    press(game, 'ENTER');

    game.startGame();
    game.state.score = 6000;
    game.endGame();
    assert.equal(game.state.mode, 'nameEntry', `${build.name}: named again`);
    assert.equal(game.state.entryName, build.api.DEFAULT_NAME, `${build.name}: from AAA`);
    assert.equal(game.state.entrySlot, 0, `${build.name}: at the first slot`);
  }
});

// ----- The entry screen on the grid -----

test('the entry screen shows the score and the three slots', () => {
  for (const build of BUILDS) {
    const game = died(build, 13579);
    game.state.stars = []; // the starfield draws over the text, so clear it to read
    const screen = new build.ScreenBuffer(80, 24);
    build.menu.renderNameEntry(screen, game.state);

    const text = screenText(screen);
    assert.match(text, /N E W   H I G H   S C O R E/, `${build.name}: the heading`);
    assert.match(text, /13579/, `${build.name}: the score it was earned with`);
    assert.match(text, /ENTER YOUR CALLSIGN/, `${build.name}: what to do about it`);
    assert.match(text, /A A A/, `${build.name}: the three slots, spaced`);
    assert.match(text, /ENTER/, `${build.name}: and how to confirm`);
  }
});

test('the bar under the slots follows the cursor', () => {
  for (const build of BUILDS) {
    const game = died(build, 5000);
    game.state.stars = [];
    const screen = new build.ScreenBuffer(80, 24);

    const barColumns = () => {
      build.menu.renderNameEntry(screen, game.state);
      const out = [];
      for (let y = 0; y < 24; y++) {
        const row = rowText(screen, y);
        for (let x = 0; x < row.length; x++) if (row[x] === '▀') out.push(x);
      }
      return out;
    };

    const first = barColumns();
    assert.equal(first.length, 1, `${build.name}: one slot is active at a time`);

    press(game, 'RIGHT');
    const second = barColumns();
    assert.equal(second.length, 1, `${build.name}: still one`);
    assert.ok(second[0] > first[0], `${build.name}: and it moved right with the cursor`);
  }
});

test('a space in a slot is still a slot the player can see', () => {
  // A space draws no glyph, so the bar and the rules under the other two slots
  // are the only thing saying the slot is there at all.
  for (const build of BUILDS) {
    const game = died(build, 5000);
    game.state.stars = [];
    game.state.entryName = '   ';
    const screen = new build.ScreenBuffer(80, 24);
    build.menu.renderNameEntry(screen, game.state);

    const text = screenText(screen);
    assert.match(text, /▀/, `${build.name}: the cursor is drawn`);
    assert.match(text, /─/, `${build.name}: and so are the slots beside it`);
  }
});

test('the cursor blinks on a slot holding a space, because the bar carries it', () => {
  // The blink used to sit on the character, and ScreenBuffer.render skips a
  // space outright, so the one screen a player meets while spelling a one or
  // two character callsign was the one screen that stopped moving. The test
  // above cannot see that: it never advances the clock.
  //
  // sin(uiTime * 6) has a period of about 1.047s, so 0.1 and 0.7 are a little
  // over half a period apart and straddle a zero crossing.
  for (const build of BUILDS) {
    const game = died(build, 5000);
    game.state.stars = [];
    game.state.entryName = '   ';
    game.state.entrySlot = 0;

    const render = (uiTime) => {
      game.state.uiTime = uiTime;
      const screen = new build.ScreenBuffer(80, 24);
      build.menu.renderNameEntry(screen, game.state);
      return screen;
    };
    const glyph = (screen, x, y) => screen.chars[y * screen.width + x];
    const ink = (screen, x, y) => screen.fg[y * screen.width + x];
    const cell = (screen, x, y) => `${glyph(screen, x, y)}|${ink(screen, x, y)}`;

    const bright = render(0.1);
    const dim = render(0.7);

    let bar = null;
    for (let y = 0; y < 24 && bar === null; y++) {
      for (let x = 0; x < 80; x++) {
        if (glyph(bright, x, y) === '▀') { bar = { x, y }; break; }
      }
    }
    assert.ok(bar !== null, `${build.name}: the cursor's bar is on the grid`);

    assert.notEqual(
      cell(bright, bar.x, bar.y), cell(dim, bar.x, bar.y),
      `${build.name}: the bar under an empty slot differs between the two phases`
    );

    // The rules under the other two slots are the half that already held, and
    // they have to keep holding - a cursor only reads as one if what sits
    // beside it is still.
    for (const dx of [2, 4]) {
      assert.equal(
        glyph(bright, bar.x + dx, bar.y), '─',
        `${build.name}: the slot ${dx} columns over draws the inactive rule`
      );
      assert.equal(
        cell(bright, bar.x + dx, bar.y), cell(dim, bar.x + dx, bar.y),
        `${build.name}: and does not change with the phase`
      );
    }

    // Neither phase is the grey those rules are drawn in, so the live slot is
    // identifiable whichever half of the period it is caught in. That is the
    // reason the bar blinks its colour rather than blinking out.
    const grey = ink(bright, bar.x + 2, bar.y);
    assert.equal(glyph(dim, bar.x, bar.y), '▀', `${build.name}: the bar is still a bar`);
    assert.notEqual(ink(bright, bar.x, bar.y), grey, `${build.name}: and live in one phase`);
    assert.notEqual(ink(dim, bar.x, bar.y), grey, `${build.name}: and in the other`);
  }
});

test('browser: and the blink survives being painted, which the buffer cannot say', () => {
  // The test above reads the colour the engine assigned. That is the half the
  // defect was never in: the old code alternated a colour too, on the slot's
  // character, and `render` dropped it on the floor because the character was a
  // space. So the premise the fix rests on - a space is never painted, and the
  // bar always is - has to be read off what the renderer was asked to draw.
  //
  // Verified in chromium against the live canvas before this was written: over
  // 2.0s sampled every 50ms, the bar cell under a space slot gave 2 distinct
  // paintings and the slot's own glyph cell gave 0 inked pixels, in both colour
  // schemes. This is that reading without the browser.
  //
  // Browser-only because `render` is: the terminal build writes through
  // terminal-kit and has no canvas to be asked anything.
  const CELL_W = 10, CELL_H = 18;
  const game = died(BUILDS[1], 5000);
  game.state.stars = [];
  game.state.entryName = '   ';
  game.state.entrySlot = 0;

  /** What `render` asked the canvas to draw, by cell, with the ink it set. */
  const painted = (uiTime) => {
    game.state.uiTime = uiTime;
    const screen = new browser.ScreenBuffer(80, 24);
    browser.renderNameEntry(screen, game.state);
    const cells = new Map();
    let fillStyle = '';
    const ctx = {
      textBaseline: '', font: '', textRendering: '', fontKerning: '',
      set fillStyle(v) { fillStyle = v; },
      get fillStyle() { return fillStyle; },
      fillText: (ch, x, y) => cells.set(`${x / CELL_W},${y / CELL_H}`, { ch, fillStyle }),
      fillRect: () => {},
    };
    // No advance, so the inset is zero and a call's x is its column outright.
    screen.render(ctx, CELL_W, CELL_H, '16px monospace');
    return { screen, cells };
  };

  const bright = painted(0.1);
  const dim = painted(0.7);

  let bar = null;
  for (let y = 0; y < 24 && bar === null; y++) {
    for (let x = 0; x < 80; x++) {
      if (bright.screen.chars[y * bright.screen.width + x] === '▀') { bar = { x, y }; break; }
    }
  }
  assert.ok(bar !== null, "the cursor's bar is on the grid");

  // The slot itself. Holding a space, it is never handed to the canvas at all -
  // which is why a blink carried on it would have been invisible.
  const slot = `${bar.x},${bar.y - 1}`;
  assert.equal(bright.screen.chars[(bar.y - 1) * 80 + bar.x], ' ', 'the active slot holds a space');
  assert.equal(bright.cells.get(slot), undefined, 'a space slot is never painted in one phase');
  assert.equal(dim.cells.get(slot), undefined, 'nor in the other');

  // The bar is, in both phases, and in a different colour each time. That
  // difference is the whole of the blink a player can actually see.
  const key = `${bar.x},${bar.y}`;
  const a = bright.cells.get(key), b = dim.cells.get(key);
  assert.ok(a && b, 'the bar is painted in both phases');
  assert.equal(a.ch, '▀', 'as a bar');
  assert.equal(b.ch, '▀', 'in both');
  assert.notEqual(a.fillStyle, b.fillStyle,
    `the bar is painted a different colour each phase, saw ${a.fillStyle} twice`);

  // And the rules beside it are painted the same both times, so the blink reads
  // as one cell moving rather than as the row flickering.
  for (const dx of [2, 4]) {
    const side = `${bar.x + dx},${bar.y}`;
    const p = bright.cells.get(side), q = dim.cells.get(side);
    assert.ok(p && q, `the rule ${dx} columns over is painted`);
    assert.equal(p.ch, '─', 'as the inactive rule');
    assert.equal(p.fillStyle, q.fillStyle, 'in one colour across both phases');
    assert.notEqual(a.fillStyle, p.fillStyle, 'which the bar is never painted in');
    assert.notEqual(b.fillStyle, p.fillStyle, 'in either phase');
  }
});

test('the entry screen fits every supported size, and the hint shrinks if it must', () => {
  for (const build of BUILDS) {
    for (let w = 60; w <= 120; w += 10) {
      for (let h = 20; h <= 44; h++) {
        const game = died(build, 1234567);
        game.state.screenWidth = w;
        game.state.screenHeight = h;
        game.state.stars = [];

        const screen = new build.ScreenBuffer(w, h);
        const put = screen.put.bind(screen);
        const outside = [];
        screen.put = (x, y, ch, fg, bg) => {
          const px = Math.floor(x);
          const py = Math.floor(y);
          if (px < 0 || px >= w || py < 0 || py >= h) outside.push(`${px},${py}`);
          put(x, y, ch, fg, bg);
        };

        build.menu.renderNameEntry(screen, game.state);
        assert.deepEqual(outside, [], `${build.name} at ${w}x${h}: drew outside the buffer`);

        const text = screenText(screen);
        assert.match(text, /ENTER/, `${build.name} at ${w}x${h}: the hint survived`);
        assert.match(text, /A A A/, `${build.name} at ${w}x${h}: the slots survived`);
      }
    }
  }
});

test('the hint is the long form at every supported width', () => {
  for (const build of BUILDS) {
    const long = build.menu.nameEntryHint(60);
    assert.match(long, /LETTER/, 'the long form names what the keys do');
    assert.match(long, /SLOT/, 'both of them');
    // Pinned exactly rather than bounded, so the figure in the doc comment on
    // nameEntryHint cannot drift away from the string again.
    assert.equal(
      long.length, 39,
      `${build.name}: 39 columns, clearing the 56 of interior a 60-column grid leaves`
    );
    for (let w = 60; w <= 200; w += 10) {
      assert.equal(build.menu.nameEntryHint(w), long, `${build.name} at ${w}: still the long form`);
    }
    // Narrower than the game supports, which is where the short form is for.
    assert.notEqual(build.menu.nameEntryHint(30), long, `${build.name}: a narrow grid sheds words`);
    assert.ok(build.menu.nameEntryHint(30).length <= 26, `${build.name}: and fits what is left`);
  }
});

// ----- The table on the title screen -----

test('an empty table leaves the title screen exactly as it was', () => {
  // Not even the heading. The terminal build starts every session with an empty
  // table, so a heading over no rows is what a player would see most of the time.
  for (const build of BUILDS) {
    const game = new build.Game();
    game.state.screenWidth = 80;
    game.state.screenHeight = 24;
    game.state.stars = [];
    game.state.leaderboard = [];

    const screen = new build.ScreenBuffer(80, 24);
    build.menu.renderTitleScreen(screen, game.state);
    const before = screenText(screen);

    assert.ok(!before.includes(build.menu.LEADERBOARD_HEAD), `${build.name}: no heading`);
    assert.match(before, /PRESS ENTER TO LAUNCH/, `${build.name}: and the prompt is where it was`);
  }
});

test('a table on the title screen names the champion first', () => {
  for (const build of BUILDS) {
    const game = new build.Game();
    game.state.screenWidth = 80;
    game.state.screenHeight = 40;
    game.state.stars = [];
    game.state.leaderboard = [
      { name: 'ACE', score: 90000 },
      { name: 'BOB', score: 42000 },
      { name: 'CAT', score: 700 },
    ];

    const screen = new build.ScreenBuffer(80, 40);
    build.menu.renderTitleScreen(screen, game.state);
    const text = screenText(screen);

    assert.ok(text.includes(build.menu.LEADERBOARD_HEAD), `${build.name}: the heading is up`);
    assert.match(text, / 1\. ACE {2}90000/, `${build.name}: rank one`);
    assert.match(text, / 2\. BOB {2}42000/, `${build.name}: rank two`);
    assert.match(text, / 3\. CAT {2}700/, `${build.name}: rank three`);
    assert.match(text, /PRESS ENTER TO LAUNCH/, `${build.name}: the prompt kept its row`);
  }
});

test('a row reads rank, name and score, with the rank padded for the tenth', () => {
  for (const build of BUILDS) {
    assert.equal(build.menu.leaderText(1, { name: 'ABC', score: 50 }), ' 1. ABC  50');
    assert.equal(build.menu.leaderText(10, { name: 'XYZ', score: 1234567 }), '10. XYZ  1234567');
  }
});

test('the table is bounded by rows, and takes two columns to spend fewer of them', () => {
  for (const build of BUILDS) {
    const ten = table(LEADERBOARD_SIZE);

    // Two columns fit at every supported width, because rows are the scarce
    // thing: ten entries down one column needs ten rows an 80x24 grid has not
    // got, and the same ten in two columns of five needs five.
    for (const w of [60, 80, 120, 200]) {
      assert.equal(
        build.menu.leaderboardLayout(w, 40, 22, ten).columns, 2,
        `${build.name}: two columns at ${w} wide`
      );
    }

    // A tall grid shows the whole table.
    const tall = build.menu.leaderboardLayout(80, 40, 22, ten);
    assert.equal(tall.shown, LEADERBOARD_SIZE, `${build.name}: all ten on a tall grid`);

    // No rows left is nothing drawn rather than something drawn over the border.
    const squeezed = build.menu.leaderboardLayout(80, 24, 22, ten);
    assert.equal(squeezed.rows, 0, `${build.name}: no room under the prompt`);
    assert.equal(squeezed.shown, 0, `${build.name}: so nothing is shown`);
  }
});

test('the table appears where the title screen has room, and the figures are these', () => {
  // Read off the title screen's own placement rather than off a chosen promptY,
  // because that placement is what decides this: everything above the prompt is
  // positioned from the title art, which is a fixed number of rows, so the band
  // under the prompt is the only part of the screen that grows with the grid.
  const ten = table(LEADERBOARD_SIZE);
  const promptRow = (h) => {
    const artY = Math.floor(h * 0.15);
    const instY = artY + 4 + 2 + 3; // art, the blank pair, the subtitle, the gap
    return Math.min(instY + 4 + 3, h - 2);
  };

  for (const build of BUILDS) {
    for (let h = 20; h <= 23; h++) {
      assert.equal(
        build.menu.leaderboardLayout(80, h, promptRow(h), ten).shown, 0,
        `${build.name}: nothing fits at ${h} rows`
      );
    }
    assert.equal(
      build.menu.leaderboardLayout(80, 24, promptRow(24), ten).shown, 2,
      `${build.name}: the top two at 24 rows`
    );
    for (let h = 29; h <= 44; h++) {
      assert.equal(
        build.menu.leaderboardLayout(80, h, promptRow(h), ten).shown, LEADERBOARD_SIZE,
        `${build.name}: the whole table at ${h} rows`
      );
    }
  }
});

test('every entry is padded to the widest, so the second column lines up', () => {
  for (const build of BUILDS) {
    const entries = [
      { name: 'ACE', score: 1 },
      { name: 'BOB', score: 123456789 },
    ];
    const layout = build.menu.leaderboardLayout(120, 40, 20, entries);
    const widest = Math.max(
      build.menu.LEADERBOARD_HEAD.length,
      ...entries.map((e, i) => build.menu.leaderText(i + 1, e).length)
    );
    assert.equal(layout.width, widest, `${build.name}: the block is as wide as its widest row`);
  }
});

test('the table never draws outside the border, at any supported size or score', () => {
  for (const build of BUILDS) {
    const entries = [];
    for (let i = 0; i < LEADERBOARD_SIZE; i++) {
      entries.push({ name: 'WXY', score: 999999999 - i });
    }

    for (let w = 60; w <= 200; w += 20) {
      for (let h = 20; h <= 44; h++) {
        const game = new build.Game();
        game.state.screenWidth = w;
        game.state.screenHeight = h;
        game.state.stars = [];
        game.state.leaderboard = entries;

        const screen = new build.ScreenBuffer(w, h);
        const put = screen.put.bind(screen);
        const outside = [];
        screen.put = (x, y, ch, fg, bg) => {
          const px = Math.floor(x);
          const py = Math.floor(y);
          if (px < 0 || px >= w || py < 0 || py >= h) outside.push(`${px},${py}`);
          put(x, y, ch, fg, bg);
        };

        build.menu.renderTitleScreen(screen, game.state);
        assert.deepEqual(outside, [], `${build.name} at ${w}x${h}: drew outside the buffer`);

        // The border is still a border on every side.
        assert.equal(rowText(screen, 0)[0], '╔', `${build.name} at ${w}x${h}: top left`);
        assert.equal(rowText(screen, h - 1)[w - 1], '╝', `${build.name} at ${w}x${h}: bottom right`);
        for (let y = 1; y < h - 1; y++) {
          const row = rowText(screen, y);
          assert.equal(row[0], '║', `${build.name} at ${w}x${h}: left border at row ${y}`);
          assert.equal(row[w - 1], '║', `${build.name} at ${w}x${h}: right border at row ${y}`);
        }
      }
    }
  }
});
