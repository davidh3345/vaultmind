"use client";

import type { Answer, DecryptedManifest, DocMeta, ManifestEntry, Vault } from "../types";
import { decryptString, encryptString, makeKeyCheck, newVaultKey, verifyKeyCheck } from "../crypto/aes";
import { chunkText } from "../rag/chunk";
import { termsFor } from "../rag/index";
import { bm25 } from "../rag/retrieve";
import { buildCitations, buildPrompt, type HitChunk } from "../rag/cite";
import { extractText } from "../parse/extractText";
import { getBlob, putBlob } from "../og/storageClient";
import { ask as computeAsk, buildReceipt } from "../og/computeClient";
import { getKey, getVault, saveVault } from "./store";

function uid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// In-session cache of decrypted manifest entries per vault.
const entriesCache = new Map<string, ManifestEntry[]>();

export async function createVault(name: string): Promise<Vault> {
  const key = await newVaultKey();
  const keyCheck = await makeKeyCheck(key);
  const vault: Vault = {
    id: uid("vault"),
    name: name.trim().slice(0, 60) || "Untitled Vault",
    createdAt: Date.now(),
    keyEnvelope: { scheme: "client-local-v1", keyCheck },
    docs: [],
  };
  saveVault(vault, key);
  entriesCache.set(vault.id, []);
  return vault;
}

async function loadEntries(vault: Vault, key: string): Promise<ManifestEntry[]> {
  if (entriesCache.has(vault.id)) return entriesCache.get(vault.id)!;
  if (!vault.manifestRef) {
    entriesCache.set(vault.id, []);
    return [];
  }
  const enc = await getBlob(vault.manifestRef);
  const json = await decryptString(enc, key); // throws if key is wrong (authenticated)
  const manifest = JSON.parse(json) as DecryptedManifest;
  if (manifest.magic !== "VAULTMIND") throw new Error("manifest integrity check failed");
  entriesCache.set(vault.id, manifest.entries);
  return manifest.entries;
}

/** Validate the vault key on open (fast keyCheck before any download). */
export async function openVault(vault: Vault): Promise<{ key: string }> {
  const key = getKey(vault.id);
  if (!key) throw new Error("vault key not found on this device — import your recovery key");
  if (!(await verifyKeyCheck(vault.keyEnvelope.keyCheck, key))) {
    throw new Error("wrong key for this vault");
  }
  return { key };
}

export interface UploadProgress {
  file: string;
  chunks: number;
  backend: "0g" | "local";
}

/** Encrypt each chunk + the manifest in-browser, upload ciphertext to 0G Storage. */
export async function addFiles(
  vaultId: string,
  files: File[],
  onProgress?: (p: UploadProgress) => void,
): Promise<Vault> {
  const vault = getVault(vaultId)!;
  const { key } = await openVault(vault);
  const entries = await loadEntries(vault, key);
  const newDocs: DocMeta[] = [];
  let backend: "0g" | "local" = "local";

  for (const file of files) {
    const { text, pages } = await extractText(file);
    const docId = uid("doc");
    const chunks = chunkText(text);
    let n = 0;
    for (const c of chunks) {
      const enc = await encryptString(c.text, key);
      const { ref, backend: b } = await putBlob(enc);
      backend = b;
      entries.push({
        chunkId: `${docId}#${n}`,
        docId,
        ref,
        nonce: "",
        terms: termsFor(c.text),
        page: c.page,
      });
      n++;
    }
    const meta: DocMeta = { id: docId, filename: file.name, mime: file.type || "text/plain", pages };
    newDocs.push(meta);
    onProgress?.({ file: file.name, chunks: n, backend });
  }

  // Encrypt + upload the manifest (so 0G Storage holds ONLY ciphertext).
  const manifest: DecryptedManifest = { v: 1, magic: "VAULTMIND", entries };
  const encManifest = await encryptString(JSON.stringify(manifest), key);
  const { ref: manifestRef } = await putBlob(encManifest);

  const updated: Vault = { ...vault, docs: [...vault.docs, ...newDocs], manifestRef };
  saveVault(updated);
  entriesCache.set(vaultId, entries);
  return updated;
}

export async function askVault(vaultId: string, question: string): Promise<Answer> {
  const vault = getVault(vaultId)!;
  const { key } = await openVault(vault);
  const entries = await loadEntries(vault, key);

  const ranked = bm25(
    entries.map((e) => ({ chunkId: e.chunkId, terms: e.terms })),
    question,
    4,
  );

  if (ranked.length === 0) {
    return {
      id: uid("ans"),
      question,
      text: "I don't see that in your documents.",
      citations: [],
      attestation: { mode: "local-dev", level: "infra", verified: false, receiptHash: "vm-none" },
      at: Date.now(),
    };
  }

  // Decrypt ONLY the hit chunks.
  const hits: HitChunk[] = [];
  for (const r of ranked) {
    const e = entries.find((x) => x.chunkId === r.chunkId)!;
    const doc = vault.docs.find((d) => d.id === e.docId);
    const text = await decryptString(await getBlob(e.ref), key);
    hits.push({ chunkId: e.chunkId, docId: e.docId, filename: doc?.filename || "document", text, page: e.page });
  }

  const { system, user } = buildPrompt(hits, question);
  const { answer, meta } = await computeAsk(system, user);
  const citations = buildCitations(hits, question);

  return { id: uid("ans"), question, text: answer, citations, attestation: buildReceipt(meta), at: Date.now() };
}
