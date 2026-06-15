import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { byId, catalogSummary } from "@/lib/catalog";
import { PRESETS } from "@/lib/fallback";
import type { PageSpec, PageBlock, PageMode } from "@/lib/schema";

type Block = PageBlock;

const SYSTEM = `You are the layout engine for BuildRight, an adaptive home-improvement storefront.
Call rendering tools to assemble page blocks for the shopper described by the user.

Rules:
- Call renderHero first and only once.
- A REPAIR shopper is convergent: call renderHero(mode: repair), then renderGuide, then renderProducts, optionally renderComparison. Call tools in that exact order.
- A GIFT shopper is divergent: call renderHero(mode: gift), then renderGiftCollection, then renderComparison with 2 or 3 standout options. Call tools in that exact order.
- An OUTDOOR or SEASONAL shopper: call renderHero(mode: outdoor), then renderProducts with patio, garden, grill, or lighting items. Call tools in that exact order.
- A PROJECT or BUILD shopper (drill, plywood, saw, workshop): call renderHero(mode: project), then renderProducts with power tools and accessories, optionally renderGuide for a build how-to. Call tools in that exact order.
- A COLD START shopper: call renderHero(mode: default), then renderProducts with broad best-sellers. Call tools in that exact order.
- productIds must be real IDs from the catalog. Never invent product IDs, names, prices, or stock states.
- Prefer in-stock items.
- Use 3 to 5 tool calls total.

Catalog (id | name | price | category | stock | tags):
${catalogSummary()}`;

const heroModeSchema = z.enum(["repair", "gift", "outdoor", "default", "project"]);
const renderHeroInputSchema = z.object({
  headline: z.string().max(90),
  sub: z.string().max(160),
  mode: heroModeSchema,
});
const renderProductsInputSchema = z.object({
  title: z.string().max(80),
  productIds: z.array(z.string()).min(1).max(6),
});
const renderGuideInputSchema = z.object({
  title: z.string().max(80),
  steps: z.array(z.string().max(160)).min(2).max(5),
});
const renderGiftCollectionInputSchema = z.object({
  title: z.string().max(80),
  note: z.string().max(160),
  productIds: z.array(z.string()).min(2).max(6),
});
const renderComparisonInputSchema = z.object({
  title: z.string().max(80),
  productIds: z.array(z.string()).min(2).max(4),
});

function groundedIds(productIds: string[], min = 1): string[] | null {
  const real = productIds.filter((id) => !!byId(id));
  return real.length >= min ? real : null;
}

function blockFromToolCall(
  toolName: string,
  input: unknown,
): { block: Block; mode?: PageMode } | null {
  if (toolName === "renderHero") {
    const parsed = renderHeroInputSchema.safeParse(input);
    if (!parsed.success) return null;
    const { headline, sub, mode } = parsed.data;
    return { block: { type: "hero", headline, sub }, mode };
  }
  if (toolName === "renderProducts") {
    const parsed = renderProductsInputSchema.safeParse(input);
    if (!parsed.success) return null;
    const productIds = groundedIds(parsed.data.productIds);
    return productIds ? { block: { type: "productGrid", title: parsed.data.title, productIds } } : null;
  }
  if (toolName === "renderGuide") {
    const parsed = renderGuideInputSchema.safeParse(input);
    if (!parsed.success) return null;
    return { block: { type: "guide", title: parsed.data.title, steps: parsed.data.steps } };
  }
  if (toolName === "renderGiftCollection") {
    const parsed = renderGiftCollectionInputSchema.safeParse(input);
    if (!parsed.success) return null;
    const productIds = groundedIds(parsed.data.productIds, 2);
    return productIds
      ? { block: { type: "giftCollection", title: parsed.data.title, note: parsed.data.note, productIds } }
      : null;
  }
  if (toolName === "renderComparison") {
    const parsed = renderComparisonInputSchema.safeParse(input);
    if (!parsed.success) return null;
    const productIds = groundedIds(parsed.data.productIds, 2);
    return productIds ? { block: { type: "comparison", title: parsed.data.title, productIds } } : null;
  }
  return null;
}

function fallbackBlocks(fallbackPreset: string): { blocks: Block[]; mode: PageMode } {
  const spec: PageSpec = PRESETS[fallbackPreset]?.spec ?? PRESETS.starter.spec;
  return { blocks: spec.blocks, mode: spec.intent.mode };
}

export async function POST(request: Request) {
  const { input, fallbackPreset } = await request.json() as { input: string; fallbackPreset: string };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (obj: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      if (!process.env.ANTHROPIC_API_KEY) {
        const fb = fallbackBlocks(fallbackPreset);
        fb.blocks.forEach((block, i) =>
          enqueue({ type: "block", block, ...(i === 0 ? { mode: fb.mode } : {}) })
        );
        enqueue({ type: "done", fromAI: false });
        controller.close();
        return;
      }

      try {
        const result = streamText({
          model: anthropic("claude-sonnet-4-6"),
          system: SYSTEM,
          prompt: (input as string).slice(0, 800),
          toolChoice: "required",
          maxOutputTokens: 1200,
          abortSignal: request.signal,
          tools: {
            renderHero: tool({
              description: "Render the page hero banner. This must be the first tool call.",
              inputSchema: renderHeroInputSchema,
            }),
            renderProducts: tool({
              description: "Render a product grid for repair parts, kits, seasonal products, or best-sellers.",
              inputSchema: renderProductsInputSchema,
            }),
            renderGuide: tool({
              description: "Render a numbered how-to guide. Use only for repair and project scenarios.",
              inputSchema: renderGuideInputSchema,
            }),
            renderGiftCollection: tool({
              description: "Render a curated gift grid. Use only for gift scenarios.",
              inputSchema: renderGiftCollectionInputSchema,
            }),
            renderComparison: tool({
              description: "Render a side-by-side comparison of 2 to 4 real products.",
              inputSchema: renderComparisonInputSchema,
            }),
          },
        });

        for await (const part of result.fullStream) {
          if (part.type === "tool-call") {
            const next = blockFromToolCall(part.toolName, part.input);
            if (!next) continue;
            const line: Record<string, unknown> = { type: "block", block: next.block };
            if (next.mode) line.mode = next.mode;
            enqueue(line);
          }
        }

        enqueue({ type: "done", fromAI: true });
      } catch {
        enqueue({ type: "done", fromAI: false });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
