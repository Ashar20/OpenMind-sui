"""DeepBook Predict oracle helpers."""
from __future__ import annotations

import httpx

from config import settings


async def get_oracle_state(oracle_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{settings.predict_server}/oracles/{oracle_id}/state")
        r.raise_for_status()
        return r.json()


async def list_oracles() -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{settings.predict_server}/oracles")
        r.raise_for_status()
        return r.json()


def pick_strike(oracle_state: dict, spot_bps: int | None = None) -> int:
    """Pick highest grid strike at or below spot_bps% of spot."""
    bps = spot_bps if spot_bps is not None else settings.strike_spot_bps
    oracle = oracle_state["oracle"]
    spot = int(oracle_state["latest_price"]["spot"])
    min_strike = int(oracle["min_strike"])
    tick = int(oracle["tick_size"])
    target = (spot * bps) // 10_000
    if target <= min_strike:
        raise ValueError("Spot target below strike grid floor")
    k = (target - min_strike) // tick
    return min_strike + k * tick
