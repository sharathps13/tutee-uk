---
name: tc-scroll-story
description: Scroll-driven storytelling rules for Tutee Connect UK's Atlas home page — chapters, the persistent 3D world instead of pinning, how scroll position drives the camera and chapter highlights (atlas.js), GSAP/Lenis as wired in landing.js, timing, reduced motion, and never trapping the visitor or hiding text. Use when adding or changing any animation, scroll effect, chapter or transition on this site.
---

# Tutee Connect UK — scroll story ("The Atlas")

## Stack

GSAP 3.15 (+ ScrollTrigger, SplitText, DrawSVG) and Lenis 1.3.26, self-hosted in `assets/vendor/`
and wired in `landing.js` (Lenis for the wheel only; none under reduced motion). The Atlas story
itself is plain scroll maths in `assets/js/atlas.js` driving the 3D world — no pinned sections.

## The story's shape

Start → The hard parts → Your route → Why the UK → Universities → What we do → Funding → Settle →
Stories → News/Questions → Free evaluation. The header's "You are here" names the chapter under
the middle of the screen (`data-chapter`); "Contents" lists them all.

## How scroll drives the story

- The world is `position: fixed`; world chapters are transparent so it shows beside the text.
  No pinning: each chapter simply owns scroll length (route steps ~46vh each on desktop).
- Chapter change: camera blends from the previous world chapter's shot over 70% of a viewport.
- Inside chapters, the item whose top passes the reading line (60% down) is "active": route step
  (thread draws continuously), service (its steps light), visa rung (stair + thread), postcard (city).
- Solid chapters (hard parts, funding, news, FAQ) cover the world and it stops rendering.

## Rules

1. **Text is never hostage to motion.** Everything is readable without JS and with reduced motion;
   active states only add emphasis (colour, border), never reveal content.
2. **No pinning, no scroll-jacking.** Native scroll (Lenis smoothing on wheel only), every chapter
   reachable from Contents; the route has a "Skip the route" link.
3. **Continuity.** The red thread carries the story from the route to the staircase to the closing
   view of the whole route; chapters never introduce unrelated objects.
4. **Timing.** Hover 120–200 ms; panels 250–400 ms; camera damping ~0.3 s; reveals 0.6–1.2 s.
5. **Performance.** Read layout only in `measure()` (resize, load, fonts, ScrollTrigger refresh,
   ResizeObserver on `main`), never in the scroll handler; one rAF per scroll burst.
6. **Reduced motion.** No Lenis, no camera glide (cuts), no CSS transitions/animations.

## Check before finishing

Scroll the page at 1440×900 and 390×844 with real wheel/touch; screenshot each world chapter at
its start and middle; confirm "You are here" updates, the thread matches the step being read, and
nothing is covered by the header or the phone dock. Repeat with `?noworld` and reduced motion.
