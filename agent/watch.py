"""
Continuous watch loop for openmind.
Polls market + news at a light cadence; fires a full decision snapshot
only when a real trigger condition is met.
Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
"""
import asyncio
import time
from dataclasses import dataclass, field

from cycle import get_oracle_state, score_vol_risk, build_knowledge_graph
from news import search_news
from surface import surface_readout

POLL_INTERVAL_S = 75
SVI_JUMP_THRESHOLD = 0.015          # 1.5% absolute change in surface-implied up_probability
NEWS_HIGH_IMPACT_MIN_ITEMS = 1
MIN_SECONDS_BETWEEN_TRIGGERS = 180  # debounce — don't re-fire constantly on noisy data


@dataclass
class WatchState:
    oracle_id: str
    last_up_prob: float | None = None
    last_news_check_ms: int = 0
    last_trigger_ms: int = 0
    seen_headlines: set[str] = field(default_factory=set)


async def poll_market(oracle_id: str) -> dict:
    """Light read of current SVI surface state. No decision made here."""
    state = await get_oracle_state(oracle_id)
    if not state.get("latest_svi") or not state.get("latest_price"):
        return {}
    ref_strike = int(state["oracle"]["min_strike"])
    readout = surface_readout(state, ref_strike, is_up=True)
    return {
        "up_probability": readout["up_probability"],
        "spot": readout["spot"],
        "state": state,
    }


async def poll_news_delta(watch: WatchState) -> tuple[list[dict], bool]:
    """Return only NEW headlines not yet seen this watch session."""
    news = await search_news(hours_back=1)
    new_items = [n for n in news if n.get("headline") not in watch.seen_headlines]
    for n in new_items:
        watch.seen_headlines.add(n.get("headline", ""))
    high_impact = any(n.get("impact") == "high" for n in new_items)
    return new_items, high_impact


def check_triggers(
    watch: WatchState,
    market: dict,
    new_news: list[dict],
    news_high_impact: bool,
    now_ms: int,
) -> str | None:
    """
    Returns trigger name if a full decision snapshot should fire, else None.
    Debounced — won't re-fire within MIN_SECONDS_BETWEEN_TRIGGERS of last trigger.
    """
    if now_ms - watch.last_trigger_ms < MIN_SECONDS_BETWEEN_TRIGGERS * 1000:
        return None

    if watch.last_up_prob is not None and market.get("up_probability") is not None:
        delta = abs(market["up_probability"] - watch.last_up_prob)
        if delta >= SVI_JUMP_THRESHOLD:
            return "svi_jump"

    if news_high_impact and len(new_news) >= NEWS_HIGH_IMPACT_MIN_ITEMS:
        return "high_impact_news"

    return None


async def watch_loop(oracle_id: str, on_trigger):
    """
    Main watch loop. `on_trigger(oracle_id, trigger_name, market, news)` is
    called whenever a real trigger fires — this runs the full decision pipeline.
    """
    watch = WatchState(oracle_id=oracle_id)

    while True:
        try:
            market = await poll_market(oracle_id)
            new_news, news_high_impact = await poll_news_delta(watch)
            now_ms = int(time.time() * 1000)

            trigger = check_triggers(watch, market, new_news, news_high_impact, now_ms)
            if trigger:
                print(f"WATCH_TRIGGER oracle={oracle_id} trigger={trigger}")
                watch.last_trigger_ms = now_ms
                await on_trigger(oracle_id, trigger, market, new_news)

            if market.get("up_probability") is not None:
                watch.last_up_prob = market["up_probability"]
            watch.last_news_check_ms = now_ms

        except Exception as err:
            print(f"WATCH_ERROR oracle={oracle_id}: {err}")

        await asyncio.sleep(POLL_INTERVAL_S)
