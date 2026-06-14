import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt";
import { parseAndGround } from "@/lib/schema";
import { PRESETS } from "@/lib/fallback";

export const runtime = "nodejs";

// Picks the closest preset as the fallback when live generation isn't available.
function fallbackFor(input: string) {
  const lc = input.toLowerCase();
  const looksGift = /(gift|dad|father|present|birthday|him|her|mom)/.test(lc);
  return looksGift ? PRESETS.gift.spec : PRESETS.repair.spec;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const shopperInput: string = (body.input || "").toString().slice(0, 400);
  const presetKey: string | undefined = body.presetKey;

  // When a known scenario was clicked, its cached spec is the exact fallback.
  const fb = () => (presetKey && PRESETS[presetKey] ? PRESETS[presetKey].spec : fallbackFor(shopperInput));

  const key = process.env.ANTHROPIC_API_KEY;

  // No key configured → serve the grounded fallback. Demo still works.
  if (!key) {
    return NextResponse.json({ source: "fallback", spec: fb() });
  }

  try {
    const { system, user } = buildPrompt(shopperInput);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = await res.json();
    const text: string = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    // Be tolerant of stray prose/backticks around the JSON.
    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const spec = parseAndGround(JSON.parse(jsonStr));

    return NextResponse.json({ source: "live", spec });
  } catch (err) {
    // Any failure (schema, network, parse) → grounded fallback, never a broken page.
    return NextResponse.json({ source: "fallback", spec: fb() });
  }
}
