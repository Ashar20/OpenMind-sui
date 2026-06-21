"""
Sui transaction builder for reasoning anchor + vault cycle open.
Builds and executes PTBs against Sui testnet.
Reference: https://docs.sui.io/develop/transactions
Reference: https://sdk.mystenlabs.com/typescript (use pysui equivalent)
"""
import os
import subprocess
import sys
from pathlib import Path

from pysui import SuiAddress
from pysui.sui.sui_config import SuiConfig
from pysui.sui.sui_clients.sync_client import SuiClient as SyncClient
from pysui.sui.sui_txn import SyncTransaction
from pysui.sui.sui_types.scalars import ObjectID, SuiU64, SuiU8
from pysui.sui.sui_types.collections import SuiArray

KEEPER_DIR = Path(__file__).resolve().parent.parent / "keeper"
WALRUS_CLI = KEEPER_DIR / "src" / "walrusCli.ts"

PREDICT_PACKAGE = "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138"
PREDICT_SHARED = "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a"
CLOCK_OBJECT = "0x6"

OPENMIND_PACKAGE = os.environ["OPENMIND_PACKAGE"]   # set after deploy
VAULT_OBJECT = os.environ["VAULT_OBJECT"]
VAULT_MANAGER = os.environ["VAULT_MANAGER"]
AGENT_CAP_OBJECT = os.environ["AGENT_CAP_OBJECT"]   # shared AgentCap gating autonomous spend
DUSDC_TYPE = "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC"


def _as_vector_u8(data: bytes) -> SuiArray:
    """BCS-encode bytes as Move vector<u8>."""
    return SuiArray([SuiU8(b) for b in data])


def _require_tx_success(result, label: str) -> str:
    if result.is_err():
        raise RuntimeError(f"{label} failed: {result.result_string}")
    tx = result.result_data
    # Check on-chain effects, not just SDK-level success flag
    effects = getattr(tx, "effects", None)
    if effects is not None:
        status_obj = getattr(effects, "status", None)
        status_str = getattr(status_obj, "status", None)
        if status_str and status_str != "success":
            err = getattr(status_obj, "error", status_str)
            raise RuntimeError(f"{label} on-chain failure: {err}")
    digest = getattr(tx, "digest", None)
    if not digest:
        raise RuntimeError(f"{label}: no digest returned")
    return digest


def get_sui_client() -> SyncClient:
    cfg = SuiConfig.user_config(
        rpc_url="https://fullnode.testnet.sui.io:443",
        prv_keys=[os.environ["SUI_KEEPER_KEY"]],
    )
    return SyncClient(cfg)


