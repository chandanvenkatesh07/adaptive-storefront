import { z } from "zod";
import { byId } from "@/lib/catalog";
import type { PageBlock, PageMode } from "@/lib/schema";

export const heroModeSchema = z.enum(["repair", "gift", "outdoor", "default", "project"]);

// Note: the MCP server passes schema.shape (raw shape) to McpServer.tool().
// The gen-page route passes the full z.object() to the AI SDK tool() helper.
// If you add .refine() or .transform() to any schema here, those refinements
// apply to the gen-page path but NOT to the MCP path (.shape strips them).
// Keep schemas to plain field definitions only.

export const renderHeroSchema = z.object({
  headline: z.string().max(90),
  sub: z.string().max(160),
  mode: heroModeSchema,
});
export const renderProductsSchema = z.object({
  title: z.string().max(80),
  productIds: z.array(z.string()).min(1).max(6),
});
export const renderGuideSchema = z.object({
  title: z.string().max(80),
  steps: z.array(z.string().max(160)).min(2).max(5),
});
export const renderGiftCollectionSchema = z.object({
  title: z.string().max(80),
  note: z.string().max(160),
  productIds: z.array(z.string()).min(2).max(6),
});
export const renderComparisonSchema = z.object({
  title: z.string().max(80),
  productIds: z.array(z.string()).min(2).max(4),
});

export const TOOL_DESCRIPTIONS = {
  renderHero:           "Render the page hero banner. Call this first and only once.",
  renderProducts:       "Render a product grid for repair parts, kits, seasonal products, or best-sellers.",
  renderGuide:          "Render a numbered how-to guide. Use only for repair and project scenarios.",
  renderGiftCollection: "Render a curated gift grid. Use only for gift scenarios.",
  renderComparison:     "Render a side-by-side comparison of 2 to 4 real products.",
} as const;

export function groundedIds(productIds: string[], min = 1): string[] | null {
  const real = productIds.filter((id) => !!byId(id));
  return real.length >= min ? real : null;
}

export function blockFromToolCall(
  toolName: string,
  input: unknown,
): { block: PageBlock; mode?: PageMode } | null {
  if (toolName === "renderHero") {
    const parsed = renderHeroSchema.safeParse(input);
    if (!parsed.success) return null;
    const { headline, sub, mode } = parsed.data;
    return { block: { type: "hero", headline, sub }, mode };
  }
  if (toolName === "renderProducts") {
    const parsed = renderProductsSchema.safeParse(input);
    if (!parsed.success) return null;
    const productIds = groundedIds(parsed.data.productIds);
    return productIds ? { block: { type: "productGrid", title: parsed.data.title, productIds } } : null;
  }
  if (toolName === "renderGuide") {
    const parsed = renderGuideSchema.safeParse(input);
    if (!parsed.success) return null;
    return { block: { type: "guide", title: parsed.data.title, steps: parsed.data.steps } };
  }
  if (toolName === "renderGiftCollection") {
    const parsed = renderGiftCollectionSchema.safeParse(input);
    if (!parsed.success) return null;
    const productIds = groundedIds(parsed.data.productIds, 2);
    return productIds
      ? { block: { type: "giftCollection", title: parsed.data.title, note: parsed.data.note, productIds } }
      : null;
  }
  if (toolName === "renderComparison") {
    const parsed = renderComparisonSchema.safeParse(input);
    if (!parsed.success) return null;
    const productIds = groundedIds(parsed.data.productIds, 2);
    return productIds ? { block: { type: "comparison", title: parsed.data.title, productIds } } : null;
  }
  return null;
}
