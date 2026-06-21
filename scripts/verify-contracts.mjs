#!/usr/bin/env node
/**
 * Verify Move contracts build and tests pass.
 * Reference: https://docs.sui.io/develop/write-move/
 */
import { execSync } from "node:child_process";

const run = (cmd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run("sui move build -e testnet --path contracts");
run("sui move test -e testnet --path contracts");

// Confirm OZ integer math dependency resolves
const { readFileSync } = await import("node:fs");
const toml = readFileSync("contracts/Move.toml", "utf8");
["openzeppelin_math", "openzeppelin_fp_math", "openzeppelin_access", "openzeppelin_utils"].forEach(dep => {
  if (!toml.includes(dep)) throw new Error(`Missing OZ dependency: ${dep}`);
});

console.log("OPENMIND_CONTRACTS_VALID");
