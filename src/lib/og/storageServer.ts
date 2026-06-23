import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { OG, isStorageReal } from "./config";

/**
 * Server-side 0G Storage adapter. Receives ALREADY-ENCRYPTED ciphertext from the
 * browser and uploads it with the operator signer — the operator only ever
 * touches ciphertext. Falls back to a local dev store when 0G isn't configured.
 *
 * ref format: "0g:<rootHash>" (real) | "local:<sha256>" (dev fallback)
 */

const LOCAL_DIR = path.join(process.cwd(), ".vault-store");

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function localPut(bytes: Buffer): Promise<string> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const id = sha256(bytes);
  await fs.writeFile(path.join(LOCAL_DIR, `${id}.bin`), bytes);
  return `local:${id}`;
}

async function localGet(ref: string): Promise<Buffer> {
  const id = ref.slice("local:".length);
  return fs.readFile(path.join(LOCAL_DIR, `${id}.bin`));
}

async function ogPut(bytes: Buffer): Promise<string> {
  const { ZgFile, Indexer } = (await import("@0gfoundation/0g-storage-ts-sdk")) as any;
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(OG.storageRpc);
  const signer = new ethers.Wallet(OG.operatorKey, provider);
  const indexer = new Indexer(OG.storageIndexer);

  const tmp = path.join(os.tmpdir(), `vm-${crypto.randomUUID()}.bin`);
  await fs.writeFile(tmp, bytes);
  try {
    const file = await ZgFile.fromFilePath(tmp);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) throw new Error(String(treeErr));
    const rootHash = tree.rootHash();
    const [, upErr] = await indexer.upload(file, OG.storageRpc, signer);
    await file.close();
    if (upErr) throw new Error(String(upErr));
    return `0g:${rootHash}`;
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

async function ogGet(ref: string): Promise<Buffer> {
  const root = ref.slice("0g:".length);
  const { Indexer } = (await import("@0gfoundation/0g-storage-ts-sdk")) as any;
  const indexer = new Indexer(OG.storageIndexer);
  const tmp = path.join(os.tmpdir(), `vm-${crypto.randomUUID()}.bin`);
  try {
    const err = await indexer.download(root, tmp, true); // true = verify proof
    if (err) throw new Error(String(err));
    return await fs.readFile(tmp);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

/** Is the optional 0G Storage SDK actually installed? (cached) */
let sdkCache: boolean | null = null;
export async function sdkAvailable(): Promise<boolean> {
  if (sdkCache !== null) return sdkCache;
  try {
    await import("@0gfoundation/0g-storage-ts-sdk");
    sdkCache = true;
  } catch {
    sdkCache = false;
  }
  return sdkCache;
}

/** True only when real 0G Storage is fully ready (operator key + SDK installed). */
export async function storageRealReady(): Promise<boolean> {
  return isStorageReal() && (await sdkAvailable());
}

/** Store ciphertext, return a ref. Uses real 0G when ready; else local dev store. */
export async function putBlob(b64: string): Promise<{ ref: string; backend: "0g" | "local" }> {
  const bytes = Buffer.from(b64, "base64");
  if (await storageRealReady()) {
    // Real attempt: surface on-chain failures (e.g. unfunded wallet) clearly.
    try {
      return { ref: await ogPut(bytes), backend: "0g" };
    } catch (e) {
      throw new Error(`0G Storage upload failed: ${(e as Error).message}`);
    }
  }
  // Not fully configured yet → local ciphertext store so the app stays usable.
  return { ref: await localPut(bytes), backend: "local" };
}

export async function getBlob(ref: string): Promise<string> {
  if (ref.startsWith("0g:")) return (await ogGet(ref)).toString("base64");
  if (ref.startsWith("local:")) return (await localGet(ref)).toString("base64");
  throw new Error(`unknown ref: ${ref}`);
}
