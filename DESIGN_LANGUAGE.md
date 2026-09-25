# Design Language

The documentation site under `docs/` is drawn from what this repository already
carries. Nothing here was invented for the site: the palette is the game's own
ANSI table, the light theme is the game's own re-inking of it, and the geometry
is read off `icon.svg`.

## What it was derived from

- **`icon.svg`** gave the palette's starting point and the whole of the
  geometry. The mark is the ship as the character grid draws it, built from
  `#55ffff`, `#5555ff` and `#00aaaa` on `#000000`.
- **`index.html`** gave the rest. `base16` in the `ANSI256` table is the
  classic DOS palette the game renders through, `LIGHT_INK` is the light
  theme the game already ships, and `THEME_BG` names the page colour behind
  the character grid in each scheme.

Deriving the light theme this way matters more than it looks. The game solved
light mode already, against the same constraint the site has, so the site reads
as the same product in both schemes rather than as a page that happens to sit
near it.

## Palette

Every value below is quoted from the source named beside it. Contrast ratios
are measured against the background in the same block, and every pair carrying
text reaches at least 4.5:1.

### Dark - the default

Dark is the game's natural state and stays the site's default, for the same
reason the game gives: it is what a terminal looks like, and it is what every
colour was picked against.

| Role | Hex | Source | On page | Verdict |
| --- | --- | --- | --- | --- |
| Page background | `#000000` | `THEME_BG.dark`, `BLACK` (0) | - | - |
| Raised surface | `#0a0a0c` | derived, one step off the page | 1.06:1 vs page | surface only |
| Body text | `#aaaaaa` | `WHITE` (7) | 9.04:1 | passes |
| Strong text | `#ffffff` | `BRIGHT_WHITE` (15) | 21.00:1 | passes |
| Headings, links | `#55ffff` | `BRIGHT_CYAN` (14) | 17.13:1 | passes |
| Muted text | `#8a8a8a` | grey ramp index 245 | 6.08:1 | passes |
| Rules, borders | `#00aaaa` | `CYAN` (6) | 7.33:1 | passes |
| Decoration only | `#5555ff` | `BRIGHT_BLUE` (12) | 4.13:1 | accents only |
| Accent, warn | `#ffff55` | `BRIGHT_YELLOW` (11) | 19.69:1 | passes |

Two exclusions, both measured rather than assumed:

- **`GRAY` (8), `#555555`, reaches only 2.82:1 on black** and carries no text
  anywhere on the site. It is the obvious pick for muted text and it fails, so
  muted text uses grey ramp index 245 instead, which is still a palette entry.
- **`BRIGHT_BLUE` (12), `#5555ff`, reaches only 4.13:1.** It is the wing colour
  and worth keeping, so it is used for borders and decoration and never for
  text. `BLUE` (4) at 1.58:1 is not used on the page at all.

### Light - `prefers-color-scheme: light`

Taken from `LIGHT_INK`, which is the game's own light palette, against its page
colour `#f2f2f4`.

| Role | Hex | Source | On page | Verdict |
| --- | --- | --- | --- | --- |
| Page background | `#f2f2f4` | `THEME_BG.light`, `LIGHT_INK[0]` | - | - |
| Raised surface | `#ffffff` | derived, one step off the page | 1.12:1 vs page | surface only |
| Body text | `#4a4a52` | `LIGHT_INK[7]` | 7.85:1 | passes |
| Strong text | `#101014` | `LIGHT_INK[15]` | 16.98:1 | passes |
| Headings | `#00565f` | `LIGHT_INK[6]` | 7.52:1 | passes |
| Links | `#00757f` | `LIGHT_INK[14]` | 4.88:1 | passes |
| Muted text | `#5f5f68` | compliant tone, see below | 5.65:1 | passes |
| Rules, borders | `#00757f` | `LIGHT_INK[14]` | 4.88:1 | passes |
| Decoration only | `#8a8a94` | `LIGHT_INK[8]` | 3.06:1 | accents only |
| Accent, warn | `#8f7300` | `LIGHT_INK[11]` | 4.07:1 | accents only |

One substitution and one exclusion, on the same footing as the dark theme's:

- **`LIGHT_INK[8]`, `#8a8a94`, reaches only 3.06:1 on paper.** It is the light
  theme's grey and it cannot carry muted text, so it is kept for decoration -
  the borders on code and table cells, and the rule above the footer - and
  muted text uses `#5f5f68`, which is the same hue taken down until it passes.
  This is the one value on the site not quoted from the game, and it exists
  because compliance wins over fidelity.
