"use client";

import type { Attestation } from "@/lib/types";

export default function ReceiptCard({ att }: { att: Attestation }) {
  const isLocal = att.mode === "local-dev";
  const isPerResponse = att.level === "per-response" && att.verified;

  const border = isPerResponse ? "border-accent2/50" : isLocal ? "border-warn/40" : "border-accent/40";
  const dot = isPerResponse ? "bg-accent2" : isLocal ? "bg-warn" : "bg-accent";

  return (
    <div className={`card ${border} mt-3 p-3 text-xs`}>
      <div className="flex items-center gap-2 font-semibold">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {isPerResponse
          ? "🔒 Verified by 0G TEE — per-response attestation"
          : isLocal
            ? "⚙️ Local dev — 0G compute not configured"
            : "🛡️ Ran on 0G Router-backed TEE infrastructure"}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-muted">
        <span>level</span>
        <span className="text-right text-slate-300">{att.level}</span>
        {att.model && (
          <>
            <span>model</span>
            <span className="text-right text-slate-300">{att.model}</span>
          </>
        )}
        {att.providerAddress && (
          <>
            <span>0G provider</span>
            <span className="mono truncate text-right text-slate-300">{att.providerAddress}</span>
          </>
        )}
        {att.signer && (
          <>
            <span>TEE signer</span>
            <span className="mono truncate text-right text-slate-300">{att.signer}</span>
          </>
        )}
        <span>receipt</span>
        <span className="mono text-right text-slate-300">{att.receiptHash}</span>
      </div>
      {!isPerResponse && !isLocal && (
        <p className="mt-2 text-[11px] text-muted">
          Infrastructure-level. Per-response cryptographic proof ships in the Direct build (Jul 8).
        </p>
      )}
    </div>
  );
}
