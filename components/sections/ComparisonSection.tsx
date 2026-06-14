"use client";

import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";

function AddToCartFromSpec({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <button
      onClick={() => product.inStock && addItem(product)}
      disabled={!product.inStock}
      className="bg-brand hover:bg-brand-dark text-white font-display font-black text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {product.inStock ? "Add to Cart" : "Out of Stock"}
    </button>
  );
}

export function ComparisonSection({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  const columns =
    products.length === 2 ? "sm:grid-cols-2" :
    products.length === 3 ? "sm:grid-cols-3" :
    "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section>
      <h2 className="font-display font-black text-xl text-ink mb-4 pb-3 border-b-2 border-line">
        {title}
      </h2>
      <div className={`grid grid-cols-1 ${columns} gap-4`}>
        {products.map((product, i) => (
          <div
            key={product.id}
            className="relative bg-white rounded-xl border-2 border-line hover:border-brand transition-colors p-5 flex flex-col gap-3"
          >
            {i === 0 && products.length > 1 && (
              <span className="absolute -top-3 left-4 font-mono text-xs bg-brand text-white px-2 py-0.5 rounded-sm uppercase tracking-wider">
                Top pick
              </span>
            )}
            <div className="h-24 bg-card rounded-lg flex items-center justify-center">
              <span className="font-mono text-sm text-steel uppercase tracking-wider">
                {product.category.split(" ").map((word) => word[0]).join("").slice(0, 3)}
              </span>
            </div>
            <div>
              <span className="font-mono text-xs text-steel uppercase tracking-wide">
                {product.category}
              </span>
              <h3 className="font-display font-black text-sm text-ink leading-tight mt-0.5">
                {product.name}
              </h3>
              <p className="text-xs text-steel mt-0.5">{product.brand}</p>
            </div>
            <p className="text-xs text-ink/70 leading-relaxed flex-1">{product.blurb}</p>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-steel uppercase tracking-wide">Rating</span>
              <span className="font-mono text-xs text-ink">{product.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-display font-black text-lg text-ink">
                ${product.price.toFixed(2)}
              </span>
              <AddToCartFromSpec product={product} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
