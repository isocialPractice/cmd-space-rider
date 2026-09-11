// src/input.ts — Keyboard state for the terminal build.
//
// Terminal raw mode has no key-up event, so a key counts as held for as long as
// characters keep arriving for it and is released once it goes quiet - quiet
// meaning quiet while the loop was listening, which is not the same thing as no
// characters having reached it. Keeping that here rather than in index.ts is
// what lets the suite drive it: index.ts claims the TTY and starts the loop at
// import time, so it cannot be imported.

/**
 * How long a key counts as held after its last character. Short, because the
 * movement and fire keys want re-arming: holding a direction should keep
 * steering, and the OS repeat stream is what carries that.
 */
export const KEY_DECAY_MS = 150;

/**
 * How long a key that acts on the press counts as held after its last
 * character.
 *
 * These keys act on the press rather than the hold, so a repeat character must
 * not read as a fresh press. The window has to outlast the OS delay before the
 * first repeat arrives - Windows is 250-750ms and X11 660ms - or holding the
 * key fires it twice: P pauses and immediately resumes, and ESCAPE backs out of
 * the run and then quits from the title screen.
 *
 * It also has to outlast the gaps in the repeat stream that follows that delay,
 * which is the slower half of the same problem: the Windows repeat-rate slider
 * bottoms out around 2 characters a second, a 500ms gap, and any window shorter
 * than that lets every repeat character through as a fresh press.
 *
 * The cost is that a deliberate second press inside the window is ignored, so
 * pause-then-resume needs a beat between the taps. That is the better failure:
 * the alternative fires an action nobody asked for. A machine configured with a
 * repeat delay longer than this window would fire twice again, which is why the
 * window is a named constant rather than a literal.
 */
export const TOGGLE_DECAY_MS = 800;

/**
 * Keys that act on the press and hold the flat window above for the whole of a
 * hold.
 *
 * ESCAPE belongs here even though it toggles nothing. index.ts reads a press of
 * it as "leave the run" from a run and as "quit" from the title screen, so a
 * repeat character taken for a second press ends the process a beat after the
 * first press has landed the player on the title screen.
 *
 * All three pay the flat window's cost - a beat between deliberate taps - and
 * none of them minds it. Nothing is competing for the key: pausing twice inside
 * a second is not something a player asks for, and there is no second clock the
 * window can fall out of step with.
 */
export const TOGGLE_KEYS = ['P', 'M', 'ESCAPE'];

/**
 * Keys that act on the press and cannot afford that flat window.
 *
 * Q and E start a barrel roll, which grants invincibility for as long as it
 * runs, so a hold that re-armed on every repeat character would roll over and
 * over and hold the ship untouchable - exactly what ROLL_COOLDOWN exists to
 * bound. They need the suppression.
 *
 * What they cannot carry is the flat window's cost, because a second clock is
 * competing for the key. ROLL_COOLDOWN runs from the start of the roll while
 * the flat window restarts on every repeat character, so the two only line up
 * for a single tap: held past the cooldown, the window outlives it and swallows
 * the next press for up to TOGGLE_DECAY_MS after the key is let go. The roll is
 * the game's escape move, and a player who holds it through a dense stretch and
 * then wants a roll on the way out is asking for it at the one moment it reads
 * as dead.
 *
 * So these keys take the measured window in holdWindow below instead, which is
 * read off the repeat stream rather than fixed in advance.
 */
export const ROLL_KEYS = ['Q', 'E'];

/** Every key that acts on the press rather than on the hold. */
export const PRESS_KEYS = [...TOGGLE_KEYS, ...ROLL_KEYS];

/**
 * How much wider than the measured repeat interval a gap has to be before it
 * reads as the key having been let go.
 *
 * A repeat stream is regular, but the loop reading it is not: characters are
 * pressed at frame boundaries, so a 33ms frame lands on a 100ms interval as
 * 100ms or 133ms depending where it falls. Doubling absorbs that, and since the
 * measurement only ever widens, one stretched gap cannot let the character
 * after it through as a press.
 */
export const REPEAT_SLACK = 2;

