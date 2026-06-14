# AGENT.md — Continuation Brief

You are picking up an in-progress demo. Read this fully before changing code. It
captures the concept, the architecture, the decisions already made (and *why*),
and the next planned feature. The "why" matters more than the "what" here — several
choices look arbitrary until you know the reasoning.

---

## 1. What this is

An **adaptive storefront**: one product catalog, but the page assembles itself
differently per shopper based on inferred intent. The demo is branded **BuildRight**
(home-improvement, HD-scale UX). The thesis: adaptive layout is a *control* problem,
not a *generation* problem — the LLM decides block selection; grounded catalog data
renders truth.

The headline mental model:

```
page = Render( Ground( Decide( Intent(signals), Catalog ) ) )
```

The LLM only **decides** (which blocks, what order, which product ids). It never
renders truth and never invents products. Everything interesting is in the layers
*around* the model.

---

## 2. Non-negotiable principles (do not violate these)

1. **Grounding is absolute.** The model may select product ids; it may never invent
   a product, price, or stock state. Any id the model returns that isn't in the
   catalog is *dropped at bind time* (`lib/schema.ts → ground()`). If a block ends
   up empty, the block is dropped. The page renders truth or it doesn't render.
2. **Finite block vocabulary.** The model picks from a fixed registry of block
   types — never arbitrary HTML/JSX. Adding a block type means adding it to the Zod
   schema AND the renderer switch AND the prompt. All three, or it breaks.
3. **Never crash the page.** Every failure path (schema invalid, network down, no
   API key, parse error) falls back to a grounded cached spec. See the render route.
4. **The intent is legible.** Signal evidence is shown in an EvidenceBar on every
   persona-driven page. This is the product's differentiator vs. a black-box
   recommender. Keep it honest and visible. Do not hide inference.

If you find yourself wanting to relax #1 or #2 to make something easier, stop —
those constraints *are* the product.

---

## 3. Architecture & file map

### Core (pre-existing, do not break)

| File | Layer | Responsibility |
|---|---|---|
| `lib/catalog.ts` | source of truth | 32 products. The ONLY place products/prices/stock exist. `tags` are the join key to signals. |
| `lib/schema.ts` | contract + grounding | Zod `PageSpecSchema`; `ground()` drops invented ids and empty blocks. |
| `lib/prompt.ts` | decisioning | System prompt: shopper input → block selection. Encodes repair-vs-gift layout rules. |
| `lib/fallback.ts` | safety net + scenarios | 4 hand-verified PRESETS (repair, gift, budget, starter). Used as fallback AND demo content in M1. |
| `app/api/render/route.ts` | orchestration | Server-side model call. Accepts `{input, presetKey}`. Falls back to preset spec on any failure. |
| `components/Renderer.tsx` | render seam (legacy) | Switch over block types → React. Still in codebase; not used by new UI (M1+ uses inline section components). |

### Added in signal-driven personas phase

| File | Responsibility |
|---|---|
| `lib/personas.ts` | 4 PERSONAS with typed signal bundles (type, value, tags, recency, confidence, consumable?). |
| `lib/signals.ts` | `inferFromSignals()`: weights signals, detects conflicts, emits EvidenceTrace with per-item outcome. |

### Added in Milestone 1 (Foundation Shell)

| File | Responsibility |
|---|---|
| `tailwind.config.ts` | Design tokens: brand orange, ink, concrete, card, steel, line. Fonts: Archivo/Inter/IBM Plex Mono. |
| `postcss.config.mjs` | Tailwind + autoprefixer. |
| `app/globals.css` | Tailwind base/components/utilities. Body: bg-concrete text-ink. |
| `lib/cart.tsx` | CartContext: items, addItem (auto-opens drawer), removeItem, updateQty, clearCart, total, count, open/setOpen. |
| `lib/persona-context.tsx` | PersonaContext: persona, evidence, setActive(p, e), clear(). Single source of truth for active persona. |
| `components/Header.tsx` | Sticky bg-ink header. Logo, search, "Sign in as" persona dropdown, cart badge. Placeholder adapts to persona. |
| `components/CategoryNav.tsx` | White border-b nav, 10 categories. Reorders by tag-intersection score when persona active. |
| `components/CartDrawer.tsx` | Fixed right panel, item list, +/- qty, subtotal, Checkout. |
| `components/ProductCard.tsx` | Product tile: category abbr placeholder, name/brand/price, orange Add to Cart, links to /product/[id]. |
| `app/layout.tsx` | Server component. PersonaProvider > CartProvider > Header > CategoryNav > main > CartDrawer. Google Fonts. |
| `app/page.tsx` | Client. Watches persona context. Maps persona.id → PRESET key → renders EvidenceBar + PersonaContent. Default: hero + best-sellers. |
| `app/product/[id]/page.tsx` | Server component. generateStaticParams() → 32 pre-rendered routes. Breadcrumb, details, related products. |
| `app/product/[id]/AddToCartButton.tsx` | Client. useCart().addItem(product). |

### Added in Milestone 2 (GenUI Layout Generation)

| File | Responsibility |
|---|---|
| `app/actions.tsx` | Server action. Uses AI SDK `generateText` with 5 rendering tools to assemble grounded page blocks. Falls back to presets without `ANTHROPIC_API_KEY` or on any model/tool failure. |
| `components/sections/HeroBanner.tsx` | Shared hero section for default, repair, gift, and outdoor modes. |
| `components/sections/GuideSection.tsx` | Shared numbered guide section. |
| `components/sections/ProductGridSection.tsx` | Shared grounded product grid section. |
| `components/sections/ComparisonSection.tsx` | Shared comparison cards with catalog-bound product details. |
| `components/sections/PageSkeleton.tsx` | Loading skeleton shown while persona layout generation is pending. |

