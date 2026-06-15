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
4. **The intent is legible.** Signal evidence and the active intent cluster are
   always visible to the user. This is the product's differentiator vs. a black-box
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
| `lib/fallback.ts` | safety net + scenarios | 6 hand-verified PRESETS (repair, gift, outdoor, default, starter, budget). Used as no-key fallback and demo content. |

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
| `app/globals.css` | Tailwind base/components/utilities. Body: bg-concrete text-ink. Stagger animation. |
| `lib/cart.tsx` | CartContext: items, addItem(product, qty?), removeItem, updateQty, clearCart, total, count, open/setOpen. |
| `lib/persona-context.tsx` | PersonaContext: persona, evidence, setActive(p, e), clear(). Single source of truth for active persona. |
| `components/Header.tsx` | Sticky bg-ink header. Logo, search, "Sign in as" persona dropdown, cart badge. Placeholder adapts to persona. |
| `components/CategoryNav.tsx` | White border-b nav, 10 categories. Reorders by tag-intersection score when persona active. |
| `components/CartDrawer.tsx` | Fixed right panel, item list, +/- qty, subtotal, Checkout (links to /cart). |
| `components/ProductCard.tsx` | Product tile: category abbr placeholder, name/brand/price, orange Add to Cart, links to /product/[id]. |
| `app/layout.tsx` | Server component. PersonaProvider > CartProvider > Header > CategoryNav > main > CartDrawer. Google Fonts. |
| `app/page.tsx` | Client. Watches persona context → calls `generatePage()` → renders EvidenceBar + PersonaContent. Default: hero + best-sellers. |
| `app/product/[id]/page.tsx` | Server component. generateStaticParams() → 32 pre-rendered routes. Passes full catalog minus current product (sorted by tag-overlap strength) to RelatedProducts. |
| `app/product/[id]/AddToCartButton.tsx` | Client. −/qty/+ selector + addItem(product, qty). Resets qty to 1 after add. |
| `app/product/[id]/RelatedProducts.tsx` | Client. Reads PersonaContext, scores candidate pool by persona signal tags, shows top 4. Falls back to tag-overlap order when no persona. |

### Added in Milestone 2 (GenUI Layout Generation)

| File | Responsibility |
|---|---|
| `app/actions.tsx` | Server action `generatePage(input, fallbackPreset)`. Uses AI SDK `generateText` + 5 rendering tools. Grounds product IDs, normalizes block order by mode, falls back to preset on invalid output or missing API key. Returns `{ blocks, mode, fromAI }`. |
| `components/sections/HeroBanner.tsx` | Hero section supporting modes: repair, gift, outdoor, default. |
| `components/sections/GuideSection.tsx` | Numbered how-to guide section. |
| `components/sections/ProductGridSection.tsx` | Grounded product grid. |
| `components/sections/ComparisonSection.tsx` | Comparison cards with inline Add to Cart. |
| `components/sections/PageSkeleton.tsx` | Loading skeleton shown while `generatePage()` is pending. |

### Added in Milestone 3 (Product detail + Cart)

| File | Responsibility |
|---|---|
| `app/cart/page.tsx` | Client. Full cart page: item list, live qty controls, order summary sidebar (subtotal + 8% tax + free shipping + total), Place Order, empty state. |

---

## 4. Milestone state

### M1 — COMPLETE (Foundation Shell)
Shell, Tailwind design system, CartContext, PersonaContext, Header, CategoryNav, CartDrawer, ProductCard, 32 SSG product pages.

### M2 — COMPLETE (GenUI Layout Generation)
`generatePage()` server action with 5 AI rendering tools. Grounding, normalization, fallback. EvidenceBar with AI badge.

### M3 — COMPLETE (Product Detail + Cart)
Persona-ranked related products (client-side, SSG preserved). Qty selector on product page. `/cart` route with order summary. CartDrawer Checkout links to `/cart`.

### M4 — COMPLETE (Final docs, M1–M3)
AGENT.md file map updated to reflect all M1–M3 changes. review.md expanded to cover the complete M1–M3 arc. External references cleaned up.

### M5 — NEXT (Live intent tracking + parallel pre-rendering)
Full spec in §6 below.

---

## 5. Persona + signal system (static fixtures, M1–M3)

