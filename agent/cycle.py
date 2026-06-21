"""
Full openmind cycle pipeline.
Orchestrates: memory recall → news → reasoning → anchor (keeper opens vault cycle).
"""
import argparse
import asyncio
import hashlib
import json
import time
from pathlib import Path

from config import load_env
from memory import get_memwal, analyze_news, recall_similar_cycles, ask_historical_budget, remember_cycle_outcome
from surface import surface_readout
from scorer import compute_dynamic_budget
from anchor import (
    upload_to_walrus, execute_anchor_tx,
    execute_open_directional_tx, execute_close_directional_tx,
)
from oracle import get_oracle_state, pick_strike
from news import search_news
from graph import build_knowledge_graph, score_vol_risk
from polymarket import fetch_polymarket_btc_odds

load_env()
REASONING_CACHE = Path(__file__).resolve().parent / ".last_reasoning.json"

# Minimum |edge| in probability terms before a directional bet is considered.
# Mirrors MIN_DIRECTIONAL_EDGE_BPS in openmind_vault.move (300bps = 0.03).
MIN_EDGE = 0.03


async def gather_decision_inputs(oracle_id: str, hours_back: int = 2) -> dict:
    """
    Shared first half of any decision — hedge or directional.
    Both downstream paths call this; neither re-fetches anything gathered here.
    """
    memwal = await get_memwal()
    oracle_state = await get_oracle_state(oracle_id)
    expiry_ms = int(oracle_state["oracle"]["expiry"])
    strike = pick_strike(oracle_state)

    readout_down = surface_readout(oracle_state, strike, is_up=False)
    readout_up = surface_readout(oracle_state, strike, is_up=True)

    news = await search_news()
    graph = await build_knowledge_graph(
        news,
        oracle_id=oracle_id,
        strike=strike,
        expiry_ms=expiry_ms,
    )
    dominant_theme = graph["dominant_theme"]
    news_signal = score_vol_risk(graph)

    if news:
        news_text = "\n".join(f"- {n['headline']} [{n.get('source', '')}]" for n in news)
        await analyze_news(memwal, news_text)

    past_memories = await recall_similar_cycles(memwal, dominant_theme, news_signal)
    historical_answer = await ask_historical_budget(
        memwal, dominant_theme, int(readout_down["spot"] * 1_000_000_000)
    )
    polymarket_down_prob = await fetch_polymarket_btc_odds(strike, expiry_ms)

    return {
        "memwal": memwal,
        "oracle_state": oracle_state,
        "expiry_ms": expiry_ms,
        "strike": strike,
        "readout_down": readout_down,
        "readout_up": readout_up,
        "news": news,
        "graph": graph,
        "dominant_theme": dominant_theme,
        "news_signal": news_signal,
        "past_memories": past_memories,
        "memory_cycles_recalled": len(past_memories),
        "historical_answer": historical_answer,
        "polymarket_down_prob": polymarket_down_prob,
        "polymarket_up_prob": 1.0 - polymarket_down_prob,
    }


async def anchor_and_record(oracle_id: str, reasoning: dict) -> tuple[bytes, str]:
    """Shared hash + Walrus upload + Sui anchor step."""
    reasoning_json = json.dumps(reasoning, sort_keys=True)
    reasoning_hash = hashlib.sha256(reasoning_json.encode()).digest()
    walrus_blob_id = await upload_to_walrus(reasoning_json.encode())
    return reasoning_hash, walrus_blob_id


def kelly_fraction(p_model: float, p_surface_ask: float, confidence: float) -> float:
    """
    Fractional Kelly sizing for a binary bet.
    p_model: openmind's calibrated probability the bet wins
    p_surface_ask: cost to enter as implied probability (the ask)
    confidence: 0-1 scaling from cross-source agreement
    """
    if p_surface_ask <= 0 or p_surface_ask >= 1:
        return 0.0
    edge = p_model - p_surface_ask
    if edge <= 0:
        return 0.0
    b = (1 - p_surface_ask) / p_surface_ask
    raw_kelly = (p_model * (b + 1) - 1) / b if b > 0 else 0.0
    return max(0.0, min(raw_kelly * confidence, 1.0))


