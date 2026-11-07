// test/browser-wiring.test.mjs — The page wiring below the DOM marker, executed.
//
// Everything below `// ===== Canvas Setup & Sizing =====` in index.html was
// read by the suite as source text and run by nothing. test/helpers.mjs says
// why: loadBrowserEngine slices the inline script at that marker so the engine
// can be exercised in Node, which leaves the frame loop, the two VersusRound
// openings, the versusRematch call, the gamepad poll, the touch wiring and
// handleResize on the far side of it. test/browser-shell.test.mjs then asserts
// over the characters of the part that was cut off.
//
// What that cost is on the record. `0.13.0`, `0.13.1` and `0.13.2` were all
// defects below the marker, and `0.13.2` was a defect in the four cases written
// to pin the wiring: one told two round openings apart by source line, so a
// single line could hold an unmuted round and still pass. A browser pass on
// 11-05-26 drove the region by hand and found it sound - 128 assertions,
// reproduced on a second full run - and left no check behind, because it ran
// once and only while an agent was running it.
//
// So these cases run the lines. loadBrowserPage evals the whole script against
// a stub DOM and hands back the page's live globals plus the handles below; the
// frame loop is driven off a manual requestAnimationFrame pump, which is what
// makes a round that took minutes in a browser take milliseconds here.
//
// Two of the 11-05-26 readings do not survive the move into Node and are not
// faked. The painted pixels are one: the label was confirmed as `#ffff55` on
// `#000000` under a dark scheme and `#403200` on `#f2f2f4` under a light one,
// read back with getImageData, and a stub context paints nothing - so the
// colour *indices* are asserted here and the paint is not, which is the split
// test/probes/glyph-tuning.mjs already draws between its arithmetic and its
// rasterizer. Real pointer plumbing is the other: setPointerCapture and the
// pointer-id bookkeeping in holdButton are the browser's, and a stub proves
// only that the handler was called with an id. That is enough for which key a
// press resolves to, which is what `0.14.0` was about, and it is not evidence
// that capture works.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadBrowserPage, stubDom, recordingAudio, rowText, screenText, stageCollision,
} from './helpers.mjs';

/** A window wide enough to open a round in: 140x44 cells. */
const WIDE = { width: 1400, height: 800 };

/** The page, built on a window a round fits in and pumped once so it has drawn. */
function page(options = {}) {
  const p = loadBrowserPage(stubDom({ ...WIDE, ...options }));
  p.pump(1);
  return p;
}

/** Press M and let one frame read it, which is how the page's own toggle is driven. */
function toggleMute(p) {
  p.tapKey('KeyM');
  p.pump(1);
  return p;
}

/** The seven cells the mute label occupies, as `char` and the colour indices under it. */
function muteCells(p) {
  const s = p.screen;
  const y = s.height - 1;
  const x = s.width - 9;
  const cells = [];
  for (let i = 0; i < ' MUTED '.length; i++) {
    const at = y * s.width + x + i;
    cells.push({ char: s.chars[at], fg: s.fg[at], bg: s.bg[at] });
  }
  return cells;
}

/** The label as a string, read at the position the solo game writes it at. */
function muteLabel(p) {
  return muteCells(p).map((c) => c.char).join('');
}

/**
 * Count fireVolley per pilot, which is what makes "which ship fired" a number.
 *
 * A bullet array moves and expires between two reads and cannot answer it: the
 * defect this guards against had one controller firing the other player's gun
 * for a whole round, and both halves have bullets in them either way.
 *
 * Re-wrap after a rematch - a rematch is a new round with new pilots, and the
 * counts of the old one stop moving.
 */
function countVolleys(round) {
  const counts = round.pilots.map(() => 0);
  round.pilots.forEach((pilot, i) => {
    const fire = pilot.fireVolley.bind(pilot);
    pilot.fireVolley = () => { counts[i] += 1; return fire(); };
  });
  return counts;
}

