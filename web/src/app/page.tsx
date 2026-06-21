"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Bd1Hologram from "@/components/hologram/Bd1Hologram";
import { SectionLabel, Stat } from "@/components/ui";
import { SUI_EXPLORER_TX } from "@/lib/sui-config";

type VaultState = {
  nav: number;
  cyclesCompleted: number;
  openCycle?: { expiry_ms: number; budget_spent: number; reasoning_hash: string };
};

type Reasoning = {
  budget_bps: number;
  risk_score: number;
  news_signal_bps: number;
  memory_cycles_recalled: number;
  reasoning_summary?: string;
  reasoning_hash: string;
  walrus_blob_id: string;
  tx: string;
  anchor_tx?: string;
};

type SimSummary = {
  fixedStrategy?: {
    summary?: {
      cycles: number;
      endingHedgedNav: number;
      endingUnhedgedNav: number;
      hitRate: number;
    };
  };
};

export default function Home() {
  const [vault, setVault] = useState<VaultState | null>(null);
  const [reasoning, setReasoning] = useState<Reasoning | null>(null);
  const [sim, setSim] = useState<SimSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [vaultRes, reasoningRes, simRes] = await Promise.all([
          fetch("/api/vault/state"),
          fetch("/api/vault/latest-reasoning"),
          fetch("/sim/vault_sim.json"),
        ]);
        if (vaultRes.ok) setVault(await vaultRes.json());
        if (reasoningRes.ok) {
          const r = await reasoningRes.json();
          if (r) setReasoning(r);
        }
        if (simRes.ok) setSim(await simRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const simSummary = sim?.fixedStrategy?.summary;

  return (
    <div className="vignette">
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <div className="mono mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-faint">
              <span className="signal-dot inline-block size-1.5 rounded-full bg-signal" />
              DeepBook Predict carry vault · Walrus + MemWal · Sui testnet
            </div>
            <h1 className="serif max-w-4xl text-6xl leading-[0.95] tracking-tight md:text-7xl">
              Reasoning <br />you can
              <span className="text-signal glow-signal"> trace.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              openmind recalls past cycles from MemWal, builds a knowledge graph from BTC news,
              scores a hedge budget, stores full reasoning on Walrus, and opens a DeepBook Predict
              hedge — all before the oracle settles.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-px md:grid-cols-4">
              <Stat
                label="Vault NAV"
                value={vault ? `${(vault.nav / 1e6).toFixed(2)}` : "—"}
                sub="dUSDC"
                tone="signal"
              />
              <Stat label="Cycles done" value={vault?.cyclesCompleted ?? "—"} />
              <Stat
                label="Sim cycles"
                value={simSummary?.cycles ?? "—"}
                sub={simSummary ? `${simSummary.hitRate * 100}% payout rate` : undefined}
              />
              <Stat
                label="Hedge budget"
                value={reasoning ? `${reasoning.budget_bps}bps` : "—"}
                sub={reasoning ? `${reasoning.memory_cycles_recalled} mem recalled` : undefined}
                tone="amber"
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/vault"
                className="mono border border-signal/50 bg-signal/10 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20"
              >
                Deposit dUSDC
              </Link>
              <Link
                href="/brain"
                className="mono border border-line-bright px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-signal/50 hover:text-signal"
              >
                View brain
              </Link>
              <Link
                href="/proof"
                className="mono border border-line-bright px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-signal/50 hover:text-signal"
              >
                Cycle receipts
              </Link>
            </div>
          </div>

          <div
            className="relative h-full w-full sm:h-[440px] lg:h-[580px]"
            style={{
              maskImage: "radial-gradient(70% 70% at 50% 50%, #000 45%, transparent 88%)",
              WebkitMaskImage: "radial-gradient(70% 70% at 50% 50%, #000 45%, transparent 88%)",
            }}
          >
            <Bd1Hologram />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12">
        <SectionLabel index="◆" className="mb-6">
          Latest cycle reasoning
        </SectionLabel>

        {loading ? (
          <div className="mono py-20 text-center text-[11px] uppercase tracking-[0.2em] text-faint">
            loading vault state…
          </div>
        ) : !reasoning ? (
          <div className="panel p-10 text-center">
            <p className="mono text-[12px] text-faint">No live cycle receipts yet. Run keeper vault:open.</p>
          </div>
        ) : (
          <div className="panel p-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <Stat label="Risk score" value={`${(reasoning.risk_score / 100).toFixed(1)}%`} tone="signal" />
              <Stat label="News signal" value={`${reasoning.news_signal_bps}bps`} />
              <Stat label="Budget" value={`${reasoning.budget_bps}bps`} tone="amber" />
              <Stat label="Memory" value={`${reasoning.memory_cycles_recalled} cycles`} />
            </div>

            {reasoning.reasoning_summary && (
              <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-muted">
                {reasoning.reasoning_summary}
              </p>
            )}

            <div className="mono mt-4 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.1em] text-faint">
              <span>hash {reasoning.reasoning_hash.slice(0, 16)}…</span>
              {reasoning.walrus_blob_id && (
                <span>walrus {reasoning.walrus_blob_id.slice(0, 16)}…</span>
              )}
              {reasoning.tx && (
                <a
                  href={SUI_EXPLORER_TX(reasoning.tx)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-signal hover:underline"
                >
                  open tx ↗
                </a>
              )}
              {reasoning.anchor_tx && (
                <a
                  href={SUI_EXPLORER_TX(reasoning.anchor_tx)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-signal hover:underline"
                >
                  anchor tx ↗
                </a>
              )}
            </div>
          </div>
        )}

        {vault?.openCycle && (
          <div className="mt-6 panel p-4">
            <SectionLabel index="◇" className="mb-3">Open cycle</SectionLabel>
            <p className="mono text-[11px] text-muted">
              Expires {new Date(vault.openCycle.expiry_ms).toLocaleString()} · budget spent{" "}
              {(vault.openCycle.budget_spent / 1e6).toFixed(4)} dUSDC
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
