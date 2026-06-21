"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionLabel, Stat, Pill } from "@/components/ui";

type SimSeries = {
  date: string;
  hedgedNav: number;
  unhedgedNav: number;
  payout: number;
  hedgeBps?: number;
};

type StrategySummary = {
  cycles: number;
  spanStart: string;
  spanEnd: string;
  initialNav: number;
  endingHedgedNav: number;
  endingUnhedgedNav: number;
  totalHedgeSpendBps: number;
  payoutCount: number;
  hitRate: number;
  totalPayouts: number;
  netCostBps: number;
  maxDrawdownHedgedBps: number;
  maxDrawdownUnhedgedBps: number;
};

type SimStrategy = {
  hedgeBps?: number;
  avgBudgetBps?: number;
  summary: StrategySummary;
  series: SimSeries[];
};

type CarrySweepEntry = {
  label: string;
  carryBps: number;
  fixed: StrategySummary;
  dynamic: StrategySummary;
};

type VaultSim = {
  version: string;
  generatedAt: string;
  fixedStrategy: SimStrategy;
  dynamicStrategy: SimStrategy;
  carrySweep: CarrySweepEntry[];
  calibration: {
    premiumRate: number;
    carryBandBps: { low: number; base: number; high: number };
    liveFills: number;
  };
  methodology: string[];
};

// ─── SVG line chart ────────────────────────────────────────────────────────────

const W = 800;
const H = 220;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };

function toPath(series: SimSeries[], key: "hedgedNav" | "unhedgedNav"): string {
  if (!series.length) return "";
  const xs = series.length - 1;
  const vals = series.map((p) => p[key]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  return series
    .map((p, i) => {
      const x = PAD.left + (i / xs) * chartW;
      const y = PAD.top + chartH - ((p[key] - minV) / rangeV) * chartH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function NavChart({ fixed, dynamic }: { fixed: SimSeries[]; dynamic: SimSeries[] }) {
  const allNavs = [
    ...fixed.map((p) => p.hedgedNav),
    ...fixed.map((p) => p.unhedgedNav),
    ...dynamic.map((p) => p.hedgedNav),
  ];
  const minV = Math.min(...allNavs);
  const maxV = Math.max(...allNavs);
  const rangeV = maxV - minV || 1;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  function toSharedPath(series: SimSeries[], key: "hedgedNav" | "unhedgedNav"): string {
    if (!series.length) return "";
    const xs = series.length - 1;
    return series
      .map((p, i) => {
        const x = PAD.left + (i / xs) * chartW;
        const y = PAD.top + chartH - ((p[key] - minV) / rangeV) * chartH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const yTicks = [minV, (minV + maxV) / 2, maxV];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      aria-label="NAV comparison chart"
    >
      {/* grid lines */}
      {yTicks.map((v) => {
        const y = PAD.top + chartH - ((v - minV) / rangeV) * chartH;
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="#1e2228"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#565b63"
              fontFamily="var(--font-mono, monospace)"
            >
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* unhedged baseline (faintest) */}
      <path
        d={toSharedPath(fixed, "unhedgedNav")}
        fill="none"
        stroke="#2e333a"
        strokeWidth={1.2}
        strokeDasharray="3 3"
      />

      {/* fixed hedged */}
      <path
        d={toSharedPath(fixed, "hedgedNav")}
        fill="none"
        stroke="#f2b441"
        strokeWidth={1.5}
        opacity={0.7}
      />

      {/* dynamic hedged (best) */}
      <path
        d={toSharedPath(dynamic, "hedgedNav")}
        fill="none"
        stroke="#c6f24a"
        strokeWidth={2}
      />

      {/* payout markers on dynamic */}
      {dynamic.map((p, i) =>
        p.payout > 0 ? (
          <circle
            key={i}
            cx={PAD.left + (i / (dynamic.length - 1)) * chartW}
            cy={PAD.top + chartH - ((p.hedgedNav - minV) / rangeV) * chartH}
            r={3}
            fill="#c6f24a"
          />
        ) : null,
      )}

      {/* x-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const idx = Math.round(pct * (fixed.length - 1));
        const x = PAD.left + pct * chartW;
        return (
          <text
            key={pct}
            x={x}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="#565b63"
            fontFamily="var(--font-mono, monospace)"
          >
            {fixed[idx]?.date?.slice(5) ?? ""}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SimPage() {
  const [sim, setSim] = useState<VaultSim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/sim/vault_sim.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setSim(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fs = sim?.fixedStrategy;
  const ds = sim?.dynamicStrategy;

  return (
    <div className="mx-auto max-w-[800px] px-5 py-8">
      <Link
        href="/vault"
        className="mono mb-2 inline-block text-[11px] uppercase tracking-[0.12em] text-faint hover:text-signal"
      >
        ← vault
      </Link>

      <h1 className="serif text-4xl">Simulation</h1>
      <p className="mt-2 text-sm text-muted">
        99-cycle replay on DeepBook Predict oracle captures. Fixed vs. dynamic hedge budgeting.
      </p>

      {loading && (
        <div className="mono mt-16 text-center text-[11px] uppercase tracking-[0.2em] text-faint">
          loading simulation…
        </div>
      )}

      {sim && (
        <>
          {/* ── Strategy summary stats ── */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Dynamic ending NAV"
              value={ds?.summary.endingHedgedNav.toFixed(2) ?? "—"}
              sub={`from ${ds?.summary.initialNav}`}
              tone="signal"
            />
            <Stat
              label="Fixed ending NAV"
              value={fs?.summary.endingHedgedNav.toFixed(2) ?? "—"}
              sub={`${fs?.hedgeBps}bps budget`}
              tone="amber"
            />
            <Stat
              label="Max drawdown (dynamic)"
              value={`${ds?.summary.maxDrawdownHedgedBps.toFixed(0)}bps`}
              sub="hedged"
            />
            <Stat
              label="Hit rate"
              value={`${((fs?.summary.hitRate ?? 0) * 100).toFixed(1)}%`}
              sub={`${fs?.summary.payoutCount} payouts / ${fs?.summary.cycles} cycles`}
            />
          </div>

          {/* ── NAV chart ── */}
          <div className="panel mt-8 p-4">
            <SectionLabel index="◆" className="mb-4">
              NAV over 99 cycles
            </SectionLabel>

            <div className="mb-3 flex flex-wrap gap-3">
              <span className="mono flex items-center gap-1.5 text-[10px] text-signal">
                <span className="inline-block h-0.5 w-5 bg-signal" />
                Dynamic hedged
              </span>
              <span className="mono flex items-center gap-1.5 text-[10px] text-amber">
                <span className="inline-block h-0.5 w-5 bg-amber opacity-70" />
                Fixed hedged
              </span>
              <span className="mono flex items-center gap-1.5 text-[10px] text-faint">
                <span
                  className="inline-block h-0.5 w-5 border-t border-dashed border-faint"
                  style={{ borderColor: "#2e333a" }}
                />
                Unhedged
              </span>
              <span className="mono flex items-center gap-1.5 text-[10px] text-signal">
                <span className="inline-block size-2 rounded-full bg-signal" />
                Payout event
              </span>
            </div>

            <NavChart
              fixed={fs?.series ?? []}
              dynamic={ds?.series ?? []}
            />

            <p className="mono mt-3 text-[10px] text-faint">
              Span: {fs?.summary.spanStart} → {fs?.summary.spanEnd} · {fs?.summary.cycles} cycles ·{" "}
              {sim.calibration.liveFills} live fills used for calibration
            </p>
          </div>

          {/* ── Carry sweep ── */}
          <div className="panel mt-6 p-4">
            <SectionLabel index="◇" className="mb-4">
              Carry sweep
            </SectionLabel>
            <p className="mb-4 text-sm text-muted">
              Sensitivity to carry band width. Each scenario replays the same 99 cycles.
            </p>

            <div className="overflow-x-auto">
              <table className="mono w-full text-[11px]">
                <thead>
                  <tr className="border-b border-line text-faint">
                    <th className="pb-2 text-left font-normal uppercase tracking-[0.1em]">Scenario</th>
                    <th className="pb-2 text-right font-normal uppercase tracking-[0.1em]">
                      Fixed NAV
                    </th>
                    <th className="pb-2 text-right font-normal uppercase tracking-[0.1em]">
                      Dynamic NAV
                    </th>
                    <th className="pb-2 text-right font-normal uppercase tracking-[0.1em]">
                      Fixed drawdown
                    </th>
                    <th className="pb-2 text-right font-normal uppercase tracking-[0.1em]">
                      Dyn drawdown
                    </th>
                    <th className="pb-2 text-right font-normal uppercase tracking-[0.1em]">
                      Net cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sim.carrySweep.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-line/50 text-muted transition-colors hover:text-text"
                    >
                      <td className="py-2">
                        <Pill tone={row.label.includes("1.0") ? "signal" : "neutral"}>
                          {row.label}
                        </Pill>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {row.fixed.endingHedgedNav.toFixed(2)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-signal">
                        {row.dynamic.endingHedgedNav.toFixed(2)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {row.fixed.maxDrawdownHedgedBps.toFixed(0)}bps
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {row.dynamic.maxDrawdownHedgedBps.toFixed(0)}bps
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {row.dynamic.netCostBps.toFixed(0)}bps
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Calibration ── */}
          <div className="panel mt-6 p-4">
            <SectionLabel index="◇" className="mb-4">
              Calibration
            </SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="label mb-1">Premium rate</div>
                <div className="mono text-sm text-text tabular-nums">
                  {(sim.calibration.premiumRate * 100).toFixed(3)}%
                </div>
              </div>
              <div>
                <div className="label mb-1">Carry low</div>
                <div className="mono text-sm text-text tabular-nums">
                  {sim.calibration.carryBandBps.low.toFixed(4)}bps
                </div>
              </div>
              <div>
                <div className="label mb-1">Carry base</div>
                <div className="mono text-sm text-text tabular-nums">
                  {sim.calibration.carryBandBps.base.toFixed(4)}bps
                </div>
              </div>
              <div>
                <div className="label mb-1">Live fills</div>
                <div className="mono text-sm text-text tabular-nums">
                  {sim.calibration.liveFills}
                </div>
              </div>
            </div>
          </div>

          {/* ── Methodology ── */}
          <div className="panel mt-6 p-4">
            <SectionLabel index="◇" className="mb-4">
              Methodology
            </SectionLabel>
            <ol className="space-y-1.5">
              {sim.methodology.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted">
                  <span className="mono mt-0.5 shrink-0 text-[10px] text-faint">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mono mt-6 text-[10px] text-faint">
            Generated {new Date(sim.generatedAt).toLocaleString()} · {sim.version}
          </p>
        </>
      )}
    </div>
  );
}
