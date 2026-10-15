---
name: tc-art-direction
description: Immersive creative art direction for Tutee Connect UK — produce 2–3 genuinely different visual concepts (composition, type, 3D treatment, atmosphere) grounded in UK study and migration, choose one with reasons, prototype the signature moment in the browser (no Figma on this project), design transitions between chapters, and hold it consistently across every section. Use before any redesign of a section or the whole page, or when asked for a "new look", "concepts", or "visual direction".
---

# Tutee Connect UK — art direction

Use this together with the `frontend-design` plugin skill (its anti-template list and
"plan → review → build → critique" process apply). This skill adds the concept stage and the
project's own constraints.

## 1. Ground it in the subject

The subject's own vocabulary is where distinctive choices come from. For this brand that means:
the journey (application → offer → CAS → visa → arrival → Graduate Route), boarding passes and
travel documents, UK university architecture and cities, maps and coastlines, letters of offer,
term calendars. The site already uses several of these (route map, boarding-pass form, coastline
map, plane on the journey spine). New concepts should deepen one of these motifs, not add new
unrelated ones.

Brand anchors that every concept keeps: the logo (maroon wordmark plus emblem) and real UK
places and data. Since 15 Oct 2026 the identity is "The Atlas" (chalk, Oxford-navy ink, signal red,
brass; Bricolage light display + Plus Jakarta Sans; see `tc-design-system`). A new concept may
replace it, but must say what it replaces and why.

## 2. Produce 2–3 concepts before code

For each concept write, in under 150 words:
- **Idea**: one sentence on the visual metaphor and why it fits this audience.
- **Palette**: 4–6 hex values with roles, mapped to existing tokens or proposed new ones.
- **Type**: display treatment (scale, weight, case) and how type itself becomes a design element.
- **Layout**: an ASCII wireframe of the hero and one mid-page section at desktop *and* phone width.
- **Signature moment**: the single memorable interaction or image (spend boldness in one place only).
- **Risk**: what could make it feel untrustworthy or slow, and the mitigation.

The concepts must differ on at least two of palette, type, layout and motion. Three variations of
one idea do not count as three concepts.

## 3. Choose, then explain

Present the concepts to the user with a recommendation, scored against: immediate clarity of the
offer, credibility for parents and sponsors, mobile feasibility, performance cost, and accessibility.
Do not build until a direction is chosen (by the user, or by you with the reasons stated if they asked you to decide).

## 4. Hold the direction across the page

- Write the chosen direction as a short "direction note" at the top of your plan (palette roles,
  type rules, motif, motion personality). Check every section against it.
- Vary layout section to section (see the README section table), but keep the same type scale,
  token palette, radius hierarchy and motion personality.
- Imagery: real UK places (current photos are CC0/CC-BY from Wikimedia; credits in
  `assets/img/photos/CREDITS.md`). No stock "diverse students laughing" clichés, no AI-generated
  people, no generic 3D blobs. Update credits whenever a photo changes.

## 5. Critique pass

Take screenshots at 390×844 and 1440×900 (see `tc-visual-qa`), then answer:
- Could this page belong to any other consultancy if the logo were swapped? If yes, strengthen the motif.
- Is there more than one "wow" competing in a single viewport? Remove one.
- Does every decorative device (numbering, eyebrow, divider, badge) encode real information?
- Remove one accessory before calling it done.

## Immersive work (3D and scroll story)

- Concepts must differ in 3D treatment and atmosphere too, not only in layout and type. For each,
  name the one spatial idea that connects every chapter and what the camera does in each chapter.
- Design tool: the owner instructed on 15 Oct 2026 **not to use Figma** for this project. Explore
  and decide in the browser instead: write the concepts (table in README "Three directions
  considered"), build a throwaway prototype of the signature moment (for 3D, `tools/world/preview.html`),
  screenshot it at phone and desktop size, then commit to one. Record the decision in the README.
- Quality bar before calling a direction done: could the page belong to any other consultancy with
  the logo swapped? Does every 3D object carry part of the story? Is the message clear in the first
  viewport with the canvas removed?
