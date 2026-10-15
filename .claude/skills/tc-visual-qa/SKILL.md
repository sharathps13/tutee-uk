---
name: tc-visual-qa
description: Visual QA and performance verification workflow for Tutee Connect UK — start the local server, screenshot the device matrix, check console/network errors, run DevTools performance traces and Lighthouse, catch layout shift and overflow, and compare before/after. Use after any visible change to index.html, universities.html, landing.css or the JS, and before reporting UI work as done.
---

# Tutee Connect UK — visual QA and performance

Never report a visual change as done without screenshots and an error check from this workflow.

## 1. Serve the site

Use `site-api-test` (real form handler + mock Apps Script, gzip like Netlify) or the `site-nocache` entry in `.claude/launch.json` (port 8782, no-cache headers, so edits always
show). In the desktop app: `preview_start {name: "site-nocache"}`. Pages:
`http://localhost:8782/` and `http://localhost:8782/universities.html`.

## 2. Pick the right browser tool

| Need | Tool |
|---|---|
| Quick look, clicks, resize, console during development | Built-in browser pane (`mcp__Claude_Browser__*`) |
| Scripted journeys, multi-viewport screenshots, form flows | Playwright MCP (`playwright` plugin) |
| Performance traces, Lighthouse, network detail, CSS inspection, heap snapshots | Chrome DevTools MCP (`chrome-devtools`) |

The hidden browser pane can stall `requestAnimationFrame` and GSAP. If animations look frozen there,
use Playwright or DevTools (a real headless Chrome) before concluding that something is broken.
Playwright writes snapshots to `.playwright-mcp/` (git-ignored). Save your own screenshots in the
session scratchpad, not the repo.

## 3. Screenshot matrix

Capture at least 390×844, 768×1024, 1366×768 and 1920×1080, plus any size the change targets (full
list in `tc-a11y-responsive`). For each: top of page, the changed section and the `#contact` form.
Scroll through the page first so lazy images and one-shot reveals have run, then screenshot. Look
for clipped words, overlaps, dock/header covering content, misaligned grids and unreadable text over photos.

## 4. Error checks (each must be clean or explained)

- Console: no errors. A known, expected one: the Supabase host
  `owjioobpcdipxnkpanyg.supabase.co` currently fails DNS (`ERR_NAME_NOT_RESOLVED`) and the
  directory falls back to the bundled data. Report it but do not treat it as a regression.
- Network: no 404s for assets; no request blocked by the CSP in `netlify.toml` (a new third-party
  image or API host needs its CSP entry).
- Overflow: `document.documentElement.scrollWidth <= innerWidth` at every width.

## 5. Performance (run for any JS/CSS/image change)

- DevTools MCP `performance_start_trace` with `reload: true, autoStop: true` on both pages. Record LCP,
  CLS and long tasks. Baseline from 15 Oct 2026, universities.html at desktop with no throttling:
  **LCP 333 ms**.
- Repeat on the phone viewport with CPU throttling at 4× (`emulate`) and slow-4G network; scroll the
  full page and check for long tasks over 50 ms and visible jank in pinned sections.
- Targets: LCP < 2.5 s on throttled phone, CLS < 0.05, INP < 200 ms, no long task > 50 ms during scroll.
- `lighthouse_audit` for accessibility and best practices; list every failed audit, then fix or explain each.
- Assets: new photos as responsive WebP (640/960/1400w) in `assets/img/opt/` with `width`/`height`;
  nothing above the fold lazy-loaded; nothing below it eagerly loaded.

## 6. Regression comparison

For redesign work, capture "before" screenshots of the same viewports first, then show before and
after side by side. Check the interactions that broke in the past:
- Arriving at `index.html#contact` lands exactly on the form.
- A refresh returns to the top.
- Services Skip and Back glide smoothly.
- The hero swipe works.
- The dropdowns, phone validation and the two-step form submit.
- Tutee AI answers (`TC_ask('question')` in the console).

## 7. Report

State what was tested (pages, viewports, tools), what passed, what failed, and include the
screenshots. Never claim "no errors" without having read the console.

## Direction, 3D and realistic loading

- **Compare with the chosen direction** (README "The Atlas"): screenshot the same chapters at the
  same sizes as the last accepted baseline and list the largest drifts in layout, type scale,
  colour and spacing; fix those before minor ones. (Figma is not used on this project.)
- **Lead path**: run `tools/dev/serve-with-api.mjs` (launch config `site-api-test`) so the form
  posts through the real handler to a mock; test success, the failure flag and a double click.
- **3D**: confirm the WebGL canvas initialised (`canvas.getContext('webgl2')` present, first frame
  drawn), force each fallback (block `assets/js/world.js`, `--disable-webgl` / stub
  `HTMLCanvasElement.prototype.getContext`, reduced motion), and sample frame times while wheeling
  through the 3D chapters at 1x and 4x CPU (target p95 < 20 ms / < 34 ms, no frames > 100 ms).
- **Realistic load numbers**: the local preview server does not gzip; measure LCP behind a gzip
  server (as Netlify serves) with 4x CPU + Slow 4G, and report both.
