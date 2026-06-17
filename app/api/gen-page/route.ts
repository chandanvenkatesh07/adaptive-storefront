import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { catalogSummary } from "@/lib/catalog";
import { PRESETS } from "@/lib/fallback";
import type { PageSpec, PageBlock, PageMode } from "@/lib/schema";
import {
  renderHeroSchema,
  renderProductsSchema,
  renderGuideSchema,
  renderGiftCollectionSchema,
  renderComparisonSchema,
  TOOL_DESCRIPTIONS,
  blockFromToolCall,
} from "@/lib/render-tools";

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";

const SYSTEM = `You are the layout engine for BuildRight, an adaptive home-improvement storefront.
Call rendering tools to assemble page blocks for the shopper described by the user.

Rules:
- Call renderHero first and only once.
- A REPAIR shopper is convergent: call renderHero(mode: repair), then renderGuide, then renderProducts, optionally renderComparison. Call tools in that exact order.
- A GIFT shopper is divergent: call renderHero(mode: gift), then renderGiftCollection, then renderComparison with 2 or 3 standout options. Call tools in that exact order.
- An APPLIANCE shopper is high-consideration: call renderHero(mode: appliance), then renderComparison with 2 to 4 dishwasher models, then renderProducts with matching appliances and install or cleaning accessories, then renderGuide as a buying/install checklist. Call tools in that exact order.
- An OUTDOOR or SEASONAL shopper: call renderHero(mode: outdoor), then renderProducts with patio, garden, grill, or lighting items. Call tools in that exact order.
- A PROJECT or BUILD shopper (drill, plywood, saw, workshop): call renderHero(mode: project), then renderProducts with power tools and accessories, optionally renderGuide for a build how-to. Call tools in that exact order.
- A COLD START shopper: call renderHero(mode: default), then renderProducts with broad best-sellers. Call tools in that exact order.
- productIds must be real IDs from the catalog. Never invent product IDs, names, prices, or stock states.
- Prefer in-stock items.
- Use 3 to 5 tool calls total.

Catalog (id | name | price | category | stock | tags):
${catalogSummary()}`;

function fallbackBlocks(fallbackPreset: string): { blocks: PageSpec["blocks"]; mode: PageMode } {
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

      if (!process.env.OPENAI_API_KEY) {
        const fb = fallbackBlocks(fallbackPreset);
        (fb.blocks as PageBlock[]).forEach((block, i) =>
          enqueue({ type: "block", block, ...(i === 0 ? { mode: fb.mode } : {}) })
        );
        enqueue({ type: "done", fromAI: false });
        controller.close();
        return;
      }

      try {
        const result = streamText({
          model: openai(OPENAI_MODEL),
          system: SYSTEM,
          prompt: (input as string).slice(0, 800),
          toolChoice: "required",
          maxOutputTokens: 1200,
          abortSignal: request.signal,
          tools: {
            renderHero:           tool({ description: TOOL_DESCRIPTIONS.renderHero,           inputSchema: renderHeroSchema }),
            renderProducts:       tool({ description: TOOL_DESCRIPTIONS.renderProducts,       inputSchema: renderProductsSchema }),
            renderGuide:          tool({ description: TOOL_DESCRIPTIONS.renderGuide,          inputSchema: renderGuideSchema }),
            renderGiftCollection: tool({ description: TOOL_DESCRIPTIONS.renderGiftCollection, inputSchema: renderGiftCollectionSchema }),
            renderComparison:     tool({ description: TOOL_DESCRIPTIONS.renderComparison,     inputSchema: renderComparisonSchema }),
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
        const fb = fallbackBlocks(fallbackPreset);
        enqueue({ type: "fallback", blocks: fb.blocks, mode: fb.mode, fromAI: false });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
