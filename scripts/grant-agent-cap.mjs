#!/usr/bin/env node
/**
 * Grant (or re-grant) the openmind AgentCap.
 *
 * The AgentCap is time-boxed (see contracts/sources/agent_cap.move) — once
 * `expires_at_ms` passes, every open_cycle/open_directional call reverts with
 * EExpired (abort code 3) until a fresh cap is granted. There is no "extend"
 * entry point on purpose (owner must consciously redelegate), so recovering
 * from expiry means calling agent_cap::grant() again for a new shared
 * AgentCap + OwnerCap pair and pointing the keeper/web config at it.
 *
 * Usage:
 *   sui client switch --env testnet
 *   sui client switch --address openmind-keeper
 *   node scripts/grant-agent-cap.mjs [maxBudget] [durationMs]
 *
 * Defaults: 500 dUSDC budget, 14-day expiry window.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OPENMIND_PACKAGE =
  process.env.OPENMIND_PACKAGE ??
  "0x3538ab0c8317477f23d1c53603a2d402bccf2f53fee8e52f9af1670bc6f3c17a";
const VAULT_OBJECT =
  process.env.VAULT_OBJECT ??
  "0x5c7f075330ca60e6b3d68354baea80a624da25a6dbc771537994a00be9ca3f08";

const MAX_BUDGET = process.argv[2] ?? "500000000"; // 500 dUSDC (6 decimals)
const DURATION_MS = process.argv[3] ?? "1209600000"; // 14 days

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function shJson(cmd) {
  return JSON.parse(sh(cmd));
}

const env = sh("sui client active-env");
if (env !== "testnet") {
  throw new Error("Run: sui client switch --env testnet");
}

const sender = sh("sui client active-address");
console.log(`Granting AgentCap as: ${sender}`);
console.log(`  vault:        ${VAULT_OBJECT}`);
console.log(`  max_budget:   ${MAX_BUDGET}`);
console.log(`  duration_ms:  ${DURATION_MS}`);

const result = shJson(
  `sui client ptb ` +
    `--move-call ${OPENMIND_PACKAGE}::agent_cap::grant @${VAULT_OBJECT} ${MAX_BUDGET} ${DURATION_MS} @0x6 ` +
    `--assign cap_result ` +
    `--move-call sui::transfer::public_share_object "<${OPENMIND_PACKAGE}::agent_cap::AgentCap>" cap_result.1 ` +
    `--transfer-objects "[cap_result.0]" @${sender} ` +
    `--gas-budget 50000000 --json`
);

if (result.effects?.status?.status !== "success") {
  throw new Error(`grant failed: ${JSON.stringify(result.effects?.status)}`);
}

const agentCapId = result.objectChanges.find(
  (c) => c.type === "created" && c.objectType?.endsWith("agent_cap::AgentCap")
)?.objectId;
const ownerCapId = result.objectChanges.find(
  (c) => c.type === "created" && c.objectType?.endsWith("agent_cap::OwnerCap")
)?.objectId;

if (!agentCapId || !ownerCapId) {
  throw new Error("Could not find AgentCap/OwnerCap IDs in transaction output");
}

const granted = result.events?.find((e) => e.type.endsWith("AgentCapGranted"))?.parsedJson;

console.log("\nAGENT_CAP_OBJECT=" + agentCapId);
console.log("OWNER_CAP_OBJECT=" + ownerCapId);
if (granted) {
  console.log(`expires_at_ms=${granted.expires_at_ms} (${new Date(Number(granted.expires_at_ms)).toISOString()})`);
}

for (const envPath of ["deploy/testnet.env", "deploy/all-secrets.env"]) {
  const full = join(process.cwd(), envPath);
  if (!existsSync(full)) continue;
  let content = readFileSync(full, "utf8");
  content = content.replace(/^AGENT_CAP_OBJECT=.*$/m, `AGENT_CAP_OBJECT=${agentCapId}`);
  content = content.replace(/^OWNER_CAP_OBJECT=.*$/m, `OWNER_CAP_OBJECT=${ownerCapId}`);
  content = content.replace(/^NEXT_PUBLIC_AGENT_CAP_OBJECT=.*$/m, `NEXT_PUBLIC_AGENT_CAP_OBJECT=${agentCapId}`);
  content = content.replace(/^NEXT_PUBLIC_OWNER_CAP_OBJECT=.*$/m, `NEXT_PUBLIC_OWNER_CAP_OBJECT=${ownerCapId}`);
  writeFileSync(full, content);
  console.log(`Updated ${envPath}`);
}

console.log(
  "\nDon't forget to update the fallback defaults in keeper/src/config.ts and " +
    "web/src/lib/sui-config.ts (and web/.env.local) if this cap should become the new default."
);
