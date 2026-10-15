---
name: tc-conversion
description: Conversion and copy rules for the Tutee Connect UK landing page — audiences (students, parents/sponsors, families), above-the-fold message, CTA hierarchy, trust signals without invented claims, British English, and the two-step consultation form. Use when writing or changing any copy, CTA, section order, form field or trust element on this site.
---

# Tutee Connect UK — conversion and copy

## What the business actually is

Tutee Connect UK is a **study-in-the-UK counselling service**: university shortlisting and
admissions, UK Student visa, scholarships, education loans, settling in, Graduate Route and family
relocation. The single conversion is a **free consultation request** (the two-step form at `#contact`,
plus WhatsApp and phone).

It is **not** a school-tutoring marketplace. Do not add GCSE / A-level / Key Stage / SATs tutoring
copy, a tutor sign-up journey or "find a tutor" language unless the owner confirms that service exists.
If asked to, stop and ask first.

## Audiences (their needs differ — write for one at a time)

| Audience | Main question | What convinces them | Primary path |
|---|---|---|---|
| Prospective student (mostly international; the form defaults to +91 India) | "Can I get into a good UK university, and will my visa succeed?" | Clear process, shortlist tools, real university data | Directory → shortlist → form |
| Parent / sponsor | "Is this safe, legitimate and affordable to fund?" | Transparency, named lenders, step-by-step visa process, a human to call | Loans / process sections → call or WhatsApp |
| Postgraduate researcher moving with family | "Can my family come, and what happens after the course?" | Accurate dependant and Graduate Route rules | Settle section → form with topic |

## Above the fold

Within one screen the visitor must learn: what the service is (UK study guidance, start to finish),
who it is for, and the one action (free consultation). One primary CTA (`.btn-red`), one
secondary (in-page "See the route, step by step"). No third competing button in the hero.

## CTA hierarchy

1. Primary: "Book a free consultation" → `#contact`. Same wording everywhere, so the action keeps one name.
2. Contextual: section-specific CTAs (`[data-goto]` + `data-intent`) carry a topic into the form's
   `destination` field. Prefer these over generic "Contact us".
3. Low-commitment: Tutee AI, WhatsApp, the phone call. On phones these live in the bottom dock, so do
   not add more fixed elements there.

## Trust signals — the no-invention rule

Never write, generate or "improve" any of the following without a source supplied by the owner:
testimonials, names or photos of students, ratings, review counts, success rates, student totals,
partner counts, visa approval statistics, accreditations, regulatory registrations, safeguarding or
compliance claims, awards, press mentions, UK addresses or company numbers.

Existing claims that need owner evidence before launch (flag them, do not repeat them elsewhere):
"99% visa success rate", "200+ UK university tie-ups", "5k+ students guided" (hero stats and the
Welcome counters in `index.html`). The lender logos also need each partner confirmed for UK study.

Allowed trust devices: the visible step-by-step process, specific accurate rules (re-checked on
GOV.UK, as the README requires), the real 499-institution directory, real contact channels, and
plain statements of what the consultation includes.

## Language

- British English: personalised, organised, specialised, enrolment, programme, colour, centre, licence (noun).
- UK terms where accurate: Student visa (not "F-1"), UCAS, CAS, BRP/eVisa, Graduate Route, Russell
  Group, ILR, UKVI, term-time.
- **No monetary values** on the page (README rule): no £ fees, salaries, loan sizes or ROI. "Talk to
  a counsellor about costs" instead.
- Sentence case for headings and buttons. A button says exactly what happens ("Book a free consultation", not "Submit").

## Form friction (the `#contact` wizard)

- Step 1 asks only for a way to reply (name, phone with country, email); step 2 is optional context
  (state, shortlisted universities, notes). Adding a field needs a reason the counsellor uses on
  the first call. The route ticket above the form mirrors what has been entered.
- Pre-fill from context (hero bar, shortlist hearts, `data-intent`); never make the visitor retype it.
- Inline validation on blur with a specific fix ("Add the country code"), never colour alone.
- The success state says what happens next and when, without promising a time the team cannot keep.

## Before finishing a copy change

- Read it at 390px wide: is the main sentence above the fold, and does the CTA fit on one line?
- Search the page for the old wording, so the CTA, `KB` answers in `landing.js` and the README stay in sync.
- List any claim you could not verify, and leave it to the owner to confirm.

## Lead pipeline and measurement (verified facts, keep them true)

- The only lead path is the two-step consultation form → `POST /api/enquiry`
  (`netlify/functions/enquiry.mjs`) → Google Apps Script (env `APPS_SCRIPT_URL`,
  `APPS_SCRIPT_SECRET`, server-side only) → a row in the Google Sheet + an email to
  digital@tuteeconnect.com. Supabase is read-only (universities); there is no tutor registration
  and no analytics provider. Never post leads to Supabase or anywhere else from the browser.
- Verify changes to the pipeline locally first: run the real function against a mock Apps Script
  on localhost (pattern: import the default export, POST a `Request`, check status + forwarded body).
  `tools/dev/serve-with-api.mjs` does this for the whole page: `node tools/dev/serve-with-api.mjs . 8790`
  serves the site and routes `/api/enquiry` to the real handler, forwarding to a mock Apps Script
  that logs to `tools/dev/mock-leads.jsonl` (create `tools/dev/mock-fail.flag` to test failures).
  A live end-to-end test sends a real email and sheet row, so it needs the owner's explicit
  approval, clearly marked test data, and is done once.
- Conversion events go through `window.TC_track` (in `assets/js/atlas.js`), which pushes to
  `window.dataLayer`; nothing reads it until a tag manager is added (none today). Event names `cta_click`, `form_start`, `form_step2`,
  `form_submit_success`, `form_submit_error`, `chat_open`, `whatsapp_click` and non-personal
  parameters only (intent / section). Never send names, emails or phone numbers to analytics.
- Consent: the form collects what is needed to reply; do not add a pre-ticked marketing opt-in.
