// test/input.test.mjs — Terminal input layer: key decoding, the decay window
// that stands in for the key-up event raw mode does not deliver, and the
// repeat suppression that keeps a held toggle from firing twice.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const {
  InputState, decodeKeys, KEY_DECAY_MS, TOGGLE_DECAY_MS, TOGGLE_KEYS,
} = require(join(REPO_ROOT, 'out', 'input.js'));
const { Game } = require(join(REPO_ROOT, 'out', 'game.js'));
const { ROLL_COOLDOWN } = require(join(REPO_ROOT, 'out', 'types.js'));

const ESC = String.fromCharCode(27);

// ----- Decoding -----

test('letters decode to their uppercase key name', () => {
  assert.deepEqual(decodeKeys('w'), ['W']);
  assert.deepEqual(decodeKeys('W'), ['W']);
  assert.deepEqual(decodeKeys('p'), ['P']);
});

test('arrow key escape sequences decode to directions', () => {
  assert.deepEqual(decodeKeys(ESC + '[A'), ['UP']);
  assert.deepEqual(decodeKeys(ESC + '[B'), ['DOWN']);
  assert.deepEqual(decodeKeys(ESC + '[C'), ['RIGHT']);
  assert.deepEqual(decodeKeys(ESC + '[D'), ['LEFT']);
  assert.deepEqual(decodeKeys(ESC + 'OA'), ['UP']);
});

test('a bare escape is ESCAPE, and a sequence is not', () => {
  assert.deepEqual(decodeKeys(ESC), ['ESCAPE']);
  assert.deepEqual(decodeKeys(ESC + '[A'), ['UP']);
});

test('the letters inside an escape sequence are not pressed', () => {
  // '[A' would otherwise read as a press of A, steering the ship left on
  // every up-arrow.
  assert.equal(decodeKeys(ESC + '[A').includes('A'), false);
  assert.equal(decodeKeys(ESC + 'OD').includes('D'), false);
});

test('whitespace and digits decode to their named keys', () => {
  assert.deepEqual(decodeKeys(' '), ['SPACE']);
  assert.deepEqual(decodeKeys('\r'), ['ENTER']);
  assert.deepEqual(decodeKeys('\n'), ['ENTER']);
  assert.deepEqual(decodeKeys('\t'), ['TAB']);
  assert.deepEqual(decodeKeys('3'), ['DIGIT_3']);
});

test('unbound characters decode to nothing', () => {
  assert.deepEqual(decodeKeys('z'), []);
  assert.deepEqual(decodeKeys('%'), []);
});

// ----- The decay window -----

test('a key reads as held until it goes quiet', () => {
  const input = new InputState();

  input.press('W', 0);
  assert.equal(input.keys.W, true);

  input.expire(KEY_DECAY_MS - 1);
  assert.equal(input.keys.W, true, 'still held inside the window');

  input.expire(KEY_DECAY_MS);
  assert.equal(input.keys.W, false, 'released once the window runs out');
});

test('a held movement key re-arms on every repeat character', () => {
  // Repeat is what carries a held direction, so W wants the fresh press each
  // time: the movement code reads keys.W, and re-arming keeps it true.
  const input = new InputState();

  input.press('W', 0);
  assert.equal(input.justPressed.W, true);
  input.clearJustPressed();

  // The first repeat lands after the OS delay, past the short decay window.
  input.press('W', 400);
  assert.equal(input.keys.W, true);
  assert.equal(input.justPressed.W, true, 'movement keys re-arm on repeat');
});

// ----- Toggle repeat suppression -----

test('holding a toggle key through OS repeat presses it once', () => {
  for (const key of TOGGLE_KEYS) {
    // Every platform's delay before the first repeat character, then the fast
    // stream that follows it once repeat is under way.
    for (const delay of [250, 400, 660, 750]) {
      const input = new InputState();
      let presses = 0;

      const frame = (now) => {
        input.expire(now);
        if (input.justPressed[key]) presses++;
        input.clearJustPressed();
      };

      input.press(key, 0);
      frame(0);

      // The OS delay, then repeats every 30ms for a second of holding.
      for (let t = delay; t <= delay + 1000; t += 30) {
        input.press(key, t);
        frame(t);
      }

      assert.equal(presses, 1, `${key} held through a ${delay}ms repeat delay`);
    }
  }
});

