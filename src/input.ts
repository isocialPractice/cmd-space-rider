// src/input.ts — Keyboard state for the terminal build.
//
// Terminal raw mode has no key-up event, so a key counts as held for as long as
// characters keep arriving for it and is released once it goes quiet. Keeping
// that here rather than in index.ts is what lets the suite drive it: index.ts
// claims the TTY and starts the loop at import time, so it cannot be imported.

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
 * Keys that act on the press. These get the long decay window above.
 *
 * ESCAPE belongs here even though it toggles nothing. index.ts reads a press of
 * it as "leave the run" from a run and as "quit" from the title screen, so a
 * repeat character taken for a second press ends the process a beat after the
 * first press has landed the player on the title screen.
 *
 * Q and E belong here for the same reason: a barrel roll starts on the press
 * and grants invincibility for as long as it runs, so a hold that re-arms on
 * every repeat character rolls over and over and holds the ship untouchable,
 * which is exactly what ROLL_COOLDOWN exists to bound.
 *
 * They pay the same cost as the keys above, and it is worth naming rather than
 * waving at the cooldown: ROLL_COOLDOWN runs from the start of the roll, while
 * this window restarts on every repeat character, so the two clocks only line
 * up for a single tap. Release a key that was held past the cooldown and the
 * next press of it is swallowed for the rest of the window - a two second hold
 * followed by a deliberate re-press 700ms later rolls once, where the cooldown
 * on its own would have allowed a second roll. Still the better failure: the
 * alternative is a hold that rolls four times and spends a third of the run
 * untouchable.
 */
export const TOGGLE_KEYS = ['P', 'M', 'ESCAPE', 'Q', 'E'];

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

  /** Register a character arriving for a key. */
  press(key: string, now: number = Date.now()): void {
    // Release anything that has gone quiet first, so a key whose window has
    // run out re-arms on this character rather than reading as still held.
    this.expire(now);

    if (!this.keys[key]) this.justPressed[key] = true;
    this.keys[key] = true;
    this.lastSeen[key] = now;
  }

  /** Feed a raw stdin chunk, pressing every key it decodes to. */
  feed(data: string, now: number = Date.now()): void {
    for (const key of decodeKeys(data)) this.press(key, now);
  }

  /** Release every key that has gone quiet longer than its decay window. */
  expire(now: number = Date.now()): void {
    for (const key of Object.keys(this.keys)) {
      if (!this.keys[key]) continue;
      if (now - this.lastSeen[key] >= decayFor(key)) this.keys[key] = false;
    }
  }

  /** Clear the edge-triggered table. Called at the end of every frame. */
  clearJustPressed(): void {
    for (const key of Object.keys(this.justPressed)) delete this.justPressed[key];
  }
}
