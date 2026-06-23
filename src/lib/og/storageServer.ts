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

/** Store ciphertext, return a ref. Tries real 0G; falls back to local dev. */
export async function putBlob(b64: string): Promise<{ ref: string; backend: "0g" | "local" }> {
  const bytes = Buffer.from(b64, "base64");
  if (isStorageReal()) {
    try {
      return { ref: await ogPut(bytes), backend: "0g" };
    } catch (e) {
      // Surface the failure rather than silently faking 0G.
      throw new Error(`0G Storage upload failed: ${(e as Error).message}`);
    }
  }
  return { ref: await localPut(bytes), backend: "local" };
}

export async function getBlob(ref: string): Promise<string> {
  if (ref.startsWith("0g:")) return (await ogGet(ref)).toString("base64");
  if (ref.startsWith("local:")) return (await localGet(ref)).toString("base64");
  throw new Error(`unknown ref: ${ref}`);
}
