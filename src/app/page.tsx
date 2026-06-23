"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBanner from "@/components/StatusBanner";
import ReceiptCard from "@/components/ReceiptCard";
import type { Answer, Vault } from "@/lib/types";
import { deleteVault, getKey, listVaults, setKey } from "@/lib/vault/store";
import { addFiles, askVault, createVault, openVault } from "@/lib/vault/vault";
import { verifyKeyCheck } from "@/lib/crypto/aes";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => vaults.find((v) => v.id === selectedId) || null, [vaults, selectedId]);

  const refresh = () => setVaults(listVaults());
  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  const flash = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  const handleCreate = async () => {
    setError(null);
    const v = await createVault(name || "My Vault");
    setName("");
    refresh();
    setSelectedId(v.id);
    setAnswer(null);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selected) return;
    setBusy(`Encrypting & uploading ${files.length} file(s)…`);
    setError(null);
    try {
      await addFiles(selected.id, Array.from(files));
      refresh();
    } catch (e) {
      flash(e);
    } finally {
      setBusy(null);
    }
  };

  const handleAsk = async () => {
    if (!selected || !question.trim()) return;
    setBusy("Retrieving locally → asking 0G compute…");
    setError(null);
    setAnswer(null);
    try {
      const a = await askVault(selected.id, question.trim());
      setAnswer(a);
    } catch (e) {
      flash(e);
    } finally {
      setBusy(null);
    }
  };

  const handleExport = () => {
    if (!selected) return;
    const key = getKey(selected.id);
    if (!key) return flash(new Error("no key on this device"));
    const blob = new Blob([JSON.stringify({ vaultId: selected.id, key }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name.replace(/\s+/g, "-").toLowerCase()}-recovery.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | null) => {
    if (!file || !selected) return;
    try {
      const { key } = JSON.parse(await file.text());
      if (!(await verifyKeyCheck(selected.keyEnvelope.keyCheck, key))) throw new Error("recovery key does not match this vault");
      setKey(selected.id, key);
      setError(null);
      flashOk("Recovery key imported ✓");
    } catch (e) {
      flash(e);
    }
  };
  const [ok, setOk] = useState<string | null>(null);
  const flashOk = (m: string) => {
    setOk(m);
    setTimeout(() => setOk(null), 2500);
  };

  if (!mounted) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Vault<span className="text-accent">Mind</span>
          </h1>
          <p className="text-sm text-muted">Private document AI · encrypted on 0G Storage · answered on 0G Compute</p>
        </div>
        <StatusBanner />
      </header>

      {error && <div className="card mb-4 border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">⚠ {error}</div>}
      {ok && <div className="card mb-4 border-accent2/40 bg-accent2/10 p-3 text-sm text-accent2">{ok}</div>}

      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        {/* Vault list */}
        <section className="card h-fit p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Your vaults</h2>
          <div className="space-y-1.5">
            {vaults.length === 0 && <p className="text-xs text-muted">No vaults yet.</p>}
            {vaults.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedId(v.id);
                  setAnswer(null);
                  setError(null);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  v.id === selectedId ? "bg-accent/15 text-accent" : "hover:bg-white/5 text-slate-300"
                }`}
              >
                <span className="truncate">{v.name}</span>
                <span className="text-[10px] text-muted">{v.docs.length}📄</span>
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="New vault name…"
              className="input w-full px-3 py-2 text-sm text-slate-200"
            />
            <button onClick={handleCreate} className="btn btn-primary mt-2 w-full px-3 py-2 text-sm">
              + Create vault
            </button>
          </div>
        </section>

        {/* Selected vault */}
        <section className="space-y-4">
          {!selected ? (
            <div className="card p-10 text-center text-muted">Select or create a vault to begin.</div>
          ) : (
            <>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">{selected.name}</h2>
                  <div className="flex gap-2 text-xs">
                    <button onClick={handleExport} className="btn btn-ghost px-2 py-1">⬇ Export key</button>
                    <label className="btn btn-ghost cursor-pointer px-2 py-1">
                      ⬆ Import key
                      <input type="file" accept="application/json" className="hidden" onChange={(e) => handleImport(e.target.files?.[0] || null)} />
                    </label>
                    <button
                      onClick={() => {
                        deleteVault(selected.id);
                        setSelectedId(null);
                        refresh();
                      }}
                      className="btn btn-ghost px-2 py-1 text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-black/20 py-8 text-center hover:border-accent/50">
                  <span className="text-sm text-slate-300">Drop or choose documents (.txt .md .pdf)</span>
                  <span className="mt-1 text-xs text-muted">Encrypted in your browser before upload</span>
                  <input type="file" multiple accept=".txt,.md,.csv,.json,.pdf,text/*,application/pdf" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </label>

                {selected.docs.length > 0 && (
                  <div className="mt-3 space-y-1 text-xs">
                    {selected.docs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1">
                        <span className="truncate text-slate-300">📄 {d.filename}</span>
                        <span className="text-muted">{d.pages ? `${d.pages}p` : d.mime}</span>
                      </div>
                    ))}
                    {selected.manifestRef && (
                      <div className="mono mt-1 truncate text-[10px] text-muted">manifest ref: {selected.manifestRef}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Ask */}
              <div className="card p-4">
                <div className="flex gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                    placeholder={`Ask ${selected.name} a question…`}
                    disabled={selected.docs.length === 0}
                    className="input flex-1 px-3 py-2.5 text-sm text-slate-200 disabled:opacity-50"
                  />
                  <button onClick={handleAsk} disabled={!question.trim() || selected.docs.length === 0} className="btn btn-primary px-4 text-sm disabled:opacity-40">
                    Ask
                  </button>
                </div>
                {selected.docs.length === 0 && <p className="mt-2 text-xs text-muted">Upload a document first.</p>}

                {busy && <p className="mt-3 text-sm text-accent">{busy}</p>}

                {answer && (
                  <div className="mt-4">
                    <p className="whitespace-pre-wrap text-sm text-slate-200">{answer.text}</p>
                    {answer.citations.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Sources</p>
                        {answer.citations.map((c, i) => (
                          <div key={c.chunkId} className="rounded-md border border-line bg-black/20 p-2 text-xs">
                            <span className="text-accent">[{i + 1}] {c.filename}{c.page ? ` · p.${c.page}` : ""}</span>
                            <p className="mt-0.5 text-muted">“{c.snippet}”</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <ReceiptCard att={answer.attestation} />
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="mt-10 text-center text-xs text-muted">
        VaultMind · Zero Cup 2026 · your documents, encrypted on 0G — answered, never read.
      </footer>
    </main>
  );
}
