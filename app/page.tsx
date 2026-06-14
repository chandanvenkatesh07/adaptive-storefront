'use client';
import { useEffect, useState } from 'react';
import { usePersona } from '@/lib/persona-context';
import { useCart } from '@/lib/cart';
import { ProductCard } from '@/components/ProductCard';
import { CATALOG, byId } from '@/lib/catalog';
import type { Product } from '@/lib/catalog';
import { PRESETS } from '@/lib/fallback';
import type { PageSpec } from '@/lib/schema';
import type { Persona } from '@/lib/personas';
import type { EvidenceTrace } from '@/lib/signals';

function AddToCartFromSpec({ product }: { product: Product }) {
  const { addItem } = useCart();
  return (
    <button
      onClick={() => product.inStock && addItem(product)}
      disabled={!product.inStock}
      className="bg-brand hover:bg-brand-dark text-white font-display font-black text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {product.inStock ? 'Add to Cart' : 'Out of Stock'}
    </button>
  );
}

// ─── Persona → preset mapping for Milestone 1 (streaming replaces this in M2) ─
const PERSONA_PRESET: Record<string, keyof typeof PRESETS> = {
  mid_repair:     'repair',
  gift_conflict:  'gift',
  nudged_browser: 'budget',
  blank_slate:    'starter',
};

// ─── Section components ────────────────────────────────────────────────────────

function HeroBanner({ headline, sub, cta, mode }: {
  headline: string; sub: string; cta: string; mode: string;
}) {
  return (
    <section className={`rounded-xl px-8 py-12 ${
      mode === 'gift'
        ? 'bg-gradient-to-br from-brand to-brand-dark'
        : 'bg-ink'
    }`}>
      <div className="max-w-xl">
        <p className="font-mono text-xs uppercase tracking-widest mb-3 text-white/50">
          {mode === 'repair' ? 'Repair Guide' : mode === 'gift' ? 'Gift Shop' : 'Featured'}
        </p>
        <h1 className="font-display font-black text-3xl md:text-4xl text-white leading-tight mb-4">
          {headline}
        </h1>
        <p className="text-white/75 text-base mb-6 leading-relaxed">{sub}</p>
        <button className="bg-white text-ink font-display font-black px-6 py-3 rounded-lg hover:bg-concrete transition-colors text-sm">
          {cta}
        </button>
      </div>
    </section>
  );
}