/**
 * The narrowest the roll keys' window may be drawn, however fast the stream is.
 * The stream is read at frame boundaries, so a rate past one character a frame
 * measures whatever the loop happened to bunch rather than the rate itself.
 *
 * It is not what defends against a chunk of stdin carrying two characters,
 * which presses both at the same instant. That measures as a zero gap, and a
 * floor cannot rescue a measurement seeded at zero: it would pin the window
 * here, and 150ms is narrower than the interval at every repeat rate below
 * about 13 characters a second, so the next ordinary gap would read as the key
 * having been let go. A gap with no time in it is not counted as a gap at all,
 * in press() below.
 */
export const ROLL_RELEASE_MIN_MS = 150;

/**
 * The longest a frame may take before the loop counts as having stopped reading
 * rather than as merely running.
 *
 * The loop hands each finished frame to stdout in one write, and that write is
 * synchronous on Windows for a console and for a pipe alike, so a terminal that
 * cannot keep up applies backpressure and the write blocks with the whole loop
 * behind it. Nothing is read for as long as it lasts, and the repeat stream
 * queues up and lands together when it clears. Measured against the real render
 * loop with a consumer draining every 250ms, a 200x60 frame blocked for 264ms,
 * and an 80x24 one for 234ms against a consumer draining every 500ms; a
 * consumer keeping up left the gap between ticks at 50ms at most, against the
 * 33.3ms the loop targets. Two frames sits above that measured ceiling and well
 * under the smallest block measured, so ordinary scheduling jitter is never
 * taken for a blocked loop and no real block is missed.
 */
export const TICK_BUDGET_MS = 66;

/** Characters that map straight through to a key name, uppercased. */
const LETTER_KEYS = 'WASDQEFPM';

function decayFor(key: string): number {
  return TOGGLE_KEYS.includes(key) ? TOGGLE_DECAY_MS : KEY_DECAY_MS;
}

/**
 * Decode one chunk of raw stdin into the key names it presses, in order.
 * Returns an empty array for a chunk that carries nothing bound.
 */
export function decodeKeys(data: string): string[] {
  const pressed: string[] = [];

  if (data === '\x1b') pressed.push('ESCAPE');
  if (data.includes('\x1b[A') || data.includes('\x1bOA')) pressed.push('UP');
  if (data.includes('\x1b[B') || data.includes('\x1bOB')) pressed.push('DOWN');
  if (data.includes('\x1b[C') || data.includes('\x1bOC')) pressed.push('RIGHT');
  if (data.includes('\x1b[D') || data.includes('\x1bOD')) pressed.push('LEFT');
  if (data === '\r' || data === '\n') pressed.push('ENTER');
  if (data === ' ') pressed.push('SPACE');
  if (data === '\t') pressed.push('TAB');

  // Only read individual characters when the chunk is not an escape sequence,
  // or the letters inside one would register as presses of their own.
  if (!data.includes('\x1b')) {
    for (const ch of data) {
      const upper = ch.toUpperCase();
      if (LETTER_KEYS.includes(upper)) pressed.push(upper);
      if (ch >= '1' && ch <= '9') pressed.push(`DIGIT_${ch}`);
    }
  }

  return pressed;
}

/** No repeat gap measured for the hold under way yet. */
const UNMEASURED = -1;

/**
 * Held and just-pressed key tables, decaying on a clock the caller supplies.
 *
 * Every method takes the current time rather than reading it, so the suite can
 * step it. Expiry is checked on each press and once per frame instead of on a
 * timer, which keeps the whole thing synchronous and free of pending handles.
 */
export class InputState {
  readonly keys: Record<string, boolean> = {};
  readonly justPressed: Record<string, boolean> = {};
  private readonly lastSeen: Record<string, number> = {};
  /** Characters the hold under way has taken past its first, per key. */
  private readonly repeats: Record<string, number> = {};
  /** The widest gap that hold's repeat stream has shown, per key. */
  private readonly widestGap: Record<string, number> = {};
  /** Gaps still to skip because the loop was not reading for all of one. */
  private readonly blindGaps: Record<string, number> = {};
  /** When the loop last reached a frame, or UNMEASURED before it has run one. */
  private lastTick: number = UNMEASURED;

