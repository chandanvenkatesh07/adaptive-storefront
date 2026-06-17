'use client';

import { CLUSTERS, type ClusterKey } from '@/lib/intent-clusters';
import { useSessionIntent } from '@/lib/session-intent';

type Props = {
  history: ClusterKey[];
  active: ClusterKey | null;
};

export function IntentTrail({ history, active }: Props) {
  const { setActiveCluster } = useSessionIntent();
  if (history.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-xs text-steel-2 uppercase tracking-widest">Trail</span>
      {history.map((key, i) => {
        const def = CLUSTERS.find(c => c.key === key)!;
        const isActive = key === active;
        return (
          <span key={key} className="flex items-center gap-2">
            {i > 0 && <span className="text-steel-2 text-xs">›</span>}
            <button
              onClick={() => !isActive && setActiveCluster(key)}
              disabled={isActive}
              className={`font-mono text-xs px-2 py-0.5 rounded transition-colors ${
                isActive
                  ? 'bg-brand text-white font-bold cursor-default'
                  : 'bg-concrete border border-line text-steel hover:border-brand/40 hover:text-ink'
              }`}
            >
              {def.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
