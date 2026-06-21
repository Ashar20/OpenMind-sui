"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GraphCanvas } from "@/components/graph-canvas";
import { OntologyPanel } from "@/components/ontology-panel";
import { Pill, SectionLabel, Stat } from "@/components/ui";
import { WALRUS_AGGREGATOR, SUI_EXPLORER_TX } from "@/lib/sui-config";
import type { GraphEdge, GraphNode, Ontology } from "@/lib/types";

type CycleReasoning = {
  oracle_id: string;
  expiry_ms: number;
  strike: number;
  budget_bps: number;
  risk_score: number;
  news_signal_bps: number;
  svi_gap_bps: number;
  memory_cycles_recalled: number;
  reasoning_hash: string;
  walrus_blob_id: string;
  reasoning_summary?: string;
  ask_cost: number;
  bid_cost: number;
  tx: string;
  anchor_tx?: string;
  at: string;
  itm?: boolean;
};

type WalrusReasoning = {
  knowledge_graph?: {
    mode?: string;
    dominant_theme?: string;
    ontology?: Ontology | null;
    nodes?: GraphNode[];
    edges?: GraphEdge[];
    stats?: Record<string, unknown>;
    summary?: string | null;
  };
  budget?: { budget_bps?: number; breakdown?: Record<string, number> };
  evidence?: { headline?: string; source?: string; impact?: string; direction?: string }[];
  memory_context?: string[];
};

function outcomeTone(itm?: boolean) {
  if (itm === undefined) return "cyan" as const;
  return itm ? "signal" : "neutral";
}

type RunPhase = { ts: number; label: string };
type RunResult = {
  closedOracleId?: string;
  closeTx?: string;
  openedOracleId?: string;
  openTx?: string;
  anchorTx?: string;
  skipped?: string;
};
type RunState = {
  id: string;
  status: "running" | "done" | "error";
  phases: RunPhase[];
  result: RunResult;
  error?: string;
};

