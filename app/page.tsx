"use client";
import { useState, useEffect, useCallback } from "react";
import { RenderPage } from "@/components/Renderer";
import { IntentReadout } from "@/components/IntentReadout";
import { PRESETS } from "@/lib/fallback";
import { PERSONAS } from "@/lib/personas";
import { inferFromSignals } from "@/lib/signals";
import type { EvidenceTrace } from "@/lib/signals";
import type { PageSpec } from "@/lib/schema";

type Result = { spec: PageSpec; source: string; evidence?: EvidenceTrace };

const SIGNAL_TYPE_CLASS: Record<string, string> = {
  search:       "chip chip-search",
  purchase:     "chip chip-purchase",
  cart_abandon: "chip chip-cart_abandon",
  email_click:  "chip chip-email_click",
  ad_click:     "chip chip-ad_click",
};


export default function Home() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState("");
  const [active, setActive] = useState<string>("");

  const render = useCallback(async (input: string, presetKey?: string, evidence?: EvidenceTrace) => {
    setLoading(true);
    setActive(presetKey || "custom");
    if (presetKey) setCustom("");
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
      setResult({ spec: data.spec, source: data.source, evidence });
    } catch {
      const fb = presetKey && PRESETS[presetKey] ? PRESETS[presetKey].spec : PRESETS.repair.spec;
      setResult({ spec: fb, source: "fallback", evidence });
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePersona = useCallback((personaId: string) => {
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    const { description, evidence } = inferFromSignals(persona.signals);
    setActive(`persona_${personaId}`);
    render(description, undefined, evidence);
  }, [render]);

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
          Click a shopper persona below — the page assembles itself from their signals, with no
          input typed. Or pick a typed scenario, or describe your own. Every path hits the{" "}
          <em>same</em> 32-item catalog; the model selects and orders blocks, never invents a product.
        </p>
      </section>

      {/* Persona cards — zero-input personalization */}
      <div className="persona-section">
        <div className="persona-section-label">SIGNAL-DRIVEN PERSONAS — land as if you just signed in</div>
        <div className="personas">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              className={`persona ${active === `persona_${persona.id}` ? "on" : ""}`}
              onClick={() => handlePersona(persona.id)}
              disabled={loading}
            >
              <div className="persona-name">{persona.name}</div>
              <div className="persona-role">{persona.role}</div>
              {persona.signals.length > 0 ? (
                <div className="persona-chips">
                  {persona.signals.map((s, i) => (
                    <span key={i} className={SIGNAL_TYPE_CLASS[s.type]}>
                      {s.value}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="persona-chips">
                  <span className="chip chip-none">no signals</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Existing typed scenarios */}
      <div className="section-divider">
        <span>or try a typed scenario</span>
      </div>

      <div className="controls">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            className={`preset ${active === key ? "on" : ""}`}
            onClick={() => render(p.input, key)}
            disabled={loading}
          >
            <span className="preset-label">{p.label}</span>
            <span className="preset-input">"{p.input}"</span>
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
        <button
          className="go"
          disabled={loading || !custom.trim()}
          onClick={() => custom.trim() && render(custom)}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {loading && <div className="skeleton">Assembling the page for this intent…</div>}

      {result && !loading && (
        <div className="result">
          <IntentReadout intent={result.spec.intent} source={result.source} evidence={result.evidence} />
          <RenderPage spec={result.spec} />
        </div>
      )}

      {!result && !loading && (
        <div className="empty">Click a persona or choose a scenario to see the storefront assemble itself.</div>
      )}

      <footer className="foot">
        Generated live each time, grounded in 32 real products · personas infer intent from mocked signals ·
        binds only to real catalog items ·{" "}
        <span className="src-note">
          badge: "live" = model-generated this load, "fallback" = safety net when the model is unavailable
        </span>
      </footer>
    </main>
  );
}
