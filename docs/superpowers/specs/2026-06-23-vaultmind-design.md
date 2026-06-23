# VaultMind — Design Spec v4 (complete, self-contained, implementation-ready)

**Date:** 2026-06-23
**Event:** 0G **Zero Cup 2026** (vibe-coding knockout tournament)
**Product name:** VaultMind *(renameable — alt: "Sealed", "Confide", "ZeroLeak")*
**One-liner (group stage):** Private document AI — your files are encrypted in your browser, stored on decentralized **0G Storage** as ciphertext, and answered on **0G's Router-backed TEE compute**.
**One-liner (Jul 8 target):** …and not even the operator can read them — with per-response proof, end-to-end.

This spec is written to be handed directly to an AI coding agent (Codex / Antigravity).
PART A = hackathon rules + the eligibility gate. PART B = product & architecture (staged).
PART C = exact official 0G constants/SDKs/errors. PART D = build order. PART E = links.

> **v4 changelog (tightens the group-stage contract — honest + buildable)**
> - **Storage signer resolved:** group stage uses an **operator server-signer** that uploads only **ciphertext** to 0G Storage (browser encrypts first). **No user wallet is required until Jul 8.**
> - **Claim strength matched to implementation:** group-stage wording is now **"runs on 0G Router-backed TEE infrastructure"** (infra-level), NOT "verifiable per-response proof." Per-response cryptographic attestation appears only in the Jul 8 Direct build. One-liner + B1 + A3 + B7 unified.
> - **Trust wording tightened:** at group stage the operator's `/api/ask` **can read the per-question plaintext excerpts** (not the vault, not stored ciphertext); storage operator sees only ciphertext. Full zero-knowledge arrives Jul 8.
> - **Decrypt-failure detection fully specified:** app-level **AES-GCM is authenticated → a wrong key throws**; we store **opaque ciphertext** (not the SDK's native encryption, so the silent-fail caveat doesn't apply to us); added a **`keyCheck` sentinel**, a ciphertext encoding (`nonce‖ct‖tag`), and a manifest `{v, magic}` header.
>
> *Prior (v3) fixes retained:* encrypted manifest (Storage = only ciphertext), unified retrieval order, browser-safe attestation (no fs `verifyService`), random-key-wrapped-by-KEK key scheme. *(v3 merged the official framework: eligibility gate, Router path, constants, error cheatsheet.)*

---

# PART A — Hackathon rules & the eligibility gate

## A1. The Zero Cup 2026 (facts)

- **Format:** open group stage (every valid project judged & ranked) → Top 32 → seeded knockout 32→16→8→4→2→1.
- **What to build:** an AI-native app/agent/companion/game **on 0G** (storage / compute / chain).
- **Timeline:** Reg Jun 15 · **Group-stage submission Jun 23 (today)** · Top 32 Jun 27 · R32 deadline Jun 28 · R16 deadline Jul 4 · **Final lock Jul 8** · Quarters vote Jul 8–10 · Semis Jul 12–14 · Final Jul 16–18 · Champion Jul 19.
- **Judging:** Group → R16 = judges vs rubric (normalized). Quarters → Final = **community voting**.
- **Prizes (stacking):** Top 8 $500 · Top 4 +$1,000 · Top 2 +$2,000 · Champion +$5,000 ($8,500 total). Pool $17,000.
- **Submit:** public repo URL + description (state what 0G does & why the app dies without it) + live build/demo video that **matches the code**; register a 0G Builder Profile at `0g.ai/arena/zero-cup`.

## A2. ⛔ THE ELIGIBILITY GATE — every design choice must clear this

> Source: official Submission Criteria. Failing any of these removes the whole project.

1. **AI-native ON 0G, 0G does real work.** **Removal test:** if you strip 0G out and the app still runs the same → "bolt-on" → **disqualified**. 0G must be core, not garnish.
2. **Vibe coding allowed** (any AI tooling) — disclose it. Cheating = submitting others' work or claiming features you don't have.
3. **Team's own work, from Jun 15 onward.** No pre-existing product, no thin fork. Open-source libs are fine.
4. **Public repo + working demo that MATCHES the code.** Faking the demo = misrepresentation = removal.
5–8. Deadlines lock snapshots · improve-and-resubmit until Jul 8 · one team/one project · cheating (plagiarism, faked demo, private repo mid-tournament, vote rigging) = out.

