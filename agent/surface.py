"""
SVI volatility surface fair-value calculator.
Implements Black-Scholes digital option pricing from DeepBook Predict oracle.
Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
"""
import math

FLOAT_SCALING = 1_000_000_000

def erf(x: float) -> float:
    sign = 1 if x >= 0 else -1
    ax = abs(x)
    a1, a2, a3, a4, a5 = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429
    p = 0.3275911
    t = 1 / (1 + p * ax)
    y = 1 - (((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t * math.exp(-ax*ax))
    return sign * y

def normal_cdf(x: float) -> float:
    return 0.5 * (1 + erf(x / math.sqrt(2)))

def surface_readout(oracle_state: dict, strike: int, is_up: bool) -> dict:
    """
    Compute SVI-implied probability for a given strike.
    All values are 1e9 scaled integers from the Predict server API.
    Reference: https://predict-server.testnet.mystenlabs.com/oracles/:id/state
    """
    svi = oracle_state['latest_svi']
    price = oracle_state['latest_price']

    forward = int(price['forward']) / FLOAT_SCALING
    spot = int(price['spot']) / FLOAT_SCALING
    k_float = float(strike) / FLOAT_SCALING

    if forward <= 0:
        raise ValueError("Invalid forward price")

    # Log-moneyness
    k = math.log(k_float / forward)

    a = int(svi['a']) / FLOAT_SCALING
    b = int(svi['b']) / FLOAT_SCALING
    rho = int(svi['rho']) / FLOAT_SCALING * (-1 if svi.get('rho_negative') else 1)
    m = int(svi['m']) / FLOAT_SCALING * (-1 if svi.get('m_negative') else 1)
    sigma = int(svi['sigma']) / FLOAT_SCALING

    km = k - m
    inner = rho * km + math.sqrt(km * km + sigma * sigma)
    total_variance = max(0.0, a + b * inner)

    if total_variance <= 0:
        raise ValueError("Non-positive total variance")

    vol = math.sqrt(total_variance)
    d2 = -((k + total_variance / 2) / vol)
    up_prob = normal_cdf(d2)
    down_prob = 1 - up_prob
    model_prob = up_prob if is_up else down_prob

    return {
        'strike': strike,
        'is_up': is_up,
        'log_moneyness': k,
        'total_variance': total_variance,
        'surface_vol': vol,
        'up_probability': up_prob,
        'down_probability': down_prob,
        'model_probability': model_prob,
        'model_price': int(max(0, min(FLOAT_SCALING, round(model_prob * FLOAT_SCALING)))),
        'spot': spot,
        'forward': forward,
    }
