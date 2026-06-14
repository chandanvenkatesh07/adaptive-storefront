'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/catalog';

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  function handleAdd() {
    if (!product.inStock) return;
    addItem(product, qty);
    setQty(1);
  }

  return (
    <div className="flex gap-3">
      {/* Quantity selector */}
      <div className="flex items-center border border-line rounded-lg overflow-hidden">
        <button
          onClick={() => setQty(q => Math.max(1, q - 1))}
          disabled={!product.inStock}
          className="w-10 h-11 flex items-center justify-center hover:bg-concrete transition-colors text-ink text-lg leading-none disabled:opacity-40"
        >
          −
        </button>
        <span className="font-mono text-sm w-10 text-center border-x border-line h-11 flex items-center justify-center">
          {qty}
        </span>
        <button
          onClick={() => setQty(q => q + 1)}
          disabled={!product.inStock}
          className="w-10 h-11 flex items-center justify-center hover:bg-concrete transition-colors text-ink text-lg leading-none disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={!product.inStock}
        className="flex-1 bg-brand hover:bg-brand-dark text-white font-display font-black py-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
      >
        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  );
}
