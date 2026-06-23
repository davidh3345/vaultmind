/** Split a document's text into overlapping word-bounded chunks. Pure. */
export interface RawChunk {
  text: string;
  page?: number;
}

export function chunkText(text: string, opts?: { size?: number; overlap?: number }): RawChunk[] {
  const size = opts?.size ?? 900; // ~target chars per chunk
  const overlap = opts?.overlap ?? 150;
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean) return [];

  // Prefer paragraph boundaries, then pack to ~size with overlap.
  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: RawChunk[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push({ text: t });
    buf = "";
  };

  for (const p of paras) {
    if (p.length >= size) {
      flush();
      // hard-split a very long paragraph
      for (let i = 0; i < p.length; i += size - overlap) {
        chunks.push({ text: p.slice(i, i + size).trim() });
      }
      continue;
    }
    if ((buf + "\n\n" + p).length > size) {
      flush();
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  flush();
  return chunks.filter((c) => c.text.length > 0);
}
