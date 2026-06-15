"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool } from "ai";
import { z } from "zod";
import { byId, catalogSummary } from "@/lib/catalog";
import { PRESETS } from "@/lib/fallback";
import type { PageSpec } from "@/lib/schema";

type PageBlock = PageSpec["blocks"][number];
type PageMode = PageSpec["intent"]["mode"];

export type GeneratedPage = {
  blocks: PageBlock[];
  mode: PageMode;
  fromAI: boolean;
};

const SYSTEM = `You are the layout engine for BuildRight, an adaptive home-improvement storefront.
Call rendering tools to assemble page blocks for the shopper described by the user.

Rules:
- Call renderHero first and only once.
- A REPAIR shopper is convergent: renderHero(mode: repair), renderGuide, renderProducts, optionally renderComparison.
- A GIFT shopper is divergent: renderHero(mode: gift), renderGiftCollection, then renderComparison with 2 or 3 standout options.
- An OUTDOOR or SEASONAL shopper should get renderHero(mode: outdoor) and renderProducts with patio, garden, grill, or lighting items.
- A PROJECT or BUILD shopper (drill, plywood, saw, workshop) should get renderHero(mode: project), renderProducts with power tools and accessories, optionally renderGuide for a build how-to.
- A COLD START shopper should get renderHero(mode: default) and renderProducts with broad best-sellers.
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

const BLOCK_ORDER: Record<PageMode, PageBlock["type"][]> = {
  repair:  ["hero", "guide", "productGrid", "comparison"],
  gift:    ["hero", "giftCollection", "comparison", "productGrid"],
  outdoor: ["hero", "productGrid", "comparison"],
  default: ["hero", "productGrid", "comparison"],
  project: ["hero", "productGrid", "guide", "comparison"],
};

function fallbackPage(fallbackPreset: string): GeneratedPage {
  const spec = PRESETS[fallbackPreset]?.spec ?? PRESETS.starter.spec;
  return {
    blocks: spec.blocks,
    mode: spec.intent.mode,
    fromAI: false,
  };
}

function groundedIds(productIds: string[], min = 1) {
  const real = productIds.filter((id) => !!byId(id));
  return real.length >= min ? real : null;
}

function hasProductIds(block: PageBlock) {
  return "productIds" in block && block.productIds.length > 0;
}

function blockFromToolCall(
  toolName: string,
  input: unknown,
): { block: PageBlock; mode?: PageMode } | null {
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

function normalizeBlocks(rawBlocks: PageBlock[], mode: PageMode): PageBlock[] | null {
  const hero = rawBlocks.find((block) => block.type === "hero");
  if (!hero) return null;

  const order = BLOCK_ORDER[mode];
  const allowed = new Set<PageBlock["type"]>(order);
  const orderedTail = rawBlocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type !== "hero" && allowed.has(block.type))
    .sort((a, b) => {
      const byType = order.indexOf(a.block.type) - order.indexOf(b.block.type);
      return byType || a.index - b.index;
    })
    .filter(({ block }, index, ordered) => (
      ordered.findIndex(({ block: candidate }) => candidate.type === block.type) === index
    ))
    .map(({ block }) => block);

  const blocks = [hero, ...orderedTail].slice(0, 5);
  const types = new Set(blocks.map((block) => block.type));

  if (!blocks.some(hasProductIds)) return null;
  if (mode === "repair"  && (!types.has("guide") || !types.has("productGrid"))) return null;
  if (mode === "gift"    && !types.has("giftCollection")) return null;
  if (mode === "project" && !types.has("productGrid")) return null;
  if ((mode === "outdoor" || mode === "default") && !types.has("productGrid")) return null;

  return blocks;
}

export async function generatePage(input: string, fallbackPreset: string): Promise<GeneratedPage> {
  const fallback = () => fallbackPage(fallbackPreset);

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  let mode: PageMode = fallback().mode;

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM,
      prompt: input.slice(0, 800),
      toolChoice: "required",
      maxOutputTokens: 1200,
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

    const blocks: PageBlock[] = [];
    for (const call of result.toolCalls) {
      const next = blockFromToolCall(call.toolName, call.input);
      if (!next) continue;
      blocks.push(next.block);
      if (next.mode) mode = next.mode;
    }

    const normalized = normalizeBlocks(blocks, mode);
    if (!normalized) return fallback();

    return { blocks: normalized, mode, fromAI: true };
  } catch {
    return fallback();
  }
}
