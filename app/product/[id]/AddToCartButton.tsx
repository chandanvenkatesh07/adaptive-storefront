'use client';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/catalog';

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="flex gap-3">
      <button
        onClick={() => product.inStock && addItem(product)}
        disabled={!product.inStock}
        className="flex-1 bg-brand hover:bg-brand-dark text-white font-display font-black py-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
      >
        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  );
}
