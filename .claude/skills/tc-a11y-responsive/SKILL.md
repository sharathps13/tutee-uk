---
name: tc-a11y-responsive
description: Accessibility (WCAG 2.2 AA target) and responsive-layout checklist for Tutee Connect UK — keyboard, focus, contrast on chalk/night/red, touch targets, forms, custom dropdowns, sheets/dialogs, reduced motion and the device/aspect-ratio matrix. Use when building or changing any interactive element, form, layout or breakpoint on this site, and before calling UI work done.
---

# Tutee Connect UK — accessibility and responsive design

Target: WCAG 2.2 AA. Passing these checks is evidence, not certification. Never state the site
"is WCAG compliant" in copy or reports. Say what was tested.

## Keyboard and focus

- Every action is reachable by Tab in visual order, with no positive `tabindex`.
- Focus is always visible: at least a 2px outline with 3:1 contrast against both the element and its
  background. Light surfaces use `--focus` #2350b8; night surfaces (funding, footer, menu, ticket)
  use #9db8ff (set via `--focus` on those containers).
  Never set `outline: none` without a replacement.
- Focus must not be hidden by the sticky header or the phone bottom dock (WCAG 2.4.11). The page uses
  `scroll-padding-top: 80px`, so keep the dock out of the way of focused form fields.
- Dialogs and sheets (menu, university details sheet, Tutee AI): move focus in on open, trap Tab,
  close on Esc, and return focus to the trigger on close.
- Custom dropdowns from `initDropdowns()`: listbox pattern with arrow keys, Home/End, type-ahead,
  Enter/Space to choose, Esc to close, `aria-expanded` and `aria-activedescendant` kept in sync. The
  native `<select>` remains the value source.

## Contrast (check with real computed colours)

- Body text 4.5:1, large text (≥24px, or ≥18.66px bold) 3:1, UI boundaries and icons 3:1.
- Roles (see `tc-design-system`): white on `--red` (5.6:1) for buttons, never dark text on red;
  `--red-2` for red text on chalk; `--brass` is decoration only (use `--brass-ink` for text);
  `--field` for control borders; text over the 3D world sits on the paper wash or a paper sheet.
- Do not convey state by colour alone: errors need text and an icon, the selected tab needs weight or an underline.

## Touch and pointer

- Targets at least 24×24 CSS px (WCAG 2.5.8); aim for 44×44 on phones for primary actions and
  dock buttons, with ≥8px between adjacent targets.
- Swipe carousels (hero, visa ladder, services on phones) must also have buttons. Never swipe-only (2.5.7).
- Hover-only content must also open on focus and tap.

## Forms (`#contact` wizard, directory search)

- Each control has a visible `<label>` (placeholder is not a label) and a `name`/`id`. DevTools
  currently reports 3 fields without an id or name on universities.html; fix them when touching that page.
- Errors appear on blur or submit, are linked with `aria-describedby`, and say how to fix the
  problem. Moving to step 2 moves focus to its first field or heading. Announce success with a live region.
- Use correct `autocomplete` tokens (`name`, `email`, `tel-national`, `country`) and
  `inputmode`/`type` for phone and email. Do not ask for anything twice (3.3.7, redundant entry).

## Semantics and readability

- One `h1`, no skipped heading levels, landmark regions (`header`, `nav`, `main`, `footer`), `lang="en-GB"`.
- Decorative SVG gets `aria-hidden="true"`; meaningful images get a real `alt` that is not the file name.
- Body line length ≤ ~75 characters, body text ≥ 16px on phones, line-height ≥ 1.5. Text resizes to
  200% without loss, and reflows at 320 CSS px with no horizontal scroll (1.4.10).
- Animated or auto-moving content (tickers, testimonial wall, hero slides) can be paused, and stops
  under reduced motion.

## Responsive matrix (test every UI change on these)

390×844 (phone), 360×740 (small Android), 768×1024 (tablet portrait), 1024×768 (4:3 laptop),
1366×768 (short laptop), 1440×900, 1920×1080, 2560×1080 (21:9), and 844×390 (landscape phone).

At each size check: no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`),
no text clipped or overlapping, CTAs visible, nothing covered by the dock or header, and images
sized without layout shift.

## Loading and error states

- Data-backed UI (news strip, universities from Supabase) shows a skeleton or the bundled fallback,
  never an empty box, and fails quietly to the fallback (as `supabase-data.js` already does).
- Form submit: disable the button and show progress; on failure keep the user's input and offer
  WhatsApp or a call as the alternative.

## When there is 3D (WebGL) on the page

- The page must be complete and usable with the canvas absent: test with WebGL disabled, with the
  bundle blocked, and with reduced motion. The fallback is the hero poster, the 2D layout and the SVG map, never a hole.
- Canvas is `aria-hidden`; every 3D interaction has an HTML control that does the same thing and is
  keyboard-operable (beacons ↔ city chips, board rows ↔ destination).
- Touch: no gesture is required (swipe always has buttons); the canvas never captures vertical
  page scrolling (`touch-action: pan-y` on interactive canvas areas).
