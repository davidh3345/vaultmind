"use client";

import { useEffect, useState } from "react";

interface Status {
  network: string;
  storage: boolean;
  router: boolean;
  model: string;
}

export default function StatusBanner() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setS).catch(() => {});
  }, []);
  if (!s) return null;

  const fullyReal = s.storage && s.router;
  if (fullyReal) {
    return (
      <div className="card flex items-center gap-2 px-3 py-1.5 text-xs text-accent2">
        <span className="h-2 w-2 rounded-full bg-accent2" />
        Live on 0G · {s.network} · storage + compute real · model {s.model}
      </div>
    );
  }
  return (
    <div className="card flex items-center gap-2 border-warn/40 bg-warn/5 px-3 py-1.5 text-xs text-warn">
      <span className="h-2 w-2 rounded-full bg-warn" />
      LOCAL DEV MODE — {s.storage ? "storage ✓" : "storage ✗"} · {s.router ? "compute ✓" : "compute ✗"}.
      Set OPERATOR_PRIVATE_KEY + ZG_ROUTER_API_KEY for real 0G (README).
    </div>
  );
}
