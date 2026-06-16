import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp";
import { z } from "zod";
import { catalogSummary } from "@/lib/catalog";
import {
  renderHeroSchema,
  renderProductsSchema,
  renderGuideSchema,
  renderGiftCollectionSchema,
  renderComparisonSchema,
  TOOL_DESCRIPTIONS,
  groundedIds,
} from "@/lib/render-tools";

function createServer(): McpServer {
  const server = new McpServer({
    name: "buildright-renderer",
    version: "1.0.0",
  });

  // Catalog resource — agents read this before calling tools to know valid product IDs
  server.resource(
    "catalog",
    "buildright://catalog",
    async () => ({
      contents: [{
        uri: "buildright://catalog",
        mimeType: "text/plain",
        text: catalogSummary(),
      }],
    })
  );

  // Prompt — provides layout rules + catalog to any MCP client
  server.prompt(
    "compose-page",
    "Compose a BuildRight storefront page for a described shopper",
    { shopper: z.string().describe("Description of the shopper and their browsing intent") },
    ({ shopper }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `Compose a BuildRight home-improvement storefront page for this shopper: ${shopper}`,
            "",
            "Layout rules:",
            "- Call renderHero first and only once.",
            "- REPAIR: renderHero(mode:repair) → renderGuide → renderProducts → optionally renderComparison",
            "- GIFT: renderHero(mode:gift) → renderGiftCollection → renderComparison",
            "- APPLIANCE: renderHero(mode:appliance) → renderComparison with dishwasher models → renderProducts with appliances/accessories → renderGuide as a buying/install checklist",
            "- OUTDOOR/SEASONAL: renderHero(mode:outdoor) → renderProducts",
            "- PROJECT/BUILD: renderHero(mode:project) → renderProducts → optionally renderGuide",
            "- COLD START: renderHero(mode:default) → renderProducts",
            "- Use only real product IDs from the catalog resource. Never invent IDs.",
            "- Prefer in-stock items.",
            "- Use 3 to 5 tool calls total.",
            "",
            "Read the buildright://catalog resource first to see available products.",
          ].join("\n"),
        },
      }],
    })
  );

  // renderHero — always first, sets the intent mode and visual identity.
  // mode is returned as a separate field (not inside the block) to match the PageBlock type contract.
  server.tool(
    "renderHero",
    TOOL_DESCRIPTIONS.renderHero,
    renderHeroSchema.shape,
    async ({ headline, sub, mode }) => ({
      content: [{ type: "text" as const, text: JSON.stringify({ block: { type: "hero", headline, sub }, mode }) }],
    })
  );

  // renderProducts — grounded product grid; drops any invented IDs
  server.tool(
    "renderProducts",
    TOOL_DESCRIPTIONS.renderProducts,
    renderProductsSchema.shape,
    async ({ title, productIds }) => {
      const grounded = groundedIds(productIds);
      if (!grounded) {
        return { content: [{ type: "text" as const, text: "No valid product IDs — check the catalog resource for real IDs." }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ type: "productGrid", title, productIds: grounded }) }] };
    }
  );

  // renderGuide — numbered how-to guide or buying checklist for repair, project, and appliance scenarios
  server.tool(
    "renderGuide",
    TOOL_DESCRIPTIONS.renderGuide,
    renderGuideSchema.shape,
    async ({ title, steps }) => ({
      content: [{ type: "text" as const, text: JSON.stringify({ type: "guide", title, steps }) }],
    })
  );

  // renderGiftCollection — curated gift grid; drops invented IDs
  server.tool(
    "renderGiftCollection",
    TOOL_DESCRIPTIONS.renderGiftCollection,
    renderGiftCollectionSchema.shape,
    async ({ title, note, productIds }) => {
      const grounded = groundedIds(productIds, 2);
      if (!grounded) {
        return { content: [{ type: "text" as const, text: "Not enough valid product IDs — check the catalog resource." }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ type: "giftCollection", title, note, productIds: grounded }) }] };
    }
  );

  // renderComparison — side-by-side comparison; drops invented IDs
  server.tool(
    "renderComparison",
    TOOL_DESCRIPTIONS.renderComparison,
    renderComparisonSchema.shape,
    async ({ title, productIds }) => {
      const grounded = groundedIds(productIds, 2);
      if (!grounded) {
        return { content: [{ type: "text" as const, text: "Not enough valid product IDs for comparison — check the catalog resource." }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ type: "comparison", title, productIds: grounded }) }] };
    }
  );

  return server;
}

async function handleMcp(request: Request): Promise<Response> {
  try {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — new transport required per request
    });
    const server = createServer();
    await server.connect(transport);
    return transport.handleRequest(request);
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export { handleMcp as GET, handleMcp as POST, handleMcp as DELETE };
