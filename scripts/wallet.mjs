#!/usr/bin/env node
/**
 * Print the openmind keeper wallet address for funding.
 */
import { execSync } from "node:child_process";

const env = execSync("sui client active-env", { encoding: "utf8" }).trim();
const address = execSync("sui client active-address", { encoding: "utf8" }).trim();

let gas = [];
try {
  gas = JSON.parse(execSync("sui client gas --json", { encoding: "utf8" }));
} catch {
  gas = [];
}

console.log("openmind keeper wallet");
console.log("====================");
console.log(`Network:  ${env}`);
console.log(`Address:  ${address}`);
console.log(`SUI gas:  ${gas.length ? `${gas.length} coin(s)` : "NONE — fund required"}`);
console.log("");
console.log("Fund with testnet SUI (gas):");
console.log("  https://faucet.sui.io/  → select Testnet → paste address");
console.log("");
console.log("Fund with testnet dUSDC (vault deposits):");
console.log("  https://tally.so/r/Xx102L");
console.log("");
console.log("After SUI arrives, deploy:");
console.log("  sui client switch --env testnet");
console.log("  sui client switch --address openmind-keeper");
console.log("  node scripts/deploy.mjs");
