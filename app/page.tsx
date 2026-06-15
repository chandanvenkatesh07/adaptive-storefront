"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type GeneratedPage, type PageBlock, type PageMode } from "@/lib/schema";
import { ComparisonSection } from "@/components/sections/ComparisonSection";
import { GuideSection } from "@/components/sections/GuideSection";
import { HeroBanner } from "@/components/sections/HeroBanner";
import { PageSkeleton } from "@/components/sections/PageSkeleton";
import { ProductGridSection } from "@/components/sections/ProductGridSection";
import { ProductCard } from "@/components/ProductCard";
import { CATALOG, byId } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { PRESETS } from "@/lib/fallback";
import { usePersona } from "@/lib/persona-context";
import type { Persona } from "@/lib/personas";
import { inferFromSignals } from "@/lib/signals";
import type { EvidenceTrace } from "@/lib/signals";

type StreamEvent =
  | { type: "block"; block: PageBlock; mode?: PageMode }
  | { type: "done"; fromAI: boolean }
  | { type: "fallback"; blocks: PageBlock[]; mode: PageMode; fromAI: false };

function buildFallback(preset: string): GeneratedPage {
  const spec = PRESETS[preset]?.spec ?? PRESETS.starter.spec;
  return { blocks: spec.blocks, mode: spec.intent.mode, fromAI: false };
}

const PAGE_CACHE_KEY = 'buildright_page_v1';

