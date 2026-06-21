/**
 * MemWal TypeScript SDK wrapper for keeper close-cycle memory + receipts.
 * Agent open-cycle memory (recall/analyze/ask) stays in Python agent/memory.py.
 *
 * Reference: https://docs.memwal.ai/sdk/quick-start
 * Reference: https://docs.wal.app/walrus-memory/sdk/quick-start
 */
import { MemWal } from "@mysten-incubation/memwal";

export const MEMWAL_NAMESPACE = "openmind-vault";

const DEFAULT_SERVER_URL = "https://relayer.memory.walrus.xyz";

let client: MemWal | null = null;

export function getMemWal(): MemWal {
  if (client) return client;

  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) {
    throw new Error("MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID must be set");
  }

  client = MemWal.create({
    key,
    accountId,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? DEFAULT_SERVER_URL,
    namespace: MEMWAL_NAMESPACE,
  });
  return client;
}

export type BudgetBreakdown = {
  base: number;
  news_uplift: number;
  gap_uplift: number;
  memory_uplift: number;
};

export type RememberCycleOutcomeInput = {
  oracleId: string;
  expiryDate: string;
  dominantTheme: string;
  newsSignal: number;
  budgetBps: number;
  budgetBreakdown: BudgetBreakdown;
  sviDownProb: number;
  polymarketDownProb: number;
  itm: boolean;
  plpCarryBps: number;
  btcMovePct: number;
  reasoningHash: string;
  memoryCyclesRecalled: number;
  settlementReceiptBlobId?: string;
};

function formatCycleOutcome(input: RememberCycleOutcomeInput): string {
  const gap = Math.abs(input.sviDownProb - input.polymarketDownProb);
  const b = input.budgetBreakdown;
  const outcome = input.itm ? "ITM — hedge PAID" : "OTM — expired";
  const receipt = input.settlementReceiptBlobId
    ? `Settlement receipt Walrus blob: ${input.settlementReceiptBlobId}\n`
    : "";

  return `
Cycle ${input.oracleId} | ${input.expiryDate}:
Theme: ${input.dominantTheme} | News signal: ${input.newsSignal.toFixed(2)}
Past cycles recalled: ${input.memoryCyclesRecalled}
Budget: ${input.budgetBps}bps (base ${b.base} + news ${b.news_uplift} + gap ${b.gap_uplift} + memory ${b.memory_uplift})
SVI down probability: ${input.sviDownProb.toFixed(3)}
Polymarket down probability: ${input.polymarketDownProb.toFixed(3)}
Signal gap: ${gap.toFixed(3)}
BTC move: ${input.btcMovePct >= 0 ? "+" : ""}${input.btcMovePct.toFixed(2)}%
Outcome: ${outcome}
PLP carry: ${input.plpCarryBps.toFixed(1)}bps
Reasoning hash: ${input.reasoningHash}
${receipt}`.trim();
}

/** Store settled cycle outcome in MemWal for future recall (keeper close path). */
export async function rememberCycleOutcome(
  input: RememberCycleOutcomeInput,
): Promise<string> {
  const result = await getMemWal().rememberAndWait(
    formatCycleOutcome(input),
    MEMWAL_NAMESPACE,
    { timeoutMs: 60_000 },
  );
  return result.blob_id;
}

export async function memwalHealth(): Promise<void> {
  const health = await getMemWal().health();
  if (health.status !== "ok") {
    throw new Error(`MemWal relayer unhealthy: ${health.status}`);
  }
}