/** Wreck both pilots on the next frame, so a round settles without flying it out. */
function wreckBoth(p, frames = 6) {
  for (const pilot of p.versus.pilots) {
    pilot.state.shield = 1;
    stageCollision(pilot.state);
  }
  p.pump(frames);
  return p;
}

/** One standard-layout pad snapshot, as navigator.getGamepads reports one. */
function padSnapshot({ x = 0, y = 0, a = 0, b = 0, lt = 0, rt = 0, mapping = 'standard' } = {}) {
  const buttons = [a, 0, 0, 0, 0, 0, lt, rt].map((value) => ({ value, pressed: value >= 0.5 }));
  buttons[1] = { value: b, pressed: b >= 0.5 };
  return { mapping, connected: true, axes: [x, y], buttons };
}

/** The keys the page is holding down, as a sorted name. */
function heldKeys(p) {
  return Object.keys(p.keys).filter((k) => p.keys[k]).sort().join('+');
}

// ----- The harness itself -----

test('the page runs in Node, DOM wiring and all', () => {
  // The precondition every case below rests on, asserted once rather than
  // assumed sixteen times: the script evaluated past the marker, handleResize
  // ran, and the loop drew a frame. A harness that silently failed to reach the
  // wiring would pass most of what follows by never contradicting it.
  const p = page();
  assert.equal(p.gridFits, true, 'the stub window holds the grid');
  assert.equal(`${p.termWidth}x${p.termHeight}`, '140x44', 'the grid is the one the font arithmetic gives');
  assert.equal(p.screen.width, p.termWidth, 'the buffer was seated on that grid');
  assert.equal(p.game.state.mode, 'menu', 'the page opened on the title screen');
  assert.equal(p.versus, null, 'and not in a round');
  // handleResize is the one line that publishes these, and it is below the
  // marker. test/browser-shell.test.mjs can only read that the call is there.
  assert.deepEqual(Object.keys(p.vars()).sort(), ['--footerpx', '--playpx']);
});

test('the recorder can hear an unmuted run, which is what makes silence a finding', () => {
  // The positive control. Every silence assertion below needs a counterpart
  // proving the instrument still works: the first draft of this check on
  // 11-05-26 passed all of its muted cases while its control was quietly
  // broken, which is the `0.15.2` shape - a check that passes because nothing
  // looked - reproduced in the test written to avoid it.
  //
  // The context has to report `state: 'running'` on an advancing clock, because
  // RetroAudio.live() drops everything scheduled against anything else.
  //
  // Cleared before the run is launched rather than after, which is the whole of
  // why the counters are two. The frame that reads ENTER is also the frame that
  // opens the hum, so a reset placed after it wipes the one oscillator the run
  // will ever start and leaves the control asserting against frequency writes
  // alone - which is a weaker instrument than the muted cases need.
  const p = page();
  p.heard.clear();
  p.tapKey('Enter');
  p.pump(10);
  assert.equal(p.game.state.mode, 'playing');
  assert.equal(p.heard.starts, 1, 'the hum is a tone that was opened, once');
  assert.ok(p.heard.freqWrites > 0, 'and kept going by a pitch written every frame');
  assert.ok(p.heard.heard() > 0, 'so an unmuted run is audible to the recorder');
});

// ----- The mute label on the menu screens -----

test('M on the title screen writes the label at width - 9 on the last row', () => {
  const p = page();
  assert.notEqual(muteLabel(p), ' MUTED ', 'the page opens unmuted');

  toggleMute(p);
  assert.equal(p.game.state.muted, true);
  assert.equal(muteLabel(p), ' MUTED ');
  for (const cell of muteCells(p)) {
    // The indices, not the paint. A browser read these back as #ffff55 on
    // #000000; a stub context paints nothing, so what is assertable is the
    // colour the buffer names.
    assert.equal(cell.fg, p.C.BRIGHT_YELLOW, `${JSON.stringify(cell.char)} is bright yellow`);
    assert.equal(cell.bg, p.C.BLACK, `${JSON.stringify(cell.char)} is on black`);
  }

  toggleMute(p);
  assert.equal(p.game.state.muted, false);
  assert.notEqual(muteLabel(p), ' MUTED ', 'a second M clears it');
});

