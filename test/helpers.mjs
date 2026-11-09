// test/helpers.mjs — Shared rigging for the engine tests.
//
// The browser build is a single self-contained index.html, so there is nothing
// to import. Instead the inline script is read off disk and evaluated, and
// there are two ways to do it:
//
// - loadBrowserEngine stops at the canvas setup, which is where the script
//   starts touching the DOM. Everything above that line is pure logic and
//   rendering, and it runs in Node with nothing but a localStorage.
// - loadBrowserPage evaluates the whole thing against a stub DOM, so the page
//   wiring below that line runs too: the frame loop, the devices, the touch
//   controls and handleResize. See its own docstring for the two readings that
//   route cannot take.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { pageStyle, specificity, compareSpecificity } from './page-style.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..');

/**
 * Marker where index.html stops being testable logic and starts touching the DOM.
 *
 * Exported because the text below it is checkable as well as runnable:
 * test/browser-shell.test.mjs slices there to pin the calls the page wiring
 * makes into the logic above, which is a reading of what is *written* and the
 * only one available for a call whose argument no run of the page can
 * distinguish from its absence. loadBrowserPage runs the same region, which is
 * the reading of what it *does*, and the two are not substitutes.
 */
export const DOM_MARKER = '// ===== Canvas Setup & Sizing =====';

/** Names the harness pulls out of the evaluated browser script. */
const EXPORTS = [
  'Game', 'ScreenBuffer', 'C',
  'renderGame', 'renderTitleScreen', 'renderDebugMenu', 'renderGameOver', 'drawPauseOverlay',
  'renderNameEntry', 'nameEntryHint',
  'LEADERBOARD_HEAD', 'leaderText', 'leaderboardLayout', 'detailBadge',
  'tunnelSpan', 'tracerLit', 'tracerDrawn', 'SHIP_MARGIN',
  'DEBUG_MODES', 'DEBUG_MODE_NAMES',
  'RNG', 'seedRng', 'seededRandom',
  'shakeOffset', 'rollWings', 'loadBestScore', 'saveBestScore', 'loadCrt', 'saveCrt',
  'RetroAudio', 'SOUND_CUES', 'ENGINE_BASE_HZ', 'ENGINE_GAIN',
  'HUD_ROWS', 'FOOTER_ROWS', 'SHAKE_TIME', 'NEW_BEST_FLASH_TIME',
  'BASE_SPEED_START', 'SHAKE_PIXELS', 'BEST_SCORE_KEY', 'CRT_KEY',
  'ROLL_TIME', 'ROLL_COOLDOWN', 'COMBO_TIME', 'COMBO_MAX',
  'SHOT_SLACK_COLS', 'SLACK_REF_WIDTH', 'shotSlackCols',
  'fitGrid', 'renderTooSmall', 'footerBandPx', 'playBandPx', 'overlayVars', 'seatGrid',
  'touchOverlayUp', 'lettersFit', 'LABEL_FLOOR_PX', 'UNLETTERED',
  'glyphInset', 'tuneText',
  'MIN_WIDTH', 'MIN_HEIGHT', 'FONT_SIZE', 'MIN_FONT_SIZE', 'CELL_LEADING',
  'WARP_INTERVAL', 'WARP_FLASH_TIME', 'warpWallColor',
  'ASTEROID_INTERVAL', 'ASTEROID_TIME', 'ASTEROID_COUNT',
  'BOSS_INTERVAL', 'BOSS_WARNING_TIME', 'BOSS_HP', 'BOSS_SIZE_MULT',
  'BOSS_SPAWN_Z', 'BOSS_CLOSE_SPEED', 'BOSS_FIRE_INTERVAL', 'BOSS_SHOT_SPEED',
  'BOSS_SHOT_DAMAGE', 'BOSS_RAM_DAMAGE', 'BOSS_DROPS', 'BOSS_DROP_SPREAD',
  'BOSS_SCORE', 'blockSize', 'bossDropSpread', 'BOSS_DROP_HOLD',
  'POWERUP_DROP_CHANCE', 'POWERUP_DRIFT', 'POWERUP_SHIELD_GAIN',
  'POWERUP_KINDS', 'POWERUP_GLYPHS', 'powerupBadges',
  'FIRE_INTERVAL', 'RAPID_FIRE_MULT', 'RAPID_FIRE_INTERVAL', 'RAPID_FIRE_TIME',
  'BULLET_SPEED', 'BULLET_LIFE_SLACK',
  'SLOW_MOTION_TIME', 'SLOW_MOTION_SCALE',
  'DETAIL_TIERS', 'detailTier', 'detailFor', 'burstSize',
  'TARGET_FRAME_TIME', 'DETAIL_WINDOW_FRAMES', 'DETAIL_DROP_FACTOR', 'DETAIL_RAISE_FACTOR',
  'DETAIL_STALL_RETURN_FACTOR',
  'LEADERBOARD_SIZE', 'NAME_LENGTH', 'NAME_ALPHABET', 'DEFAULT_NAME',
  'normalizeName', 'scoreQualifies', 'recordScore', 'sanitizeLeaderboard',
  'LEADERBOARD_KEY', 'loadLeaderboard', 'saveLeaderboard',
  'GHOST_SAMPLE_TIME', 'GHOST_MAX_SAMPLES', 'readGhost',
  'ANSI256', 'LIGHT_INK', 'THEME_BG', 'themePalette',
  'VERSUS_SEAM_COLS', 'VERSUS_MIN_HALF_WIDTH', 'versusLayout',
  'VERSUS_BINDINGS', 'VERSUS_SHARED_KEYS', 'pilotKeys', 'withRng', 'versusSeed',
  'VERSUS_TAGS', 'VERSUS_OUT', 'versusTag', 'versusStanding', 'versusAudioState',
  'versusResultLines', 'VERSUS_HINTS', 'versusHintRow', 'drawVersus', 'drawVersusResult',
  'versusReadingsClear', 'versusReadingRow', 'versusRematch',
  'versusHintText', 'drawVersusHint', 'VersusRound',
  'stickKeys', 'touchFireKey', 'STICK_RADIUS', 'STICK_DEADZONE', 'STICK_AXIS_SHARE',
  'padKeys', 'padsKeys', 'padPressed', 'padFireKey', 'PAD_CONTROL_KEYS', 'PAD_TRIGGER_PULL',
  'PAD_A', 'PAD_B', 'PAD_LEFT_TRIGGER', 'PAD_RIGHT_TRIGGER',
  'PAD_STICK_X', 'PAD_STICK_Y',
  'inputMode', 'PAD_PILOT', 'PAD_ENGINE_KEYS', 'padPilotKeys',
  'PAD_PILOT_KEYS', 'PAD_HELD_KEYS',
];