function RunCyclePanel({ onCompleted }: { onCompleted: () => void }) {
  const [run, setRun] = useState<RunState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function poll(runId: string) {
    const r = await fetch(`/api/cycle/run/${runId}`);
    if (!r.ok) return;
    const data: RunState = await r.json();
    setRun(data);
    if (data.status !== "running") {
      stopPolling();
      if (data.status === "done") onCompleted();
    }
  }

  async function handleRun() {
    setRun({ id: "", status: "running", phases: [{ ts: Date.now(), label: "Starting…" }], result: {} });
    const r = await fetch("/api/cycle/run", { method: "POST" });
    const data = await r.json();
    if (!r.ok || !data.runId) {
      setRun({ id: "", status: "error", phases: [], result: {}, error: data.error ?? "failed to start" });
      return;
    }
    pollRef.current = setInterval(() => poll(data.runId), 1200);
    poll(data.runId);
  }

  useEffect(() => stopPolling, []);

  const isRunning = run?.status === "running";

  return (
    <div className="panel mb-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel index="◇" className="!mb-0 flex-1">
          Run a live cycle
        </SectionLabel>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="mono shrink-0 border border-signal/50 bg-signal/10 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20 disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Run cycle"}
        </button>
      </div>

      {run && (
        <div className="mt-4 space-y-1.5">
          {run.phases.map((p, i) => (
            <div key={i} className="mono flex items-baseline gap-2 text-[11px]">
              <span className="text-faint">
                {i === run.phases.length - 1 && isRunning ? "▸" : "✓"}
              </span>
              <span className={i === run.phases.length - 1 && isRunning ? "text-signal" : "text-muted"}>
                {p.label}
              </span>
            </div>
          ))}

          {run.status === "error" && (
            <p className="mono mt-2 text-[11px] text-danger">{run.error}</p>
          )}

          {run.status === "done" && (
            <div className="mono mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.1em]">
              {run.result.closeTx && (
                <a href={SUI_EXPLORER_TX(run.result.closeTx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                  close tx ↗
                </a>
              )}
              {run.result.anchorTx && (
                <a href={SUI_EXPLORER_TX(run.result.anchorTx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                  anchor tx ↗
                </a>
              )}
              {run.result.openTx && (
                <a href={SUI_EXPLORER_TX(run.result.openTx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                  open tx ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BrainPage() {
  const [cycles, setCycles] = useState<CycleReasoning[]>([]);
  const [selected, setSelected] = useState<CycleReasoning | null>(null);
  const [walrus, setWalrus] = useState<WalrusReasoning | null>(null);
  const [walrusError, setWalrusError] = useState<string | null>(null);

  function loadCycles() {
    fetch("/api/vault/reasoning-history")
      .then((r) => r.json())
      .then((data: CycleReasoning[]) => {
        setCycles(data);
        if (data.length) setSelected(data[0]!);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (!selected?.walrus_blob_id) {
      setWalrus(null);
      return;
    }
    setWalrusError(null);
    fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${selected.walrus_blob_id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: WalrusReasoning) => setWalrus(data))
      .catch((e) => {
        setWalrus(null);
        setWalrusError(e instanceof Error ? e.message : "fetch failed");
      });
  }, [selected]);

  const graph = walrus?.knowledge_graph;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const ontology = graph?.ontology ?? { entity_types: [], relation_types: [] };

  const headline = useMemo(
    () => graph?.dominant_theme ?? selected?.reasoning_summary ?? "—",
    [graph?.dominant_theme, selected?.reasoning_summary],
  );

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6">
      <div className="mb-5">
        <Link
          href="/"
          className="mono mb-2 inline-block text-[11px] uppercase tracking-[0.12em] text-faint hover:text-signal"
        >
          ← terminal
        </Link>
        <h1 className="serif text-4xl leading-tight">AI brain</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Per-cycle reasoning from Walrus blobs and keeper receipts. GraphRAG when available;
          simple news fallback otherwise.
        </p>
      </div>

      <RunCyclePanel onCompleted={loadCycles} />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="max-h-[720px] space-y-2 overflow-y-auto">
          {cycles.length === 0 ? (
            <div className="panel p-4 mono text-[11px] text-faint">No cycles yet.</div>
          ) : (
            cycles.map((c) => (
              <button
                key={c.oracle_id}
                onClick={() => setSelected(c)}
                className={`panel w-full p-3 text-left transition-colors ${
                  selected?.oracle_id === c.oracle_id ? "border-signal/40" : "hover:border-line-bright"
                }`}
              >
                <div className="mono text-[10px] uppercase tracking-[0.1em] text-faint">
                  {new Date(c.expiry_ms).toLocaleString()}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="mono text-[11px] text-muted">{c.budget_bps}bps hedge</span>
                  <Pill tone={outcomeTone(c.itm)}>
                    {c.itm === undefined ? "open" : c.itm ? "paid" : "otm"}
                  </Pill>
                </div>
                <div className="mono mt-1 text-[10px] text-faint">
                  risk {(c.risk_score / 100).toFixed(0)}% · {c.memory_cycles_recalled} mem
                </div>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <div className="space-y-4">
            <div className="panel p-5">
              <SectionLabel index="01" className="mb-4">
                Cycle decision
              </SectionLabel>
              <h2 className="serif text-2xl leading-snug">{headline}</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                <Stat label="Budget" value={`${selected.budget_bps}bps`} tone="amber" />
                <Stat label="Risk" value={`${(selected.risk_score / 100).toFixed(1)}%`} tone="signal" />
                <Stat label="News" value={`${selected.news_signal_bps}bps`} />
                <Stat label="SVI gap" value={`${selected.svi_gap_bps}bps`} />
                <Stat label="Ask / bid" value={`${selected.ask_cost} / ${selected.bid_cost}`} />
                <Stat label="Memory" value={`${selected.memory_cycles_recalled}`} />
              </div>
              <div className="mono mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.1em] text-faint">
                <a href={SUI_EXPLORER_TX(selected.tx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                  open tx ↗
                </a>
                {selected.anchor_tx && (
                  <a href={SUI_EXPLORER_TX(selected.anchor_tx)} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                    anchor tx ↗
                  </a>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="panel min-h-[320px] p-4">
                <SectionLabel index="02" className="mb-3">
                  Knowledge graph {graph?.mode ? `· ${graph.mode}` : ""}
                </SectionLabel>
                {nodes.length ? (
                  <GraphCanvas nodes={nodes} edges={edges} />
                ) : (
                  <p className="mono text-[11px] text-faint">
                    No graph nodes for this cycle (simple fallback or Walrus unavailable).
                    {walrusError ? ` (${walrusError})` : ""}
                  </p>
                )}
              </div>
              <OntologyPanel ontology={ontology} nodeCount={nodes.length} edgeCount={edges.length} />
            </div>

            {walrus?.evidence?.length ? (
              <div className="panel p-4">
                <SectionLabel index="03" className="mb-3">Evidence</SectionLabel>
                <ul className="space-y-2">
                  {walrus.evidence.slice(0, 6).map((e, i) => (
                    <li key={i} className="border-l border-line pl-3 text-sm text-muted">
                      <span className="text-text">{e.headline}</span>
                      <span className="mono ml-2 text-[10px] uppercase text-faint">{e.source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="panel p-10 text-center mono text-[11px] text-faint">Select a cycle.</div>
        )}
      </div>
    </div>
  );
}
