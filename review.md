# Milestone 3 Review — Persona-aware product detail, cart page, qty selector

**Overall objective:** Full e-commerce storefront (BuildRight) where shopper persona reconfigures the entire site using GenUI streaming and A2UI/MCP. 32-item catalog is fixed; layout, content, navigation order, and related-product ranking adapt per-persona.

---

## What was built in M3

### 1. Persona-aware related products (`app/product/[id]/`)

- **`page.tsx`** — Server component now passes an expanded candidate pool (up to 8 tag-matched products, previously sliced to 4) to the new `RelatedProducts` client component. The server does no ranking.
- **`RelatedProducts.tsx`** — Client component (`'use client'`). Reads `PersonaContext`. When a persona is active, scores each candidate by `(persona signal tags ∩ product tags) × 2 + (product-own tag overlap)`, sorts descending, shows top 4. When no persona is active, preserves the original tag-overlap order. Section label changes from "Frequently Bought Together" to "Based on your [persona name] signals" and shows a `PERSONA-RANKED` badge.
- The ranking is client-side only (hydrates on top of the SSG page) — the 32 product pages remain statically generated with no runtime server cost.

### 2. Quantity selector on product page (`app/product/[id]/AddToCartButton.tsx`)

- Replaced single-button layout with a `−  qty  +` selector followed by the Add to Cart button.
- Local `qty` state (default 1), resets to 1 after each add.
- `addItem(product, qty)` passes the selected qty to cart.
- Disabled state (out-of-stock) disables both the qty controls and the button.

### 3. `addItem` qty support (`lib/cart.tsx`)

- `addItem(product: Product, qty = 1)` — optional second parameter, defaults to 1 (backward compatible with all existing callers).
- Existing callers in `ProductCard`, `ComparisonSection`, etc. are unaffected.

### 4. Dedicated cart page (`app/cart/page.tsx`)

- Route `/cart` — client component, reads `CartContext`.
- **Items list** (left / full-width on mobile): product image placeholder, name (links to product page), brand, per-unit price, line total, qty `−/+` controls, Remove button.
- **Order summary** (right sidebar, sticky on desktop): subtotal, free shipping (highlighted in brand orange), 8% estimated tax, bolded order total, Place Order button, "Demo store — no real order will be placed" disclaimer, free-returns and in-store-pickup trust lines.
- **Empty state**: centered icon, headline, prompt to shop, Shop Now link to home.
- Clear all button removes all items.
- CartDrawer **Checkout** button now links to `/cart` (previously a non-functional button) and closes the drawer on click.

---

## What to review

### Persona-ranked related products
1. Select **Mid-Repair Homeowner** persona. Navigate to any plumbing product (e.g. `/product/sku_faucet_kit`). The section heading should read "Based on your mid-repair homeowner signals" with a `PERSONA-RANKED` badge. Related products should be plumbing/repair items (PTFE tape, basin wrench, silicone sealant, supply lines) ranked ahead of, say, outdoor or gift items.
2. Select **Gift Shopper** persona. Navigate to a tool product. Related products should surface gift/dad-tagged items near the top.
3. Clear persona. The heading should revert to "Frequently Bought Together" with no badge. Order returns to plain tag-overlap.

### Qty selector
4. On any in-stock product page, increment qty to 3, click Add to Cart. CartDrawer should show quantity 3 for that item and the correct line total ($price × 3). Qty selector resets to 1 after add.
5. On an out-of-stock product (e.g. `/product/sku_apron`), all three controls (−, qty display, +, Add to Cart) should be disabled / opacity-40.

### Cart page
6. Add 2–3 items from different product pages. Open `/cart`. Verify: item list correct, qty controls (+/−) update line totals and subtotal live, Remove removes items, Clear all empties the cart.
7. Subtotal × 1.08 = Order Total (free shipping). Verify arithmetic.
8. Cart badge count in header stays in sync while on `/cart`.
9. Empty cart state: visit `/cart` with no items — should show empty-state card, not a broken layout.
10. CartDrawer "Checkout" button navigates to `/cart` and closes the drawer.

---

## What is NOT built yet (skip in review — M4 scope)

- Final `AGENT.md` update for the complete M1–M3 architecture.
- Final `review.md` covering the full project.
- `/product/[id]` Add to Cart does not yet add persona-selected qty from the drawer (product page qty resets correctly; this is intentional).
- No real checkout, auth, or payment integration (non-goal per AGENT.md).

---

## Build output

```
Route (app)                              Size     First Load JS
┌ ○ /                                    8.77 kB         103 kB
├ ○ /_not-found                          875 B            88 kB
├ ƒ /api/render                          0 B                0 B
├ ○ /cart                                2.32 kB        96.2 kB
└ ● /product/[id]                        1.81 kB        95.7 kB
    └ [32 paths]
```

Zero errors, zero warnings. `/cart` is static (○). All 32 product pages remain SSG (●).
