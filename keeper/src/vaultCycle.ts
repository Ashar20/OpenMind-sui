/**
 * openmind vault keeper — cron-safe cycle loop.
 * open: spawn agent → anchor → open_cycle
 * close: close_cycle after oracle settles
 * roll: close if settled, then open next
 * status: print vault accounting
 *
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
 * Reference: https://docs.sui.io/develop/transactions
 * Predict server: https://predict-server.testnet.mystenlabs.com
 */

import "./loadEnv.ts";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import {
  PREDICT_PACKAGE, PREDICT_SHARED, DUSDC_TYPE,
  PREDICT_SERVER, CLOCK_OBJECT,
  OPENMIND_PACKAGE, VAULT_OBJECT, VAULT_MANAGER, ACCESS_CONTROL_OBJECT, AGENT_CAP_OBJECT,
  SUI_RPC,
} from "./config.ts";
import { surfaceReadout, type OracleState } from "./surface.ts";
import { uploadToWalrus } from "./walrus.ts";
import { rememberCycleOutcome } from "./memwal.ts";
import { REPO_ROOT } from "./loadEnv.ts";

const client = new SuiJsonRpcClient({ url: SUI_RPC, network: "testnet" });

// Strike 1% below spot — keeper advisory only, vault polices on-chain
const STRIKE_SPOT_BPS = Number(process.env.VAULT_STRIKE_SPOT_BPS ?? 9_900);
// Min horizon so oracle is live long enough to be worth hedging
const MIN_HORIZON_MS = Number(process.env.VAULT_MIN_HORIZON_MS ?? 75 * 60_000);

const DATA_DIR = new URL("../data", import.meta.url).pathname;
const FILLS_PATH = `${DATA_DIR}/vault_fills.ndjson`;

// ─── Keypair ─────────────────────────────────────────────────────────────────

function loadKeypair(): Ed25519Keypair {
  const raw = process.env.SUI_KEEPER_KEY;
  if (!raw) throw new Error("SUI_KEEPER_KEY not set");
  const { scheme, secretKey } = decodeSuiPrivateKey(raw.trim());
  if (scheme !== "ED25519") throw new Error(`Unsupported key scheme ${scheme}`);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

// ─── Vault state ─────────────────────────────────────────────────────────────

type OpenCycle = {
  oracle_id: string;
  expiry_ms: string;
  strike: string;
  quantity: string;
  budget_spent: string;
  reasoning_hash: number[];
  risk_score: string;
};

type VaultFields = {
  buffer: string;
  plp_book: string;
  open: { fields: OpenCycle } | null;
  paused: boolean;
  cycles_completed: string;
  lifetime_hedge_spent: string;
  lifetime_realized: string;
};

async function readVault(): Promise<VaultFields> {
  const res = await client.getObject({ id: VAULT_OBJECT, options: { showContent: true } });
  const content = res.data?.content;
  if (!content || content.dataType !== "moveObject") throw new Error("Vault unreadable");
  const f = content.fields as Record<string, unknown>;
  return {
    buffer: String(f.buffer ?? "0"),
    plp_book: String(f.plp_book ?? "0"),
    open: (f.open as { fields: OpenCycle } | null) ?? null,
    paused: Boolean(f.paused),
    cycles_completed: String(f.cycles_completed ?? "0"),
    lifetime_hedge_spent: String(f.lifetime_hedge_spent ?? "0"),
    lifetime_realized: String(f.lifetime_realized ?? "0"),
  };
}

function nav(v: VaultFields): bigint {
  return BigInt(v.buffer) + BigInt(v.plp_book);
}

// ─── Oracle helpers ───────────────────────────────────────────────────────────

type OracleListing = {
  oracle_id: string; expiry: string; status: string;
  min_strike: string; tick_size: string; underlying_asset: string;
  settlement_price?: string;
};

async function listOracles(): Promise<OracleListing[]> {
  const r = await fetch(`${PREDICT_SERVER}/oracles`);
  if (!r.ok) throw new Error(`/oracles ${r.status}`);
  return r.json() as Promise<OracleListing[]>;
}

async function getOracleState(id: string): Promise<OracleState> {
  const r = await fetch(`${PREDICT_SERVER}/oracles/${id}/state`);
  if (!r.ok) throw new Error(`/oracles/${id}/state ${r.status}`);
  return r.json() as Promise<OracleState>;
}

async function soonestEligibleOracle(): Promise<OracleListing> {
  const oracles = await listOracles();
  const floor = Date.now() + MIN_HORIZON_MS;
  const eligible = oracles
    .filter(o => o.status === "active" && Number(o.expiry) >= floor)
    .sort((a, b) => Number(a.expiry) - Number(b.expiry));
  if (!eligible.length) throw new Error("No active oracle beyond minimum horizon");
  return eligible[0];
}

function pickStrike(oracle: OracleListing, state: OracleState): bigint {
  const spot = BigInt(state.latest_price!.spot);
  const target = (spot * BigInt(STRIKE_SPOT_BPS)) / 10_000n;
  const min = BigInt(oracle.min_strike);
  const tick = BigInt(oracle.tick_size);
  if (target <= min) throw new Error("Spot target below strike grid floor");
  const k = (target - min) / tick;
  return min + k * tick;
}

// ─── Append fill row ──────────────────────────────────────────────────────────

function appendFill(row: Record<string, unknown>) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    appendFileSync(FILLS_PATH, JSON.stringify(row) + "\n");
  } catch (err) {
    console.error(`Fill write failed: ${err instanceof Error ? err.message : err}`);
  }
}

