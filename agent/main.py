"""
Process entrypoint. Run with: python3 agent/main.py --oracle-id <id>
Starts the continuous watch loop and connects triggers to on-chain execution.
"""
import argparse
import asyncio

from config import load_env
from watch import watch_loop
from cycle import evaluate_directional
from anchor import execute_open_directional_tx

load_env()


async def on_trigger(oracle_id: str, trigger: str, market: dict, new_news: list[dict]):
    """
    Called by watch_loop whenever a real trigger fires.
    cycle_open is handled separately by the scheduled keeper (run_cycle),
    so we only act on event-driven triggers to avoid double-firing the hedge leg.
    """
    if trigger == "cycle_open":
        # Hedge leg already handled by keeper's scheduled run_cycle.
        # Directional is evaluated separately below.
        pass

    result = await evaluate_directional(oracle_id, trigger)
    if result is None:
        print(f"DIRECTIONAL_SKIP oracle={oracle_id} trigger={trigger} (no qualifying edge)")
        return

    digest = execute_open_directional_tx(
        oracle_id=oracle_id,
        strike=result["strike"],
        is_up=result["is_up"],
        quantity=result["p_model"],
        p_model=result["p_model"],
        p_surface=result["p_surface"],
        kelly_fraction_bps=result["kelly_fraction_bps"],
        reasoning_hash=bytes.fromhex(result["reasoning_hash_hex"]),
    )
    print(
        f"DIRECTIONAL_OPENED oracle={oracle_id} trigger={trigger} tx={digest} "
        f"is_up={result['is_up']} kelly_bps={result['kelly_fraction_bps']} "
        f"walrus={result['walrus_blob_id']}"
    )


async def main():
    parser = argparse.ArgumentParser(description="openmind watch-loop entrypoint")
    parser.add_argument("--oracle-id", required=True)
    args = parser.parse_args()
    await watch_loop(args.oracle_id, on_trigger)


if __name__ == "__main__":
    asyncio.run(main())
