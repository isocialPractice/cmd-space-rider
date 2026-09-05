// src/screen.ts — Double-buffered terminal screen buffer using raw ANSI codes

export class ScreenBuffer {
  width: number;
  height: number;
  private chars: string[];
  private fg: number[];
  private bg: number[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.chars = new Array(size).fill(' ');
    this.fg = new Array(size).fill(7);
    this.bg = new Array(size).fill(0);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.chars = new Array(size).fill(' ');
    this.fg = new Array(size).fill(7);
    this.bg = new Array(size).fill(0);
  }

  clear(bgColor: number = 0): void {
    this.chars.fill(' ');
    this.fg.fill(7);
    this.bg.fill(bgColor);
  }

  put(x: number, y: number, ch: string, fgColor: number = 7, bgColor: number = 0): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const i = y * this.width + x;
    this.chars[i] = ch;
    this.fg[i] = fgColor;
    this.bg[i] = bgColor;
  }

  putString(x: number, y: number, str: string, fgColor: number = 7, bgColor: number = 0): void {
    for (let i = 0; i < str.length; i++) {
      this.put(x + i, y, str[i], fgColor, bgColor);
    }
  }

  putStringCenter(y: number, str: string, fgColor: number = 7, bgColor: number = 0): void {
    const x = Math.floor((this.width - str.length) / 2);
    this.putString(x, y, str, fgColor, bgColor);
  }

  fillRect(x: number, y: number, w: number, h: number, ch: string, fgColor: number, bgColor: number): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.put(x + dx, y + dy, ch, fgColor, bgColor);
      }
    }
  }

  hLine(x: number, y: number, len: number, ch: string, fgColor: number, bgColor: number = 0): void {
    for (let i = 0; i < len; i++) {
      this.put(x + i, y, ch, fgColor, bgColor);
    }
  }

  vLine(x: number, y: number, len: number, ch: string, fgColor: number, bgColor: number = 0): void {
    for (let i = 0; i < len; i++) {
      this.put(x, y + i, ch, fgColor, bgColor);
    }
  }

  /**
   * Shift rows y0 (inclusive) to y1 (exclusive) horizontally by dx columns,
   * blanking the columns vacated at the edge. Used for the damage screen
   * shake, which jolts the play area while the HUD and border stay put.
   */
  shiftRows(y0: number, y1: number, dx: number): void {
    if (dx === 0) return;
    const from = Math.max(0, y0);
    const to = Math.min(this.height, y1);
    for (let y = from; y < to; y++) {
      const row = y * this.width;
      // Walk away from the destination edge so a cell is read before overwrite.
      const start = dx > 0 ? this.width - 1 : 0;
      const step = dx > 0 ? -1 : 1;
      for (let n = 0; n < this.width; n++) {
        const x = start + step * n;
        const src = x - dx;
        const i = row + x;
        if (src >= 0 && src < this.width) {
          this.chars[i] = this.chars[row + src];
          this.fg[i] = this.fg[row + src];
          this.bg[i] = this.bg[row + src];
        } else {
          this.chars[i] = ' ';
          this.fg[i] = 7;
          this.bg[i] = 0;
        }
      }
    }
  }

  flush(): void {
    let out = '';
    let lastFg = -1;
    let lastBg = -1;

    for (let y = 0; y < this.height; y++) {
      out += `\x1b[${y + 1};1H`;
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x;
        const fg = this.fg[i];
        const bg = this.bg[i];

        if (fg !== lastFg || bg !== lastBg) {
          out += `\x1b[38;5;${fg};48;5;${bg}m`;
          lastFg = fg;
          lastBg = bg;
        }
        out += this.chars[i];
      }
    }
    out += '\x1b[0m';
    process.stdout.write(out);
  }
}
