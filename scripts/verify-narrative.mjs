#!/usr/bin/env node
/**
 * Check submission narrative for forbidden guarantee language.
 * Ensures no false promises of returns, principal protection, or fixed APY.
 */
import { readFileSync, existsSync } from "node:fs";

const FORBIDDEN = [
  "guaranteed", "principal protected", "fixed apy",
  "no risk", "risk free", "will return", "always profitable",
  "100%", "certain",
];

const files = [
  "README.md",
  "web/src/app/page.tsx",
  "web/src/app/vault/page.tsx",
].filter(existsSync);
let violations = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8").toLowerCase();
  for (const term of FORBIDDEN) {
    if (content.includes(term)) {
      console.error(`Narrative violation in ${file}: "${term}"`);
      violations++;
    }
  }
}

if (violations > 0) throw new Error(`${violations} narrative violation(s)`);
console.log("OPENMIND_NARRATIVE_VALID");
