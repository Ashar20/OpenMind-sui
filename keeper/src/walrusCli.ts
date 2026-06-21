/**
 * CLI entry for Python agent — Walrus SDK upload/read only.
 * Usage:
 *   echo '...' | npm run walrus:upload -- reasoning.json
 *   npm run walrus:read -- <blobId>
 */
import "./loadEnv.ts";
import { readFromWalrus, uploadToWalrus } from "./walrus.ts";

async function readStdin(): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "upload") {
    const identifier = process.argv[3] ?? "blob.json";
    const data = await readStdin();
    const blobId = await uploadToWalrus(data, undefined, identifier);
    process.stdout.write(blobId);
    return;
  }
  if (cmd === "read") {
    const blobId = process.argv[3];
    if (!blobId) throw new Error("blobId required");
    const bytes = await readFromWalrus(blobId);
    process.stdout.write(Buffer.from(bytes));
    return;
  }
  throw new Error(`Unknown command: ${cmd ?? "(none)"}. Use upload|read`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
