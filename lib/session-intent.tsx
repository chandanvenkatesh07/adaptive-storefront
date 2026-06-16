'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {
  type ClusterKey,
  CLUSTER_KEYS,
  emptyScores,
  scoreTextAgainstClusters,
  scoreTagsAgainstClusters,
  topCluster,
} from './intent-clusters';

const STORAGE_KEY = 'buildright_intent_v1';
const QUEUE_MAX = 20;
const SIGNAL_TTL_MS = 180_000; // 3 minutes

export type LiveSignal = {
  capturedAt: number;
  source: 'search' | 'browse';
  weight: number;  // 1.0 for submitted search, 0.7 for debounced input or browse
  value: string;   // search text (empty for browse signals)
  tags: string[];  // product/category tags (empty for search signals)
};

// Recency decay — three buckets matching the AGENT.md spec.
function liveRecency(capturedAt: number): number {
  const age = Date.now() - capturedAt;
  if (age < 30_000)  return 1.0;
  if (age < 90_000)  return 0.6;
  if (age < 180_000) return 0.2;
  return 0;
}

// Recompute cluster scores from the full signal queue with live recency applied.
// Pure function — safe to call inside a reducer.
function computeScores(queue: LiveSignal[]): Record<ClusterKey, number> {
  const scores = emptyScores();
  for (const signal of queue) {
    const recency = liveRecency(signal.capturedAt);
    if (recency === 0) continue;
    const incoming =
      signal.source === 'search'
        ? scoreTextAgainstClusters(signal.value)
        : scoreTagsAgainstClusters(signal.tags);
    for (const key of CLUSTER_KEYS) {
      scores[key] = Math.min(1.0, scores[key] + incoming[key] * signal.weight * recency);
    }
  }
  return scores;
}

type State = {
  signalQueue: LiveSignal[];
  clusterScores: Record<ClusterKey, number>;
};

type Action =
  | { type: 'add_signal'; signal: LiveSignal }
  | { type: 'rehydrate'; queue: LiveSignal[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add_signal': {
      const now = Date.now();
      const pruned = state.signalQueue
        .filter(s => now - s.capturedAt < SIGNAL_TTL_MS)
        .slice(-(QUEUE_MAX - 1));
      const next = [...pruned, action.signal];
      return { signalQueue: next, clusterScores: computeScores(next) };
    }
    case 'rehydrate': {
      const live = action.queue
        .filter(s => liveRecency(s.capturedAt) > 0)
        .slice(-QUEUE_MAX);
      return { signalQueue: live, clusterScores: computeScores(live) };
    }
  }
}

export type SessionIntentCtx = {
  clusterScores: Record<ClusterKey, number>;
  activeCluster: ClusterKey | null;   // null in M5a; M5c wires the auto-switch
  addSearchSignal: (text: string, weight?: number) => void;
  addBrowseSignal: (tags: string[]) => void;
};

const Ctx = createContext<SessionIntentCtx | null>(null);

export function SessionIntentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    signalQueue: [],
    clusterScores: emptyScores(),
  });

  // Rehydrate from sessionStorage on mount — survives product-page → home round-trips.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const queue = JSON.parse(raw) as LiveSignal[];
      if (Array.isArray(queue) && queue.length > 0) {
        dispatch({ type: 'rehydrate', queue });
      }
    } catch {}
  }, []);

  // Persist signal queue on every change.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.signalQueue));
    } catch {}
  }, [state.signalQueue]);

  // Development-only: log score updates so M5a verification is easy in devtools.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const top = topCluster(state.clusterScores);
    if (!top) return;
    console.log(
      '[intent]',
      Object.entries(state.clusterScores)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}:${v.toFixed(2)}`)
        .join(' '),
    );
  }, [state.clusterScores]);

  const addSearchSignal = useCallback((text: string, weight = 1.0) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({
      type: 'add_signal',
      signal: { capturedAt: Date.now(), source: 'search', weight, value: trimmed, tags: [] },
    });
  }, []);

  const addBrowseSignal = useCallback((tags: string[]) => {
    if (tags.length === 0) return;
    dispatch({
      type: 'add_signal',
      signal: { capturedAt: Date.now(), source: 'browse', weight: 0.7, value: '', tags },
    });
  }, []);

  return (
    <Ctx.Provider value={{
      clusterScores: state.clusterScores,
      activeCluster: null,   // wired in M5c
      addSearchSignal,
      addBrowseSignal,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSessionIntent(): SessionIntentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSessionIntent must be used inside SessionIntentProvider');
  return ctx;
}