  /**
   * How long the key still counts as held after its last character.
   *
   * The flat windows above are the whole story for every key but the roll pair,
   * which are measured instead: a hold's own repeat stream says how soon the
   * next character is due, and a gap past REPEAT_SLACK times that has to mean
   * the key was let go. The first gap of a hold is skipped, because it is the
   * OS delay before repeat starts rather than the rate it starts at, and says
   * nothing about how fast characters arrive from then on. Until a second gap
   * has been seen the window stays at TOGGLE_DECAY_MS, which is the one that
   * has to cover that delay.
   *
   * What the window still costs after a release is REPEAT_SLACK intervals, or
   * ROLL_RELEASE_MIN_MS once the stream is fast enough for the floor to be the
   * wider of the two: 400ms at 5 characters a second, 200ms at 10, and a flat
   * 150ms from about 13 upwards. The slowest end keeps the old cost in full -
   * two intervals of the 2-characters-a-second floor of the Windows slider
   * overrun TOGGLE_DECAY_MS, so the cap holds and the deadzone is 800ms, which
   * is the rate at which the measurement buys nothing.
   *
   * One of those intervals is not recoverable by
   * any reading of the stream, because a re-press arriving exactly when the
   * next repeat character was due is the same bytes at the same spacing as the
   * hold simply continuing. The slack on top of it is not free, it is the price
   * of the jitter above, and the floor is a further charge on a fast stream.
   *
   * What the measurement buys is the rest of the old window - 200ms rather than
   * 800ms after a hold at 10 characters a second - leaving ROLL_COOLDOWN, which
   * expired long before, to decide whether the roll actually lands.
   *
   * What it is not asked to cover is a loop that stopped reading. Narrowing the
   * window to the repeat rate narrows what a blocked repaint can do just as
   * much, and a block runs to a quarter of a second where the window at a fast
   * rate is 150ms. That is not jitter in the stream and widening the window
   * back out to swallow it would give back everything the measurement bought,
   * so it is taken off the clock instead, in rejoin() below.
   */
  holdWindow(key: string): number {
    if (!ROLL_KEYS.includes(key)) return decayFor(key);

    const widest = this.widestGap[key];
    if (widest === undefined || widest === UNMEASURED) return TOGGLE_DECAY_MS;
    return Math.min(
      TOGGLE_DECAY_MS,
      Math.max(ROLL_RELEASE_MIN_MS, widest * REPEAT_SLACK)
    );
  }

  /**
   * Hand back to every held key the time the loop spent blocked rather than
   * reading, so a character that lands on the far side of a stalled repaint
   * rejoins the hold it belongs to instead of re-pressing the key.
   *
   * The window above is drawn off the repeat rate, which is the right measure
   * of when the next character is due but says nothing about whether anything
   * was there to receive it. A blocked write stops the loop reading for a
   * quarter of a second at a time, which at a fast repeat rate is several times
   * the window, so the backlog's first character used to arrive to find its own
   * key released and read as a fresh press - and a roll key re-pressed that way
   * starts a roll the player did not ask for. Time nothing could have been read
   * in is not evidence that any key went quiet, so it is subtracted before
   * anything is released. What it cannot do is make the block readable after
   * the fact, so the two gaps it touches are struck from the rate measurement
   * rather than corrected: the gap ending at a character read late is the
   * residual the credit leaves, not an interval, and the gap starting from that
   * character is compressed by however late it was. Both are recorded in
   * blindGaps below and skipped, because widestGap only ever grows and could
   * not be walked back afterwards. A stream measured off clean gaps is measured
   * as it always was: against the real loop the window settles at 150ms at 30
   * characters a second, 226ms at 10 and 412ms at 5, the same as on a consumer
   * keeping up. A loop blocking on every frame it runs - a consumer draining
   * every 250ms or slower - never offers a clean gap at all, so nothing is
   * measured and the window stays at TOGGLE_DECAY_MS, which is where an
   * unmeasured stream has always left it. That is the wide end, not the narrow
   * one, and it is three frames on a loop ticking that slowly.
   *
   * Two things keep this from turning into a key that never releases. It is
   * credited here and nowhere else, so it takes an arriving character to claim
   * it: a key genuinely let go sends nothing, is credited nothing, and expires
   * on its own window however slow the loop has become. And the credit is
   * consumed as it is given, so the rest of a backlog landing in the same
   * instant is not blind on top of it.
   *
   * This lives on the press path rather than on the frame path because that is
   * where the blocked loop puts it: the write is inside the frame, after the
   * frame's own expire() has already run, so the backlog reaches the data
   * handler before the next frame does. Driven against the real loop with a
   * consumer draining every 250ms, all 18 of the gaps that crossed the window
   * arrived to find the key still held, and none of them to find it already
   * released.
   */
  private rejoin(now: number): void {
    if (this.lastTick === UNMEASURED) return;

    const blind = now - this.lastTick - TICK_BUDGET_MS;
    if (blind <= 0) return;

    for (const key of Object.keys(this.keys)) {
      if (!this.keys[key]) continue;
      this.lastSeen[key] += blind;
      // Neither the gap ending at this character nor the one starting from it
      // is a rate sample: this character was read late by whatever the loop
      // spent blocked, which compresses the gap to the one behind it and
      // stretches the gap to the one in front.
      this.blindGaps[key] = 2;
    }
    this.lastTick = now;
  }