test('the label is on name entry and game over, and off the debug menu', () => {
  // The debug menu is the one screen deliberately without it: it is reached
  // from a ?debug link rather than from a run, and nothing on it is playing.
  const debug = page({ search: '?debug' });
  assert.equal(debug.game.state.mode, 'debugMenu');
  toggleMute(debug);
  assert.equal(debug.game.state.muted, true, 'M still takes, it is a global setting');
  assert.notEqual(muteLabel(debug), ' MUTED ', 'and the debug menu carries no copy of it');

  const p = page();
  toggleMute(p);
  p.tapKey('Enter');
  p.pump(1);
  assert.equal(p.game.state.mode, 'playing');
  assert.equal(muteLabel(p), ' MUTED ', "the run's own footer carries the same copy");

  // A qualifying score is what routes a finished run through the entry screen,
  // so the score is set and the collision staged rather than flown to.
  p.game.state.score = 500;
  stageCollision(p.game.state);
  p.game.state.shield = 1;
  p.pump(4);
  assert.equal(p.game.state.mode, 'nameEntry');
  assert.equal(muteLabel(p), ' MUTED ', 'the name entry screen carries it');

  p.tapKey('Enter');
  p.pump(1);
  assert.equal(p.game.state.mode, 'dead');
  assert.equal(muteLabel(p), ' MUTED ', 'and so does the game over screen');
  assert.equal(p.game.state.muted, true, 'the setting survived every transition');
});

test('the run footer and the menu copy agree on the frame the key is pressed', () => {
  // Two screens drawing the same figure from the same state, read on the one
  // frame the toggle lands. Read a frame later and a copy written from a stale
  // flag would have caught up.
  const p = page();
  p.tapKey('Enter');
  p.pump(1);
  toggleMute(p);
  assert.equal(muteLabel(p), ' MUTED ', 'the run footer, on the frame M was read');

  // ESC to the title screen on the next frame, which is the same flag seen by
  // the other renderer.
  p.tapKey('Escape');
  p.pump(1);
  assert.equal(p.game.state.mode, 'menu');
  assert.equal(muteLabel(p), ' MUTED ', 'and the title screen, from the same flag');
});

// ----- A round, and the mute it is opened with -----

test('V from a muted title screen opens a silent round and keeps it silent', () => {
  const p = page();
  toggleMute(p);

  // Cleared before the round opens, never after: a reset placed after the
  // opening wipes the one oscillator that round will ever start, and every
  // frame after the first moves a held hum's frequency rather than opening a
  // tone - which is why silence is counted two ways.
  p.heard.clear();
  p.tapKey('KeyV');
  p.pump(1);

  assert.ok(p.versus, 'V opened a round');
  assert.deepEqual(p.versus.states().map((s) => s.muted), [true, true], 'both pilots carry the page mute');
  p.pump(30);
  assert.equal(p.heard.starts, 0, 'no tone was opened for the life of the round');
  assert.equal(p.heard.freqWrites, 0, 'and no held tone had its pitch moved');
});

test('an unmuted round is audible, which is the control for the case above', () => {
  const p = page();
  p.heard.clear();
  p.tapKey('KeyV');
  p.pump(1);
  assert.ok(p.versus);
  assert.deepEqual(p.versus.states().map((s) => s.muted), [false, false]);
  p.pump(10);
  assert.ok(p.heard.heard() > 0, 'the instrument hears a round that is not muted');
});

