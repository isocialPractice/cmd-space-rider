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
  ROLL_KEYS, PRESS_KEYS, REPEAT_SLACK, ROLL_RELEASE_MIN_MS,
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
  for (const key of PRESS_KEYS) {
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
  for (const key of PRESS_KEYS) {
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

test('the roll keys act on the press, on their own measured window', () => {
  // Q and E start a barrel roll, which grants invincibility for as long as it
  // runs. A hold that re-armed on every repeat character would roll over and
  // over and hold the ship untouchable, which is what the cooldown exists to
  // bound. So they need the suppression - but not the flat window, which
  // outlives the cooldown and deadzones the escape move after a hold.
  assert.deepEqual(ROLL_KEYS, ['Q', 'E'], 'the roll pair take the measured window');
  for (const key of ROLL_KEYS) {
    assert.equal(TOGGLE_KEYS.includes(key), false, `${key} is not on the flat window`);
    assert.ok(PRESS_KEYS.includes(key), `${key} still acts on the press`);
  }
  for (const key of TOGGLE_KEYS) {
    assert.ok(PRESS_KEYS.includes(key), `${key} still acts on the press`);
  }
});

test('a roll key narrows its window to the repeat rate the stream shows', () => {
  // The first gap of a hold is the OS delay before repeat starts, not the rate
  // it starts at, so it is skipped and the window stays wide enough to cover
  // it. The second gap is the rate, and the window follows it down.
  const input = new InputState();

  input.press('Q', 0);
  assert.equal(input.holdWindow('Q'), TOGGLE_DECAY_MS, 'nothing measured from one character');

  input.press('Q', 660);
  assert.equal(input.holdWindow('Q'), TOGGLE_DECAY_MS, 'the OS delay says nothing about the rate');

  input.press('Q', 760);
  assert.equal(input.holdWindow('Q'), 100 * REPEAT_SLACK, '10 characters a second');

  // A slower stream widens it again, and never past the flat window.
  const slow = new InputState();
  slow.press('E', 0);
  slow.press('E', 660);
  slow.press('E', 1160);
  assert.equal(slow.holdWindow('E'), TOGGLE_DECAY_MS, '2 characters a second needs all of it');

  // A stdin chunk carrying two characters presses both at once, which measures
  // as a zero gap. The floor is what stops that reading as no window at all.
  const burst = new InputState();
  burst.feed('q', 0);
  burst.feed('qq', 660);
  assert.equal(burst.holdWindow('Q'), ROLL_RELEASE_MIN_MS, 'a zero gap falls back to the floor');

  // Letting go and pressing again starts the measuring over.
  const again = new InputState();
  again.press('Q', 0);
  again.press('Q', 660);
  again.press('Q', 760);
  again.press('Q', 2000);
  assert.equal(again.holdWindow('Q'), TOGGLE_DECAY_MS, 'the last hold measured the last hold');

  // The keys on the flat window are not measured at all.
  for (const key of TOGGLE_KEYS) {
    const flat = new InputState();
    flat.press(key, 0);
    flat.press(key, 660);
    flat.press(key, 760);
    assert.equal(flat.holdWindow(key), TOGGLE_DECAY_MS, `${key} keeps the flat window`);
  }
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

test('a roll key re-presses a repeat interval after a hold, not a flat window', () => {
  // What the suppression costs, pinned rather than waved at. The roll is the
  // escape move, so a player who holds the key through a dense stretch and then
  // wants a roll on the way out must not find it dead: on the flat window the
  // next press was swallowed for up to TOGGLE_DECAY_MS after release, because
  // that window restarts on every repeat character while ROLL_COOLDOWN runs
  // from the start of the roll. Measured off the stream instead, the deadzone
  // is REPEAT_SLACK repeat intervals and the cooldown decides the rest.
  const rollsFor = (holdMs, gapAfterRelease, perSecond = 10) => {
    const FRAME_MS = FRAME * 1000;
    const gap = 1000 / perSecond;

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

  // The four re-presses the flat window used to swallow whole. Every one of
  // them is past the cooldown, which expired at 1200ms, so every one of them is
  // a roll the player asked for and can have.
  for (const after of [300, 500, 700]) {
    assert.equal(
      rollsFor(HOLD, after), 2,
      `a re-press ${after}ms after a hold should roll`
    );
  }
  assert.equal(
    rollsFor(HOLD, TOGGLE_DECAY_MS + 100), 2,
    'and so should one well past the old flat window'
  );

  // What is left is the window itself, REPEAT_SLACK intervals wide, of which
  // one interval is not recoverable at any rate: at 10 characters a second a
  // re-press 100ms after the last one is the same bytes at the same spacing as
  // the hold carrying on, and nothing in the stream tells them apart. The
  // second interval is the price of the jitter REPEAT_SLACK absorbs, so a
  // re-press inside the 200ms window is swallowed too, distinguishable or not.
  assert.equal(
    rollsFor(HOLD, 100), 1,
    'a re-press inside the stream\'s own cadence cannot be told from it'
  );

  // A slower stream measures a wider window, so the deadzone tracks the rate
  // the machine is set to rather than a number chosen for the worst of them.
  assert.equal(rollsFor(HOLD, 300, 30), 2, 'a fast repeat rate re-arms fast');
  assert.equal(rollsFor(HOLD, 300, 2), 1, 'the slowest rate still needs its beat');
});

test('the flat window keeps its deadzone, which is what the roll pair left', () => {
  // P, M and ESCAPE are unchanged on purpose: no cooldown competes for them, a
  // beat between deliberate taps is the documented cost, and the flat window is
  // the simpler thing to reason about where it costs nothing.
  const pressesAfter = (key, gapAfterRelease) => {
    const input = new InputState();
    input.press(key, 0);
    for (let t = 660; t <= 2000; t += 100) input.press(key, t);
    input.clearJustPressed();
    input.press(key, 2000 + gapAfterRelease);
    return input.justPressed[key] === true;
  };

  for (const key of TOGGLE_KEYS) {
    assert.equal(pressesAfter(key, 300), false, `${key} is still deadzoned after a hold`);
    assert.equal(
      pressesAfter(key, TOGGLE_DECAY_MS + 100), true,
      `${key} re-presses once the flat window has run out`
    );
  }
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
