export function PageSkeleton() {
  return (
    <div className="space-y-10" aria-label="Loading page layout">
      <section className="rounded-xl bg-ink px-8 py-12 overflow-hidden">
        <div className="max-w-xl space-y-4">
          <div className="h-3 w-32 rounded bg-white/15 animate-pulse" />
          <div className="h-10 w-full max-w-lg rounded bg-white/20 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-white/15 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-white/15 animate-pulse" />
          <div className="h-11 w-32 rounded-lg bg-white/20 animate-pulse" />
        </div>
      </section>
      <section>
        <div className="h-7 w-56 rounded bg-ink/15 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded border border-line bg-white animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}
