# 🔒 VaultMind — private document AI on 0G

**Encrypt your documents in your browser, store them on decentralized 0G Storage, and ask questions answered by 0G Compute — your files are never stored in the clear, and the operator only ever handles ciphertext.**

A **0G Zero Cup 2026** entry.

Most "chat with your docs" tools upload your files to a server you have to trust. VaultMind doesn't: every document is **AES-GCM-encrypted in your browser** with a key only you hold, then stored as **ciphertext on 0G Storage**. Questions are answered by **0G Compute** over only the passages you ask about.

## Why 0G — and why it dies without 0G (eligibility removal test)

| Pillar | What VaultMind uses it for | Remove it and… |
|---|---|---|
| **0G Storage** | every encrypted chunk + the encrypted manifest live here, addressed by root hash | there is **no vault** — nowhere decentralized/censorship-resistant to keep the ciphertext |
| **0G Compute** | answers your questions (Router, OpenAI-compatible, on 0G's TEE infra) | there are **no answers** |

Strip 0G out and the product does not exist. This is not a bolt-on.

## What's real today vs. the Jul 8 roadmap (honest)

This is the **group-stage** build. All 0G access sits behind small adapters (`src/lib/og/*`).

| | **Now (group stage)** | **Jul 8 target** |
|---|---|---|
| Storage | **real 0G Storage**, operator-signed, **ciphertext only** | same + manifest hardening |
| Compute | **real 0G Compute Router** (OpenAI-compatible) — *infrastructure-level* TEE | **Direct/browser** broker with **per-response TEE attestation** (green receipt) |
| Encryption | AES-GCM in the browser, client-local key + export/import recovery | key wrapped by a wallet signature |
| Operator can read | storage: ciphertext only · inference: the per-question excerpts you send | **nothing in cleartext** (inference moves browser→TEE) |

The UI is explicit about this: a **LOCAL DEV** banner shows when 0G isn't configured, and the answer **receipt** says *"infrastructure-level"* — never claims a per-response proof it doesn't have.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

Out of the box it runs in **LOCAL DEV MODE** (no secrets): documents are AES-GCM-encrypted in the browser and stored in a local ciphertext store; answers are extractive. To run **real 0G** (required for the competition demo):

1. **Operator wallet (0G Storage):** `npm run gen-operator` → fund the printed address at <https://faucet.0g.ai>.
2. **Router key (0G Compute):** create an `sk-...` key at <https://pc.testnet.0g.ai> (API Keys → "inference") and put it in `.env.local` as `ZG_ROUTER_API_KEY`.
3. **(real 0G Storage SDK):** `npm install @0gfoundation/0g-storage-ts-sdk` (optional runtime dep; the storage route auto-detects it).

When both are set the banner turns green ("Live on 0G") and answers run on real 0G Compute over chunks stored on real 0G Storage.

```bash
npm test               # 11 unit tests: crypto (wrong-key-throws, keyCheck), BM25, citations
npm run build          # production build / typecheck
```

## How it works

1. **Upload** → parsed in-browser (`pdfjs-dist` for PDF) → chunked → lexical index built.
2. **Encrypt** each chunk + the manifest with the vault key (`src/lib/crypto/aes.ts`, AES-GCM, authenticated).
3. **Store** ciphertext on 0G Storage via `/api/storage/*` (operator signer — ciphertext only).
4. **Ask** → decrypt the manifest in-browser → **BM25** (`src/lib/rag/*`) → decrypt only the hit chunks → send the grounded prompt to **0G Compute Router** via `/api/ask` → cited answer + receipt.

The vault key never leaves your browser. 0G Storage only ever holds ciphertext.

## Layout

- `src/lib/crypto/` — AES-GCM, keyCheck, wallet-sig wrap/unwrap.
- `src/lib/rag/` — chunking, tokenizer, BM25 retrieval, citations.
- `src/lib/og/` — the 0G adapter seam (storage, compute, config, attestation).
- `src/lib/vault/` — orchestration + local persistence.
- `src/app/api/` — `storage/put`, `storage/get` (operator signer), `ask` (Router), `status`.
- `docs/superpowers/specs/` — the full design spec (v4).

## Tech

Next.js 14 · TypeScript · Tailwind · Vitest · ethers · openai (Router) · pdfjs-dist. Node ≥ 22.

---

*VaultMind · Zero Cup 2026 · your documents, encrypted on 0G — answered, never read.*
