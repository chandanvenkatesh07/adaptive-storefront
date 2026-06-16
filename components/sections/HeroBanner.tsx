type HeroMode = "repair" | "gift" | "appliance" | "outdoor" | "default" | string;

export function HeroBanner({
  headline,
  sub,
  cta = "Shop Now",
  mode = "default",
}: {
  headline: string;
  sub: string;
  cta?: string;
  mode?: HeroMode;
}) {
  const label =
    mode === "repair"  ? "Repair Guide" :
    mode === "gift"    ? "Gift Shop" :
    mode === "appliance" ? "Appliance Buying" :
    mode === "outdoor" ? "Outdoor Projects" :
    mode === "project" ? "Build Mode" :
    "Featured";

  const tone =
    mode === "gift"
      ? "bg-gradient-to-br from-brand to-brand-dark"
      : mode === "appliance"
        ? "bg-gradient-to-br from-ink via-[#253f55] to-[#406b7a]"
      : mode === "outdoor"
        ? "bg-gradient-to-br from-ink via-ink to-[#35513d]"
        : mode === "project"
          ? "bg-gradient-to-br from-[#1a1a2e] via-ink to-[#16213e]"
          : "bg-ink";

  return (
    <section className={`rounded-xl px-8 py-12 ${tone}`}>
      <div className="max-w-xl">
        <p className="font-mono text-xs uppercase tracking-widest mb-3 text-white/50">
          {label}
        </p>
        <h1 className="font-display font-black text-3xl md:text-4xl text-white leading-tight mb-4">
          {headline}
        </h1>
        <p className="text-white/75 text-base mb-6 leading-relaxed">{sub}</p>
        <a
          href="#products"
          className="bg-white text-ink font-display font-black px-6 py-3 rounded-lg hover:bg-concrete transition-colors text-sm inline-block"
        >
          {cta}
        </a>
      </div>
    </section>
  );
}