/** In-memory stand-in for window.localStorage. */
export function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    read: (k) => (store.has(k) ? store.get(k) : null),
    size: () => store.size,
  };
}

/** A localStorage that throws on every access, as private-mode browsers do. */
export function hostileStorage() {
  const boom = () => { throw new Error('storage is not available'); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

/**
 * Evaluate the browser engine against a given localStorage and hand back its
 * classes and functions. Each call is an independent copy of the engine, so a
 * test can never leak state into the next one.
 */
export function loadBrowserEngine(localStorage = fakeStorage()) {
  const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');

  const scriptStart = html.indexOf('<script>');
  if (scriptStart < 0) throw new Error('index.html has no <script> block');
  const bodyStart = scriptStart + '<script>'.length;

  const domStart = html.indexOf(DOM_MARKER, bodyStart);
  if (domStart < 0) throw new Error(`index.html is missing the marker: ${DOM_MARKER}`);

  const body = html.slice(bodyStart, domStart);
  const factory = new Function(
    'localStorage',
    `${body}\nreturn {${EXPORTS.join(',')}};`
  );
  return factory(localStorage);
}

/**
 * Courier New's advance, in units of the em: the one measured input the stub
 * canvas needs, and the only reading in this file a reader has to take on
 * trust.
 *
 * `measureCell` asks a context for the advance of `M` and `fitGrid` turns that
 * into the whole grid, so a page driven in Node has to answer it with
 * something. This is the one answer that is safe to restate, for the reason
 * test/probes/glyph-tuning.mjs gives for restating it there: it is a property
 * of the font file rather than of any browser, where a pixel column read off a
 * rasterizer is a reading from one engine on one machine. Answering from it
 * makes the grid deterministic in Node.
 */
export const EM_ADVANCE = 1229 / 2048;

/**
 * The names the page reassigns after it has been built, which therefore cannot
 * be handed back as values captured once.
 *
 * `versus` and `screen` are the two that matter most - a round is opened by
 * replacing the binding and a resize replaces the buffer - but every one of
 * these moves while the page runs, so loadBrowserPage returns getters for all
 * of them and a test always reads the current one.
 */
const PAGE_LIVE = [
  'game', 'versus', 'screen', 'keys', 'justPressed',
  'termWidth', 'termHeight', 'gridFits', 'padFire', 'audio',
  'crtOn', 'scheme', 'touchShown', 'cellW', 'cellH', 'FONT',
];

/**
 * A recording stand-in for an AudioContext, carrying only what RetroAudio asks
 * of one.
 *
 * It reports `state: 'running'` on a clock the caller advances, because that is
 * what `RetroAudio.live()` requires before it will schedule anything: a
 * suspended context is dropped on the floor, and a harness built on one would
 * read every silence assertion as a pass without ever having had an instrument.
 *
 * Silence needs two counters rather than one. The hum is opened once and held
 * open - only its frequency moves, once per frame - so a count of oscillators
 * alone reads a running hum as silence on every frame after the first. `starts`
 * is what was opened; `freqWrites` is what kept it going, and `heard()` is the
 * two together.
 */
export function recordingAudio({ state = 'running' } = {}) {
  const ctx = {
    currentTime: 0,
    // `'suspended'` is the other state worth building one in: it is what a
    // browser hands back before the page has been touched, and nothing is
    // scheduled against it until a gesture resumes it.
    state,
    resumed: 0,
    starts: 0,
    stops: 0,
    freqWrites: 0,
    gainWrites: 0,
    resume() { ctx.resumed += 1; ctx.state = 'running'; },
    destination: 'speakers',
    /** Forget everything heard so far. Call this *before* the change being measured. */
    clear() {
      ctx.starts = 0; ctx.stops = 0; ctx.freqWrites = 0; ctx.gainWrites = 0;
    },
    /** Anything at all: a tone opened, or a held tone's pitch moved. */
    heard() { return ctx.starts + ctx.freqWrites; },
    createOscillator() {
      return {
        type: null,
        frequency: {
          setValueAtTime: () => { ctx.freqWrites += 1; },
          exponentialRampToValueAtTime: () => { ctx.freqWrites += 1; },
        },
        connect() {}, disconnect() {},
        start() { ctx.starts += 1; },
        stop() { ctx.stops += 1; },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime: () => { ctx.gainWrites += 1; },
          exponentialRampToValueAtTime: () => { ctx.gainWrites += 1; },
        },
        connect() {}, disconnect() {},
      };
    },
  };
  return ctx;
}

/** The pixel size out of a `16px 'Courier New', 'Consolas', monospace` font string. */
function fontSizeOf(font) {
  const m = /^(\d+(?:\.\d+)?)px/.exec(String(font ?? ''));
  return m ? Number.parseFloat(m[1]) : 16;
}

/**
 * The 2D context the canvas hands back: every drawing call a no-op, and one
 * reading that decides something.
 *
 * `measureText` is that reading. `measureCell` asks it for the advance of `M`
 * at each font size and `fitGrid` turns the answer into the grid, so it is
 * answered off EM_ADVANCE and the font string the caller last set - which is
 * the same arithmetic the browser does, minus the rasterizer. `tuneText` needs
 * nothing from the stub: it guards on `if(!ctx)return` and on
 * `'textRendering' in ctx`.
 *
 * `translate` is the one drawing call that is recorded rather than dropped. The
 * offset it is given is the damage shake, which is an argument and not a pixel:
 * what the grid looks like jolted needs a rasterizer, and whether the frame
 * asked for a jolt at all does not.
 */
function stubContext() {
  const ctx = {
    textBaseline: null,
    font: null,
    fillStyle: null,
    translates: [],
    fillRect() {}, fillText() {}, save() {}, restore() {},
    translate(x, y) { ctx.translates.push({ x, y }); },
    measureText: (text) => ({ width: String(text).length * fontSizeOf(ctx.font) * EM_ADVANCE }),
  };
  return ctx;
}


/**
 * The page's own stylesheet, parsed once for the stub below.
 *
 * Read rather than restated, for the reason test/page-style.mjs exists: the
 * length the page asks the stub for is solved out of `--ctl`, and a stub that
 * answered off its own copy of that figure would agree with itself rather than
 * with the rule the page is about to paint by.
 */
const PAGE_SHEET = pageStyle(readFileSync(join(REPO_ROOT, 'index.html'), 'utf8'));

/**
 * `window.getComputedStyle(el).fontSize`, resolved the way a browser resolves
 * it: the rules naming this element, folded by specificity with document order
 * breaking a tie, against the viewport and whatever custom properties
 * handleResize has published on the root element.
 *
 * It exists because the touch overlay reads one resolved length off the page -
 * the size the stylesheet solved the label to, which is the one figure in that
 * decision no copy in index.html could hold - and a stub that could not answer
 * it would leave `syncTouchOverlay` unrunnable in Node, which is the half of
 * the marker loadBrowserPage is for.
 *
 * Two rules reach `#fire` and `#boost`, and the second is the whole reason this
 * models a cascade rather than returning one declaration: `#touch.unlettered
 * #fire` sets `font-size:0`, so a page that asked for the size without taking
 * the class off first would be told the 0 the class imposed. Modelling the
 * class is what makes that latch fail a case rather than a window.
 *
 * What it models is a selector of the form `#id`, or `#touch.<class> #id` - the
 * two shapes the overlay's rules are written in, and nothing wider. A selector
 * it does not recognise is left out rather than guessed at, exactly as
 * `declarationsFor` leaves out a rule inside an at-rule, so a rule added in
 * some other shape reports as the rule going unread rather than as a plausible
 * length.
 */
function resolvedStyle(el, dom) {
  const classes = new Set(dom.elements.touch.classList.names());
  const matching = PAGE_SHEET.rules.flatMap((rule, order) => rule.selectors
    .filter((sel) => sel === `#${el.id}`
      || /^#touch\.[\w-]+ #[\w-]+$/.test(sel) && sel.endsWith(` #${el.id}`)
        && classes.has(sel.slice('#touch.'.length, sel.indexOf(' '))))
    .map((sel) => ({ sel, order, rule })));
  matching.sort((a, b) => compareSpecificity(specificity(a.sel), specificity(b.sel))
    || a.order - b.order);

  const vp = {
    w: dom.window.innerWidth,
    h: dom.window.innerHeight,
    vars: dom.rootStyle.properties,
  };
  const declared = {};
  for (const { rule } of matching) Object.assign(declared, rule.declarations);
  return {
    get fontSize() {
      if (declared['font-size'] === undefined) return '';
      return `${PAGE_SHEET.lengthPx(declared['font-size'], vp, `#${el.id}'s font-size`)}px`;
    },
  };
}

/** One element, carrying the members the page wiring reaches for. */
function stubElement(id, box) {
  const classes = new Set();
  const el = {
    id,
    // Only the overlay starts hidden, exactly as the markup declares it.
    hidden: id === 'touch',
    style: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c),
      names: () => [...classes].sort(),
    },
    /** What listeners the page put on this element, by type. */
    listeners: {},
    addEventListener(type, fn) { (el.listeners[type] ??= []).push(fn); },
    /** Pointer capture is the browser's; a stub can only record the id it was given. */
    captured: [],
    setPointerCapture(pointerId) { el.captured.push(pointerId); },
    getBoundingClientRect: () => ({ ...box }),
    width: 0,
    height: 0,
    context: null,
    getContext() {
      el.context ??= stubContext();
      return el.context;
    },
  };
  return el;
}

