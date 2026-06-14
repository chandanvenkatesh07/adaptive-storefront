'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/catalog';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="bg-white rounded border border-line hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/product/${product.id}`}>
        <div className="h-40 bg-card flex items-center justify-center rounded-t border-b border-line cursor-pointer group">
          <div className="text-center">
            <div className="w-14 h-14 bg-concrete-2 rounded-full mx-auto flex items-center justify-center group-hover:bg-concrete transition-colors">
              <span className="font-mono text-xs text-steel uppercase tracking-wider">
                {product.category.split(' ').map(w => w[0]).join('').slice(0, 3)}
              </span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1 gap-1">
          <span className="text-xs font-mono text-steel uppercase tracking-wide leading-none">
            {product.category}
          </span>
          {!product.inStock && (
            <span className="text-xs text-red-500 border border-red-300 px-1 py-0.5 rounded-sm shrink-0 leading-none">
              OOS
            </span>
          )}
        </div>

        <Link href={`/product/${product.id}`}>
          <h3 className="font-display font-bold text-ink text-sm leading-tight hover:text-brand transition-colors cursor-pointer mb-0.5">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-steel mb-1">{product.brand}</p>
        <p className="text-xs text-steel-2 line-clamp-2 leading-relaxed flex-1">{product.blurb}</p>

        <div className="flex items-center gap-1 mt-2 mb-2">
          <span className="text-brand text-xs">★</span>
          <span className="text-xs text-steel">{product.rating}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-display font-black text-lg text-ink leading-none">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={() => product.inStock && addItem(product)}
            disabled={!product.inStock}
            className="bg-brand hover:bg-brand-dark text-white text-xs font-display font-bold px-3 py-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
