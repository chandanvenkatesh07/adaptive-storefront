'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';

export default function CartPage() {
  const { items, removeItem, updateQty, total, count, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-concrete flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-white border-2 border-line rounded-full flex items-center justify-center mx-auto mb-6">
            <CartEmptyIcon />
          </div>
          <h1 className="font-display font-black text-2xl text-ink mb-2">Your cart is empty</h1>
          <p className="font-mono text-sm text-steel mb-6">
            Pick a shopper persona on the home page and add items to get started.
          </p>
          <Link
            href="/"
            className="inline-block bg-brand hover:bg-brand-dark text-white font-display font-black px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  const shipping = 0; // free shipping demo
  const taxRate = 0.08;
  const tax = total * taxRate;
  const orderTotal = total + tax + shipping;

  return (
    <div className="min-h-screen bg-concrete">
      <div className="max-w-8xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-display font-black text-3xl text-ink">
            Cart <span className="text-steel font-display text-xl">({count} {count === 1 ? 'item' : 'items'})</span>
          </h1>
          <button
            onClick={clearCart}
            className="font-mono text-xs text-steel-2 hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-line p-5 flex gap-5 items-start"
              >
                {/* Image placeholder */}
                <div className="w-20 h-20 bg-card rounded-lg border border-line flex-shrink-0 flex items-center justify-center">
                  <span className="font-mono text-xs text-steel uppercase tracking-wider">
                    {product.category.split(' ').map(w => w[0]).join('').slice(0, 3)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/product/${product.id}`}
                        className="font-display font-bold text-base text-ink hover:text-brand transition-colors leading-tight block"
                      >
                        {product.name}
                      </Link>
                      <p className="font-mono text-xs text-steel mt-0.5">{product.brand}</p>
                    </div>
                    <span className="font-display font-black text-lg text-ink shrink-0">
                      ${(product.price * quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    {/* Qty controls */}
                    <div className="flex items-center border border-line rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQty(product.id, quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-concrete transition-colors text-ink text-sm"
                      >
                        −
                      </button>
                      <span className="font-mono text-sm w-8 text-center border-x border-line h-8 flex items-center justify-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQty(product.id, quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-concrete transition-colors text-ink text-sm"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono text-xs text-steel">
                      ${product.price.toFixed(2)} each
                    </span>

                    <button
                      onClick={() => removeItem(product.id)}
                      className="ml-auto font-mono text-xs text-steel-2 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-display font-bold text-sm text-brand hover:text-brand-dark transition-colors mt-2"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-line p-6 sticky top-20">
              <h2 className="font-display font-black text-lg text-ink mb-5 pb-4 border-b border-line">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-steel">Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
                  <span className="font-display font-bold text-ink">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel">Shipping</span>
                  <span className="font-display font-bold text-brand">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel">Estimated tax (8%)</span>
                  <span className="font-display font-bold text-ink">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline mt-5 pt-4 border-t-2 border-ink">
                <span className="font-display font-black text-base text-ink">Order Total</span>
                <span className="font-display font-black text-2xl text-ink">${orderTotal.toFixed(2)}</span>
              </div>

              <button className="w-full mt-6 bg-brand hover:bg-brand-dark text-white font-display font-black py-4 rounded-xl transition-colors text-base tracking-wide">
                Place Order
              </button>

              <p className="font-mono text-xs text-steel-2 text-center mt-4 leading-relaxed">
                Demo store — no real order will be placed.
              </p>

              <div className="mt-5 pt-4 border-t border-line space-y-2">
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span className="font-mono text-xs text-steel">Free returns within 90 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span className="font-mono text-xs text-steel">In-store pickup available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-steel">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