/**
 * The browser surface the page wiring touches, as a stub: a window, a document
 * holding the six elements the page fetches by id, a navigator, a clock, and an
 * animation frame queue the caller pumps by hand.
 *
 * Six rather than the seven index.html declares, and the difference is the
 * interesting part. `#crt` is the one id the markup declares that the page never
 * fetches: the CRT overlay is driven by a class on the body - `applyCrt` toggles
 * `crt` there and `body.crt #crt{opacity:1}` does the rest - so the page holds no
 * handle on it and this stub rightly has none either. Counting the markup instead
 * is what makes a reader extending the harness either add a seventh stub nothing
 * will ever ask for, or read the six as incomplete.
 *
 * Driving the page off a manual pump is what makes the harness fast as well as
 * deterministic. The 11-05-26 browser verification took between thirty seconds
 * and three minutes a round, because both pilots had to fly until they wrecked
 * in real time; a pump that calls `frame(t)` on a clock the test advances runs
 * the same rounds in milliseconds.
 */
export function stubDom({
  width = 1200,
  height = 800,
  search = '',
  scheme = 'dark',
  localStorage = fakeStorage(),
  audio = recordingAudio(),
  gamepads = [],
} = {}) {
  const windowListeners = {};
  const schemeQuery = {
    matches: scheme === 'light',
    listeners: [],
    addEventListener(type, fn) { if (type === 'change') schemeQuery.listeners.push(fn); },
  };

  // The stick's box is what driveStick measures the thumb against, so it is a
  // fixed 120px square rather than a zero-sized rect: a radius of 0 makes every
  // offset a full deflection and every stick assertion meaningless.
  const boxes = {
    stick: { left: 40, top: height - 200, width: 120, height: 120 },
    nub: { left: 80, top: height - 160, width: 40, height: 40 },
    fire: { left: width - 140, top: height - 180, width: 100, height: 100 },
    boost: { left: width - 140, top: height - 300, width: 100, height: 100 },
    touch: { left: 0, top: 0, width, height },
    c: { left: 0, top: 0, width, height },
  };
  const elements = {};
  for (const id of ['c', 'touch', 'stick', 'nub', 'fire', 'boost']) {
    elements[id] = stubElement(id, boxes[id]);
  }

  const rootStyle = {
    properties: {},
    setProperty(name, value) { rootStyle.properties[name] = value; },
  };

  const dom = {
    elements,
    audio,
    localStorage,
    rootStyle,
    windowListeners,
    schemeQuery,
    /** The clock performance.now answers, in milliseconds. */
    now: 0,
    /** Callbacks requestAnimationFrame has taken and not yet run. */
    pending: [],
    gamepads,
    document: {
      getElementById: (id) => elements[id] ?? null,
      body: stubElement('body', boxes.c),
      documentElement: { style: rootStyle },
    },
    window: {
      innerWidth: width,
      innerHeight: height,
      location: { search },
      matchMedia: () => schemeQuery,
      // The page builds its context through `new (window.AudioContext||...)`,
      // so this has to be callable with `new` and hand back the recorder.
      AudioContext: function AudioContext() { return audio; },
      webkitAudioContext: undefined,
      addEventListener(type, fn) { (windowListeners[type] ??= []).push(fn); },
      // Resolved out of the page's own stylesheet rather than answered from a
      // table here, so the one length the overlay reads back off the page is
      // the length the rule solves. See resolvedStyle for what it models.
      getComputedStyle: (el) => resolvedStyle(el, dom),
    },
    navigator: {
      getGamepads: () => dom.gamepads,
    },
    performance: { now: () => dom.now },
    requestAnimationFrame(fn) { dom.pending.push(fn); return dom.pending.length; },
  };
  return dom;
}

