/**
 * Load deploy + agent env before keeper modules read process.env.
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

config({ path: resolve(ROOT, "deploy/testnet.env") });
config({ path: resolve(ROOT, "agent/.env") });

export const REPO_ROOT = ROOT;
