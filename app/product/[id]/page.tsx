import { notFound } from 'next/navigation';
import Link from 'next/link';
import { byId, CATALOG } from '@/lib/catalog';
import { AddToCartButton } from './AddToCartButton';
import { RelatedProducts } from './RelatedProducts';
import { ProductPageSignal } from '@/components/ProductPageSignal';

export function generateStaticParams() {
  return CATALOG.map(p => ({ id: p.id }));
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = byId(params.id);
  if (!product) notFound();

  // Full catalog minus current product, sorted by tag-overlap strength descending.
  // No-persona path shows top 4 by overlap; persona path re-ranks the whole pool
  // by signal tags so a repair persona on a grill page can still surface repair tools.
  const candidates = CATALOG
    .filter(p => p.id !== product.id)
    .sort((a, b) => {
      const aScore = a.tags.filter(t => product.tags.includes(t)).length;
      const bScore = b.tags.filter(t => product.tags.includes(t)).length;
      return bScore - aScore;
    });

  return (
    <div className="min-h-screen bg-concrete">
      <div className="max-w-8xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-mono text-xs text-steel mb-6">
          <Link href="/" className="hover:text-brand transition-colors">Home</Link>
          <span>/</span>
          <span className="text-steel-2">{product.category}</span>
          <span>/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        {/* Product main */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white rounded-xl border border-line p-8">
          {/* Image placeholder */}
          <div className="flex items-center justify-center h-72 bg-card rounded-lg border border-line">
            <div className="text-center">
              <div className="w-24 h-24 bg-concrete-2 rounded-full mx-auto flex items-center justify-center mb-3">
                <span className="font-mono text-sm text-steel uppercase tracking-wider">
                  {product.category.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              </div>
              <p className="font-mono text-xs text-steel-2">Product image placeholder</p>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="font-mono text-xs text-steel uppercase tracking-wide">{product.category}</span>
              {!product.inStock && (
                <span className="ml-2 text-xs text-red-500 border border-red-300 px-2 py-0.5 rounded-sm">
                  Out of Stock
                </span>
              )}
            </div>
            <h1 className="font-display font-black text-2xl text-ink leading-tight">{product.name}</h1>
            <p className="text-sm text-steel">{product.brand}</p>

            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-sm ${n <= Math.round(product.rating) ? 'text-brand' : 'text-steel-2'}`}>★</span>
                ))}
              </div>
              <span className="font-mono text-sm text-steel">{product.rating} out of 5</span>
            </div>

            <p className="text-ink/80 text-sm leading-relaxed">{product.blurb}</p>

            <div className="flex flex-wrap gap-1.5">
              {product.tags.map(tag => (
                <span key={tag} className="font-mono text-xs px-2 py-0.5 bg-concrete rounded text-steel">
                  {tag}
                </span>
              ))}
            </div>

            <div className="border-t border-line pt-4 mt-2">
              <div className="font-display font-black text-4xl text-ink mb-4">
                ${product.price.toFixed(2)}
              </div>
              <AddToCartButton product={product} />
            </div>
          </div>
        </div>

        {/* Persona-aware related products */}
        <RelatedProducts candidates={candidates} productTags={product.tags} />

        {/* Fires a browse signal for live intent scoring — renders nothing */}
        <ProductPageSignal productTags={product.tags} />
      </div>
    </div>
  );
}