/**
 * Evaluate the whole inline script - the page wiring below the DOM marker
 * included - against a stub DOM, and hand back the page's live globals and the
 * handles a test drives it by.
 *
 * This is the other half of loadBrowserEngine. That one slices at the marker so
 * the engine can be exercised in Node, which leaves the frame loop, the two
 * round openings, the rematch call, the gamepad poll, the touch wiring and
 * handleResize read as source text by test/browser-shell.test.mjs and executed
 * by nothing. `0.13.0`, `0.13.1` and `0.13.2` were all defects on that side of
 * the marker, and `0.13.2` was a defect in the four cases written to pin it, so
 * the whole point of this harness is that those lines run.
 *
 * Two readings a browser gives and this cannot, named here rather than faked:
 *
 * - **The painted pixels.** A browser pass on 11-05-26 read the mute label off
 *   the canvas with `getImageData` and confirmed `#ffff55` on `#000000` under a
 *   dark system scheme and `#403200` on `#f2f2f4` under a light one. A stub
 *   context paints nothing. The colour *indices* are assertable and the paint is
 *   not, which is the same split test/probes/glyph-tuning.mjs draws between its
 *   arithmetic half and its rasterizer half.
 * - **Real pointer plumbing.** `setPointerCapture` and the pointer-id
 *   bookkeeping in `holdButton` are the browser's. A stub proves only that the
 *   handler was called with an id, which is enough for which key a press
 *   resolves to - the thing `0.14.0` was about - and is not evidence that
 *   capture works.
 */
