# Adaptive Storefront

A demo of **intent-driven, server-driven UI** for commerce. One product catalog;
the page assembles different blocks, in a different order, depending on what the
shopper came to do. The model **selects and orders blocks** from a fixed registry
and binds them to **real catalog products** — it can never invent a product, price,
or layout markup.

Two built-in shoppers, same catalog:
- *"My kitchen faucet is leaking and I've never fixed one"* → convergent repair layout
- *"Father's Day gift for my dad who loves DIY"* → divergent gift layout

## What I actually built (the Option A seam)

The model is the *least* of it. The engineering is the layers around it:

| File | Layer | What it owns |
|---|---|---|
| `lib/schema.ts` | contract + grounding | Zod page-spec; **drops any product id the model invents**, drops empty blocks |
| `components/Renderer.tsx` | render seam | the `switch` over a finite block registry → real React |
| `lib/prompt.ts` | decisioning | the rules that turn shopper input into a block selection |
| `app/api/render/route.ts` | orchestration | server-side model call, **graceful fallback** on any failure |
| `components/IntentReadout.tsx` | the signature | inferred intent shown as a legible, steerable readout |
| `lib/catalog.ts` | source of truth | the only place products, prices, and stock exist |

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Works with **no API key** — it serves grounded, cached specs. To enable live
generation, copy `.env.example` to `.env.local` and add `ANTHROPIC_API_KEY`.

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. On vercel.com → **Add New → Project** → import the repo. Framework auto-detects as Next.js.
3. (Optional) Project → **Settings → Environment Variables** → add `ANTHROPIC_API_KEY`
   if you want the live-generation path. Without it, the public demo still works on
   cached specs at zero cost.
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
