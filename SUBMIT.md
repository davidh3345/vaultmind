# ✅ VaultMind — finish & submit checklist (group stage, Jun 23)

The app is built, builds clean, and is verified (11 unit tests + API round-trip).
These final steps need YOUR accounts/keys — they can't be done for you.

## 1. Get real 0G running (required for the eligibility gate)

The gate requires 0G to do **real work** and the demo to **match the code**, so the
submission demo must run with these set (not LOCAL DEV mode):

- [ ] **Fund the operator wallet** (already generated, key in `.env.local`):
      address `0xc74a1832829F36384185Aed1e8285c52d245eDe0`
      → faucet: https://faucet.0g.ai  (0.1 0G/day — pull a couple of times)
- [ ] **Create a Router API key** at https://pc.testnet.0g.ai (API Keys → "inference"),
      put it in `.env.local` as `ZG_ROUTER_API_KEY=sk-...`
- [ ] **Enable real 0G Storage:** `npm install @0gfoundation/0g-storage-ts-sdk`
- [ ] Run `npm run dev`, confirm the banner is **green ("Live on 0G")**, upload
      `public/sample-lease.txt`, ask *"how much notice to terminate the lease?"* and
      confirm a cited answer + a manifest ref like `0g:0x…`.

> If testnet tokens are slow/insufficient, ask in the 0G Discord (https://discord.gg/0glabs)
> or switch `.env.local` to the mainnet Router (`https://router-api.0g.ai/v1`) with a small balance.

## 2. Record the demo video (must match the code)

- [ ] Screen-record: create a vault → upload a doc → ask a question → show the cited
      answer + the 0G receipt + the `0g:` storage ref. ~60–90s.

## 3. Push to GitHub (public repo)

`gh` isn't installed here, and these are your credentials — run on your machine:

```bash
# create an empty PUBLIC repo at https://github.com/new named "vaultmind" (no README/license)
cd vaultmind
git remote add origin https://github.com/<your-username>/vaultmind.git
git push -u origin main
```
(The repo is already committed locally. `.env.local` is gitignored — your keys won't be pushed.)

## 4. Submit on the Arena

- [ ] Register a 0G Builder Profile at https://0g.ai/arena/zero-cup
- [ ] Fill the submission:
  - **Title:** VaultMind
  - **Summary:** Private document AI — files encrypted in your browser, stored as ciphertext on 0G Storage, answered by 0G Compute. The operator never sees your documents.
  - **Repo URL:** your GitHub URL
  - **Demo:** the video (and/or a Vercel deploy URL)
  - **Tags:** ai, rag, privacy, tee, 0g, storage, compute
  - **Description (why 0G):** *Remove 0G Storage and there's no vault; remove 0G Compute and there are no answers. Documents live encrypted on 0G Storage; questions are answered on 0G Compute. Not a bolt-on.*
- [ ] Submit **before the Jun 23 cutoff** (verify the exact time/timezone on the Arena).

## 5. (Optional) deploy for a live demo URL

Connect the GitHub repo on https://vercel.com, add the same env vars (`OPERATOR_PRIVATE_KEY`,
`ZG_ROUTER_API_KEY`, `ZG_ROUTER_BASE_URL`, `ZG_ROUTER_MODEL`, `NEXT_PUBLIC_OG_NETWORK`) in the
Vercel project settings, and deploy. Add `@0gfoundation/0g-storage-ts-sdk` to dependencies first.

---

After the group stage (→ Jul 8): swap `og/compute` to the Direct/browser broker for the
**per-response TEE green receipt** and the full "not even we can read it" claim. See
`docs/superpowers/specs/2026-06-23-vaultmind-design.md` PART B2b + D step 8.