**What this means for VaultMind (critical):** a *simulated-only* build risks the bolt-on / demo-mismatch removal. **The Jun 23 build must run REAL 0G in the main flow.** Removal test for VaultMind: remove **0G Storage** → there is no vault; remove **0G Compute** → there are no answers. ✅ Passes — *provided both are real in the submitted build.*

## A3. Strategy: stage the build across rounds (gate-safe today, "wow" by Jul 8)

| | **Group stage (Jun 23) — clear the gate** | **Jul 8 target — community-vote wow** |
|---|---|---|
| **Compute** | **0G Compute Router** (OpenAI-compatible, `sk-` key, server-side) — real 0G inference on **0G Router-backed TEE infrastructure** (infra-level, *not* per-response proof) | **Direct/browser** broker (`@0gfoundation/0g-compute-ts-sdk`, wallet-signed) with **per-response TEE attestation** |
| **Storage** | **Real 0G Storage** — browser encrypts; an **operator server-signer** uploads **ciphertext** (operator sees only ciphertext). **No user wallet needed.** | same ciphertext-only storage + manifest hardening |
| **What the operator can read** | storage: **ciphertext only**. inference: `/api/ask` **can read the per-question plaintext excerpts** sent for that question (not the vault, not stored ciphertext) | **nothing in cleartext** — inference moves browser→TEE; operator only ever handles ciphertext |
| **Honest claim** | *"Your documents are encrypted on decentralized 0G Storage and answered on 0G TEE compute infrastructure."* (true) | *"Not even we can read your documents — here's the per-response proof."* (true) |

Why this is honest **and** gate-safe: at group stage we make only the narrower claim the build supports; the full zero-knowledge claim ships when the Direct/browser path does (timed perfectly for **community voting**). We never claim "the operator can't read it" while the operator's `/api/ask` is in the inference loop.

> 🔴 **#1 blocker to solve TODAY: 0G tokens.** Faucet gives **0.1 0G/wallet/day** (PART C). For group stage you fund **one operator wallet** (storage gas) + a **Router balance** — modest testnet amounts may suffice. Direct compute (Jul 8) needs ≥3 0G ledger + 1 0G/provider → plan via **0G Discord** or a small **mainnet** balance. Without tokens, "real 0G" can't run → gate fail.

---

# PART B — Product & architecture (staged, no internal contradictions)

## B0. Trust model (read first)

**Group stage (Jun 23) — narrower, honestly stated:**
- **Storage:** the browser encrypts every chunk and the manifest, then sends **ciphertext** to a thin operator route that uploads to 0G Storage with an **operator signer**. The operator sees **only ciphertext**; the vault key never leaves the browser.
- **Inference:** the browser retrieves + decrypts the hit chunks locally, assembles the prompt, and POSTs it to `/api/ask` (Router). **The operator can read that prompt — i.e. the selected plaintext excerpts for that one question** — but not the vault and not the stored ciphertext.
- Claim made: *"encrypted on 0G Storage, answered on 0G TEE compute infrastructure."* No per-response proof claim.

**Jul 8 target — zero-knowledge to the operator:**
1. **Plaintext exists only** in (a) the user's **browser** and (b) **inside the 0G TEE enclave** during inference. The operator only ever handles **ciphertext** (storage) and is **out of the inference path** (browser→TEE Direct).
2. **Retrieval runs in the browser:** at vault-open, fetch + decrypt the **manifest** → BM25 over the in-memory index → fetch + decrypt **only the hit chunks** → assemble locally.
3. **Keys:** a **random per-vault key** wrapped by a **wallet-signature-derived KEK**; only the wrapped key is stored. No server custody.
4. **Integrity caveat (stated openly):** the operator serves the browser code, so full assurance needs the client to be **open-source & self-hostable** — we ship source and say so, not "magic trustlessness."

## B1. Product