  /** Release every key that has gone quiet longer than its decay window. */
  private release(now: number): void {
    for (const key of Object.keys(this.keys)) {
      if (!this.keys[key]) continue;
      if (now - this.lastSeen[key] >= this.holdWindow(key)) this.keys[key] = false;
    }
  }

  /** Register a character arriving for a key. */
  press(key: string, now: number = Date.now()): void {
    // Give back whatever the loop spent blocked, then release anything that has
    // gone quiet on top of that, so a key whose window has genuinely run out
    // re-arms on this character rather than reading as still held.
    this.rejoin(now);
    this.release(now);

    if (this.keys[key]) {
      // A repeat character. Widen the measurement if this gap is the widest the
      // stream has shown, skipping the first one for the reason given above.
      //
      // Two kinds of gap are not the rate and are not measured as it. A gap
      // with no time in it is one chunk of stdin carrying two characters, or a
      // backlog landing together, and says nothing at all; it is skipped
      // outright, and does not spend the skip the OS delay needs. A gap
      // blindGaps has marked ran partly while the loop was not reading, so one
      // of its ends is late by however long that lasted; it is spent rather
      // than measured. Both of them read narrow, and a narrow gap is the
      // dangerous direction: widestGap only ever grows, so one taken for the
      // rate pins the window under the interval until the key is released.
      const gap = now - this.lastSeen[key];
      if (gap > 0) {
        if (this.blindGaps[key] > 0) this.blindGaps[key] -= 1;
        else {
          this.repeats[key] += 1;
          if (this.repeats[key] > 1 && gap > this.widestGap[key]) this.widestGap[key] = gap;
        }
      }
    } else {
      // A fresh press. Whatever the last hold measured belonged to that hold.
      this.justPressed[key] = true;
      this.repeats[key] = 0;
      this.widestGap[key] = UNMEASURED;
      this.blindGaps[key] = 0;
    }

    this.keys[key] = true;
    this.lastSeen[key] = now;
  }

  /** Feed a raw stdin chunk, pressing every key it decodes to. */
  feed(data: string, now: number = Date.now()): void {
    for (const key of decodeKeys(data)) this.press(key, now);
  }

  /**
   * Release every key that has gone quiet, and mark that the loop got this far.
   * Called once a frame, which is what makes the mark worth anything: the gap
   * between two of them is how long the loop took, and a gap past
   * TICK_BUDGET_MS is time it spent blocked instead of reading.
   */
  expire(now: number = Date.now()): void {
    this.lastTick = now;
    this.release(now);
  }

  /** Clear the edge-triggered table. Called at the end of every frame. */
  clearJustPressed(): void {
    for (const key of Object.keys(this.justPressed)) delete this.justPressed[key];
  }
}