test('the rematch carries the mute, and so does the rematch after that', () => {
  // The defect returned on every ENTER rather than only the first, so two
  // rematches are the case: one would have passed while the second brought the
  // sound back.
  const p = page();
  toggleMute(p);
  p.tapKey('KeyV');
  p.pump(1);

  // ENTER is pilot 2's trigger, so it is pressed all through a round that is
  // still being flown - and the frame that ends one can be carrying the shot
  // that ended it. A rematch read without the settled gate relaunches on that
  // keypress, which is the round the players never asked for.
  const flying = p.versus;
  p.tapKey('Enter');
  p.pump(2);
  assert.equal(p.versus, flying, 'ENTER on a round still being flown is a trigger, not a rematch');

  for (const round of [1, 2]) {
    const before = p.versus;
    wreckBoth(p);
    assert.equal(p.versus.settled, true, `round ${round} settled`);

    p.heard.clear();
    p.tapKey('Enter');
    p.pump(1);
    assert.notEqual(p.versus, before, `ENTER opened rematch ${round}`);
    assert.deepEqual(
      p.versus.states().map((s) => s.muted), [true, true],
      `rematch ${round} opened muted`,
    );
    p.pump(20);
    assert.equal(p.heard.starts, 0, `rematch ${round} opened no tone`);
    assert.equal(p.heard.freqWrites, 0, `rematch ${round} moved no pitch`);
  }
});

test('M inside a round moves both pilots, and the sound follows it both ways', () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  assert.deepEqual(p.versus.states().map((s) => s.muted), [false, false]);

  p.heard.clear();
  p.pump(10);
  assert.ok(p.heard.heard() > 0, 'the round is audible to begin with');

  p.heard.clear();
  toggleMute(p);
  assert.deepEqual(p.versus.states().map((s) => s.muted), [true, true], 'M moved both pilots together');
  p.pump(20);
  assert.equal(p.heard.heard(), 0, 'and the round went silent');

  p.heard.clear();
  toggleMute(p);
  assert.deepEqual(p.versus.states().map((s) => s.muted), [false, false], 'and back together');
  p.pump(10);
  assert.ok(p.heard.heard() > 0, 'and the round sounds again');
});

test('ESCAPE drops a round, cuts the hum, and leaves the title screen standing', () => {
  // Dropping the round is the whole of leaving it: the solo game was never
  // stepped while one ran, so it is still at the title screen the round was
  // opened from. The hum is cut here because RetroAudio.frame is what normally
  // stops it and there is no round left to call it - without the cut a round
  // left mid-flight would drone on at the pitch it was last set to.
  const p = page();
  p.tapKey('KeyV');
  p.pump(5);
  assert.ok(p.versus);

  p.heard.clear();
  p.tapKey('Escape');
  p.pump(1);
  assert.equal(p.versus, null, 'ESCAPE dropped the round');
  assert.equal(p.heard.stops, 1, 'and cut the hum on the way out');

  p.pump(20);
  assert.equal(p.heard.starts, 0, 'nothing opened a tone after it');
  assert.equal(p.heard.freqWrites, 0, 'and no held tone was still being driven');
  assert.equal(p.game.state.mode, 'menu', 'the title screen the round was opened from is still there');
});

test('the solo game is neither stepped nor handed a keypress through a round', () => {
  // A round owns the frame outright. ENTER is pilot 2's trigger, so a solo game
  // stepped underneath one would read it through handleMenuInput as a launch and
  // start a run behind the round.
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  assert.equal(p.game.state.mode, 'menu');

  p.fireKey('Enter');
  p.pump(20);
  p.releaseKey('Enter');
  assert.equal(p.game.state.mode, 'menu', 'the solo game was handed no keypress');
  assert.equal(p.game.state.frameSeen, 0, 'and no frame time, because it is not advancing');

  // The round's pilots are what the frames were spent on, and both measure the
  // one device.
  for (const [i, state] of p.versus.states().entries()) {
    assert.ok(state.frameSeen > 0, `pilot ${i} was fed the frame time`);
  }
});

