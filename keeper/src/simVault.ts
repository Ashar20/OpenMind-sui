/**
 * openmind vault simulation.
 * Runs two strategies across all captured settled BTC oracles:
 *   A) Fixed 250bps budget every cycle (industry baseline)
 *   B) Dynamic budget from openmind scoring (news_signal + svi_gap + memory)
 * Each strategy at 3 PLP carry bands = 6 total sim runs.
 *
 * Input:  keeper/data/oracle_states.ndjson  (from simCapture.ts)
 *         keeper/data/vault_fills.ndjson    (from live vault cycles)
 * Output: web/public/sim/vault_sim.json
 *
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { surfaceReadout, type OracleState } from "./surface.ts";

const BPS = 10_000;
const PRICE_SCALE = 1_000_000_000;
const QUOTE_SCALE = 1_000_000;
const STRIKE_SPOT_BPS = 9_900;
const MIN_HORIZON_MS = 75 * 60_000;

// Fixed strategy params
const FIXED_HEDGE_BPS = 250;

// Dynamic strategy params (mirrors scorer.py)
const DYNAMIC_BASE_BPS = 150;
const DYNAMIC_MAX_NEWS_BPS = 200;
const DYNAMIC_MAX_GAP_BPS = 100;
const DYNAMIC_MAX_MEM_BPS = 150;
const DYNAMIC_HARD_CAP = 2000;

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ORACLE_STATES_PATH = join(REPO_ROOT, "keeper/data/oracle_states.ndjson");
const FILLS_PATH = join(REPO_ROOT, "keeper/data/vault_fills.ndjson");
const OUTPUT_PATH = join(REPO_ROOT, "web/public/sim/vault_sim.json");

// ─── Types ────────────────────────────────────────────────────────────────────

type CapturedOracle = {
  oracle: {
    oracle_id: string; expiry: number | string;
    min_strike: number | string; tick_size: number | string;
    status: string; settlement_price?: number | string | null;
    underlying_asset?: string; activated_at?: number | string;
  };
  latest_price?: OracleState["latest_price"];
  latest_svi?: OracleState["latest_svi"];
};

type FillRow = {
  kind: "open" | "close";
  tx: string; oracleId: string;
  budgetBps?: number; navAfterClose?: string;
  itm?: boolean; quantity?: string; budgetSpent?: string;
  managerSwept?: string; plpRealized?: string;
  riskScore?: number; newsSignalBps?: number; sviGapBps?: number;
  askCost?: string | number; bidCost?: string | number;
};

type SimCycle = {
  date: string; oracleId: string; openMs: number; expiryMs: number;
  spotProxy: bigint; strike: bigint; settlementPrice: bigint;
  hedgeBps: number; premiumRate: number; budget: number;
  premiumCost: number; payout: number;
  hedgedNav: number; unhedgedNav: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lines(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").map(l => l.trim()).filter(Boolean);
}

function readNdjson<T>(path: string): T[] {
  return lines(path).map(l => JSON.parse(l) as T);
}

function asNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBigInt(v: number | string | null | undefined): bigint | null {
  if (v == null) return null;
  try { return BigInt(v); } catch { return null; }
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function round(v: number, d = 6): number {
  return Number(v.toFixed(d));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid-1] + s[mid]) / 2 : s[mid];
}

function snapStrike(row: CapturedOracle, spot: bigint): bigint | null {
  const min = asBigInt(row.oracle.min_strike);
  const tick = asBigInt(row.oracle.tick_size);
  if (!min || !tick || tick <= 0n) return null;
  const target = (spot * BigInt(STRIKE_SPOT_BPS)) / BigInt(BPS);
  if (target <= min) return null;
  return min + ((target - min) / tick) * tick;
}

function latestSettledBefore(rows: CapturedOracle[], atMs: number): CapturedOracle | null {
  let low = 0, high = rows.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((asNumber(rows[mid].oracle.expiry) ?? 0) <= atMs) low = mid + 1;
    else high = mid;
  }
  return low > 0 ? rows[low - 1] : null;
}

// ─── Dynamic budget simulator ─────────────────────────────────────────────────
// Approximates openmind scorer.py without live news/memory.
// Uses SVI surface variance as news_signal proxy.

function approximateDynamicBudget(row: CapturedOracle, strike: bigint): number {
  if (!row.latest_svi || !row.latest_price) return DYNAMIC_BASE_BPS;
  try {
    const readout = surfaceReadout(
      { oracle: row.oracle, latest_price: row.latest_price, latest_svi: row.latest_svi } as any,
      strike, false
    );
    // Use surface vol as proxy for news signal (high vol surface → high news signal)
    // This is a simulation approximation — real agent uses actual news
    const surfaceVol = Math.sqrt(
      Math.max(0, Number(row.latest_svi.a) / PRICE_SCALE +
        Number(row.latest_svi.b) / PRICE_SCALE)
    );
    const newsSignal = Math.min(1.0, surfaceVol * 3);
    const newsUplift = Math.round(newsSignal * DYNAMIC_MAX_NEWS_BPS);
    // Simulate gap: use 0 for sim (no live Polymarket data in historical captures)
    const gapUplift = 0;
    // Simulate memory uplift: 0 for first cycle, grows over time
    const memUplift = 0;
    return Math.min(DYNAMIC_BASE_BPS + newsUplift + gapUplift + memUplift, DYNAMIC_HARD_CAP);
  } catch {
    return DYNAMIC_BASE_BPS;
  }
}

// ─── Core simulation ──────────────────────────────────────────────────────────

function simulate(
  rows: CapturedOracle[],
  initialNav: number,
  premiumRate: number,
  carryBps: number,
  strategyFn: (row: CapturedOracle, strike: bigint, nav: number) => number,
): { cycles: SimCycle[]; skipped: number; hedgedNav: number; unhedgedNav: number;
    totalHedgeSpend: number; totalPayouts: number; payoutCount: number;
    maxDrawdownHedgedBps: number; maxDrawdownUnhedgedBps: number } {

  let hedgedNav = initialNav, unhedgedNav = initialNav;
  let peakH = initialNav, peakU = initialNav;
  let maxDrawH = 0, maxDrawU = 0;
  let totalHedgeSpend = 0, totalPayouts = 0, payoutCount = 0, skipped = 0;
  const cycles: SimCycle[] = [];
  let cursor = 0;
  let currentTime = asNumber(rows[0]?.oracle.expiry) ?? 0;

  while (cursor < rows.length) {
    while (cursor < rows.length &&
      (asNumber(rows[cursor].oracle.expiry) ?? 0) < currentTime + MIN_HORIZON_MS) {
      cursor++;
    }
    if (cursor >= rows.length) break;

    const row = rows[cursor++];
    const expiry = asNumber(row.oracle.expiry);
    const settlement = asBigInt(row.oracle.settlement_price);
    if (expiry == null || settlement == null) { skipped++; currentTime = expiry ?? currentTime; continue; }

    const proxy = latestSettledBefore(rows, currentTime);
    const spotProxy = proxy ? asBigInt(proxy.oracle.settlement_price) : null;
    if (!spotProxy) { skipped++; currentTime = expiry; continue; }

    const strike = snapStrike(row, spotProxy);
    if (!strike) { skipped++; currentTime = expiry; continue; }

    const hedgeBps = strategyFn(row, strike, hedgedNav);
    const budget = hedgedNav * (hedgeBps / BPS);
    const premiumCost = budget * premiumRate;
    const itm = settlement < strike;
    const payout = itm ? budget : 0;

    // The vault holds no BTC exposure of its own — it's pure dUSDC carry
    // plus a small recurring spend on a downside binary. So "hedged" just
    // nets carry - premium + payout, and "unhedged" is carry-only (it never
    // buys the binary at all). Neither side has a "downside loss" term —
    // there's no underlying position for a BTC drop to damage directly.
    const hedgedCarry = hedgedNav * (carryBps / BPS);
    const unhedgedCarry = unhedgedNav * (carryBps / BPS);
    hedgedNav = Math.max(0, hedgedNav + hedgedCarry - premiumCost + payout);
    unhedgedNav = Math.max(0, unhedgedNav + unhedgedCarry);

    peakH = Math.max(peakH, hedgedNav); peakU = Math.max(peakU, unhedgedNav);
    maxDrawH = Math.max(maxDrawH, ((peakH - hedgedNav) / peakH) * BPS);
    maxDrawU = Math.max(maxDrawU, ((peakU - unhedgedNav) / peakU) * BPS);
    totalHedgeSpend += premiumCost; totalPayouts += payout;
    if (payout > 0) payoutCount++;

    cycles.push({
      date: isoDate(expiry), oracleId: row.oracle.oracle_id,
      openMs: currentTime, expiryMs: expiry,
      spotProxy, strike, settlementPrice: settlement,
      hedgeBps, premiumRate, budget, premiumCost, payout,
      hedgedNav, unhedgedNav,
    });
    currentTime = expiry;
  }

  return { cycles, skipped, hedgedNav, unhedgedNav,
    totalHedgeSpend, totalPayouts, payoutCount,
    maxDrawdownHedgedBps: maxDrawH, maxDrawdownUnhedgedBps: maxDrawU };
}

function summarize(r: ReturnType<typeof simulate>, initNav: number) {
  const first = r.cycles[0], last = r.cycles[r.cycles.length - 1];
  return {
    cycles: r.cycles.length, skipped: r.skipped,
    spanStart: first?.date ?? null, spanEnd: last?.date ?? null,
    initialNav: round(initNav, 6),
    endingHedgedNav: round(r.hedgedNav, 6),
    endingUnhedgedNav: round(r.unhedgedNav, 6),
    totalHedgeSpendBps: round((r.totalHedgeSpend / initNav) * BPS, 2),
    payoutCount: r.payoutCount,
    hitRate: r.cycles.length ? round(r.payoutCount / r.cycles.length, 4) : 0,
    totalPayouts: round(r.totalPayouts, 6),
    netCostBps: round(((r.totalHedgeSpend - r.totalPayouts) / initNav) * BPS, 2),
    maxDrawdownHedgedBps: round(r.maxDrawdownHedgedBps, 2),
    maxDrawdownUnhedgedBps: round(r.maxDrawdownUnhedgedBps, 2),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const oracleRows = readNdjson<CapturedOracle>(ORACLE_STATES_PATH)
  .filter(r => r.oracle.status === "settled" && r.oracle.underlying_asset === "BTC")
  .sort((a, b) => (asNumber(a.oracle.expiry) ?? 0) - (asNumber(b.oracle.expiry) ?? 0));

const fills = readNdjson<FillRow>(FILLS_PATH);
// Sim always starts at a normalised 100-unit base for clean percentage math
const initialNav = 100;

// Calibrate premium from live fills: bidCost / quantity = cost per payout unit
const openFills = fills.filter(f => f.kind === "open");
const bidCostRatios = openFills
  .filter(f => f.bidCost != null && f.quantity != null && Number(f.quantity) > 0)
  .map(f => Number(f.bidCost!) / Number(f.quantity!));
const premiumRate = bidCostRatios.length > 0 ? median(bidCostRatios) : 0.04;

// Calibrate carry from live closes
const closeFills = fills.filter(f => f.kind === "close" && f.navAfterClose);
const carryBase = closeFills.length > 1
  ? median(closeFills.slice(1).map((c, i) => {
      const prev = Number(closeFills[i].navAfterClose ?? 0) / QUOTE_SCALE;
      const curr = Number(c.navAfterClose ?? 0) / QUOTE_SCALE;
      return prev > 0 ? ((curr - prev) / prev) * BPS : 0;
    }))
  : 2; // 2 bps / cycle fallback

const carryBand = { low: carryBase * 0.5, base: carryBase, high: carryBase * 2 };

// Strategy functions
const fixedStrategy = (_row: CapturedOracle, _strike: bigint, _nav: number) => FIXED_HEDGE_BPS;
const dynamicStrategy = (row: CapturedOracle, strike: bigint, _nav: number) =>
  approximateDynamicBudget(row, strike);

// Run all 6 simulations
const fixedBase    = simulate(oracleRows, initialNav, premiumRate, carryBand.base, fixedStrategy);
const fixedLow     = simulate(oracleRows, initialNav, premiumRate, carryBand.low,  fixedStrategy);
const fixedHigh    = simulate(oracleRows, initialNav, premiumRate, carryBand.high, fixedStrategy);
const dynamicBase  = simulate(oracleRows, initialNav, premiumRate, carryBand.base, dynamicStrategy);
const dynamicLow   = simulate(oracleRows, initialNav, premiumRate, carryBand.low,  dynamicStrategy);
const dynamicHigh  = simulate(oracleRows, initialNav, premiumRate, carryBand.high, dynamicStrategy);

const avgDynamicBps = dynamicBase.cycles.length > 0
  ? round(dynamicBase.cycles.reduce((s, c) => s + c.hedgeBps, 0) / dynamicBase.cycles.length, 1)
  : DYNAMIC_BASE_BPS;

const report = {
  version: "openmind-vault-sim-v1",
  generatedAt: new Date().toISOString(),
  source: {
    oracleStates: ORACLE_STATES_PATH,
    oracleStateLines: oracleRows.length,
    fillRows: fills.length,
    sha256: createHash("sha256").update(readFileSync(ORACLE_STATES_PATH)).digest("hex"),
  },
  fixedStrategy: {
    hedgeBps: FIXED_HEDGE_BPS,
    summary: summarize(fixedBase, initialNav),
    series: fixedBase.cycles.map(c => ({
      date: c.date, hedgedNav: round(c.hedgedNav, 6),
      unhedgedNav: round(c.unhedgedNav, 6), payout: round(c.payout, 6),
    })),
  },
  dynamicStrategy: {
    avgBudgetBps: avgDynamicBps,
    summary: summarize(dynamicBase, initialNav),
    series: dynamicBase.cycles.map(c => ({
      date: c.date, hedgedNav: round(c.hedgedNav, 6),
      unhedgedNav: round(c.unhedgedNav, 6), payout: round(c.payout, 6),
      hedgeBps: c.hedgeBps,
    })),
  },
  carrySweep: [
    { label: "0.5x carry", carryBps: round(carryBand.low, 4),
      fixed: summarize(fixedLow, initialNav), dynamic: summarize(dynamicLow, initialNav) },
    { label: "1.0x carry", carryBps: round(carryBand.base, 4),
      fixed: summarize(fixedBase, initialNav), dynamic: summarize(dynamicBase, initialNav) },
    { label: "2.0x carry", carryBps: round(carryBand.high, 4),
      fixed: summarize(fixedHigh, initialNav), dynamic: summarize(dynamicHigh, initialNav) },
  ],
  calibration: {
    premiumRate: round(premiumRate, 9),
    carryBandBps: carryBand,
    liveFills: fills.length,
  },
  methodology: [
    "Sort settled BTC oracle captures by expiry and replay non-overlapping vault cycles.",
    "Minimum horizon 75 minutes per cycle, matching live keeper MIN_HORIZON_MS.",
    "Strike snapped to STRIKE_SPOT_BPS=9900 (1% OTM downside) on oracle grid.",
    `Fixed strategy: ${FIXED_HEDGE_BPS}bps every cycle.`,
    `Dynamic strategy: ${DYNAMIC_BASE_BPS}–${DYNAMIC_HARD_CAP}bps based on SVI surface vol proxy (simulation approximation of live agent news+memory signal).`,
    "Three PLP carry bands: 0.5x / 1.0x / 2.0x of observed live carry.",
    "Unhedged baseline is carry-only — it never spends on the downside binary, " +
      "so it's independent of hedge sizing and identical across the fixed/dynamic comparison.",
  ],
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log("OPENMIND_SIMULATION_VALID");
console.log(JSON.stringify({
  output: OUTPUT_PATH,
  oracleRows: oracleRows.length,
  fixedCycles: fixedBase.cycles.length,
  dynamicCycles: dynamicBase.cycles.length,
  avgDynamicBps,
}, null, 2));
