#!/usr/bin/env node
/**
 * Run and validate the vault simulation.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEEPER = join(ROOT, "keeper");
const ORACLE_STATES = join(KEEPER, "data/oracle_states.ndjson");
const SIM_OUTPUT = join(ROOT, "web/public/sim/vault_sim.json");

mkdirSync(join(KEEPER, "data"), { recursive: true });
mkdirSync(dirname(SIM_OUTPUT), { recursive: true });

// Capture oracle states if not present
if (!existsSync(ORACLE_STATES)) {
  console.log("Capturing oracle states...");
  execSync("npm run sim:capture", {
    stdio: "inherit",
    cwd: KEEPER,
    env: { ...process.env, SIM_CAPTURE_LIMIT: process.env.SIM_CAPTURE_LIMIT ?? "500" },
  });
}

// Run simulation
execSync("npm run sim:vault", { stdio: "inherit", cwd: KEEPER });

// Validate output
const sim = JSON.parse(readFileSync(SIM_OUTPUT, "utf8"));
if (!sim.fixedStrategy) throw new Error("Missing fixedStrategy in sim output");
if (!sim.dynamicStrategy) throw new Error("Missing dynamicStrategy in sim output");
if (sim.carrySweep?.length !== 3) throw new Error("Expected 3 carry sweep bands");
if (sim.fixedStrategy.summary.cycles < 10) throw new Error("Too few sim cycles — check oracle capture");

console.log(`Sim: ${sim.fixedStrategy.summary.cycles} cycles`);
console.log(`Fixed ending NAV: ${sim.fixedStrategy.summary.endingHedgedNav}`);
console.log(`Dynamic ending NAV: ${sim.dynamicStrategy.summary.endingHedgedNav}`);
console.log(`Dynamic avg budget: ${sim.dynamicStrategy.avgBudgetBps}bps`);
console.log("OPENMIND_SIMULATION_VALID");
