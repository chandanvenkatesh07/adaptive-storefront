"use client";

import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/catalog";

export function ProductGridSection({
  title,
  products,
  note,
}: {
  title: string;
  products: Product[];
  note?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-4 pb-3 border-b-2 border-brand">
        <h2 className="font-display font-black text-xl text-ink">{title}</h2>
        {note && <p className="text-sm text-steel mt-1 leading-relaxed">{note}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
