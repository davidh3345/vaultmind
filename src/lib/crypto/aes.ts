/**
 * App-level authenticated encryption for VaultMind.
 *
 * - AES-GCM (authenticated): a wrong key fails the tag and THROWS — never silent.
 * - Stored blob encoding: nonce(12) ‖ ciphertext ‖ GCM-tag(16)  (WebCrypto appends the tag).
 * - Works in the browser and in Node ≥ 20 (both expose globalThis.crypto.subtle).
 *
 * Keys are handled as base64 raw bytes so they are easy to store (IndexedDB),
 * wrap (wallet-sig), or export (recovery file). The raw key never leaves the client.
 */

const subtle = globalThis.crypto.subtle;
const KEYCHECK_SENTINEL = "vaultmind-keycheck-v1";

export function b64encode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function b64decode(s: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Generate a fresh random vault key, returned as base64 raw bytes. */
export async function newVaultKey(): Promise<string> {
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = new Uint8Array(await subtle.exportKey("raw", key));
  return b64encode(raw);
}

async function importKey(rawB64: string): Promise<CryptoKey> {
  return subtle.importKey("raw", b64decode(rawB64), "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Encrypt bytes → base64(nonce ‖ ct ‖ tag). */
export async function encryptBytes(data: Uint8Array, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const blob = new Uint8Array(iv.length + ct.length);
  blob.set(iv, 0);
  blob.set(ct, iv.length);
  return b64encode(blob);
}

/** Decrypt base64(nonce ‖ ct ‖ tag) → bytes. Throws on a wrong key (GCM tag). */
export async function decryptBytes(blobB64: string, keyB64: string): Promise<Uint8Array> {
  const key = await importKey(keyB64);
  const blob = b64decode(blobB64);
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
}

export async function encryptString(text: string, keyB64: string): Promise<string> {
  return encryptBytes(enc.encode(text), keyB64);
}
export async function decryptString(blobB64: string, keyB64: string): Promise<string> {
  return dec.decode(await decryptBytes(blobB64, keyB64));
}

/** A sentinel encrypted under K — lets us validate a key on vault-open fast. */
export async function makeKeyCheck(keyB64: string): Promise<string> {
  return encryptString(KEYCHECK_SENTINEL, keyB64);
}

/** True if keyCheck decrypts to the sentinel under keyB64. Never throws. */
export async function verifyKeyCheck(keyCheckB64: string, keyB64: string): Promise<boolean> {
  try {
    return (await decryptString(keyCheckB64, keyB64)) === KEYCHECK_SENTINEL;
  } catch {
    return false;
  }
}

// ── Jul-8 wallet-sig key wrapping (random K wrapped by a wallet-derived KEK) ──

/** Derive a wrapping key (KEK) from a wallet signature via HKDF-SHA256. */
async function deriveKEK(signatureB64: string, saltB64: string): Promise<CryptoKey> {
  const base = await subtle.importKey("raw", b64decode(signatureB64), "HKDF", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: b64decode(saltB64), info: enc.encode("vaultmind-kek") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapKey(keyB64: string, signatureB64: string, saltB64: string): Promise<string> {
  const kek = await deriveKEK(signatureB64, saltB64);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, kek, b64decode(keyB64)));
  const blob = new Uint8Array(iv.length + ct.length);
  blob.set(iv, 0);
  blob.set(ct, iv.length);
  return b64encode(blob);
}

export async function unwrapKey(wrappedB64: string, signatureB64: string, saltB64: string): Promise<string> {
  const kek = await deriveKEK(signatureB64, saltB64);
  const blob = b64decode(wrappedB64);
  const raw = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: blob.slice(0, 12) }, kek, blob.slice(12)));
  return b64encode(raw);
}

export function randomSalt(): string {
  return b64encode(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}
