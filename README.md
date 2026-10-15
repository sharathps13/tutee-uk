# Tutee Connect — UK landing page

A static rebuild of the USA landing page (https://pageus.netlify.app/#/) for the UK market.
Same layout, same Tailwind classes, same animations — UK content.

## "The Atlas": the current home page (15 October 2026)

`index.html` was rebuilt from scratch as an editorial atlas of the visitor's own route to a UK
university. It replaces "The Flight" (dark teal night, amber, departures board, 2D globe), which
is backed up in `_legacy/flight-2026-10-15/`.

### Three directions considered

| | A. The Atlas (chosen) | B. Letter of Offer | C. Campus at Dusk |
|---|---|---|---|
| Idea | A paper relief model of the UK on a chalk table; the visitor's route is a red thread that arrives from the south-east and climbs a staircase to settlement | The page as an admissions dossier: an envelope opens, documents (offer, CAS, visa, eVisa) stack and flip in 3D | A walkable low-poly British campus at twilight; each building houses a service |
| Colour | Chalk paper, Oxford-navy ink, one signal red, brass markers | Ivory and maroon ink, gold foil | Indigo night, sodium-lamp gold |
| Composition | Asymmetric text column beside a persistent 3D world; editorial ledgers and indexes, not card grids | Centred document stacks, typographic letterheads | Full-screen scene, HUD overlays |
| Interaction | Scroll moves one camera; steps, cities, nations, services, visas and stories light their place on the map | Scroll flips pages | Free exploration |
| Risk | Light 3D must stay legible: solved with a paper wash behind the text column and on-demand rendering | Bureaucratic feel adds to visa anxiety | Game-like, heavy on phones, purple-blue cliché |

**Why A:** it explains the product (a route from your city to a UK degree and beyond) in the
first screen, carries every chapter with one object instead of decoration, is cheap enough for
phones (one scene, rendered only when something changes), and is the most different from the
previous dark design (light ground, new type voice, new composition, new interaction model).

### Identity

- **Colour tokens** (`assets/css/atlas.css` `:root`): chalk `#f3efe6`, chalk-2 `#e9e3d6`, paper
  `#fcfaf5`, ink `#0f1b2d`, ink-2 `#3a4558`, ink-3 `#5a6373`, night `#0e1828` (funding and footer),
  red `#c62a1f` (action and the route; white text 5.6:1), red-2 `#a5211a` (red text, 6.9:1 on chalk),
  red-on-night `#ff8f84`, brass `#b9842a` (markers), brass-ink `#855c16`, ok `#2c6a4c`, err `#b42318`,
  focus `#2350b8` (light) / `#9db8ff` (dark). The 3D materials use the same values.
- **Type:** Bricolage Grotesque at weight 300 for display with the payoff set at 720
  ("Plot your route to a **UK university.**"); Plus Jakarta Sans for text; small tracked capitals
  for labels. Quicksand is no longer used.
- **Shape:** crisp 2–8 px radii, hairline rules, ledgers and indexes instead of rounded cards.

### Chapters

| # | Section | Composition | In the 3D world |
|---|---|---|---|
| — | Start `#home` | Headline left, map legend (Admissions, Student visa, Funding, Settlement) | The UK relief model |
| 01 | The hard parts `#worries` | Sticky heading, four large statements each answered by a service | (solid chapter; world paused) |
| 02 | Your route `#journey` | Eight step cards on a timeline | The red thread draws to the step being read; its waypoint lights |
| 03 | Why the UK `#why-uk` | Text right; figures ledger; four-nation tabs with photographs | The chosen nation rises and tints |
| 04 | Universities `#universities` (`#welcome` inside) | City chips, list, details sheet, shortlist | Brass pins; clicking a pin label selects the city |
| 05 | What we do `#services` | Numbered index, Read more | The steps each service supports light up |
| 06 | Funding `#scholarships`, `#financial-aid` | Night ledger spread, lender logo wall | (solid chapter) |
| 07 | Settle `#relocate` | Four visas as a ledger; family panel | The staircase: Student visa → Graduate Route → Skilled Worker → ILR |
| 08 | Stories `#testimonials` | Postcards, text right | Each card lights its city |
| — | News, Questions `#uk-news`, `#faq` | Feed row; sticky FAQ | (solid) |
| 10 | Free evaluation `#contact` | Perks + contact options; route ticket + two-step form | Camera pulls back to the whole route |

Every word is in the HTML. `html.world-on` (decided before first paint in `flag.js`) switches the
layout to its two-column form; if WebGL is missing, the bundle fails, the context is lost, the
device is low-memory or Save-Data is on, the page uses its 2D layout (still poster in the hero,
SVG map in Universities). Reduced motion: no Lenis, the camera cuts instead of gliding.
Test the fallback with `index.html?noworld`.

### Files

```
index.html                 markup (all ids, form fields and data-* hooks landing.js needs)
assets/css/atlas.css       the whole Atlas stylesheet: tokens, chapters, generated components
assets/js/atlas.js         presentation: scroll → camera, chapter links, Read more, nation tabs,
                           contents focus trap, dataLayer events (no analytics is loaded)
assets/js/world.js         the 3D world, built from tools/world (three.js r186), ~150 KB gzip,
                           loaded after the page is idle
assets/js/landing.js       functional core, unchanged in behaviour (only confetti colours)
assets/js/flag.js          + the world-on decision before first paint
assets/img/atlas/          hero posters (stills rendered from the world itself)
assets/css/atlas-directory.css  maps universities.html onto the Atlas tokens and type
tools/world/               dev-only build: src/world.js, src/geo.js, build.mjs, preview.html
```

Rebuild the world after editing `tools/world/src`: `cd tools/world && npm install && npm run build`.
`tools/` (including `node_modules`) is not needed on the server; exclude it from deploy uploads.

### Tested (15 October 2026)

Playwright (headless Chrome) and Chrome DevTools against a local server that runs the real
`netlify/functions/enquiry.mjs` with a local mock Apps Script (no production lead created):
- Form: empty/invalid errors, phone length, email typo suggestion, step 2, shortlist carried from
  the map, success only after the server confirms, honest error with input kept when the upstream
  fails, one request on double-click; server rejects bad names, honeypot and dead mail domains.
- Lighthouse (accessibility / best practices / SEO): home 100/100/100 on desktop and mobile;
  universities.html 100/96/100 on mobile (the 96 is the existing Supabase DNS failure, which
  falls back to the bundled data).
- Keyboard: skip link first, Contents opens/closes with focus moved and returned and Tab trapped,
  nation tabs with arrow keys, visible 3px focus ring; Tutee AI answers from page content.
- Performance: LCP 318 ms desktop; 1.9 s on a phone at 4× CPU + Slow 4G (gzip); CLS 0.00;
  scrolling all 3D chapters p95 10.2 ms (1×) and 29.9 ms (4× CPU) on integrated AMD graphics.
- Fallbacks forced: bundle blocked, WebGL unavailable, `?noworld`, reduced motion.
- Viewports: 360, 390, 768, 844×390, 1024, 1280, 1440, 1920, 2560×1080; no horizontal overflow.

## "The Flight" (15 October 2026, superseded by the Atlas; backup in `_legacy/flight-2026-10-15/`)

A dark night-to-dawn journey with a departures board, a Canvas 2D globe and pinned chapters.

## Earlier October 2026 redesign of `index.html` (superseded; kept for history)

The home page was rebuilt from scratch as a lead-generation page. All copy from the previous
version is kept; the original markup is backed up at `_legacy/index.original.html` (git-ignored).
The old `main.css` / `main.js` are no longer used by either page and were moved to `_legacy/`.

```
index.html                      the landing page (hand-written, semantic HTML)
assets/css/landing.css          its stylesheet — tokens at the top (:root)
assets/js/landing.js            its behaviour — one init function per component
assets/vendor/gsap/             GSAP 3.15.0 + ScrollTrigger, SplitText, DrawSVG, MotionPath, Flip
assets/vendor/lenis/            Lenis 1.3.26 smooth scroll
assets/vendor/LICENSES.md       versions, licences, how to update
```

Libraries are self-hosted (not CDN) because the CSP is `script-src 'self'`. React Bits effects
are re-implemented in vanilla JS (React Bits ships React components and this site has no
React/build step) — see the "after React Bits <Name>" comments in `landing.js`.

**Device strategy.** CSS always holds each section's finished, readable state; GSAP only
animates *from* elsewhere. `gsap.matchMedia` gives pinned effects (welcome zoom, horizontal
services) only to screens ≥1024 wide and ≥600 tall; smaller or short screens get native swipe
and simple reveals; `prefers-reduced-motion` gets a static page with no Lenis. Lenis smooths
the mouse wheel only (touch scroll stays native). The WebGL aurora renders at ½ resolution
(⅓ on phones) and pauses off-screen / in background tabs; a CSS gradient is the fallback.
Display type is sized with `min(vw, vh)` so 4:3, 16:10, 16:9, 21:9 and short laptop screens
all fit. Verified with no horizontal overflow and no console errors at 390×844, 768×1024,
1024×768, 1366×768, 1280×800, 1920×1080 and 2560×1080, plus reduced motion.

Every section ends in a route to `#contact`, and context collected on the way is submitted
with the lead as extra fields (the Netlify function forwards unknown fields as email rows):

| Component | Sends |
|---|---|
| Hero booking bar (level / intake / funding) and step 1 of the form | `study_level`, `intake`, `funding` |
| UK map hearts (+ `selectedUniversity` from the directory) | `shortlist` |
| Any `[data-goto]` link with `data-intent`, or the "I need help with" dropdown | `destination` = `UK – <interest>` |

Every section has its own layout and interaction:

| Section | Layout / interaction |
|---|---|
| Hero | full-bleed Oxford photo (pointer + scroll parallax), white headline with highlighter swipe, *RotatingText*, *BlurText*, floating highlight cards, a travel-style booking bar (level / intake / funding dropdowns) that sends visitors to step 2 of the enquiry, and a stats row |
| Welcome | pinned: Oxford photo zooms from framed card to full bleed, counters (*CountUp*) |
| Journey | central spine fills on scroll with a plane riding the tip; steps alternate left/right in three phases |
| Ticker | always glides gently; scrolling speeds it up and flips direction (*ScrollVelocity*); pauses on hover |
| Why UK | library photo background (clipped, no edges on parallax), heading + copy row, four aligned stat tiles with icons (*SpotlightCard*), feature pills |
| Services | pinned horizontal track (no visible scrollbar/progress bar); a card expands into its detail panel with GSAP Flip |
| Universities | coastline draws, pins pop in, city card → heart to shortlist |
| Scholarships | intro + expanding panels: hover/focus/tap widens a panel to show its detail, the others collapse to vertical labels (stacked on phones) |
| Loans | animated *GradientText*, *ScrollReveal*, lender *LogoLoop* |
| Settle | compact: four-step visa ladder (swipeable row on phones), proof cards and a family card (MRes and PhD students relocating with their families) |
| Testimonials | "wall of love": two columns of quote cards drift past each other (rows on phones); pauses on hover/focus, off-screen and via a Pause button; a still grid with reduced motion |
| FAQs | centred: search, segmented topic tabs with a sliding pill, icon + tag accordion with an "ask about this" link per answer, "still have a question?" banner; filters never open answers |
| Contact | no contact details by design: a large boarding pass whose stub fills in live (name, level, intake, funding, topic) beside the two-step form; four "what you get" perks underneath; DrawSVG check + confetti on success |
| Footer | light: "Ready for take-off?" CTA, Explore, Destinations chips, Talk-to-us (WhatsApp/Call/Email/Website, all white tiles with maroon icons) |

Contact details everywhere: +91 73583 64959 (call & WhatsApp), info@tuteeconnect.com,
www.tuteeconnect.com. **Footer destination chips** other than UK/USA currently link to
www.tuteeconnect.com — replace each `href` in the footer with that country's landing page URL.

**universities.html** was redesigned to match: dark search hero, sticky nation/type filters and
sort, animated (GSAP Flip) result grid of the 499 institutions, 24 at a time, with a shortlist
heart on each card. Hearted institutions fill a tray. **The page has no form of its own**: every
"apply" / "free evaluation" link sends the visitor to the consultation form on the home page
(`index.html#contact`), carrying the shortlist and topic with them (`handOffToHome()` in
`landing.js`: saved in `localStorage` as `tcHandoff`, or passed as `?handoff=` when storage is
blocked; the home page reads it in `initForm()` and `arriveAtForm()` lands on the form once the
layout settles). All of its `#contact` links point at `./index.html#contact`. It uses
`landing.css`, `landing.js` and
`assets/js/universities.js`. The
`offerRate` placeholder is not displayed. The old page is backed up at
`_legacy/universities.original.html`.

**Performance.** Stress-tested with headless Edge over CDP (load metrics plus frame timing while the
whole page is scrolled with real wheel/touch gestures) at 2560x1080, 1920x1080, 1440x900, 1366x768,
1024x768, 768x1024 and 390x844 with 2–4x CPU throttling and simulated slow 4G. What keeps it fast:
- Photos are responsive WebP in `<picture>` (640/960/1400w in `assets/img/opt/`, JPEG fallback); the
  hero is preloaded with `imagesrcset`. Logo/icon are resized copies (the old 1000px icon was 186 KB).
  A phone downloads ~460 KB in total.
- `assets/js/flag.js` (tiny, in `<head>`) sets `.js` before the first paint and holds the hero copy
  for at most 0.6 s so it never flashes before its entrance animation.
- `landing.js` boots in two phases: the first screen before the first paint, everything else one
  init per task afterwards; heading splits run in ~8 ms idle chunks. No long task blocks input.
- Nothing reads layout inside scroll handlers (page height, ticker width, journey line are cached;
  the mobile CTA uses an IntersectionObserver). Infinite CSS animations use transform/opacity only
  and pause while their section is off screen (`.is-off`). Touch devices drop backdrop blur.
- Quicksand is one variable-font face per subset (weights 300–800) with the Latin file preloaded.
If you add an effect, keep it to `transform`/`opacity`, and avoid reading `offsetHeight`,
`scrollWidth` or `getBoundingClientRect()` per frame.

**University details.** Opening a university (map list on the home page, any card on
universities.html) shows a details sheet (side panel; bottom sheet on phones): rank (only when
`ranked`), type, city/nation, what it's known for, how we help, a shortlist toggle, the live shortlist
with remove buttons, and "Get free guidance / Apply with my shortlist", which jumps to the form.
Every heart goes through `setShort()` in `landing.js` (exposed as `TC.setShort` / `TC.onShortlist`),
so the map, directory cards, tray, sheet, form chips and the boarding-pass "Shortlist" line stay in
sync, and the list is submitted with the lead as `shortlist`. The map's names and ranks match
`universities-data.js`.

**Dropdowns.** Every `<select>` on both pages (hero, form, country code, directory sort) is upgraded by
`initDropdowns()` in `landing.js` to a custom listbox: animated panel, check mark on the chosen option,
search box for long lists (country codes), full keyboard support. The native select stays in the
form as the value, so validation and submission are unchanged. Add `data-native` to opt out.

Global: Lenis smooth scroll, scroll progress bar, *ClickSpark* bursts, custom cursor
(fine pointers only), circular-reveal menu, back-to-top ring, mobile sticky CTA, WhatsApp,
Tutee AI chat.

**Tutee AI** (`initChat()` in `landing.js`) answers from this page's own content and never asks
for personal details. It tries, in order: a named university or "universities in <place>" /
"best for <subject>" (same data as the map and directory; the full 499 on universities.html);
curated answers (`KB`), each written from the page copy and tied to its section for a "Show me"
button; then a search of the page text itself (FAQs, service details, steps, cards). When a
question asks for figures the page deliberately leaves out (fees, scores, deadlines, work hours)
it answers what the page says and adds that an advisor confirms the exact details. Only when
nothing on the page matches does it suggest messaging an advisor or booking the free
consultation. **When you change page copy, update the matching `KB` entry too.** For testing,
`TC_ask('question')` in the console returns the answer it would give.
The UK map outline is drawn from approximate coastline coordinates in `landing.js` (`GB`, `NI`)
— stylised, not survey-accurate.

**No monetary values appear anywhere on the page** (no fees, wages, currency amounts,
ROI or calculators) — costs are discussed by counsellors. Keep it that way when editing copy.
Sections are deliberately compact: `--sec-pad` in `landing.css` sets the vertical rhythm.
The phone country code defaults to IN (+91).

## Files

```
Start Local Server.command      double-click to preview locally (macOS)
serve.py                        the preview server it runs
index.html                      home page (see redesign notes above)
universities.html               UK university directory
assets/css/landing.css          index.html styles
assets/js/landing.js            index.html behaviour
assets/css/quicksand.css        webfont declarations
assets/fonts/*.woff2            Quicksand
assets/js/universities.js       universities.html directory (filters, Flip grid, shortlist)
assets/js/services-data.js      the 9 service tabs: title, tagline, body copy, icon
assets/js/universities-data.js  499 UK institutions (universities, colleges, specialist providers)
assets/img/...                  logos, photos, lender logos
api/enquiry.py                  serverless function: emails enquiries to business@tuteeconnect.com
```

No build step and no dependencies — open `index.html` or drop the folder on any static host.

## How it was built

The reference is a React SPA. Its rendered DOM was captured, so the markup and every Tailwind
class is byte-identical to the original; only text nodes and a handful of `src`/`href`/`value`
attributes were changed. The stylesheet is the reference's own compiled CSS, which guarantees
every class in the HTML resolves to the same rule it did on the original site.

React's interactivity was reimplemented in `assets/js/main.js`. Elements are addressed by
`data-*` hooks so no class had to change:

| Behaviour | Notes |
|---|---|
| Scroll reveal | `IntersectionObserver`, threshold 0.1, adds `.active` then unobserves — same as the reference |
| Sticky header | condenses past 50px |
| Mobile nav drawer | slide-up sheet, body scroll lock, Esc to close |
| Services (desktop) | 9 tab cards drive the detail panel + progress dots |
| Services (mobile) | bottom sheet with prev/next, dots, swipe, Esc |
| Universities / testimonials carousels | mobile snap scroll, dots synced by observer (threshold 0.6, 50 ms debounce) |
| FAQ | single-open accordion, separate desktop and mobile presentations |
| Lead forms | POST to our own `/api/enquiry` serverless function, which emails business@tuteeconnect.com; email + phone validation, success/error states |
| AI counsellor panel | (old build — replaced by the page-grounded Tutee AI described above; no lead capture) |
| Directory | live search, load-more in 20s, multi-select, sticky selection bar, application modal |
| Marquee / float / ping / bounce | pure CSS, unchanged from the reference |

## Things to review before launch

1. **The directory holds 499 real institutions — but two fields need your attention.**

   Every name, city, nation, type and Russell Group flag is real, compiled from the Office for
   Students register API, postcodes.io (for towns/nations) and Wikipedia's per-nation lists. It
   spans England 420, Scotland 44, Wales 21, N. Ireland 14 — and by type: 196 colleges,
   105 public universities, 93 specialist providers, 81 private providers, 24 Russell Group.

   - **`offerRate` is an illustrative placeholder.** UK institutions don't publish comparable
     acceptance rates, so all 499 percentages are made up for layout purposes. Replace them with
     verified UCAS/HESA/institutional data, or delete the field and its two render sites in
     `main.js`. They look real enough to pass review unnoticed, which is exactly the risk.
   - **`rank` is only meaningful for the first 145.** Those reflect a general reputational blend of
     the usual league tables. Beyond that, entries are ordered alphabetically within type tiers and
     carry no ranking meaning — national league tables rank universities, not HE colleges. The
     `ranked` boolean encodes this, and the UI shows `#N` only when it's true and a dash otherwise,
     with a line of copy on the page explaining why. Don't relabel that column as a published
     ranking.

   There is no 500th entry, and that's deliberate: 499 is where the verifiable sources ran out.
   The USA site this was cloned from claimed "5000 schools" by generating fake institutions
   ("Bristol State University", "Concord State University - Clinton"). Padding a directory that
   students use to choose where to apply is worse than a shorter honest one.

2. **Photos.** All four photos in `assets/img/photos/` are UK-specific and sourced from Wikimedia
   Commons under CC0 or CC-BY — see `assets/img/photos/CREDITS.md` for file pages, photographers
   and licences:
   - `students-campus.jpg` — Radcliffe Camera, Oxford (Julian Herzog, **CC BY 4.0**) — hero
   - `team-working.jpg` — John Rylands Library, Manchester (Michael D Beckwith, CC0) — `#relocate`
   - `family.jpg` — Notting Hill, London (Bex Walton, **CC BY 2.0**) — `#relocate`
   - `uk-city.jpg` — City of London (CC0) — `#universities`

   The two CC-BY attributions **are already satisfied**: a credit line renders in the footer of
   both pages (desktop and mobile variants), marked `data-photo-credit` in the markup. If you
   swap any photo, update both `CREDITS.md` and that footer line.

   None of the four contains people — good, appropriately-licensed photos of identifiable people
   are scarce on Commons (nearly all are CC-BY-SA), so recognisable British places were the better
   trade. If you want people in the hero, buy a stock licence and drop the file in.

3. **Immigration facts** reflect the rules as written in 2026: two-year Graduate Route (three
   after a PhD), Student dependants limited to postgraduate research and government-sponsored
   courses, ILR after five years, 20 hours a week term-time work. Re-check against GOV.UK before
   publishing, as these change.

4. **Lender logos** are the Indian banks from the USA site (ICICI, HDFC Credila, Avanse, Prodigy,
   MPOWER, …). Correct for the same audience, but confirm each partner covers UK study loans.

5. **`animate-fade-in`** appears in the markup but has no keyframes — that is true of the
   reference site too, so the class is inert on both. Add a rule if you want the fade.

6. **Two deliberate divergences from the reference**, both fixing dead UI rather than restyling:
   - Several section CTAs (`Evaluate Scholarship Profile`, `Check Loan Eligibility`,
     `Calculate Your UK ROI`, `Get Family Visa Help`), the footer logo/chevron scroll-to-top
     controls, and the directory's `Search` button had no handler at all. They are wired now; the
     builder asserts the expected count per label, so a copy change fails the build instead of
     silently producing a dead button.
   - **`cursor-pointer` is applied to every interactive button.** Browsers give `<button>` a
     `default` cursor and the reference never overrode it, so 57 of 66 buttons offered no hover
     affordance. This is the one intentional visual change — it affects the cursor only, nothing
     else. `verify_site.py` checks both properties and will fail on any button lacking a handler.

7. **Enquiry email.** The form posts to our own serverless function at `/api/enquiry`, which
   sends the enquiry to **business@tuteeconnect.com**. The recipient is a hard-coded constant in
   `api/enquiry.py` and the SMTP credentials are server-side environment variables, so nothing
   secret is in the page. **This needs a host that runs functions (Vercel)** — on a purely static
   host `/api/enquiry` 404s and the form shows its error message. Setup, env vars and local testing:
   see `_tooling/ENQUIRY_SETUP.md`.

## Running it locally

### Easiest: double-click `Start Local Server.command`

It opens a Terminal window, starts the server in this folder and launches your browser. Leave the
window open while you browse; close it (or press Ctrl+C) to stop. Nothing to install.

macOS may warn the first time because the file came from another machine — right-click it and
choose **Open**, then **Open** again. After that, double-clicking works.

### Or from a terminal

```bash
python3 serve.py
```

Then open <http://localhost:8000/>. Both routes use the same script, which:

- serves from the folder `serve.py` lives in, so your working directory doesn't matter
- binds **dual-stack**, so `localhost`, `127.0.0.1` and `[::1]` all work
- **moves to the next free port** (8001, 8002, …) if 8000 is taken, and tells you which it used
- sends no-cache headers, so a reload always shows your latest edit
- opens your browser automatically

Pass a port to override: `python3 serve.py 3000`.

Why not plain `python3 -m http.server`? It binds IPv4 only, and on macOS `localhost` resolves to
`::1` first — so some browsers simply fail to connect. It also dies with "Address already in use"
rather than picking another port. Those are the two usual reasons a local preview looks broken.

### Or open the file directly, with no server

Double-click `index.html`, or `open index.html`. Every path is relative so this works fine. The one
difference: `/api/enquiry` does not exist without a server, so form submissions fail —
so test **real form submissions over the server**, not by double-clicking.

### Deploying

There's no build step. Upload the folder as-is to Netlify, Vercel, Cloudflare Pages, S3 or any
static host — `index.html` at the root. `serve.py`, `Start Local Server.command` and
`README.md` are development-only and can be left out of the upload.
