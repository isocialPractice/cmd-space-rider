// test/sound.test.mjs — Sound is split in two. The engine queues named cues for
// the frame it has just simulated, which is shared code and checked against both
// builds; the browser build alone turns those names into tones, which is checked
// against a recording stand-in for an AudioContext.
//
// Runs against the compiled output in out/, so `npm run build` comes first.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { REPO_ROOT, loadBrowserEngine, fakeStorage, stageCollision, FRAME } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Game: TerminalGame } = require(join(REPO_ROOT, 'out', 'game.js'));

const browser = loadBrowserEngine(fakeStorage());

const BUILDS = [
  { name: 'terminal', Game: TerminalGame },
  { name: 'browser', Game: browser.Game },
];

function emptyRun(build, mode) {
  const game = new build.Game();
  game.startGame(mode);
  game.state.obstacles = [];
  game.state.orbs = [];
  game.state.mines = [];
  game.state.bullets = [];
  game.state.particles = [];
  return game;
}

// ----- The cue queue -----

for (const build of BUILDS) {
  test(`${build.name}: firing the cannon raises a shot`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { SPACE: true });
    assert.deepEqual(game.state.sounds, ['shot']);
  });

  test(`${build.name}: collecting an orb raises a chime`, () => {
    const game = emptyRun(build);
    game.state.orbs = [{ x: game.state.shipX, y: game.state.shipY, z: 0, collected: false }];
    game.update(FRAME, {}, {});
    assert.deepEqual(game.state.sounds, ['orb']);
  });

  test(`${build.name}: taking a hit raises damage`, () => {
    const game = emptyRun(build);
    stageCollision(game.state);
    game.update(FRAME, {}, {});
    assert.deepEqual(game.state.sounds, ['damage']);
  });

  test(`${build.name}: destroying a mine raises an explosion`, () => {
    const game = emptyRun(build);
    game.state.mines = [{ x: 4, y: 3, z: -40, rot: 0, rotSpeed: 0, scale: 1, hp: 1 }];
    game.state.bullets = [{ x: 4, y: 3, z: -40, life: 2 }];
    game.update(FRAME, {}, {});
    assert.deepEqual(game.state.sounds, ['mine']);
  });

  test(`${build.name}: a mine that survives the hit stays quiet`, () => {
    const game = emptyRun(build);
    game.state.mines = [{ x: 4, y: 3, z: -40, rot: 0, rotSpeed: 0, scale: 1, hp: 5 }];
    game.state.bullets = [{ x: 4, y: 3, z: -40, life: 2 }];
    game.update(FRAME, {}, {});
    assert.equal(game.state.mines[0].hp, 4, 'the shot should have landed');
    assert.deepEqual(game.state.sounds, [], 'but only a kill is worth a bang');
  });

  test(`${build.name}: the queue holds one frame and no more`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { SPACE: true });
    assert.equal(game.state.sounds.length, 1);

    for (let i = 0; i < 30; i++) game.update(FRAME, {}, {});
    assert.deepEqual(game.state.sounds, [], 'a build that never drains it does not grow one');
  });

  test(`${build.name}: chaos auto-fire is heard once a shot, not once a bullet`, () => {
    const game = emptyRun(build, 'chaos');
    game.state.obstacles = [];
    game.state.orbs = [];
    game.state.mines = [];
    // The auto-fire timer needs 0.12s between volleys, so a single frame at
    // 30 fps can raise at most one.
    let volleys = 0;
    for (let i = 0; i < 10; i++) {
      game.update(FRAME, {}, {});
      const shots = game.state.sounds.filter((cue) => cue === 'shot');
      assert.ok(shots.length <= 1, `frame ${i} raised ${shots.length} shots`);
      volleys += shots.length;
    }
    assert.ok(volleys > 0, 'chaos should be firing on its own');
  });

  test(`${build.name}: a paused run raises nothing`, () => {
    const game = emptyRun(build);
    game.update(FRAME, {}, { P: true });
    game.update(FRAME, {}, { SPACE: true });
    assert.deepEqual(game.state.sounds, []);
  });
}

test('both builds raise the same cues from the same frame', () => {
  const pair = BUILDS.map((build) => emptyRun(build));
  const script = [{ SPACE: true }, {}, { SPACE: true }, {}, {}];

  for (let i = 0; i < 20; i++) {
    const read = pair.map((game) => {
      game.update(FRAME, {}, script[i % script.length]);
      return [...game.state.sounds];
    });
    assert.deepEqual(read[1], read[0], `frame ${i}`);
  }
});