The personas in `lib/personas.ts` are **static fixtures** used for the "Sign in as" demo
dropdown. They are NOT replaced by M5 — M5 adds a parallel live-tracking layer on top.
Both systems coexist: picking a persona from the dropdown sets an explicit intent; live
browsing updates intent scores independently. If both are active, the live scores take
precedence for page generation (see §6.7).

### Signal weighting

```
TYPE_BASE: search=1.0, cart_abandon=0.85, purchase=0.75, email_click=0.5, ad_click=0.3
effectiveWeight = TYPE_BASE[type] × recency × confidence
```

Conflict detection: if `searchWeight > durableWeight × 2`, fresh search wins; durable outcome → "overridden".

Confidence thresholds: totalPositiveWeight > 1.5 → "high", > 0.6 → "medium", > 0 → "low", else "none".

### Persona → preset fallback mapping (used when no API key)

```typescript
const PERSONA_PRESET: Record<string, keyof typeof PRESETS> = {
  mid_repair:     'repair',
  gift_conflict:  'gift',
  nudged_browser: 'outdoor',
  blank_slate:    'default',
};
```

---

## 6. Milestone 5 — Live Intent Tracking + Parallel Pre-rendering

### 6.1 What this milestone proves

Most adaptive systems are **session-start personalization**: they look at history, assign
a persona, and serve that for the whole session.

M5 is **in-session intent drift with parallel pre-rendering**. The system watches where
the user is going *within the current session* — not where they've been historically —
and silently pre-builds landing pages for multiple destinations simultaneously. When the
user's behavior crosses a confidence threshold, the pre-built page snaps in instantly
with no skeleton and no wait.

The technically hard thing the demo proves: **the page was already built before the user
switched.** That's the money shot. Everything else is setup for that moment.

---

### 6.2 Intent clusters (replaces and extends the 4-persona vocabulary)

Five clusters with intentionally distinct visual identities. If two clusters produce
visually similar pages, the demo loses its point.

| Cluster key | Signal keywords / tags | Page feel |
|---|---|---|
| `repair` | faucet, leak, wrench, cartridge, drain, clog, fix, plumbing | Utilitarian. Dark hero: "Let's fix it." Guide first, then exact parts. |
| `gift` | gift, Father's Day, birthday, present, ideas, dad, popular | Warm orange-gradient hero: "A gift he'll reach for." Gift collection, then comparison. |
| `outdoor` | patio, garden, grill, summer, porch, mulch, deck, lawn, seasonal | Natural. Hero: "Build the backyard." Seasonal product grid. |
| `project` | drill, build, cut, install, workshop, plywood, saw, lumber, power-tool | Bold. Hero: "What are you building?" Power tools and accessories first. |
| `starter` | first home, moved, beginner, basics, apartment, essentials, new homeowner | Friendly. Hero: "Start with what you'll actually use." Essential 5. |

**Note on `project`:** This is a new cluster not in M1–M3. It requires a new PRESET in
`lib/fallback.ts` and a new mode value (`"project"`) in `app/actions.tsx` before M5a.

---

### 6.3 Threshold model

```
0.0 ──────── 0.3 ──────── 0.4 ─────────── 1.0
             |            |
             generate     switch
             (background) (UI + banner)
```

**At score ≥ 0.3:** Fire `generatePage()` for that cluster in the background. User sees
nothing. Store result in `IntentContextCache[cluster]`.

**At score ≥ 0.4 AND leading the current rendered cluster by ≥ 0.1:** Swap the page.
Show the intent banner. If the cache already has the page → instant (no skeleton).
If generation is still in flight → show skeleton until it resolves.

**Hysteresis guard (critical):** Do NOT switch if the leading margin is < 0.1.
`repair=0.55, gift=0.41` → no switch. This prevents oscillation when two clusters score
close together. Without this the demo looks like a bug.

**Intent lock after switch:** Once the UI has committed to a cluster and the user
continues interacting with that page, raise the competing cluster's switch threshold to
0.6 (instead of 0.4) for 60 seconds. This prevents the system from switching back just
because the user clicked one product from a different category while on the switched page.

---

### 6.4 Signal decay model

Use three recency buckets (not continuous decay — simpler and good enough for the demo):

