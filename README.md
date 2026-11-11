# Adaptive Storefront

Adaptive Storefront is a working commerce UI experiment in which inferred shopper intent changes the page composition. The model can select and order blocks from a fixed registry, but React owns rendering and the local catalog owns product names, prices, availability, and IDs.

The architecture is intentionally hybrid: deterministic signal scoring decides when an in-session intent has changed; an LLM can compose a page through typed tools; catalog binding and fallback logic constrain what reaches the UI.

## What is implemented

- Five model-callable rendering tools: hero, product grid, guide, gift collection, and comparison.
- Zod validation on every streamed tool call.
- Product-ID grounding against a 40-item catalog before a product block is emitted.
- A finite React renderer switch—model output never becomes HTML or JSX.
- NDJSON block streaming from the Next.js route to the browser.
- A stateless MCP endpoint with the catalog resource, a composition prompt, and the same five render tools.
- Deterministic fallback presets for missing API keys and failed model calls.
- Session-scoped caches for persona pages and live intent-cluster pages.
- Rule-based in-session intent scoring, background page generation, threshold-based switching, hysteresis, and a 60-second switch lock.
- Static persona fixtures for repeatable repair, appliance, gift, outdoor, cold-start, and budget demonstrations.
- Static catalog product pages, client-side related-product ranking, and a demo cart.

## Architecture and source map

| File | Responsibility |
|---|---|
| `lib/catalog.ts` | Source of truth for product IDs, names, prices, stock state, and tags. |
| `lib/render-tools.ts` | Tool schemas, per-call validation, and product-ID grounding used by the generation route and MCP endpoint. |
| `app/api/gen-page/route.ts` | Calls the selected OpenAI model, streams validated blocks as NDJSON, and emits deterministic fallbacks on model failure. |
| `app/api/mcp/route.ts` | Exposes the catalog, composition prompt, and five grounded render tools over stateless MCP HTTP. |
| `app/page.tsx` | Parses the stream, performs persona-page completeness checks, caches results, and renders the finite block vocabulary. |
| `lib/intent-clusters.ts` | Deterministic keyword/tag scoring for five live intent clusters. |
| `lib/session-intent.tsx` | Signal decay, background generation, cluster cache, auto-switch thresholds, lock, and `sessionStorage` persistence. |
| `lib/fallback.ts` | Hand-authored, catalog-grounded page specifications used when model generation is unavailable. |
| `lib/schema.ts` | Full `PageSpec` contract and grounding helper used by preset/spec paths; streamed calls use the narrower schemas in `lib/render-tools.ts`. |

## Generation path

1. The browser posts an intent description and fallback-preset key to `/api/gen-page`.
2. With an API key, AI SDK `streamText` requires calls to one of five typed tools. The prompt includes a catalog summary and layout rules.
3. `blockFromToolCall()` runs the matching Zod schema. Invalid calls are ignored.
4. Product-bearing blocks filter IDs through `byId()`. Product grids require at least one real product; gift and comparison blocks require at least two.
5. Valid blocks stream to the browser as newline-delimited JSON and are rendered through a fixed TypeScript switch.
6. The explicit persona path checks that the final block set contains the required hero and product content for its mode; an incomplete page is replaced by a deterministic preset.

The background live-cluster path uses the same validated stream and grounding logic, but currently accepts any non-empty block set rather than running the persona path's full-page completeness check.

## Live intent drift and caching

Live adaptation is deterministic, not an LLM classification step:

- Search and browse signals are scored against five clusters: `repair`, `gift`, `outdoor`, `project`, and `starter`.
- Signals use a rolling 20-item queue and decay in three buckets before expiring after three minutes.
- At a score of 0.3, the app starts background generation for that cluster if it is not already cached or in flight.
- At a score of 0.6, with at least a 0.1 lead over the active cluster, the page switches.
- For 60 seconds after a switch, the effective competing threshold is 0.8 to reduce oscillation.
- Signal state, generated pages, the active cluster, and the lock deadline are stored in `sessionStorage` for the browser session.

The appliance layout is implemented as a static persona and generation mode, but it is not one of the five live drift clusters.

Caching is browser-session caching, not a shared server or CDN response cache. A failed cluster generation is suppressed until reload to avoid retry storms.

## MCP surface

`/api/mcp` creates a new stateless MCP server and transport per request. It exposes:

- resource: `buildright://catalog`
- prompt: `compose-page`
- tools: `renderHero`, `renderProducts`, `renderGuide`, `renderGiftCollection`, and `renderComparison`

The product tools validate their arguments and reject calls that do not retain enough real catalog IDs after grounding. The endpoint does not currently authenticate or authorize clients.

## Failure and fallback behavior

| Condition | Current behavior |
|---|---|
| No `OPENAI_API_KEY` | The route streams the requested deterministic preset with `fromAI: false`. |
| Model or stream exception | The route emits a fallback event containing the deterministic preset. |
| Invalid tool arguments | The tool call is dropped and no block is emitted. |
| Unknown product IDs | IDs are removed; the block is dropped if too few valid IDs remain. |
| Incomplete explicit-persona page | A client completeness check replaces it with the matching preset. |
| Incomplete live-cluster page | Any non-empty block list can enter the cluster cache; full-page completeness is not checked. |
| Failed live-cluster generation | The cluster is marked failed until reload; if a switch occurred first, the UI can remain on its skeleton. |
| User changes persona request | The prior browser fetch is aborted. |

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The demo works without an API key by streaming grounded presets.

To enable live generation:

```bash
cp .env.example .env.local
# set OPENAI_API_KEY; OPENAI_MODEL is optional
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Cost controls present in the demo

- No-key operation bypasses model calls entirely.
- Session caches avoid repeat generation for the same persona or live cluster.
- Background generation starts only after the 0.3 score threshold.
- Input is truncated to 800 characters and output is capped at 1,200 tokens.
- The default model can be overridden through `OPENAI_MODEL`.

The app does not record token usage or model cost, so it cannot yet make a measured cost-per-page or cost-per-success claim.

## Honest boundaries

- The catalog, stock state, personas, and fallbacks are demo fixtures, not connected commerce systems.
- The generation route and MCP endpoint have no authentication, authorization, tenant isolation, rate limiting, abuse controls, or retained audit trail.
- Streamed blocks are validated individually, but the server does not enforce a unique hero, global tool order, or complete-page schema. The explicit persona client supplies a separate completeness check.
- Live intent detection is deterministic keyword/tag matching, not a trained intent model, and there is no implemented appliance live-drift cluster.
- There is no automated test or evaluation suite for tool-selection accuracy, schema-valid rate, grounding accuracy, false switches, latency, or fallback success.
- There is no request tracing, model latency history, token telemetry, or cost telemetry.
- Session caches are browser-local and do not provide server durability or cross-device identity.
- Checkout, payment, real inventory, account history, experimentation, and policy approval are not implemented.
- The repository demonstrates an architecture and working prototype; it is not presented as production-ready.

## Deployment note

The repository can be deployed as a standard Next.js application. A public deployment with an API key should add authentication, rate limits, spend limits, and monitoring first. The repository's previous Vercel URL is no longer an active deployment, so no public demo URL is claimed here.