test('a round is never jolted, and a solo run is', () => {
  // The canvas is one object and the offset carries the whole of it, so a
  // pilot's own crash would shake the tunnel their rival is threading. The
  // offset is an argument rather than a painted pixel, which is why it is a
  // reading a stub context can take.
  const solo = page();
  solo.tapKey('Enter');
  solo.pump(1);
  solo.game.state.shake = solo.SHAKE_TIME;
  solo.pump(2);
  assert.ok(
    solo.jolts().some((t) => t.x !== 0 || t.y !== 0),
    'a solo run is jolted by its own damage',
  );

  const round = page();
  round.tapKey('KeyV');
  round.pump(1);
  for (const state of round.versus.states()) state.shake = round.SHAKE_TIME;
  round.pump(2);
  assert.deepEqual(
    [...new Set(round.jolts().map((t) => `${t.x},${t.y}`))], ['0,0'],
    'and a round is not, however hard either pilot was hit',
  );
});

test('a key is the gesture a suspended audio context is waiting for', () => {
  // A browser that will not start a context before the page has been touched
  // hands back a suspended one, and a suspended clock sits at 0: everything
  // scheduled against it lands on the same instant. The keydown handler is
  // where the page asks for it, and that line is below the marker.
  const p = page({ audio: recordingAudio({ state: 'suspended' }) });
  assert.equal(p.heard.resumed, 0, 'nothing has asked yet');

  p.fireKey('KeyM');
  assert.equal(p.heard.resumed, 1, 'the first key asked for it');
  assert.equal(p.heard.state, 'running', 'and the context woke');
});

// ----- The devices: one thumb, one pad, three screens each -----

test('the FIRE button fires pilot 1 in a round and nobody else', () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  const volleys = countVolleys(p.versus);

  p.press('fire');
  p.pump(4);
  assert.equal(heldKeys(p), 'SPACE', "FIRE holds pilot 1's trigger, not pilot 2's ENTER");
  assert.ok(volleys[0] > 0, 'pilot 1 fired');
  assert.equal(volleys[1], 0, "and pilot 2's gun did not move");

  p.release('fire');
  p.pump(1);
  assert.equal(heldKeys(p), '', 'and the release lets go of what the press took');
});

test('the FIRE button takes the rematch on a settled round', () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  wreckBoth(p);
  const before = p.versus;

  p.press('fire');
  p.pump(1);
  assert.equal(p.keys.ENTER, true, 'a settled round reads FIRE as the confirm key');
  assert.notEqual(p.versus, before, 'and the panel it is waiting on takes it');
  p.release('fire');
});

test('the FIRE button launches a run from the title screen', () => {
  const p = page();
  assert.equal(p.game.state.mode, 'menu');
  p.press('fire');
  p.pump(1);
  assert.equal(p.keys.ENTER, true, 'off a run, FIRE is the confirm key');
  assert.equal(p.game.state.mode, 'playing');
  p.release('fire');
});

test("a pad's A button fires pilot 1 in a round and nobody else", () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  const volleys = countVolleys(p.versus);

  p.pad(padSnapshot({ a: 1 }));
  p.pump(4);
  assert.equal(p.padFire, 'SPACE', 'the press went down on pilot 1\'s trigger');
  assert.equal(p.keys.SPACE, true);
  assert.notEqual(p.keys.ENTER, true, "and never on pilot 2's");
  assert.ok(volleys[0] > 0, 'pilot 1 fired');
  assert.equal(volleys[1], 0, "and pilot 2's gun did not move");

  p.pad(padSnapshot());
  p.pump(1);
  assert.equal(p.keys.SPACE, false, 'releasing A releases what it pressed');
  assert.equal(p.padFire, null);
});

test("a pad's A button takes the rematch on a settled round", () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  wreckBoth(p);
  const before = p.versus;

  p.pad(padSnapshot({ a: 1 }));
  p.pump(1);
  assert.equal(p.keys.ENTER, true, 'a settled round reads A as the confirm key');
  assert.notEqual(p.versus, before, 'and the panel takes it');
});

test("a pad's A button launches a run from the title screen", () => {
  const p = page();
  p.pad(padSnapshot({ a: 1 }));
  p.pump(1);
  assert.equal(p.padFire, 'ENTER', 'off a run, A is the confirm key');
  assert.equal(p.game.state.mode, 'playing');
});

