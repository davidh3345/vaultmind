"use client";

/** Client adapter → /api/storage/*. Sends/receives ONLY ciphertext (base64). */

export async function putBlob(ciphertextB64: string): Promise<{ ref: string; backend: "0g" | "local" }> {
  const res = await fetch("/api/storage/put", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ciphertext: ciphertextB64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "storage put failed");
  return data;
}

export async function getBlob(ref: string): Promise<string> {
  const res = await fetch(`/api/storage/get?ref=${encodeURIComponent(ref)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "storage get failed");
  return data.ciphertext as string;
}
