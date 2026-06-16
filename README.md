# Adaptive Storefront

A demo of **intent-driven, server-driven UI** for commerce. One product catalog;
the page assembles different blocks, in a different order, depending on what the
shopper came to do. The model **selects and orders blocks** from a fixed registry
and binds them to **real catalog products** — it can never invent a product, price,
or layout markup.

Three flagship shoppers, same expanded catalog:
- *"My kitchen faucet is leaking and I've never fixed one"* → convergent repair layout
- *"I need a quiet stainless dishwasher and the install parts"* → high-consideration appliance-buying layout
- *"Father's Day gift for my dad who loves DIY"* → divergent gift layout

## What I actually built (the Option A seam)

The model is the *least* of it. The engineering is the layers around it:

| File | Layer | What it owns |
|---|---|---|
| `lib/schema.ts` | contract + grounding | Zod page-spec; **drops any product id the model invents**, drops empty blocks |
| `app/page.tsx` | render seam | the `switch` over a finite block registry → real React |
| `app/api/gen-page/route.ts` | orchestration | streaming model tool calls, **graceful fallback** on any failure |
| `app/api/mcp/route.ts` | agent boundary | exposes the catalog and rendering vocabulary through MCP |
| `components/sections/*` | UI blocks | hero, product grid, guide/checklist, gift collection, comparison |
| `lib/catalog.ts` | source of truth | the only place products, prices, and stock exist |

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Works with **no API key** — it serves grounded, cached specs. To enable live
generation, copy `.env.example` to `.env.local` and add `OPENAI_API_KEY`.

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. On vercel.com → **Add New → Project** → import the repo. Framework auto-detects as Next.js.
3. (Optional) Project → **Settings → Environment Variables** → add `OPENAI_API_KEY`
   if you want the live-generation path. Without it, the public demo still works on
   cached specs at zero cost.
   You can also set `OPENAI_MODEL`; it defaults to `gpt-5.4-mini` for lower-cost live demos.
4. **Deploy.** You get a public URL.

Alternatively, with the Vercel CLI: `npx vercel` from this folder.

### Cost note for a public link
Cached specs cost nothing. The live path costs model tokens **per click**, so if you
set a key on a public URL, every visitor's "Generate layout" spends money. Either
leave the key off (cached is convincing on its own) or keep the key for your own
recorded walkthrough and ship the public link keyless.

## What's deliberately NOT here (the honest v1 boundary)

These are named non-goals, not omissions: per-user history, real inventory APIs,
caching by intent cluster, the live washing-machine→gift *switch detector*, A/B eval,
and a policy gate. Each maps to a layer in the design — they're the "what
productionizing adds" story, not the demo.

### Optional v2 extension

Appliance buying currently reuses the existing block vocabulary: hero, comparison,
products, and guide/checklist. A future v2 could add a first-class
`renderBuyingGuide` or `renderChecklist` tool, but that should update the schema,
renderer, AI tools, MCP tools, fallback presets, docs, and tests together.