```typescript
function liveRecency(capturedAt: number): number {
  const age = Date.now() - capturedAt; // ms
  if (age < 30_000)  return 1.0;   // < 30s: full weight
  if (age < 90_000)  return 0.6;   // 30–90s: partial
  if (age < 180_000) return 0.2;   // 90–180s: stale
  return 0;                          // > 3 min: drop from queue
}
```

The signal queue is a rolling window of the last 20 signals. Drop signals with
`liveRecency() === 0` on each scoring pass.

---

### 6.5 Signal sources to capture (what and where)

Only capture signals with a clear, single-sentence meaning. Do not capture dwell time,
hover, scroll depth, or cart additions (too noisy or too late in the funnel).

| Signal | Source | Capture point | Weight type |
|---|---|---|---|
| Search submit | Header `<input>` | `onKeyDown Enter` or search button click | `search` (highest) |
| Search input (debounced) | Header `<input>` | `onChange` debounced 800ms | `search` at 0.7× |
| Category nav click | `CategoryNav` | `onClick` on any category button | `browse` |
| Product page view | `app/product/[id]/page.tsx` | Client component mount (pass product.tags from server) | `browse` |

**Keyword → cluster tag mapping** lives in a new file `lib/intent-clusters.ts`. It is a
plain lookup table — not ML. See §6.9 for the implementation spec.

---

### 6.6 New files and responsibilities

| File | Responsibility |
|---|---|
| `lib/intent-clusters.ts` | Cluster vocabulary: keyword→tags→cluster mapping, `scoreSignalsAgainstClusters()`, `topCluster()`. |
| `lib/session-intent.tsx` | `SessionIntentProvider` + `useSessionIntent()`. Holds signal queue, cluster scores, `IntentContextCache`, active cluster. Persists to `sessionStorage` on every state change; rehydrates on mount. |
| `components/IntentBanner.tsx` | Top-of-page banner that appears on cluster switch. "Optimized for [cluster label]" + dismiss button. Fades out after 6s or on dismiss. |
| `components/IntentTrail.tsx` | Compact breadcrumb showing the last 3 visited clusters. Clicking a past cluster restores it from cache (instant if cached). Lives in EvidenceBar zone. |
| `components/ProductPageSignal.tsx` | Thin client component rendered inside `app/product/[id]/page.tsx`. Receives product.tags as a prop, fires a browse signal on mount. Renders nothing visible. |

Modified files:

| File | Change |
|---|---|
| `components/Header.tsx` | Emit search signal to `SessionIntentStore` on input (debounced) and submit. |
| `components/CategoryNav.tsx` | Emit browse signal to `SessionIntentStore` on category click. |
| `app/page.tsx` | Watch `SessionIntentStore.activeCluster` instead of (or in addition to) `PersonaContext`. Call `generatePage()` on cluster switch; if cache hit, skip generation. |
| `app/layout.tsx` | Wrap with `SessionIntentProvider` (inside existing providers). |
| `lib/fallback.ts` | Add `project` preset spec. |
| `app/actions.tsx` | Add `"project"` to `heroModeSchema` enum and `BLOCK_ORDER`. |

---

### 6.7 Coexistence with the static persona dropdown

The "Sign in as" dropdown remains for the demo cold-start and for review agents to test
specific intents deterministically. When a user picks a persona from the dropdown:

1. `PersonaContext.setActive()` fires as before.
2. Also inject that persona's signals into `SessionIntentStore` as live signals with
   `capturedAt: Date.now()` and `liveRecency() = 1.0`.
3. The cluster scorer immediately fires and should produce scores consistent with the
   persona's intent (repair persona → repair cluster dominant).
4. Live browsing signals then accumulate on top — the persona is the starting state,
   not a lock.

If the live cluster diverges from the persona-set cluster (user selected "repair" persona
but then searched "Father's Day gift" three times), the live cluster wins when it crosses
0.4 + 0.1 margin.

---

### 6.8 IntentContextCache and sessionStorage persistence

