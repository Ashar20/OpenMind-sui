import { spawn } from "node:child_process";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const REPO_ROOT = join(process.cwd(), "..");
const KEEPER_DIR = join(REPO_ROOT, "keeper");

export type PhaseEvent = { ts: number; label: string };

export type RunResult = {
  closedOracleId?: string;
  closeTx?: string;
  openedOracleId?: string;
  openTx?: string;
  anchorTx?: string;
  strike?: string;
  budgetBps?: number;
  reasoningHash?: string;
  walrusBlobId?: string;
  skipped?: string;
};

type RunState = {
  id: string;
  status: "running" | "done" | "error";
  phases: PhaseEvent[];
  result: RunResult;
  error?: string;
  startedAt: number;
};

const runs = new Map<string, RunState>();
let activeRunId: string | null = null;

// Matches a keeper stdout line to a human phase label. Order matters —
// first match wins, checked top to bottom.
const PHASE_MATCHERS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^Cycle open, oracle (\S+) status=(\S+); nothing to do/, (m) =>
    `Cycle still active (oracle ${m[1].slice(0, 10)}…, status ${m[2]}) — nothing to do yet`],
  [/^Open skipped: (.+)/, (m) => `Open skipped: ${m[1]}`],
  [/^OPENMIND_VAULT_CYCLE_CLOSED/, () => "Previous cycle closed on-chain"],
  [/^settlement_receipt_walrus=(\S+)/, (m) => `Settlement receipt stored on Walrus (${m[1].slice(0, 12)}…)`],
  [/^memwal_outcome_blob=(\S+)/, () => "Outcome remembered in MemWal"],
  [/^MemWal remember failed/, () => "MemWal remember failed (non-fatal, continuing)"],
  [/^Running openmind agent for oracle (\S+)/, (m) => `Running AI agent for oracle ${m[1].slice(0, 10)}… (news → knowledge graph → budget scoring)`],
  [/^OPENMIND_ANCHOR_TX digest=(\S+)/, () => "Reasoning hash anchored on-chain (before opening the position)"],
  [/^OPENMIND_VAULT_CYCLE_OPENED/, () => "Cycle opened on-chain"],
  [/^OPENMIND_DIRECTIONAL_OPENED/, () => "Directional position opened on-chain"],
  [/^DIRECTIONAL_SKIP/, () => "Directional leg skipped — no qualifying edge this cycle"],
];

function classify(line: string): string | null {
  for (const [re, fmt] of PHASE_MATCHERS) {
    const m = line.match(re);
    if (m) return fmt(m);
  }
  return null;
}

function push(run: RunState, label: string) {
  run.phases.push({ ts: Date.now(), label });
}

function parseResult(allLines: string[], result: RunResult) {
  // Track whether a close actually happened — roll() may jump straight to
  // openCycle() with no close at all, in which case the only tx= line is
  // the open, not a close (sawClose disambiguates the two cases).
  let sawClose = false;
  for (const line of allLines) {
    let m;
    if (/^OPENMIND_VAULT_CYCLE_CLOSED/.test(line)) { sawClose = true; continue; }
    if ((m = line.match(/^tx=(\S+)/))) {
      if (sawClose && !result.closeTx) result.closeTx = m[1];
      else result.openTx = m[1];
      continue;
    }
    if ((m = line.match(/^oracle=(\S+)/))) { result.openedOracleId = m[1]; continue; }
    if ((m = line.match(/^strike=(\S+)/))) { result.strike = m[1]; continue; }
    if ((m = line.match(/^budget_bps=(\S+)/))) { result.budgetBps = Number(m[1]); continue; }
    if ((m = line.match(/^reasoning_hash=(\S+)/))) { result.reasoningHash = m[1]; continue; }
    if ((m = line.match(/^walrus_blob=(\S+)/))) { result.walrusBlobId = m[1]; continue; }
    if ((m = line.match(/^anchor_tx=(\S+)/))) { result.anchorTx = m[1]; continue; }
    if ((m = line.match(/^Open skipped: (.+)/))) { result.skipped = m[1]; continue; }
    if ((m = line.match(/^Cycle open, oracle (\S+) status=/))) { result.skipped = `cycle still open (${m[1]})`; continue; }
  }
}

export function startRun(): { runId: string; alreadyRunning: boolean } {
  if (activeRunId) {
    const existing = runs.get(activeRunId);
    if (existing?.status === "running") {
      return { runId: activeRunId, alreadyRunning: true };
    }
  }

  const runId = randomUUID();
  const run: RunState = { id: runId, status: "running", phases: [], result: {}, startedAt: Date.now() };
  runs.set(runId, run);
  activeRunId = runId;
  push(run, "Checking vault state…");

  const child = spawn("npx", ["tsx", "src/vaultCycle.ts", "roll"], {
    cwd: KEEPER_DIR,
    env: process.env,
  });

  const allLines: string[] = [];
  let buf = "";

  function onChunk(chunk: Buffer) {
    buf += chunk.toString("utf8");
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      allLines.push(line);
      const label = classify(line);
      if (label) push(run, label);
    }
  }

  child.stdout.on("data", onChunk);
  child.stderr.on("data", onChunk);

  child.on("close", (code) => {
    if (buf.trim()) allLines.push(buf.trim());
    parseResult(allLines, run.result);
    if (code === 0) {
      push(run, run.result.openTx || run.result.skipped ? "Done" : "Done (no on-chain change this tick)");
      run.status = "done";
    } else {
      run.error = allLines.slice(-5).join("\n") || `keeper exited with code ${code}`;
      run.status = "error";
      push(run, `Failed: ${run.error.split("\n")[0]}`);
    }
    activeRunId = null;
  });

  child.on("error", (err) => {
    run.error = err.message;
    run.status = "error";
    push(run, `Failed to start: ${err.message}`);
    activeRunId = null;
  });

  return { runId, alreadyRunning: false };
}

export function getRun(runId: string): RunState | null {
  return runs.get(runId) ?? null;
}