- **`LIGHT_INK[11]`, `#8f7300`, reaches only 4.07:1.** It is the one accent the
  site uses, down the left edge of a blockquote, where it is a 4px rule and
  carries no text. Its dark counterpart clears 4.5:1 comfortably and this one
  does not, so the role is held to the stricter of the two: decoration in both
  schemes.

Unlike the dark theme, light splits the rule colour from the decoration colour
the other way round: `LIGHT_INK[14]` is both the link and the rule, because the
grey that would otherwise carry rules is the value that failed above.

Body text on a raised surface is checked separately, since the surface is not
the page: `#aaaaaa` on `#0a0a0c` is 8.51:1, and `#4a4a52` on `#ffffff` is
8.78:1. Links on the light surface are 5.45:1.

The game's remaining accents - `BRIGHT_GREEN`, `BRIGHT_RED` and
`BRIGHT_MAGENTA`, with their `LIGHT_INK` counterparts - are deliberately not
listed. Ten pages of prose have no success state, no error state and no warp
transition to colour, so the stylesheet declares no property for them and these
tables measure nothing that does not appear on a page. They are earning their
keep in the game's own palette, which is where `index.html` records them.

## Geometry

`icon.svg` is a 32 by 32 viewBox holding seven shapes, and every one of them is
an axis-aligned rectangle or a straight-edged triangle on integer coordinates.
There is not a curve or a corner radius in the file. The site follows it:

- **Radius is 0 everywhere.** No rounded corners on any element. This is the
  single strongest thing the artwork says.
- **Spacing runs on a 4px base**, which is the smallest dimension in the mark:
  the engine bells are 4 wide, and 32 divides into eights of 4. The scale is
  4, 8, 12, 16, 24, 32, 48, 64.
- **Borders are 1px and 2px**, solid. The mark has no strokes at all, so weight
  on the site comes from fill and from the rule under a heading rather than
  from outlines.
- **Edges are hard.** No shadows, no gradients, no blur. A raised surface is
  told apart from the page by its border and its fill, the way a character cell
  is told apart from the one beside it.

## Type

The whole project is a character grid, so the site is set in a monospace stack
throughout:

```css
ui-monospace, "Cascadia Mono", "Consolas", "SFMono-Regular", "Menlo", monospace
```

The scale is a 1.25 ratio off a 16px base, rounded to whole pixels so text sits
on the 4px spacing grid as often as it can:

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Body | 16px | 400 | 1.65 |
| Small, captions | 14px | 400 | 1.5 |
| Lede | 20px | 400 | 1.65 |
| `h4` | 16px | 700 | 1.3 |
| `h3` | 20px | 700 | 1.3 |
| `h2` | 25px | 700 | 1.25 |
| `h1` | 31px | 700 | 1.2 |

Body line height is 1.65 rather than the tighter figure a monospace face is
usually given, because the pages carry long explanatory paragraphs moved out of
the README rather than code.

One size on the site is off this scale, and it is the only one:

- **The dropdown caret is 10px.** It is the `v` and `^` the menu buttons draw
  after their label, and it is decoration rather than text - at the scale's 14px
  floor it reads as one more character of the label instead of as a caret. It
  carries nothing the button's `aria-expanded` does not already carry, so no
  reader depends on its size.

## Layout

- **Fixed top menu**, so it stays reachable while reading. The site has ten
  pages, which is the "few pages" case: a top bar with dropdowns onto the
  in-page anchors of the longer pages, rather than a side menu.
- **The bar's height is declared once**, as `--bar`: `--s7` of content box plus
  its own 2px border, so it stays on the spacing scale. The collapsed menu hangs
  off the bottom of the bar and caps itself at `calc(100vh - var(--bar))`, so a
  ten-page menu on a short phone scrolls inside the viewport rather than running
  off the end of it. Reading the bar rather than repeating its height is what
  keeps the two from drifting apart.
- **Responsive from a phone to a wide desktop.** The menu collapses behind a
  button under 860px, and the content column is capped at 80ch so a line of
  monospace text stays readable on a wide screen.
- **Relative links throughout.** The site is served from
  `/cmd-space-rider/docs/` rather than from a domain root, so absolute paths
  would break. Relative links also mean the pages open correctly straight off
  the filesystem.
