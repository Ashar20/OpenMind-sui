/**
 * Walrus storage — @mysten/walrus SDK only (no HTTP publisher/aggregator).
 *
 * Reference: https://sdk.mystenlabs.com/walrus
 */
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import {
  walrus,
  RetryableWalrusClientError,
  type WalrusClient,
} from "@mysten/walrus";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SUI_RPC } from "./config.ts";

const UPLOAD_RELAY = process.env.WALRUS_UPLOAD_RELAY
  ?? "https://upload-relay.testnet.walrus.space";

const DEFAULT_EPOCHS = Number(process.env.WALRUS_EPOCHS ?? "1");

type WalrusSuiClient = SuiJsonRpcClient & { walrus: WalrusClient };

let walrusSuiClient: WalrusSuiClient | null = null;

function getWalrusClient(): WalrusClient {
  if (!walrusSuiClient) {
    const sui = new SuiJsonRpcClient({ url: SUI_RPC, network: "testnet" });
    walrusSuiClient = sui.$extend(
      walrus({
        uploadRelay: {
          host: UPLOAD_RELAY,
          sendTip: { max: 1_000 },
        },
      }),
    ) as WalrusSuiClient;
  }
  return walrusSuiClient.walrus;
}

function loadSigner(): Ed25519Keypair {
  const raw = process.env.SUI_KEEPER_KEY;
  if (!raw) throw new Error("SUI_KEEPER_KEY not set");
  const { scheme, secretKey } = decodeSuiPrivateKey(raw.trim());
  if (scheme !== "ED25519") throw new Error(`Unsupported key scheme ${scheme}`);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

function resetWalrusClient(): void {
  walrusSuiClient = null;
}

/**
 * Upload a blob via Walrus SDK (writeBlob + upload relay).
 * Throws on failure — no HTTP fallback.
 */
export async function uploadToWalrus(
  data: Uint8Array | string,
  epochs = DEFAULT_EPOCHS,
  _identifier = "blob.json",
): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;

  try {
    const { blobId } = await getWalrusClient().writeBlob({
      blob: bytes,
      epochs,
      deletable: true,
      signer: loadSigner(),
    });
    return blobId;
  } catch (err) {
    if (err instanceof RetryableWalrusClientError) {
      resetWalrusClient();
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Walrus SDK upload failed: ${msg}`);
  }
}

/** Read a blob via Walrus SDK only. */
export async function readFromWalrus(blobId: string): Promise<Uint8Array> {
  try {
    return await getWalrusClient().readBlob({ blobId });
  } catch (err) {
    if (err instanceof RetryableWalrusClientError) {
      resetWalrusClient();
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Walrus SDK read failed: ${msg}`);
  }
}

/** Aggregator URL for display only — reads must use readFromWalrus(). */
export function walrusReadUrl(blobId: string): string {
  const aggregator = process.env.WALRUS_AGGREGATOR
    ?? "https://aggregator.walrus-testnet.walrus.space";
  return `${aggregator}/v1/blobs/${blobId}`;
}
