import { tokenize } from "./index";
import type { Citation } from "../types";

export interface HitChunk {
  chunkId: string;
  docId: string;
  filename: string;
  text: string;
  page?: number;
}

/** Pick the most query-relevant sentence-ish snippet from a chunk. Pure. */
export function bestSnippet(text: string, query: string, max = 240): string {
  const qset = new Set(tokenize(query));
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return text.slice(0, max);
  let best = sentences[0];
  let bestScore = -1;
  for (const s of sentences) {
    const overlap = tokenize(s).filter((t) => qset.has(t)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = s;
    }
  }
  return best.length > max ? best.slice(0, max).trim() + "…" : best;
}

export function buildCitations(hits: HitChunk[], query: string): Citation[] {
  return hits.map((h) => ({
    docId: h.docId,
    chunkId: h.chunkId,
    filename: h.filename,
    page: h.page,
    snippet: bestSnippet(h.text, query),
  }));
}

/** Assemble the grounded prompt sent to 0G Compute. Pure. */
export function buildPrompt(hits: HitChunk[], question: string): { system: string; user: string } {
  const context = hits
    .map((h, i) => `[${i + 1}] (${h.filename}${h.page ? ` p.${h.page}` : ""})\n${h.text}`)
    .join("\n\n");
  const system =
    "You are VaultMind, a private document assistant. Answer ONLY from the provided context. " +
    "Cite sources inline as [1], [2] matching the context blocks. If the answer is not in the context, " +
    'say "I don\'t see that in your documents." Be concise.';
  const user = `Context:\n${context}\n\nQuestion: ${question}`;
  return { system, user };
}
