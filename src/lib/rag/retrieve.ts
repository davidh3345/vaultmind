import { tokenize } from "./index";

export interface IndexedChunk {
  chunkId: string;
  terms: string[];
}
export interface Ranked {
  chunkId: string;
  score: number;
}

/** Classic BM25 over the in-memory (decrypted) manifest term lists. Pure. */
export function bm25(entries: IndexedChunk[], query: string, k = 4): Ranked[] {
  const q = tokenize(query);
  if (q.length === 0 || entries.length === 0) return [];

  const N = entries.length;
  const lens = entries.map((e) => e.terms.length || 1);
  const avgdl = lens.reduce((a, b) => a + b, 0) / N;

  // document frequency per query term
  const df = new Map<string, number>();
  for (const term of new Set(q)) {
    let d = 0;
    for (const e of entries) if (e.terms.includes(term)) d++;
    df.set(term, d);
  }

  const k1 = 1.5;
  const b = 0.75;
  const scored: Ranked[] = entries.map((e, i) => {
    const tf = new Map<string, number>();
    for (const t of e.terms) tf.set(t, (tf.get(t) || 0) + 1);
    let score = 0;
    for (const term of q) {
      const f = tf.get(term) || 0;
      if (f === 0) continue;
      const d = df.get(term) || 0;
      const idf = Math.log(1 + (N - d + 0.5) / (d + 0.5));
      const denom = f + k1 * (1 - b + (b * lens[i]) / avgdl);
      score += idf * ((f * (k1 + 1)) / denom);
    }
    return { chunkId: e.chunkId, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}
