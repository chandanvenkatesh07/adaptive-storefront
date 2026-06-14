# Milestone 2 Review - GenUI Layout Generation

**Objective:** BuildRight now assembles persona-specific storefront layouts through an AI tool-call layer while preserving the core grounding rule: product truth comes only from the fixed catalog, and invented product IDs are dropped before rendering.

---

## What Was Built

- `app/actions.tsx` - Server action using `generateText` with 5 rendering tools: `renderHero`, `renderProducts`, `renderGuide`, `renderGiftCollection`, and `renderComparison`.
- Section components extracted to `components/sections/` for shared rendering: hero, guide, product grid, comparison, and loading skeleton.
- `app/page.tsx` now calls the server action when a persona is selected, stores generated blocks plus `fromAI` in state, and renders the result client-side.
- Staggered section entrance animation added in `app/globals.css` for the skeleton-to-content transition.
- EvidenceBar accepts `fromAI` and shows a small `AI` badge only when the server action returns live AI-generated blocks.
- No API key fallback remains fully functional: without `ANTHROPIC_API_KEY`, the same UI renders grounded preset blocks matched to each persona.
- AI-selected product IDs are filtered through `byId()` in the server action and again at render binding.
- Post-review hardening: live tool calls are parsed in model order, deduplicated, capped to 5 rendered blocks, normalized by mode, and rejected to fallback if grounding leaves no product-bearing block.
- Added outdoor and default presets so Nudged Browser and Blank Slate match their documented intents without an API key.

---

## What To Review

- Skeleton to content transition after choosing a persona.
- AI badge behavior: it should appear only for live AI output, not preset fallback.
- Block ordering per persona:
  - Mid-Repair should lead with repair hero, guide, exact products, and optional comparison.
  - Gift Shopper should lead with gift hero, gift collection, then comparison.
  - Nudged Browser should lead with outdoor hero and outdoor/seasonal product grid.
  - Blank Slate should lead with default hero and broad best-seller product grid.
- Grounding: no invented product IDs should render. Invalid IDs are dropped before blocks reach the page.
- Default home still shows the broad hero and "Popular this week" best-seller grid.

---

## What Is Pending

- M3: persona-aware product detail recommendations and a dedicated cart page.
- M4: final `AGENT.md` update and final project review.

---

## Build Status

`npm run build` passes after the post-review hardening fix.

---

## Post-Review Fixes

- Fixed live AI over-generation risk by using a single model tool-call response and normalizing returned blocks instead of forcing multiple `generateText` steps.
- Fixed hero-only AI success by requiring a grounded product-bearing block before returning `fromAI: true`.
- Fixed prompt-only ordering by sorting accepted blocks into the expected order for repair, gift, outdoor, and default modes.
- Fixed fallback persona mismatches: `nudged_browser` now maps to `outdoor`, and `blank_slate` maps to `default`.
- Updated legacy schema/prompt/readout paths to recognize `outdoor` and `default` intent modes.

---

## Screenshots

- `screenshots/m2-default-home.png`
- `screenshots/m2-mid-repair.png`
- `screenshots/m2-gift-shopper.png`
