/**
 * Capture ALL settled BTC oracle states for simulation.
 * Calls Predict server, stores as NDJSON for offline sim.
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
 * Reference: https://predict-server.testnet.mystenlabs.com
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { PREDICT_SERVER } from "./config.ts";

const OUT = new URL("../data/oracle_states.ndjson", import.meta.url).pathname;
const CONCURRENCY = 4;
const CAPTURE_LIMIT = Number(process.env.SIM_CAPTURE_LIMIT ?? "0");

mkdirSync(dirname(OUT), { recursive: true });

const seen = new Set<string>();
if (existsSync(OUT)) {
  for (const line of readFileSync(OUT, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { seen.add(JSON.parse(line).oracle.oracle_id); } catch {}
  }
}

const allOracles = await (await fetch(`${PREDICT_SERVER}/oracles`)).json() as any[];
let oracles = allOracles.filter(
  (o: any) => o.status === "settled" && o.underlying_asset === "BTC" && !seen.has(o.oracle_id)
);
oracles.sort((a: any, b: any) => Number(b.expiry) - Number(a.expiry));
if (CAPTURE_LIMIT > 0) oracles = oracles.slice(0, CAPTURE_LIMIT);
console.log(`settling oracles to capture: ${oracles.length} (have ${seen.size}, limit=${CAPTURE_LIMIT || "none"})`);

let done = 0, failed = 0;
async function captureOne(oracleId: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${PREDICT_SERVER}/oracles/${oracleId}/state`);
      if (!res.ok) throw new Error(`${res.status}`);
      appendFileSync(OUT, JSON.stringify(await res.json()) + "\n");
      return;
    } catch (err) {
      if (attempt === 3) { failed++; console.error(`FAILED ${oracleId}`); return; }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

const queue = [...oracles];
async function worker() {
  while (queue.length > 0) {
    const o = queue.shift()!;
    await captureOne(o.oracle_id);
    done++;
    if (done % 100 === 0) console.log(`progress ${done}/${oracles.length}`);
    await new Promise(r => setTimeout(r, 60));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`CAPTURE_DONE captured=${done} failed=${failed}`);
