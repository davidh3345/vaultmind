"use client";

import type { Attestation } from "../types";

export interface AskMeta {
  mode: "router" | "local-dev" | "TeeML" | "TeeTLS";
  level: "infra" | "per-response";
  model: string;
  network: string;
  provider?: string; // 0G compute provider address that served the request
}

export async function ask(system: string, user: string): Promise<{ answer: string; meta: AskMeta }> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ask failed");
  return data;
}

/** Turn Router/compute metadata into a receipt (honest about level). */
export function buildReceipt(meta: AskMeta): Attestation {
  const receiptHash =
    "vm" +
    Math.abs(
      [...(meta.model + meta.network + Date.now())].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 7),
    )
      .toString(16)
      .padStart(8, "0");
  return {
    mode: meta.mode === "local-dev" ? "local-dev" : "router",
    level: meta.level,
    verified: false, // group stage: infrastructure-level, not a per-response proof
    model: meta.model,
    providerAddress: meta.provider,
    links: meta.provider ? { providerAttestation: `https://chainscan-galileo.0g.ai/address/${meta.provider}` } : undefined,
    receiptHash,
  };
}
