# AGENT.md — Continuation Brief

You are picking up an in-progress demo. Read this fully before changing code. It
captures the concept, the architecture, the decisions already made (and *why*),
and the next planned feature. The "why" matters more than the "what" here — several
choices look arbitrary until you know the reasoning.

---

## 1. What this is

An **adaptive storefront**: one product catalog, but the page assembles itself
differently per shopper based on inferred intent. It is a demo of **intent-driven,
server-driven UI** for commerce — the project's thesis is that this is a *control*
problem, not a *generation* problem.

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
4. **The intent is legible.** The inferred intent is shown to the user in the Intent
   Readout panel — this is the product's differentiator vs. a black-box recommender.
   Keep it honest and visible. Do not hide inference.

If you find yourself wanting to relax #1 or #2 to make something easier, stop —
those constraints *are* the product.

---

## 3. Architecture & file map

| File | Layer | Responsibility |
|---|---|---|
| `lib/catalog.ts` | source of truth | The 32 products. The ONLY place products/prices/stock exist. `tags` are the join key to signals (see §6). |
| `lib/schema.ts` | contract + grounding | Zod `PageSpecSchema`; the `ground()` step that drops invented ids and empty blocks. |
| `lib/prompt.ts` | decisioning | System prompt that turns shopper input → block selection. Encodes the repair-vs-gift layout rules. |
| `lib/fallback.ts` | safety net + scenarios | Hand-verified cached `PRESETS` (4 scenarios). Used as graceful fallback AND as the labeled demo buttons. |
| `app/api/render/route.ts` | orchestration | Server-side model call (key stays server-side). Accepts `{input, presetKey}`. Falls back to the exact preset spec on any failure. |
| `components/Renderer.tsx` | render seam | The `switch` over block types → real React. Deterministic. Binds ids → catalog. |
| `components/IntentReadout.tsx` | the signature | Renders inferred intent as a gauge-style readout. |
| `app/page.tsx` | client | Scenario buttons + free-text input. **All paths are live** (model generates fresh each load). Deep-link `?case=KEY` pre-loads a scenario. |
| `app/globals.css` | styling | Industrial workshop design system. Tokens at `:root`. |

Stack: Next.js 14 App Router · TypeScript · Zod · no DB · deploys to Vercel.
Model call: Anthropic `claude-sonnet-4-6` via raw fetch (no SDK dependency).

---

## 4. Current state (what's done vs. mocked vs. next)

**Done & working:**
- Full render pipeline: input → intent+layout decision → grounded spec → React.
- 4 scenarios (repair, gift-for-dad, starter toolkit, budget gift) as buttons.
- 32-item catalog across plumbing, tools, power tools, outdoor/garden, lighting,
  smart home, paint, workwear (see §6 for the cluster logic).
- Live generation with graceful fallback to cached specs (works with no API key).
- Deep-linkable scenarios.

**Mocked (be honest about this in any demo/post):**
- No real signals. "Intent" currently comes from a typed/clicked input string.

**Next planned feature (NOT yet built) — signal-driven personas:**
This is the active design direction. See §5.

---

## 5. NEXT FEATURE: signal-driven, zero-input personalization

**Goal:** the site is dynamic *on landing* — the user types nothing. Assuming a
logged-in `userID`, the system assembles an intent from signals it already holds and
renders immediately. This is the realistic model and a stronger demo than "type your
intent."

**Demo mechanism:** 4 user cards at the top. Clicking one *assumes that persona's
signal bundle* and re-renders as if they just landed logged in. Same 32-item catalog
under all four.

**Signal taxonomy** (each signal has *recency* and *confidence*; they are NOT a
priority list — they cast recency- and confidence-weighted votes toward an intent):

| Signal | Confidence | Notes |
|---|---|---|
| Recent search queries | highest | explicit, fresh. Decays fast. |
| Purchase history | high but *directional* | **consumables complement** (invite more), **durables suppress** (done for now). This is the subtle one. |
| Prior-session intent | medium, decays | carryover (e.g. abandoned cart). |
| Email link clicks | medium | marketing-nudged, trust less than self-initiated search. |
| Ad-click signals | lowest | externally planted. Tiebreaker, not driver. |