test('holding ESC leaves the run without also quitting from the title screen', () => {
  // index.ts reads a press of ESCAPE as "leave the run" from a run and as
  // "quit" from the title screen, so a repeat character taken for a second
  // press ends the process. One hold has to be one press.
  const input = new InputState();
  let presses = 0;

  const frame = (now) => {
    input.expire(now);
    if (input.justPressed.ESCAPE) presses++;
    input.clearJustPressed();
  };

  input.feed(ESC, 0);
  frame(0);
  for (let t = 250; t <= 1250; t += 30) {
    input.feed(ESC, t);
    frame(t);
  }

  assert.equal(presses, 1, 'a held ESC must not reach the quit branch');
});

test('holding a key through a slow repeat rate presses it once', () => {
  // The check above sweeps the delay before the first repeat character. This
  // one sweeps the stream that follows it, which is the other half of the same
  // hold: the Windows repeat-rate slider bottoms out around 2 characters a
  // second, and any gap wider than the decay window reads as a fresh press.
  for (const key of TOGGLE_KEYS) {
    for (const perSecond of [2, 5, 10, 30]) {
      const gap = 1000 / perSecond;
      const input = new InputState();
      let presses = 0;

      const frame = (now) => {
        input.expire(now);
        if (input.justPressed[key]) presses++;
        input.clearJustPressed();
      };

      input.press(key, 0);
      frame(0);

      // Six seconds of holding, which is long enough for the slowest rate to
      // deliver a dozen characters.
      for (let t = 660; t <= 6000; t += gap) {
        input.press(key, t);
        frame(t);
      }

      assert.equal(presses, 1, `${key} held at ${perSecond} characters a second`);
    }
  }
});

test('the roll keys act on the press, so they take the toggle window', () => {
  // Q and E start a barrel roll, which grants invincibility for as long as it
  // runs. A hold that re-armed on every repeat character would roll over and
  // over and hold the ship untouchable, which is what the cooldown exists to
  // bound.
  assert.ok(TOGGLE_KEYS.includes('Q'), 'Q rolls left on the press');
  assert.ok(TOGGLE_KEYS.includes('E'), 'E rolls right on the press');

  // The window costs nothing here: the cooldown already refuses a second roll
  // for longer than the window lasts, so no roll a player could ask for is
  // suppressed by it.
  assert.ok(
    TOGGLE_DECAY_MS < ROLL_COOLDOWN * 1000,
    `toggle window ${TOGGLE_DECAY_MS}ms must sit inside the ${ROLL_COOLDOWN * 1000}ms roll cooldown`
  );
});

test('holding a roll key through OS repeat rolls the ship once', () => {
  // The end the suppression is for, read off the engine rather than off the key
  // table: one hold is one roll, and the ship spends the rest of it touchable.
  for (const key of ['Q', 'E']) {
    for (const perSecond of [2, 5, 30]) {
      const gap = 1000 / perSecond;
      const game = new Game();
      game.startGame();
      game.state.obstacles = [];
      game.state.orbs = [];
      game.state.mines = [];

      const input = new InputState();
      let rolls = 0;
      let invincibleFrames = 0;
      let frames = 0;
      let wasRolling = false;

      // Six seconds of holding the key down: the press, then the repeat stream
      // after the usual delay. The game runs at its own frame rate throughout,
      // rather than one frame per character, or a slow repeat rate would step
      // the engine a dozen times in six seconds and read as all roll.
      const HOLD_MS = 6000;
      const FRAME_MS = FRAME * 1000;
      const chars = [0];
      for (let t = 660; t <= HOLD_MS; t += gap) chars.push(t);

      let next = 0;
      for (let now = 0; now <= HOLD_MS; now += FRAME_MS) {
        while (next < chars.length && chars[next] <= now) {
          input.press(key, now);
          next++;
        }
        input.expire(now);
        game.update(FRAME, input.keys, input.justPressed);
        input.clearJustPressed();

        const rolling = game.state.shipRoll > 0;
        if (rolling && !wasRolling) rolls++;
        wasRolling = rolling;
        if (rolling) invincibleFrames++;
        frames++;
      }

      assert.equal(rolls, 1, `${key} held at ${perSecond}/s should roll once`);
      assert.ok(
        invincibleFrames / frames < 0.15,
        `${key} at ${perSecond}/s left the ship invincible for ` +
        `${((invincibleFrames / frames) * 100).toFixed(1)}% of frames`
      );
    }
  }
});

