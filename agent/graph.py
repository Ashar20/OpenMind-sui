"""GraphRAG knowledge graph builder for vault cycles."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from config import settings
from graphrag import build_market_graph
from logging_util import get_logger

log = get_logger(__name__)

_FLOAT_SCALING = 1_000_000_000
_VOL_WORDS = (
    "crash", "fall", "drop", "selloff", "fear", "liquidat", "volatil",
    "surge", "hack", "ban", "tariff", "inflation", "fed", "rate",
)
_VOL_UP_WORDS = ("crash", "fall", "drop", "selloff", "fear", "liquidat", "volatil", "hack")
_VOL_ENTITY_TYPES = {
    "MarketEvent", "EconomicIndicator", "RiskFactor", "MacroIndicator", "Regulator",
}


def news_to_search_hits(news: list[dict]) -> list[dict[str, Any]]:
    return [
        {
            "title": n.get("headline", ""),
            "url": n.get("source", ""),
            "content": n.get("snippet", n.get("headline", "")),
            "published_date": n.get("published_date"),
        }
        for n in news
    ]


def vault_market(oracle_id: str, strike: int, expiry_ms: int) -> dict[str, Any]:
    strike_usd = strike / _FLOAT_SCALING
    expiry = datetime.fromtimestamp(expiry_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return {
        "id": oracle_id,
        "question": f"Will BTC trade below ${strike_usd:,.0f} at {expiry}?",
        "category": "crypto",
    }


_IMPACT_WEIGHT = {"high": 0.3, "medium": 0.1, "low": 0.05}


def _price_direction_tally(news: list[dict]) -> dict[str, float]:
    """
    Real bullish/bearish signal from each article's `price_direction`
    (bullish/bearish/neutral) — distinct from `direction` (vol_up/vol_down),
    which only says whether a story is likely to move volatility, not which
    way price goes. Used by estimate_p_up; never substitute one for the other.
    """
    bullish = sum(
        _IMPACT_WEIGHT.get(n.get("impact", "low"), 0.05)
        for n in news if n.get("price_direction") == "bullish"
    )
    bearish = sum(
        _IMPACT_WEIGHT.get(n.get("impact", "low"), 0.05)
        for n in news if n.get("price_direction") == "bearish"
    )
    return {"bullish_signal": min(1.0, bullish), "bearish_signal": min(1.0, bearish)}


def _simple_graph(news: list[dict]) -> dict[str, Any]:
    high_vol_up = sum(
        1 for n in news if n.get("impact") == "high" and n.get("direction") == "vol_up"
    )
    medium_vol_up = sum(
        1 for n in news if n.get("impact") == "medium" and n.get("direction") == "vol_up"
    )
    dominant = max(
        news,
        key=lambda n: {"high": 3, "medium": 2, "low": 1}.get(n.get("impact", "low"), 1),
        default={},
    )
    return {
        "mode": "simple",
        "high_vol_up": high_vol_up,
        "medium_vol_up": medium_vol_up,
        **_price_direction_tally(news),
        "total_articles": len(news),
        "dominant_theme": dominant.get("headline", "neutral")[:80],
        "ontology": None,
        "nodes": [],
        "edges": [],
        "stats": {},
        "summary": None,
        "graph_cost_usd": 0.0,
    }


def _graphrag_to_dict(result, news: list[dict]) -> dict[str, Any]:
    central = result.stats.get("central") or []
    theme = central[0]["label"] if central else "graph-derived"
    vol_nodes = sum(
        1 for n in result.nodes
        if n.get("type") in _VOL_ENTITY_TYPES
        or any(w in f"{n.get('label','')} {n.get('summary','')}".lower() for w in _VOL_UP_WORDS)
    )
    return {
        "mode": "graphrag",
        "high_vol_up": min(5, vol_nodes),
        "medium_vol_up": min(5, max(0, result.stats.get("edge_count", 0) // 3)),
        # GraphRAG's nodes are entities (people/orgs/events), not individually
        # price_direction-tagged — reuse the same per-article tally as simple
        # mode rather than inferring direction from entity/edge typing.
        **_price_direction_tally(news),
        "total_articles": result.stats.get("node_count", 0),
        "dominant_theme": theme[:80],
        "ontology": result.ontology,
        "nodes": result.nodes,
        "edges": result.edges,
        "stats": result.stats,
        "summary": result.summary,
        "graph_cost_usd": result.cost_usd,
        "graph_input_tokens": result.input_tokens,
        "graph_output_tokens": result.output_tokens,
    }


def build_knowledge_graph_sync(
    news: list[dict],
    *,
    oracle_id: str,
    strike: int,
    expiry_ms: int,
) -> dict[str, Any]:
    hits = news_to_search_hits(news)
    if not news:
        return _simple_graph(news)

    if not settings.graphrag_enabled or not hits:
        return _simple_graph(news)

    try:
        result = build_market_graph(
            vault_market(oracle_id, strike, expiry_ms),
            hits,
            as_of=datetime.now(timezone.utc),
        )
        if result:
            log.info(
                "graphrag ok nodes=%s edges=%s cost=$%.4f",
                len(result.nodes), len(result.edges), result.cost_usd,
            )
            return _graphrag_to_dict(result, news)
    except Exception:
        log.exception("graphrag failed — falling back to simple graph")

    return _simple_graph(news)


async def build_knowledge_graph(
    news: list[dict],
    *,
    oracle_id: str,
    strike: int,
    expiry_ms: int,
) -> dict[str, Any]:
    return await asyncio.to_thread(
        build_knowledge_graph_sync,
        news,
        oracle_id=oracle_id,
        strike=strike,
        expiry_ms=expiry_ms,
    )


def score_vol_risk(graph: dict) -> float:
    """0.0–1.0 risk score from simple counters or GraphRAG stats."""
    if graph.get("mode") == "graphrag" and graph.get("nodes"):
        score = 0.0
        for n in graph["nodes"]:
            blob = f"{n.get('label','')} {n.get('summary','')}".lower()
            if n.get("type") in _VOL_ENTITY_TYPES:
                score += 0.12
            if any(w in blob for w in _VOL_UP_WORDS):
                score += 0.18
        for e in graph.get("edges", []):
            if e.get("type") in ("INFLUENCES", "DRIVES", "CORRELATES_WITH", "TRIGGERS"):
                score += 0.05
        return min(1.0, score)

    simple = graph["high_vol_up"] * 0.3 + graph["medium_vol_up"] * 0.1
    return min(1.0, simple)
