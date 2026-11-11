import { performance } from "node:perf_hooks";
import { CATALOG, byId } from "../lib/catalog";
import { PRESETS } from "../lib/fallback";
import { blockFromToolCall } from "../lib/render-tools";
import { POST } from "../app/api/gen-page/route";

type Case = {
  name: string;
  tool: string;
  input: unknown;
  expectAccepted: boolean;
  expectedIds?: string[];
};

type EvaluatedBlock = { type: string; productIds?: string[] };
type StreamEvent =
  | { type: "block"; block: EvaluatedBlock; mode?: string }
  | { type: "done"; fromAI: boolean }
  | { type: "fallback"; blocks: EvaluatedBlock[]; mode: string; fromAI: false };

const known = CATALOG.slice(0, 4).map((product) => product.id);
const cases: Case[] = [
  {
    name: "valid hero",
    tool: "renderHero",
    input: { headline: "Repair the leak", sub: "Grounded parts and steps", mode: "repair" },
    expectAccepted: true,
  },
  {
    name: "hero invalid mode",
    tool: "renderHero",
    input: { headline: "Unknown", sub: "Unknown", mode: "invented" },
    expectAccepted: false,
  },
  {
    name: "valid product grid",
    tool: "renderProducts",
    input: { title: "Products", productIds: [known[0], known[1]] },
    expectAccepted: true,
    expectedIds: [known[0], known[1]],
  },
  {
    name: "mixed real and invented product ids",
    tool: "renderProducts",
    input: { title: "Products", productIds: [known[0], "invented-sku"] },
    expectAccepted: true,
    expectedIds: [known[0]],
  },
  {
    name: "all product ids invented",
    tool: "renderProducts",
    input: { title: "Products", productIds: ["invented-sku"] },
    expectAccepted: false,
  },
  {
    name: "valid guide",
    tool: "renderGuide",
    input: { title: "Steps", steps: ["Shut off water", "Replace cartridge"] },
    expectAccepted: true,
  },
  {
    name: "guide has too few steps",
    tool: "renderGuide",
    input: { title: "Steps", steps: ["Only one"] },
    expectAccepted: false,
  },
  {
    name: "gift collection retains two grounded ids",
    tool: "renderGiftCollection",
    input: { title: "Gifts", note: "For a DIY shopper", productIds: [known[0], "invented-sku", known[1]] },
    expectAccepted: true,
    expectedIds: [known[0], known[1]],
  },
  {
    name: "gift collection drops below grounded minimum",
    tool: "renderGiftCollection",
    input: { title: "Gifts", note: "For a DIY shopper", productIds: [known[0], "invented-sku"] },
    expectAccepted: false,
  },
  {
    name: "comparison accepts duplicate real id",
    tool: "renderComparison",
    input: { title: "Compare", productIds: [known[0], known[0]] },
    expectAccepted: true,
    expectedIds: [known[0], known[0]],
  },
];

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.round((sorted.length - 1) * fraction)];
}

async function readEvents(response: Response): Promise<StreamEvent[]> {
  const text = await response.text();
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line) as StreamEvent);
}

async function evaluateFallback(preset: string) {
  const request = new Request("http://localhost/api/gen-page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "evaluation", fallbackPreset: preset }),
  });
  const started = performance.now();
  const events = await readEvents(await POST(request));
  const elapsed = performance.now() - started;
  const blocks = events.flatMap((event) => event.type === "block" ? [event.block] : []);
  const productIds = blocks.flatMap((block) => block.productIds ?? []);
  return {
    elapsed,
    blockCount: blocks.length,
    hasDone: events.some((event) => event.type === "done" && event.fromAI === false),
    invalidProductIds: productIds.filter((id) => !byId(id)),
  };
}

async function main() {
  const savedKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const toolResults = cases.map((testCase) => {
    const output = blockFromToolCall(testCase.tool, testCase.input);
    const accepted = output !== null;
    const actualIds = output && "productIds" in output.block ? output.block.productIds : undefined;
    return {
      name: testCase.name,
      passed: accepted === testCase.expectAccepted
        && (testCase.expectedIds === undefined || JSON.stringify(actualIds) === JSON.stringify(testCase.expectedIds)),
      accepted,
      actualIds,
    };
  });

  const presets = Object.keys(PRESETS);
  const fallbackRuns: Awaited<ReturnType<typeof evaluateFallback>>[] = [];
  for (let iteration = 0; iteration < 25; iteration += 1) {
    for (const preset of presets) fallbackRuns.push(await evaluateFallback(preset));
  }
  if (savedKey) process.env.OPENAI_API_KEY = savedKey;

  const times = fallbackRuns.map((result) => result.elapsed);
  const failedFallbacks = fallbackRuns.filter((result) =>
    !result.hasDone || result.blockCount === 0 || result.invalidProductIds.length > 0
  );
  const acceptedWithIds = toolResults.filter((result) => result.accepted && result.actualIds);
  const invalidIdsAfterGrounding = acceptedWithIds
    .flatMap((result) => result.actualIds ?? [])
    .filter((id) => !byId(id));

  const report = {
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
    catalogProducts: CATALOG.length,
    modelEvaluation: {
      executed: false,
      reason: "OPENAI_API_KEY is not available; this run evaluates deterministic boundaries only.",
    },
    toolBoundary: {
      cases: toolResults.length,
      passed: toolResults.filter((result) => result.passed).length,
      invalidProductIdsAfterGrounding: invalidIdsAfterGrounding.length,
      results: toolResults,
      finding: "Duplicate valid product IDs are not deduplicated and can satisfy a two-product minimum.",
    },
    noKeyFallback: {
      presets: presets.length,
      runs: fallbackRuns.length,
      successfulRuns: fallbackRuns.length - failedFallbacks.length,
      successRate: (fallbackRuns.length - failedFallbacks.length) / fallbackRuns.length,
      latencyMsP50: Number(percentile(times, 0.5).toFixed(3)),
      latencyMsP95: Number(percentile(times, 0.95).toFixed(3)),
      invalidProductReferences: fallbackRuns.reduce((sum, result) => sum + result.invalidProductIds.length, 0),
    },
    limitations: [
      "No live model calls, tool-selection scoring, token usage, or provider latency were measured.",
      "Fallback latency is in-process route execution, not browser or network latency.",
      "The live-cluster path does not apply the persona path's full-page completeness check.",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  if (toolResults.some((result) => !result.passed) || failedFallbacks.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
