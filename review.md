# Milestone 2 Review - GenUI Layout Generation

**Objective:** BuildRight now assembles persona-specific storefront layouts through an AI tool-call layer while preserving the core grounding rule: product truth comes only from the fixed catalog, and invented product IDs are dropped before rendering.

---

## What Was Built

- `app/actions.tsx` - Server action using `generateText` with 5 rendering tools: `renderHero`, `renderProducts`, `renderGuide`, `renderGiftCollection`, and `renderComparison`.
- Section components extracted to `components/sections/` for shared rendering: hero, guide, product grid, comparison, and loading skeleton.
- `app/page.tsx` now calls the server action when a persona is selected, stores generated blocks plus `fromAI` in state, and renders the result client-side.
- Staggered section entrance animation added in `app/globals.css` for the skeleton-to-content transition.
- EvidenceBar accepts `fromAI` and shows a small `AI` badge only when the server action returns live AI-generated blocks.
- No API key fallback remains fully functional: without `ANTHROPIC_API_KEY`, the same UI renders grounded preset blocks.
- AI-selected product IDs are filtered through `byId()` in the server action and again at render binding.

---

## What To Review

- Skeleton to content transition after choosing a persona.
- AI badge behavior: it should appear only for live AI output, not preset fallback.
- Block ordering per persona:
  - Mid-Repair should lead with repair hero, guide, exact products, and optional comparison.
  - Gift Shopper should lead with gift hero, gift collection, then comparison.
- Grounding: no invented product IDs should render. Invalid IDs are dropped before blocks reach the page.
- Default home still shows the broad hero and "Popular this week" best-seller grid.

---

## What Is Pending

- M3: persona-aware product detail recommendations and a dedicated cart page.
- M4: final `AGENT.md` update and final project review.

---

## Build Status

`npm run build` passes.

---

## Screenshots

- `screenshots/m2-default-home.png`
- `screenshots/m2-mid-repair.png`
- `screenshots/m2-gift-shopper.png`
