# Milestone 1 Review — Foundation Shell

**Objective of this project:** Full e-commerce storefront (BuildRight, HD-scale UX) where selecting a shopper persona reconfigures the entire site using GenUI streaming and A2UI/MCP. 32-item catalog is fixed; the layout, content, and navigation order adapt per-persona.

**Scope of Milestone 1:** Tailwind CSS design system + full site shell (header, category nav, cart, product detail pages) + static preset-based persona content. Streaming GenUI is Milestone 2 — M1 uses PRESETS to prove layout before wiring the AI layer.

---

## What was built in M1

### Design system
- `tailwind.config.ts` — brand tokens: `brand` (#E8552D orange), `ink` (#1C1C1A), `concrete` (#ECE8E1 bg), `card`, `steel`, `line`.
- Google Fonts: Archivo (display/headings), Inter (body), IBM Plex Mono (labels/mono).
- `app/globals.css` — Tailwind base/components/utilities. Body defaults to `bg-concrete text-ink`.

### Site shell components
- `components/Header.tsx` — Sticky `bg-ink` h-14 bar. BuildRight logo (▣). Search input + orange button. "Sign in as" persona dropdown (4 personas with name+role, active highlighted, clear option). Cart button with item count badge. Search placeholder adapts to active persona.
- `components/CategoryNav.tsx` — White `border-b` bar with 10 categories. When a persona is active, categories are re-ordered by tag-intersection score (persona signal tags ∩ category tags → sort descending). This is the only nav-level adaptation in M1.
- `components/CartDrawer.tsx` — Fixed right panel (w-96 + backdrop). Item list with +/- qty controls and Remove. Shows subtotal, Checkout button, Continue Shopping.
- `components/ProductCard.tsx` — Dark text, brand orange Add to Cart button, category abbreviation in image placeholder circle. Links to `/product/[id]`. Disabled + opacity-40 when out of stock.

### State management
- `lib/cart.tsx` — CartContext: items, addItem (auto-opens drawer), removeItem, updateQty, clearCart, total, count, open/setOpen.
- `lib/persona-context.tsx` — PersonaContext: persona, evidence, setActive(persona, evidence), clear(). Single source of truth for the active persona across all components.

### Pages
- `app/layout.tsx` — Server component. Wraps everything in PersonaProvider > CartProvider > Header > CategoryNav > main > CartDrawer. Google Fonts in `<head>`.
- `app/page.tsx` — Client component. Watches PersonaContext. On persona change, maps persona.id → PRESET key → loads spec. Renders EvidenceBar (signal chips with outcome coloring) + PersonaContent (HeroBanner, ProductGridSection, GuideSection from spec blocks). Default home: hero + "Popular this week" (8 best-seller products).
- `app/product/[id]/page.tsx` — Server component. generateStaticParams() → 32 pre-rendered routes. Product image placeholder, breadcrumb, name/brand/rating stars/tags, price, Add to Cart. Related products: same-tag matches, up to 4.
- `app/product/[id]/AddToCartButton.tsx` — Client component. useCart().addItem(product).

### Persona/signal infrastructure (carried over from pre-M1 phase)
- `lib/personas.ts` — 4 PERSONAS with signal bundles (type, value, tags, recency, confidence).
- `lib/signals.ts` — `inferFromSignals()`: weights signals by type × recency × confidence, detects conflicts (fresh search vs stale durable purchase), emits EvidenceTrace with per-item outcome (fired/suppressed/overridden).

---

## What to review

### Visual / UX
1. **Home page default state** — Dark hero, "Popular this week" 4-up grid. Does it feel retail-grade?
2. **Persona selection flow** — Click "Sign in as" → pick Mid-Repair Homeowner → page rebuilds with repair hero + guide + products. Does the transition feel instant and correct?
3. **EvidenceBar** — Signal chips appear below header when persona is active. Orange = fired, strikethrough = suppressed/overridden. Conflict note renders on orange left border. Is the reasoning legible?
4. **CategoryNav reorder** — With Mid-Repair persona active, Plumbing and Tools should float to the left. Check this.
5. **Cart drawer** — Add product → drawer auto-slides in. Qty +/- works. Subtotal updates.
6. **Product detail page** — Navigate to `/product/sku_faucet_kit`. Check breadcrumb, tags, rating stars, related products grid, Add to Cart.
7. **Gift Shopper persona** — Orange gradient hero, gift products grid. Conflict note in EvidenceBar.

### Code quality
- All persona/cart context flows through single providers (no prop drilling).
- Product detail pages are server components with static generation (no client-side fetching).
- Cart and persona state are client-only — no SSR hydration mismatch risk.
- CategoryNav scoring is simple set-intersection; no magic.

---

## What is NOT yet built (skip in review)

- **Streaming GenUI (Milestone 2)** — Server action with `createStreamableUI` + `streamText`. The page currently loads PRESET specs synchronously. M2 replaces this with a live model call that streams blocks progressively.
- **AI tool calls (M2)** — `renderHero`, `renderProducts`, `renderGuide`, `renderGiftCollection` tools that return streaming React components.
- **A2UI / MCP integration (M2+)** — Agent-driven UI mutation via typed tool calls.
- **Full cart page (Milestone 3)** — Cart drawer is functional but there is no `/cart` route yet.
- **Persona-aware product detail (M3)** — Related products are currently tag-matched only; they don't use persona signals.
- **Real images (M3)** — Product image placeholders (category abbreviation in gray circle) are intentional stubs.
- **Real auth / real signals (non-goal)** — Personas are hardcoded fixtures; there is no CDP/event stream.

---

## Build status

```
Route (app)                              Size     First Load JS
┌ ○ /                                    6.83 kB         101 kB
├ ○ /_not-found                          875 B            88 kB
├ ƒ /api/render                          0 B                0 B
└ ● /product/[id]                        878 B          94.7 kB
    ├ /product/sku_faucet_kit
    └ [+29 more paths]
```

Zero errors, zero warnings. All 32 product pages statically generated.

---

## Next milestone (M2 — Streaming GenUI)

After review agent provides input:
1. `npm install ai@3 @ai-sdk/anthropic`
2. Create `app/actions.tsx` — server action using `createStreamableUI` + `streamText` with tool calls.
3. Tools: `renderHero`, `renderProducts`, `renderGuide`, `renderGiftCollection` — each returns a React component streamed to client.
4. Update `app/page.tsx` — call server action on persona selection, render the streaming `ui.value` node.
5. Extract section components to separate files for RSC compatibility.
6. Persona content should appear block-by-block as the model streams tool calls.
