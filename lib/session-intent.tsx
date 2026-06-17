'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
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
const SWITCH_THRESHOLD = 0.4;    // score at which page auto-switches
const SWITCH_LEAD = 0.1;         // challenger must lead current cluster by this margin
const LOCK_MS = 60_000;          // after a switch, raise threshold for this long

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

    // Flush any final line not terminated by \n (e.g. the `done` event).
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer) as StreamEvent;
        if (event.type === 'done') fromAI = event.fromAI;
        else if (event.type === 'fallback') return { blocks: event.blocks, mode: event.mode, fromAI: false };
        else if (event.type === 'block') blocks.push(event.block);
      } catch {}
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
  activeCluster: ClusterKey | null;
  lockedUntil: number;
};

type Action =
  | { type: 'add_signal'; signal: LiveSignal }
  | { type: 'rehydrate'; queue: LiveSignal[]; cache: Partial<Record<ClusterKey, GeneratedPage>>; activeCluster: ClusterKey | null; lockedUntil: number }
  | { type: 'cache_page'; cluster: ClusterKey; page: GeneratedPage }
  | { type: 'switch_cluster'; cluster: ClusterKey }
  | { type: 'set_cluster'; cluster: ClusterKey | null }
  | { type: 'tick' };

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
      return {
        signalQueue: live,
        clusterScores: computeScores(live),
        cache: action.cache,
        activeCluster: action.activeCluster,
        lockedUntil: action.lockedUntil,
      };
    }
    case 'cache_page':
      return { ...state, cache: { ...state.cache, [action.cluster]: action.page } };
    case 'switch_cluster':
      return { ...state, activeCluster: action.cluster, lockedUntil: Date.now() + LOCK_MS };
    case 'set_cluster':
      return {
        ...state,
        activeCluster: action.cluster,
        // Lock on manual restore so auto-switch can't immediately override a trail click.
        // Reset to 0 when clearing to null so re-engagement happens at normal threshold.
        lockedUntil: action.cluster !== null ? Date.now() + LOCK_MS : 0,
      };
    case 'tick':
      return state;
  }
}

export type SessionIntentCtx = {
  clusterScores: Record<ClusterKey, number>;
  activeCluster: ClusterKey | null;
  rehydratedCluster: ClusterKey | null;
  cache: Partial<Record<ClusterKey, GeneratedPage>>;
  addSearchSignal: (text: string, weight?: number) => void;
  addBrowseSignal: (tags: string[]) => void;
  setActiveCluster: (cluster: ClusterKey | null) => void;
};

const Ctx = createContext<SessionIntentCtx | null>(null);

