"use client";

import { useEffect, useRef, useState } from "react";
import { generatePage, type GeneratedPage } from "@/app/actions";
import { ComparisonSection } from "@/components/sections/ComparisonSection";
import { GuideSection } from "@/components/sections/GuideSection";
import { HeroBanner } from "@/components/sections/HeroBanner";
import { PageSkeleton } from "@/components/sections/PageSkeleton";
import { ProductGridSection } from "@/components/sections/ProductGridSection";
import { byId } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { PRESETS } from "@/lib/fallback";
import { usePersona } from "@/lib/persona-context";
import type { Persona } from "@/lib/personas";
import { inferFromSignals } from "@/lib/signals";
import type { EvidenceTrace } from "@/lib/signals";

const PERSONA_PRESET: Record<string, keyof typeof PRESETS> = {
  mid_repair: "repair",
  gift_conflict: "gift",
  nudged_browser: "outdoor",
  blank_slate: "default",
};

const BEST_SELLER_IDS = [
  "sku_led_bulbs",
  "sku_thermostat",
  "sku_step_ladder",
  "sku_paint_kit",
  "sku_multitool",
  "sku_drill_combo",
  "sku_headlamp",
  "sku_workgloves",
];

function productsFromIds(productIds: string[]): Product[] {
  return productIds.map((id) => byId(id)).filter(Boolean) as Product[];
}

function EvidenceBar({
  persona,
  evidence,
  fromAI,
}: {
  persona: Persona;
  evidence: EvidenceTrace;
  fromAI: boolean;
}) {
  const confidenceColor = {
    high: "text-brand",
    medium: "text-steel",
    low: "text-steel-2",
    none: "text-steel-2",
  }[evidence.confidence];

  return (
    <div className="bg-ink rounded-lg px-5 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_6px_#E8552D]" />
        <span className="font-mono text-xs text-white/50 uppercase tracking-widest">
          Signal Evidence
        </span>
        <span className={`font-mono text-xs font-bold uppercase tracking-widest ${confidenceColor}`}>
          {evidence.confidence}
        </span>
        {fromAI && (
          <span className="font-mono text-xs bg-brand/20 text-brand px-2 py-0.5 rounded uppercase tracking-wider">
            AI
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {evidence.items.map((item, i) => (
          <span
            key={i}
            className={`font-mono text-xs px-2 py-0.5 rounded ${
              item.outcome === "fired" ? "bg-brand/20 text-brand"
              : item.outcome === "suppressed" ? "bg-white/10 text-white/40 line-through"
              : "bg-white/5 text-white/30 line-through"
            }`}
          >
            {item.label}
          </span>
        ))}
        {evidence.items.length === 0 && (
          <span className="font-mono text-xs text-white/30">No signals - showing defaults</span>
        )}
      </div>
      {evidence.conflictNote && (
        <p className="w-full font-mono text-xs text-brand/80 border-l-2 border-brand pl-3 mt-1">
          {evidence.conflictNote}
        </p>
      )}
    </div>
  );
}

function PersonaContent({ page }: { page: GeneratedPage }) {
  return (
    <div className="space-y-10">
      {page.blocks.map((block, i) => {
        const style = { animationDelay: `${i * 90}ms` };
        const wrapperClass = "animate-section-in opacity-0";

        switch (block.type) {
          case "hero":
            return (
              <div key={`${block.type}-${i}`} className={wrapperClass} style={style}>
                <HeroBanner
                  headline={block.headline}
                  sub={block.sub}
                  cta="Shop Now"
                  mode={page.mode}
                />
              </div>
            );
          case "productGrid":
            return (
              <div key={`${block.type}-${i}`} className={wrapperClass} style={style}>
                <ProductGridSection
                  title={block.title}
                  products={productsFromIds(block.productIds)}
                />
              </div>
            );
          case "giftCollection":
            return (
              <div key={`${block.type}-${i}`} className={wrapperClass} style={style}>
                <ProductGridSection
                  title={block.title}
                  note={block.note}
                  products={productsFromIds(block.productIds)}
                />
              </div>
            );
          case "guide":
            return (
              <div key={`${block.type}-${i}`} className={wrapperClass} style={style}>
                <GuideSection title={block.title} steps={block.steps} />
              </div>
            );
          case "comparison":
            return (
              <div key={`${block.type}-${i}`} className={wrapperClass} style={style}>
                <ComparisonSection
                  title={block.title}
                  products={productsFromIds(block.productIds)}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function DefaultHome() {
  const bestSellers = productsFromIds(BEST_SELLER_IDS);

  return (
    <div className="space-y-10">
      <HeroBanner
        headline="The same store, built around what you came to do."
        sub="Pick a shopper persona above and the page rebuilds from real catalog data, signal evidence, and grounded product IDs."
        cta="Browse All Products"
        mode="default"
      />
      <ProductGridSection title="Popular this week" products={bestSellers} />
    </div>
  );
}

export default function HomePage() {
  const { persona, evidence } = usePersona();
  const [page, setPage] = useState<GeneratedPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!persona) {
      requestId.current += 1;
      setPage(null);
      setIsLoading(false);
      return;
    }

    const id = requestId.current + 1;
    requestId.current = id;
    const fallbackPreset = PERSONA_PRESET[persona.id] ?? "starter";
    const { description } = inferFromSignals(persona.signals);

    setPage(null);
    setIsLoading(true);

    generatePage(description, fallbackPreset)
      .then((nextPage) => {
        if (requestId.current === id) setPage(nextPage);
      })
      .catch(() => {
        if (requestId.current === id) {
          const spec = PRESETS[fallbackPreset].spec;
          setPage({ blocks: spec.blocks, mode: spec.intent.mode, fromAI: false });
        }
      })
      .finally(() => {
        if (requestId.current === id) setIsLoading(false);
      });
  }, [persona]);

  return (
    <div className="min-h-screen bg-concrete">
      <div className="max-w-8xl mx-auto px-4 py-8 space-y-8">
        {persona && evidence && (
          <EvidenceBar persona={persona} evidence={evidence} fromAI={page?.fromAI ?? false} />
        )}
        {isLoading ? <PageSkeleton /> : page ? <PersonaContent page={page} /> : <DefaultHome />}
      </div>

      <footer className="max-w-8xl mx-auto px-4 py-8 mt-8 border-t border-line">
        <p className="font-mono text-xs text-steel-2 leading-relaxed">
          BuildRight Adaptive Storefront · 32 real products · layout driven by shopper signals ·
          Milestone 2 of 4 (GenUI layout generation via AI tool calls)
        </p>
      </footer>
    </div>
  );
}
