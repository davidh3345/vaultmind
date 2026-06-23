import { describe, it, expect } from "vitest";
import {
  newVaultKey,
  encryptString,
  decryptString,
  makeKeyCheck,
  verifyKeyCheck,
  wrapKey,
  unwrapKey,
  randomSalt,
  b64encode,
} from "../src/lib/crypto/aes";
import { chunkText } from "../src/lib/rag/chunk";
import { tokenize, termsFor } from "../src/lib/rag/index";
import { bm25 } from "../src/lib/rag/retrieve";
import { bestSnippet, buildPrompt } from "../src/lib/rag/cite";

describe("crypto: authenticated encryption", () => {
  it("round-trips a string", async () => {
    const k = await newVaultKey();
    const blob = await encryptString("secret contract terms", k);
    expect(await decryptString(blob, k)).toBe("secret contract terms");
  });

  it("a WRONG key throws (never silent)", async () => {
    const k1 = await newVaultKey();
    const k2 = await newVaultKey();
    const blob = await encryptString("nda clause 7", k1);
    await expect(decryptString(blob, k2)).rejects.toThrow();
  });

  it("keyCheck validates the right key and rejects the wrong one", async () => {
    const k = await newVaultKey();
    const other = await newVaultKey();
    const kc = await makeKeyCheck(k);
    expect(await verifyKeyCheck(kc, k)).toBe(true);
    expect(await verifyKeyCheck(kc, other)).toBe(false);
  });

  it("wallet-sig wrap/unwrap recovers the same key", async () => {
    const k = await newVaultKey();
    const sig = b64encode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]));
    const salt = randomSalt();
    const wrapped = await wrapKey(k, sig, salt);
    expect(await unwrapKey(wrapped, sig, salt)).toBe(k);
  });
});

describe("rag: chunking", () => {
  it("splits text into non-empty chunks", () => {
    const text = Array.from({ length: 20 }, (_, i) => `Paragraph ${i} with several words here.`).join("\n\n");
    const chunks = chunkText(text, { size: 200, overlap: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.text.length).toBeGreaterThan(0));
  });
});

describe("rag: tokenize/terms", () => {
  it("drops stopwords and lowercases", () => {
    const t = tokenize("The Quick Brown Foxes are running");
    expect(t).not.toContain("the");
    expect(t).not.toContain("are");
    expect(t.some((x) => x.startsWith("fox"))).toBe(true);
  });
  it("termsFor returns tokens", () => {
    expect(termsFor("indemnification liability clause").length).toBeGreaterThan(0);
  });
});

describe("rag: BM25 retrieval", () => {
  const entries = [
    { chunkId: "c1", terms: termsFor("The tenant shall pay rent on the first of each month.") },
    { chunkId: "c2", terms: termsFor("Termination requires ninety days written notice to the landlord.") },
    { chunkId: "c3", terms: termsFor("The security deposit is two months and is refundable.") },
  ];
  it("ranks the most relevant chunk first", () => {
    const r = bm25(entries, "how much notice to terminate the lease?", 2);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].chunkId).toBe("c2");
  });
  it("returns empty for an empty query", () => {
    expect(bm25(entries, "", 2)).toEqual([]);
  });
});

describe("rag: citations & prompt", () => {
  it("bestSnippet picks the query-relevant sentence", () => {
    const text = "Rent is due monthly. Termination requires ninety days notice. The deposit is refundable.";
    expect(bestSnippet(text, "termination notice period")).toMatch(/ninety days/i);
  });
  it("buildPrompt embeds context and instructs citing", () => {
    const { system, user } = buildPrompt(
      [{ chunkId: "c1", docId: "d1", filename: "lease.txt", text: "Ninety days notice." }],
      "notice?",
    );
    expect(system).toMatch(/cite/i);
    expect(user).toMatch(/Ninety days notice/);
  });
});
