"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { byId, catalogSummary } from "@/lib/catalog";
import { PRESETS } from "@/lib/fallback";
import type { PageSpec } from "@/lib/schema";

type PageBlock = PageSpec["blocks"][number];
type PageMode = PageSpec["intent"]["mode"] | "outdoor" | "default";

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
- A COLD START shopper should get renderHero(mode: default) and renderProducts with broad best-sellers.
- productIds must be real IDs from the catalog. Never invent product IDs, names, prices, or stock states.
- Prefer in-stock items.
- Use 3 to 5 tool calls total.

Catalog (id | name | price | category | stock | tags):
${catalogSummary()}`;

const heroModeSchema = z.enum(["repair", "gift", "outdoor", "default"]);

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

export async function generatePage(input: string, fallbackPreset: string): Promise<GeneratedPage> {
  const fallback = () => fallbackPage(fallbackPreset);

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  const blocks: PageBlock[] = [];
  let mode: PageMode = fallback().mode;
  let hasHero = false;

  try {
    await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM,
      prompt: input.slice(0, 800),
      toolChoice: "required",
      stopWhen: stepCountIs(4),
      maxOutputTokens: 1200,
      tools: {
        renderHero: tool({
          description: "Render the page hero banner. This must be the first tool call.",
          inputSchema: z.object({
            headline: z.string().max(90),
            sub: z.string().max(160),
            mode: heroModeSchema,
          }),
          execute: async ({ headline, sub, mode: nextMode }) => {
            if (!hasHero) {
              hasHero = true;
              mode = nextMode;
              blocks.unshift({ type: "hero", headline, sub });
            }
            return { accepted: true };
          },
        }),
        renderProducts: tool({
          description: "Render a product grid for repair parts, kits, seasonal products, or best-sellers.",
          inputSchema: z.object({
            title: z.string().max(80),
            productIds: z.array(z.string()).min(1).max(6),
          }),
          execute: async ({ title, productIds }) => {
            const real = groundedIds(productIds);
            if (real) blocks.push({ type: "productGrid", title, productIds: real });
            return { accepted: !!real };
          },
        }),
        renderGuide: tool({
          description: "Render a numbered how-to guide. Use only for repair and project scenarios.",
          inputSchema: z.object({
            title: z.string().max(80),
            steps: z.array(z.string().max(160)).min(2).max(5),
          }),
          execute: async ({ title, steps }) => {
            blocks.push({ type: "guide", title, steps });
            return { accepted: true };
          },
        }),
        renderGiftCollection: tool({
          description: "Render a curated gift grid. Use only for gift scenarios.",
          inputSchema: z.object({
            title: z.string().max(80),
            note: z.string().max(160),
            productIds: z.array(z.string()).min(2).max(6),
          }),
          execute: async ({ title, note, productIds }) => {
            const real = groundedIds(productIds, 2);
            if (real) blocks.push({ type: "giftCollection", title, note, productIds: real });
            return { accepted: !!real };
          },
        }),
        renderComparison: tool({
          description: "Render a side-by-side comparison of 2 to 4 real products.",
          inputSchema: z.object({
            title: z.string().max(80),
            productIds: z.array(z.string()).min(2).max(4),
          }),
          execute: async ({ title, productIds }) => {
            const real = groundedIds(productIds, 2);
            if (real) blocks.push({ type: "comparison", title, productIds: real });
            return { accepted: !!real };
          },
        }),
      },
    });

    if (!hasHero || blocks.length === 0) return fallback();
    return { blocks, mode, fromAI: true };
  } catch {
    return fallback();
  }
}
