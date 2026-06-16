import type { PageSpec } from "./schema";

// Pre-generated, hand-verified specs for the demo presets. Presets are served
// DETERMINISTICALLY (no model call) so every viewer sees byte-identical output.
// Only the free-text custom path hits the live model. Order here = button order.

export const PRESETS: Record<string, { label: string; input: string; spec: PageSpec }> = {
  repair: {
    label: "Fix a leaky faucet",
    input: "My kitchen faucet is leaking and I've never fixed one before.",
    spec: {
      intent: {
        mode: "repair",
        summary: "First-time fixer diagnosing a single-handle kitchen faucet leak",
        stage: "diagnosing",
        expertise: "novice",
        budget: "under $50",
      },
      blocks: [
        { type: "hero", headline: "Let's stop that drip — no plumber needed", sub: "Most single-handle leaks are a worn washer or O-ring. Here's the fix and the exact parts." },
        { type: "guide", title: "Fix it in 5 steps", steps: [
          "Shut off the water at the valves under the sink, then open the faucet to drain it.",
          "Pop the handle cap, unscrew the handle, and lift out the cartridge.",
          "Replace the worn washers and O-rings from the repair kit.",
          "Wrap thread tape on the connections, reassemble, and reseal the base.",
          "Turn the water back on slowly and check for drips.",
        ] },
        { type: "productGrid", title: "Exactly what you'll need", productIds: ["sku_faucet_kit", "sku_plumbers_tape", "sku_adj_wrench", "sku_basin_wrench", "sku_silicone"] },
        { type: "comparison", title: "If it's beyond repair: replace instead", productIds: ["sku_full_faucet", "sku_supply_lines"] },
      ],
    },
  },

  gift: {
    label: "Gift for a DIY dad",
    input: "Looking for a Father's Day gift for my dad who loves DIY projects.",
    spec: {
      intent: {
        mode: "gift",
        summary: "Father's Day gift for a hands-on, DIY-loving dad",
        recipient: "Dad — enjoys DIY & weekend projects",
        stage: "exploring",
        expertise: "unknown",
        budget: "flexible",
      },
      blocks: [
        { type: "hero", headline: "A gift he'll actually reach for", sub: "For the dad whose happy place is a project. Picked for people who like making and fixing." },
        { type: "giftCollection", title: "DIY dad favorites", note: "Sorted by how often it gets used after the wrapping comes off.", productIds: ["sku_multitool", "sku_drill_combo", "sku_headlamp", "sku_laser_level", "sku_toolbag", "sku_workgloves"] },
        { type: "comparison", title: "Three that always land", productIds: ["sku_multitool", "sku_drill_combo", "sku_grill_set"] },
      ],
    },
  },

  appliance: {
    label: "Compare dishwashers",
    input: "I'm replacing an older dishwasher and want a quiet stainless model without missing the install parts.",
    spec: {
      intent: {
        mode: "appliance",
        summary: "High-consideration dishwasher buyer comparing quiet, stainless, and install-ready options",
        stage: "comparing",
        expertise: "unknown",
        budget: "flexible",
      },
      blocks: [
        { type: "hero", headline: "Pick the dishwasher before the installer shows up", sub: "Compare quiet stainless models, confirm the fit, and add the parts a replacement usually needs." },
        { type: "comparison", title: "Three dishwasher paths", productIds: ["sku_dishwasher_budget", "sku_dishwasher_quiet_stainless", "sku_dishwasher_third_rack"] },
        { type: "productGrid", title: "Dishwashers and install essentials", productIds: ["sku_dishwasher_quiet_stainless", "sku_dishwasher_compact", "sku_dishwasher_install_kit", "sku_dishwasher_supply_line", "sku_dishwasher_detergent_pods", "sku_appliance_cleaner"] },
        { type: "guide", title: "Buying checklist before checkout", steps: [
          "Measure the cabinet opening and confirm whether you need a standard 24 in. or compact 18 in. model.",
          "Compare noise level, finish, rack layout, and budget before choosing the dishwasher.",
          "Add the install kit and supply line if the old hookups are worn or missing.",
          "Check delivery, haul-away, and installation timing before you schedule the replacement.",
        ] },
      ],
    },
  },

  outdoor: {
    label: "Refresh the patio",
    input: "I'm browsing outdoor and garden ideas for spring.",
    spec: {
      intent: {
        mode: "outdoor",
        summary: "Soft outdoor and seasonal interest, likely browsing patio and garden upgrades",
        stage: "exploring",
        expertise: "unknown",
        budget: "flexible",
      },
      blocks: [
        { type: "hero", headline: "Make the outside feel ready for the weekend", sub: "Seasonal picks for the patio, garden, and the small upgrades that make outdoor space easier to use." },
        { type: "productGrid", title: "Outdoor picks worth a look", productIds: ["sku_string_lights", "sku_bistro_set", "sku_expandable_hose", "sku_garden_bed", "sku_potting_soil", "sku_grill_set"] },
        { type: "comparison", title: "Small upgrades, different jobs", productIds: ["sku_string_lights", "sku_expandable_hose", "sku_garden_bed"] },
      ],
    },
  },

  default: {
    label: "Browse best sellers",
    input: "New shopper with no history or signals.",
    spec: {
      intent: {
        mode: "default",
        summary: "Cold-start shopper with no signal history",
        stage: "browsing",
        expertise: "unknown",
        budget: "unknown",
      },
      blocks: [
        { type: "hero", headline: "Start with the products most homes eventually need", sub: "A grounded default shelf of popular, in-stock basics across lighting, tools, paint, and workwear." },
        { type: "productGrid", title: "Popular this week", productIds: ["sku_led_bulbs", "sku_thermostat", "sku_step_ladder", "sku_paint_kit", "sku_multitool", "sku_drill_combo"] },
      ],
    },
  },

  starter: {
    label: "Build a starter toolkit",
    input: "I just moved into my first place and own zero tools. Where do I start?",
    spec: {
      intent: {
        mode: "repair",
        summary: "First-time tool buyer equipping an empty toolbox from scratch",
        stage: "equipping",
        expertise: "novice",
        budget: "building up",
      },
      blocks: [
        { type: "hero", headline: "Start with the few tools you'll actually use", sub: "Skip the 200-piece kit. These earn their place from day one — add the rest as projects come up." },
        { type: "productGrid", title: "The essential five", productIds: ["sku_adj_wrench", "sku_multitool", "sku_workgloves", "sku_toolbag", "sku_headlamp"] },
        { type: "comparison", title: "When you're ready to power up", productIds: ["sku_drill_combo", "sku_laser_level"] },
      ],
    },
  },

  project: {
    label: "Start a build project",
    input: "I'm starting a workshop project and need a drill, circular saw, and the right bits.",
    spec: {
      intent: {
        mode: "project",
        summary: "Active builder equipping for a woodworking or construction project",
        stage: "equipping",
        expertise: "intermediate",
        budget: "flexible",
      },
      blocks: [
        { type: "hero", headline: "What are you building?", sub: "Power tools and accessories for the project you've been putting off. Start with the right setup and add as you go." },
        { type: "productGrid", title: "The tools you'll reach for", productIds: ["sku_drill_combo", "sku_circular_saw", "sku_drill_bits", "sku_saw_blades"] },
        { type: "guide", title: "Set up your workspace in 4 steps", steps: [
          "Start with a drill/driver combo — it handles 80% of fastening jobs before you need anything else.",
          "Add a circular saw when you're cutting sheet goods or framing lumber.",
          "Stock the right bits and blades for your material; dull tooling is the #1 cause of bad cuts.",
          "Keep a dedicated workbench or flat surface — improvised setups cause more mistakes than bad tools.",
        ] },
        { type: "comparison", title: "The two most-reached-for tools", productIds: ["sku_drill_combo", "sku_circular_saw"] },
      ],
    },
  },

  budget: {
    label: "Housewarming gift under $50",
    input: "Need a housewarming gift for a new homeowner, but keep it under $50.",
    spec: {
      intent: {
        mode: "gift",
        summary: "Practical housewarming gift for a new homeowner, capped at $50",
        recipient: "New homeowner",
        stage: "exploring",
        expertise: "unknown",
        budget: "under $50 (hard cap)",
      },
      blocks: [
        { type: "hero", headline: "A housewarming gift that gets used, not shelved", sub: "Practical picks for someone setting up a home — every option here stays under $50." },
        { type: "giftCollection", title: "Under $50, all genuinely useful", note: "Filtered to the budget — the $149 drill set didn't make the cut, on purpose.", productIds: ["sku_multitool", "sku_toolbag", "sku_headlamp", "sku_workgloves", "sku_grill_set"] },
        { type: "comparison", title: "Three that always land", productIds: ["sku_multitool", "sku_toolbag", "sku_grill_set"] },
      ],
    },
  },
};