---

## 4. Current milestone state

### Milestone 1 — COMPLETE (Foundation Shell)

Build passes. All 32 product pages statically generated. The full site shell works:
- Persona selection via "Sign in as" dropdown → page rebuilds from PRESET spec.
- EvidenceBar shows signal chips (fired/suppressed/overridden) + conflict note.
- CategoryNav reorders by persona signal tags.
- Cart drawer with quantity controls, auto-opens on add.
- Product detail pages server-rendered with related products.
- **Limitation:** M1 uses PRESETS synchronously. No AI streaming yet.

### Milestone 2 — COMPLETE (GenUI Layout Generation)

The page now calls `app/actions.tsx` on persona selection. The server action uses
AI SDK `generateText` with 5 rendering tools:
- `renderHero(headline, sub, mode)`
- `renderProducts(title, productIds)`
- `renderGuide(title, steps)`
- `renderGiftCollection(title, note, productIds)`
- `renderComparison(title, productIds)`

The action returns serializable page blocks plus `fromAI`. The client renders those
blocks with the extracted `components/sections/` components and a staggered entrance
animation. If there is no `ANTHROPIC_API_KEY`, or if the model/tool call fails, the
action returns the matching preset with `fromAI: false`.

**Grounding still applies in M2.** Tool-call product IDs are filtered through
`byId()` inside the server action, and product binding in `app/page.tsx` filters
through `byId()` again before rendering. Invented IDs are dropped.

### Milestone 3 — Full Product + Cart (planned)

- `/cart` route — dedicated cart page with order summary.
- Persona-aware related products on product detail page (use signal tags, not just category tags).
- Quantity selector on product page before add-to-cart.

### Milestone 4 — AGENT.md + final review.md (planned)

- Update this file with complete M2/M3 architecture.
- Write final `review.md` covering the full implementation.

---

## 5. Persona + signal system

### The 4 personas (each stresses a different inference case)

1. **Mid-Repair Homeowner** (`mid_repair`) — strong convergent signal (searches "faucet cartridge", abandoned plumbing cart). Easy case; should look effortless. → repair layout.
2. **Gift Shopper** (`gift_conflict`) — fresh search "Father's Day gift" vs. purchase history of heavy pro-tool buys. **Conflict case.** Fresh explicit search beats stale history → gift layout, but EvidenceBar must SHOW the override.
3. **Nudged Browser** (`nudged_browser`) — no searches; only soft signals (outdoor email click, patio ad, bought a grill last summer). **Weak-signal case.** → outdoor/seasonal at lower confidence.
4. **Blank Slate** (`blank_slate`) — no history. **Cold-start case.** → best-sellers default.

### Signal weighting (lib/signals.ts)

```
TYPE_BASE: search=1.0, cart_abandon=0.85, purchase=0.75, email_click=0.5, ad_click=0.3
effectiveWeight = TYPE_BASE[type] × recency × confidence
```

Conflict detection: if `searchWeight > durableWeight × 2`, fresh search wins; durable outcome → "overridden".

Confidence thresholds: totalPositiveWeight > 1.5 → "high", > 0.6 → "medium", > 0 → "low", else "none".

### Persona → preset fallback mapping

```typescript
const PERSONA_PRESET: Record<string, keyof typeof PRESETS> = {
  mid_repair:     'repair',
  gift_conflict:  'gift',
  nudged_browser: 'budget',
  blank_slate:    'starter',
};
```

---

## 6. Conventions you must respect

- **Tags are the signal interface.** Product `tags` are how signals join to inventory. A search for "drain clog" → tags `plumbing,repair`. When adding products, tag them so signals can find them.
- **Consumable vs. durable matters.** Consumables (soil, bulbs, saw blades) complement purchases and recur. Durables (grill, thermostat, ladder) suppress their category after purchase. The signal-weighting logic depends on `consumable` field.
- **No emoji in code or UI.** System rule — enforced globally.
- **No Claude co-author in git commits.** User preference — commits are under user's name only.
- **Adding a block type** = schema + renderer switch + prompt rules, all three.
- **Copy style:** plain, active voice, end-user framing. Name things by what the user does, not how the system works.
- **No comments that explain WHAT code does.** Only add a comment when the WHY is non-obvious.

---

## 7. Run / build / deploy

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # type-checks + builds; must pass before pushing
```

- **No API key** → serves grounded cached PRESET specs. Good for a free public deploy.
- **With key** → set `ANTHROPIC_API_KEY` in `.env.local` (dev) or Vercel env (prod).

Deploy: push to GitHub → import on Vercel → (optional) add env var → deploy.

Stack: Next.js 14 App Router · TypeScript · Tailwind CSS v3 · Zod · no DB.
Model: Anthropic `claude-sonnet-4-6` through `@ai-sdk/anthropic` + AI SDK v6.

---

## 8. Gotchas

- The Google Fonts `<link>` in `app/layout.tsx` triggers a harmless CSS-minify warning in sandboxed/offline builds. Do not "fix" it by removing the fonts.
- `app/api/render/route.ts` is the legacy JSON render route. The active M2 home-page path is `app/actions.tsx`.
- Playwright is installed globally via homebrew at `/opt/homebrew/lib/node_modules/playwright`, not in project node_modules. If scripting browser tests, require from that path.
- `max_tokens` is set modestly in the render route; if you add many block types, a complex page may need a higher cap.

---

## 9. Explicit non-goals (don't build without being asked)

Per-user real-time render on every pageview (cache by intent cluster instead), real signal integrations (CDP/event stream/ad pixel), the live mid-session intent switch detector (designed but deferred), A/B eval infra, real auth, real inventory APIs. These are the "what productionizing adds" story — name them, don't smuggle them into the demo.
