// test/browser-engine.test.mjs — Browser build: persistence, pause, mute,
// speed readout, and screen shake.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadBrowserEngine, fakeStorage, hostileStorage,
  rowText, screenText, stageCollision, FRAME,
} from './helpers.mjs';

const KEY = 'cmdSpaceRider.bestScore';

/** Build a screen buffer sized for a playing frame. */
function stage(engine, game, w = 80, h = 24) {
  const screen = new engine.ScreenBuffer(w, h);
  game.state.screenWidth = w;
  game.state.screenHeight = h;
  game.initStars(w, h);
  return screen;
}

// ----- High score persistence -----

test('loadBestScore returns 0 when nothing is stored', () => {
  const engine = loadBrowserEngine(fakeStorage());
  assert.equal(engine.loadBestScore(), 0);
});

test('loadBestScore reads a stored best', () => {
  const engine = loadBrowserEngine(fakeStorage({ [KEY]: '4200' }));
  assert.equal(engine.loadBestScore(), 4200);
});

test('loadBestScore rejects unusable stored values', () => {
  for (const stored of ['', 'abc', '-5', 'NaN', '0']) {
    const engine = loadBrowserEngine(fakeStorage({ [KEY]: stored }));
    assert.equal(engine.loadBestScore(), 0, `stored value ${JSON.stringify(stored)}`);
  }
});

test('storage that throws degrades to no history instead of crashing', () => {
  const engine = loadBrowserEngine(hostileStorage());
  assert.equal(engine.loadBestScore(), 0);
  assert.doesNotThrow(() => engine.saveBestScore(1234));
  assert.doesNotThrow(() => new engine.Game());
});

test('a new game starts from the stored best', () => {
  const engine = loadBrowserEngine(fakeStorage({ [KEY]: '7777' }));
  assert.equal(new engine.Game().state.bestScore, 7777);
});

test('beating the best writes it through to storage', () => {
  const storage = fakeStorage({ [KEY]: '1000' });
  const engine = loadBrowserEngine(storage);
  const game = new engine.Game();

  game.startGame();
  game.state.score = 5000;
  game.endGame();

  assert.equal(game.state.bestScore, 5000);
  assert.equal(storage.read(KEY), '5000');
});

test('falling short of the best leaves storage alone', () => {
  const storage = fakeStorage({ [KEY]: '9000' });
  const engine = loadBrowserEngine(storage);
  const game = new engine.Game();

  game.startGame();
  game.state.score = 120;
  game.endGame();

  assert.equal(game.state.bestScore, 9000);
  assert.equal(storage.read(KEY), '9000');
});

test('debug runs never set or persist the best score', () => {
  const storage = fakeStorage({ [KEY]: '1000' });
  const engine = loadBrowserEngine(storage);
  const game = new engine.Game();

  game.startGame('chaos');
  game.state.score = 999999;
  game.endGame();

  assert.equal(game.state.bestScore, 1000);
  assert.equal(storage.read(KEY), '1000');
});

// ----- NEW BEST banner -----

test('crossing the stored best raises the banner once', () => {
  const engine = loadBrowserEngine(fakeStorage({ [KEY]: '1000' }));
  const game = new engine.Game();
  const s = game.state;

  game.startGame();
  s.obstacles = []; s.orbs = []; s.mines = [];
  s.score = 999;

  game.update(FRAME, {}, {});
  assert.ok(s.score > 1000, 'the frame should carry the score past the best');
  assert.equal(s.newBestShown, true);
  assert.equal(s.newBestFlash, engine.NEW_BEST_FLASH_TIME);

  // It re-arms for no later frame, and fades out on its own.
  const afterOne = s.newBestFlash;
  game.update(FRAME, {}, {});
  assert.ok(s.newBestFlash < afterOne, 'the banner should be fading');

  for (let i = 0; i < 100; i++) game.update(FRAME, {}, {});
  assert.equal(s.newBestFlash, 0);
  assert.equal(s.newBestShown, true);
});

test('the first ever run stays quiet, having no best to beat', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  game.startGame();
  game.state.obstacles = []; game.state.orbs = []; game.state.mines = [];
  for (let i = 0; i < 60; i++) game.update(FRAME, {}, {});

  assert.equal(game.state.bestScore, 0);
  assert.equal(game.state.newBestShown, false);
  assert.equal(game.state.newBestFlash, 0);
});

test('debug runs never raise the banner', () => {
  const engine = loadBrowserEngine(fakeStorage({ [KEY]: '10' }));
  const game = new engine.Game();

  game.startGame('chaos');
  for (let i = 0; i < 30; i++) game.update(FRAME, {}, {});

  assert.ok(game.state.score > 10, 'chaos mode should be scoring');
  assert.equal(game.state.newBestShown, false);
});

