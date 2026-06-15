import { z } from "zod";
import { byId } from "./catalog";

// ---- The contract the model must return. Finite block vocabulary. ----
// The model's freedom is bounded to WHICH blocks, in WHAT order, with WHICH
// real product ids — never arbitrary markup.

export const IntentSchema = z.object({
  mode: z.enum(["repair", "gift", "outdoor", "default", "project"]),
  summary: z.string().max(120), // one human-readable line, shown in the Intent Readout
  recipient: z.string().optional(), // gift mode: who it's for
  stage: z.string(), // e.g. "diagnosing", "exploring", "comparing"
  expertise: z.enum(["novice", "intermediate", "pro", "unknown"]),
  budget: z.string().optional(),
});

const Block = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hero"),
    headline: z.string().max(90),
    sub: z.string().max(160),
  }),
  z.object({
    type: z.literal("guide"),
    title: z.string().max(80),
    steps: z.array(z.string().max(160)).min(2).max(5),
  }),
  z.object({
    type: z.literal("productGrid"),
    title: z.string().max(80),
    productIds: z.array(z.string()).min(1).max(6),
  }),
  z.object({
    type: z.literal("comparison"),
    title: z.string().max(80),
    productIds: z.array(z.string()).min(2).max(4),
  }),
  z.object({
    type: z.literal("giftCollection"),
    title: z.string().max(80),
    note: z.string().max(160),
    productIds: z.array(z.string()).min(2).max(6),
  }),
]);

export const PageSpecSchema = z.object({
  intent: IntentSchema,
  blocks: z.array(Block).min(1).max(5),
});

export type PageSpec = z.infer<typeof PageSpecSchema>;
export type Intent = z.infer<typeof IntentSchema>;

// ---- Grounding bind step ----
// Strip any product id the model invented. If a block ends up with no real
// products, drop the block. The page renders truth or it doesn't render.
export function ground(spec: PageSpec): PageSpec {
  const blocks = spec.blocks
    .map((b) => {
      if ("productIds" in b) {
        const real = b.productIds.filter((id) => !!byId(id));
        if (real.length === 0) return null; // drop empty block
        return { ...b, productIds: real };
      }
      return b;
    })
    .filter((b): b is PageSpec["blocks"][number] => b !== null);

  return { intent: spec.intent, blocks };
}