// ----- The browser build's synthesizer -----

/**
 * A recording stand-in for an AudioContext, carrying only what RetroAudio uses.
 * Every scheduled value lands in a per-node list, so a test can read back the
 * sweep and the envelope rather than the fact that something was played.
 */
function stubContext() {
  const oscillators = [];
  const gains = [];

  const recorder = (log) => ({
    setValueAtTime: (value, at) => log.push({ call: 'set', value, at }),
    exponentialRampToValueAtTime: (value, at) => log.push({ call: 'ramp', value, at }),
  });

  const ctx = {
    currentTime: 0,
    state: 'running',
    resumed: 0,
    resume() { ctx.resumed += 1; ctx.state = 'running'; },
    destination: 'speakers',
    oscillators,
    gains,
    createOscillator() {
      const node = {
        type: null, calls: [], started: null, stopped: null,
        connectedTo: null, disconnected: false,
        connect(target) { node.connectedTo = target; },
        disconnect() { node.disconnected = true; },
        start(at) { node.started = at; },
        stop(at) { node.stopped = at; },
      };
      node.frequency = recorder(node.calls);
      oscillators.push(node);
      return node;
    },
    createGain() {
      const node = {
        calls: [], connectedTo: null, disconnected: false,
        connect(target) { node.connectedTo = target; },
        disconnect() { node.disconnected = true; },
      };
      node.gain = recorder(node.calls);
      gains.push(node);
      return node;
    },
  };

  return ctx;
}

/**
 * The same, as a browser hands one back before the page has been touched:
 * suspended, with a clock that stays at 0 for as long as it is asleep and reads
 * `wakeAt` once resumed. Scheduling against a stopped clock is what used to pile
 * every cue raised before the first keypress onto the same instant.
 */
function sleepingContext(wakeAt = 5) {
  const ctx = stubContext();
  ctx.state = 'suspended';
  Object.defineProperty(ctx, 'currentTime', {
    get: () => (ctx.state === 'suspended' ? 0 : wakeAt),
  });
  return ctx;
}

/**
 * The same, as a browser that permits the sound outright hands one back:
 * already running before anything has been pressed, on a clock that advances
 * from the moment it is built. Chrome unblocks autoplay for an origin with a
 * high Media Engagement Index, which a returning player accumulates, and for
 * any site given the Sound: Allow permission.
 */
function permittedContext() {
  const ctx = stubContext();
  ctx.state = 'running';
  ctx.clock = 0;
  Object.defineProperty(ctx, 'currentTime', { get: () => ctx.clock });
  return ctx;
}

/**
 * RetroAudio with the page's gesture already given. A blocked browser builds
 * nothing worth scheduling against before that, so every test about what a cue
 * sounds like presses a key first.
 */
function wokenAudio(ctx) {
  const audio = new browser.RetroAudio(() => ctx);
  audio.resume();
  return audio;
}

/** A playing frame, as RetroAudio.frame reads one. */
function playingFrame(overrides = {}) {
  return {
    muted: false, sounds: [], mode: 'playing', paused: false,
    speed: browser.BASE_SPEED_START, ...overrides,
  };
}

test('every cue is one tone, swept and faded', () => {
  for (const [name, spec] of Object.entries(browser.SOUND_CUES)) {
    const ctx = stubContext();
    wokenAudio(ctx).play(name);

    assert.equal(ctx.oscillators.length, 1, `${name}: one oscillator`);
    const [osc] = ctx.oscillators;
    assert.equal(osc.type, spec.wave, `${name}: wave shape`);
    assert.deepEqual(osc.calls, [
      { call: 'set', value: spec.from, at: 0 },
      { call: 'ramp', value: spec.to, at: spec.dur },
    ], `${name}: pitch sweep`);
    assert.equal(osc.started, 0, `${name}: started`);
    assert.equal(osc.stopped, spec.dur, `${name}: stopped at the end of the sweep`);
    assert.equal(osc.connectedTo, ctx.gains[0], `${name}: routed through its gain`);

    assert.equal(ctx.gains.length, 1, `${name}: one gain`);
    const [gain] = ctx.gains;
    assert.equal(gain.calls[0].value, spec.gain, `${name}: opening level`);
    assert.ok(gain.calls[1].value < spec.gain, `${name}: fades out`);
    assert.ok(gain.calls[1].value > 0, `${name}: an exponential ramp cannot reach zero`);
    assert.equal(gain.connectedTo, 'speakers', `${name}: reaches the output`);
  }
});

