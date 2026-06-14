'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';

export function CartDrawer() {
  const { items, removeItem, updateQty, total, count, open, setOpen } = useCart();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />

      <div className="fixed right-0 top-0 h-full w-96 max-w-full bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display font-black text-lg text-ink">Cart ({count})</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-concrete transition-colors text-steel hover:text-ink text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 && (
            <div className="text-center py-16">
              <p className="font-mono text-sm text-steel">Your cart is empty.</p>
              <button
                onClick={() => setOpen(false)}
                className="mt-4 text-sm text-brand hover:underline font-display font-bold"
              >
                Continue shopping
              </button>
            </div>
          )}

          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-3 items-start pb-4 border-b border-line last:border-0">
              <div className="w-14 h-14 bg-card rounded border border-line flex-shrink-0 flex items-center justify-center">
                <span className="font-mono text-xs text-steel uppercase">
                  {product.category.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${product.id}`}
                  onClick={() => setOpen(false)}
                  className="font-display font-bold text-sm text-ink hover:text-brand transition-colors line-clamp-2 leading-tight block"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-steel mt-0.5">{product.brand}</p>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-line rounded overflow-hidden">
                    <button
                      onClick={() => updateQty(product.id, quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-concrete transition-colors text-ink text-sm"
                    >
                      −
                    </button>
                    <span className="font-mono text-sm w-7 text-center border-x border-line">{quantity}</span>
                    <button
                      onClick={() => updateQty(product.id, quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-concrete transition-colors text-ink text-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-display font-black text-sm text-ink ml-1">
                    ${(product.price * quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(product.id)}
                    className="ml-auto text-xs text-steel-2 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-line space-y-3 bg-card">
            <div className="flex justify-between items-baseline">
              <span className="font-display font-bold text-sm text-steel">Subtotal</span>
              <span className="font-display font-black text-xl text-ink">${total.toFixed(2)}</span>
            </div>
            <button className="w-full bg-brand hover:bg-brand-dark text-white font-display font-bold py-3 rounded transition-colors text-sm tracking-wide">
              Checkout
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full border border-line hover:border-steel text-ink font-display font-bold py-2.5 rounded transition-colors text-sm"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
