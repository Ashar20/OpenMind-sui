"""
MemWal Python SDK wrapper for openmind agent.
Reference: https://docs.wal.app/walrus-memory/python-sdk/quick-start
Reference: https://docs.wal.app/walrus-memory/python-sdk/usage/memwal
"""
import os
from memwal import MemWal, RecallParams

MEMWAL_NAMESPACE = "openmind-vault"

def _memwal_client_kwargs() -> dict:
    kwargs: dict = {
        "key": os.environ["MEMWAL_PRIVATE_KEY"],
        "account_id": os.environ["MEMWAL_ACCOUNT_ID"],
        "namespace": MEMWAL_NAMESPACE,
    }
    server_url = os.environ.get(
        "MEMWAL_SERVER_URL", "https://relayer.memory.walrus.xyz"
    )
    kwargs["server_url"] = server_url
    return kwargs


async def get_memwal() -> MemWal:
    """
    Create MemWal client.
    Get account ID and delegate key from:
    https://docs.memwal.ai/ (Playground — create account + delegate key)
    MEMWAL_SERVER_URL wins over MEMWAL_ENV (staging/prod presets).
    """
    return MemWal.create(**_memwal_client_kwargs())

async def analyze_news(memwal: MemWal, news_text: str) -> None:
    """
    Extract structured facts from news text.
    Each fact stored as separate searchable memory entry.
    Reference: https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory
    """
    await memwal.analyze(news_text)

async def recall_similar_cycles(memwal: MemWal, dominant_theme: str, news_signal: float) -> list[str]:
    """
    Recall past cycles with similar pattern.
    Uses semantic search over all past cycle memories.
    Reference: https://docs.wal.app/walrus-memory/python-sdk/usage/memwal
    """
    result = await memwal.recall(RecallParams(
        query=f"cycles with {dominant_theme} news signal above {news_signal:.1f} hedge budget outcome"
    ))
    return [m.text for m in result.results[:5]]

async def ask_historical_budget(memwal: MemWal, dominant_theme: str, spot: int) -> str:
    """
    AI-generated answer from all past memory.
    Combines recall with LLM reasoning over stored cycle history.
    Reference: https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory#memory-operations
    """
    result = await memwal.ask(
        f"Given {dominant_theme} pattern with BTC at {spot}, "
        f"what hedge budget in bps worked best in similar past cycles? "
        f"What was the typical outcome (ITM vs OTM)?"
    )
    return result.answer

async def remember_cycle_outcome(
    memwal: MemWal,
    oracle_id: str,
    expiry_date: str,
    dominant_theme: str,
    news_signal: float,
    budget_bps: int,
    budget_breakdown: dict,
    svi_down_prob: float,
    polymarket_down_prob: float,
    itm: bool,
    plp_carry_bps: float,
    btc_move_pct: float,
    reasoning_hash: str,
    memory_cycles_recalled: int,
) -> None:
    """
    Store cycle outcome for future recall.
    Uses remember_and_wait to ensure Walrus commit before next cycle.
    Reference: https://docs.wal.app/walrus-memory/python-sdk/quick-start
    """
    text = f"""
Cycle {oracle_id} | {expiry_date}:
Theme: {dominant_theme} | News signal: {news_signal:.2f}
Past cycles recalled: {memory_cycles_recalled}
Budget: {budget_bps}bps (base {budget_breakdown['base']} + news {budget_breakdown['news_uplift']} + gap {budget_breakdown['gap_uplift']} + memory {budget_breakdown['memory_uplift']})
SVI down probability: {svi_down_prob:.3f}
Polymarket down probability: {polymarket_down_prob:.3f}
Signal gap: {abs(svi_down_prob - polymarket_down_prob):.3f}
BTC move: {btc_move_pct:+.2f}%
Outcome: {"ITM — hedge PAID" if itm else "OTM — expired"}
PLP carry: {plp_carry_bps:.1f}bps
Reasoning hash: {reasoning_hash}
""".strip()
    await memwal.remember_and_wait(text)