export function loadBrowserPage(dom = stubDom()) {
  const html = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');

  const scriptStart = html.indexOf('<script>');
  if (scriptStart < 0) throw new Error('index.html has no <script> block');
  const bodyStart = scriptStart + '<script>'.length;
  const scriptEnd = html.indexOf('</script>', bodyStart);
  if (scriptEnd < 0) throw new Error('index.html has no closing </script>');

  // The whole script, marker and all, which is the one difference from
  // loadBrowserEngine that this function exists for.
  const body = html.slice(bodyStart, scriptEnd);
  const live = PAGE_LIVE.map((n) => `get ${n}(){return ${n}}`).join(',');
  const factory = new Function(
    'localStorage', 'document', 'window', 'navigator', 'performance', 'requestAnimationFrame',
    `${body}\nreturn {${EXPORTS.join(',')},__live:{${live}}};`
  );

  const built = factory(
    dom.localStorage, dom.document, dom.window, dom.navigator, dom.performance,
    (fn) => dom.requestAnimationFrame(fn),
  );

  const page = { dom };
  for (const name of EXPORTS) page[name] = built[name];
  // The live names come back through getters, so `page.versus` is the round the
  // page is holding now rather than the null it held when it was built.
  for (const name of PAGE_LIVE) {
    Object.defineProperty(page, name, { get: () => built.__live[name], enumerable: true });
  }

  const fire = (type, event) => {
    for (const fn of dom.windowListeners[type] ?? []) fn(event);
  };
  const fireOn = (el, type, event) => {
    for (const fn of el.listeners[type] ?? []) fn(event);
  };

  Object.assign(page, {
    /** The recorder the page's RetroAudio is building its contexts from. */
    heard: dom.audio,

    /** Press a key by the `KeyboardEvent.code` the page's mapKey reads. */
    fireKey(code) {
      fire('keydown', { code, preventDefault() {} });
      return page;
    },
    releaseKey(code) {
      fire('keyup', { code, preventDefault() {} });
      return page;
    },
    /**
     * Press, let one frame read it, then release.
     *
     * The frame loop clears `justPressed` at the foot of every stepped frame,
     * so a key the game reads off that map has to be pressed and pumped before
     * it is let go of - which is what a player's finger does anyway.
     */
    tapKey(code) {
      page.fireKey(code);
      page.pump(1);
      page.releaseKey(code);
      return page;
    },

    /**
     * Advance the clock and run the loop, one stepped frame per call.
     *
     * The loop steps once per FRAME_MS of elapsed time and returns early
     * otherwise, so the clock moves a whole frame at a time and each call is one
     * step of whichever game owns it.
     *
     * The nanosecond on the end of that frame is what makes the count exact.
     * `1000/30` has no binary representation, so a clock advanced by it
     * repeatedly hands the loop a gap an ulp short of the FRAME_MS it computes
     * the same way, and the loop returns without stepping: the third call from a
     * fresh page was one of those, stepping nothing while this docstring claimed
     * otherwise. A frame plus a hair clears the threshold every time, and the
     * surplus cannot step twice - the loop subtracts one FRAME_MS per call and
     * zeroes a runaway accumulator itself.
     */
    pump(frames = 1, ms = 1000 / 30 + 1e-6) {
      for (let i = 0; i < frames; i++) {
        const due = dom.pending;
        dom.pending = [];
        dom.now += ms;
        for (const fn of due) fn(dom.now);
      }
      return page;
    },

    /** Set the window size and fire the resize listener handleResize is on. */
    resize(w, h) {
      dom.window.innerWidth = w;
      dom.window.innerHeight = h;
      fire('resize', {});
      return page;
    },

    /** What navigator.getGamepads answers on the next poll. */
    pad(...pads) {
      dom.gamepads = pads;
      return page;
    },

    /** The first touch anywhere, which is what reveals the overlay. */
    touch() {
      fire('touchstart', {});
      return page;
    },

    /** Press one of the touch controls. The pointer id is the test's handle on it. */
    press(id, { pointerId = 1, clientX = 0, clientY = 0 } = {}) {
      fireOn(dom.elements[id], 'pointerdown', {
        pointerId, clientX, clientY, preventDefault() {},
      });
      return page;
    },
    move(id, { pointerId = 1, clientX = 0, clientY = 0 } = {}) {
      fireOn(dom.elements[id], 'pointermove', {
        pointerId, clientX, clientY, preventDefault() {},
      });
      return page;
    },
    release(id, { pointerId = 1 } = {}) {
      fireOn(dom.elements[id], 'pointerup', { pointerId, preventDefault() {} });
      return page;
    },

    /** Switch the system colour scheme the page follows. */
    setScheme(next) {
      dom.schemeQuery.matches = next === 'light';
      for (const fn of dom.schemeQuery.listeners) fn({ matches: next === 'light' });
      return page;
    },

    /** The custom properties handleResize published, as the CSS would read them. */
    vars() { return { ...dom.rootStyle.properties }; },

    /** Every offset the frame loop jolted the grid by, newest last. */
    jolts() { return dom.elements.c.getContext().translates; },
  });

  return page;
}

