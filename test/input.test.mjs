// test/input.test.mjs — Terminal input layer: key decoding, the decay window
// that stands in for the key-up event raw mode does not deliver, and the
// repeat suppression that keeps a held toggle from firing twice.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { REPO_ROOT } from './helpers.mjs';

const require = createRequire(import.meta.url);
const {
  InputState, decodeKeys, KEY_DECAY_MS, TOGGLE_DECAY_MS, TOGGLE_KEYS,
} = require(join(REPO_ROOT, 'out', 'input.js'));

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
