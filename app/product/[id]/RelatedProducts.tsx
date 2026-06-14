'use client';
import Link from 'next/link';
import { usePersona } from '@/lib/persona-context';
import type { Product } from '@/lib/catalog';

export function RelatedProducts({
  candidates,
  productTags,
}: {
  candidates: Product[];
  productTags: string[];
}) {
  const { persona } = usePersona();

  // Score each candidate by persona signal tags ∩ product tags.
  // No persona → preserve original (tag-overlap) order.
  const scored = persona
    ? (() => {
        const personaTags = new Set(persona.signals.flatMap(s => s.tags));
        return [...candidates]
          .map(p => ({
            p,
            score:
              p.tags.filter(t => personaTags.has(t)).length * 2 +
              p.tags.filter(t => productTags.includes(t)).length,
          }))
          .sort((a, b) => b.score - a.score)
          .map(({ p }) => p);
      })()
    : candidates;

  const shown = scored.slice(0, 4);
  if (shown.length === 0) return null;

  const sectionLabel = persona
    ? `Based on your ${persona.name.toLowerCase()} signals`
    : 'Frequently Bought Together';

  return (
    <div className="mt-10">
      <div className="flex items-baseline gap-3 mb-4 pb-3 border-b-2 border-brand">
        <h2 className="font-display font-black text-xl text-ink">{sectionLabel}</h2>
        {persona && (
          <span className="font-mono text-xs text-brand uppercase tracking-wider">
            persona-ranked
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {shown.map(p => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="bg-white rounded border border-line hover:shadow-md hover:border-brand/40 transition-all p-4 block group"
          >
            <div className="h-20 bg-card rounded flex items-center justify-center mb-3 group-hover:bg-concrete transition-colors">
              <span className="font-mono text-xs text-steel uppercase tracking-wider">
                {p.category.split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
              </span>
            </div>
            <p className="font-display font-bold text-xs text-ink leading-tight mb-1 line-clamp-2">{p.name}</p>
            <p className="font-mono text-xs text-steel">{p.brand}</p>
            <p className="font-display font-black text-sm text-ink mt-2">${p.price.toFixed(2)}</p>
            {!p.inStock && (
              <p className="font-mono text-xs text-red-400 mt-1">Out of stock</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