const REASONING_CACHE = resolve(REPO_ROOT, "agent/.last_reasoning.json");

type ReasoningCache = {
  cycle_oracle_id: string;
  expiry_ms?: number;
  knowledge_graph: {
    dominant_theme: string;
  };
  budget: {
    budget_bps: number;
    breakdown: {
      base: number;
      news_uplift: number;
      gap_uplift: number;
      memory_uplift: number;
    };
  };
  news_signal?: number;
  svi_down_probability: number;
  polymarket_down_probability: number;
  memory_cycles_recalled: number;
  reasoning_hash_hex: string;
  walrus_blob_id: string;
};

function loadReasoningCache(): ReasoningCache | null {
  if (!existsSync(REASONING_CACHE)) return null;
  try {
    return JSON.parse(readFileSync(REASONING_CACHE, "utf8")) as ReasoningCache;
  } catch {
    return null;
  }
}

// ─── Call Python agent ────────────────────────────────────────────────────────

type AgentOutput = {
  reasoning_hash_hex: string;     // 64 hex chars = 32 bytes
  walrus_blob_id: string;
  risk_score: number;             // 0–10000
  budget_bps: number;
  news_signal_bps: number;
  svi_gap_bps: number;
  memory_cycles_recalled: number;
  anchor_tx_digest: string;
  reasoning_summary: string;
};

async function runAgent(oracleId: string): Promise<AgentOutput> {
  /**
   * Spawn Python agent for this oracle cycle.
   * Agent does: recall → news → analyze → score → upload Walrus → anchor Sui
   * Returns JSON with decision metadata.
   */
  const python = resolve(REPO_ROOT, "agent/.venv/bin/python3");
  const cyclePy = resolve(REPO_ROOT, "agent/cycle.py");
  const output = execSync(
    `"${python}" "${cyclePy}" --oracle-id ${oracleId} --output-json`,
    { env: { ...process.env }, cwd: REPO_ROOT, encoding: "utf8", timeout: 300_000 }
  );
  return JSON.parse(output.trim()) as AgentOutput;
}

// ─── Open cycle ───────────────────────────────────────────────────────────────

