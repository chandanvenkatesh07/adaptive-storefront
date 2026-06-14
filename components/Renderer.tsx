"use client";
import { byId, type Product } from "@/lib/catalog";
import type { PageSpec } from "@/lib/schema";

// ---- The renderer: a switch over a finite block vocabulary. ----
// This is the seam Option A is about owning. The model chose blocks + ids;
// this maps them to real, deterministic React. Truth comes from the catalog.

function ProductCard({ p }: { p: Product }) {
  return (
    <div className="card">
      <div className="card-top">
        <span className="cat">{p.category}</span>
        {!p.inStock && <span className="oos">Out of stock</span>}
      </div>
      <div className="pname">{p.name}</div>
      <div className="brand">{p.brand}</div>
      <p className="blurb">{p.blurb}</p>
      <div className="card-bot">
        <span className="price">${p.price.toFixed(2)}</span>
        <span className="rating">★ {p.rating}</span>
      </div>
    </div>
  );
}

function Grid({ ids }: { ids: string[] }) {
  return (
    <div className="grid">
      {ids.map((id) => {
        const p = byId(id);
        return p ? <ProductCard key={id} p={p} /> : null;
      })}
    </div>
  );
}

export function RenderPage({ spec }: { spec: PageSpec }) {
  return (
    <div className="page">
      {spec.blocks.map((b, i) => {
        switch (b.type) {
          case "hero":
            return (
              <section className="block hero" key={i}>
                <h1>{b.headline}</h1>
                <p>{b.sub}</p>
              </section>
            );
          case "guide":
            return (
              <section className="block" key={i}>
                <h2 className="bh">{b.title}</h2>
                <ol className="guide">
                  {b.steps.map((s, j) => (
                    <li key={j}>
                      <span className="step-n">{String(j + 1).padStart(2, "0")}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          case "productGrid":
            return (
              <section className="block" key={i}>
                <h2 className="bh">{b.title}</h2>
                <Grid ids={b.productIds} />
              </section>
            );
          case "comparison":
            return (
              <section className="block" key={i}>
                <h2 className="bh">{b.title}</h2>
                <div className="compare">
                  {b.productIds.map((id) => {
                    const p = byId(id);
                    if (!p) return null;
                    return (
                      <div className="comp-col" key={id}>
                        <div className="pname">{p.name}</div>
                        <div className="price big">${p.price.toFixed(2)}</div>
                        <div className="meta">★ {p.rating} · {p.brand}</div>
                        <p className="blurb">{p.blurb}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          case "giftCollection":
            return (
              <section className="block" key={i}>
                <h2 className="bh">{b.title}</h2>
                <p className="note">{b.note}</p>
                <Grid ids={b.productIds} />
              </section>
            );
          default:
            return null; // unknown block type → skip, never crash
        }
      })}
    </div>
  );
}