export function SessionIntentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    signalQueue: [],
    clusterScores: emptyScores(),
    cache: {},
    activeCluster: null,
    lockedUntil: 0,
  });

  const generatingRef = useRef(new Set<ClusterKey>());
  const abortControllersRef = useRef(new Map<ClusterKey, AbortController>());
  const failedRef = useRef(new Set<ClusterKey>());
  const [rehydratedCluster, setRehydratedCluster] = useState<ClusterKey | null>(null);

  useEffect(() => () => {
    for (const ac of abortControllersRef.current.values()) ac.abort();
  }, []);

  // Rehydrate from sessionStorage on mount.
  // Storage format: { queue, cache, activeCluster, lockedUntil }
  // Backwards-compat: M5a (array) and M5b ({ queue, cache }) formats are handled gracefully.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      let queue: LiveSignal[] = [];
      let cache: Partial<Record<ClusterKey, GeneratedPage>> = {};
      let activeCluster: ClusterKey | null = null;
      let lockedUntil = 0;

      if (Array.isArray(parsed)) {
        queue = parsed as LiveSignal[];
      } else {
        const obj = parsed as {
          queue?: LiveSignal[];
          cache?: Partial<Record<ClusterKey, GeneratedPage>>;
          activeCluster?: ClusterKey | null;
          lockedUntil?: number;
        };
        queue = obj.queue ?? [];
        cache = obj.cache ?? {};
        activeCluster = obj.activeCluster ?? null;
        lockedUntil = obj.lockedUntil ?? 0;
      }

      // Guard against stale sessionStorage keys surviving a cluster rename.
      if (activeCluster !== null && !(CLUSTER_KEYS as string[]).includes(activeCluster)) {
        activeCluster = null;
      }
      setRehydratedCluster(activeCluster);
      dispatch({ type: 'rehydrate', queue, cache, activeCluster, lockedUntil });
    } catch {}
  }, []);

  // Persist full state on every change.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        queue: state.signalQueue,
        cache: state.cache,
        activeCluster: state.activeCluster,
        lockedUntil: state.lockedUntil,
      }));
    } catch {}
  }, [state.signalQueue, state.cache, state.activeCluster, state.lockedUntil]);

  // Background generation: fire /api/gen-page when a cluster crosses GEN_THRESHOLD.
  // failedRef prevents retry storms — a failed cluster is skipped until page reload.
  useEffect(() => {
    for (const cluster of CLUSTERS) {
      const { key } = cluster;
      if (
        state.clusterScores[key] >= GEN_THRESHOLD &&
        !state.cache[key] &&
        !generatingRef.current.has(key) &&
        !failedRef.current.has(key)
      ) {
        generatingRef.current.add(key);
        const ac = new AbortController();
        abortControllersRef.current.set(key, ac);

        fetchClusterPage(cluster, ac.signal).then(page => {
          generatingRef.current.delete(key);
          abortControllersRef.current.delete(key);
          if (page) {
            dispatch({ type: 'cache_page', cluster: key, page });
          } else {
            failedRef.current.add(key);
          }
        });
      }
    }
  }, [state.clusterScores, state.cache]);

  // Auto-switch: when the top cluster exceeds SWITCH_THRESHOLD and leads the current
  // cluster by SWITCH_LEAD, switch to it. The lock raises the threshold post-switch
  // to prevent oscillation when two clusters score close together.
  // A timeout fires a tick dispatch at lock expiry so a blocked cluster gets a second
  // look even if no new signals arrive.
  useEffect(() => {
    const top = topCluster(state.clusterScores);
    if (!top || top === state.activeCluster) return;

    const topScore = state.clusterScores[top];
    const currentScore = state.activeCluster ? state.clusterScores[state.activeCluster] : 0;
    const now = Date.now();
    const effectiveThreshold = now < state.lockedUntil
      ? SWITCH_THRESHOLD + 0.2  // raised threshold during lock period
      : SWITCH_THRESHOLD;

    if (topScore >= effectiveThreshold && topScore - currentScore >= SWITCH_LEAD) {
      dispatch({ type: 'switch_cluster', cluster: top });
      return;
    }

    const remaining = state.lockedUntil - now;
    if (remaining > 0) {
      const t = setTimeout(() => dispatch({ type: 'tick' }), remaining + 50);
      return () => clearTimeout(t);
    }
  }, [state.clusterScores, state.activeCluster, state.lockedUntil]);

  // Development-only: log score + cache status per cluster.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const top = topCluster(state.clusterScores);
    if (!top) return;
    const line = Object.entries(state.clusterScores)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => {
        const suffix = state.cache[k as ClusterKey] ? '✓'
          : generatingRef.current.has(k as ClusterKey) ? '…' : '';
        const active = k === state.activeCluster ? '*' : '';
        return `${k}:${v.toFixed(2)}${suffix}${active}`;
      })
      .join(' ');
    console.log('[intent]', line);
  }, [state.clusterScores, state.cache, state.activeCluster]);

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

  const setActiveCluster = useCallback((cluster: ClusterKey | null) => {
    dispatch({ type: 'set_cluster', cluster });
  }, []);

  return (
    <Ctx.Provider value={{
      clusterScores: state.clusterScores,
      activeCluster: state.activeCluster,
      rehydratedCluster,
      cache: state.cache,
      addSearchSignal,
      addBrowseSignal,
      setActiveCluster,
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