test('the overlay appears on the first touch and the stick steers once it has', () => {
  const p = page();
  assert.equal(p.dom.elements.touch.hidden, true, 'the controls are hidden until a touch arrives');
  p.touch();
  assert.equal(p.dom.elements.touch.hidden, false);

  p.tapKey('Enter');
  p.pump(1);
  // The stick's box is a 120px square, so its centre is 60px in from each
  // corner and a thumb 60px above that is a full push up.
  const box = p.dom.elements.stick.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  p.press('stick', { clientX: cx, clientY: cy - 60 });
  assert.equal(heldKeys(p), 'UP', 'a thumb pushed up holds UP and nothing else');
  p.move('stick', { clientX: cx + 60, clientY: cy });
  assert.equal(heldKeys(p), 'RIGHT', 'and follows the thumb across');
  p.release('stick');
  assert.equal(heldKeys(p), '', 'and lets go of every direction at once');
});

test('the overlay comes down on a grid the fitter refuses and back up when it fits', () => {
  const p = page();
  p.touch();
  assert.equal(p.dom.elements.touch.hidden, false, 'a touch on a window the game draws on');

  // The window the notice owns. Nothing in the overlay used to consult
  // gridFits, so three controls stayed laid out over `Please resize your
  // window.` - at 320x140 the stick ring sat on the notice row with FIRE on
  // the end of the same line.
  p.resize(300, 60);
  p.pump(1);
  assert.equal(p.gridFits, false, 'no font in the range gives this window the grid');
  assert.equal(p.dom.elements.touch.hidden, true, 'so the notice has the screen to itself');

  // The two viewports that landed on the notice glyphs carried a positive
  // --playpx, which is why the floor on the play band is not what fixes this:
  // the band was bounding the box correctly all along.
  p.resize(320, 140);
  p.pump(1);
  assert.equal(p.gridFits, false);
  assert.ok(Number.parseFloat(p.vars()['--playpx']) > 0, 'with the band floor not engaged');
  assert.equal(p.dom.elements.touch.hidden, true, 'and the overlay down all the same');

  // Back on a window the game draws on, without a second touch: `touchShown`
  // is the record of whether a touch has ever happened, not of whether the
  // controls happen to be up.
  p.resize(1400, 800);
  p.pump(1);
  assert.equal(p.gridFits, true);
  assert.equal(p.touchShown, true, 'the reveal was not spent by hiding the controls');
  assert.equal(p.dom.elements.touch.hidden, false, 'so widening brings them back on its own');
});

test('a first touch on a refused grid reveals nothing, and widening then does', () => {
  // The other order through the same gate. A player who opens the page on a
  // window too small and taps it has touched, so the first half of the reading
  // is satisfied and the second is not.
  const p = page();
  p.resize(300, 60);
  p.pump(1);
  p.touch();
  assert.equal(p.touchShown, true, 'the touch is recorded');
  assert.equal(p.dom.elements.touch.hidden, true, 'and the controls stay down');

  p.resize(1400, 800);
  p.pump(1);
  assert.equal(p.dom.elements.touch.hidden, false, 'until the window holds the grid');
});

// ----- handleResize -----

