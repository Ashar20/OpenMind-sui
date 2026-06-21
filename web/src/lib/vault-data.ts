import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { AGENT_CAP_OBJECT, OPENMIND_PACKAGE, SUI_RPC, VAULT_OBJECT } from "./sui-config";

const REPO_ROOT = join(process.cwd(), "..");
const FILLS_PATH = join(REPO_ROOT, "keeper/data/vault_fills.ndjson");
const REASONING_CACHE = join(REPO_ROOT, "agent/.last_reasoning.json");

const client = new SuiJsonRpcClient({ url: SUI_RPC, network: "testnet" });

export type FillOpen = {
  kind: "open";
  at: string;
  tx: string;
  anchorTx?: string;
  oracleId: string;
  expiryMs: number;
  strike: string;
  spot?: string;
  budgetBps: number;
  quantity: string;
  riskScore: number;
  newsSIignalBps?: number;
  newsSignalBps?: number;
  sviGapBps: number;
  memoryCyclesRecalled: number;
  reasoningHash: string;
  walrusBlobId: string;
  askCost?: string;
  bidCost?: string;
  reasoningSummary?: string;
};

export type FillClose = {
  kind: "close";
  at: string;
  tx: string;
  oracleId: string;
  expiryMs: number;
  strike: string;
  quantity: string;
  budgetSpent: string;
  reasoningHash: string;
  settlementPrice?: string;
  itm: boolean;
  plpRealized?: string;
  managerSwept?: string;
  navAfterClose?: string;
  realizedHedgeCost?: string;
};

export type FillRow = FillOpen | FillClose;

export type CycleReasoning = {
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
  payout?: number;
  nav_after_close?: number;
};

export type VaultState = {
  nav: number;
  buffer: number;
  plpBook: number;
  cyclesCompleted: number;
  paused: boolean;
  shareSupply: number;
  openCycle?: {
    oracle_id: string;
    expiry_ms: number;
    strike: number;
    budget_spent: number;
    reasoning_hash: string;
    risk_score: number;
  };
};