```typescript
type IntentContextCache = Partial<Record<ClusterKey, GeneratedPage>>;

type SessionIntentState = {
  signalQueue: LiveSignal[];         // rolling 20-signal window
  clusterScores: Record<ClusterKey, number>;  // 0.0–1.0
  cache: IntentContextCache;         // pre-rendered page per cluster
  activeCluster: ClusterKey | null;  // what's currently rendered
  lockedUntil: number;               // timestamp — raised switch threshold until this
};
```

On every state change, write to `sessionStorage` under key `"buildright_intent_v1"`.
On provider mount, read from `sessionStorage` and rehydrate (handles back/forward nav
and product page → home page round-trips, since those are client-side navigations via
`<Link>` and React state is preserved, but `sessionStorage` is the safety net for cases
where state is lost).

Cache entries never expire within a session (stale cache is acceptable — content doesn't
change mid-session). Do not re-generate if a cluster already has a cached page, even if
its score has risen significantly since generation.

---

### 6.9 `lib/intent-clusters.ts` implementation spec

```typescript
export type ClusterKey = 'repair' | 'gift' | 'outdoor' | 'project' | 'starter';

export type ClusterDef = {
  key: ClusterKey;
  label: string;          // shown in banner: "Optimized for home repair"
  description: string;    // shown in IntentTrail tooltip
  keywords: string[];     // matched against lowercased search input
  tags: string[];         // matched against product/category tags
  fallbackPreset: string; // key into PRESETS for no-API-key path
};

export const CLUSTERS: ClusterDef[] = [
  {
    key: 'repair',
    label: 'home repair',
    description: 'Active repair in progress',
    keywords: ['faucet','leak','wrench','cartridge','drain','clog','fix','plumbing',
               'pipe','seal','tape','washer','o-ring','basin','silicone'],
    tags: ['repair','plumbing','leak','beginner'],
    fallbackPreset: 'repair',
  },
  {
    key: 'gift',
    label: 'gift buying',
    description: 'Shopping for someone else',
    keywords: ["gift","father's day","birthday","present","ideas","for him","for her",
               "for dad","for mom","surprise","holiday","christmas","housewarming"],
    tags: ['gift','dad','popular','premium'],
    fallbackPreset: 'gift',
  },
  {
    key: 'outdoor',
    label: 'outdoor & garden',
    description: 'Patio, garden, and seasonal projects',
    keywords: ['patio','garden','grill','outdoor','porch','mulch','deck','lawn','soil',
               'plants','seasonal','backyard','bistro','string lights','hose'],
    tags: ['outdoor','patio','seasonal','garden'],
    fallbackPreset: 'outdoor',
  },
  {
    key: 'project',
    label: 'building a project',
    description: 'DIY build or installation underway',
    keywords: ['drill','build','cut','install','workshop','plywood','saw','lumber',
               'circular saw','screw','nail','stud','framing','build out'],
    tags: ['power-tool','project','accessory'],
    fallbackPreset: 'starter', // until a 'project' preset is added
  },
  {
    key: 'starter',
    label: 'first home setup',
    description: 'Equipping a new home from scratch',
    keywords: ['first home','moved','beginner','basics','apartment','essentials',
               'just bought','new homeowner','starter','what do i need'],
    tags: ['popular','best-seller','home','beginner'],
    fallbackPreset: 'starter',
  },
];

// Score a text input against each cluster's keyword list.
// Returns 0.0–1.0 per cluster. Pure function, runs client-side, no API call.
export function scoreTextAgainstClusters(text: string): Record<ClusterKey, number> { ... }

// Score a product tag set against each cluster's tag list.
export function scoreTagsAgainstClusters(tags: string[]): Record<ClusterKey, number> { ... }

// Merge scores: new scores are added to existing, then normalized to 0.0–1.0.
export function mergeScores(
  existing: Record<ClusterKey, number>,
  incoming: Record<ClusterKey, number>,
  weight: number   // signal weight (1.0 for search, 0.7 for browse)
): Record<ClusterKey, number> { ... }

// Return the cluster with the highest score, or null if all scores < 0.1.
export function topCluster(scores: Record<ClusterKey, number>): ClusterKey | null { ... }
```

---

### 6.10 Banner and trail UX spec

**IntentBanner** — appears at the top of the page content area (below CategoryNav,
above the hero section) on every cluster switch:

```
┌─────────────────────────────────────────────────────────────┐
│  Optimized for gift buying · based on your recent browsing  │  [×]
└─────────────────────────────────────────────────────────────┘
```

