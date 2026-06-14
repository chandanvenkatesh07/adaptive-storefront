"use client";
import type { Intent } from "@/lib/schema";
import type { EvidenceTrace } from "@/lib/signals";

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="ir-row">
      <span className="ir-k">{k}</span>
      <span className="ir-v">{v}</span>
    </div>
  );
}

const CONFIDENCE_LABEL: Record<EvidenceTrace["confidence"], string> = {
  high:   "HIGH",
  medium: "MED",
  low:    "LOW",
  none:   "NONE",
};

function EvidenceSection({ evidence }: { evidence: EvidenceTrace }) {
  if (evidence.items.length === 0 && !evidence.conflictNote) {
    return (
      <div className="ir-evidence">
        <div className="ir-evidence-title">SIGNAL EVIDENCE</div>
        <div className="ir-ev-empty">No signals — showing popular defaults</div>
      </div>
    );
  }

  return (
    <div className="ir-evidence">
      <div className="ir-evidence-title">
        SIGNAL EVIDENCE
        <span className={`ir-conf ir-conf-${evidence.confidence}`}>
          {CONFIDENCE_LABEL[evidence.confidence]}
        </span>
      </div>
      <div className="ir-ev-items">
        {evidence.items.map((item, i) => (
          <div key={i} className="ir-ev-item">
            <div className="ir-ev-label">{item.label}</div>
            <div className="ir-ev-bar-row">
              <div className="ir-ev-bar">
                <div
                  className={`ir-ev-fill ${item.outcome}`}
                  style={{ width: `${Math.round(item.weight * 100)}%` }}
                />
              </div>
              <span className={`ir-ev-badge badge-${item.outcome}`}>{item.outcome}</span>
            </div>
            {item.note && <div className="ir-ev-note">{item.note}</div>}
          </div>
        ))}
      </div>
      {evidence.conflictNote && (
        <div className="ir-conflict">{evidence.conflictNote}</div>
      )}
    </div>
  );
}

export function IntentReadout({
  intent,
  source,
  evidence,
}: {
  intent: Intent;
  source: string;
  evidence?: EvidenceTrace;
}) {
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
      {evidence && <EvidenceSection evidence={evidence} />}
      <div className="ir-foot">
        {evidence ? "Inferred from signals · AI proposes layout" : "AI proposes this layout · you can steer it"}
      </div>
    </aside>
  );
}
