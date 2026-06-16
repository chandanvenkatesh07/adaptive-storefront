# BuildRight Adaptive Storefront — Milestone Review

**Overall objective:** One 40-item home-improvement catalog. The page layout, content
blocks, navigation order, and product recommendations all adapt per shopper based on
inferred intent. No per-user server state; the page is fully statically generated and
persona reconfiguration runs on the client.

---

## Milestone 1 — Foundation Shell

### What was built

- **Design system** (`tailwind.config.ts`) — brand orange (#E8552D), ink/concrete/card/steel/line tokens. Archivo (display), Inter (body), IBM Plex Mono (mono).
- **Catalog** (`lib/catalog.ts`) — 40 products with id, name, brand, category, price, inStock, rating, blurb, tags. The only place product truth exists.
- **Persona system** (`lib/personas.ts`, `lib/signals.ts`) — static personas with typed signal bundles, including the flagship repair, appliance-buying, and gift shoppers. `inferFromSignals()` weights signals, detects conflicts, emits an `EvidenceTrace`.
- **PersonaContext** (`lib/persona-context.tsx`) — `setActive(persona, evidence)` and `clear()`. Single source of truth for active persona across the app.
- **CartContext** (`lib/cart.tsx`) — `addItem(product, qty?)`, `removeItem`, `updateQty`, `clearCart`, computed `total` and `count`.
- **Shell components** — sticky `Header` (logo, search placeholder, persona dropdown, cart badge), `CategoryNav` (11 categories, reorders by tag-intersection score when persona active), `CartDrawer` (fixed right panel, qty controls, links to /cart), `ProductCard`.
- **Layout** (`app/layout.tsx`) — `PersonaProvider > CartProvider > Header > CategoryNav > main > CartDrawer`.
- **Home page** (`app/page.tsx`) — client component, maps persona to `PRESET` fallback key, renders `EvidenceBar` + `PersonaContent` block switcher.
- **40 SSG product pages** (`app/product/[id]/page.tsx`) — `generateStaticParams()` pre-renders all catalog routes at build time.

### What to verify

1. Persona dropdown: select each persona. The `EvidenceBar` should show signal chips (fired/suppressed/overridden). The category nav should reorder.
2. "Clear" persona: page returns to default hero layout. EvidenceBar disappears.
3. CartDrawer: Add a product via any `ProductCard`. Drawer opens automatically, shows item, qty `−/+` controls work, Remove works. Cart badge in header stays in sync.
4. All catalog-backed `/product/[id]` pages load without error.

---

## Milestone 2 — GenUI Layout Generation

### What was built

- **`app/api/gen-page/route.ts`** — streaming route handler. Uses `@ai-sdk/openai` + AI SDK v6 `streamText` with 5 rendering tools:
  - `renderHero(headline, sub, mode)`
  - `renderProducts(title, productIds)`
  - `renderGuide(title, steps)`
  - `renderGiftCollection(title, note, productIds)`
  - `renderComparison(title, productIds)`
- **Grounding** — all model-returned product IDs are filtered through `byId()`. Invented IDs are dropped silently. If a block ends up empty, it is dropped.
- **Streaming block validation** — each tool call is parsed through Zod and grounded before the client renders it. Incomplete pages fall back to deterministic presets.
- **No API key path** — streams the matching preset with `fromAI: false`. Page still works.
- **Section components** (`components/sections/`) — `HeroBanner`, `GuideSection`, `ProductGridSection`, `ComparisonSection`, `PageSkeleton` (shown while waiting for the first streamed block).
- **EvidenceBar AI badge** — shows "AI" chip when `fromAI` is true.

### What to verify

5. Select **Mid-Repair Homeowner** persona. Home page should show: repair-mode hero ("Let's get this fixed."), a guide section, a product grid of repair/plumbing items, a comparison section — all grounded to real catalog products. EvidenceBar shows AI badge.
6. Select **Appliance Buyer** persona. Home page should show: appliance-mode hero, dishwasher comparison, appliance/accessory product grid, and buying checklist.
7. Select **Gift Shopper** persona. Page should show: warm gift hero, gift collection block, comparison of gift-appropriate products.
8. Select **Nudged Browser** persona. Outdoor hero, seasonal product grid.
9. Remove `OPENAI_API_KEY` (or test without one). Page should still render using preset — no broken layout, no error. `fromAI` is false.
10. The page never shows an invented product — every name, price, and stock state in every block must match `lib/catalog.ts`.

---

## Milestone 3 — Product Detail + Cart

### What was built

#### 1. Persona-aware related products (`app/product/[id]/`)

- **`page.tsx`** — Server component passes the full catalog minus the current product (up to 39 items), sorted by tag-overlap count descending, to `RelatedProducts`. This ensures a persona whose signals don't overlap the current product's tags (e.g. Mid-Repair on a grill page) can still surface relevant items from anywhere in the catalog.
- **`RelatedProducts.tsx`** — Client component (`'use client'`). Reads `PersonaContext`. When a persona is active, scores each candidate by `(persona signal tags ∩ product tags) × 2 + (product-own tag overlap)`, sorts descending, shows top 4. When no persona is active, shows top 4 from the server-sorted pool (ranked by tag-overlap count, highest first). Section label changes to "Based on your [persona name] signals" with a `PERSONA-RANKED` badge.
- The ranking is client-side only — all catalog product pages remain SSG with no runtime server cost.

#### 2. Quantity selector (`app/product/[id]/AddToCartButton.tsx`)

- `−  qty  +` stepper followed by the Add to Cart button.
- Local `qty` state (default 1), resets to 1 after each add.
- `addItem(product, qty)` passes the selected qty to cart.
- All controls disabled + `opacity-40` when `!product.inStock`.

#### 3. `addItem` qty support (`lib/cart.tsx`)

- `addItem(product: Product, qty = 1)` — optional second parameter, backward compatible. All existing callers (`ProductCard`, `ComparisonSection`, etc.) unaffected.

#### 4. Dedicated cart page (`app/cart/page.tsx`)

- Route `/cart` — client component, reads `CartContext`.
- **Items list**: product image placeholder, name (links to product page), brand, per-unit price, line total, qty `−/+` controls, Remove button.
- **Order summary** (sticky on desktop): subtotal, free shipping (brand orange), 8% estimated tax, bolded order total, Place Order button, demo disclaimer, free-returns and in-store-pickup trust lines.
- **Empty state**: centered icon, headline, Shop Now link.
- Clear all button empties the cart.
- `CartDrawer` Checkout button now links to `/cart` and closes the drawer.

### What to verify

#### Persona-ranked related products

11. Select **Mid-Repair Homeowner** persona. Navigate to a plumbing product (e.g. `/product/sku_faucet_kit`). Section heading should read "Based on your mid-repair homeowner signals" with a `PERSONA-RANKED` badge. Plumbing/repair items should rank ahead of outdoor or gift items.
12. **Cross-category (P2):** With Mid-Repair persona active, navigate to a non-repair product (e.g. a grill or gift item). The persona-ranked section should still surface repair/plumbing products from the catalog, even if they share no tags with the current product.
13. Select **Appliance Buyer** persona. Navigate to `/product/sku_dishwasher_quiet_stainless`. Appliance/dishwasher/install items should surface near the top of related products.
14. Select **Gift Shopper** persona. Navigate to a tool product. Gift/dad-tagged items should surface near the top of related products.
15. Clear persona. Heading reverts to "Frequently Bought Together", no badge. Order reverts to tag-overlap strength (highest count first).

#### Qty selector

16. On any in-stock product page, increment qty to 3, click Add to Cart. CartDrawer should show quantity 3, correct line total ($price × 3). Qty selector resets to 1 after add.
17. On an out-of-stock product (e.g. `/product/sku_apron`), all controls (−, qty display, +, Add to Cart) should be disabled / opacity-40.

#### Cart page

18. Add 2–3 items. Open `/cart`. Item list correct, qty `−/+` update line totals and subtotal live, Remove removes items, Clear all empties the cart.
19. Subtotal × 1.08 = Order Total (free shipping, 8% tax). Verify arithmetic.
20. Cart badge in header stays in sync while on `/cart`.
21. Empty cart: visit `/cart` with no items — empty-state card renders, not a broken layout.
22. CartDrawer Checkout button navigates to `/cart` and closes the drawer.

---

## What is NOT built yet (M5 scope — do not review)

- Live intent tracking (session-level signal capture, cluster scoring, threshold-based auto-switch).
- Background pre-rendering at score ≥ 0.3 / instant swap at ≥ 0.4.
- `IntentBanner`, `IntentTrail`, `ProductPageSignal` components.
- `project` cluster + matching PRESET.
- No real checkout, auth, or payment integration (non-goal per AGENT.md).

---

## Build output (current)

```
Route (app)                              Size     First Load JS
┌ ○ /                                    12.2 kB         106 kB
├ ○ /_not-found                          875 B            88 kB
├ ƒ /api/gen-page                        0 B                0 B
├ ƒ /api/mcp                             0 B                0 B
├ ○ /cart                                2.53 kB        96.4 kB
└ ● /product/[id]                        2.83 kB        96.7 kB
    ├ /product/sku_faucet_kit
    ├ /product/sku_basin_wrench
    ├ /product/sku_plumbers_tape
    └ [+37 more paths]
```

Zero errors, zero warnings. `/cart` is static (○). All catalog product pages remain SSG (●).
