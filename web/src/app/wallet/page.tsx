"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SectionLabel, Stat, Pill } from "@/components/ui";
import {
  AGENT_CAP_OBJECT,
  CLOCK_OBJECT,
  OPENMIND_PACKAGE,
  OWNER_CAP_OBJECT,
  SUI_EXPLORER_TX,
} from "@/lib/sui-config";

type AgentCapState = {
  vaultId: string;
  owner: string;
  maxBudget: number;
  spent: number;
  expiresAtMs: number;
  revoked: boolean;
  actionCount: number;
};

export default function WalletPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [cap, setCap] = useState<AgentCapState | null>(null);
  const [status, setStatus] = useState("");

  async function refresh() {
    const r = await fetch("/api/agent-cap/state");
    if (r.ok) setCap(await r.json());
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function handleRevoke() {
    if (!account) return;
    setStatus("Building revoke transaction…");
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${OPENMIND_PACKAGE}::agent_cap::revoke`,
        arguments: [
          tx.object(OWNER_CAP_OBJECT),
          tx.object(AGENT_CAP_OBJECT),
          tx.object(CLOCK_OBJECT),
        ],
      });
      setStatus("Awaiting wallet signature…");
      const result = await signAndExecute({ transaction: tx });
      setStatus(`Revoked · ${result.digest.slice(0, 16)}…`);
      await refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  const expired = cap ? Date.now() > cap.expiresAtMs : false;
  const remaining = cap ? cap.maxBudget - cap.spent : 0;
  const statusTone = cap?.revoked ? "danger" : expired ? "amber" : "signal";
  const statusLabel = cap?.revoked ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE";

  return (
    <div className="mx-auto max-w-[720px] px-5 py-8">
      <Link
        href="/"
        className="mono mb-2 inline-block text-[11px] uppercase tracking-[0.12em] text-faint hover:text-signal"
      >
        ← terminal
      </Link>
      <h1 className="serif text-4xl">Agent Wallet</h1>
      <p className="mt-2 text-sm text-muted">
        openmind&apos;s autonomous authority over this vault. Capped, time-boxed, and
        revocable at any time — every subsequent autonomous action reverts the instant
        you revoke.
      </p>

      {cap && (
        <>
          <div className="mt-8 flex items-center gap-2">
            <Pill tone={statusTone}>{statusLabel}</Pill>
            <span className="mono text-[11px] text-faint">
              {cap.actionCount} action{cap.actionCount === 1 ? "" : "s"} logged on-chain
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat
              label="Budget used"
              value={`${(cap.spent / 1e6).toFixed(4)}`}
              sub={`/ ${(cap.maxBudget / 1e6).toFixed(4)} dUSDC`}
              tone="amber"
            />
            <Stat
              label="Remaining"
              value={`${(remaining / 1e6).toFixed(4)}`}
              sub="dUSDC"
              tone="signal"
            />
          </div>

          <div className="panel mt-4 p-4">
            <div className="label mb-1">Expires</div>
            <div className="mono text-sm text-text">
              {new Date(cap.expiresAtMs).toLocaleString()}
            </div>
          </div>

          <div className="panel mt-8 p-6">
            <SectionLabel index="◇" className="mb-4">
              Owner controls
            </SectionLabel>

            {!account ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted">
                  Connect the owner wallet to revoke the agent&apos;s authority.
                </p>
                <ConnectButton />
              </div>
            ) : cap.revoked ? (
              <p className="mono text-[11px] text-faint">
                Agent authority already revoked. No further autonomous actions can
                execute on this vault until a new AgentCap is granted.
              </p>
            ) : (
              <>
                <button
                  onClick={handleRevoke}
                  className="mono border border-danger/50 bg-danger/10 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-danger transition-colors hover:bg-danger/20"
                >
                  Revoke agent authority — stop all autonomous actions
                </button>
                {status && <p className="mono mt-4 text-[11px] text-muted">{status}</p>}
                {status.startsWith("Revoked") ? (
                  <a
                    href={SUI_EXPLORER_TX(status.split("·")[1]?.trim() ?? "")}
                    target="_blank"
                    rel="noreferrer"
                    className="mono mt-2 inline-block text-[10px] text-signal hover:underline"
                  >
                    view on suiscan ↗
                  </a>
                ) : null}
              </>
            )}
          </div>

          <p className="mono mt-4 text-[10px] leading-relaxed text-faint">
            Every hedge and directional action the agent takes is logged on-chain
            against this budget before any funds move. Revoking does not eliminate
            risk already taken on open positions — it only stops new autonomous
            actions from executing.
          </p>
        </>
      )}
    </div>
  );
}