test('a resize re-seats both halves of a round on the new grid', () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);

  for (const [w, h] of [[1400, 800], [1200, 700], [1600, 900], [1000, 600]]) {
    p.resize(w, h);
    p.pump(1);
    const layout = p.versusLayout(p.termWidth, p.termHeight);
    const where = `${w}x${h} (${p.termWidth}x${p.termHeight})`;
    assert.equal(layout.fits, true, `${where}: still wide enough for two halves`);

    for (const [i, half] of p.versus.halves.entries()) {
      assert.equal(half.width, layout.half, `${where}: half ${i} is the layout's width`);
      assert.equal(half.height, layout.rows, `${where}: half ${i} is the layout's height`);
    }
    for (const [i, state] of p.versus.states().entries()) {
      assert.equal(state.screenWidth, layout.half, `${where}: pilot ${i}'s engine grid is the half`);
      assert.equal(state.screenHeight, layout.rows, `${where}: pilot ${i}'s engine rows are the layout's`);
    }

    // Each half keeps a corner of its own rather than drawing through the
    // other's, and the seam between them is one unbroken column.
    const top = rowText(p.screen, 0);
    assert.equal(top[layout.leftX], '╔', `${where}: the left half has its own top-left corner`);
    assert.equal(top[layout.rightX], '╔', `${where}: so does the right half`);

    const seam = [];
    for (let y = 0; y < p.screen.height; y++) seam.push(p.screen.chars[y * p.screen.width + layout.seamX]);
    assert.deepEqual([...new Set(seam)], ['║'], `${where}: the seam is one divider for the full height`);
  }
});

test('in the 60-to-90 column band the grid fits and a round does not', () => {
  // The grid floor is 60 columns and a round needs 45 columns a side plus the
  // seam, so between them is a band where the game draws and a round cannot be
  // opened. A round already running keeps running on a narrower half.
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  const opened = p.versus;

  for (const [w, cols, half] of [[600, 60, 29], [700, 70, 34], [909, 90, 44]]) {
    p.resize(w, 400);
    p.pump(1);
    const where = `${w}x400`;
    assert.equal(p.gridFits, true, `${where}: the grid still fits`);
    assert.equal(p.termWidth, cols, `${where}: at ${cols} columns`);
    const layout = p.versusLayout(p.termWidth, p.termHeight);
    assert.equal(layout.half, half, `${where}: a half would be ${half} columns`);
    assert.equal(layout.fits, false, `${where}: which is under the round's floor`);
    assert.equal(p.versus, opened, `${where}: and the round is still the one that was opened`);
    assert.equal(p.versus.halves[0].width, half, `${where}: running on the narrower half`);
  }

  // The panel names the window rather than offering a key that would do
  // nothing, with two players watching it.
  wreckBoth(p);
  const text = screenText(p.screen);
  assert.match(text, /WIDEN THE WINDOW TO REMATCH/, 'the settled panel names the window');
  assert.doesNotMatch(text, /ENTER REMATCH/, 'and does not offer the key');

  const settled = p.versus;
  const scores = settled.states().map((s) => s.score);
  p.tapKey('Enter');
  p.pump(1);
  assert.equal(p.versus, settled, 'ENTER is refused on a layout a rematch would not fit');
  assert.deepEqual(p.versus.states().map((s) => s.score), scores, 'and the round is handed back unchanged');
});

test('V is refused in the band it would open a round too narrow for', () => {
  const p = page();
  p.resize(700, 400);
  p.pump(1);
  assert.equal(p.gridFits, true);
  assert.equal(p.versusLayout(p.termWidth, p.termHeight).fits, false);
  p.tapKey('KeyV');
  p.pump(1);
  assert.equal(p.versus, null, 'the key is gated on the same layout the label is drawn under');
});

test('V works from the title screen and nowhere else', () => {
  // Choosing a game is what that screen is for, and the label naming the key is
  // drawn on it. A V read mid-run would drop a run the player was flying for a
  // round neither of them asked for.
  const p = page();
  p.tapKey('Enter');
  p.pump(1);
  assert.equal(p.game.state.mode, 'playing');
  p.tapKey('KeyV');
  p.pump(1);
  assert.equal(p.versus, null, 'V in a run opens nothing');
  assert.equal(p.game.state.mode, 'playing', 'and leaves the run where it was');

  p.tapKey('Escape');
  p.pump(1);
  assert.equal(p.game.state.mode, 'menu');
  p.tapKey('KeyV');
  p.pump(1);
  assert.ok(p.versus, 'and from the title screen it opens a round');
});