async def upload_to_walrus(data: bytes, epochs: int = 1) -> str:
    """
    Upload blob via keeper @mysten/walrus SDK (no HTTP publisher).
    """
    env = {**os.environ, "WALRUS_EPOCHS": str(epochs)}
    proc = subprocess.run(
        ["npx", "--yes", "tsx", str(WALRUS_CLI), "upload", "reasoning.json"],
        input=data,
        capture_output=True,
        cwd=str(KEEPER_DIR),
        env=env,
        timeout=180,
        check=False,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.decode(errors="replace").strip()
        raise RuntimeError(f"Walrus SDK upload failed: {stderr}")
    # Blob id is the last non-empty stdout line (npm may echo script names).
    lines = [ln.strip() for ln in proc.stdout.decode().splitlines() if ln.strip()]
    blob_id = lines[-1] if lines else ""
    if not blob_id:
        raise ValueError("Walrus SDK returned empty blob ID")
    return blob_id


def execute_anchor_tx(
    oracle_id: str,
    reasoning_hash: bytes,        # 32 bytes SHA256
    walrus_blob_id: str,
    risk_score: int,
    hedge_budget_bps: int,
    news_signal_bps: int,
    svi_gap_bps: int,
    memory_cycles_recalled: int,
    anchored_at_ms: int,
) -> str:
    """
    Create a ReasoningAnchor shared object on Sui.
    Must be called BEFORE open_cycle_tx.
    Returns transaction digest.
    """
    client = get_sui_client()
    txn = SyncTransaction(client=client)

    txn.move_call(
        target=f"{OPENMIND_PACKAGE}::reasoning_anchor::create_anchor",
        arguments=[
            SuiAddress(VAULT_OBJECT),       # ID — pure address, not object ref
            SuiAddress(oracle_id),          # ID — pure address, not object ref
            _as_vector_u8(reasoning_hash),
            SuiU64(anchored_at_ms),
            SuiU64(risk_score),
            SuiU64(hedge_budget_bps),
            SuiU64(news_signal_bps),
            SuiU64(svi_gap_bps),
            SuiU64(memory_cycles_recalled),
            _as_vector_u8(walrus_blob_id.encode("utf-8")),
            _as_vector_u8(b"openmind-vault"),
        ],
        type_arguments=[],
    )

    result = txn.execute()
    digest = _require_tx_success(result, "Anchor tx")
    print(f"OPENMIND_ANCHOR_TX digest={digest}", file=sys.stderr)
    return digest


def execute_open_cycle_tx(
    oracle_id: str,
    strike: int,
    quantity: int,
    budget_bps: int,
    reasoning_hash: bytes,       # 32 bytes
    risk_score: int,
    news_signal_bps: int,
    svi_gap_bps: int,
    memory_cycles_recalled: int,
) -> str:
    """
    Call openmind_vault::open_cycle on Sui.
    Must be called AFTER anchor tx confirms.
    Returns transaction digest.
    """
    client = get_sui_client()
    txn = SyncTransaction(client=client)

    txn.move_call(
        target=f"{OPENMIND_PACKAGE}::openmind_vault::open_cycle",
        type_arguments=[DUSDC_TYPE],
        arguments=[
            ObjectID(VAULT_OBJECT),
            ObjectID(AGENT_CAP_OBJECT),
            ObjectID(PREDICT_SHARED),
            ObjectID(VAULT_MANAGER),
            ObjectID(oracle_id),
            SuiU64(strike),
            SuiU64(quantity),
            SuiU64(budget_bps),
            _as_vector_u8(reasoning_hash),
            SuiU64(risk_score),
            SuiU64(news_signal_bps),
            SuiU64(svi_gap_bps),
            SuiU64(memory_cycles_recalled),
            ObjectID(CLOCK_OBJECT),
        ],
    )

    result = txn.execute()
    digest = _require_tx_success(result, "open_cycle tx")
    print(f"OPENMIND_CYCLE_OPENED digest={digest}", file=sys.stderr)
    return digest


def execute_close_cycle_tx(oracle_id: str) -> str:
    """
    Call openmind_vault::close_cycle — permissionless after oracle settles.
    Returns transaction digest.
    """
    client = get_sui_client()
    txn = SyncTransaction(client=client)

    txn.move_call(
        target=f"{OPENMIND_PACKAGE}::openmind_vault::close_cycle",
        type_arguments=[DUSDC_TYPE],
        arguments=[
            ObjectID(VAULT_OBJECT),
            ObjectID(PREDICT_SHARED),
            ObjectID(VAULT_MANAGER),
            ObjectID(oracle_id),
            ObjectID(CLOCK_OBJECT),
        ],
    )

    result = txn.execute()
    digest = _require_tx_success(result, "close_cycle tx")
    print(f"OPENMIND_CYCLE_CLOSED digest={digest}", file=sys.stderr)
    return digest


def execute_open_directional_tx(
    oracle_id: str,
    strike: int,
    is_up: bool,
    quantity: int,
    p_model: int,
    p_surface: int,
    kelly_fraction_bps: int,
    reasoning_hash: bytes,
) -> str:
    """
    Call openmind_vault::open_directional_position.
    The on-chain MIN_DIRECTIONAL_EDGE_BPS check is the real backstop.
    Returns transaction digest.
    """
    client = get_sui_client()
    txn = SyncTransaction(client=client)

    from pysui.sui.sui_types.scalars import SuiBoolean

    txn.move_call(
        target=f"{OPENMIND_PACKAGE}::openmind_vault::open_directional_position",
        type_arguments=[DUSDC_TYPE],
        arguments=[
            ObjectID(VAULT_OBJECT),
            ObjectID(AGENT_CAP_OBJECT),
            ObjectID(PREDICT_SHARED),
            ObjectID(VAULT_MANAGER),
            ObjectID(oracle_id),
            SuiU64(strike),
            SuiBoolean(is_up),
            SuiU64(quantity),
            SuiU64(p_model),
            SuiU64(p_surface),
            SuiU64(kelly_fraction_bps),
            _as_vector_u8(reasoning_hash),
            ObjectID(CLOCK_OBJECT),
        ],
    )

    result = txn.execute()
    digest = _require_tx_success(result, "open_directional_position tx")
    print(f"OPENMIND_DIRECTIONAL_OPENED digest={digest}", file=sys.stderr)
    return digest


def execute_close_directional_tx(oracle_id: str) -> str:
    """Call openmind_vault::close_directional_position — permissionless."""
    client = get_sui_client()
    txn = SyncTransaction(client=client)

    txn.move_call(
        target=f"{OPENMIND_PACKAGE}::openmind_vault::close_directional_position",
        type_arguments=[DUSDC_TYPE],
        arguments=[
            ObjectID(VAULT_OBJECT),
            ObjectID(PREDICT_SHARED),
            ObjectID(VAULT_MANAGER),
            ObjectID(oracle_id),
            ObjectID(CLOCK_OBJECT),
        ],
    )

    result = txn.execute()
    digest = _require_tx_success(result, "close_directional_position tx")
    print(f"OPENMIND_DIRECTIONAL_CLOSED digest={digest}", file=sys.stderr)
    return digest
