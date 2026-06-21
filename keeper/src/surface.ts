/**
 * SVI volatility surface math — TypeScript port matching agent/surface.py.
 * Reads from Predict server oracle state endpoint.
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
 * Reference: https://predict-server.testnet.mystenlabs.com/oracles/:id/state
 */

export const FLOAT_SCALING = 1_000_000_000n;
const FLOAT_SCALING_N = 1_000_000_000;

export type OracleState = {
  oracle: { oracle_id: string; expiry: number | string; status: string; settlement_price?: string | null };
  latest_price?: { spot: string; forward: string; event_digest: string };
  latest_svi?: { a: string; b: string; rho: string; rho_negative?: boolean; m: string; m_negative?: boolean; sigma: string };
};

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const [a1,a2,a3,a4,a5] = [0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429];
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-ax*ax));
  return sign * y;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function surfaceReadout(state: OracleState, strike: bigint, isUp: boolean) {
  const svi = state.latest_svi!;
  const price = state.latest_price!;
  const forward = Number(price.forward) / FLOAT_SCALING_N;
  const strikeN = Number(strike) / FLOAT_SCALING_N;
  const k = Math.log(strikeN / forward);
  const a = Number(svi.a) / FLOAT_SCALING_N;
  const b = Number(svi.b) / FLOAT_SCALING_N;
  const rho = (Number(svi.rho) / FLOAT_SCALING_N) * (svi.rho_negative ? -1 : 1);
  const m = (Number(svi.m) / FLOAT_SCALING_N) * (svi.m_negative ? -1 : 1);
  const sigma = Number(svi.sigma) / FLOAT_SCALING_N;
  const km = k - m;
  const totalVariance = Math.max(0, a + b * (rho * km + Math.sqrt(km*km + sigma*sigma)));
  const vol = Math.sqrt(totalVariance);
  const d2 = -((k + totalVariance / 2) / vol);
  const upProb = normalCdf(d2);
  const downProb = 1 - upProb;
  const modelProb = isUp ? upProb : downProb;
  return {
    modelPrice: BigInt(Math.max(0, Math.min(FLOAT_SCALING_N, Math.round(modelProb * FLOAT_SCALING_N)))).toString(),
    upProbability: upProb,
    downProbability: downProb,
    spreadBps: (ask: string) => Math.round(((Number(ask) - modelProb * FLOAT_SCALING_N) / (modelProb * FLOAT_SCALING_N)) * 10_000),
  };
}