test('the four cues the engine can raise all have a tone behind them', () => {
  assert.deepEqual(Object.keys(browser.SOUND_CUES).sort(), ['damage', 'mine', 'orb', 'shot']);
});

test('a name with no tone behind it plays nothing', () => {
  const ctx = stubContext();
  wokenAudio(ctx).play('trumpet');
  assert.equal(ctx.oscillators.length, 0);
});

test('the audio context is built once, and not before it is needed', () => {
  let built = 0;
  const ctx = stubContext();
  const audio = new browser.RetroAudio(() => { built += 1; return ctx; });

  assert.equal(built, 0, 'nothing built at construction');
  audio.play('shot');
  assert.equal(built, 1, 'the first cue builds it');
  audio.resume();
  audio.play('shot');
  audio.play('orb');
  assert.equal(built, 1, 'and nothing builds a second');
});

test('a browser that refuses an audio context leaves the game silent', () => {
  let asked = 0;
  const audio = new browser.RetroAudio(() => { asked += 1; throw new Error('no audio here'); });

  audio.resume();
  audio.play('shot');
  audio.engineOn(2);
  audio.engineOff();
  audio.frame(playingFrame({ sounds: ['shot', 'damage'] }));

  assert.equal(asked, 1, 'a context that throws is not asked for again every frame');
});

test('the hum is held open and only its pitch moves', () => {
  const ctx = stubContext();
  const audio = wokenAudio(ctx);

  audio.engineOn(1);
  audio.engineOn(2);
  audio.engineOn(3);

  assert.equal(ctx.oscillators.length, 1, 'starting it again would click');
  assert.equal(ctx.oscillators[0].type, 'triangle');
  assert.deepEqual(
    ctx.oscillators[0].calls.map((c) => c.value),
    [1, 2, 3].map((multiple) => browser.ENGINE_BASE_HZ * multiple)
  );
  assert.equal(ctx.gains[0].calls[0].value, browser.ENGINE_GAIN);
});

test('the hum stops with the run and starts again with the next', () => {
  const ctx = stubContext();
  const audio = wokenAudio(ctx);

  audio.engineOn(1);
  audio.engineOff();
  const [first] = ctx.oscillators;
  assert.equal(first.stopped, 0);
  assert.ok(first.disconnected, 'and is let go of');

  audio.engineOff();
  assert.equal(ctx.oscillators.length, 1, 'stopping a stopped hum does nothing');

  audio.engineOn(1);
  assert.equal(ctx.oscillators.length, 2, 'a new run gets a new one');
});

test('a frame plays its cues and pitches the hum to the speed readout', () => {
  const ctx = stubContext();
  const audio = wokenAudio(ctx);

  audio.frame(playingFrame({ sounds: ['shot'], speed: browser.BASE_SPEED_START * 1.5 }));

  assert.equal(ctx.oscillators.length, 2, 'the shot and the hum');
  assert.equal(ctx.oscillators[0].type, browser.SOUND_CUES.shot.wave);
  assert.equal(ctx.oscillators[1].calls[0].value, browser.ENGINE_BASE_HZ * 1.5);
});

test('muting silences the cues and cuts the hum', () => {
  const ctx = stubContext();
  const audio = wokenAudio(ctx);

  audio.frame(playingFrame({ sounds: ['shot'] }));
  assert.equal(ctx.oscillators.length, 2);

  audio.frame(playingFrame({ sounds: ['orb', 'mine'], muted: true }));
  assert.equal(ctx.oscillators.length, 2, 'nothing new while muted');
  assert.equal(ctx.oscillators[1].stopped, 0, 'and the hum is stopped');
});

test('the hum stops outside a run and while one is paused', () => {
  for (const quiet of [{ paused: true }, { mode: 'menu' }, { mode: 'dead' }]) {
    const ctx = stubContext();
    const audio = wokenAudio(ctx);

    audio.frame(playingFrame());
    assert.equal(ctx.oscillators.length, 1, 'the hum starts with the run');

    audio.frame(playingFrame(quiet));
    assert.equal(ctx.oscillators[0].stopped, 0, `${JSON.stringify(quiet)}: the hum should stop`);
  }
});

