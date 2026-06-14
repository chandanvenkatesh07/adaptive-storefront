"use client";
import { useState, useEffect, useCallback } from "react";
import { RenderPage } from "@/components/Renderer";
import { IntentReadout } from "@/components/IntentReadout";
import { PRESETS } from "@/lib/fallback";
import type { PageSpec } from "@/lib/schema";

type Result = { spec: PageSpec; source: string };

export default function Home() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState("");
  const [active, setActive] = useState<string>("");

  // Every path is live: the model assembles the page fresh each time, grounded
  // in the 16 catalog items. A scenario button fixes the USE CASE; the model
  // varies the rendering — so two clicks on the same button differ slightly.
  const render = useCallback(async (input: string, presetKey?: string) => {
    setLoading(true);
    setActive(presetKey || "custom");
    if (presetKey) setCustom("");
    // Keep the scenario shareable so a link lands on the same use case.
    if (presetKey && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("case", presetKey);
      window.history.replaceState({}, "", url);
    }
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input, presetKey }),
      });
      const data = await res.json();
      setResult({ spec: data.spec, source: data.source });
    } catch {
      const fb = presetKey && PRESETS[presetKey] ? PRESETS[presetKey].spec : PRESETS.repair.spec;
      setResult({ spec: fb, source: "fallback" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep-link: /?case=gift generates the gift scenario on arrival.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = new URL(window.location.href).searchParams.get("case");
    if (key && PRESETS[key]) render(PRESETS[key].input, key);
  }, [render]);

  return (
    <main>
      <header className="top">
        <div className="brand-mark">
          <span className="logo">▣</span>
          <span>ADAPTIVE&nbsp;STOREFRONT</span>
        </div>
        <div className="tag">one catalog · the layout changes with intent</div>
      </header>

      <section className="intro">
        <h1>
          The same store,<br />
          <span className="accent">rebuilt around what you came to do.</span>
        </h1>
        <p>
          Pick a shopper below. Every one hits the <em>same</em> 16-item catalog — but the page
          assembles different blocks, in a different order, because the goal is different.
          The model lays it out live; it can never invent a product.
        </p>
      </section>

      <div className="controls">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            className={`preset ${active === key ? "on" : ""}`}
            onClick={() => render(p.input, key)}
            disabled={loading}
          >
            <span className="preset-label">{p.label}</span>
            <span className="preset-input">“{p.input}”</span>
          </button>
        ))}
      </div>

      <div className="custom-row">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="…or describe your own shopper — e.g. 'building a raised garden bed'"
          onKeyDown={(e) => e.key === "Enter" && custom.trim() && render(custom)}
          disabled={loading}
        />
        <button className="go" disabled={loading || !custom.trim()} onClick={() => custom.trim() && render(custom)}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {loading && <div className="skeleton">Assembling the page for this intent…</div>}

      {result && !loading && (
        <div className="result">
          <IntentReadout intent={result.spec.intent} source={result.source} />
          <RenderPage spec={result.spec} />
        </div>
      )}

      {!result && !loading && (
        <div className="empty">Choose a shopper to see the storefront assemble itself.</div>
      )}

      <footer className="foot">
        Generated live each time, grounded in 16 real products · a scenario button fixes the use
        case, the model varies the layout · binds only to real catalog items ·{" "}
        <span className="src-note">badge: “live” = model-generated this load, “fallback” = safety net when the model is unavailable</span>
      </footer>
    </main>
  );
}
