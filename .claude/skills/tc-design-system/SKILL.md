---
name: tc-design-system
description: Tutee Connect UK design system ("The Atlas") — colour tokens and contrast roles, type scale (Bricolage light display + Plus Jakarta Sans), spacing, radii, components and how index.html / universities.html plug into them. Use whenever adding or restyling any section, component, colour, font size, spacing or radius on this site, before writing CSS.
---

# Tutee Connect UK — design system ("The Atlas")

The generic "be distinctive" guidance lives in the `frontend-design` plugin skill. This skill is
the project rulebook: what exists, and how new work must plug into it.

## 0. Which stylesheet

- `index.html` → `assets/css/atlas.css` only (tokens in `:root` at the top).
- `universities.html` → `assets/css/landing.css` (layout) + `assets/css/atlas-directory.css`
  (maps landing.css's tokens, type and buttons onto the Atlas). Change the directory's look in
  atlas-directory.css, not by restyling landing.css.
- The 3D world's colours live in `tools/world/src/world.js` (`C`) and must match the tokens.

## 1. Tokens (never hard-code these)

| Role | Token | Value | Notes |
|---|---|---|---|
| Page | `--chalk`, `--chalk-2` | #f3efe6, #e9e3d6 | chalk-2 for alternate (solid) chapters |
| Raised sheets | `--paper` | #fcfaf5 | cards, panels, fields sit on #fff |
| Text | `--ink`, `--ink-2`, `--ink-3` | #0f1b2d, #3a4558, #5a6373 | 15.6 / 8.6 / 5.3 : 1 on chalk |
| Hairlines | `--rule`, `--rule-2` | ink at 14% / 28% | decorative only |
| Control borders | `--field` | #858c98 | 3.2:1 on paper (WCAG 1.4.11) |
| Night chapters | `--night`, `--night-2`, `--on-night(-2/-3)` | #0e1828 … | funding spread, footer, menu |
| Action + the route | `--red`, `--red-2` | #c62a1f, #a5211a | white on red 5.6:1; red-2 for red text on chalk |
| Red on night | `--red-on-night` | #ff8f84 | |
| Markers | `--brass`, `--brass-ink` | #b9842a, #855c16 | brass is decoration; brass-ink for text |
| Feedback | `--ok`, `--err` (+ `-soft`) | #2c6a4c, #b42318 | always with text and an icon |
| Focus | `--focus` | #2350b8 (light) / #9db8ff (night) | 3px outline |

Rules: red means "act" (buttons, the route, the selected state) — never decoration. A new colour
gets a named token with a comment first. Dark text on red is forbidden (fails contrast).

## 2. Type

- Display `.display` / `.h2`: Bricolage Grotesque weight 300, tight tracking, with the payoff in
  `<b>` at 720 ("Every hard part has an **answer.**"). Sizes via `--t-display`, `--t-h2` (clamp on
  `min(vw, vh)` so 4:3 to 21:9 all fit).
- Text: Plus Jakarta Sans 400, 1.62 line height, ≤ ~60ch for leads.
- Labels `.label`: 0.74rem, 700, 0.16em tracking, capitals; chapter numbers in `.ch-n` boxes.
- Quicksand is retired; do not reintroduce it.

## 3. Space, shape, depth

`--s1`…`--s9` (4 px base), `--sec` for chapter padding, `--gutter`, `--wrap` 1320 px.
Radii are crisp: `--r-xs` 2, `--r-s` 4, `--r-m` 8 (dialogs), `--r-pill` only for chips.
Depth: `--lift` (cards), `--lift-2` (form, family panel). Prefer rules and ledgers to cards.

## 4. Composition rules

- Chapters are `section.ch` with `data-section`, `data-chapter` (the "You are here" name) and an
  `aria-labelledby` heading. 3D chapters add `ch-world`, `data-shot`, `data-frame` (left/right/
  center) and put text in `.col` (`.col-right` mirrors). Solid chapters use `ch-solid`/`ch-night`.
- Adjacent chapters must differ in layout (sticky heading + list, ledger, index, text-beside-world,
  postcards…). Do not stack two of the same.
- Every chapter offers a route to `#contact` via `[data-goto]` (+ `data-intent`).
- Keep every functional hook `landing.js` needs (see the comment at the top of each section and
  `tc-conversion`). Behaviour goes in `landing.js` / `atlas.js` keyed by `data-*`, never by styling classes.

## 5. Breakpoints

Phone `max-width: 759px` (world above, text on paper sheets, dock), tablet/small laptop
`max-width: 1099px`, `900px` for stacking two-column blocks, `380px` small phones. Reuse these.

## 6. Before finishing

Screenshot 390, 1024 and 1440 (see `tc-visual-qa`), with and without `?noworld`, and check:
same type scale as neighbours, colours from tokens, contrast roles respected, layout differs from
neighbours, focus visible, nothing covered by the header or dock.

## Hard constraints

- **No monetary values anywhere.** Costs are discussed by counsellors.
- When page copy changes, update the matching `KB` entry used by Tutee AI in `landing.js`.
- CSP is `script-src 'self'`: self-host everything; never add a CDN script.
- Editing files on this Windows machine: never round-trip UTF-8 files through PowerShell 5.1
  `Get-Content`/`Set-Content` (it double-encodes — "â€”"). Use the editor tools or Python with
  `encoding='utf-8'`.
