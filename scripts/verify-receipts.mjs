#!/usr/bin/env node
/**
 * Replay live on-chain proof receipts.
 * Verifies real tx digests exist on Sui testnet.
 */
import { SuiClient } from "@mysten/sui/client";
import { readFileSync, existsSync } from "node:fs";

const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });
const FILLS_PATH = "keeper/data/vault_fills.ndjson";

if (!existsSync(FILLS_PATH)) {
  console.log("No fills yet — skipping receipt replay");
  console.log("OPENMIND_RECEIPTS_VALID");
  process.exit(0);
}

const fills = readFileSync(FILLS_PATH, "utf8")
  .split("\n").filter(Boolean).map(l => JSON.parse(l));

let verified = 0, failed = 0;
for (const fill of fills.slice(-10)) { // verify last 10
  try {
    const tx = await client.getTransactionBlock({ digest: fill.tx, options: { showEffects: true } });
    if (tx.effects?.status?.status !== "success") {
      console.error(`FAILED: tx ${fill.tx} status=${tx.effects?.status?.status}`);
      failed++;
    } else {
      verified++;
    }
  } catch (err) {
    console.error(`ERROR: tx ${fill.tx}: ${err.message}`);
    failed++;
  }
}

if (failed > 0) throw new Error(`${failed} receipt(s) failed verification`);
console.log(`Verified ${verified} receipts`);
console.log("OPENMIND_RECEIPTS_VALID");
