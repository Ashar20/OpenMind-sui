"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  Network,
  Link2,
  Boxes,
  Database,
  Wallet,
  MessageSquare,
  Sparkles,
  GitBranch,
  Lock,
  Cpu,
  Layers,
  Check,
  KeyRound,
  Brain,
} from "lucide-react";

const OPENMIND_PACKAGE = "0x3538ab0c8317477f23d1c53603a2d402bccf2f53fee8e52f9af1670bc6f3c17a";

const SLIDES = [
  "Title",
  "Problem",
  "Solution",
  "Four tracks",
  "Contracts",
  "Standout",
  "Architecture",
  "Demo",
  "Memory",
  "Close",
] as const;

export function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const isScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    const idx = Math.max(0, Math.min(SLIDES.length - 1, i));
    const el = slideRefs.current[idx];
    if (!el) return;
    isScrolling.current = true;
    setCurrent(idx);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${idx + 1}`);
    }
    el.scrollIntoView({ behavior });
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false;
    }, behavior === "smooth" ? 700 : 100);
  }, []);

  useEffect(() => {
    const n = parseInt(window.location.hash.slice(1), 10);
    if (!(Number.isFinite(n) && n >= 1 && n <= SLIDES.length)) return;
    const idx = n - 1;
    const t = setTimeout(() => {
      const c = containerRef.current;
      const el = slideRefs.current[idx];
      if (!c || !el) return;
      const prev = c.style.scrollBehavior;
      c.style.scrollBehavior = "auto";
      isScrolling.current = true;
      el.scrollIntoView();
      setCurrent(idx);
      history.replaceState(null, "", `#${idx + 1}`);
      requestAnimationFrame(() => {
        c.style.scrollBehavior = prev;
        isScrolling.current = false;
      });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(current + 1);
      } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = slideRefs.current.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setCurrent(idx);
          }
        }
      },
      { root, threshold: [0.5, 0.75] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const slides = [
    <TitleSlide key="t" onStart={() => goTo(1)} />,
    <ProblemSlide key="p" />,
    <SolutionSlide key="s" />,
    <TracksSlide key="tr" />,
    <ContractsSlide key="co" />,
    <StandoutSlide key="so" />,
    <ArchitectureSlide key="ar" />,
    <DemoSlide key="d" />,
    <MemorySlide key="m" />,
    <CloseSlide key="c" />,
  ];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-text">
      <Link
        href="/"
        className="fixed left-5 top-5 z-50 inline-flex items-center gap-2 rounded-full border border-line bg-bg/70 px-3 py-1.5 font-mono text-xs text-muted backdrop-blur-xl transition hover:border-signal/40 hover:text-text"
      >
        <ArrowLeft size={13} /> Back to terminal
      </Link>

      <div className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-2.5 md:flex">
        {SLIDES.map((label, i) => (
          <button
            key={label}
            aria-label={`Go to slide ${i + 1}: ${label}`}
            onClick={() => goTo(i)}
            className="group relative flex items-center justify-end"
          >
            <span className="mr-2 whitespace-nowrap rounded-full bg-bg/80 px-2 py-0.5 font-mono text-[10px] text-muted opacity-0 backdrop-blur transition group-hover:opacity-100">
              {label}
            </span>
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === current ? "h-5 w-1.5 bg-signal" : "h-1.5 w-1.5 bg-faint hover:bg-muted"
              }`}
            />
          </button>
        ))}
      </div>

      {current > 0 && (
        <button
          aria-label="Previous slide"
          onClick={() => goTo(current - 1)}
          className="fixed bottom-6 right-20 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bg/70 text-muted backdrop-blur-xl transition hover:border-signal/40 hover:text-text"
        >
          <ArrowLeft size={16} />
        </button>
      )}
      {current < SLIDES.length - 1 && (
        <button
          aria-label="Next slide"
          onClick={() => goTo(current + 1)}
          className="fixed bottom-6 right-8 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-signal/30 bg-signal/10 text-signal backdrop-blur-xl transition hover:bg-signal/20"
        >
          <ArrowRight size={16} />
        </button>
      )}

      <div className="fixed bottom-7 left-5 z-50 flex items-center gap-3 font-mono text-xs text-faint">
        <span>
          <span className="text-muted">{String(current + 1).padStart(2, "0")}</span> /{" "}
          {String(SLIDES.length).padStart(2, "0")}
        </span>
        <span className="hidden sm:inline">↑↓ / ← → to navigate</span>
      </div>

      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-signal transition-all duration-300"
          style={{ width: `${((current + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      <div
        ref={containerRef}
        className="h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <section
            key={SLIDES[i]}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="flex h-dvh snap-start items-center justify-center overflow-hidden px-6 py-16 sm:px-10"
          >
            <div className="mx-auto w-full max-w-[1180px]">{slide}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Shared atoms                                                       */
/* ----------------------------------------------------------------- */

function Label({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className="mono text-xs uppercase tracking-[0.25em] text-signal">
      {index} — {children}
    </p>
  );
}

function Card({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 backdrop-blur-xl transition-colors ${
        accent
          ? "border-signal/25 bg-signal/[0.04] hover:border-signal/40"
          : "border-line bg-bg-elev/60 hover:border-line-bright"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function GlowBlob({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-signal opacity-[0.10] blur-[150px] ${className}`}
    />
  );
}

function Brand({ big = false }: { big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`mono flex shrink-0 items-center justify-center border border-signal/40 bg-signal/10 text-signal ${
          big ? "size-12 text-base" : "size-7 text-[10px]"
        }`}
      >
        om
      </span>
      <span className={`serif tracking-tight ${big ? "text-3xl" : "text-xl"}`}>openmind</span>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Slides                                                             */
/* ----------------------------------------------------------------- */

function TitleSlide({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative text-center">
      <GlowBlob className="left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative flex flex-col items-center">
        <div className="scale-125">
          <Brand big />
        </div>
        <h1 className="serif mt-8 text-5xl font-medium leading-[1.04] tracking-tight text-text sm:text-6xl">
          The hedge that thinks for itself,
          <br className="hidden sm:block" /> <span className="text-signal">on-chain</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg">
          The first prediction-market vault where the hedge policy thinks for itself,
          remembers every cycle, and{" "}
          <span className="text-text">proves every decision on-chain before the market settles</span>.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {["DeepBook Predict", "Walrus + MemWal", "OpenZeppelin", "Agentic Web · sub-track 2", "Sui Overflow 2026"].map(
            (p) => (
              <span
                key={p}
                className="mono rounded-full border border-line-bright bg-bg-elev px-3.5 py-1.5 text-xs text-muted"
              >
                {p}
              </span>
            ),
          )}
        </div>
        <button
          onClick={onStart}
          className="mt-12 inline-flex animate-bounce flex-col items-center gap-1 text-faint transition hover:text-signal"
          aria-label="Start"
        >
          <span className="mono text-[10px] uppercase tracking-widest">Pitch</span>
          <ChevronDown size={20} />
        </button>
      </div>
    </div>
  );
}

function ProblemSlide() {
  const pains = [
    { icon: EyeOff, title: "Fixed or opaque hedging", desc: "Vaults either hedge a naive fixed percentage every cycle, or claim an AI sizes it with no way to check." },
    { icon: ShieldCheck, title: "Unverifiable reasoning", desc: "No way to prove a decision was made before the outcome was known, not rationalized after the fact." },
    { icon: Lock, title: "No kill switch", desc: "If an autonomous agent starts acting badly, there's usually no on-chain way to stop it — only a backend flag someone has to trust." },
  ];
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
      <div>
        <Label index="01">The problem</Label>
        <h2 className="serif mt-4 text-4xl font-medium leading-[1.1] tracking-tight text-text sm:text-5xl">
          Most AI-managed vaults are <span className="text-faint">black boxes</span>.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
          You deposit, the strategy runs, and you take it on faith that the hedge budget
          was sized correctly and the reasoning wasn't invented after the market already moved.
        </p>
        <div className="mt-8 space-y-4">
          {pains.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3.5">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-bg-elev">
                <Icon size={17} className="text-muted" />
              </span>
              <div>
                <p className="serif text-base text-text">{title}</p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Card className="relative overflow-hidden">
        <p className="mono text-xs uppercase tracking-widest text-faint">Typical hedge vault</p>
        <div className="mt-5 flex items-center justify-center gap-3 py-6 font-mono text-sm">
          <span className="border border-line bg-bg-elev px-4 py-3 text-muted">depositor</span>
          <ArrowRight size={16} className="text-faint" />
          <span className="border border-line bg-bg-elev px-4 py-3 text-text">strategy</span>
          <ArrowRight size={16} className="text-faint" />
          <span className="border border-line-bright bg-bg-elev px-4 py-3 text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Lock size={13} /> trust us
            </span>
          </span>
        </div>
        <p className="mt-4 text-center text-sm italic text-muted">
          The budget is sized correctly — trust us.
        </p>
      </Card>
    </div>
  );
}

function SolutionSlide() {
  const stats = [
    { icon: GitBranch, n: "6", label: "Move modules, one vault" },
    { icon: ShieldCheck, n: "SHA-256", label: "reasoning anchored before settlement" },
    { icon: Wallet, n: "agent_cap", label: "revocable, budget-capped autonomy" },
  ];
  return (
    <div className="text-center">
      <Label index="02">The solution</Label>
      <h2 className="serif mx-auto mt-4 max-w-4xl text-4xl font-medium leading-[1.1] tracking-tight text-text sm:text-5xl">
        Make the hedge policy <span className="text-signal">show its work</span>.
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted">
        openmind recalls past cycles from persistent memory, reads real news, scores a dynamic
        hedge budget, anchors a hash of its full reasoning on Sui <span className="text-text">before</span>{" "}
        the market settles, then opens the hedge on DeepBook Predict — gated by an on-chain budget
        cap the owner can revoke at any time.
      </p>
      <div className="mx-auto mt-10 max-w-3xl border border-signal/20 bg-signal/[0.03] px-6 py-5">
        <p className="serif text-lg text-text sm:text-xl">
          "Most vaults ask you to trust the strategy.{" "}
          <span className="text-signal">openmind lets you verify it.</span>"
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, n, label }) => (
          <Card key={label} accent className="text-left">
            <Icon size={20} className="text-signal" />
            <p className="serif mt-3 text-3xl text-text">{n}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TracksSlide() {
  const tracks = [
    {
      icon: Fingerprint,
      title: "DeepBook Predict",
      sub: "adaptive carry vault",
      body: "supply + mint + get_trade_amounts + redeem_permissionless + withdraw against the live testnet Predict contract, with a dynamic AI hedge ratio instead of a fixed budget.",
    },
    {
      icon: Database,
      title: "Walrus",
      sub: "reasoning blobs + MemWal",
      body: "every cycle's full reasoning JSON is stored on Walrus and its hash anchored on Sui before settlement. MemWal gives the agent persistent memory it recalls before every decision.",
    },
    {
      icon: KeyRound,
      title: "OpenZeppelin",
      sub: "audited math + access control",
      body: "openzeppelin_math::mul_div and UD30x9 fixed-point for all NAV/share math, openzeppelin_access::access_control for keeper/admin roles.",
    },
    {
      icon: Wallet,
      title: "Agentic Web",
      sub: "sub-track 2 · revocable agent wallet",
      body: "a separate AgentCap/OwnerCap pair gates every autonomous action with a hard on-chain budget ceiling, expiry, and instant owner-triggered revocation.",
    },
  ];
  return (
    <div>
      <div className="text-center">
        <Label index="03">Four tracks, one codebase</Label>
        <h2 className="serif mt-4 text-4xl font-medium tracking-tight text-text sm:text-5xl">
          Not four demos bolted together
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted">
          The same vault, the same agent, the same proof trail satisfies all four at once.
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {tracks.map(({ icon: Icon, title, sub, body }) => (
          <Card key={title}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center border border-line bg-bg-elev">
                <Icon size={18} className="text-text" />
              </span>
              <div>
                <p className="serif text-lg text-text">{title}</p>
                <p className="mono text-xs text-signal">{sub}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContractsSlide() {
  const modules = [
    { name: "predict_adapter", purpose: "Isolates every DeepBook Predict call behind one module" },
    { name: "openmind_vault", purpose: "Pooled vault: deposit/withdraw, hedge cycle, directional leg" },
    { name: "reasoning_anchor", purpose: "Pre-settlement proof — SHA256 hash committed before the outcome" },
    { name: "agent_cap", purpose: "Revocable, budget-capped autonomous agent wallet" },
    { name: "risk_capped_borrow", purpose: "Borrow against an open position; LTV shrinks with AI risk score" },
    { name: "openmind_access", purpose: "OpenZeppelin access_control for keeper / admin roles" },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label index="04">Contracts — Move on Sui</Label>
          <h2 className="serif mt-3 text-4xl font-medium tracking-tight text-text sm:text-5xl">
            Six modules, one vault
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted">
          Every module isolated by concern — the upstream DeepBook Predict surface never leaks
          past the adapter.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-0">
          <div className="grid grid-cols-[1.1fr_1.6fr] gap-2 border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-faint">
            <span>Module</span>
            <span>Purpose</span>
          </div>
          <div className="divide-y divide-line">
            {modules.map((m) => (
              <div
                key={m.name}
                className="grid grid-cols-[1.1fr_1.6fr] items-center gap-2 px-5 py-3 transition-colors hover:bg-bg-elev/60"
              >
                <span className="mono text-xs text-signal">{m.name}</span>
                <span className="text-xs text-muted">{m.purpose}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {[
            { icon: Boxes, title: "Policy enforced on-chain", desc: "Strike band, budget cap, and surface-ask ceiling are checked in the contract, not the keeper." },
            { icon: Link2, title: "Sweep, never fabricate", desc: "Directional pool only grows from a swept share of realized hedge ITM payouts — never user principal." },
            { icon: KeyRound, title: "Layered access", desc: "Keeper role via access_control, plus agent_cap's independent budget/expiry/revocation gate." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} accent>
              <Icon size={18} className="text-signal" />
              <p className="serif mt-2.5 text-base text-text">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StandoutSlide() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Pre-settlement proof anchoring",
      desc: "The reasoning hash hits Sui before the hedge opens — anyone can re-hash the Walrus blob later and confirm it predates the outcome.",
    },
    {
      icon: Lock,
      title: "Real on-chain revocation",
      desc: "agent_cap::revoke flips a flag the contract itself checks — every subsequent autonomous call reverts with ERevoked, not a backend toggle.",
    },
    {
      icon: Brain,
      title: "MemWal persistent memory",
      desc: "Every cycle's outcome is remembered and recalled before the next decision — verified live, recall counts compound cycle over cycle.",
    },
    {
      icon: Network,
      title: "Backtested on real data",
      desc: "953 historical settled BTC oracles replayed, fixed vs. dynamic budget — and a real payout-accounting bug was found and fixed mid-build.",
    },
  ];
  return (
    <div>
      <div className="text-center">
        <Label index="05">What makes it stand out</Label>
        <h2 className="serif mt-4 text-4xl font-medium tracking-tight text-text sm:text-5xl">
          Proof, not promises
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="flex gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-signal/25 bg-signal/[0.06]">
              <Icon size={20} className="text-signal" />
            </span>
            <div>
              <p className="serif text-lg text-text">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ArchitectureSlide() {
  return (
    <div>
      <div className="text-center">
        <Label index="06">How it runs</Label>
        <h2 className="serif mt-4 text-4xl font-medium tracking-tight text-text sm:text-5xl">
          Four layers, one cycle
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted">
          Python agent reasons, TypeScript keeper executes, Move contracts enforce policy,
          Next.js shows the whole thing live.
        </p>
      </div>

      <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[1.3fr_auto_1fr]">
        <Card accent>
          <div className="flex items-center gap-2.5">
            <Cpu size={18} className="text-signal" />
            <p className="serif text-base text-text">agent/ (Python)</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {[
              "MemWal recall → news + GraphRAG → dynamic budget scorer",
              "Walrus upload + Sui reasoning anchor, before opening anything",
              "Kelly-sized directional leg with a hard minimum-edge gate",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-signal" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col items-center justify-center gap-2 px-2 text-faint">
          <Layers size={18} className="text-signal" />
          <div className="hidden h-full w-px bg-gradient-to-b from-transparent via-signal/40 to-transparent lg:block" />
          <span className="mono text-[10px] uppercase tracking-widest">drives</span>
        </div>

        <div className="grid gap-4">
          <Card>
            <p className="mono text-xs text-faint">keeper/ (TypeScript)</p>
            <p className="serif mt-1 text-base text-text">open / close / roll</p>
            <p className="mt-1 text-xs text-muted">agent_cap-gated on-chain execution</p>
          </Card>
          <Card accent>
            <p className="mono text-xs text-signal">contracts/ (Move)</p>
            <p className="serif mt-1 text-base text-text">Policy enforced on-chain</p>
            <p className="mt-1 text-xs text-muted">budget cap, strike band, revocation</p>
          </Card>
          <Card>
            <p className="mono text-xs text-faint">web/ (Next.js)</p>
            <p className="serif mt-1 text-base text-text">/brain · /proof · /wallet</p>
            <p className="mt-1 text-xs text-muted">watch a cycle run live, on camera</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DemoSlide() {
  const steps = [
    { n: "01", icon: Wallet, title: "Connect", desc: "Connect a Sui wallet — testnet, no setup beyond that." },
    { n: "02", icon: Database, title: "Deposit", desc: "Deposit dUSDC into the vault, receive omDUSDC shares." },
    { n: "03", icon: MessageSquare, title: "Run cycle", desc: "Click \"Run cycle\" on /brain and watch the agent reason, anchor, and open the hedge live." },
    { n: "04", icon: Network, title: "Verify", desc: "Check /proof for the anchor, /wallet for the live AgentCap, or revoke it on camera." },
  ];
  return (
    <div>
      <div className="text-center">
        <Label index="07">See it work</Label>
        <h2 className="serif mt-4 text-4xl font-medium tracking-tight text-text sm:text-5xl">
          Wallet to live cycle in 4 steps
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ n, icon: Icon, title, desc }) => (
          <Card key={n} className="relative">
            <span className="mono text-sm text-signal">{n}</span>
            <Icon size={22} className="mt-4 text-text" />
            <p className="serif mt-3 text-base text-text">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center justify-between gap-4 border border-signal/20 bg-signal/[0.03] px-6 py-5 sm:flex-row">
        <div className="mono flex items-center gap-2.5 text-xs text-muted">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
          </span>
          Live on Sui testnet
        </div>
        <Link
          href="/brain"
          className="mono inline-flex items-center gap-1.5 border border-signal/50 bg-signal/10 px-5 py-2.5 text-sm text-signal transition hover:bg-signal/20"
        >
          Try it live <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

function MemorySlide() {
  return (
    <div>
      <div className="text-center">
        <Label index="08">How it remembers</Label>
        <h2 className="serif mt-4 text-4xl font-medium tracking-tight text-text sm:text-5xl">
          MemWal: recall before deciding
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted">
          Persistent, verifiable agent memory on Walrus — not a private database the agent
          alone can see.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-signal" />
            <p className="serif text-base text-text">Every cycle, in order</p>
          </div>
          <div className="mt-5 space-y-2.5">
            {[
              "recall — pull relevant past cycles before deciding anything",
              "analyze — extract structured facts from fresh news",
              "ask — synthesize a historical-budget answer from memory",
              "remember — write this cycle's outcome for the next one to recall",
            ].map((t, i) => (
              <div key={t} className="flex items-start gap-2.5 text-sm text-muted">
                <span className="mono text-xs text-signal">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </div>
            ))}
          </div>
        </Card>

        <Card accent>
          <div className="flex items-center gap-2.5">
            <Network size={18} className="text-signal" />
            <p className="serif text-base text-text">Verified live, not assumed</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Each new cycle's reasoning blob records exactly how many past cycles it recalled —
            and the count compounds: 1 → 3 → 5 across consecutive live runs this build, with the
            actual recalled text visible on <span className="text-text">/brain</span>.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            When the production relayer went down mid-build, the agent was switched to the
            staging relayer and verified end-to-end before continuing — memory that's actually
            depended on, not decorative.
          </p>
        </Card>
      </div>

      <p className="mono mt-8 flex items-center justify-center gap-2 text-center text-xs text-faint">
        <Brain size={13} className="text-signal" /> See the real recalled memory on /brain for any
        cycle.
      </p>
    </div>
  );
}

function CloseSlide() {
  return (
    <div className="relative text-center">
      <GlowBlob className="left-1/2 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2" />
      <div className="relative">
        <div className="flex justify-center scale-110">
          <Brand big />
        </div>
        <h2 className="serif mx-auto mt-7 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight text-text sm:text-6xl">
          Watch the hedge <span className="text-signal">think</span>, on-chain.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted">
          Connect a wallet, deposit, and run a cycle live — every step anchored, every action
          capped and revocable.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/brain"
            className="mono inline-flex items-center gap-1.5 border border-signal/50 bg-signal/10 px-6 py-3 text-sm text-signal transition hover:bg-signal/20"
          >
            Run a live cycle <ArrowRight size={16} />
          </Link>
          <Link
            href="/proof"
            className="mono inline-flex items-center gap-1.5 border border-line-bright px-6 py-3 text-sm text-muted transition hover:border-signal/50 hover:text-signal"
          >
            <GitBranch size={16} /> Verify a proof
          </Link>
        </div>
        <div className="mx-auto mt-12 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="border border-line bg-bg-elev px-4 py-3 text-left">
            <p className="mono text-[11px] uppercase tracking-widest text-faint">
              openmind package · Sui testnet
            </p>
            <p className="mt-1 break-all font-mono text-xs text-muted">{OPENMIND_PACKAGE}</p>
          </div>
          <div className="border border-line bg-bg-elev px-4 py-3 text-left">
            <p className="mono text-[11px] uppercase tracking-widest text-faint">Tracks</p>
            <p className="mt-1 font-mono text-xs text-muted">
              DeepBook Predict · Walrus · OpenZeppelin · Agentic Web
            </p>
          </div>
        </div>
        <div className="mono mt-8 flex items-center justify-center gap-2.5 text-xs text-faint">
          <Sparkles size={13} className="text-signal" /> Sui Overflow 2026
        </div>
      </div>
    </div>
  );
}