test('below the grid floor the notice takes the screen and the round waits behind it', () => {
  const p = page();
  p.tapKey('KeyV');
  p.pump(1);
  const opened = p.versus;
  wreckBoth(p);
  const scores = opened.states().map((s) => s.score);

  p.resize(300, 60);
  p.pump(2);
  assert.equal(p.gridFits, false, 'no font in the range gives this window the grid');
  const text = screenText(p.screen);
  assert.match(text, /Window too small!/, 'the notice has the screen');
  // Neither half draws through it: the frame returns before the round renders,
  // so nothing of a 44-row round is left on a 3-row buffer.
  assert.doesNotMatch(text, /PILOT/, 'and neither half draws through it');
  assert.doesNotMatch(text, /WIDEN THE WINDOW/, 'nor does the panel');
  assert.equal(p.versus, opened, 'the round is still standing behind it');

  // The length the controls are sized against, published by handleResize
  // itself. On a grid the fitter refuses the subtraction behind it goes
  // negative, and a negative length is not something a control can be sized
  // against - see playBandPx, and the SHAPES case in browser-shell.test.mjs
  // that walks the arithmetic on its own.
  const playPx = Number.parseFloat(p.vars()['--playpx']);
  assert.ok(playPx >= 0, `--playpx is ${p.vars()['--playpx']} on a refused grid`);

  p.resize(1400, 800);
  p.pump(2);
  assert.equal(p.gridFits, true);
  assert.equal(p.versus, opened, 'widening brings the same round back');
  assert.deepEqual(p.versus.states().map((s) => s.score), scores, 'with its scores intact');
  assert.match(screenText(p.screen), /WIDEN THE WINDOW TO REMATCH|ENTER REMATCH/, 'and its panel again');
});

// ----- The page's own settings -----

test('C toggles the CRT overlay and writes the choice through', () => {
  // A property of the page rather than of the game, which is why it is read in
  // the loop beside the element it drives.
  const p = page();
  const was = p.crtOn;
  assert.equal(p.dom.document.body.classList.contains('crt'), was);

  p.tapKey('KeyC');
  p.pump(1);
  assert.equal(p.crtOn, !was, 'C flipped it');
  assert.equal(p.dom.document.body.classList.contains('crt'), !was, 'and the body class followed');
  assert.equal(p.loadCrt(), !was, 'and the choice was written through, so a refresh comes back to it');
});

test('the page follows the system colour scheme rather than offering one', () => {
  const p = page({ scheme: 'dark' });
  assert.equal(p.scheme, 'dark');
  assert.equal(p.dom.document.body.classList.contains('light'), false);

  p.setScheme('light');
  p.pump(1);
  assert.equal(p.scheme, 'light', 'the query firing is the whole of the switch');
  assert.equal(p.dom.document.body.classList.contains('light'), true, 'and the body class follows it');

  p.setScheme('dark');
  p.pump(1);
  assert.equal(p.scheme, 'dark');
  assert.equal(p.dom.document.body.classList.contains('light'), false, 'and back');
});

test('?mode= and ?versus are read at load, each behind its own gate', () => {
  // The allow-list is DEBUG_MODES itself rather than a hand-written copy, so a
  // mode it does not hold falls through to the title screen.
  const allowed = page({ search: '?mode=chaos' });
  assert.equal(allowed.game.state.mode, 'playing');
  assert.equal(allowed.game.state.debugMode, 'chaos');

  const refused = page({ search: '?mode=tunnel' });
  assert.equal(refused.game.state.mode, 'menu', 'a mode off the list lands on the title screen');

  const round = page({ search: '?versus' });
  assert.ok(round.versus, 'the link opens a round on a window wide enough for one');

  // Gated on the same layout the V key is gated on: a link followed in a window
  // too narrow for two halves lands on the title screen instead.
  const narrow = loadBrowserPage(stubDom({ width: 700, height: 400, search: '?versus' }));
  narrow.pump(1);
  assert.equal(narrow.gridFits, true);
  assert.equal(narrow.versus, null, 'and on one too narrow it does not');
});
