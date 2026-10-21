---
name: tc-3d-world
description: The Atlas 3D world for Tutee Connect UK — one three.js scene behind the home page (paper relief UK, red route thread, waypoints, university pins, story dots, settlement staircase), its camera shots, chapter links to HTML, render-on-demand budget, build, posters and fallbacks. Use when creating or changing anything rendered with three.js, the world bundle, the hero poster, or how chapters drive the camera.
---

# Tutee Connect UK — the 3D world ("The Atlas")

## Stack and build

- three.js **0.186.1** + esbuild **0.28.2**, dev-only in `tools/world/` (`npm install`,
  `npm run build` → `assets/js/world.js`, ~150 KB gzip, ES module, same-origin because the CSP is
  `script-src 'self'`). Source: `tools/world/src/world.js` (scene + API), `src/geo.js` (outlines
  from `landing.js`, nation borders, city coordinates). No React → R3F/Drei do not apply.
- `tools/world/preview.html` (served from the repo root) shows each shot with buttons;
  `?shot=home&fx=0&fy=0&clean` renders a clean still — that is how the hero posters in
  `assets/img/atlas/` are made (screenshot → WebP with Pillow). Re-render them after changing the
  home shot, colours or lighting.
- Check three.js APIs with Context7 (`/mrdoob/three.js`) before using anything new.

## What the world is

One scene per chapter (`tools/world/src/scenes.js`), each about that chapter's topic — never one
model reused from new angles. Sets sit 90 units apart; the camera cuts between them at the
transition midpoint while atlas.js dips the canvas. Textures are procedural (`textures.js`);
shared materials/primitives in `kit.js`. See README "Per-chapter scenes" for the list.

## API (driven by `assets/js/atlas.js`)

`mountWorld(canvas, {labels, mobile, reduced})` → `setView(a, b, t)` (blend two shots),
`setFrame(x, y)` (shift subject beside/above the text), `setRoute(a, b)`, `setSteps(list, focusK)`, `setFocus`, `setWorry`, `setCity`, `setNation`,
`setService`, `setGrant`, `setStair`, `setStory`, `onWash`, `setPointer`, `setActive`, `onLost`, `dispose`. Shots live in `SHOTS`.

## Rules

1. **Content lives in HTML.** Canvas and labels are `aria-hidden`; labels duplicate HTML text.
   HTML controls drive the scenes (city chips, nation tabs, reading position); the canvas takes no clicks.
2. **Never block the message.** `flag.js` decides `html.world-on` before first paint (skips
   Save-Data, low memory/cores, `?noworld`); `atlas.js` imports the bundle when the page is idle;
   the hero shows a poster until the first frame (`html.world-ready`).
3. **Designed fallbacks.** Import failure, no WebGL, context loss → `world-off`, 2D layout,
   poster stays, SVG map shows. Test each (see `tc-visual-qa`).
4. **One camera, scroll-led.** Chapter shot blends over the first 70% of a viewport; frame is
   measured from the text column. Pointer adds ±2.5° on fine pointers. Reduced motion: cuts, no glide.
5. **Budget.** Render on demand only (dirty flag + damping loop that stops when settled); pause
   when no world chapter is on screen or the tab is hidden. Lambert materials, one hemisphere +
   one directional light, no shadows maps (a blurred canvas texture fakes the shadow), fog follows
   the camera distance. DPR ≤ 1.75 desktop / 1.5 phone. Measured 15 Oct 2026: p95 10 ms at 1×,
   30 ms at 4× CPU on integrated AMD graphics.
6. **Phones are a different composition:** subject framed in the top of the screen, distance
   scaled by aspect ratio, labels hidden, text on paper sheets with gaps as windows.

## Definition of done

Rendered and screenshotted at 1440, 1024, 768, 390 (each chapter that has a shot); fallbacks forced;
frame-time p95 < 20 ms at 1× and < 34 ms at 4× CPU while scrolling; no console errors; posters
re-rendered if the home shot changed.
