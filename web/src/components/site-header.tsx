"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Terminal" },
  { href: "/pitch", label: "Pitch" },
  { href: "/vault", label: "Vault" },
  { href: "/vault/sim", label: "Sim" },
  { href: "/brain", label: "Brain" },
  { href: "/proof", label: "Proof" },
  { href: "/wallet", label: "Wallet" },
];

type Health = {
  ok: boolean;
  network: string;
  cycles_completed: number;
  fills: number;
};

export function SiteHeader() {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "offline">("loading");

  useEffect(() => {
    let alive = true;
    const poll = () =>
      fetch("/api/health")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((h: Health) => alive && (setHealth(h), setStatus("ok")))
        .catch(() => alive && (setHealth(null), setStatus("offline")));
    poll();
    const t = setInterval(poll, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="mono flex size-7 shrink-0 items-center justify-center border border-signal/40 bg-signal/10 text-[10px] text-signal">
              om
            </span>
            <span className="serif text-xl leading-none tracking-tight">openmind</span>
            <span className="label hidden text-faint sm:inline">/ DeepBook Predict vault</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "mono px-3 py-1 text-[11px] uppercase tracking-[0.12em] transition-colors",
                    active ? "text-signal" : "text-faint hover:text-muted",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="mono flex items-center gap-2 border border-line px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]">
            {(() => {
              const tone =
                status === "offline" ? "text-danger" : health?.ok ? "text-signal" : "text-amber";
              const dot =
                status === "offline" ? "bg-danger" : health?.ok ? "bg-signal" : "bg-amber";
              const label =
                status === "loading"
                  ? "SUI …"
                  : status === "offline"
                    ? "VAULT OFFLINE"
                    : "SUI TESTNET";
              return (
                <>
                  <span className={cn("signal-dot inline-block size-1.5 rounded-full", dot)} />
                  <span className={tone}>{label}</span>
                </>
              );
            })()}
            {health && (
              <span className="text-faint">
                · {health.cycles_completed} cycles · {health.fills} receipts
              </span>
            )}
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
