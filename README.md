# Tutee Connect — UK landing page

A static rebuild of the USA landing page (https://pageus.netlify.app/#/) for the UK market.
Same layout, same Tailwind classes, same animations — UK content.

## Files

```
Start Local Server.command      double-click to preview locally (macOS)
serve.py                        the preview server it runs
index.html                      home page (10 sections)
universities.html               UK university directory
assets/css/main.css             the reference site's compiled Tailwind output (verbatim, 2 URLs repointed)
assets/css/quicksand.css        webfont declarations
assets/fonts/*.woff2            Quicksand
assets/js/main.js               all interactivity (replaces the React app)
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
| AI counsellor panel | scripted replies, lead capture (name → phone → email), submits to `/api/enquiry` |
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
