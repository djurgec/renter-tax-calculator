# Design: Pomorska karta

PorezniKompas reads like a nautical chart. Every municipality is a sounding of its per-bed
flat-rate tax; the address being looked at is the position fix, drawn in chart magenta; the
neighbouring municipalities' rates sit around it as italic depth figures. Recorded from the
built app (`web/src/index.css`, `web/src/components/ChartMap.tsx`).

## Colour

Strategy: committed. The shallow-water blue owns the page; white panels are deep water;
magenta appears only for "you". Tokens live in `web/src/index.css` (light, and a night-chart
dark theme); components use the semantic names, never raw values.

| Role | Token | Light | Dark |
|---|---|---|---|
| Page ground (shallow water) | `--bg` | `#d6ebf4` | `#0b1c2a` |
| Panels (deep water) | `--surface` | `#ffffff` | `#10283a` |
| Quiet fill in panels | `--surface-2` | `#eaf4f9` | `#163246` |
| Ink | `--text` | `#0f2438` | `#e6eef4` |
| Secondary text | `--muted` | `#47596b` | `#9db1c1` |
| Header, footer, tooltips | `--brand` | `#12324f` | `#081521` |
| You: fix, your rate, active nav, focus | `--fix` | `#b0186b` | `#ff5fae` |
| Neighbour soundings | `--sounding` | `#2b6a8e` | `#8cc4e4` |
| Land (Croatia) / neighbours | `--land` / `--land-other` | `#efe0b1` / `#f5ecd2` | `#3a3627` / `#23271f` |
| Sea / isobaths | `--sea`, `--iso-1..3` | `#e7f4fa` → `#afd6e8` | `#0d2233` → `#193a51` |
| Rate classes: <50, 50–100, 100–200, 200+ € | `--rate-1..4` | `#d9ecf4` `#8fc3dc` `#3f8db8` `#16486e` | lighter = higher |
| Notices | `--warn-bg` / `--warn-text` | `#fbefd6` / `#5a3f06` | `#36290c` / `#f3d99a` |

A municipality with several rates (streets, settlements) is a hollow ring in the colour of
its highest rate, never a filled dot, so the map does not overstate certainty.

## Type

- **Barlow** (400/500/600): all interface text. Body 17px, line height 1.45.
- **Spectral** (500, 500 italic, 600): headings, the total, and amounts; italic for map
  soundings and the sea name, as hydrographic lettering on charts.
- Headings tracking −0.02em, balanced wrapping. Figures use tabular numerals.
- Both self-hosted via `@fontsource`; Croatian diacritics included.

## Shape and space

- Panels: radius 20px (`rounded-[1.25rem]`), no borders, separated from the ground by tone.
- Form tiles: radius 16px, translucent white on the ground, solid white on focus.
- Buttons: fully round (steppers 40px, pills for secondary actions).
- Layout: desktop two columns, ~35rem work column + the chart filling the rest, sticky at
  full viewport height. Phone: title, search, chart (23rem), form, result, sticky total bar.
- Page max width 90rem; gutters 16px phone, 32px desktop.

## Signature: the chart

`ChartMap` draws Croatia from Natural Earth (public domain) in SVG: sea, three isobath strokes
along the coast, neighbouring land, Croatia, then one dot per municipality from `/api/map`.
With an address: the chart zooms onto the fix (650ms, ease-out quart), a magenta ring
contracts onto the point, then the neighbours' rates fade in as soundings, placed to avoid
overlap. "Cijela Hrvatska" zooms back out. Hover shows a navy tooltip; clicking a dot opens
the municipality page.

## Motion

One authored moment (the fix landing and the zoom); otherwise only press feedback (scale
0.96), the suggestion list growing from its field, and new totals settling in with a short
blur. Everything respects `prefers-reduced-motion`.

## Never

Eyebrow labels, gradients, glass, shadows on panels at rest, emoji or text glyphs as icons,
monospace as decoration, a second accent colour competing with the magenta.