test('a suspended context is woken on the first press, and a running one left alone', () => {
  const ctx = sleepingContext();
  const audio = new browser.RetroAudio(() => ctx);

  // A `?mode=` link starts a run before anything has been pressed, so the cues
  // it raises arrive with no gesture behind them.
  audio.play('shot');
  assert.equal(ctx.resumed, 0, 'a cue is not a gesture, and wakes nothing');

  audio.resume();
  assert.equal(ctx.resumed, 1);
  assert.equal(ctx.state, 'running');

  audio.resume();
  assert.equal(ctx.resumed, 1, 'a running context is left alone');
});

// ----- The backlog a deep link used to build -----

test('cues a blocked browser cannot play are dropped, not queued', () => {
  let built = 0;
  const ctx = sleepingContext();
  const audio = new browser.RetroAudio(() => { built += 1; return ctx; });

  // Ten seconds of `?mode=chaos` before a key is touched. Every one of these
  // cues would have been scheduled at t = 0 at full gain, and the first press
  // released the lot together well past full scale.
  for (let i = 0; i < 300; i++) {
    audio.frame(playingFrame({ sounds: ['shot', 'mine', 'damage'] }));
  }

  assert.equal(built, 1, 'the context is built and asked what it can do');
  assert.equal(ctx.state, 'suspended', 'and this browser will not start it yet');
  assert.equal(ctx.oscillators.length, 0, 'so there is no backlog to release');
  assert.equal(ctx.resumed, 0, 'a cue is not a gesture and cannot wake it');
});

test('a browser that permits the sound plays a deep link from the first frame', () => {
  // The other half of the same decision. Gating on the gesture rather than on
  // what the context is doing silenced a browser that would have allowed the
  // sound outright, for the whole of the opening seconds of a debug link.
  const ctx = permittedContext();
  const audio = new browser.RetroAudio(() => ctx);

  for (let i = 0; i < 300; i++) {
    ctx.clock = i / 30;
    audio.frame(playingFrame({ sounds: ['shot'] }));
  }

  assert.equal(ctx.resumed, 0, 'a running context is never resumed');

  const hums = ctx.oscillators.filter((osc) => osc.type === 'triangle');
  const shots = ctx.oscillators.filter((osc) => osc.type === browser.SOUND_CUES.shot.wave);
  assert.equal(hums.length, 1, 'the hum runs from the first frame');
  assert.equal(shots.length, 300, 'and every shot is heard as it is fired');

  // Scheduled where the clock actually was, rather than piled onto one instant.
  assert.equal(shots[0].started, 0);
  assert.equal(shots[299].started, 299 / 30);
});

test('a cue after the gesture is scheduled on the woken clock, not at zero', () => {
  const WAKE_AT = 5;
  const ctx = sleepingContext(WAKE_AT);
  const audio = new browser.RetroAudio(() => ctx);

  audio.play('shot');
  assert.equal(ctx.oscillators.length, 0, 'the cue before the gesture is dropped');

  audio.resume();
  audio.play('shot');

  assert.equal(ctx.oscillators.length, 1, 'and the one after it is heard');
  const [osc] = ctx.oscillators;
  const { dur } = browser.SOUND_CUES.shot;
  assert.equal(osc.started, WAKE_AT, 'scheduled where the clock actually is');
  assert.equal(osc.stopped, WAKE_AT + dur);
  assert.deepEqual(osc.calls, [
    { call: 'set', value: browser.SOUND_CUES.shot.from, at: WAKE_AT },
    { call: 'ramp', value: browser.SOUND_CUES.shot.to, at: WAKE_AT + dur },
  ], 'the sweep runs from the resumed clock too');
});

test('the hum waits for a running context and starts on the frame after', () => {
  const ctx = sleepingContext();
  const audio = new browser.RetroAudio(() => ctx);

  audio.frame(playingFrame());
  assert.equal(ctx.oscillators.length, 0, 'no hum while the context is asleep');

  audio.resume();
  audio.frame(playingFrame());
  assert.equal(ctx.oscillators.length, 1, 'and one from the next frame on');
});

test('the page wakes the audio on a keypress', () => {
  const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('audio.resume()'), 'the keydown handler should nudge it');
  assert.ok(html.includes('audio.frame(game.state)'), 'and the frame should play it out');
});
