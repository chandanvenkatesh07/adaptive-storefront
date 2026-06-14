export function GuideSection({ title, steps }: { title: string; steps: string[] }) {
  if (steps.length === 0) return null;

  return (
    <section className="bg-ink rounded-xl px-8 py-8">
      <h2 className="font-display font-black text-xl text-white mb-6">{title}</h2>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4 items-start">
            <span className="font-mono text-brand font-bold text-sm min-w-[28px]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-white/80 text-sm leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