def estimate_p_up(inputs: dict) -> float:
    """
    openmind's calibrated P(up), independent of the surface.
    Blends real bullish/bearish news signal, MemWal historical sentiment, and
    a neutral prior. Uses graph["bullish_signal"]/["bearish_signal"] (built
    from each article's price_direction) — NOT high_vol_up/medium_vol_up,
    which measure expected volatility impact and say nothing about which way
    price moves (a crash and a rally can both score high there).
    """
    graph = inputs["graph"]
    news_tilt = graph.get("bullish_signal", 0.0) - graph.get("bearish_signal", 0.0)
    historical_lower = inputs["historical_answer"].lower()
    memory_tilt = 0.05 if "up" in historical_lower or "rally" in historical_lower else (
        -0.05 if "down" in historical_lower or "crash" in historical_lower else 0.0
    )
    return max(0.0, min(1.0, 0.5 + news_tilt + memory_tilt))


async def evaluate_directional(
    oracle_id: str,
    trigger: str,
    inputs: dict | None = None,
) -> dict | None:
    """
    Returns None if no qualifying edge exists — explicit skip, not a forced bet.
    Accepts pre-fetched `inputs` from gather_decision_inputs to avoid re-fetching.
    """
    if inputs is None:
        inputs = await gather_decision_inputs(oracle_id, hours_back=1 if trigger != "cycle_open" else 2)

    p_model_up = estimate_p_up(inputs)
    p_surface_up = inputs["readout_up"]["up_probability"]
    edge = p_model_up - p_surface_up
    is_up = edge > 0
    abs_edge = abs(edge)

    if abs_edge < MIN_EDGE:
        return None

    poly_p_up = inputs["polymarket_up_prob"]
    agreement = 1.0 - min(1.0, abs(poly_p_up - p_model_up))
    confidence = max(0.2, agreement)

    p_ask = p_surface_up if is_up else (1 - p_surface_up)
    p_model_for_bet = p_model_up if is_up else (1 - p_model_up)
    fraction = kelly_fraction(p_model_for_bet, p_ask, confidence)
    if fraction <= 0:
        return None

    reasoning = {
        "version": "openmind-directional-v1",
        "leg": "directional",
        "cycle_oracle_id": oracle_id,
        "trigger": trigger,
        "anchored_before_expiry": True,
        "anchor_timestamp_ms": int(time.time() * 1000),
        "is_up": is_up,
        "p_model_up": p_model_up,
        "p_surface_up": p_surface_up,
        "edge": edge,
        "confidence": confidence,
        "kelly_fraction": fraction,
        "evidence": inputs["news"],
        "memory_context": inputs["past_memories"],
        "polymarket_up_probability": poly_p_up,
    }
    reasoning_hash, walrus_blob_id = await anchor_and_record(oracle_id, reasoning)

    return {
        "reasoning": reasoning,
        "reasoning_hash_hex": reasoning_hash.hex(),
        "walrus_blob_id": walrus_blob_id,
        "is_up": is_up,
        "p_model": int(p_model_for_bet * 1_000_000_000),
        "p_surface": int(p_ask * 1_000_000_000),
        "kelly_fraction_bps": int(fraction * 10_000),
        "strike": inputs["strike"],
    }


async def run_cycle(oracle_id: str) -> dict:
    """
    Scheduled cycle-open entry point. Always runs the hedge leg.
    Directional evaluation also runs here with trigger="cycle_open".
    """
    inputs = await gather_decision_inputs(oracle_id, hours_back=2)

    svi_down_prob = inputs["readout_down"]["down_probability"]
    budget_result = compute_dynamic_budget(
        inputs["news_signal"], svi_down_prob,
        inputs["polymarket_down_prob"], inputs["historical_answer"]
    )
    budget_bps = budget_result["budget_bps"]

    anchored_at_ms = int(time.time() * 1000)
    reasoning = {
        "version": "openmind-hedge-v1",
        "leg": "hedge",
        "cycle_oracle_id": oracle_id,
        "anchored_before_expiry": True,
        "anchor_timestamp_ms": anchored_at_ms,
        "expiry_ms": inputs["expiry_ms"],
        "strike": inputs["strike"],
        "evidence": inputs["news"],
        "knowledge_graph": inputs["graph"],
        "graph_summary": inputs["graph"].get("summary"),
        "memory_context": inputs["past_memories"],
        "historical_answer": inputs["historical_answer"],
        "memory_cycles_recalled": inputs["memory_cycles_recalled"],
        "news_signal": inputs["news_signal"],
        "svi_down_probability": svi_down_prob,
        "polymarket_down_probability": inputs["polymarket_down_prob"],
        "budget": budget_result,
    }

    reasoning_hash, walrus_blob_id = await anchor_and_record(oracle_id, reasoning)

    anchor_tx_digest = execute_anchor_tx(
        oracle_id=oracle_id,
        reasoning_hash=reasoning_hash,
        walrus_blob_id=walrus_blob_id,
        risk_score=int(inputs["news_signal"] * 10_000),
        hedge_budget_bps=budget_bps,
        news_signal_bps=budget_result["breakdown"]["news_uplift"],
        svi_gap_bps=budget_result["inputs"]["signal_gap_bps"],
        memory_cycles_recalled=inputs["memory_cycles_recalled"],
        anchored_at_ms=anchored_at_ms,
    )

    reasoning["reasoning_hash_hex"] = reasoning_hash.hex()
    reasoning["walrus_blob_id"] = walrus_blob_id
    reasoning["anchor_tx_digest"] = anchor_tx_digest

    # Evaluate directional at cycle-open (uses same inputs — no re-fetch)
    directional_result = await evaluate_directional(oracle_id, "cycle_open", inputs)
    if directional_result:
        reasoning["directional"] = directional_result

    REASONING_CACHE.write_text(json.dumps(reasoning))
    return reasoning