/** Read one row of a screen buffer back as a string. */
export function rowText(screen, y) {
  let out = '';
  for (let x = 0; x < screen.width; x++) out += screen.chars[y * screen.width + x];
  return out;
}

/** Read the whole screen buffer back as newline-joined rows. */
export function screenText(screen) {
  const rows = [];
  for (let y = 0; y < screen.height; y++) rows.push(rowText(screen, y));
  return rows.join('\n');
}

/**
 * Read the whole buffer back as cells of `char|fg|bg`, which is what a freeze
 * test has to compare: the paused defect moved colours as well as glyphs, and
 * screenText() alone would not have seen the tunnel wall pulse.
 */
export function screenCells(screen) {
  const cells = [];
  for (let y = 0; y < screen.height; y++) {
    for (let x = 0; x < screen.width; x++) {
      const i = y * screen.width + x;
      cells.push({ x, y, key: `${screen.chars[i]}|${screen.fg[i]}|${screen.bg[i]}` });
    }
  }
  return cells;
}

/** Coordinates whose char or colour differs between two buffer readings. */
export function changedCells(before, after) {
  const out = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i].key !== after[i].key) out.push(`${before[i].x},${before[i].y}`);
  }
  return out;
}

/**
 * Fill a run with one of everything that animates, at fixed positions, so a
 * paused frame is reproducible. Placing the entities rather than waiting for
 * spawns keeps the test off the RNG and off the spawn timers.
 */
