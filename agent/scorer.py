"""
Dynamic hedge budget scorer.
Combines news signal, SVI-vs-Polymarket gap, and MemWal historical memory
to produce a per-cycle budget in bps.
"""

BASE_BPS = 150        # Floor: 1.5% of NAV always
MAX_NEWS_UPLIFT = 200 # News risk adds up to +200 bps
MAX_GAP_UPLIFT = 100  # SVI vs Polymarket gap adds up to +100 bps
MAX_MEMORY_UPLIFT = 150  # Historical recall adds up to +150 bps
HARD_CAP_BPS = 2000   # Never exceed 20% of NAV (matches on-chain MAX_HEDGE_BPS)

def compute_dynamic_budget(
    news_signal: float,           # 0.0 to 1.0 from graph.py
    svi_down_prob: float,         # from surface.py
    polymarket_down_prob: float,  # from polymarket.py
    historical_answer: str,       # from memwal.ask()
) -> dict:
    """
    Returns budget_bps and breakdown for reasoning JSON.
    """
    signal_gap = abs(polymarket_down_prob - svi_down_prob)

    news_uplift = int(news_signal * MAX_NEWS_UPLIFT)
    gap_uplift = int(min(signal_gap * 500, MAX_GAP_UPLIFT))
    memory_uplift = _parse_memory_uplift(historical_answer)

    total = min(BASE_BPS + news_uplift + gap_uplift + memory_uplift, HARD_CAP_BPS)

    return {
        'budget_bps': total,
        'breakdown': {
            'base': BASE_BPS,
            'news_uplift': news_uplift,
            'gap_uplift': gap_uplift,
            'memory_uplift': memory_uplift,
        },
        'inputs': {
            'news_signal': news_signal,
            'svi_down_prob': svi_down_prob,
            'polymarket_down_prob': polymarket_down_prob,
            'signal_gap_bps': int(signal_gap * 10_000),
        }
    }

def _parse_memory_uplift(historical_answer: str) -> int:
    """
    Parse MemWal historical answer for budget signal.
    Looks for keywords indicating past high-budget cycles paid off.
    """
    answer_lower = historical_answer.lower()
    if 'itm' in answer_lower and ('high' in answer_lower or 'above 300' in answer_lower):
        return MAX_MEMORY_UPLIFT
    elif 'paid' in answer_lower:
        return MAX_MEMORY_UPLIFT // 2
    elif 'expired' in answer_lower or 'otm' in answer_lower:
        return 0
    return MAX_MEMORY_UPLIFT // 4