export type AnchorReceipt = {
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

export function cleanWalrusBlobId(raw: string): string {
  const matches = raw.match(/[A-Za-z0-9_-]{40,}/g);
  return matches ? matches[matches.length - 1]! : raw.trim();
}

export function readFills(): FillRow[] {
  if (!existsSync(FILLS_PATH)) return [];
  return readFileSync(FILLS_PATH, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FillRow);
}

export function readReasoningCache(): Record<string, unknown> | null {
  if (!existsSync(REASONING_CACHE)) return null;
  try {
    return JSON.parse(readFileSync(REASONING_CACHE, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildCycleHistory(fills: FillRow[]): CycleReasoning[] {
  const opens = new Map<string, FillOpen>();
  const closes = new Map<string, FillClose>();

  for (const row of fills) {
    if (row.kind === "open") opens.set(row.oracleId, row);
    else closes.set(row.oracleId, row);
  }

  return [...opens.values()]
    .sort((a, b) => b.expiryMs - a.expiryMs)
    .map((open) => {
      const close = closes.get(open.oracleId);
      return {
        oracle_id: open.oracleId,
        expiry_ms: open.expiryMs,
        strike: Number(open.strike),
        budget_bps: open.budgetBps,
        risk_score: open.riskScore,
        news_signal_bps: open.newsSignalBps ?? open.newsSIignalBps ?? 0,
        svi_gap_bps: open.sviGapBps,
        memory_cycles_recalled: open.memoryCyclesRecalled,
        reasoning_hash: open.reasoningHash,
        walrus_blob_id: cleanWalrusBlobId(open.walrusBlobId),
        reasoning_summary: open.reasoningSummary,
        ask_cost: Number(open.askCost ?? 0),
        bid_cost: Number(open.bidCost ?? 0),
        tx: open.tx,
        anchor_tx: open.anchorTx,
        at: open.at,
        itm: close?.itm,
        payout: close?.plpRealized ? Number(close.plpRealized) : undefined,
        nav_after_close: close?.navAfterClose ? Number(close.navAfterClose) : undefined,
      };
    });
}

export async function fetchVaultState(): Promise<VaultState> {
  const res = await client.getObject({
    id: VAULT_OBJECT,
    options: { showContent: true },
  });
  const content = res.data?.content;
  if (!content || content.dataType !== "moveObject") {
    throw new Error("Vault object unreadable");
  }

  const f = content.fields as Record<string, unknown>;
  const buffer = Number(f.buffer ?? 0);
  const plpBook = Number(f.plp_book ?? 0);
  const treasury = f.treasury as { fields?: { total_supply?: { fields?: { value?: string } } } };
  const shareSupply = Number(treasury?.fields?.total_supply?.fields?.value ?? 0);
  const open = f.open as
    | {
        fields: {
          oracle_id: string;
          expiry_ms: string;
          strike: string;
          budget_spent: string;
          reasoning_hash: number[];
          risk_score: string;
        };
      }
    | null;

  const openCycle = open?.fields
    ? {
        oracle_id: open.fields.oracle_id,
        expiry_ms: Number(open.fields.expiry_ms),
        strike: Number(open.fields.strike),
        budget_spent: Number(open.fields.budget_spent),
        reasoning_hash: Buffer.from(open.fields.reasoning_hash).toString("hex"),
        risk_score: Number(open.fields.risk_score),
      }
    : undefined;

  return {
    nav: buffer + plpBook,
    buffer,
    plpBook,
    cyclesCompleted: Number(f.cycles_completed ?? 0),
    paused: Boolean(f.paused),
    shareSupply,
    openCycle,
  };
}

export async function fetchAnchorReceipts(): Promise<AnchorReceipt[]> {
  const history = buildCycleHistory(readFills());
  const cache = readReasoningCache();
  const anchoredAt =
    typeof cache?.anchor_timestamp_ms === "number"
      ? cache.anchor_timestamp_ms
      : Date.now();

  return history
    .filter((c) => c.anchor_tx)
    .map((c, i) => ({
      id: `${c.oracle_id}-${i}`,
      oracle_id: c.oracle_id,
      reasoning_hash: c.reasoning_hash,
      anchored_at_ms: anchoredAt,
      walrus_blob_id: c.walrus_blob_id,
      risk_score: c.risk_score,
      hedge_budget_bps: c.budget_bps,
      memory_cycles_recalled: c.memory_cycles_recalled,
      anchor_tx: c.anchor_tx ?? "",
      open_tx: c.tx,
    }));
}

export async function fetchLatestReasoning(): Promise<CycleReasoning | null> {
  const history = buildCycleHistory(readFills());
  if (history.length) return history[0]!;

  const cache = readReasoningCache();
  if (!cache) return null;

  const budget = cache.budget as { budget_bps?: number; breakdown?: { news_uplift?: number } } | undefined;
  const kg = cache.knowledge_graph as { dominant_theme?: string } | undefined;

  return {
    oracle_id: String(cache.cycle_oracle_id ?? ""),
    expiry_ms: Number(cache.expiry_ms ?? 0),
    strike: Number(cache.strike ?? 0),
    budget_bps: budget?.budget_bps ?? 0,
    risk_score: Math.round(Number(cache.news_signal ?? 0) * 10_000),
    news_signal_bps: budget?.breakdown?.news_uplift ?? 0,
    svi_gap_bps: 0,
    memory_cycles_recalled: Number(cache.memory_cycles_recalled ?? 0),
    reasoning_hash: String(cache.reasoning_hash_hex ?? ""),
    walrus_blob_id: cleanWalrusBlobId(String(cache.walrus_blob_id ?? "")),
    reasoning_summary: kg?.dominant_theme,
    ask_cost: 0,
    bid_cost: 0,
    tx: String(cache.anchor_tx_digest ?? ""),
    anchor_tx: String(cache.anchor_tx_digest ?? ""),
    at: new Date().toISOString(),
  };
}

export type AgentCapState = {
  vaultId: string;
  owner: string;
  maxBudget: number;
  spent: number;
  expiresAtMs: number;
  revoked: boolean;
  actionCount: number;
};

export async function fetchAgentCapState(): Promise<AgentCapState> {
  const res = await client.getObject({
    id: AGENT_CAP_OBJECT,
    options: { showContent: true },
  });
  const content = res.data?.content;
  if (!content || content.dataType !== "moveObject") {
    throw new Error("AgentCap object unreadable");
  }

  const f = content.fields as Record<string, unknown>;
  return {
    vaultId: String(f.vault_id ?? ""),
    owner: String(f.owner ?? ""),
    maxBudget: Number(f.max_budget ?? 0),
    spent: Number(f.spent ?? 0),
    expiresAtMs: Number(f.expires_at_ms ?? 0),
    revoked: Boolean(f.revoked),
    actionCount: Number(f.action_count ?? 0),
  };
}

export async function fetchHealth() {
  let vaultOk = false;
  let cycles = 0;
  try {
    const vault = await fetchVaultState();
    vaultOk = true;
    cycles = vault.cyclesCompleted;
  } catch {
    vaultOk = false;
  }

  return {
    ok: vaultOk,
    network: "sui-testnet",
    package: OPENMIND_PACKAGE,
    vault: VAULT_OBJECT,
    cycles_completed: cycles,
    fills: readFills().length,
  };
}