- `bg-ink text-white` strip, `font-mono text-xs`.
- Brand-orange dot on the left (same style as EvidenceBar active indicator).
- Dismissed by [×] click or auto-fades after 6 seconds.
- Re-appears on each new switch (even if previously dismissed).
- Does NOT appear when the user explicitly picks a persona from the dropdown (that's
  already obvious — the header shows the persona name).
- Instant-cache switches: add "(instant)" or a filled dot to distinguish from skeleton
  switches. This communicates the pre-rendering story visually.

**IntentTrail** — replaces or lives beside the EvidenceBar signal chips:

```
repair  →  gift  →  outdoor  [now]
```

- Last 3 distinct clusters (deduplicated; don't show the same cluster twice in a row).
- Clicking a past cluster restores from cache if available, or re-generates.
- "now" label on the active cluster.
- Keep it compact — max 3 items before truncating with "…".

---

### 6.11 The demo script

The recording proves one technically hard thing per scene:

| Time | Action | What it proves |
|---|---|---|
| 0:00 | Open site, default home | Cold-start default works |
| 0:10 | Type "faucet repair" in search | Signal captured (repair 0.3 → background generation fires, invisible) |
| 0:20 | Click Plumbing in category nav | Repair crosses 0.4 → page switches with banner "Optimized for home repair" |
| 0:35 | Type "Father's Day gift ideas" | Gift at 0.3 → generation fires in background |
| 0:45 | Click on a drill product | Gift crosses 0.4 → **INSTANT** switch, no skeleton. Banner: "Optimized for gift buying" + "(instant)" |
| 0:55 | Click "repair" in the trail | **INSTANT** switch back. Repair page was still cached. |
| 1:05 | Title card | "Intent inferred in JS. Layout generated by Claude. Pages pre-built before you switch." |

The money shot is 0:45 — instant switch with no loading. Everything before is setup.
The 0:55 instant switch-back is the exclamation point: *both* contexts were alive.

**Known demo constraint:** The instant switch only works if the pre-render at 0.3
completed before 0.4 fires. At normal human search speed (one search every ~10 seconds)
this is comfortable — generation takes 1-2 seconds. At demo-clicking speed it won't be
instant. Script the recording at a natural pace.

---

### 6.12 What NOT to build for M5

- **Dwell time signals** — too noisy, creates false positives on back-button.
- **Cart add signals** — too late in funnel; the product views that led to cart already
  captured the intent.
- **Server-side session tracking** — unnecessary for a demo, adds infra.
- **ML-based classification** — keyword lookup is faster, cheaper, and accurate enough
  for 5 clusters with unambiguous signals. The LLM handles layout generation, not
  classification.
- **Confidence meter UI** — probability bars on-screen look like a science project.
  The EvidenceBar already shows the *evidence*; the banner shows the *conclusion*.
- **Cross-session persistence** (localStorage) — implies account/identity, out of scope.
- **A/B testing harness** — non-goal.
- **Re-generation on score increase past 0.3** — once a cluster has a cached page, don't
  regenerate it even if the score rises. Stale cache is acceptable within a session.

---

### 6.13 What is intentionally fake / demo-ware

- The keyword→cluster mapping is a lookup table, not ML. In production you'd use a
  lightweight embedding classifier or a fine-tuned tagger.
- The decay model uses three buckets, not a real exponential curve.
- At production scale, background generation at 0.3 per user is expensive. Production
  would use a shared cluster cache (re-generate only on catalog change) rather than
  per-session generation.
- The `sessionStorage` cache has no invalidation. In production: TTL per entry, cache
  bust on catalog update.
- These are not hidden — they're the "what productionizing adds" story. Name them, don't
  smuggle them.

---

### 6.14 Build order (M5a → M5b → M5c)

Build, verify, and commit each layer independently. Each is testable in isolation.

**M5a — Live signal capture + scoring (no page switching)**

1. Add `project` preset to `lib/fallback.ts`. Add `"project"` mode to `app/actions.tsx`.
2. Create `lib/intent-clusters.ts` with cluster defs, scoring functions.
3. Create `lib/session-intent.tsx` with `SessionIntentProvider`, `useSessionIntent()`,
   and `sessionStorage` persistence. Does not yet trigger any page generation.
4. Wire signal capture in `Header.tsx` (search) and `CategoryNav.tsx` (category click).
5. Create `components/ProductPageSignal.tsx` and render it in `app/product/[id]/page.tsx`.
6. Add `SessionIntentProvider` to `app/layout.tsx`.
7. Verify via browser devtools: open console, browse, confirm cluster scores update.
   No visible UI change yet. Build must pass.

**M5b — Background generation + IntentContextCache**

1. Extend `SessionIntentProvider` to watch for scores crossing 0.3 and fire
   `generatePage()` for that cluster. Store result in `cache[cluster]`.
2. Avoid double-firing: if `cache[cluster]` already exists, skip generation.
3. Avoid firing on cold start (all scores < 0.1): wait for first meaningful signal.
4. Verify: trigger a search that scores a cluster to 0.3, confirm a network request
   to the AI fires, confirm the cache populates. No visible UI change yet. Build passes.

**M5c — Auto-switch + banner + intent trail**

1. Watch `clusterScores` in `app/page.tsx`. When top cluster ≥ 0.4 AND lead ≥ 0.1
   AND ≠ current rendered cluster: swap the page from cache (or skeleton if miss).
   Apply the intent lock (raise switch threshold for 60s after a switch).
2. Build and render `components/IntentBanner.tsx` on each switch.
3. Build and render `components/IntentTrail.tsx` in the EvidenceBar zone.
4. Wire the trail click-to-restore: set `activeCluster` to the clicked cluster and
   render from cache (or re-generate if cache miss).
5. Run the demo script from §6.11 end-to-end. Confirm instant switch at the gift
   scene. Build must pass. Commit and stop.

---

## 7. Conventions you must respect

- **Tags are the signal interface.** Product `tags` are how signals join to inventory.
  When adding products, tag them so signals can find them. When adding clusters, map
  keywords to existing tags where possible before inventing new ones.
- **Consumable vs. durable matters.** Consumables (soil, bulbs, saw blades) complement
  purchases and recur. Durables (grill, thermostat, ladder) suppress their category
  after purchase. The signal-weighting logic depends on `consumable` field.
- **No emoji in code or UI.** System rule — enforced globally.
- **No Claude co-author in git commits.** User preference — commits are under user's
  name only.
- **Adding a block type** = schema + renderer switch + prompt rules, all three.
- **Copy style:** plain, active voice, end-user framing. Name things by what the user
  does, not how the system works.
- **No comments that explain WHAT code does.** Only add a comment when the WHY is
  non-obvious.

---

## 8. Run / build / deploy

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # type-checks + builds; must pass before committing
```

- **No API key** → serves grounded cached PRESET specs. Good for a free public deploy.
- **With key** → set `ANTHROPIC_API_KEY` in `.env.local` (dev) or Vercel env (prod).

Deploy: push to GitHub → import on Vercel → (optional) add env var → deploy.

Stack: Next.js 14 App Router · TypeScript · Tailwind CSS v3 · Zod · no DB.
Model: `claude-sonnet-4-6` via `@ai-sdk/anthropic` + AI SDK v6.

---

## 9. Gotchas

- The Google Fonts `<link>` in `app/layout.tsx` triggers a harmless CSS-minify warning
  in sandboxed/offline builds. Do not "fix" it by removing the fonts.
- Playwright is installed globally via homebrew at `/opt/homebrew/lib/node_modules/playwright`.
  If scripting browser tests, `require()` from that path.
- AI SDK v6 (`ai@6`) does not export `ai/rsc` or `createStreamableUI`. The streaming
  approach uses a custom NDJSON route (`app/api/gen-page/route.ts`) if needed, or the
  `generateText` server action approach in `app/actions.tsx`.

---

## 10. Explicit non-goals (don't build without being asked)

Per-user real-time render on every pageview (cache by intent cluster — M5 implements
this at session scope), real signal integrations (CDP/event stream/ad pixel), A/B eval
infra, real auth, real inventory APIs, cross-session memory (implies account), ML-based
intent classification (rule-based is correct choice for this demo). These are the "what
productionizing adds" story — name them, don't smuggle them in.
