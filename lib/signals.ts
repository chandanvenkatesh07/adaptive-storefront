import type { Signal, SignalType } from "./personas";

export type EvidenceItem = {
  label: string;
  weight: number;                                  // 0–1, used to draw the weight bar
  outcome: "fired" | "suppressed" | "overridden";
  note?: string;
};

export type EvidenceTrace = {
  items: EvidenceItem[];
  confidence: "high" | "medium" | "low" | "none";
  conflictNote?: string;
};

export type InferredInput = {
  description: string;    // passed to render API as the `input` string
  evidence: EvidenceTrace;
};

// Base signal weights by type — reflects how trustworthy each signal is inherently.
const TYPE_BASE: Record<SignalType, number> = {
  search:       1.0,
  cart_abandon: 0.85,
  purchase:     0.75,
  email_click:  0.5,
  ad_click:     0.3,
};

const TYPE_LABEL: Record<SignalType, string> = {
  search:       "Search",
  purchase:     "Purchase",
  cart_abandon: "Abandoned cart",
  email_click:  "Email click",
  ad_click:     "Ad click",
};

export function inferFromSignals(signals: Signal[]): InferredInput {
  if (signals.length === 0) {
    return {
      description:
        "New shopper with no purchase history, no searches, no behavioral signals. Cold start. " +
        "Show a broadly useful default — popular, in-stock items across categories that any new homeowner would use.",
      evidence: { items: [], confidence: "none" },
    };
  }

  const searches      = signals.filter((s) => s.type === "search");
  const durablePurch  = signals.filter((s) => s.type === "purchase" && s.consumable === false);

  // Conflict: explicit fresh search vs stale durable purchase history.
  // If search weight is at least 2× the durable purchase weight, search wins.
  const searchWeight  = searches.reduce((sum, s) => sum + TYPE_BASE.search * s.recency * s.confidence, 0);
  const durableWeight = durablePurch.reduce((sum, s) => sum + TYPE_BASE.purchase * s.recency * s.confidence * 0.5, 0);
  const hasConflict   = searches.length > 0 && durablePurch.length > 0 && searchWeight > durableWeight * 2;

  const conflictNote = hasConflict
    ? `Explicit search intent (${searches.map((s) => `"${s.value}"`).join(", ")}) overrides stale purchase history.`
    : undefined;

  const evidenceItems: EvidenceItem[] = [];
  let totalPositiveWeight = 0;

  for (const signal of signals) {
    const typeBase  = TYPE_BASE[signal.type];
    const rawWeight = typeBase * signal.recency * signal.confidence;

    let outcome: EvidenceItem["outcome"] = "fired";
    let note: string | undefined;

    if (signal.type === "purchase" && signal.consumable === false) {
      if (hasConflict) {
        outcome = "overridden";
        note    = "overridden by fresh search intent";
      } else {
        outcome = "suppressed";
        note    = "durable — already owned, suppresses repeat";
      }
    }

    if (outcome === "fired") totalPositiveWeight += rawWeight;

    evidenceItems.push({
      label:   `${TYPE_LABEL[signal.type]}: "${signal.value}"`,
      weight:  rawWeight,
      outcome,
      note,
    });
  }

  const confidence: EvidenceTrace["confidence"] =
    totalPositiveWeight > 1.5 ? "high"
    : totalPositiveWeight > 0.6 ? "medium"
    : totalPositiveWeight > 0   ? "low"
    : "none";

  return {
    description: buildDescription(signals, hasConflict, conflictNote),
    evidence: { items: evidenceItems, confidence, conflictNote },
  };
}

function buildDescription(signals: Signal[], hasConflict: boolean, conflictNote?: string): string {
  const searches     = signals.filter((s) => s.type === "search");
  const cartAbandons = signals.filter((s) => s.type === "cart_abandon");
  const purchases    = signals.filter((s) => s.type === "purchase");
  const emailClicks  = signals.filter((s) => s.type === "email_click");
  const adClicks     = signals.filter((s) => s.type === "ad_click");

  const parts: string[] = [];

  if (searches.length > 0)
    parts.push(`Recent searches: ${searches.map((s) => `"${s.value}"`).join(", ")}.`);
  if (cartAbandons.length > 0)
    parts.push(`Abandoned cart: ${cartAbandons.map((s) => s.value).join(", ")}.`);
  if (purchases.length > 0)
    parts.push(`Purchase history: ${purchases.map((s) => `${s.value} (${s.consumable ? "consumable" : "durable — already owned"})`).join("; ")}.`);
  if (emailClicks.length > 0)
    parts.push(`Clicked email: ${emailClicks.map((s) => s.value).join(", ")}.`);
  if (adClicks.length > 0)
    parts.push(`Clicked ad: ${adClicks.map((s) => s.value).join(", ")}.`);
  if (conflictNote)
    parts.push(conflictNote);

  return parts.join(" ");
}