test('a fresh run re-arms the banner', () => {
  const engine = loadBrowserEngine(fakeStorage({ [KEY]: '1000' }));
  const game = new engine.Game();

  game.startGame();
  game.state.newBestShown = true;
  game.state.newBestFlash = 1.5;

  game.startGame();
  assert.equal(game.state.newBestShown, false);
  assert.equal(game.state.newBestFlash, 0);
});

// ----- Pause -----

test('P halts the run and P again resumes it', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const s = game.state;

  game.startGame();
  game.update(FRAME, {}, {});
  assert.equal(s.paused, false);

  game.update(FRAME, {}, { P: true });
  assert.equal(s.paused, true);

  const frozen = { distance: s.distance, gameTime: s.gameTime, score: s.score };
  for (let i = 0; i < 20; i++) game.update(FRAME, {}, {});
  assert.equal(s.distance, frozen.distance);
  assert.equal(s.gameTime, frozen.gameTime);
  assert.equal(s.score, frozen.score);

  game.update(FRAME, {}, { P: true });
  assert.equal(s.paused, false);
  game.update(FRAME, {}, {});
  assert.ok(s.distance > frozen.distance, 'the run should advance again');
});

test('pause holds the ship still even with the stick held over', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const s = game.state;

  game.startGame();
  game.update(FRAME, {}, { P: true });
  const shipX = s.shipX;

  for (let i = 0; i < 20; i++) game.update(FRAME, { D: true }, {});
  assert.equal(s.shipX, shipX);
});

test('animation time keeps running while paused so the overlay pulses', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  game.startGame();
  game.update(FRAME, {}, { P: true });
  const t = game.state.time;

  game.update(FRAME, {}, {});
  assert.ok(game.state.time > t);
});

test('an in-flight shake finishes rather than freezing on a pause', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const s = game.state;

  game.startGame();
  s.shake = engine.SHAKE_TIME;
  game.update(FRAME, {}, { P: true });
  assert.equal(s.paused, true);

  for (let i = 0; i < 20; i++) game.update(FRAME, {}, {});
  assert.equal(s.shake, 0);
});

test('P does nothing outside a run', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  assert.equal(game.state.mode, 'menu');
  game.update(FRAME, {}, { P: true });
  assert.equal(game.state.paused, false);
});

test('a fresh run clears a pause left over from the last one', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  game.startGame();
  game.update(FRAME, {}, { P: true });
  assert.equal(game.state.paused, true);

  game.startGame();
  assert.equal(game.state.paused, false);
});

// ----- Mute -----

test('M toggles the mute flag from any mode', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  assert.equal(game.state.muted, false);

  game.update(FRAME, {}, { M: true });   // menu
  assert.equal(game.state.muted, true);

  game.startGame();
  game.update(FRAME, {}, { M: true });   // playing
  assert.equal(game.state.muted, false);

  game.update(FRAME, {}, { M: true });
  assert.equal(game.state.muted, true);
});

test('mute survives a restart, being a setting rather than run state', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  game.update(FRAME, {}, { M: true });
  game.startGame();
  assert.equal(game.state.muted, true);
});

test('mute still toggles while paused', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();

  game.startGame();
  game.update(FRAME, {}, { P: true });
  game.update(FRAME, {}, { M: true });
  assert.equal(game.state.muted, true);
});

// ----- Screen shake -----

test('taking damage starts the shake', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const s = game.state;

  game.startGame();
  stageCollision(s);
  s.shake = 0;

  game.update(FRAME, {}, {});
  assert.equal(s.shake, engine.SHAKE_TIME);
  assert.equal(s.shield, 75, 'the staged obstacle should have landed a hit');
});

test('the shake fades out over roughly its stated duration', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const s = game.state;

  game.startGame();
  s.obstacles = []; s.orbs = []; s.mines = [];
  s.shake = engine.SHAKE_TIME;

  // Just under the duration it is still going.
  const framesToNearlyDone = Math.floor((engine.SHAKE_TIME / FRAME) - 1);
  for (let i = 0; i < framesToNearlyDone; i++) game.update(FRAME, {}, {});
  assert.ok(s.shake > 0, 'the shake should outlast most of its window');

  for (let i = 0; i < 4; i++) game.update(FRAME, {}, {});
  assert.equal(s.shake, 0);
});

