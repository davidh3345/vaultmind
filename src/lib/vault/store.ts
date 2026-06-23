"use client";

import type { Vault } from "../types";

/**
 * Local persistence for vault METADATA + the client-local vault key.
 * (Group stage: scheme "client-local-v1" — the raw key lives only on this device.)
 * The documents themselves live as ciphertext on 0G Storage, addressed by ref.
 */

const VKEY = "vaultmind:vaults";
const KKEY = "vaultmind:keys";

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(k) || "") as T;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  if (typeof window !== "undefined") window.localStorage.setItem(k, JSON.stringify(v));
}

export function listVaults(): Vault[] {
  return read<Vault[]>(VKEY, []);
}
export function getVault(id: string): Vault | undefined {
  return listVaults().find((v) => v.id === id);
}
export function saveVault(vault: Vault, key?: string) {
  const all = listVaults().filter((v) => v.id !== vault.id);
  write(VKEY, [...all, vault]);
  if (key) {
    const keys = read<Record<string, string>>(KKEY, {});
    keys[vault.id] = key;
    write(KKEY, keys);
  }
}
export function getKey(id: string): string | undefined {
  return read<Record<string, string>>(KKEY, {})[id];
}
export function setKey(id: string, key: string) {
  const keys = read<Record<string, string>>(KKEY, {});
  keys[id] = key;
  write(KKEY, keys);
}
export function deleteVault(id: string) {
  write(
    VKEY,
    listVaults().filter((v) => v.id !== id),
  );
  const keys = read<Record<string, string>>(KKEY, {});
  delete keys[id];
  write(KKEY, keys);
}
