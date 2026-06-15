export type SignalType = "search" | "purchase" | "cart_abandon" | "email_click" | "ad_click";

export type Signal = {
  type: SignalType;
  value: string;
  tags: string[];
  recency: number;       // 0–1, how recent (1 = just now, decays with age)
  confidence: number;    // 0–1, inherent signal trustworthiness
  consumable?: boolean;  // purchase only: consumable = complement, durable = suppress
};

export type Persona = {
  id: string;
  name: string;
  role: string;          // shown on the card
  signals: Signal[];
};

// Four personas, each stressing a different part of the inference logic.
// Signals are mocked fixtures — there is no real CDP/event stream.
export const PERSONAS: Persona[] = [
  {
    id: "mid_repair",
    name: "Mid-Repair Homeowner",
    role: "Convergent — active repair in progress",
    signals: [
      { type: "search",       value: "faucet cartridge",  tags: ["repair", "plumbing"],         recency: 1.0, confidence: 1.0 },
      { type: "search",       value: "drain snake",        tags: ["repair", "plumbing"],         recency: 0.85, confidence: 1.0 },
      { type: "cart_abandon", value: "faucet repair kit",  tags: ["repair", "plumbing"],         recency: 0.75, confidence: 0.9 },
    ],
  },
  {
    id: "gift_conflict",
    name: "Gift Shopper",
    role: "Conflict — fresh search beats stale history",
    signals: [
      { type: "search",    value: "Father's Day gift",  tags: ["gift", "dad"],            recency: 1.0, confidence: 1.0 },
      { type: "purchase",  value: "20V drill combo",    tags: ["power-tool", "premium"],  recency: 0.2, confidence: 0.9, consumable: false },
      { type: "email_click", value: "tools sale email", tags: ["tool"],                   recency: 0.5, confidence: 0.6 },
    ],
  },
  {
    id: "nudged_browser",
    name: "Nudged Browser",
    role: "Weak signal — outdoor/seasonal, low confidence",
    signals: [
      { type: "email_click", value: "spring outdoor email",  tags: ["outdoor", "patio", "seasonal"], recency: 0.7, confidence: 0.6 },
      { type: "ad_click",    value: "patio furniture ad",    tags: ["outdoor", "patio"],             recency: 0.6, confidence: 0.3 },
      { type: "purchase",    value: "propane grill",         tags: ["outdoor", "seasonal"],          recency: 0.3, confidence: 0.9, consumable: false },
    ],
  },
  {
    id: "blank_slate",
    name: "Blank Slate",
    role: "Cold start — no history",
    signals: [],
  },
  {
    id: "budget_gift",
    name: "Budget Gift Shopper",
    role: "Housewarming gift — price-sensitive, under $50",
    signals: [
      { type: "search",   value: "housewarming gift under 50",  tags: ["gift", "affordable"], recency: 1.0, confidence: 1.0 },
      { type: "search",   value: "practical home gift",          tags: ["gift", "popular"],    recency: 0.7, confidence: 0.9 },
    ],
  },
];