test('the shake offset is bounded and settles back to zero', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const s = game.state;

  assert.deepEqual(engine.shakeOffset(s), { x: 0, y: 0 });

  s.shake = engine.SHAKE_TIME;
  let sawMovement = false;
  for (let i = 0; i < 40; i++) {
    s.time = i * FRAME;
    const off = engine.shakeOffset(s);
    assert.ok(Math.abs(off.x) <= engine.SHAKE_PIXELS + 1e-9, `x within bounds, got ${off.x}`);
    assert.ok(Math.abs(off.y) <= engine.SHAKE_PIXELS + 1e-9, `y within bounds, got ${off.y}`);
    if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) sawMovement = true;
  }
  assert.ok(sawMovement, 'a live shake should actually move the frame');

  s.shake = 0;
  assert.deepEqual(engine.shakeOffset(s), { x: 0, y: 0 });
});

// ----- HUD and footer rendering -----

test('the footer carries the speed readout', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const screen = stage(engine, game);

  game.startGame();
  engine.renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /SPD: 1\.0x/);

  game.state.speed = game.state.baseSpeed * 1.4;
  engine.renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /SPD: 1\.4x/);
});

test('the speed readout tracks difficulty scaling, not just boost', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const screen = stage(engine, game);

  game.startGame();
  // Deep into a run the cruise speed itself has climbed.
  game.state.distance = 100000;
  game.state.baseSpeed = engine.BASE_SPEED_START + game.state.distance * 0.00002;
  game.state.speed = game.state.baseSpeed;

  engine.renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /SPD: 7\.7x/);
});

test('the mute indicator appears only when muted', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const screen = stage(engine, game);

  game.startGame();
  engine.renderGame(screen, game.state);
  assert.doesNotMatch(rowText(screen, screen.height - 1), /MUTED/);

  game.state.muted = true;
  engine.renderGame(screen, game.state);
  assert.match(rowText(screen, screen.height - 1), /MUTED/);
});

test('the paused overlay is drawn only while paused', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const screen = stage(engine, game);

  game.startGame();
  engine.renderGame(screen, game.state);
  assert.doesNotMatch(screenText(screen), /\[ PAUSED \]/);

  game.state.paused = true;
  engine.renderGame(screen, game.state);
  const text = screenText(screen);
  assert.match(text, /\[ PAUSED \]/);
  assert.match(text, /P to resume/);
});

test('the NEW BEST banner is drawn only while the flash is live', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const screen = stage(engine, game);

  game.startGame();
  engine.renderGame(screen, game.state);
  assert.doesNotMatch(screenText(screen), /NEW BEST/);

  game.state.newBestFlash = 1;
  engine.renderGame(screen, game.state);
  assert.match(rowText(screen, engine.HUD_ROWS), /\[ NEW BEST \]/);
});

test('the game over screen reports the persisted best', () => {
  const engine = loadBrowserEngine(fakeStorage({ [KEY]: '4321' }));
  const game = new engine.Game();
  const screen = stage(engine, game);

  game.startGame();
  game.state.score = 100;
  game.endGame();

  // The menu starfield draws over the stats text, so clear it to read the row.
  game.state.stars = [];
  engine.renderGameOver(screen, game.state);
  assert.match(screenText(screen), /Best Score: 4321/);
});

// ----- Layout safety -----

test('the footer never overruns the border, at any supported width', () => {
  const engine = loadBrowserEngine(fakeStorage());

  for (const w of [60, 61, 62, 63, 64, 70, 80, 100, 160]) {
    const game = new engine.Game();
    const screen = stage(engine, game, w, 24);
    game.startGame();
    game.state.muted = true;
    game.state.score = 99999999;
    game.state.distance = 99999999;
    engine.renderGame(screen, game.state);

    const hintRow = rowText(screen, screen.height - 2);
    const statusRow = rowText(screen, screen.height - 1);

    assert.equal(hintRow[0], '╠', `width ${w}: left border of the hint row`);
    assert.equal(hintRow[w - 1], '╣', `width ${w}: right border of the hint row`);
    assert.equal(statusRow[0], '╚', `width ${w}: left border of the status row`);
    assert.equal(statusRow[w - 1], '╝', `width ${w}: right border of the status row`);
    assert.match(statusRow, /SPD:/, `width ${w}: speed readout present`);
    assert.match(statusRow, /MUTED/, `width ${w}: mute indicator present`);
  }
});

test('the pause overlay stays inside the screen at the minimum size', () => {
  const engine = loadBrowserEngine(fakeStorage());
  const game = new engine.Game();
  const screen = stage(engine, game, 60, 20);

  game.startGame();
  game.state.paused = true;
  engine.renderGame(screen, game.state);

  const rows = screenText(screen).split('\n');
  const labelRow = rows.findIndex((r) => r.includes('[ PAUSED ]'));
  assert.ok(labelRow > 0, 'the label should be drawn');
  assert.ok(labelRow < screen.height - 1, 'the label should be clear of the last row');
  assert.ok(rows.some((r) => r.includes('P to resume')));
});
