#!/usr/bin/env node
/**
 * Deploy openmind to Sui testnet.
 * Publishes package → creates PredictManager → creates OpenMindVault.
 *
 * Usage (after funding active address on testnet):
 *   sui client switch --env testnet
 *   sui client switch --address openmind-keeper
 *   node scripts/deploy.mjs
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PREDICT_PACKAGE =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";
const DUSDC_TYPE =
  "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";

const HEDGE_BPS = 2000;
const STRIKE_BAND_BPS = 3000;
const RESERVE_BPS = 500;

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

const address = sh("sui client active-address");
console.log(`Deployer: ${address}`);

const gas = shJson("sui client gas --json");
if (!gas.length) {
  console.error("\n❌ No testnet SUI on this address.");
  console.error(`   Fund: ${address}`);
  console.error("   Faucet: https://faucet.sui.io/ (select Testnet)");
  console.error("   dUSDC (for vault deposits): https://tally.so/r/Xx102L");
  process.exit(1);
}

console.log(`Gas coins: ${gas.length}`);
console.log("\n--- 1/3 Publish openmind package ---");
const publish = shJson("sui client publish contracts --json");

if (publish.effects?.status?.status !== "success") {
  throw new Error(`Publish failed: ${JSON.stringify(publish.effects?.status)}`);
}

const packageId = publish.objectChanges.find((c) => c.type === "published")?.packageId;
const treasuryCap = publish.objectChanges.find(
  (c) => c.type === "created" && c.objectType?.includes("TreasuryCap")
)?.objectId;

const accessControl = publish.objectChanges.find(
  (c) => c.type === "created" && c.objectType?.includes("AccessControl")
)?.objectId;

if (!packageId || !treasuryCap || !accessControl) {
  throw new Error("Missing packageId, TreasuryCap, or AccessControl in publish output");
}

console.log(`OPENMIND_PACKAGE=${packageId}`);
console.log(`TREASURY_CAP=${treasuryCap}`);
console.log(`ACCESS_CONTROL_OBJECT=${accessControl}`);

console.log("\n--- 2/3 Create PredictManager ---");
const mgrTx = shJson(
  `sui client call --package ${PREDICT_PACKAGE} --module predict --function create_manager --gas-budget 50000000 --json`
);

if (mgrTx.effects?.status?.status !== "success") {
  throw new Error(`create_manager failed: ${JSON.stringify(mgrTx.effects?.status)}`);
}

const managerId =
  mgrTx.events?.find((e) => e.type.includes("PredictManagerCreated"))?.parsedJson?.manager_id
  ?? mgrTx.objectChanges?.find((c) => c.type === "created" && c.objectType?.includes("PredictManager"))?.objectId;

if (!managerId) {
  throw new Error("Could not find PredictManager ID in transaction output");
}

console.log(`VAULT_MANAGER=${managerId}`);

console.log("\n--- 3/3 Create OpenMindVault ---");
const vaultTx = shJson(
  `sui client call --package ${packageId} --module openmind_vault --function create_vault ` +
  `--type-args ${DUSDC_TYPE} ` +
  `--args ${treasuryCap} ${managerId} ${HEDGE_BPS} ${STRIKE_BAND_BPS} ${RESERVE_BPS} ` +
  `--gas-budget 50000000 --json`
);

if (vaultTx.effects?.status?.status !== "success") {
  throw new Error(`create_vault failed: ${JSON.stringify(vaultTx.effects?.status)}`);
}

const vaultId =
  vaultTx.events?.find((e) => e.type.includes("VaultCreated"))?.parsedJson?.vault_id
  ?? vaultTx.objectChanges?.find((c) => c.type === "created" && c.objectType?.includes("OpenMindVault"))?.objectId;

if (!vaultId) {
  throw new Error("Could not find vault ID in transaction output");
}

console.log(`VAULT_OBJECT=${vaultId}`);

// Export keeper private key for env
let keeperKey = "";
try {
  keeperKey = sh(`sui keytool export --address ${address} --json-raw-output`);
} catch {
  console.warn("Could not auto-export SUI_KEEPER_KEY — run: sui keytool export --address", address);
}

const envContent = `# openmind testnet deployment — ${new Date().toISOString()}
OPENMIND_PACKAGE=${packageId}
VAULT_OBJECT=${vaultId}
VAULT_MANAGER=${managerId}
ACCESS_CONTROL_OBJECT=${accessControl}
SUI_KEEPER_ADDRESS=${address}
SUI_KEEPER_KEY=${keeperKey}
DUSDC_TYPE=${DUSDC_TYPE}
PREDICT_PACKAGE=${PREDICT_PACKAGE}
PREDICT_SHARED=0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a
`;

mkdirSync(join(process.cwd(), "deploy"), { recursive: true });
const envPath = join(process.cwd(), "deploy", "testnet.env");
writeFileSync(envPath, envContent);

console.log("\n✅ DEPLOYMENT COMPLETE");
console.log(`   Package:  ${packageId}`);
console.log(`   Vault:    ${vaultId}`);
console.log(`   Manager:  ${managerId}`);
console.log(`   Keeper:   ${address}`);
console.log(`   Env file: ${envPath}`);
console.log("\nNext: fund vault with dUSDC, then run keeper roll:");
console.log("  source deploy/testnet.env && cd keeper && npm run vault:roll");
