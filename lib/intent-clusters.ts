export type ClusterKey = 'repair' | 'gift' | 'outdoor' | 'project' | 'starter';

export type ClusterDef = {
  key: ClusterKey;
  label: string;
  description: string;
  keywords: string[];
  tags: string[];
  fallbackPreset: string;
};

export const CLUSTERS: ClusterDef[] = [
  {
    key: 'repair',
    label: 'home repair',
    description: 'Active repair in progress',
    keywords: [
      'faucet', 'leak', 'wrench', 'cartridge', 'drain', 'clog', 'fix', 'repair',
      'plumbing', 'pipe', 'seal', 'tape', 'washer', 'o-ring', 'basin', 'silicone',
      'drip', 'broken', 'replace', 'patch', 'toilet', 'valve', 'shutoff',
    ],
    tags: ['repair', 'plumbing', 'leak', 'beginner'],
    fallbackPreset: 'repair',
  },
  {
    key: 'gift',
    label: 'gift buying',
    description: 'Shopping for someone else',
    keywords: [
      'gift', "father's day", 'birthday', 'present', 'ideas', 'for him', 'for her',
      'for dad', 'for mom', 'surprise', 'holiday', 'christmas', 'housewarming',
    ],
    tags: ['gift', 'dad', 'popular', 'premium'],
    fallbackPreset: 'gift',
  },
  {
    key: 'outdoor',
    label: 'outdoor & garden',
    description: 'Patio, garden, and seasonal projects',
    keywords: [
      'patio', 'garden', 'grill', 'outdoor', 'porch', 'mulch', 'deck', 'lawn',
      'soil', 'plants', 'seasonal', 'backyard', 'bistro', 'string lights', 'hose',
    ],
    tags: ['outdoor', 'patio', 'seasonal', 'garden'],
    fallbackPreset: 'outdoor',
  },
  {
    key: 'project',
    label: 'building a project',
    description: 'DIY build or installation underway',
    keywords: [
      'drill', 'build', 'cut', 'install', 'workshop', 'plywood', 'saw', 'lumber',
      'circular saw', 'screw', 'nail', 'stud', 'framing', 'power tool',
    ],
    tags: ['power-tool', 'project', 'accessory'],
    fallbackPreset: 'project',
  },
  {
    key: 'starter',
    label: 'first home setup',
    description: 'Equipping a new home from scratch',
    keywords: [
      'first home', 'moved', 'beginner', 'basics', 'apartment', 'essentials',
      'just bought', 'new homeowner', 'starter', 'what do i need',
    ],
    tags: ['popular', 'best-seller', 'home', 'beginner'],
    fallbackPreset: 'starter',
  },
];

export const CLUSTER_KEYS: ClusterKey[] = CLUSTERS.map(c => c.key);

export function emptyScores(): Record<ClusterKey, number> {
  return Object.fromEntries(CLUSTER_KEYS.map(k => [k, 0])) as Record<ClusterKey, number>;
}

// Returns a per-cluster score (0–1) for a single text signal.
// Each matching keyword contributes 0.2; capped at 1.0.
// Longest keywords are matched first and their span is consumed so a phrase like
// "circular saw" doesn't also credit the shorter "saw" within the same cluster.
export function scoreTextAgainstClusters(text: string): Record<ClusterKey, number> {
  const lower = text.toLowerCase().trim();
  const scores = emptyScores();
  for (const cluster of CLUSTERS) {
    const sorted = [...cluster.keywords].sort((a, b) => b.length - a.length);
    let remaining = lower;
    let matched = 0;
    for (const kw of sorted) {
      if (remaining.includes(kw)) {
        matched++;
        remaining = remaining.replace(kw, ' ');
      }
    }
    scores[cluster.key] = Math.min(1.0, matched * 0.2);
  }
  return scores;
}

// Returns a per-cluster score (0–1) for a browse signal (category click or product view).
// Score = fraction of the cluster's own tags that appear in the signal's tag set.
export function scoreTagsAgainstClusters(tags: string[]): Record<ClusterKey, number> {
  const tagSet = new Set(tags);
  const scores = emptyScores();
  for (const cluster of CLUSTERS) {
    if (cluster.tags.length === 0) continue;
    const matched = cluster.tags.filter(t => tagSet.has(t)).length;
    scores[cluster.key] = matched / cluster.tags.length;
  }
  return scores;
}

// Returns the highest-scoring cluster, or null if all scores are below 0.1.
// Ties are broken by CLUSTER_KEYS definition order (repair wins over gift, etc.).
export function topCluster(scores: Record<ClusterKey, number>): ClusterKey | null {
  let best: ClusterKey | null = null;
  let bestScore = 0.1;
  for (const key of CLUSTER_KEYS) {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      best = key;
    }
  }
  return best;
}
