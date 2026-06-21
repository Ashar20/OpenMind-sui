#!/usr/bin/env node
/**
 * Final submission gate — all artifacts and live evidence present.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "deploy/testnet.env",
  "keeper/data/vault_fills.ndjson",
  "keeper/data/oracle_states.ndjson",
  "web/public/sim/vault_sim.json",
  "README.md",
];

for (const rel of requiredFiles) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) throw new Error(`Missing submission artifact: ${rel}`);
}

const env = readFileSync(join(ROOT, "deploy/testnet.env"), "utf8");
for (const key of ["OPENMIND_PACKAGE", "VAULT_OBJECT", "VAULT_MANAGER", "SUI_KEEPER_ADDRESS"]) {
  if (!new RegExp(`^${key}=.+`, "m").test(env)) {
    throw new Error(`deploy/testnet.env missing ${key}`);
  }
}

const fills = readFileSync(join(ROOT, "keeper/data/vault_fills.ndjson"), "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
if (!fills.some((f) => f.kind === "open")) throw new Error("No open fill receipt");
if (!fills.some((f) => f.kind === "close")) throw new Error("No close fill receipt");

const sim = JSON.parse(readFileSync(join(ROOT, "web/public/sim/vault_sim.json"), "utf8"));
if (!sim.fixedStrategy || !sim.dynamicStrategy) throw new Error("Invalid sim output");
if (sim.carrySweep?.length !== 3) throw new Error("Sim missing carry sweep bands");

const readme = readFileSync(join(ROOT, "README.md"), "utf8");
for (const section of ["Architecture", "Live testnet evidence", "verify:judge"]) {
  if (!readme.includes(section)) throw new Error(`README missing section: ${section}`);
}

console.log("OPENMIND_SUBMISSION_VALID");