async function openCycle() {
  const v = await readVault();
  if (v.open) throw new Error("Cycle already open");

  const oracle = await soonestEligibleOracle();
  const state = await getOracleState(oracle.oracle_id);
  const strike = pickStrike(oracle, state);
  const navNow = nav(v);

  // Run openmind agent — it anchors reasoning on Sui, returns hash + metadata
  console.log(`Running openmind agent for oracle ${oracle.oracle_id}...`);
  const agent = await runAgent(oracle.oracle_id);

  // Convert hex hash to byte array for Move
  const hashBytes = Array.from(Buffer.from(agent.reasoning_hash_hex, "hex"));
  const quantity = navNow * BigInt(agent.budget_bps) / 10_000n;

  const tx = new Transaction();
  tx.moveCall({
    target: `${OPENMIND_PACKAGE}::openmind_vault::open_cycle_authorized`,
    typeArguments: [DUSDC_TYPE],
    arguments: [
      tx.object(VAULT_OBJECT),
      tx.object(ACCESS_CONTROL_OBJECT),
      tx.object(AGENT_CAP_OBJECT),
      tx.object(PREDICT_SHARED),
      tx.object(VAULT_MANAGER),
      tx.object(oracle.oracle_id),
      tx.pure.u64(strike),
      tx.pure.u64(quantity),
      tx.pure.u64(agent.budget_bps),
      tx.pure.vector("u8", hashBytes),
      tx.pure.u64(agent.risk_score),
      tx.pure.u64(agent.news_signal_bps),
      tx.pure.u64(agent.svi_gap_bps),
      tx.pure.u64(agent.memory_cycles_recalled),
      tx.object(CLOCK_OBJECT),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: loadKeypair(),
    transaction: tx,
    options: { showEvents: true, showEffects: true },
  });

  if (result.effects?.status?.status !== "success") {
    throw new Error(`open_cycle failed: ${JSON.stringify(result.effects?.status)}`);
  }

  console.log("OPENMIND_VAULT_CYCLE_OPENED");
  console.log(`tx=${result.digest}`);
  console.log(`oracle=${oracle.oracle_id}`);
  console.log(`strike=${strike}`);
  console.log(`budget_bps=${agent.budget_bps}`);
  console.log(`reasoning_hash=${agent.reasoning_hash_hex}`);
  console.log(`walrus_blob=${agent.walrus_blob_id}`);
  console.log(`anchor_tx=${agent.anchor_tx_digest}`);
  console.log(`memory_recalled=${agent.memory_cycles_recalled}`);

  // Read SVI surface for fill quality receipt
  const readout = surfaceReadout(state, strike, false);
  const openEvent = result.events?.find(e => e.type.includes("OpenMindCycleOpened"))?.parsedJson as any;

  appendFill({
    kind: "open",
    at: new Date().toISOString(),
    tx: result.digest,
    anchorTx: agent.anchor_tx_digest,
    oracleId: oracle.oracle_id,
    expiryMs: Number(oracle.expiry),
    strike: strike.toString(),
    spot: state.latest_price?.spot,
    budgetBps: agent.budget_bps,
    quantity: quantity.toString(),
    riskScore: agent.risk_score,
    newsSignalBps: agent.news_signal_bps,
    sviGapBps: agent.svi_gap_bps,
    memoryCyclesRecalled: agent.memory_cycles_recalled,
    reasoningHash: agent.reasoning_hash_hex,
    walrusBlobId: agent.walrus_blob_id,
    sviFair: readout.modelPrice,
    askCost: openEvent?.ask_cost,
    bidCost: openEvent?.bid_cost,
    reasoningSummary: agent.reasoning_summary,
  });
}

// ─── Close cycle ──────────────────────────────────────────────────────────────

async function closeCycle() {
  const v = await readVault();
  if (!v.open) throw new Error("No open cycle");
  const cycle = (v.open as any).fields as OpenCycle;
  const oracleId = cycle.oracle_id;

  const tx = new Transaction();
  tx.moveCall({
    target: `${OPENMIND_PACKAGE}::openmind_vault::close_cycle_authorized`,
    typeArguments: [DUSDC_TYPE],
    arguments: [
      tx.object(VAULT_OBJECT),
      tx.object(ACCESS_CONTROL_OBJECT),
      tx.object(PREDICT_SHARED),
      tx.object(VAULT_MANAGER),
      tx.object(oracleId),
      tx.object(CLOCK_OBJECT),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: loadKeypair(),
    transaction: tx,
    options: { showEvents: true, showEffects: true },
  });

  if (result.effects?.status?.status !== "success") {
    throw new Error(`close_cycle failed: ${JSON.stringify(result.effects?.status)}`);
  }

  console.log("OPENMIND_VAULT_CYCLE_CLOSED");
  console.log(`tx=${result.digest}`);

  const closed = result.events?.find(e => e.type.includes("OpenMindCycleClosed"))?.parsedJson as any;
  const listing = (await listOracles()).find(o => o.oracle_id === oracleId);
  const settlement = listing?.settlement_price ? BigInt(listing.settlement_price) : undefined;
  const strike = BigInt(cycle.strike);
  const itm = settlement !== undefined ? settlement < strike : undefined;
  const quantity = BigInt(cycle.quantity);
  const budget = BigInt(cycle.budget_spent);
  const swept = closed?.manager_swept ? BigInt(closed.manager_swept) : undefined;
  const realizedHedgeCost =
    swept !== undefined && itm !== undefined
      ? (budget - swept + (itm ? quantity : 0n)).toString()
      : undefined;

  appendFill({
    kind: "close",
    at: new Date().toISOString(),
    tx: result.digest,
    oracleId,
    expiryMs: Number(cycle.expiry_ms),
    strike: cycle.strike,
    quantity: cycle.quantity,
    budgetSpent: cycle.budget_spent,
    reasoningHash: Buffer.from(cycle.reasoning_hash).toString("hex"),
    settlementPrice: settlement?.toString(),
    itm,
    plpRealized: closed?.plp_realized,
    managerSwept: closed?.manager_swept,
    navAfterClose: closed?.nav_after_close,
    realizedHedgeCost,
  });

  const reasoning = loadReasoningCache();
  const settlementReceipt = {
    version: "openmind-settlement-v1",
    oracleId,
    closeTx: result.digest,
    expiryMs: Number(cycle.expiry_ms),
    strike: cycle.strike,
    settlementPrice: settlement?.toString(),
    itm,
    plpRealized: closed?.plp_realized,
    managerSwept: closed?.manager_swept,
    navAfterClose: closed?.nav_after_close,
    realizedHedgeCost,
    reasoningHash: Buffer.from(cycle.reasoning_hash).toString("hex"),
    reasoningWalrusBlobId: reasoning?.walrus_blob_id,
  };

  let settlementBlobId = "";
  try {
    settlementBlobId = await uploadToWalrus(
      JSON.stringify(settlementReceipt, null, 2),
      5,
      `settlement-${oracleId}.json`,
    );
    console.log(`settlement_receipt_walrus=${settlementBlobId}`);
  } catch (err) {
    console.error(
      `Settlement Walrus upload failed: ${err instanceof Error ? err.message : err}`,
    );
  }

  if (reasoning && oracleId === reasoning.cycle_oracle_id) {
    try {
      const strikeNum = Number(cycle.strike);
      const btcMovePct =
        settlement !== undefined && strikeNum > 0
          ? ((Number(settlement) - strikeNum) / strikeNum) * 100
          : 0;
      const memBlobId = await rememberCycleOutcome({
        oracleId,
        expiryDate: new Date(Number(cycle.expiry_ms)).toISOString(),
        dominantTheme: reasoning.knowledge_graph.dominant_theme,
        newsSignal: reasoning.news_signal ?? 0,
        budgetBps: reasoning.budget.budget_bps,
        budgetBreakdown: reasoning.budget.breakdown,
        sviDownProb: reasoning.svi_down_probability,
        polymarketDownProb: reasoning.polymarket_down_probability,
        itm: Boolean(itm),
        plpCarryBps: closed?.plp_realized ? Number(closed.plp_realized) / 1e4 : 0,
        btcMovePct,
        reasoningHash: reasoning.reasoning_hash_hex,
        memoryCyclesRecalled: reasoning.memory_cycles_recalled,
        settlementReceiptBlobId: settlementBlobId || undefined,
      });
      console.log(`memwal_outcome_blob=${memBlobId}`);
    } catch (err) {
      console.error(`MemWal remember failed: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.warn("No matching reasoning cache — skipped MemWal remember");
  }
}

// ─── Roll (cron tick) ─────────────────────────────────────────────────────────

async function roll() {
  const v = await readVault();
  let closedThisTick = false;

  if (v.open) {
    const oracleId = (v.open as any).fields.oracle_id;
    const listing = (await listOracles()).find(o => o.oracle_id === oracleId);
    if (!listing || listing.status !== "settled") {
      console.log(`Cycle open, oracle ${oracleId} status=${listing?.status ?? "unknown"}; nothing to do`);
      return;
    }
    await closeCycle();
    closedThisTick = true;
  }

  const attempts = closedThisTick ? 4 : 1;
  for (let i = 1; i <= attempts; i++) {
    try {
      await openCycle();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Cycle already open") && i < attempts) {
        await new Promise(r => setTimeout(r, 3_000));
        continue;
      }
      if (msg.includes("No active oracle") || msg.includes("strike grid floor")) {
        console.log(`Open skipped: ${msg}`);
        return;
      }
      throw err;
    }
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

async function status() {
  const v = await readVault();
  console.log(JSON.stringify({
    vault: VAULT_OBJECT,
    navUsdc: Number(nav(v)) / 1e6,
    bufferUsdc: Number(v.buffer) / 1e6,
    plpBookUsdc: Number(v.plp_book) / 1e6,
    paused: v.paused,
    cyclesCompleted: Number(v.cycles_completed),
    lifetimeHedgeSpentUsdc: Number(v.lifetime_hedge_spent) / 1e6,
    lifetimeRealizedUsdc: Number(v.lifetime_realized) / 1e6,
    open: v.open,
  }, null, 2));
}

// ─── Entry ────────────────────────────────────────────────────────────────────

const mode = process.argv[2];
try {
  if (mode === "open")   await openCycle();
  else if (mode === "close") await closeCycle();
  else if (mode === "roll")  await roll();
  else await status();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
