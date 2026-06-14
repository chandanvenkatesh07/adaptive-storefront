"use client";
import type { Intent } from "@/lib/schema";

// The signature element: the inferred intent, shown like a gauge readout.
// This is the whole thesis made visible — intent is a legible artifact,
// not a hidden black box. It flips when the shopper switches use cases.

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="ir-row">
      <span className="ir-k">{k}</span>
      <span className="ir-v">{v}</span>
    </div>
  );
}

export function IntentReadout({ intent, source }: { intent: Intent; source: string }) {
  return (
    <aside className="readout" aria-label="Inferred shopper intent">
      <div className="ir-head">
        <span className="ir-dot" />
        <span className="ir-title">INFERRED INTENT</span>
        <span className={`ir-src ir-${source}`}>{source === "preset" ? "curated" : source}</span>
      </div>
      <div className="ir-mode">{intent.mode === "gift" ? "GIFT SHOPPING" : "REPAIR / PROJECT"}</div>
      <p className="ir-summary">{intent.summary}</p>
      <div className="ir-grid">
        <Row k="stage" v={intent.stage} />
        <Row k="expertise" v={intent.expertise} />
        <Row k="recipient" v={intent.recipient} />
        <Row k="budget" v={intent.budget} />
      </div>
      <div className="ir-foot">AI proposes this layout · you can steer it</div>
    </aside>
  );
}