Private document Q&A ("private RAG"): create a **Vault**, upload confidential docs (contracts, medical, cap tables, research), ask questions, get **cited answers** + a **receipt showing the answer ran on 0G compute** *(per-response cryptographic attestation arrives in the Jul 8 Direct build)*. Target users: lawyers, clinicians, founders, HR, journalists.

## B2. Architecture

### B2a. Group-stage build (Jun 23) — Router + operator-signed ciphertext Storage

```
BROWSER: parse(pdfjs) → chunk → index → encrypt(chunk,K) / encrypt(manifest,K)   [K is browser-local]
         → POST ciphertext blobs to /api/storage/put
                                   └► OPERATOR SIGNER uploads ciphertext to 0G STORAGE → returns rootHash
ASK:     GET ciphertext (manifest,chunks) via /api/storage/get  → decrypt in browser
         → BM25 over decrypted in-memory manifest → pick hit chunkIds → decrypt only those
         → assemble prompt → POST prompt to /api/ask ──► 0G COMPUTE ROUTER (sk- key, TEE infra)
         ◄── answer + citations + router model/provider metadata → infra-level receipt
OPERATOR SERVER: /api/storage/* handles ONLY ciphertext (+ operator signer).  /api/ask holds the
                 Router sk- key and sees the per-query prompt (plaintext excerpts). Stores nothing.
```

### B2b. Jul 8 target — Direct/browser inference, zero-knowledge

```
Same browser pipeline + ciphertext storage, BUT inference goes browser → 0G Compute Direct broker:
   broker = createZGComputeNetworkBroker(signer)              // user's injected wallet
   fetch(`${endpoint}/chat/completions`, { headers, body })   // browser → TEE provider
   chatId = res.headers["ZG-Res-Key"] → broker.inference.processResponse(provider, chatId)  // in-memory verify
The operator is now OUT of the inference path → only ever handles ciphertext → zero-knowledge.
Per-response attestation feeds the green receipt.
```

- **Retrieval (both builds):** BM25 over the **decrypted in-memory manifest**, then decrypt only hits. (Unified — never "decrypt all chunks first.")
- **MVP retrieval is lexical** (BM25); vector embeddings are an optional later upgrade, still client-side.

## B3. The 0G adapter seam

All 0G access behind small modules in `src/lib/og/`. Group-stage and target share interfaces; only impls swap.

