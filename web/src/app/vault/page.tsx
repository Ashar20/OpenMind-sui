"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { coinWithBalance } from "@mysten/sui/transactions";
import { SectionLabel, Stat, Pill } from "@/components/ui";
import {
  DUSDC_TYPE,
  OPENMIND_PACKAGE,
  SUI_EXPLORER_TX,
  VAULT_OBJECT,
  VAULT_SHARE_TYPE,
} from "@/lib/sui-config";

type VaultState = {
  nav: number;
  buffer: number;
  plpBook: number;
  cyclesCompleted: number;
  shareSupply: number;
  paused: boolean;
  openCycle?: {
    budget_spent: number;
    risk_score: number;
  };
};

function BorrowPanel({
  unrealizedValue,
  costBasis,
  riskScore,
}: {
  unrealizedValue: number;
  costBasis: number;
  riskScore: number;
}) {
  const profit = Math.max(0, unrealizedValue - costBasis);
  const capBps = Math.max(0, 5_000 - Math.round(5_000 * (riskScore / 10_000)));
  const maxBorrow = profit * (capBps / 10_000);

  return (
    <div className="panel mt-6 p-6">
      <SectionLabel index="◇" className="mb-4">
        Borrow against open position
      </SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <div className="label mb-1">Unrealized profit</div>
          <div className="mono text-sm text-text tabular-nums">
            {profit.toFixed(4)} dUSDC
          </div>
        </div>
        <div>
          <div className="label mb-1">Risk score</div>
          <div className="mono text-sm text-amber tabular-nums">
            {(riskScore / 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="label mb-1">
            Max borrow <span className="text-faint">({(capBps / 100).toFixed(1)}% LTV)</span>
          </div>
          <div className="mono text-sm text-signal tabular-nums">
            {maxBorrow.toFixed(4)} dUSDC
          </div>
        </div>
      </div>
      <p className="mono mt-4 text-[10px] leading-relaxed text-faint">
        Borrowing creates liquidation risk. If this position&apos;s value falls below
        your loan amount it will be force-closed to repay the loan.
        LTV ceiling is set dynamically by the current AI risk score.
      </p>
      <Pill tone="amber" className="mt-3">
        Capital at risk · not principal-protected
      </Pill>
    </div>
  );
}

export default function VaultPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [status, setStatus] = useState("");
  const [vault, setVault] = useState<VaultState | null>(null);

  useEffect(() => {
    fetch("/api/vault/state")
      .then((r) => (r.ok ? r.json() : null))
      .then(setVault)
      .catch(() => {});
  }, []);

  async function refreshVault() {
    const r = await fetch("/api/vault/state");
    if (r.ok) setVault(await r.json());
  }

  async function handleDeposit() {
    if (!account || !amount) return;
    setStatus("Building deposit…");
    try {
      const amountRaw = BigInt(Math.round(parseFloat(amount) * 1e6));
      const tx = new Transaction();
      const coin = coinWithBalance({ type: DUSDC_TYPE, balance: amountRaw });
      tx.moveCall({
        target: `${OPENMIND_PACKAGE}::openmind_vault::deposit`,
        typeArguments: [DUSDC_TYPE],
        arguments: [tx.object(VAULT_OBJECT), coin],
      });
      setStatus("Awaiting wallet signature…");
      const result = await signAndExecute({ transaction: tx });
      setStatus(`Deposited · ${result.digest.slice(0, 16)}…`);
      await refreshVault();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleWithdraw() {
    if (!account || !amount) return;
    setStatus("Building withdraw…");
    try {
      const sharesRaw = BigInt(Math.round(parseFloat(amount) * 1e6));
      const tx = new Transaction();
      const coin = coinWithBalance({ type: VAULT_SHARE_TYPE, balance: sharesRaw });
      tx.moveCall({
        target: `${OPENMIND_PACKAGE}::openmind_vault::withdraw`,
        typeArguments: [DUSDC_TYPE],
        arguments: [tx.object(VAULT_OBJECT), coin],
      });
      setStatus("Awaiting wallet signature…");
      const result = await signAndExecute({ transaction: tx });
      setStatus(`Withdrawn · ${result.digest.slice(0, 16)}…`);
      await refreshVault();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-8">
      <Link
        href="/"
        className="mono mb-2 inline-block text-[11px] uppercase tracking-[0.12em] text-faint hover:text-signal"
      >
        ← terminal
      </Link>
      <h1 className="serif text-4xl">Vault</h1>
      <p className="mt-2 text-sm text-muted">
        Deposit dUSDC for omDUSDC shares. Adaptive carry — returns vary each cycle, capital at risk.
      </p>
      <Link
        href="/vault/sim"
        className="mono mt-3 inline-block text-[11px] uppercase tracking-[0.12em] text-faint hover:text-signal"
      >
        view simulation →
      </Link>

      {vault && (
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Stat label="NAV" value={`${(vault.nav / 1e6).toFixed(4)}`} sub="dUSDC" tone="signal" />
          <Stat label="Share supply" value={`${(vault.shareSupply / 1e6).toFixed(4)}`} sub="omDUSDC" />
          <Stat label="Buffer" value={`${(vault.buffer / 1e6).toFixed(4)}`} />
          <Stat label="PLP book" value={`${(vault.plpBook / 1e6).toFixed(4)}`} />
        </div>
      )}

      {vault?.openCycle && vault.openCycle.budget_spent > 0 && (
        <BorrowPanel
          unrealizedValue={vault.openCycle.budget_spent / 1e6}
          costBasis={vault.openCycle.budget_spent / 1e6 * 0.97}
          riskScore={vault.openCycle.risk_score}
        />
      )}

      <div className="panel mt-8 p-6">
        <SectionLabel index="◇" className="mb-4">
          {mode === "deposit" ? "Deposit" : "Withdraw"}
        </SectionLabel>

        {!account ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">Connect a Sui wallet to deposit or withdraw.</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            <div className="mono mb-4 flex gap-2 text-[10px] uppercase tracking-[0.12em]">
              <button
                onClick={() => setMode("deposit")}
                className={`border px-3 py-1 ${mode === "deposit" ? "border-signal/50 text-signal" : "border-line text-faint"}`}
              >
                deposit
              </button>
              <button
                onClick={() => setMode("withdraw")}
                className={`border px-3 py-1 ${mode === "withdraw" ? "border-signal/50 text-signal" : "border-line text-faint"}`}
              >
                withdraw
              </button>
            </div>

            <label className="label mb-2 block">
              Amount ({mode === "deposit" ? "dUSDC" : "omDUSDC shares"})
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mono w-full border border-line bg-bg-elev px-3 py-2 text-sm outline-none focus:border-signal/50"
            />

            <button
              onClick={mode === "deposit" ? handleDeposit : handleWithdraw}
              disabled={!amount || vault?.paused}
              className="mono mt-4 border border-signal/50 bg-signal/10 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20 disabled:opacity-50"
            >
              {mode === "deposit" ? "Deposit" : "Withdraw"}
            </button>

            {status && <p className="mono mt-4 text-[11px] text-muted">{status}</p>}
            {status.startsWith("Deposited") || status.startsWith("Withdrawn") ? (
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
    </div>
  );
}
