'use client';

import { useEffect, useRef, useState } from 'react';
import { CLUSTERS, type ClusterKey } from '@/lib/intent-clusters';

type Props = {
  cluster: ClusterKey;
  instant: boolean;
  onDismiss: () => void;
};

export function IntentBanner({ cluster, instant, onDismiss }: Props) {
  const [alive, setAlive] = useState(true);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });

  const def = CLUSTERS.find(c => c.key === cluster)!;

  useEffect(() => {
    setAlive(true);
    const t = setTimeout(() => {
      setAlive(false);
      onDismissRef.current();
    }, 6000);
    return () => clearTimeout(t);
  }, [cluster]);

  if (!alive) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5">
      <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 animate-pulse" />
      <span className="font-mono text-xs text-steel uppercase tracking-widest">Live intent</span>
      <span className="font-display font-bold text-sm text-ink">Optimized for {def.label}</span>
      {instant && (
        <span className="font-mono text-xs bg-brand/10 text-brand px-2 py-0.5 rounded uppercase tracking-wider">
          instant
        </span>
      )}
      <button
        onClick={() => { setAlive(false); onDismissRef.current(); }}
        className="ml-auto font-mono text-lg text-steel hover:text-ink transition-colors leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