| Adapter | Interface | Group stage | Jul 8 target |
|---|---|---|---|
| `og/storage` | `putBlob(enc)→ref`, `getBlob(ref)→enc`, `putManifest(enc)→root`, `getManifest(root)→enc` | via `/api/storage/*` → **operator signer** uploads/serves **ciphertext** on 0G Storage (browser can't run `indexer.download`) | same (ciphertext only) |
| `og/crypto` | `newVaultKey()`, `enc/dec(blob,K)`, `makeKeyCheck(K)`, `wrapKey(K,kek)`, `unwrapKey(w,kek)`, `deriveKEK(sig,salt)` | WebCrypto AES-GCM; **K stored browser-local** (IndexedDB) + export/import recovery | + `K` wrapped by wallet-sig KEK |
| `og/wallet` | `connect()`, `signCanonical(vaultId)`, `signer` | **not required** | injected wallet (`ethers BrowserProvider`) — Direct inference + key derivation |
| `og/compute` | `ask(prompt)→{answer, meta}` | **Router** via `/api/ask` (server-side `sk-` key) | **Direct** broker (browser, wallet) |
| `og/attestation` | `verifyResponse(meta)→{verified, signer, model, chatId}` | router metadata → **infra-level** receipt ("runs on 0G TEE infra") | `processResponse` in-memory → verified green receipt + links |
| `og/config` | `MODE` = `router` \| `direct`, network, badges | router | direct |

## B4. Data model

```ts
Vault {
  id, name, createdAt
  ownerAddress?                  // set only in wallet mode (Jul 8)
  keyEnvelope: {
    scheme: "client-local-v1" | "wallet-sig-v1"
    keyCheck: string             // AES-GCM(K) of a fixed sentinel — used to validate K on reopen
    // wallet-sig-v1 only:
    salt?: string                // HKDF salt
    wrapped?: string             // random vault key K, AES-GCM-wrapped by the wallet-derived KEK
    canonicalMsg?: string        // exact message the user signs to re-derive the KEK
    // client-local-v1: raw K lives in IndexedDB on the device (never in this object), + export recovery
  }
  manifestRoot?: string          // 0G Storage root hash of the ENCRYPTED manifest blob
  manifestNonce: string          // AES-GCM nonce for the manifest blob
  docs: DocMeta[]                // filename, mime, pages — NO plaintext, NO terms
}
// Encrypted-at-rest manifest. Decrypted only in the browser. After decrypt, validate header:
DecryptedManifest { v: 1, magic: "VAULTMIND", entries: ManifestEntry[] }   // browser memory only
ManifestEntry { chunkId, docId, ref, nonce, terms: string[], page? }       // terms live ONLY here (encrypted at rest)
DocMeta { id, filename, mime, pages? }

// Every stored blob is encoded as:  nonce(12 bytes) ‖ ciphertext ‖ GCM-tag(16 bytes)
Answer { id, question, text, citations: {docId,chunkId,snippet}[], attestation, at }
Attestation {
  mode: "router" | "TeeML" | "TeeTLS" | "demo"
  verified: boolean              // router: false/infra-level; direct: true when processResponse passes
  level: "infra" | "per-response"
  model?, providerAddress?, signer?, chatId?
  links?: { signer?: string; providerAttestation?: string }   // chainscan / pc.0g.ai (browser-safe)
  receiptHash: string
}
```

## B5. Crypto & key management (the robust contract — implement exactly)

1. **Create vault:** `K = WebCrypto.generateKey(AES-GCM, 256)` (random, once).
2. **Key check:** `keyCheck = AES-GCM(K).encrypt("vaultmind-keycheck-v1")` → store in `keyEnvelope`. On reopen, decrypt `keyCheck` **first**; AES-GCM is authenticated, so a wrong K **throws** → detect immediately and prompt recovery.
3. **Group stage (`client-local-v1`):** store raw `K` in **IndexedDB** (device-local), plus **Export recovery key** (download `K` as a file) + **Import**. No wallet, no signing.
4. **Jul 8 (`wallet-sig-v1`):** `KEK = HKDF-SHA256(personal_sign("VaultMind key derivation v1\nvault:<id>"), salt, "vaultmind-kek")`; `wrapped = AES-GCM(KEK).encrypt(K)`; store `{salt, wrapped, canonicalMsg, keyCheck}` — **never raw K**. Reopen: sign → KEK → unwrap → validate via `keyCheck`.
5. **Encrypt everything stored:** each chunk and the manifest are AES-GCM(K)-encrypted before `og/storage.put*`, encoded `nonce‖ct‖tag`. WebCrypto only.
6. **Why decryption failures are detectable (no silent fail):** we use **our own AES-GCM** and store **opaque ciphertext** as a 0G Storage blob (we do NOT use the Storage SDK's native encryption, so cheatsheet #18 does not apply to us). A wrong key fails the GCM tag and throws; `keyCheck` gives a fast up-front test; the 0G **rootHash** (merkle) guarantees the bytes returned are exactly what we uploaded.

> Result: 0G Storage receives **only ciphertext** (chunks + manifest). The lexical `terms` index lives inside the encrypted manifest → never leaks. Decryption failures are always caught, never silent.

## B6. Retrieval (single, consistent order)

1. **Vault open:** `getManifest(manifestRoot)` → `dec(manifestBlob, K, manifestNonce)` → validate `{magic:"VAULTMIND"}` → hold `entries` in memory.
2. **Query:** run **BM25 over `entries[].terms`** (in memory) → top-k `chunkId`s.
3. **Fetch hits only:** for each hit, `getBlob(ref)` → `dec(chunk, K, entry.nonce)`.
4. **Assemble** prompt from decrypted hit chunks + question → `og/compute.ask`.
5. **Empty retrieval** → "I don't see that in your documents" (no hallucination).

## B7. Attestation & the Verify screen (claim matched to build)

- **Group stage (Router):** receipt says **"Runs on 0G Router-backed TEE infrastructure"** with model + provider from Router metadata. `level: "infra"`, `verified: false`. **Explicitly not** a per-response cryptographic proof. No overclaim anywhere (one-liner/B1/A3 match this).
- **Jul 8 (Direct):** read **`ZG-Res-Key`** header → `chatId` → `broker.inference.processResponse(providerAddress, chatId)` **in-memory** → `verified:true`, `level:"per-response"`, `signer`/`model`. Render the **green receipt**.
- **No `verifyService(...,"./reports",...)` in the browser** (writes files). Provider/TEE attestation reports are a **one-time dev/ops step** (Node or the 0G web UI); the app only **links** to them.
- **Verify screen** shows: mode, level, model, provider, signer, chatId, verified, + **external links** (signer on `chainscan-galileo.0g.ai`, provider attestation on `pc.0g.ai`). No filesystem artifacts.

## B8. Screens

1. **Landing** — staged-honest pitch + gate note + "Create a Vault."
2. **Vault** — drag-drop upload (parsed in-browser), doc list + 0G Storage root hash, **Ask** panel.
3. **Answer** — text + **citations** + receipt card (infra-level today / green per-response Jul 8).
4. **Verify** — attestation details + external links.

## B9. Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Vitest · **Node ≥ 22** (SDK requirement).
- Browser PDF parse: `pdfjs-dist`. Crypto: WebCrypto (AES-GCM, HKDF).
- Server routes: `/api/storage/*` (operator signer, **ciphertext only**) and `/api/ask` (Router `sk-` key). The Router key and operator private key are **server-side env only**, never shipped to the client.
- Bundler polyfills required for 0G SDKs (PART C error #19).
- Deploy: Vercel/Netlify (server routes run as serverless functions).

## B10. Scope — Jun 23 vs Jul 8

**Jun 23 (gate-safe, REAL 0G, no user wallet):** create vault; upload `.txt`/`.md`/`.pdf` (parse+chunk+index in-browser); generate browser-local `K` + `keyCheck`; **encrypt chunks & manifest → POST ciphertext → operator signer uploads to real 0G Storage** (save `manifestRoot`); ask → fetch+decrypt manifest → BM25 → decrypt hits → `/api/ask` → **real Router inference** → cited answer + infra-level receipt; Export/Import recovery key. Public repo, clones-and-runs, README states what 0G does + why it dies without it, demo matches code. Unit tests on pure logic. Operator wallet + Router balance funded.

**Jul 8 (zero-knowledge wow):** `og/compute` → Direct/browser broker + `processResponse` green receipt; operator out of the inference path; `wallet-sig-v1` key scheme; manifest hardening; optional vector embeddings; optional on-chain "proof-of-consultation" hash.

## B11. Error handling

Per-file parse errors (skip, keep vault) · empty retrieval → honest "not found" · Router/compute failure → graceful retry · **decryption: AES-GCM is authenticated, so a wrong key throws** — validate `keyCheck` on open, catch and offer wallet reconnect / recovery-key import (never show wrong-key garbage). (The SDK silent-fail caveat in PART C #18 applies only to the SDK's native encryption, which we do **not** use.)

## B12. Testing

Vitest, no network: chunking, BM25 ranking, citation mapping, manifest build + `{magic}` validation, **AES-GCM + keyCheck + (wallet-sig) wrap/unwrap round-trip**, wrong-key-throws assertion, attestation-object shaping. Manual smoke: create vault → upload sample → real ciphertext Storage round-trip → ask → cited answer + receipt.

## B13. Out of scope (group stage)

Vector embeddings, multi-user accounts/teams/billing, on-chain records, non-text docs, user wallet (Jul 8).

---

# PART C — Official 0G constants, SDKs & error cheatsheet (verify before hardcoding)

> Compiled from docs.0g.ai (Getting Started, Router, Inference, Storage SDK, Testnet). **Testnet ≠ mainnet** (separate balances/keys/UI). Model catalog & contract addresses change — re-check links in PART E.

## C1. Network constants

**0G Galileo Testnet (chain)**
```
Chain ID : 16602   (older Galileo was 16601 — remove stale config in your wallet)
Token    : 0G
Dev RPC  : https://evmrpc-testnet.0g.ai
Explorer : https://chainscan-galileo.0g.ai   · Storage: https://storagescan-galileo.0g.ai
Faucet   : https://faucet.0g.ai   (0.1 0G / wallet / day)   · GCloud faucet also available
```
**0G Mainnet (Aristotle):** RPC `https://evmrpc.0g.ai` · Explorer `https://chainscan.0g.ai`

**0G Compute Router (OpenAI-compatible)**
```
Mainnet API : https://router-api.0g.ai/v1
Testnet API : https://router-api-testnet.integratenetwork.work/v1
Web UI      : https://pc.0g.ai  (mainnet) · https://pc.testnet.0g.ai (testnet)
API key     : sk-...   (Dashboard → API Keys, "inference" permission)  — SERVER-SIDE ONLY
Model e.g.  : zai-org/GLM-5-FP8   (GLM-5.2 also live — check the live catalog)
```
**0G Storage (testnet, TS SDK)**
```
RPC_URL     : https://evmrpc-testnet.0g.ai
INDEXER_RPC : https://indexer-storage-testnet-turbo.0g.ai   (Turbo network)
Contracts (testnet, MAY CHANGE): Flow 0x22E03a6A89B950F1c82ec5e74F8eCa321a105296 ·
  Mine 0x00A9E9604b0538e06b268Fb297Df333337f9593b · Reward 0xA97B57b4BdFEA2D0a25e535bd849ad4e6C440A69
```

## C2. Packages & starter kits
```
Compute SDK (TS): @0gfoundation/0g-compute-ts-sdk    (Node ≥ 22)
Storage SDK (TS): @0gfoundation/0g-storage-ts-sdk     (peer dep: ethers)
Compute CLI     : 0g-compute-cli
Starters: 0g-compute-ts-starter-kit · 0g-storage-ts-starter-kit (browser UI + MetaMask) ·
          0g-storage-web-starter-kit · agenticID-examples (ERC-7857) · 0g-deployment-scripts (Foundry/Hardhat)
```

## C3. Code skeletons (known-good — do not let the agent guess endpoints)

**Operator storage upload (group stage, server `/api/storage/put`, ciphertext only):**
```ts
import { ZgFile, Indexer } from "@0gfoundation/0g-storage-ts-sdk";
import { ethers } from "ethers";
const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
const signer   = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, provider);  // server-side only
const indexer  = new Indexer("https://indexer-storage-testnet-turbo.0g.ai");
// `enc.bin` is already-encrypted ciphertext received from the browser
const file = await ZgFile.fromFilePath("./enc.bin");
const [tree, e1] = await file.merkleTree(); if (e1) throw e1;    // MUST build merkle tree first
const rootHash = tree.rootHash();                                 // RETURN THIS to the browser
const [tx, e2] = await indexer.upload(file, "https://evmrpc-testnet.0g.ai", signer); if (e2) throw e2;
await file.close();                                               // ALWAYS close
```

**Router inference (group stage, server `/api/ask`):**
```ts
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://router-api.0g.ai/v1", apiKey: process.env.ZG_ROUTER_API_KEY });
const res = await client.chat.completions.create({
  model: "zai-org/GLM-5-FP8",                 // verify live catalog
  messages: [{ role: "system", content: persona }, { role: "user", content: prompt }],
});
```

**Direct inference (Jul 8, browser, wallet):**
```ts
const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
const broker = await createZGComputeNetworkBroker(signer);
await broker.ledger.depositFund(10);                                              // browser does NOT auto-fund
await broker.ledger.transferFund(providerAddr, "inference", BigInt(1)*BigInt(10**18)); // min 1 0G/provider
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddr);
const headers = await broker.inference.getRequestHeaders(providerAddr);
const r = await fetch(`${endpoint}/chat/completions`, { method:"POST",
  headers:{ "Content-Type":"application/json", ...headers }, body: JSON.stringify({ model, messages }) });
const att = await broker.inference.processResponse(providerAddr, r.headers.get("ZG-Res-Key"));
```

## C4. Error cheatsheet (highest-priority first)

**Gate failures (lose the whole competition):** 0G is a bolt-on · repo private / won't clone-and-run · demo ≠ code · code predates Jun 15 / thin fork.

**Network/config:** mixing testnet & mainnet (separate keys/balances/endpoints) · wrong chain ID (use **16602**) · **faucet only 0.1 0G/day** — fund the operator + Router balance early; Direct needs ≥3 ledger + 1/provider (Discord or mainnet).

**Compute:** Node < 22 breaks the SDK · **never ship the `sk-` key client-side** (browser → use Direct) · 429 rate limit (30 req/min, burst 5, ≤5 concurrent — add delays) · Direct balance settles in batches · call `transferFund` before inference (min 1 0G) · browser does not auto-fund.

**Storage:** call `merkleTree()` **before** upload · **save the rootHash** or you can't download · `indexer.download()` fails in-browser (fs) — fetch segments manually or via our `/api/storage/get` · always `await file.close()` · **wrong encryption key does NOT throw *for the SDK's native encryption*** — but **we don't use it**; we store opaque ciphertext + our own authenticated AES-GCM + `keyCheck` (B5), so our failures are never silent.

**Frontend bundling:** add Node polyfills (`crypto/stream/util/buffer/process/fs`; Vite → `vite-plugin-node-polyfills`, globals Buffer/global/process) · never put a private key in client code.

---

# PART D — Build order (group-stage first; gate-safe)

1. Lock the idea against the **removal test** (A2): no Storage ⇒ no vault, no Compute ⇒ no answers.
2. **Get tokens** (A3 blocker): fund the **operator wallet** (storage gas) + a **Router balance**; faucet + Discord, or small mainnet.
3. Scaffold Next.js + TS + Tailwind + Vitest, Node ≥ 22, bundler polyfills. Adapter seam `src/lib/og/*` (`MODE=router`). Env: `OPERATOR_PRIVATE_KEY`, `ZG_ROUTER_API_KEY` (server only).
4. Pure logic `src/lib/rag/{chunk,index,retrieve,cite}.ts` + `src/lib/crypto/*` (AES-GCM, `keyCheck`, encode `nonce‖ct‖tag`, wrap/unwrap) + Vitest (incl. wrong-key-throws).
5. Browser: upload → parse(`pdfjs`) → chunk → index → encrypt chunks+manifest → `POST /api/storage/put` (**operator signer uploads ciphertext to real 0G Storage**) → save `manifestRoot`.
6. Ask: fetch+decrypt manifest (validate `keyCheck`/`magic`) → BM25 → decrypt hits → `POST /api/ask` (**Router**) → cited answer + infra-level receipt.
7. Public repo + README (what 0G does, why it dies without 0G, clone-and-run) + demo video matching code. Register & submit before the Jun 23 cutoff.
8. **R32 → Jul 8:** swap `og/compute` to Direct/browser + `processResponse` green receipt; add `og/wallet` + `wallet-sig-v1` keys; remove operator from inference path; flip the headline to full zero-knowledge.

**Definition of done (group stage):** public repo, clones-and-runs, **real 0G Storage write (operator-signed ciphertext) + real Router inference in the main flow**, demo matches code, README states the 0G dependency, tokens funded, submitted before cutoff.

---

# PART E — Source links (verify before hardcoding)

Hackathon: [Zero Cup](https://0g.ai/arena/zero-cup) · [Submission Criteria](https://0g.ai/arena/zero-cup/submission-criteria) · [Competition Rules](https://0g.ai/arena/zero-cup/competition-rules) · [Blog](https://0g.ai/blog/the-zero-cup)
Build/docs: [Builder Hub](https://build.0g.ai) · [Docs](https://docs.0g.ai) · [Getting Started](https://docs.0g.ai/developer-hub/getting-started) · [Testnet](https://docs.0g.ai/developer-hub/testnet/testnet-overview)
Compute: [Overview](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/overview) · [Router Quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart) · [Router Models](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/models) · [Inference (Direct)](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference) · [Account Mgmt](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/account-management)
Storage/Chain: [Storage SDK](https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk) · [Deploy Contracts](https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts)
Apps/tools: [0G Studio](https://app.0g.ai) · [Compute UI](https://pc.0g.ai) · [Faucet](https://faucet.0g.ai) · [Discord](https://discord.gg/0glabs)
