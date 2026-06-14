// The catalog is the system of record. The model may SELECT products by id,
// but it can never invent a product, price, or stock status. Anything the model
// emits that isn't a real id here is dropped at bind time (see lib/schema.ts).

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  rating: number;
  category: string;
  blurb: string;
  tags: string[];
  inStock: boolean;
};

export const CATALOG: Product[] = [
  // --- repair / plumbing (convergent shopper) ---
  { id: "sku_faucet_kit", name: "Faucet Repair Kit (Universal)", brand: "FixRight", price: 14.98, rating: 4.5, category: "Plumbing", blurb: "Washers, O-rings, and seats for the most common single-handle leaks.", tags: ["repair", "leak", "beginner", "plumbing"], inStock: true },
  { id: "sku_basin_wrench", name: "Basin Wrench, 10 in.", brand: "FixRight", price: 18.47, rating: 4.6, category: "Tools", blurb: "Reaches the cramped nut behind a sink that no normal wrench can.", tags: ["repair", "plumbing", "tool"], inStock: true },
  { id: "sku_plumbers_tape", name: "PTFE Thread Seal Tape", brand: "SealPro", price: 3.29, rating: 4.7, category: "Plumbing", blurb: "Stops thread leaks. The cheapest insurance in plumbing.", tags: ["repair", "leak", "beginner", "plumbing"], inStock: true },
  { id: "sku_silicone", name: "Kitchen & Bath Silicone Sealant", brand: "SealPro", price: 6.98, rating: 4.4, category: "Plumbing", blurb: "Waterproof seal around the faucet base after the fix.", tags: ["repair", "leak", "plumbing"], inStock: true },
  { id: "sku_adj_wrench", name: 'Adjustable Wrench, 8 in.', brand: "GripCo", price: 11.97, rating: 4.6, category: "Tools", blurb: "The one wrench a first-time fixer actually needs.", tags: ["repair", "tool", "beginner"], inStock: true },
  { id: "sku_full_faucet", name: "Single-Handle Pull-Down Faucet", brand: "Cascade", price: 129.0, rating: 4.5, category: "Plumbing", blurb: "If the old one's beyond saving — spot-resist finish, ceramic disc.", tags: ["replace", "plumbing", "upgrade"], inStock: true },
  { id: "sku_supply_lines", name: "Braided Supply Lines (2-pack)", brand: "Cascade", price: 9.47, rating: 4.6, category: "Plumbing", blurb: "Replace the lines while you're under there. They fail too.", tags: ["repair", "replace", "plumbing"], inStock: true },

  // --- DIY gift candidates (divergent shopper) ---
  { id: "sku_multitool", name: "15-in-1 Pocket Multi-Tool", brand: "GripCo", price: 39.99, rating: 4.8, category: "Tools", blurb: "Pliers, drivers, blade — the everyday-carry every DIY dad reaches for.", tags: ["gift", "tool", "popular", "dad"], inStock: true },
  { id: "sku_drill_combo", name: "20V Cordless Drill + Impact Driver Set", brand: "VoltEdge", price: 149.0, rating: 4.7, category: "Power Tools", blurb: "The gift that gets used every weekend. Two batteries, hard case.", tags: ["gift", "power-tool", "premium", "dad"], inStock: true },
  { id: "sku_headlamp", name: "Rechargeable LED Headlamp", brand: "BeamWorks", price: 24.95, rating: 4.6, category: "Lighting", blurb: "Hands-free light for under-sink, attic, and grill-at-dusk duty.", tags: ["gift", "popular", "dad"], inStock: true },
  { id: "sku_workgloves", name: "Leather Work Gloves", brand: "GripCo", price: 19.99, rating: 4.5, category: "Workwear", blurb: "Padded palm, real leather. A small gift that earns daily use.", tags: ["gift", "dad", "affordable"], inStock: true },
  { id: "sku_toolbag", name: "16 in. Heavy-Duty Tool Bag", brand: "GripCo", price: 34.5, rating: 4.6, category: "Storage", blurb: "Wide-mouth, reinforced base. Upgrades the bucket he's been using.", tags: ["gift", "dad", "storage"], inStock: true },
  { id: "sku_laser_level", name: "Self-Leveling Laser Level", brand: "VoltEdge", price: 59.0, rating: 4.5, category: "Tools", blurb: "Makes him look like a pro hanging shelves. Genuinely fun to use.", tags: ["gift", "premium", "dad", "popular"], inStock: true },
  { id: "sku_grill_set", name: "Stainless BBQ Tool Set (5-pc)", brand: "EmberCo", price: 44.0, rating: 4.7, category: "Outdoor", blurb: "For the dad whose real workshop is the backyard grill.", tags: ["gift", "dad", "outdoor"], inStock: true },
  { id: "sku_giftcard", name: "Gift Card", brand: "Store", price: 50.0, rating: 4.9, category: "Gift Cards", blurb: "When you're not sure — let him pick the project.", tags: ["gift", "safe", "dad"], inStock: true },
  { id: "sku_apron", name: "Waxed Canvas Workshop Apron", brand: "EmberCo", price: 49.0, rating: 4.6, category: "Workwear", blurb: "Tool pockets, rugged, ages well. A gift that looks like a gift.", tags: ["gift", "premium", "dad"], inStock: false },

  // --- outdoor / seasonal cluster (feeds the soft-signal "nudged browser") ---
  { id: "sku_bistro_set", name: "3-Piece Patio Bistro Set", brand: "Veranda", price: 189.0, rating: 4.4, category: "Outdoor", blurb: "Two chairs and a café table for a balcony or small porch.", tags: ["outdoor", "patio", "seasonal", "upgrade"], inStock: true },
  { id: "sku_string_lights", name: "48 ft. Outdoor String Lights", brand: "BeamWorks", price: 32.99, rating: 4.7, category: "Lighting", blurb: "Weatherproof bulbs that turn a patio into a place to sit.", tags: ["outdoor", "patio", "seasonal", "gift", "popular"], inStock: true },
  { id: "sku_propane_grill", name: "4-Burner Propane Gas Grill", brand: "EmberCo", price: 329.0, rating: 4.5, category: "Outdoor", blurb: "Even heat, side burner, fits a family cookout.", tags: ["outdoor", "seasonal", "premium"], inStock: true },
  { id: "sku_expandable_hose", name: "Expandable Garden Hose, 50 ft.", brand: "TerraGrow", price: 27.5, rating: 4.2, category: "Garden", blurb: "Lightweight and kink-resistant; shrinks down for storage.", tags: ["outdoor", "garden", "seasonal"], inStock: true },
  { id: "sku_garden_bed", name: "Raised Garden Bed Kit, 4x4 ft.", brand: "TerraGrow", price: 79.0, rating: 4.6, category: "Garden", blurb: "Cedar-tone boards snap together — no tools needed.", tags: ["outdoor", "garden", "seasonal", "project"], inStock: true },
  { id: "sku_potting_soil", name: "All-Purpose Potting Mix, 2 cu. ft.", brand: "TerraGrow", price: 12.98, rating: 4.5, category: "Garden", blurb: "For beds and containers. The thing you always need one more bag of.", tags: ["outdoor", "garden", "consumable", "seasonal"], inStock: true },

  // --- power-tool accessories (feeds "complement a past purchase" logic) ---
  { id: "sku_drill_bits", name: "Titanium Drill Bit Set (29-pc)", brand: "VoltEdge", price: 21.99, rating: 4.6, category: "Power Tools", blurb: "The bits that should have come in the box with the drill.", tags: ["power-tool", "accessory", "consumable"], inStock: true },
  { id: "sku_circular_saw", name: "20V Cordless Circular Saw", brand: "VoltEdge", price: 99.0, rating: 4.5, category: "Power Tools", blurb: "Shares batteries with the drill set. Clean, straight cuts.", tags: ["power-tool", "project", "premium"], inStock: true },
  { id: "sku_saw_blades", name: "7-1/4 in. Saw Blades (3-pack)", brand: "VoltEdge", price: 16.47, rating: 4.4, category: "Power Tools", blurb: "Framing and finish blades for the circular saw.", tags: ["power-tool", "accessory", "consumable"], inStock: true },

  // --- plumbing depth (feeds the strong-signal "mid-repair homeowner") ---
  { id: "sku_pipe_wrench", name: "Pipe Wrench, 14 in.", brand: "FixRight", price: 22.98, rating: 4.6, category: "Tools", blurb: "Heavy-duty grip for threaded pipe and stubborn fittings.", tags: ["repair", "plumbing", "tool"], inStock: true },
  { id: "sku_drain_snake", name: "25 ft. Drain Auger", brand: "FixRight", price: 26.99, rating: 4.4, category: "Plumbing", blurb: "Clears the clog a plunger can't reach.", tags: ["repair", "plumbing"], inStock: true },
  { id: "sku_aerator", name: "Faucet Aerator, Universal Fit", brand: "SealPro", price: 4.49, rating: 4.5, category: "Plumbing", blurb: "Restores flow and stops a splashy faucet in a minute.", tags: ["repair", "plumbing", "consumable", "beginner"], inStock: true },

  // --- broad best-sellers (feeds the cold-start "blank slate" default) ---
  { id: "sku_led_bulbs", name: "LED Light Bulbs, 60W (4-pack)", brand: "BeamWorks", price: 8.97, rating: 4.8, category: "Lighting", blurb: "Warm white, lasts years. The default refill everyone buys.", tags: ["popular", "consumable", "best-seller"], inStock: true },
  { id: "sku_thermostat", name: "Smart Programmable Thermostat", brand: "BrightHome", price: 119.0, rating: 4.6, category: "Smart Home", blurb: "Learns your schedule and trims the heating bill.", tags: ["popular", "upgrade", "best-seller", "gift"], inStock: true },
  { id: "sku_step_ladder", name: "4 ft. Aluminum Step Ladder", brand: "GripCo", price: 44.98, rating: 4.7, category: "Tools", blurb: "Lightweight, locks flat, fits in a closet. Everyone needs one.", tags: ["popular", "best-seller", "home"], inStock: true },
  { id: "sku_paint_kit", name: "Paint Roller & Tray Kit (9-pc)", brand: "GripCo", price: 17.99, rating: 4.5, category: "Paint", blurb: "Everything for a weekend room refresh — except the paint.", tags: ["project", "popular", "best-seller"], inStock: true },
];

export const byId = (id: string) => CATALOG.find((p) => p.id === id);

// A compact view handed to the model — names + ids + tags only.
// Deliberately omits nothing real and adds nothing fake.
export const catalogSummary = () =>
  CATALOG.map((p) => `${p.id} | ${p.name} | $${p.price} | ${p.category} | ${p.inStock ? "in stock" : "OUT"} | ${p.tags.join(",")}`).join("\n");