async def after_close(oracle_id: str, close_result: dict, reasoning: dict) -> None:
    """Store cycle outcome in MemWal after close_cycle executes."""
    memwal = await get_memwal()
    await remember_cycle_outcome(
        memwal=memwal,
        oracle_id=oracle_id,
        expiry_date=close_result.get("expiry_date", ""),
        dominant_theme=reasoning["knowledge_graph"]["dominant_theme"],
        news_signal=score_vol_risk(reasoning["knowledge_graph"]),
        budget_bps=reasoning["budget"]["budget_bps"],
        budget_breakdown=reasoning["budget"]["breakdown"],
        svi_down_prob=reasoning["svi_down_probability"],
        polymarket_down_prob=reasoning["polymarket_down_probability"],
        itm=close_result.get("itm", False),
        plp_carry_bps=close_result.get("plp_carry_bps", 0),
        btc_move_pct=close_result.get("btc_move_pct", 0),
        reasoning_hash=close_result.get("reasoning_hash", ""),
        memory_cycles_recalled=reasoning["memory_cycles_recalled"],
    )


def agent_output(reasoning: dict) -> dict:
    graph = reasoning.get("knowledge_graph", {})
    budget = reasoning.get("budget", {})
    return {
        "reasoning_hash_hex": reasoning["reasoning_hash_hex"],
        "walrus_blob_id": reasoning["walrus_blob_id"],
        "risk_score": int(score_vol_risk(graph) * 10_000),
        "budget_bps": budget.get("budget_bps", 150),
        "news_signal_bps": budget.get("breakdown", {}).get("news_uplift", 0),
        "svi_gap_bps": budget.get("inputs", {}).get("signal_gap_bps", 0),
        "memory_cycles_recalled": reasoning.get("memory_cycles_recalled", 0),
        "anchor_tx_digest": reasoning.get("anchor_tx_digest", ""),
        "reasoning_summary": graph.get("dominant_theme", ""),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="openmind agent cycle")
    parser.add_argument("--oracle-id")
    parser.add_argument("--output-json", action="store_true")
    parser.add_argument("--after-close", action="store_true")
    parser.add_argument("--itm", default="false")
    parser.add_argument("--plp-realized", default="0")
    parser.add_argument("--nav-after", default="0")
    args = parser.parse_args()

    if args.after_close:
        if not REASONING_CACHE.exists():
            return
        reasoning = json.loads(REASONING_CACHE.read_text())
        close_result = {
            "itm": args.itm.lower() == "true",
            "plp_carry_bps": float(args.plp_realized) / 1e4,
            "reasoning_hash": reasoning.get("reasoning_hash_hex", ""),
        }
        asyncio.run(after_close(args.oracle_id or reasoning["cycle_oracle_id"], close_result, reasoning))
        return

    if not args.oracle_id:
        parser.error("--oracle-id is required unless --after-close")

    reasoning = asyncio.run(run_cycle(args.oracle_id))
    if args.output_json:
        print(json.dumps(agent_output(reasoning)))


if __name__ == "__main__":
    main()
