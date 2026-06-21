"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pill, SectionLabel } from "@/components/ui";
import { SUI_EXPLORER_TX, WALRUS_AGGREGATOR } from "@/lib/sui-config";

type AnchorReceipt = {
  id: string;
  oracle_id: string;
  reasoning_hash: string;
  anchored_at_ms: number;
  walrus_blob_id: string;
  risk_score: number;
  hedge_budget_bps: number;
  memory_cycles_recalled: number;
  anchor_tx: string;
  open_tx: string;
};

export default function ProofPage() {
  const [anchors, setAnchors] = useState<AnchorReceipt[]>([]);
  const [selected, setSelected] = useState<AnchorReceipt | null>(null);
  const [walrusOk, setWalrusOk] = useState<"pending" | "ok" | "fail" | null>(null);

  useEffect(() => {
    fetch("/api/vault/anchors")
      .then((r) => r.json())
      .then(setAnchors)
      .catch(() => {});
  }, []);

  async function checkWalrus(anchor: AnchorReceipt) {
    setSelected(anchor);
    setWalrusOk("pending");
    try {
      const r = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${anchor.walrus_blob_id}`);
      setWalrusOk(r.ok ? "ok" : "fail");
    } catch {
      setWalrusOk("fail");
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-5 py-8">
      <Link
        href="/"
        className="mono mb-2 inline-block text-[11px] uppercase tracking-[0.12em] text-faint hover:text-signal"
      >
        ← terminal
      </Link>
      <h1 className="serif text-4xl">Cycle receipts</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        On-chain open + anchor transactions paired with Walrus reasoning blobs.
        Proof is the receipt trail — not a separate protocol.
      </p>

      <div className="mt-8 space-y-3">
        {anchors.length === 0 ? (
          <div className="panel p-8 text-center mono text-[11px] text-faint">No anchored cycles yet.</div>
        ) : (
          anchors.map((a) => (
            <div key={a.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.1em] text-faint">
                    Anchored {new Date(a.anchored_at_ms).toLocaleString()}
                  </div>
                  <div className="mono mt-2 text-[11px] text-muted">
                    hash {a.reasoning_hash.slice(0, 24)}…
                  </div>
                  <div className="mono mt-1 text-[10px] text-faint">
                    {a.hedge_budget_bps}bps · risk {(a.risk_score / 100).toFixed(0)}% ·{" "}
                    {a.memory_cycles_recalled} mem
                  </div>
                  <div className="mono mt-2 flex flex-wrap gap-3 text-[10px]">
                    <a href={SUI_EXPLORER_TX(a.open_tx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                      open tx ↗
                    </a>
                    <a href={SUI_EXPLORER_TX(a.anchor_tx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                      anchor tx ↗
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => checkWalrus(a)}
                  className="mono border border-line-bright px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-signal/50 hover:text-signal"
                >
                  Fetch Walrus
                </button>
              </div>

              {selected?.id === a.id && walrusOk && (
                <div className="mt-3 border-t border-line pt-3">
                  <Pill tone={walrusOk === "ok" ? "signal" : walrusOk === "pending" ? "cyan" : "danger"}>
                    {walrusOk === "pending"
                      ? "fetching walrus…"
                      : walrusOk === "ok"
                        ? "walrus blob readable"
                        : "walrus fetch failed"}
                  </Pill>
                  {walrusOk === "ok" && (
                    <p className="mono mt-2 text-[10px] text-faint">
                      blob {a.walrus_blob_id}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="panel mt-8 p-5 text-sm text-muted">
        <SectionLabel index="◇" className="mb-3">How proof works here</SectionLabel>
        <ol className="list-decimal space-y-2 pl-4">
          <li>Keeper opens a cycle on Sui with budget + reasoning hash.</li>
          <li>Agent stores full JSON on Walrus and emits a reasoning anchor object.</li>
          <li>After oracle settlement, close tx + MemWal outcome complete the receipt.</li>
          <li>Anyone can read Walrus + SuiScan to audit the cycle timeline.</li>
        </ol>
      </div>
    </div>
  );
}