function ProductGridSection({ title, products }: {
  title: string; products: ReturnType<typeof byId>[];
}) {
  const real = products.filter(Boolean) as NonNullable<ReturnType<typeof byId>>[];
  if (real.length === 0) return null;
  return (
    <section>
      <h2 className="font-display font-black text-xl text-ink mb-4 pb-3 border-b-2 border-brand">
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {real.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function GuideSection({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="bg-ink rounded-xl px-8 py-8">
      <h2 className="font-display font-black text-xl text-white mb-6">{title}</h2>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4 items-start">
            <span className="font-mono text-brand font-bold text-sm min-w-[28px]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-white/80 text-sm leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ComparisonSection({ title, products }: {
  title: string; products: NonNullable<ReturnType<typeof byId>>[];
}) {
  if (products.length === 0) return null;
  return (
    <section>
      <h2 className="font-display font-black text-xl text-ink mb-4 pb-3 border-b-2 border-line">
        {title}
      </h2>
      <div className={`grid gap-4 ${
        products.length === 2 ? 'grid-cols-2' :
        products.length === 3 ? 'grid-cols-3' :
        'grid-cols-2 sm:grid-cols-4'
      }`}>
        {products.map((p, i) => (
          <div key={p.id} className="relative bg-white rounded-xl border-2 border-line hover:border-brand transition-colors p-5 flex flex-col gap-3">
            {i === 0 && products.length > 1 && (
              <span className="absolute -top-3 left-4 font-mono text-xs bg-brand text-white px-2 py-0.5 rounded-sm uppercase tracking-wider">
                Top pick
              </span>
            )}
            <div className="h-24 bg-card rounded-lg flex items-center justify-center">
              <span className="font-mono text-sm text-steel uppercase tracking-wider">
                {p.category.split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
              </span>
            </div>
            <div>
              <span className="font-mono text-xs text-steel uppercase tracking-wide">{p.category}</span>
              <h3 className="font-display font-black text-sm text-ink leading-tight mt-0.5">{p.name}</h3>
              <p className="text-xs text-steel mt-0.5">{p.brand}</p>
            </div>
            <p className="text-xs text-ink/70 leading-relaxed flex-1">{p.blurb}</p>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-xs ${n <= Math.round(p.rating) ? 'text-brand' : 'text-steel-2'}`}>★</span>
                ))}
              </div>
              <span className="font-mono text-xs text-steel">{p.rating}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-display font-black text-lg text-ink">${p.price.toFixed(2)}</span>
              <AddToCartFromSpec product={p} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceBar({ persona, evidence }: { persona: Persona; evidence: EvidenceTrace }) {
  const confidenceColor = {
    high: 'text-brand',
    medium: 'text-steel',
    low: 'text-steel-2',
    none: 'text-steel-2',
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
      </div>
      <div className="flex flex-wrap gap-2">
        {evidence.items.map((item, i) => (
          <span
            key={i}
            className={`font-mono text-xs px-2 py-0.5 rounded ${
              item.outcome === 'fired'      ? 'bg-brand/20 text-brand'
              : item.outcome === 'suppressed' ? 'bg-white/10 text-white/40 line-through'
              : 'bg-white/5 text-white/30 line-through'
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

function PersonaContent({ spec }: { spec: PageSpec }) {
  return (
    <div className="space-y-10">
      {spec.blocks.map((block, i) => {
        switch (block.type) {
          case 'hero':
            return (
              <HeroBanner
                key={i}
                headline={block.headline}
                sub={block.sub}
                cta="Shop Now"
                mode={spec.intent.mode}
              />
            );
          case 'productGrid':
          case 'giftCollection':
            return (
              <ProductGridSection
                key={i}
                title={block.title}
                products={(block.productIds ?? []).map(id => byId(id))}
              />
            );
          case 'guide':
            return <GuideSection key={i} title={block.title} steps={block.steps} />;
          case 'comparison': {
            const real = (block.productIds ?? []).map(id => byId(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId>>[];
            return <ComparisonSection key={i} title={block.title} products={real} />;
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

// Best-sellers shown when no persona is active
const BEST_SELLER_IDS = [
  'sku_led_bulbs', 'sku_thermostat', 'sku_step_ladder', 'sku_paint_kit',
  'sku_multitool', 'sku_drill_combo', 'sku_headlamp', 'sku_workgloves',
];

function DefaultHome() {
  const bestSellers = BEST_SELLER_IDS.map(id => byId(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId>>[];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-xl bg-ink px-8 py-14">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-white/40 mb-3">
            Adaptive Storefront
          </p>
          <h1 className="font-display font-black text-4xl text-white leading-tight mb-4">
            The same store,<br />
            <span className="text-brand">built around what you came to do.</span>
          </h1>
          <p className="text-white/60 text-base mb-6 leading-relaxed">
            Click <strong className="text-white">"Sign in as"</strong> above to pick a shopper persona
            — the page rebuilds itself from your signals. Every path uses the same 32-item catalog.
          </p>
          <button className="bg-brand hover:bg-brand-dark text-white font-display font-black px-6 py-3 rounded-lg transition-colors text-sm">
            Browse All Products
          </button>
        </div>
      </section>

      {/* Best sellers */}
      <ProductGridSection title="Popular this week" products={bestSellers} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { persona, evidence } = usePersona();
  const [spec, setSpec] = useState<PageSpec | null>(null);

  // Reset spec when persona changes
  useEffect(() => {
    if (!persona) { setSpec(null); return; }
    const key = PERSONA_PRESET[persona.id] ?? 'repair';
    setSpec(PRESETS[key].spec);
  }, [persona?.id]);

  return (
    <div className="min-h-screen bg-concrete">
      <div className="max-w-8xl mx-auto px-4 py-8 space-y-8">
        {persona && evidence && (
          <EvidenceBar persona={persona} evidence={evidence} />
        )}
        {spec ? <PersonaContent spec={spec} /> : <DefaultHome />}
      </div>

      <footer className="max-w-8xl mx-auto px-4 py-8 mt-8 border-t border-line">
        <p className="font-mono text-xs text-steel-2 leading-relaxed">
          BuildRight Adaptive Storefront · 32 real products · layout driven by shopper signals ·
          Milestone 1 of 4 (foundation shell — streaming GenUI comes in M2)
        </p>
      </footer>
    </div>
  );
}