function readPageCache(personaId: string): GeneratedPage | null {
  try {
    const raw = sessionStorage.getItem(PAGE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, GeneratedPage>;
    return cache[personaId] ?? null;
  } catch {
    return null;
  }
}

function writePageCache(personaId: string, page: GeneratedPage) {
  try {
    const raw = sessionStorage.getItem(PAGE_CACHE_KEY);
    const cache: Record<string, GeneratedPage> = raw ? JSON.parse(raw) : {};
    cache[personaId] = page;
    sessionStorage.setItem(PAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

const PERSONA_PRESET: Record<string, keyof typeof PRESETS> = {
  mid_repair:     "repair",
  gift_conflict:  "gift",
  nudged_browser: "outdoor",
  blank_slate:    "default",
  budget_gift:    "budget",
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

function searchCatalog(query: string): Product[] {
  const q = query.toLowerCase().trim();
  return CATALOG.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.blurb.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
}

function SearchResults({ query }: { query: string }) {
  const results = searchCatalog(query);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display font-black text-2xl text-ink">
          {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'No results'}
          <span className="font-display font-normal text-steel text-lg ml-2">for &ldquo;{query}&rdquo;</span>
        </h1>
        <a href="/" className="font-mono text-xs text-brand hover:text-brand-dark transition-colors">
          Clear ×
        </a>
      </div>
      {results.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-line">
          <p className="font-display font-bold text-xl text-steel mb-2">Nothing matched</p>
          <p className="font-mono text-sm text-steel-2">Try a different search or browse a category above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
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
          <span className="font-mono text-xs text-white/30">No signals — showing defaults</span>
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
  const firstContentIdx = page.blocks.findIndex(b => b.type !== 'hero');
  return (
    <div className="space-y-10">
      {page.blocks.map((block, i) => {
        const style = { animationDelay: `${i * 90}ms` };
        const wrapperClass = "animate-section-in opacity-0";
        // Anchor target for Hero CTA "Shop Now" — first non-hero block
        const id = i === firstContentIdx ? "products" : undefined;

        switch (block.type) {
          case "hero":
            return (
              <div key={`${block.type}-${i}`} className={wrapperClass} style={style}>
                <HeroBanner headline={block.headline} sub={block.sub} cta="Shop Now" mode={page.mode} />
              </div>
            );
          case "productGrid":
            return (
              <div key={`${block.type}-${i}`} id={id} className={wrapperClass} style={style}>
                <ProductGridSection title={block.title} products={productsFromIds(block.productIds)} />
              </div>
            );
          case "giftCollection":
            return (
              <div key={`${block.type}-${i}`} id={id} className={wrapperClass} style={style}>
                <ProductGridSection title={block.title} note={block.note} products={productsFromIds(block.productIds)} />
              </div>
            );
          case "guide":
            return (
              <div key={`${block.type}-${i}`} id={id} className={wrapperClass} style={style}>
                <GuideSection title={block.title} steps={block.steps} />
              </div>
            );
          case "comparison":
            return (
              <div key={`${block.type}-${i}`} id={id} className={wrapperClass} style={style}>
                <ComparisonSection title={block.title} products={productsFromIds(block.productIds)} />
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
      <div id="products">
        <ProductGridSection title="Popular this week" products={bestSellers} />
      </div>
    </div>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { persona, evidence } = usePersona();
  const [page, setPage] = useState<GeneratedPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pageRef = useRef<GeneratedPage | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (q) return;
    if (!persona) {
      abortRef.current?.abort();
      setPage(null);
      pageRef.current = null;
      setIsLoading(false);
      return;
    }

    if (isFirstRun.current) {
      isFirstRun.current = false;
      const cached = readPageCache(persona.id);
      if (cached) {
        setPage(cached);
        pageRef.current = cached;
        return;
      }
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    let cancelled = false;

    const fallbackPreset = PERSONA_PRESET[persona.id] ?? "starter";
    const { description } = inferFromSignals(persona.signals);

    setPage(null);
    pageRef.current = null;
    setIsLoading(true);

    const runCompletenessCheck = () => {
      if (cancelled) return;
      const current = pageRef.current;
      if (!current || current.blocks.length === 0) {
        const fb = buildFallback(fallbackPreset);
        setPage(fb);
        pageRef.current = fb;
        writePageCache(persona.id, fb);
        setIsLoading(false);
        return;
      }
      const types = new Set(current.blocks.map(b => b.type));
      const hasProducts = current.blocks.some(
        b => "productIds" in b && (b as { productIds: string[] }).productIds.length > 0
      );
      const isComplete =
        types.has("hero") &&
        hasProducts &&
        (current.mode !== "repair" || (types.has("guide") && types.has("productGrid"))) &&
        (current.mode !== "gift" || types.has("giftCollection"));
      if (!isComplete) {
        const fb = buildFallback(fallbackPreset);
        setPage(fb);
        pageRef.current = fb;
        writePageCache(persona.id, fb);
      } else {
        writePageCache(persona.id, current);
      }
      setIsLoading(false);
    };

    let interBlockTimer: ReturnType<typeof setTimeout> | null = null;
    const resetTimer = () => {
      if (interBlockTimer) clearTimeout(interBlockTimer);
      interBlockTimer = setTimeout(() => { if (!cancelled) runCompletenessCheck(); }, 4000);
    };

    let loadingCleared = false;

    const run = async () => {
      try {
        const response = await fetch("/api/gen-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: description, fallbackPreset }),
          signal: ac.signal,
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim() || cancelled) continue;
            const event = JSON.parse(line) as StreamEvent;
            if (event.type === "block") {
              resetTimer();
              setPage(prev => {
                const next: GeneratedPage = {
                  blocks: [...(prev?.blocks ?? []), event.block],
                  mode: event.mode ?? prev?.mode ?? "default",
                  fromAI: true,
                };
                pageRef.current = next;
                return next;
              });
              if (!loadingCleared) {
                loadingCleared = true;
                setIsLoading(false);
              }
            } else if (event.type === "done") {
              if (interBlockTimer) clearTimeout(interBlockTimer);
              runCompletenessCheck();
            } else if (event.type === "fallback") {
              if (interBlockTimer) clearTimeout(interBlockTimer);
              if (!cancelled) {
                const fb: GeneratedPage = { blocks: event.blocks, mode: event.mode, fromAI: false };
                setPage(fb);
                pageRef.current = fb;
                writePageCache(persona.id, fb);
                setIsLoading(false);
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (!cancelled) runCompletenessCheck();
      } finally {
        if (interBlockTimer) clearTimeout(interBlockTimer);
      }
    };

    run();

    return () => {
      cancelled = true;
      ac.abort();
      if (interBlockTimer) clearTimeout(interBlockTimer);
    };
  }, [persona, q]);

  return (
    <div className="min-h-screen bg-concrete">
      <div className="max-w-8xl mx-auto px-4 py-8 space-y-8">
        {q ? (
          <SearchResults query={q} />
        ) : (
          <>
            {persona && evidence && (
              <EvidenceBar persona={persona} evidence={evidence} fromAI={page?.fromAI ?? false} />
            )}
            {isLoading ? <PageSkeleton /> : page ? <PersonaContent page={page} /> : <DefaultHome />}
          </>
        )}
      </div>

      <footer className="max-w-8xl mx-auto px-4 py-8 mt-8 border-t border-line">
        <p className="font-mono text-xs text-steel-2 leading-relaxed">
          BuildRight Adaptive Storefront · 32 products · intent-driven layout via AI tool calls · M1–M4 complete
        </p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-concrete">
        <div className="max-w-8xl mx-auto px-4 py-8"><PageSkeleton /></div>
      </div>
    }>
      <HomeInner />
    </Suspense>
  );
}
