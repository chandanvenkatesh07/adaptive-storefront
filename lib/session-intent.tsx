'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import {
  type ClusterKey,
  type ClusterDef,
  CLUSTER_KEYS,
  CLUSTERS,
  emptyScores,
  scoreTextAgainstClusters,
  scoreTagsAgainstClusters,
  topCluster,
} from './intent-clusters';
import type { GeneratedPage, PageBlock, PageMode } from './schema';

const STORAGE_KEY = 'buildright_intent_v1';
const QUEUE_MAX = 20;
const SIGNAL_TTL_MS = 180_000;   // 3 minutes
const GEN_THRESHOLD = 0.3;       // score at which background generation fires

export type LiveSignal = {
  capturedAt: number;
  source: 'search' | 'browse';
  weight: number;
  value: string;
  tags: string[];
};

function liveRecency(capturedAt: number): number {
  const age = Date.now() - capturedAt;
  if (age < 30_000)  return 1.0;
  if (age < 90_000)  return 0.6;
  if (age < 180_000) return 0.2;
  return 0;
}

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

// What to send as `input` to /api/gen-page for each cluster.
const CLUSTER_INPUTS: Record<ClusterKey, string> = {
  repair:  'Shopper actively searching for plumbing repair parts and tools. Likely fixing a leaky faucet, drain, or pipe.',
  gift:    "Shopper browsing gift ideas — Father's Day, birthday, or housewarming. Interest in popular DIY and home tools.",
  outdoor: 'Shopper browsing outdoor and garden products. Interest in patio furniture, garden beds, and seasonal items.',
  project: 'Shopper equipping for a DIY build project. Searching drills, circular saws, and power tool accessories.',
  starter: 'New homeowner or first apartment setup. Looking for beginner tool and home improvement essentials.',
};

type StreamEvent =
  | { type: 'block'; block: PageBlock; mode?: PageMode }
  | { type: 'done'; fromAI: boolean }
  | { type: 'fallback'; blocks: PageBlock[]; mode: PageMode; fromAI: false };

async function fetchClusterPage(
  cluster: ClusterDef,
  signal: AbortSignal,
): Promise<GeneratedPage | null> {
  try {
    const response = await fetch('/api/gen-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: CLUSTER_INPUTS[cluster.key], fallbackPreset: cluster.fallbackPreset }),
      signal,
    });
    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const blocks: PageBlock[] = [];
    let mode: PageMode = 'default';
    let fromAI = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as StreamEvent;
        if (event.type === 'block') {
          blocks.push(event.block);
          if (event.mode) mode = event.mode;
        } else if (event.type === 'done') {
          fromAI = event.fromAI;
        } else if (event.type === 'fallback') {
          return { blocks: event.blocks, mode: event.mode, fromAI: false };
        }
      }
    }

    return blocks.length > 0 ? { blocks, mode, fromAI } : null;
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null;
    return null;
  }
}

type State = {
  signalQueue: LiveSignal[];
  clusterScores: Record<ClusterKey, number>;
  cache: Partial<Record<ClusterKey, GeneratedPage>>;
};

type Action =
  | { type: 'add_signal'; signal: LiveSignal }
  | { type: 'rehydrate'; queue: LiveSignal[]; cache: Partial<Record<ClusterKey, GeneratedPage>> }
  | { type: 'cache_page'; cluster: ClusterKey; page: GeneratedPage };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add_signal': {
      const now = Date.now();
      const pruned = state.signalQueue
        .filter(s => now - s.capturedAt < SIGNAL_TTL_MS)
        .slice(-(QUEUE_MAX - 1));
      const next = [...pruned, action.signal];
      return { ...state, signalQueue: next, clusterScores: computeScores(next) };
    }
    case 'rehydrate': {
      const live = action.queue
        .filter(s => liveRecency(s.capturedAt) > 0)
        .slice(-QUEUE_MAX);
      return { signalQueue: live, clusterScores: computeScores(live), cache: action.cache };
    }
    case 'cache_page':
      return { ...state, cache: { ...state.cache, [action.cluster]: action.page } };
  }
}

export type SessionIntentCtx = {
  clusterScores: Record<ClusterKey, number>;
  activeCluster: ClusterKey | null;   // null in M5a/M5b; M5c wires the auto-switch
  cache: Partial<Record<ClusterKey, GeneratedPage>>;
  addSearchSignal: (text: string, weight?: number) => void;
  addBrowseSignal: (tags: string[]) => void;
};

const Ctx = createContext<SessionIntentCtx | null>(null);

export function SessionIntentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    signalQueue: [],
    clusterScores: emptyScores(),
    cache: {},
  });

  // Tracks clusters with a background fetch in flight — prevents double-firing.
  const generatingRef = useRef(new Set<ClusterKey>());
  // AbortControllers for each in-flight fetch — cancelled on unmount.
  const abortControllersRef = useRef(new Map<ClusterKey, AbortController>());

  // Abort all in-flight fetches on unmount.
  useEffect(() => () => {
    for (const ac of abortControllersRef.current.values()) ac.abort();
  }, []);

  // Rehydrate from sessionStorage on mount.
  // Storage format: { queue: LiveSignal[], cache: Record<ClusterKey, GeneratedPage> }
  // Backwards-compat: if value is a plain array (M5a format), treat as queue + empty cache.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      let queue: LiveSignal[];
      let cache: Partial<Record<ClusterKey, GeneratedPage>>;
      if (Array.isArray(parsed)) {
        queue = parsed as LiveSignal[];
        cache = {};
      } else {
        const obj = parsed as { queue?: LiveSignal[]; cache?: Partial<Record<ClusterKey, GeneratedPage>> };
        queue = obj.queue ?? [];
        cache = obj.cache ?? {};
      }
      if (queue.length > 0 || Object.keys(cache).length > 0) {
        dispatch({ type: 'rehydrate', queue, cache });
      }
    } catch {}
  }, []);

  // Persist signal queue + page cache on every change.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ queue: state.signalQueue, cache: state.cache }));
    } catch {}
  }, [state.signalQueue, state.cache]);

  // Background generation: when any cluster crosses GEN_THRESHOLD and isn't cached,
  // fire /api/gen-page in the background and store the result in the cache.
  // No visible UI change in M5b — the cached page is consumed by M5c.
  useEffect(() => {
    for (const cluster of CLUSTERS) {
      const { key } = cluster;
      if (
        state.clusterScores[key] >= GEN_THRESHOLD &&
        !state.cache[key] &&
        !generatingRef.current.has(key)
      ) {
        generatingRef.current.add(key);
        const ac = new AbortController();
        abortControllersRef.current.set(key, ac);

        fetchClusterPage(cluster, ac.signal).then(page => {
          generatingRef.current.delete(key);
          abortControllersRef.current.delete(key);
          if (page) dispatch({ type: 'cache_page', cluster: key, page });
        });
      }
    }
  }, [state.clusterScores, state.cache]);

  // Development-only: log score updates with cache status.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const top = topCluster(state.clusterScores);
    if (!top) return;
    console.log(
      '[intent]',
      Object.entries(state.clusterScores)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => {
          const cached = state.cache[k as ClusterKey] ? '✓' : generatingRef.current.has(k as ClusterKey) ? '…' : '';
          return `${k}:${v.toFixed(2)}${cached}`;
        })
        .join(' '),
    );
  }, [state.clusterScores, state.cache]);

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
      cache: state.cache,
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