test('a roll key held past its cooldown is deadzoned for the window after release', () => {
  // What the suppression costs, pinned rather than waved at. ROLL_COOLDOWN runs
  // from the start of the roll and the toggle window restarts on every repeat
  // character, so the two clocks only line up for a single tap. Held longer
  // than the cooldown, the window outlives it and swallows the next press.
  const rollsFor = (holdMs, gapAfterRelease) => {
    const FRAME_MS = FRAME * 1000;
    const gap = 1000 / 10;

    // The hold, then the deliberate re-press after it.
    const chars = [0];
    for (let t = 660; t <= holdMs; t += gap) chars.push(t);
    chars.push(holdMs + gapAfterRelease);

    const game = new Game();
    game.startGame();
    game.state.obstacles = [];
    game.state.orbs = [];
    game.state.mines = [];

    const input = new InputState();
    let rolls = 0;
    let wasRolling = false;
    let next = 0;

    for (let now = 0; now <= holdMs + gapAfterRelease + 1500; now += FRAME_MS) {
      while (next < chars.length && chars[next] <= now) {
        input.press('Q', now);
        next++;
      }
      input.expire(now);
      game.update(FRAME, input.keys, input.justPressed);
      input.clearJustPressed();

      const rolling = game.state.shipRoll > 0;
      if (rolling && !wasRolling) rolls++;
      wasRolling = rolling;
    }
    return rolls;
  };

  const HOLD = 2000;
  assert.ok(HOLD > ROLL_COOLDOWN * 1000, 'the hold has to outlast the cooldown to show this');

  assert.equal(
    rollsFor(HOLD, TOGGLE_DECAY_MS - 100), 1,
    'a re-press inside the window is swallowed, cooldown or no cooldown'
  );
  assert.equal(
    rollsFor(HOLD, TOGGLE_DECAY_MS + 100), 2,
    'and lands once the window has run out'
  );
});

test('a toggle key presses again once it has been released', () => {
  const input = new InputState();

  input.press('P', 0);
  assert.equal(input.justPressed.P, true);
  input.clearJustPressed();

  // Past the suppression window, so the key has gone quiet and reads as let go.
  input.press('P', TOGGLE_DECAY_MS);
  assert.equal(input.justPressed.P, true, 'a fresh press after a release counts');
});

test('the toggle window outlasts every platform repeat delay', () => {
  // The whole fix rests on this: a window shorter than the delay before the
  // first repeat character lets that character read as a second press.
  const LONGEST_PLATFORM_DELAY_MS = 750;
  assert.ok(
    TOGGLE_DECAY_MS > LONGEST_PLATFORM_DELAY_MS,
    `toggle window ${TOGGLE_DECAY_MS}ms must outlast ${LONGEST_PLATFORM_DELAY_MS}ms`
  );
  assert.ok(TOGGLE_DECAY_MS > KEY_DECAY_MS, 'toggles decay slower than movement keys');
});

test('a held movement key does not suppress a toggle beside it', () => {
  // Steering while pausing is ordinary play, so the two windows must not
  // interfere: W keeps re-arming on its short window while P holds its long one.
  const input = new InputState();
  let pauses = 0;

  const frame = (now) => {
    input.expire(now);
    if (input.justPressed.P) pauses++;
    input.clearJustPressed();
  };

  for (let t = 0; t <= 1000; t += 30) {
    input.press('W', t);
    if (t === 0 || t >= 660) input.press('P', t);
    frame(t);
    assert.equal(input.keys.W, true, 'the held direction stays down');
  }

  assert.equal(pauses, 1, 'the pause toggle still fires exactly once');
});

// ----- Wiring the decoded stream through -----

test('feeding raw stdin presses the decoded keys', () => {
  const input = new InputState();

  input.feed('wa', 0);
  assert.equal(input.keys.W, true);
  assert.equal(input.keys.A, true);

  input.feed(ESC + '[C', 0);
  assert.equal(input.keys.RIGHT, true);
});

test('a held toggle fed as raw characters still presses once', () => {
  const input = new InputState();
  let presses = 0;

  const frame = (now) => {
    input.expire(now);
    if (input.justPressed.P) presses++;
    input.clearJustPressed();
  };

  input.feed('p', 0);
  frame(0);
  for (let t = 660; t <= 1660; t += 30) {
    input.feed('p', t);
    frame(t);
  }

  assert.equal(presses, 1);
});

test('clearJustPressed empties the edge table without releasing keys', () => {
  const input = new InputState();

  input.press('SPACE', 0);
  assert.equal(input.justPressed.SPACE, true);

  input.clearJustPressed();
  assert.equal(input.justPressed.SPACE, undefined);
  assert.equal(input.keys.SPACE, true, 'the key is still held');
});
