"""Polymarket BTC downside probability for SVI gap (Gamma API from openmind-main)."""
from __future__ import annotations

import re
from datetime import datetime, timezone

import httpx

from data.polymarket_gamma import GammaClient
from logging_util import get_logger

log = get_logger(__name__)

_FLOAT_SCALING = 1_000_000_000
_DOWN_WORDS = ("below", "under", "less than", "fall", "drop", "dip", "crash")


def _strike_usd(strike: int) -> float:
    return strike / _FLOAT_SCALING


def _is_btc_market(question: str) -> bool:
    q = question.lower()
    return "btc" in q or "bitcoin" in q


def _is_downside_question(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in _DOWN_WORDS)


def _extract_strike_from_question(question: str) -> float | None:
    q = question.replace(",", "")
    m = re.search(r"\$?\s*([\d]+(?:\.\d+)?)\s*k\b", q, re.I)
    if m:
        return float(m.group(1)) * 1_000
    m = re.search(r"\$?\s*([\d]{2,3}(?:,\d{3})*(?:\.\d+)?)\b", q)
    if m:
        val = float(m.group(1).replace(",", ""))
        if val > 1_000:
            return val
    return None


def fetch_btc_down_prob_sync(strike: int, expiry_ms: int) -> float:
    """
    Find an active Polymarket BTC downside market near our strike/expiry.
    Returns YES price as down probability when question is downside-oriented.
    Falls back to 0.5 neutral.
    """
    target_strike = _strike_usd(strike)
    expiry = datetime.fromtimestamp(expiry_ms / 1000, tz=timezone.utc)
    client = GammaClient()
    best_prob = 0.5
    best_score = -1.0

    try:
        for market in client.iter_markets(active=True, closed=False, max_pages=5):
            if not _is_btc_market(market.question):
                continue
            if market.last_price_yes is None:
                continue
            if not _is_downside_question(market.question):
                continue

            m_strike = _extract_strike_from_question(market.question)
            strike_dist = abs((m_strike or target_strike) - target_strike) / max(target_strike, 1)
            time_dist = 1.0
            if market.end_date:
                try:
                    end = datetime.fromisoformat(market.end_date.replace("Z", "+00:00"))
                    if end.tzinfo is None:
                        end = end.replace(tzinfo=timezone.utc)
                    time_dist = abs((end - expiry).total_seconds()) / 86_400
                except ValueError:
                    pass

            score = market.volume_24h or 0
            score -= strike_dist * 50_000
            score -= time_dist * 1_000
            if score > best_score:
                best_score = score
                best_prob = float(market.last_price_yes)

        if best_score > -1.0:
            log.info("polymarket down_prob=%.3f score=%.1f", best_prob, best_score)
            return max(0.0, min(1.0, best_prob))
    except Exception:
        log.exception("gamma polymarket lookup failed")
    finally:
        client.close()

    return _clob_fallback_sync(strike)


def _clob_fallback_sync(strike: int) -> float:
    """Legacy CLOB stub from PRD — used only if Gamma finds nothing."""
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.get(
                "https://clob.polymarket.com/markets",
                params={"question": f"BTC {strike // _FLOAT_SCALING}", "limit": 5},
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("data"):
                    return float(data["data"][0].get("tokens", [{}])[0].get("price", 0.5))
    except Exception:
        pass
    return 0.5


async def await_clob_fallback(strike: int) -> float:
    """Legacy CLOB stub from PRD — used only if Gamma finds nothing."""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://clob.polymarket.com/markets",
                params={"question": f"BTC {strike // _FLOAT_SCALING}", "limit": 5},
                timeout=5.0,
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("data"):
                    return float(data["data"][0].get("tokens", [{}])[0].get("price", 0.5))
    except Exception:
        pass
    return 0.5


async def fetch_polymarket_btc_odds(strike: int, expiry_ms: int) -> float:
    """Async wrapper for cycle pipeline."""
    import asyncio
    return await asyncio.to_thread(fetch_btc_down_prob_sync, strike, expiry_ms)
