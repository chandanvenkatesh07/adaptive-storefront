'use client';

import { useState } from 'react';
import { CLUSTERS } from '@/lib/intent-clusters';
import { useSessionIntent } from '@/lib/session-intent';

// Mirror constants — panel only uses these for display scaling.
const GEN_THRESHOLD = 0.3;
const SWITCH_THRESHOLD = 0.6;

function signalAge(capturedAt: number): string {
  const s = Math.floor((Date.now() - capturedAt) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;
}

// Fill percentage scaled so SWITCH_THRESHOLD = 100% (full bar = page switches).
function fillPct(score: number): number {
  return Math.min((score / SWITCH_THRESHOLD) * 100, 100);
}

// Where to draw the gen marker on the scaled bar.
const GEN_MARKER_PCT = (GEN_THRESHOLD / SWITCH_THRESHOLD) * 100; // 50%

export function IntentDebugPanel() {
  const { clusterScores, activeCluster, signalQueue, cache } = useSessionIntent();
  const [open, setOpen] = useState(true);

  const sorted = [...CLUSTERS].sort((a, b) => clusterScores[b.key] - clusterScores[a.key]);
  const recent = [...signalQueue].reverse().slice(0, 5);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-line bg-white shadow-2xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-card border-b border-line hover:bg-concrete transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeCluster ? 'bg-brand animate-pulse' : 'bg-steel/30'}`} />
          <span className="font-mono text-xs text-steel uppercase tracking-widest">Intent Meter</span>
          {activeCluster && (
            <span className="font-mono text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded leading-none">
              {CLUSTERS.find(c => c.key === activeCluster)?.label}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-steel-2">{open ? '▼' : '▲'}</span>
      </button>

      {open && (
        <div className="p-3 space-y-2.5">

          {/* Cluster meters */}
          <div className="space-y-1.5">
            {sorted.map(cluster => {
              const score = clusterScores[cluster.key];
              const pct = fillPct(score);
              const isActive = cluster.key === activeCluster;
              const isCached = !!cache[cluster.key];
              const isNearSwitch = pct >= 80 && !isActive;
              const isAboveGen = score >= GEN_THRESHOLD;

              const barColor = isActive
                ? 'bg-brand'
                : isNearSwitch
                ? 'bg-brand/70'
                : isAboveGen
                ? 'bg-amber-400'
                : 'bg-steel/25';

              return (
                <div
                  key={cluster.key}
                  className={`rounded-lg px-2.5 py-2 transition-all duration-300 ${
                    isActive
                      ? 'border border-brand/50 shadow-[0_0_0_3px_rgba(var(--color-brand-rgb),0.08)]'
                      : 'border border-transparent bg-concrete'
                  }`}
                >
                  {/* Label row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`font-mono text-xs font-bold truncate ${isActive ? 'text-brand' : 'text-steel'}`}>
                        {cluster.label}
                      </span>
                      {isActive && (
                        <span className="font-mono text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full leading-none shrink-0 animate-pulse">
                          active
                        </span>
                      )}
                      {isCached && !isActive && (
                        <span className="font-mono text-[10px] text-steel-2 shrink-0">ready</span>
                      )}
                    </div>
                    <span className={`font-mono text-xs tabular-nums font-bold ml-2 shrink-0 ${
                      isActive ? 'text-brand' : isNearSwitch ? 'text-brand/80' : isAboveGen ? 'text-amber-500' : 'text-steel-2'
                    }`}>
                      {Math.min(score, 1).toFixed(2)}
                    </span>
                  </div>

                  {/* Meter track — full bar = SWITCH_THRESHOLD */}
                  <div className="relative h-3 bg-line rounded-full overflow-hidden">
                    {/* Gen marker at 50% of bar width */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-amber-400/80 z-10"
                      style={{ left: `${GEN_MARKER_PCT}%` }}
                    />
                    {/* Fill */}
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor} ${isActive ? 'shadow-[inset_0_0_6px_rgba(0,0,0,0.15)]' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Sub-label: progress hint */}
                  {pct > 0 && pct < 100 && (
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-steel-2">
                        {pct < 50 ? 'warming up' : pct < 80 ? 'building...' : 'almost there'}
                      </span>
                      <span className="font-mono text-[10px] text-steel-2">{Math.round(pct)}% to switch</span>
                    </div>
                  )}
                  {isActive && (
                    <div className="mt-1">
                      <span className="font-mono text-[10px] text-brand">page switched</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-0.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-amber-400/80 rounded-full" />
              <span className="font-mono text-[10px] text-steel-2">gen starts (50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-brand/60 rounded-full" />
              <span className="font-mono text-[10px] text-steel-2">full = switch</span>
            </div>
          </div>

          {/* Signal feed */}
          <div className="border-t border-line pt-2">
            <p className="font-mono text-[10px] text-steel-2 uppercase tracking-widest mb-1.5">Signal feed</p>
            {recent.length === 0 ? (
              <p className="font-mono text-xs text-steel-2 text-center py-2">
                Search or browse to add signals
              </p>
            ) : (
              <div className="space-y-1">
                {recent.map((sig, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      sig.source === 'search'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {sig.source === 'search' ? 'search' : 'browse'}
                    </span>
                    <span className="font-mono text-[10px] text-ink truncate flex-1 min-w-0">
                      {sig.source === 'search' ? sig.value : sig.tags.join(' ')}
                    </span>
                    <span className="font-mono text-[10px] text-steel-2 shrink-0">×{sig.weight.toFixed(1)}</span>
                    <span className="font-mono text-[10px] text-steel-2 shrink-0">{signalAge(sig.capturedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
