#!/usr/bin/env node
/**
 * Verify Predict server and Walrus public endpoints are live.
 * Reference: https://predict-server.testnet.mystenlabs.com
 * Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
 */

const PREDICT_SERVER = "https://predict-server.testnet.mystenlabs.com";
const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

async function check(label, url, method = "GET") {
  const r = await fetch(url, { method, signal: AbortSignal.timeout(10_000) });
  if (!r.ok && r.status !== 405) throw new Error(`${label} returned ${r.status}`);
  console.log(`✓ ${label} — ${r.status}`);
}

await check("Predict server /status", `${PREDICT_SERVER}/status`);
await check("Predict server /oracles", `${PREDICT_SERVER}/oracles`);
await check("Walrus publisher", `${WALRUS_PUBLISHER}/v1/blobs`);

// Verify at least one active BTC oracle exists
const oracles = await (await fetch(`${PREDICT_SERVER}/oracles`)).json();
const active = oracles.filter(o => o.status === "active" && o.underlying_asset === "BTC");
if (!active.length) console.warn("Warning: No active BTC oracles right now");
else console.log(`✓ ${active.length} active BTC oracle(s) found`);

console.log("OPENMIND_PUBLIC_SURFACE_VALID");