export function stageAnimatedWorld(state) {
  state.obstacles = [
    { x: -3, y: 1, z: 30, rot: 0, rotSpeed: 1, scale: 1 },
    { x: 4, y: -2, z: 70, rot: 0.5, rotSpeed: 1, scale: 1.2 },
  ];
  state.orbs = [
    { x: 2, y: 0, z: 25, collected: false },
    { x: -1, y: 2, z: 55, collected: false },
  ];
  state.mines = [
    { x: 0, y: -1, z: 40, rot: 0, rotSpeed: 1, scale: 1, hp: 3 },
    { x: -4, y: 3, z: 90, rot: 1, rotSpeed: 1, scale: 1, hp: 3 },
  ];
  state.bullets = [];
  state.particles = [];
}

/**
 * Drop a single obstacle exactly where the ship is, so the next frame is a
 * guaranteed collision. Clears the other entity lists so nothing else fires.
 */
export function stageCollision(state) {
  state.obstacles = [{
    x: state.shipX, y: state.shipY, z: 0,
    rot: 0, rotSpeed: 0, scale: 1,
  }];
  state.orbs = [];
  state.mines = [];
  state.particles = [];
}

/**
 * A fatal obstacle hit with an orb on the same spot, so the dying frame has
 * something to pay out.
 *
 * The opposite staging to stageCollision, which clears `orbs` precisely so
 * nothing but the obstacle fires. Here the orb is wanted: the obstacle empties
 * the shield and ends the run, and the orb is what a pass below the one that
 * ended it would score if the frame carried on. Shield 25 is one obstacle hit
 * from gone, so the collision is fatal on the first frame.
 */
export function stageFatalCollisionWithOrb(state) {
  state.obstacles = [{
    x: state.shipX, y: state.shipY, z: 0,
    rot: 0, rotSpeed: 0, scale: 1,
  }];
  state.orbs = [{ x: state.shipX, y: state.shipY, z: 0, collected: false }];
  state.mines = [];
  state.particles = [];
  state.powerups = [];
  state.shield = 25;
}

/** One frame at the engine's 30 fps target. */
export const FRAME = 1 / 30;