**The 4 personas** (each stresses a different part of the logic — keep this property
if you edit them):

1. **Mid-Repair Homeowner** — strong convergent signal (searches "faucet cartridge",
   abandoned plumbing cart). The easy case; should look effortless. → repair layout.
2. **Gift Shopper w/ Conflicting Past** — fresh search "Father's Day gift" vs. purchase
   history of heavy pro-tool buys. **Conflict case.** Fresh explicit search should beat
   stale history → gift layout, but the readout must SHOW the tension/override.
3. **Nudged Browser** — no searches; only soft signals (clicked spring-outdoor email,
   patio ad, bought a grill last summer). **Weak-signal case.** → outdoor/seasonal,
   shown at lower confidence. Tests graceful degradation + honesty about uncertainty.
4. **Blank Slate** — new userID, no history. **Cold-start case.** → best-sellers
   default. Proves the design handles the hard reality, not just data-rich users.

**Implementation sketch (proposed, not final):**
- Add `lib/personas.ts`: 4 hand-authored signal bundles (mocked fixtures — there is
  NO real ad pixel / email tracking / purchase DB, and the demo should say so).
- Add a signal→intent inference function: map signals to catalog `tags`, apply
  recency/confidence weights, resolve conflicts, emit an `Intent` + an *evidence*
  trace (which signals fired, how weighted, what was overridden/down-weighted).
- Extend `IntentReadout` to show the evidence trace, not just the final intent. With
  multi-signal inference this panel becomes load-bearing, not decorative.
- The inferred intent then feeds the SAME existing decision→ground→render pipeline.
  Do not rebuild the pipeline; just change where intent comes from.

**Open questions left for the human (ask before assuming):**
- Persona 3's soft-signal category (currently outdoor/seasonal) — confirm.
- Persona 2's conflict rule (currently: fresh search beats stale history) — confirm.

---

## 6. Conventions you must respect

- **Tags are the signal interface.** Each product's `tags` are how signals join to
  inventory. A search for "drain clog" → tags `plumbing,repair`; a patio ad →
  `outdoor,patio`. When adding products, tag them so signals can find them.
- **Consumable vs. durable is intentional.** Items tagged `consumable` (soil, bulbs,
  saw blades, drill bits, aerator) *complement* purchases and recur. Durables
  (grill, bistro set, thermostat, ladder) *suppress* their category after purchase.
  The signal-weighting logic depends on this distinction — preserve it.
- **Catalog clusters** (added deliberately, each feeds a persona):
  outdoor/garden → Persona 3 · power-tool accessories → purchase-complement logic ·
  plumbing depth → Persona 1 · best-sellers → Persona 4 cold start.
- **Adding a block type** = schema + renderer switch + prompt rules, all three.
- **Copy style:** plain, active voice, end-user framing (see the design skill ethos).
  Name things by what the user does, not how the system works.

---

## 7. Run / build / deploy

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # type-checks + builds; must pass before pushing
```

- **No API key** → serves grounded cached specs (static but correct). Good for a
  free public deploy.
- **With key** → set `ANTHROPIC_API_KEY` in `.env.local` (dev) or Vercel env (prod)
  for live generation. NOTE: with a key on a public URL, every visitor click costs
  tokens. For a public demo, prefer key-off and show live variation in a recording.

Deploy: push to GitHub → import on Vercel → (optional) add env var → deploy.

---

## 8. Gotchas

- The Google Fonts `<link>` in `app/layout.tsx` triggers a harmless CSS-minify
  warning in sandboxed/offline builds. It resolves fine on Vercel. Don't "fix" it by
  removing the fonts.
- The model sometimes wraps JSON in prose/backticks; the route already slices between
  the first `{` and last `}` before parsing. Keep that tolerance.
- `max_tokens` is set modestly; if you add many block types, a complex page may need
  a higher cap.

---

## 9. Explicit non-goals (don't "helpfully" build these without being asked)

Per-user real-time render on every pageview (cache by intent *cluster* instead),
real signal integrations (CDP/event stream/ad pixel), the live mid-session intent
*switch detector* (designed but deferred), A/B eval infra, real auth, real inventory
APIs. These are the "what productionizing adds" story — name them, don't smuggle them
into the demo.
