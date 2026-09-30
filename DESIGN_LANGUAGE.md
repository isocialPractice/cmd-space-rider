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

One substitution, measured rather than assumed the way the dark theme's two
exclusions are:

- **`LIGHT_INK[8]`, `#8a8a94`, reaches only 3.06:1 on paper.** It is the light
  theme's grey and it cannot carry muted text, so it is kept for decoration -
  the borders on code and table cells, and the rule above the footer - and
  muted text uses `#5f5f68`, which is the same hue taken down until it passes.
  This is the one value on the site not quoted from the game, and it exists
  because compliance wins over fidelity.

Unlike the dark theme, light splits the rule colour from the decoration colour
the other way round: `LIGHT_INK[14]` is both the link and the rule, because the
grey that would otherwise carry rules is the value that failed above.

Body text on a raised surface is checked separately, since the surface is not
the page: `#aaaaaa` on `#0a0a0c` is 8.51:1, and `#4a4a52` on `#ffffff` is
8.78:1. Links on the light surface are 5.45:1.

The game's remaining accents - `BRIGHT_YELLOW`, `BRIGHT_GREEN`, `BRIGHT_RED`
and `BRIGHT_MAGENTA`, with their `LIGHT_INK` counterparts - are deliberately not
listed. Ten pages of prose have no warning, no success state, no error state and
no warp transition to colour, so the stylesheet declares no property for them and
these tables measure nothing that does not appear on a page. They are earning
their keep in the game's own palette, which is where `index.html` records them.

`BRIGHT_YELLOW` is the one of the four that was listed here once, and how it came
off is the rule the sentence above states. It was declared as `--warn` in both
schemes and read by exactly one rule, the 4px left edge of a blockquote, and no
page under `docs/` has a blockquote - so the value resolved correctly and reached
no reader. The property went with the rule rather than being kept as an accent
the site has available and does not use, which is the state `--good`, `--bad` and
`--warp` were dropped to end.

## Geometry

`icon.svg` is a 32 by 32 viewBox holding seven shapes, and every one of them is
an axis-aligned rectangle or a straight-edged triangle on integer coordinates.
There is not a curve or a corner radius in the file. The site follows it:

- **Radius is 0 everywhere.** No rounded corners on any element. This is the
  single strongest thing the artwork says.
- **Spacing runs on a 4px base**, which is the smallest dimension in the mark:
  the engine bells are 4 wide, and 32 divides into eights of 4. The scale is
  4, 8, 12, 16, 24, 32, 48, and the stylesheet declares it as `--s1` through
  `--s7`. A 64px step was declared too, and it had exactly two readers: the
  scroll offset that brings an in-page anchor clear of the fixed bar, and the
  page frame's own top padding. Both are derived from the bar's height now, so
  the step had no reader left and went: the stylesheet declares the part of the
  scale something uses.
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

- **The dropdown caret is 10px.** It is the `v` and `^` the menu's dropdown
  buttons draw - after Reference's own label, and on its own for the three
  groups whose label is the page link beside it - and it is decoration rather
  than text: at the scale's 14px floor it reads as one more character of the
  label instead of as a caret. It carries nothing the button's `aria-expanded`
  does not already carry, so no reader depends on its size.

  It is decoration to the eye and not to the accessibility tree, which is the
  trap in drawing it with CSS `content`: generated content is not in the DOM
  but does take part in the accessible name. A button that computes its name
  from its contents picks the glyph up, so Reference - the one group whose
  button carries its own text - announced as "Reference v" closed and
  "Reference ^" open, reading the decoration aloud and re-reading the name on
  every toggle. Every dropdown button carries an `aria-label` for that reason,
  and the three caret-only buttons always did. The glyph's own 10px is its font
  size and not its box: the button takes the same line box as the link beside
  it, so the two draw the same height.

  The caret belongs to the wide layout alone, and taking it away on the narrow
  one needs two rules rather than one. A media query contributes no specificity,
  so the narrow block's `.has-sub > button::after` at (0,1,2) cannot reach the
  top-level `.has-sub > button[aria-expanded="true"]::after` at (0,2,2), and a
  group opened above the breakpoint carried its `^` down onto a button the
  narrow layout has already turned into a label. The narrow block blanks both
  states, and `docs.js` clears `aria-expanded` when the layout changes under it,
  so the label stops announcing a state the page can no longer change.

## Layout

- **Fixed top menu**, so it stays reachable while reading. The site has ten
  pages, which is the "few pages" case: a top bar with dropdowns onto the
  in-page anchors of the longer pages, rather than a side menu.
- **A group that is also a page keeps its link at the top level.** Three of the
  four dropdown groups have a page of their own, and those three are a link plus
  a caret button that opens the list, so the page stays one click away and its
  sections are two. Reference has no page of its own and is a button alone,
  which is why the shapes differ.
- **The bar's height is declared as `--bar`, once per layout**, because it is
  two heights. Wide, the bar is built around a menu entry: a `--s5` line box
  with `--s2` above and below it inside a 1px border, sitting in the bar's own
  `--s2` padding, under its 2px bottom border - 60px. Narrow the menu is not in
  the bar at all but hangs off the bottom of it, so the bar is the MENU button
  instead and comes to `--s7` plus 2px, 50px. Every term is a token the thing
  itself uses, so the declared height and the drawn one move together.

  It was one figure for a while, and the wide layout was never that figure: the
  nav's lists are lists, so the prose rhythm meant for body paragraphs reached
  them and put 24px of margin inside a bar that declared 50px and drew 83px.
  The nav states its own spacing now.

- **What has to clear the bar reads the bar.** `--clear` is `--bar` plus a
  `--s2` gap, and both the scroll offset for an in-page anchor and the page
  frame's top padding are set from it. Picking a figure that merely looked
  right is what put seven of the nav's eight in-page anchors under the bar, with
  about the top half of each heading hidden and nothing on screen saying why.
  The collapsed menu reads `--bar` the same way, capping itself at
  `calc(100vh - var(--bar))` so a ten-page menu on a short phone scrolls inside
  the viewport rather than running off the end of it.
- **Responsive from a phone to a wide desktop.** The menu collapses behind a
  button at 950px and below, and the content column is capped at 80ch so a line
  of monospace text stays readable on a wide screen. The breakpoint is the width
  the wide row actually fits in rather than a round number: the eight entries do
  not wrap, and measured in chromium the row ends at 951.16px, so anything lower
  paints the last group off the right edge of a fixed bar that cannot scroll.
  The figure is written twice - `max-width: 950px` in the stylesheet and
  `min-width: 951px` in `docs.js`, which collapses the dropdowns only on the
  wide layout - and `test/docs-site.test.mjs` asserts the two stay adjacent. It
  also asserts the stylesheet names no third width query: the site has two
  layouts, and the checks that read the bar's geometry sort every rule into one
  of them by the bound its query names.
- **Relative links throughout.** The site is served from
  `/cmd-space-rider/docs/` rather than from a domain root, so absolute paths
  would break. Relative links also mean the pages open correctly straight off
  the filesystem.
