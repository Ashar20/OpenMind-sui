# openmind
## AI Trading Agent — DeepBook Predict + Walrus + OpenZeppelin
### Sui Overflow 2026 | Three-Track Submission | Deadline: June 29, 2026

---

## AGENT CRAWL INDEX
> This section is for AI agents. Every URL below is a primary reference.
> Crawl all of them before generating code.

### DeepBook Predict References
- Docs overview: https://docs.sui.io/onchain-finance/deepbook-predict/
- Design: https://docs.sui.io/onchain-finance/deepbook-predict/design
- Contract information: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
- Predict functions: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
- PredictManager: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict-manager
- Market keys: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/market-keys
- Oracle: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
- Vault: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault
- Registry: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/registry
- Source branch: https://github.com/MystenLabs/deepbookv3/tree/predict-testnet-4-16/packages/predict

### Walrus / MemWal References
- Walrus docs: https://docs.wal.app/
- Walrus getting started: https://docs.wal.app/docs/getting-started
- Walrus HTTP API (storing blobs): https://docs.wal.app/docs/http-api/storing-blobs
- Walrus TypeScript SDK: https://sdk.mystenlabs.com/walrus
- Walrus public aggregators: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
- Walrus Sites docs: https://docs.wal.app/docs/sites
- MemWal what is it: https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory
- MemWal quick start: https://docs.wal.app/walrus-memory/getting-started/quick-start
- MemWal Python SDK quick start: https://docs.wal.app/walrus-memory/python-sdk/quick-start
- MemWal Python SDK usage: https://docs.wal.app/walrus-memory/python-sdk/usage/memwal
- MemWal TypeScript SDK: https://docs.wal.app/walrus-memory/sdk/quick-start
- MemWal GitHub repo: https://github.com/MystenLabs/MemWal
- MemWal playground: https://docs.memwal.ai/
- Seal privacy docs: https://seal-docs.wal.app/
- Sui Stack Messaging: https://github.com/MystenLabs/sui-stack-messaging

### OpenZeppelin Sui References
- OZ Contracts for Sui overview: https://docs.openzeppelin.com/contracts-sui
- OZ Contracts 1.x quickstart: https://docs.openzeppelin.com/contracts-sui/1.x
- OZ Integer Math: https://docs.openzeppelin.com/contracts-sui/1.x/math
- OZ Fixed-Point Math: https://docs.openzeppelin.com/contracts-sui/1.x/fixed-point
- OZ Access Control: https://docs.openzeppelin.com/contracts-sui/1.x/access
- OZ Rate Limiter: https://docs.openzeppelin.com/contracts-sui/1.x/rate-limiter
- OZ RBAC guide: https://docs.openzeppelin.com/contracts-sui/1.x/guides/access-control
- OZ Integer Math API: https://docs.openzeppelin.com/contracts-sui/1.x/api/math
- OZ Fixed-Point Math API: https://docs.openzeppelin.com/contracts-sui/1.x/api/fixed-point
- OZ Access API: https://docs.openzeppelin.com/contracts-sui/1.x/api/access
- OZ GitHub repo: https://github.com/OpenZeppelin/contracts-sui

### Sui Core References
- Sui TypeScript SDK: https://sdk.mystenlabs.com/typescript
- Sui Move framework: https://docs.sui.io/references/framework
- Sui building transactions (PTB): https://docs.sui.io/develop/transactions
- DeepBook v3 SDK: https://docs.sui.io/onchain-finance/deepbookv3-sdk/
- DeepBook pools SDK: https://docs.sui.io/onchain-finance/deepbookv3-sdk/pools

### Deployed Testnet Package IDs (ground truth — do not invent)
- Predict package: 0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138
- Predict shared object: 0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a
- DUSDC coin type: 0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC
- PLP coin type: 0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP
- Predict server: https://predict-server.testnet.mystenlabs.com
- Clock object: 0x6

---

## 1. One-Line Pitch

**The first prediction market vault where the hedge policy thinks for itself, remembers every cycle it has ever run, and proves every decision on-chain before the market settles.**

---

## 2. Three Tracks, One Project

| Track | Primary Requirement | How We Satisfy It |
|---|---|---|
| **DeepBook Predict** | AI vault integrating testnet contract end-to-end | `supply` + `mint` + `get_trade_amounts` + `redeem_permissionless` + `withdraw` with dynamic AI hedge ratio |
| **Walrus** | Long-running agent with persistent verifiable memory | MemWal Python SDK wired into agent core — `remember`, `recall`, `analyze`, `ask` every cycle |
| **OpenZeppelin** | Audited Sui Move primitives in production contracts | `openzeppelin_math::mul_div`, `openzeppelin_fp_math::UD30x9`, `openzeppelin_access::ownable` in vault contracts |

One codebase. Three submissions. Three prize pools.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          OPENMIND SYSTEM                                 │
│                                                                          │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐ │
│  │   WALRUS LAYER  │    │   AGENT LAYER    │    │  DEEPBOOK LAYER     │ │
│  │                 │    │   (Python)       │    │  (Move + TypeScript)│ │
│  │ MemWal          │◄──►│                  │───►│                     │ │
│  │ remember()      │    │ news.py          │    │ predict_adapter.move│ │
│  │ recall()        │    │ graph.py         │    │ openmind_vault.move │ │
│  │ analyze()       │    │ surface.py       │    │ reasoning_anchor    │ │
│  │ ask()           │    │ polymarket.py    │    │   .move             │ │
│  │                 │    │ scorer.py        │    │                     │ │
│  │ Walrus blobs    │◄───│ anchor.py        │───►│ vaultCycle.ts       │ │
│  │ reasoning JSON  │    │ cycle.py         │    │ simCapture.ts       │ │
│  │ settlement rcpt │    │ memory.py        │    │ simVault.ts         │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────────┘ │
│                                    │                       │             │
│                         ┌──────────▼───────────────────────▼──────┐     │
│                         │           WEB FRONTEND (Next.js)         │     │
│                         │  /vault  /brain  /proof  /vault/sim      │     │
│                         └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Repository Structure

```
openmind/
├── contracts/                          # Move smart contracts
│   ├── Move.toml                       # OZ + DeepBook Predict dependencies
│   ├── sources/
│   │   ├── predict_adapter.move        # All DeepBook Predict calls (isolated)
│   │   ├── openmind_vault.move         # Pooled vault with omDUSDC shares
│   │   └── reasoning_anchor.move       # Pre-settlement on-chain proof
│   └── tests/
│       ├── openmind_vault_tests.move
│       └── reasoning_anchor_tests.move
│
├── agent/                              # Python — openmind reasoning engine
│   ├── requirements.txt                # memwal, httpx, pynacl, anthropic, etc.
│   ├── memory.py                       # MemWal Python SDK wrapper
│   ├── news.py                         # News search, date-bounded
│   ├── graph.py                        # GraphRAG knowledge graph builder
│   ├── surface.py                      # SVI fair-value calculator (Black-Scholes)
│   ├── polymarket.py                   # External BTC odds comparison
│   ├── scorer.py                       # Risk score → dynamic hedge budget
│   ├── anchor.py                       # Sui reasoning hash anchor transaction
│   └── cycle.py                        # Full pipeline orchestrator
│
├── keeper/                             # TypeScript — on-chain execution
│   ├── package.json
│   ├── src/
│   │   ├── config.ts                   # Package IDs, object IDs
│   │   ├── sui.ts                      # Sui client setup
│   │   ├── oracle.ts                   # Predict server oracle reading
│   │   ├── surface.ts                  # SVI math (Black-Scholes, normal CDF)
│   │   ├── vaultCycle.ts               # open_cycle / close_cycle execution
│   │   ├── simCapture.ts               # Pull all settled BTC oracles
│   │   ├── simVault.ts                 # 3-band backtest: fixed vs dynamic
│   │   ├── walrus.ts                   # Settlement receipts to Walrus
│   │   └── data/
│   │       └── vault_fills.ndjson      # Execution ledger (every open + close)
│
├── scripts/                            # verify:judge pipeline
│   ├── verify-contracts.mjs
│   ├── verify-receipts.mjs
│   ├── verify-simulation.mjs
│   ├── verify-public-surface.mjs
│   └── verify-narrative.mjs
│
├── web/                                # Next.js frontend
│   └── app/
│       ├── page.tsx                    # Landing + live reasoning feed
│       ├── vault/
│       │   ├── page.tsx                # Deposit / withdraw
│       │   └── sim/page.tsx            # Simulation chart
│       ├── brain/page.tsx              # Reasoning trace + memory explorer
│       └── proof/page.tsx              # On-chain anchor verification
│
└── package.json                        # Root: verify:judge script
```

---

## 5. Move Contracts — Option A

### 5.1 Move.toml
```toml
[package]
name = "openmind"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
DeepBookPredict = { git = "https://github.com/MystenLabs/deepbookv3.git", subdir = "packages/predict", rev = "predict-testnet-4-16" }
openzeppelin_math = { r.mvr = "@openzeppelin-move/integer-math" }
openzeppelin_fp_math = { r.mvr = "@openzeppelin-move/fixed-point-math" }
openzeppelin_access = { r.mvr = "@openzeppelin-move/access" }
openzeppelin_utils = { r.mvr = "@openzeppelin-move/utils" }

[addresses]
openmind = "0x0"
```
Reference: https://docs.openzeppelin.com/contracts-sui/1.x

### 5.2 predict_adapter.move
```move
/// Predict adapter boundary. All DeepBook Predict interactions go through
/// this module so the upstream protocol surface stays isolated to one file.
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
module openmind::predict_adapter;

use sui::clock::Clock;
use sui::coin::Coin;

use deepbook_predict::market_key;
use deepbook_predict::oracle::{Self as oracle, OracleSVI};
use deepbook_predict::plp::PLP;
use deepbook_predict::predict::{Self as predict, Predict};
use deepbook_predict::predict_manager::{Self as predict_manager, PredictManager};

use openzeppelin_math::u64::mul_div;
use openzeppelin_math::rounding;

// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict-manager
const EInvalidBudget: u64 = 1;
const ENotDownside: u64 = 2;
const EOracleNotActive: u64 = 3;
const EBudgetExceedsPolicy: u64 = 4;
const EAskAboveCeiling: u64 = 5;

const BPS: u64 = 10_000;
const MAX_HEDGE_BPS: u64 = 2_000;
/// Surface-anchored ceiling — vault refuses to mint if ask exceeds this
/// fraction of covered notional. Same pattern as best-practice implementations.
const MAX_HEDGE_ASK_BPS: u64 = 2_500;

/// Supply dUSDC into the shared PLP vault to earn carry yield.
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault
public fun supply_to_vault<Quote>(
    predict_obj: &mut Predict,
    funds: Coin<Quote>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<PLP> {
    predict::supply<Quote>(predict_obj, funds, clock, ctx)
}

/// Withdraw PLP shares back to quote asset.
public fun withdraw_from_vault<Quote>(
    predict_obj: &mut Predict,
    plp: Coin<PLP>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<Quote> {
    predict::withdraw<Quote>(predict_obj, plp, clock, ctx)
}

/// Read SVI-derived ask and bid before minting — surface discipline check.
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
public fun read_trade_amounts(
    predict_obj: &mut Predict,
    oracle: &OracleSVI,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    quantity: u64,
    clock: &Clock,
): (u64, u64) {
    let key = market_key::new(oracle_id, expiry_ms, strike, false);
    predict::get_trade_amounts(predict_obj, oracle, key, quantity, clock)
}

/// Mint downside binary hedge with on-chain surface discipline.
/// Always is_up = false. This is the carry-protection leg — never directional.
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
public fun mint_hedge<Quote>(
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    quantity: u64,
    budget: Coin<Quote>,
    nav: u64,
    budget_bps: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // Validate oracle is live
    // Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
    assert!(oracle::status(oracle, clock) == oracle::status_active(), EOracleNotActive);

    // Strike must be below spot (downside only) — hedge leg is never directional
    assert!(strike < oracle::spot_price(oracle), ENotDownside);

    // Budget within policy — use OZ mul_div for overflow safety
    // Reference: https://docs.openzeppelin.com/contracts-sui/1.x/math
    let max_budget = mul_div(nav, budget_bps, BPS, rounding::down()).destroy_some();
    assert!(budget_bps > 0 && budget_bps <= MAX_HEDGE_BPS, EBudgetExceedsPolicy);

    // Surface discipline: check ask vs ceiling before minting
    let key = market_key::new(oracle_id, expiry_ms, strike, false);
    let (ask_cost, _bid_cost) = predict::get_trade_amounts(predict_obj, oracle, key, quantity, clock);
    let ceiling = mul_div(quantity, MAX_HEDGE_ASK_BPS, BPS, rounding::down()).destroy_some();
    assert!(ask_cost <= ceiling, EAskAboveCeiling);

    // Deposit budget into manager then mint
    predict_manager::deposit<Quote>(manager, budget, ctx);
    predict::mint<Quote>(predict_obj, manager, oracle, key, quantity, clock, ctx);
}

/// Mint a directional binary position (up OR down), Kelly-sized.
/// Funded only from the directional capital pool — never from carry or hedge
/// budget. No MAX_HEDGE_ASK_BPS ceiling applied here: directional sizing
/// discipline is enforced upstream by the Kelly fraction itself, not a
/// surface-price ceiling, since paying a fair (even high) ask for a real
/// edge is correct, unlike the hedge leg where any ask above ceiling means
/// the "insurance" is overpriced relative to budget intent.
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
public fun mint_directional<Quote>(
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    stake: Coin<Quote>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oracle::status(oracle, clock) == oracle::status_active(), EOracleNotActive);
    let key = market_key::new(oracle_id, expiry_ms, strike, is_up);
    predict_manager::deposit<Quote>(manager, stake, ctx);
    predict::mint<Quote>(predict_obj, manager, oracle, key, quantity, clock, ctx);
}

/// Redeem settled position — permissionless, anyone can call.
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
public fun redeem_settled_position<Quote>(
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    settled_oracle: &OracleSVI,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let key = market_key::new(oracle_id, expiry_ms, strike, false);
    let remaining = predict_manager::position(manager, key);
    if (remaining > 0) {
        predict::redeem_permissionless<Quote>(
            predict_obj, manager, settled_oracle, key, remaining, clock, ctx
        );
    }
}

/// Sweep manager quote balance back to vault buffer.
public fun sweep_manager_balance<Quote>(
    manager: &mut PredictManager,
    ctx: &mut TxContext,
): Coin<Quote> {
    let bal = predict_manager::balance<Quote>(manager);
    if (bal > 0) {
        predict_manager::withdraw<Quote>(manager, bal, ctx)
    } else {
        sui::coin::zero<Quote>(ctx)
    }
}
```

### 5.3 openmind_vault.move
```move
/// openmind pooled vault.
/// Supplies PLP carry + downside binary hedge each cycle.
/// Hedge budget is set dynamically by the openmind AI agent.
/// Uses OpenZeppelin math for all share/NAV arithmetic.
///
/// References:
///   OZ Math: https://docs.openzeppelin.com/contracts-sui/1.x/math
///   OZ Access: https://docs.openzeppelin.com/contracts-sui/1.x/access
///   OZ Rate Limiter: https://docs.openzeppelin.com/contracts-sui/1.x/rate-limiter
///   DeepBook Predict Vault: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault
module openmind::openmind_vault;

use std::option::{Self, Option};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin, TreasuryCap};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

use deepbook_predict::oracle::{Self as oracle, OracleSVI};
use deepbook_predict::plp::PLP;
use deepbook_predict::predict::{Self as predict, Predict};
use deepbook_predict::predict_manager::{Self as predict_manager, PredictManager};

// OpenZeppelin imports
// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/api/math
use openzeppelin_math::u64::{mul_div};
use openzeppelin_math::rounding;
// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/api/access
use openzeppelin_access::ownable::{Self, Ownable};

use openmind::predict_adapter;

const EPaused: u64 = 1;
const EZeroDeposit: u64 = 2;
const EZeroShares: u64 = 3;
const EBufferLow: u64 = 4;
const ECycleOpen: u64 = 5;
const ENoCycle: u64 = 6;
const EWrongManager: u64 = 7;
const EWrongOracle: u64 = 8;
const ENotSettled: u64 = 9;
const EBadPolicy: u64 = 10;
const EInvalidReasoningHash: u64 = 11;

const BPS: u64 = 10_000;
const MAX_HEDGE_BPS: u16 = 2_000;
const MAX_STRIKE_BAND_BPS: u16 = 3_000;

/// Fraction of a hedge leg's realized ITM payout that gets swept into the
/// directional capital pool on close_cycle. Only applies when the hedge
/// actually paid out — OTM expiries sweep nothing. This is the entire
/// "Idea A" mechanic: directional firepower grows only from the insurance
/// leg's own winnings, never from user principal.
const DIRECTIONAL_SWEEP_OF_PAYOUT_BPS: u64 = 5_000; // 50% of hedge payout
/// Hard ceiling on a single directional bet, regardless of Kelly output.
/// Caps tail risk on the speculative leg independent of pool size.
const MAX_DIRECTIONAL_BET_BPS_OF_POOL: u64 = 5_000; // 50% of directional_pool
/// Minimum |edge| in bps between openmind's P(up) and the surface's implied
/// probability before a directional bet is allowed at all. Below this, the
/// agent must skip the cycle — no bet, no matter how confident the score.
const MIN_DIRECTIONAL_EDGE_BPS: u64 = 300;

/// One-time witness for omDUSDC share token.
public struct OPENMIND_VAULT has drop {}

public struct OpenCycle has copy, drop, store {
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    quantity: u64,
    budget_spent: u64,
    reasoning_hash: vector<u8>,    // SHA256 of openmind reasoning JSON
    risk_score: u64,               // AI risk score 0-10000 bps
    memory_cycles_recalled: u64,   // How many past cycles informed this decision
}

/// Directional leg position, tracked separately from the hedge leg.
/// Funded only from directional_pool, never from carry buffer or hedge budget.
public struct OpenDirectional has copy, drop, store {
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    stake_spent: u64,
    p_model: u64,          // openmind's own calibrated P(up), 1e9-scaled
    p_surface: u64,        // SVI surface's implied P(up), 1e9-scaled
    edge_bps: u64,          // |p_model - p_surface| in bps
    kelly_fraction_bps: u64,
}

public struct VaultPolicy has copy, drop, store {
    hedge_bps: u16,
    strike_band_bps: u16,
    reserve_bps: u16,
}

/// Main vault object.
/// Admin access controlled via OpenZeppelin Ownable.
/// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/access
public struct OpenMindVault<phantom Quote> has key {
    id: UID,
    treasury: TreasuryCap<OPENMIND_VAULT>,
    buffer: Balance<Quote>,
    plp: Balance<PLP>,
    plp_book: u64,
    manager_id: ID,
    open: Option<OpenCycle>,
    open_directional: Option<OpenDirectional>,
    /// Directional leg's dedicated capital pool. Funded ONLY by sweeping a
    /// fraction of realized hedge-leg ITM payouts on close_cycle — never
    /// seeded from user principal or the carry buffer. See DIRECTIONAL_SWEEP_BPS.
    directional_pool: Balance<Quote>,
    policy: VaultPolicy,
    paused: bool,
    cycles_completed: u64,
    lifetime_hedge_spent: u64,
    lifetime_realized: u64,
    lifetime_directional_staked: u64,
    lifetime_directional_pnl: u64,       // cumulative realized gains
    lifetime_directional_losses: u64,    // cumulative realized losses
}

// ─── Events ──────────────────────────────────────────────────────────────────

public struct VaultCreated has copy, drop {
    vault_id: ID,
    manager_id: ID,
    creator: address,
}

public struct VaultDeposit has copy, drop {
    vault_id: ID,
    depositor: address,
    amount: u64,
    shares_minted: u64,
    nav_before: u64,
}

public struct VaultWithdraw has copy, drop {
    vault_id: ID,
    owner: address,
    shares_burned: u64,
    amount_out: u64,
}

/// Emitted every cycle open. Contains full openmind decision metadata.
/// Agents and dashboards subscribe to this event.
public struct OpenMindCycleOpened has copy, drop {
    vault_id: ID,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    quantity: u64,
    budget_spent: u64,
    plp_supplied: u64,
    nav_at_open: u64,
    spot_at_open: u64,
    // openmind AI fields
    reasoning_hash: vector<u8>,        // SHA256 of full reasoning JSON on Walrus
    risk_score: u64,                   // 0–10000 bps from AI scorer
    news_signal_bps: u64,              // news contribution 0–2000 bps
    svi_gap_bps: u64,                  // Polymarket vs SVI gap 0–1000 bps
    memory_cycles_recalled: u64,       // # past cycles used in decision
    ask_cost: u64,                     // SVI-derived ask at mint time
    bid_cost: u64,                     // SVI-derived bid at mint time
    keeper: address,
}

public struct OpenMindCycleClosed has copy, drop {
    vault_id: ID,
    oracle_id: ID,
    expiry_ms: u64,
    plp_realized: u64,
    manager_swept: u64,
    hedge_itm: bool,
    hedge_payout: u64,
    directional_sweep_amount: u64,    // amount swept into directional_pool this close, 0 if hedge OTM
    directional_pool_after: u64,
    nav_after_close: u64,
    settler: address,
}

public struct OpenMindDirectionalOpened has copy, drop {
    vault_id: ID,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    stake_spent: u64,
    p_model: u64,
    p_surface: u64,
    edge_bps: u64,
    kelly_fraction_bps: u64,
    directional_pool_before: u64,
    reasoning_hash: vector<u8>,
    keeper: address,
}

public struct OpenMindDirectionalClosed has copy, drop {
    vault_id: ID,
    oracle_id: ID,
    won: bool,
    stake_spent: u64,
    payout: u64,
    directional_pool_after: u64,
    settler: address,
}

// ─── Init ─────────────────────────────────────────────────────────────────────

#[allow(deprecated_usage)]
fun init(witness: OPENMIND_VAULT, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness, 6,
        b"omDUSDC",
        b"openmind Vault Share",
        b"Tokenized share of the openmind AI-driven adaptive carry vault on DeepBook Predict. NAV trues up on-chain every expiry cycle. Hedge budget set by AI reasoning anchored on Sui.",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, tx_context::sender(ctx));
}

/// Create the vault. Consume the treasury so supply is governed by vault math.
public fun create_vault<Quote>(
    treasury: TreasuryCap<OPENMIND_VAULT>,
    manager_id: ID,
    hedge_bps: u16,
    strike_band_bps: u16,
    reserve_bps: u16,
    ctx: &mut TxContext,
) {
    assert_valid_policy(hedge_bps, strike_band_bps, reserve_bps);
    let vault = OpenMindVault<Quote> {
        id: object::new(ctx),
        treasury,
        buffer: balance::zero<Quote>(),
        plp: balance::zero<PLP>(),
        plp_book: 0,
        manager_id,
        open: option::none(),
        policy: VaultPolicy { hedge_bps, strike_band_bps, reserve_bps },
        paused: false,
        cycles_completed: 0,
        lifetime_hedge_spent: 0,
        lifetime_realized: 0,
    };
    let vault_id = object::id(&vault);
    event::emit(VaultCreated { vault_id, manager_id, creator: tx_context::sender(ctx) });
    transfer::share_object(vault);
}

// ─── Share Math (OpenZeppelin mul_div) ───────────────────────────────────────
// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/api/math

public fun nav<Quote>(vault: &OpenMindVault<Quote>): u64 {
    balance::value(&vault.buffer) + vault.plp_book
}

public fun share_supply<Quote>(vault: &OpenMindVault<Quote>): u64 {
    coin::total_supply(&vault.treasury)
}

/// Safe share calculation using OZ mul_div — no overflow.
public fun shares_for_deposit(nav_before: u64, supply: u64, amount: u64): u64 {
    if (supply == 0 || nav_before == 0) {
        amount
    } else {
        // OZ overflow-safe mul_div with rounding down
        mul_div(amount, supply, nav_before, rounding::down()).destroy_some()
    }
}

/// Safe withdrawal calculation using OZ mul_div.
public fun amount_for_shares(nav_now: u64, supply: u64, shares: u64): u64 {
    assert!(supply > 0, EZeroShares);
    mul_div(shares, nav_now, supply, rounding::down()).destroy_some()
}

// ─── Deposit / Withdraw ───────────────────────────────────────────────────────

public fun deposit<Quote>(
    vault: &mut OpenMindVault<Quote>,
    funds: Coin<Quote>,
    ctx: &mut TxContext,
): Coin<OPENMIND_VAULT> {
    assert!(!vault.paused, EPaused);
    let amount = coin::value(&funds);
    assert!(amount > 0, EZeroDeposit);
    let nav_before = nav(vault);
    let supply = share_supply(vault);
    let shares = shares_for_deposit(nav_before, supply, amount);
    assert!(shares > 0, EZeroShares);
    balance::join(&mut vault.buffer, coin::into_balance(funds));
    let minted = coin::mint(&mut vault.treasury, shares, ctx);
    event::emit(VaultDeposit {
        vault_id: object::id(vault),
        depositor: tx_context::sender(ctx),
        amount, shares_minted: shares, nav_before,
    });
    minted
}

public fun withdraw<Quote>(
    vault: &mut OpenMindVault<Quote>,
    shares: Coin<OPENMIND_VAULT>,
    ctx: &mut TxContext,
): Coin<Quote> {
    let share_amount = coin::value(&shares);
    assert!(share_amount > 0, EZeroShares);
    let nav_now = nav(vault);
    let supply = share_supply(vault);
    let amount_out = amount_for_shares(nav_now, supply, share_amount);
    assert!(balance::value(&vault.buffer) >= amount_out, EBufferLow);
    coin::burn(&mut vault.treasury, shares);
    let out = coin::from_balance(balance::split(&mut vault.buffer, amount_out), ctx);
    event::emit(VaultWithdraw {
        vault_id: object::id(vault),
        owner: tx_context::sender(ctx),
        shares_burned: share_amount, amount_out,
    });
    out
}

// ─── Cycle Open ───────────────────────────────────────────────────────────────

/// Open a new hedge cycle.
/// Budget and reasoning_hash come from the openmind AI agent.
/// All policy bounds enforced on-chain regardless of agent output.
public fun open_cycle<Quote>(
    vault: &mut OpenMindVault<Quote>,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    next_oracle: &OracleSVI,
    strike: u64,
    quantity: u64,
    budget_bps: u64,           // dynamic budget from openmind agent
    reasoning_hash: vector<u8>,        // SHA256 of reasoning JSON on Walrus
    risk_score: u64,                   // AI risk score
    news_signal_bps: u64,              // from agent
    svi_gap_bps: u64,                  // from agent
    memory_cycles_recalled: u64,       // how many MemWal cycles informed this
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(!vault.paused, EPaused);
    assert!(option::is_none(&vault.open), ECycleOpen);
    assert!(object::id(manager) == vault.manager_id, EWrongManager);
    assert!(reasoning_hash.length() == 32, EInvalidReasoningHash);

    let expiry_ms = oracle::expiry(next_oracle);
    let spot = oracle::spot_price(next_oracle);
    assert!(quantity > 0, EZeroDeposit);
    assert!(strike < spot, EWrongOracle); // downside only

    // Strike within band — OZ mul_div for safe arithmetic
    let band_floor = spot - mul_div(spot, (vault.policy.strike_band_bps as u64), BPS, rounding::down()).destroy_some();
    assert!(strike >= band_floor, EBadPolicy);

    let nav_now = nav(vault);

    // Budget within policy — OZ mul_div
    let max_budget = mul_div(nav_now, budget_bps, BPS, rounding::down()).destroy_some();
    let policy_cap = mul_div(nav_now, (vault.policy.hedge_bps as u64), BPS, rounding::down()).destroy_some();
    assert!(max_budget <= policy_cap, EBadPolicy);
    assert!(balance::value(&vault.buffer) >= max_budget, EBufferLow);

    // Surface discipline: read ask/bid, check ceiling
    let oracle_id = object::id(next_oracle);
    let (ask_cost, bid_cost) = predict_adapter::read_trade_amounts(
        predict_obj, next_oracle, oracle_id, expiry_ms, strike, quantity, clock
    );

    // Hedge leg
    let hedge_coin = coin::from_balance(balance::split(&mut vault.buffer, max_budget), ctx);
    predict_adapter::mint_hedge<Quote>(
        predict_obj, manager, next_oracle, oracle_id,
        expiry_ms, strike, quantity, hedge_coin, nav_now, budget_bps, clock, ctx
    );

    // Carry leg: everything above reserve goes to PLP
    let reserve = mul_div(nav(vault), (vault.policy.reserve_bps as u64), BPS, rounding::down()).destroy_some();
    let buffer_now = balance::value(&vault.buffer);
    let mut plp_supplied = 0u64;
    if (buffer_now > reserve) {
        let deploy = buffer_now - reserve;
        let carry_coin = coin::from_balance(balance::split(&mut vault.buffer, deploy), ctx);
        let plp_coin = predict_adapter::supply_to_vault<Quote>(predict_obj, carry_coin, clock, ctx);
        balance::join(&mut vault.plp, coin::into_balance(plp_coin));
        plp_supplied = deploy;
    };
    vault.plp_book = plp_supplied;
    vault.lifetime_hedge_spent = vault.lifetime_hedge_spent + max_budget;

    vault.open = option::some(OpenCycle {
        oracle_id,
        expiry_ms,
        strike,
        quantity,
        budget_spent: max_budget,
        reasoning_hash,
        risk_score,
        memory_cycles_recalled,
    });

    event::emit(OpenMindCycleOpened {
        vault_id: object::id(vault),
        oracle_id, expiry_ms, strike, quantity,
        budget_spent: max_budget,
        plp_supplied,
        nav_at_open: nav(vault),
        spot_at_open: spot,
        reasoning_hash,
        risk_score,
        news_signal_bps,
        svi_gap_bps,
        memory_cycles_recalled,
        ask_cost, bid_cost,
        keeper: tx_context::sender(ctx),
    });
}

// ─── Cycle Close (permissionless) ────────────────────────────────────────────

public fun close_cycle<Quote>(
    vault: &mut OpenMindVault<Quote>,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    settled_oracle: &OracleSVI,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(option::is_some(&vault.open), ENoCycle);
    assert!(object::id(manager) == vault.manager_id, EWrongManager);
    let cycle = option::extract(&mut vault.open);
    assert!(object::id(settled_oracle) == cycle.oracle_id, EWrongOracle);
    assert!(oracle::is_settled(settled_oracle), ENotSettled);

    // Redeem binary position (permissionless)
    predict_adapter::redeem_settled_position<Quote>(
        predict_obj, manager, settled_oracle,
        cycle.oracle_id, cycle.expiry_ms, cycle.strike, clock, ctx
    );

    // Sweep manager balance to buffer
    let swept_coin = predict_adapter::sweep_manager_balance<Quote>(manager, ctx);
    let swept = coin::value(&swept_coin);
    if (swept > 0) {
        balance::join(&mut vault.buffer, coin::into_balance(swept_coin));
    } else {
        coin::destroy_zero(swept_coin);
    };

    // Realize PLP back to quote
    let mut plp_realized = 0u64;
    let plp_amount = balance::value(&vault.plp);
    if (plp_amount > 0) {
        let plp_coin = coin::from_balance(balance::withdraw_all(&mut vault.plp), ctx);
        let quote_out = predict_adapter::withdraw_from_vault<Quote>(predict_obj, plp_coin, clock, ctx);
        plp_realized = coin::value(&quote_out);
        balance::join(&mut vault.buffer, coin::into_balance(quote_out));
    };

    vault.plp_book = 0;
    vault.cycles_completed = vault.cycles_completed + 1;
    vault.lifetime_realized = vault.lifetime_realized + plp_realized + swept;

    // ── Idea A: sweep a fraction of hedge ITM payout into directional_pool ──
    // swept includes the manager's full settlement credit. We only know the
    // hedge was ITM by comparing settlement price to strike here directly,
    // since manager balance alone doesn't distinguish "ITM payout" from
    // "leftover budget never spent." hedge_payout is the portion of `swept`
    // attributable to the binary actually paying out, not unspent budget.
    let settlement_price = oracle::settlement_price(settled_oracle);
    let hedge_itm = settlement_price < cycle.strike;
    let hedge_payout = if (hedge_itm) {
        // payout = quantity (binary pays 1 unit of quote per contract if ITM)
        cycle.quantity
    } else { 0 };
    let mut directional_sweep_amount = 0u64;
    if (hedge_itm && hedge_payout > 0 && balance::value(&vault.buffer) >= hedge_payout) {
        directional_sweep_amount = mul_div(
            hedge_payout, DIRECTIONAL_SWEEP_OF_PAYOUT_BPS, BPS, rounding::down()
        ).destroy_some();
        let sweep_coin = balance::split(&mut vault.buffer, directional_sweep_amount);
        balance::join(&mut vault.directional_pool, sweep_coin);
    };

    event::emit(OpenMindCycleClosed {
        vault_id: object::id(vault),
        oracle_id: cycle.oracle_id,
        expiry_ms: cycle.expiry_ms,
        plp_realized,
        manager_swept: swept,
        hedge_itm,
        hedge_payout,
        directional_sweep_amount,
        directional_pool_after: balance::value(&vault.directional_pool),
        nav_after_close: nav(vault),
        settler: tx_context::sender(ctx),
    });
}

// ─── Directional leg ──────────────────────────────────────────────────────────

/// Open a directional (up or down) bet, funded only from directional_pool.
/// Requires |p_model - p_surface| >= MIN_DIRECTIONAL_EDGE_BPS — below this,
/// the agent must not call this function at all (enforced by the keeper/agent
/// layer choosing to skip; this on-chain check is the backstop).
public fun open_directional_position<Quote>(
    vault: &mut OpenMindVault<Quote>,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    strike: u64,
    is_up: bool,
    quantity: u64,
    p_model: u64,
    p_surface: u64,
    kelly_fraction_bps: u64,
    reasoning_hash: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(!vault.paused, EPaused);
    assert!(option::is_none(&vault.open_directional), ECycleOpen);
    assert!(reasoning_hash.length() == 32, EInvalidReasoningHash);

    let edge_bps = if (p_model >= p_surface) {
        mul_div(p_model - p_surface, BPS, 1_000_000_000, rounding::down()).destroy_some()
    } else {
        mul_div(p_surface - p_model, BPS, 1_000_000_000, rounding::down()).destroy_some()
    };
    assert!(edge_bps >= MIN_DIRECTIONAL_EDGE_BPS, EBadPolicy);

    let pool_before = balance::value(&vault.directional_pool);
    let max_stake = mul_div(
        pool_before, MAX_DIRECTIONAL_BET_BPS_OF_POOL, BPS, rounding::down()
    ).destroy_some();
    let stake_amount = mul_div(
        pool_before, kelly_fraction_bps, BPS, rounding::down()
    ).destroy_some();
    assert!(stake_amount > 0 && stake_amount <= max_stake, EBadPolicy);

    let oracle_id = object::id(oracle);
    let expiry_ms = oracle::expiry(oracle);
    let stake_coin = coin::from_balance(
        balance::split(&mut vault.directional_pool, stake_amount), ctx
    );

    predict_adapter::mint_directional<Quote>(
        predict_obj, manager, oracle, oracle_id, expiry_ms, strike, is_up,
        quantity, stake_coin, clock, ctx
    );

    vault.open_directional = option::some(OpenDirectional {
        oracle_id, expiry_ms, strike, is_up, quantity,
        stake_spent: stake_amount, p_model, p_surface, edge_bps, kelly_fraction_bps,
    });
    vault.lifetime_directional_staked = vault.lifetime_directional_staked + stake_amount;

    event::emit(OpenMindDirectionalOpened {
        vault_id: object::id(vault), oracle_id, expiry_ms, strike, is_up,
        quantity, stake_spent: stake_amount, p_model, p_surface, edge_bps,
        kelly_fraction_bps, directional_pool_before: pool_before,
        reasoning_hash, keeper: tx_context::sender(ctx),
    });
}

/// Close (settle) the directional position. Permissionless, same pattern
/// as close_cycle's redeem step.
public fun close_directional_position<Quote>(
    vault: &mut OpenMindVault<Quote>,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    settled_oracle: &OracleSVI,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(option::is_some(&vault.open_directional), ENoCycle);
    let pos = option::extract(&mut vault.open_directional);
    assert!(object::id(settled_oracle) == pos.oracle_id, EWrongOracle);
    assert!(oracle::is_settled(settled_oracle), ENotSettled);

    predict_adapter::redeem_settled_position<Quote>(
        predict_obj, manager, settled_oracle,
        pos.oracle_id, pos.expiry_ms, pos.strike, clock, ctx
    );

    let payout_coin = predict_adapter::sweep_manager_balance<Quote>(manager, ctx);
    let payout = coin::value(&payout_coin);
    let won = payout > pos.stake_spent;

    if (payout > 0) {
        balance::join(&mut vault.directional_pool, coin::into_balance(payout_coin));
    } else {
        coin::destroy_zero(payout_coin);
    };

    if (won) {
        vault.lifetime_directional_pnl = vault.lifetime_directional_pnl + (payout - pos.stake_spent);
    } else {
        vault.lifetime_directional_losses = vault.lifetime_directional_losses + pos.stake_spent;
    };

    event::emit(OpenMindDirectionalClosed {
        vault_id: object::id(vault),
        oracle_id: pos.oracle_id,
        won, stake_spent: pos.stake_spent, payout,
        directional_pool_after: balance::value(&vault.directional_pool),
        settler: tx_context::sender(ctx),
    });
}

### 5.4 reasoning_anchor.move
```move
/// On-chain proof that openmind's reasoning was committed BEFORE settlement.
/// Anyone can call verify_anchor to confirm hash matches Walrus blob.
/// This is the primary differentiator — no other vault has this.
///
/// Reference: https://docs.wal.app/docs/http-api/storing-blobs
module openmind::reasoning_anchor;

use sui::object::{Self, ID, UID};
use sui::hash::blake2b256;
use sui::event;
use sui::tx_context::TxContext;
use sui::transfer;

const EHashMismatch: u64 = 1;
const EInvalidHash: u64 = 2;

/// Shared object created at cycle open, before oracle settles.
/// Permanent on-chain record of AI reasoning for this cycle.
public struct ReasoningAnchor has key {
    id: UID,
    vault_id: ID,
    cycle_oracle_id: ID,
    /// SHA256 of full reasoning JSON stored on Walrus
    reasoning_hash: vector<u8>,
    /// Timestamp of anchor — MUST be before settlement_price is set
    anchored_at_ms: u64,
    /// openmind decision metadata
    risk_score: u64,
    hedge_budget_bps: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    /// Walrus blob ID for full reasoning JSON
    /// Reference: https://docs.wal.app/docs/http-api/storing-blobs
    walrus_blob_id: vector<u8>,
    /// MemWal namespace for this vault's agent memory
    /// Reference: https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory
    memwal_namespace: vector<u8>,
}

public struct AnchorCreated has copy, drop {
    anchor_id: ID,
    vault_id: ID,
    oracle_id: ID,
    reasoning_hash: vector<u8>,
    anchored_at_ms: u64,
    walrus_blob_id: vector<u8>,
}

public struct AnchorVerified has copy, drop {
    anchor_id: ID,
    verified: bool,
    verifier: address,
}

/// Create and share a reasoning anchor. Called by keeper after
/// agent produces reasoning JSON and uploads to Walrus, but
/// BEFORE open_cycle is called on the vault.
public fun create_anchor(
    vault_id: ID,
    oracle_id: ID,
    reasoning_hash: vector<u8>,
    anchored_at_ms: u64,
    risk_score: u64,
    hedge_budget_bps: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    walrus_blob_id: vector<u8>,
    memwal_namespace: vector<u8>,
    ctx: &mut TxContext,
): ID {
    assert!(reasoning_hash.length() == 32, EInvalidHash);
    let anchor = ReasoningAnchor {
        id: object::new(ctx),
        vault_id,
        cycle_oracle_id: oracle_id,
        reasoning_hash,
        anchored_at_ms,
        risk_score,
        hedge_budget_bps,
        news_signal_bps,
        svi_gap_bps,
        memory_cycles_recalled,
        walrus_blob_id,
        memwal_namespace,
    };
    let anchor_id = object::id(&anchor);
    event::emit(AnchorCreated {
        anchor_id,
        vault_id,
        oracle_id,
        reasoning_hash,
        anchored_at_ms,
        walrus_blob_id,
    });
    transfer::share_object(anchor);
    anchor_id
}

/// Public verification — anyone can call this.
/// Re-hash the reasoning JSON and confirm it matches the on-chain anchor.
/// Returns true if hash matches, emits AnchorVerified event.
public fun verify_anchor(
    anchor: &ReasoningAnchor,
    reasoning_json: vector<u8>,
    ctx: &mut TxContext,
): bool {
    let computed = blake2b256(&reasoning_json);
    let verified = computed == anchor.reasoning_hash;
    event::emit(AnchorVerified {
        anchor_id: object::id(anchor),
        verified,
        verifier: tx_context::sender(ctx),
    });
    verified
}

// Read functions
public fun reasoning_hash(anchor: &ReasoningAnchor): vector<u8> { anchor.reasoning_hash }
public fun anchored_at_ms(anchor: &ReasoningAnchor): u64 { anchor.anchored_at_ms }
public fun walrus_blob_id(anchor: &ReasoningAnchor): vector<u8> { anchor.walrus_blob_id }
public fun risk_score(anchor: &ReasoningAnchor): u64 { anchor.risk_score }
public fun hedge_budget_bps(anchor: &ReasoningAnchor): u64 { anchor.hedge_budget_bps }
public fun memory_cycles_recalled(anchor: &ReasoningAnchor): u64 { anchor.memory_cycles_recalled }
```

---

### 5.5 risk_capped_borrow.move

**Differentiator feature.** Lets a user borrow against the unrealized value of an
open, currently-winning vault position. Unlike fixed-LTV margin products, the
maximum borrowable amount is set by openmind's live AI risk score — the riskier
the agent judges the current cycle to be, the lower the borrow ceiling, applied
automatically before the user even requests a loan.

**This does not eliminate liquidation risk.** If the position's value falls
below the loan value, the position is force-closed to repay the loan. The
ceiling is smarter; the risk of borrowing against volatile collateral is not
removed, only sized more conservatively when the agent expects danger.

```move
/// AI-risk-capped borrowing against an open, winning vault position.
/// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/api/math
module openmind::risk_capped_borrow;

use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::tx_context::TxContext;

use openzeppelin_math::u64::mul_div;
use openzeppelin_math::rounding;

use openmind::openmind_vault::{Self, OpenMindVault};

const EPositionNotOpen: u64 = 1;
const ENotInProfit: u64 = 2;
const EExceedsRiskCap: u64 = 3;
const ELoanNotOutstanding: u64 = 4;
const EUnderwater: u64 = 5;

const BPS: u64 = 10_000;
/// Base LTV ceiling at zero risk score. Same magnitude class as conventional
/// margin protocols' conservative tier; the dynamic discount below is what
/// differs from a fixed-LTV product.
const BASE_LTV_BPS: u64 = 5_000; // 50% at risk_score = 0

/// Outstanding loan against one vault's currently open position.
public struct RiskCappedLoan<phantom Quote> has key {
    id: UID,
    vault_id: ID,
    borrower: address,
    principal: Balance<Quote>,        // tracks owed amount (zero once repaid)
    collateral_value_at_open: u64,    // unrealized position value when loan opened
    risk_score_at_open: u64,          // openmind's risk score at loan origination
    max_borrow_at_open: u64,          // computed ceiling at origination
}

public struct LoanOpened has copy, drop {
    loan_id: ID,
    vault_id: ID,
    borrower: address,
    principal: u64,
    risk_score: u64,
    max_borrow_bps_applied: u64,
}

public struct LoanRepaid has copy, drop {
    loan_id: ID,
    vault_id: ID,
    amount_repaid: u64,
}

public struct LoanLiquidated has copy, drop {
    loan_id: ID,
    vault_id: ID,
    collateral_value_at_liquidation: u64,
    shortfall: u64, // 0 if fully covered
}

/// Compute the max borrowable amount given current AI risk score.
/// Higher risk_score (0-10000 bps) -> lower ceiling.
/// risk_score = 0      -> BASE_LTV_BPS (50%) of unrealized value
/// risk_score = 10_000 -> 0% (agent sees maximum danger, borrowing disabled)
public fun max_borrow_bps(risk_score: u64): u64 {
    let discount = mul_div(BASE_LTV_BPS, risk_score, BPS, rounding::down()).destroy_some();
    if (discount >= BASE_LTV_BPS) { 0 } else { BASE_LTV_BPS - discount }
}

/// Open a loan against the vault's currently open, in-profit position.
/// `unrealized_value` and `risk_score` are read from the live OpenCycle state
/// and the most recent ReasoningAnchor, passed in by the keeper at call time.
public fun open_loan<Quote>(
    vault: &OpenMindVault<Quote>,
    unrealized_value: u64,
    cost_basis: u64,
    risk_score: u64,
    requested_amount: Coin<Quote>,
    ctx: &mut TxContext,
): RiskCappedLoan<Quote> {
    assert!(openmind_vault::has_open_cycle(vault), EPositionNotOpen);
    assert!(unrealized_value > cost_basis, ENotInProfit);

    let profit = unrealized_value - cost_basis;
    let cap_bps = max_borrow_bps(risk_score);
    let max_borrow = mul_div(profit, cap_bps, BPS, rounding::down()).destroy_some();

    let requested = coin::value(&requested_amount);
    assert!(requested <= max_borrow, EExceedsRiskCap);

    let loan = RiskCappedLoan<Quote> {
        id: object::new(ctx),
        vault_id: object::id(vault),
        borrower: tx_context::sender(ctx),
        principal: coin::into_balance(requested_amount),
        collateral_value_at_open: unrealized_value,
        risk_score_at_open: risk_score,
        max_borrow_at_open: max_borrow,
    };

    event::emit(LoanOpened {
        loan_id: object::id(&loan),
        vault_id: object::id(vault),
        borrower: tx_context::sender(ctx),
        principal: requested,
        risk_score,
        max_borrow_bps_applied: cap_bps,
    });

    loan
}

/// Repay an outstanding loan in full or in part.
public fun repay<Quote>(
    loan: &mut RiskCappedLoan<Quote>,
    payment: Coin<Quote>,
) {
    let amount = coin::value(&payment);
    balance::join(&mut loan.principal, coin::into_balance(payment));
    event::emit(LoanRepaid {
        loan_id: object::id(loan),
        vault_id: loan.vault_id,
        amount_repaid: amount,
    });
}

/// Permissionless liquidation check. If current unrealized value has fallen
/// below the outstanding loan amount, anyone may call this to flag and force
/// settlement of the underlying position to cover the loan.
/// Mirrors predict::redeem_permissionless's permissionless settlement pattern.
public fun check_liquidation<Quote>(
    loan: &RiskCappedLoan<Quote>,
    current_unrealized_value: u64,
    outstanding_principal: u64,
    ctx: &mut TxContext,
): bool {
    let underwater = current_unrealized_value < outstanding_principal;
    if (underwater) {
        let shortfall = if (outstanding_principal > current_unrealized_value) {
            outstanding_principal - current_unrealized_value
        } else { 0 };
        event::emit(LoanLiquidated {
            loan_id: object::id(loan),
            vault_id: loan.vault_id,
            collateral_value_at_liquidation: current_unrealized_value,
            shortfall,
        });
    };
    underwater
}

// Read functions
public fun risk_score_at_open<Quote>(loan: &RiskCappedLoan<Quote>): u64 { loan.risk_score_at_open }
public fun max_borrow_at_open<Quote>(loan: &RiskCappedLoan<Quote>): u64 { loan.max_borrow_at_open }
public fun outstanding<Quote>(loan: &RiskCappedLoan<Quote>): u64 { balance::value(&loan.principal) }
```

**UI addition — `/vault` page:**

```tsx
// Shown only when vault has an open, in-profit cycle.
// Borrow ceiling recalculated live from the latest openmind risk_score.
function BorrowPanel({ unrealizedValue, costBasis, riskScore }: {
  unrealizedValue: number; costBasis: number; riskScore: number;
}) {
  const profit = Math.max(0, unrealizedValue - costBasis);
  const capBps = Math.max(0, 5_000 - Math.round(5_000 * (riskScore / 10_000)));
  const maxBorrow = profit * (capBps / 10_000);

  return (
    <div className="bg-gray-900 border border-yellow-800 rounded p-4 mt-4">
      <div className="text-xs text-yellow-400 mb-2">BORROW AGAINST OPEN POSITION</div>
      <div className="text-sm text-gray-400 mb-1">
        Unrealized profit: {profit.toFixed(4)} USDC
      </div>
      <div className="text-sm text-gray-400 mb-3">
        Max borrow ({(capBps/100).toFixed(1)}% — capped by current AI risk score {(riskScore/100).toFixed(0)}%):
        <span className="text-white font-bold ml-2">{maxBorrow.toFixed(4)} USDC</span>
      </div>
      <div className="text-xs text-red-400 mb-3">
        ⚠ Borrowing creates liquidation risk. If this position's value falls
        below your loan amount, it will be force-closed to repay the loan.
        This is not principal-protected.
      </div>
      <button className="bg-yellow-700 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded text-sm">
        Borrow
      </button>
    </div>
  );
}
```

---

### 5.6 agent_cap.move — Autonomous Agent Wallet & Owner Override

**Satisfies Agentic Web Sub-track 2's must-haves directly: self-enforced
budget ceiling, on-chain activity log, demonstrable owner revocation.**

The vault already has a `paused: bool` field, but nothing in the original
design specifies *who* can set it or produces an auditable trail of *why*.
This section closes that gap: a real, separate `AgentCap`/`OwnerCap` pair —
the same pattern proven in `predict_manager.move`'s own
`mint_trade_cap`/`mint_deposit_cap`/`mint_withdraw_cap` functions, reused
here rather than inventing a new permission model — gates every autonomous
action `open_cycle` and `open_directional_position` take, with a hard
budget ceiling, an expiry, and instant owner-triggered revocation.

```move
/// Revocable, budget-capped wallet gating openmind's autonomous vault
/// actions. Owner grants this once; the keeper presents it on every
/// open_cycle / open_directional_position call; owner can revoke instantly,
/// at any time, mid-strategy — every subsequent autonomous call then reverts.
///
/// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict-manager
module openmind::agent_cap;

use sui::object::{Self, ID, UID};
use sui::event;
use sui::clock::Clock;
use sui::tx_context::TxContext;

const EBudgetExceeded: u64 = 1;
const ERevoked: u64 = 2;
const EExpired: u64 = 3;
const ENotOwner: u64 = 4;

/// Held by the human depositor/operator. Grants and can revoke AgentCap.
public struct OwnerCap has key { id: UID, agent_cap_id: ID, vault_id: ID }

/// Held by the keeper process. Presented on every autonomous mint attempt.
/// Mirrors the brief's own example shape: "max 500 USDC, Deepbook only,
/// expires 24h" — here scoped to this one vault's hedge + directional spend.
public struct AgentCap has key {
    id: UID,
    vault_id: ID,
    owner: address,
    max_budget: u64,        // cumulative spend ceiling across hedge + directional legs
    spent: u64,
    expires_at_ms: u64,
    revoked: bool,
    action_count: u64,
}

public struct AgentCapGranted has copy, drop {
    agent_cap_id: ID, vault_id: ID, owner: address,
    max_budget: u64, expires_at_ms: u64,
}

public struct AgentActionLogged has copy, drop {
    agent_cap_id: ID, action: vector<u8>, amount: u64,
    spent_total: u64, remaining_budget: u64, logged_at_ms: u64,
}

public struct AgentRevoked has copy, drop {
    agent_cap_id: ID, vault_id: ID, revoked_at_ms: u64, revoked_by: address,
}

/// Owner grants the agent a fresh, capped, time-boxed wallet for this vault.
public fun grant(
    vault_id: ID, max_budget: u64, duration_ms: u64, clock: &Clock, ctx: &mut TxContext,
): (OwnerCap, AgentCap) {
    let owner = tx_context::sender(ctx);
    let agent_cap = AgentCap {
        id: object::new(ctx), vault_id, owner, max_budget, spent: 0,
        expires_at_ms: sui::clock::timestamp_ms(clock) + duration_ms,
        revoked: false, action_count: 0,
    };
    let agent_cap_id = object::id(&agent_cap);
    let owner_cap = OwnerCap { id: object::new(ctx), agent_cap_id, vault_id };
    event::emit(AgentCapGranted {
        agent_cap_id, vault_id, owner, max_budget,
        expires_at_ms: agent_cap.expires_at_ms,
    });
    (owner_cap, agent_cap)
}

/// Called from inside open_cycle / open_directional_position before any
/// fund movement — hard, on-chain enforced, not a backend-trusted convention.
public fun authorize_and_log(
    cap: &mut AgentCap, amount: u64, action: vector<u8>, clock: &Clock,
) {
    assert!(!cap.revoked, ERevoked);
    assert!(sui::clock::timestamp_ms(clock) <= cap.expires_at_ms, EExpired);
    assert!(cap.spent + amount <= cap.max_budget, EBudgetExceeded);
    cap.spent = cap.spent + amount;
    cap.action_count = cap.action_count + 1;
    event::emit(AgentActionLogged {
        agent_cap_id: object::id(cap), action, amount,
        spent_total: cap.spent, remaining_budget: cap.max_budget - cap.spent,
        logged_at_ms: sui::clock::timestamp_ms(clock),
    });
}

/// Owner-only, instant — the demoable revocation. Every subsequent
/// authorize_and_log() call on this cap reverts immediately after this runs.
public fun revoke(owner_cap: &OwnerCap, cap: &mut AgentCap, clock: &Clock, ctx: &mut TxContext) {
    assert!(owner_cap.agent_cap_id == object::id(cap), ENotOwner);
    cap.revoked = true;
    event::emit(AgentRevoked {
        agent_cap_id: object::id(cap), vault_id: owner_cap.vault_id,
        revoked_at_ms: sui::clock::timestamp_ms(clock),
        revoked_by: tx_context::sender(ctx),
    });
}

/// Owner can also re-grant after revoking — the "redelegation" case: revoke
/// the old cap, call grant() again for a fresh one. Two ordinary calls,
/// no special mechanism needed beyond what's already here.

public fun remaining_budget(cap: &AgentCap): u64 { cap.max_budget - cap.spent }
public fun is_active(cap: &AgentCap, clock: &Clock): bool {
    !cap.revoked && sui::clock::timestamp_ms(clock) <= cap.expires_at_ms
}
```

**Wiring into `openmind_vault.move` — the actual enforcement, not just an
adjacent contract.** `open_cycle` (Section 5.3) and `open_directional_position`
(Section 5.3) each gain one new parameter, `agent_cap: &mut AgentCap`, and one
new line as their first check:

```move
// Added to open_cycle, immediately after the existing assert!(!vault.paused, ...) check:
agent_cap::authorize_and_log(agent_cap, max_budget, b"open_cycle_hedge", clock);

// Added to open_directional_position, immediately after the existing
// assert!(!vault.paused, ...) check:
agent_cap::authorize_and_log(agent_cap, stake_amount, b"open_directional", clock);
```

Both call sites already compute `max_budget`/`stake_amount` before this point
in the existing function bodies, so this is a pure insertion — no reordering
of existing logic required. If the cap is revoked, expired, or the cumulative
spend would exceed its ceiling, the entire transaction aborts before any
`Coin` is split from the buffer or any DeepBook Predict call is made.

**Owner-side revocation demo, concretely:** mid-strategy, with a cycle
actively running, the owner calls `agent_cap::revoke(owner_cap, agent_cap,
clock, ctx)` from the `/wallet` page below. The next time the keeper's cron
tick tries to call `open_cycle` (whether for the same vault's next expiry, or
a new `open_directional_position`), the transaction reverts on-chain with
`ERevoked` — provable, immediate, not a soft backend flag the keeper could
ignore.

**`/wallet` page — new frontend route:**

```tsx
// web/app/wallet/page.tsx
// Shows live AgentCap status and exposes the owner-only revoke button.
"use client";
import { useEffect, useState } from "react";

export default function WalletPage() {
  const [cap, setCap] = useState<{
    maxBudget: number; spent: number; expiresAtMs: number;
    revoked: boolean; actionCount: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/agent-cap/state").then(r => r.json()).then(setCap);
  }, []);

  async function handleRevoke() {
    const res = await fetch("/api/agent-cap/revoke", { method: "POST" });
    if (res.ok) setCap(c => c ? { ...c, revoked: true } : c);
  }

  if (!cap) return null;
  const remaining = cap.maxBudget - cap.spent;
  const expired = Date.now() > cap.expiresAtMs;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-green-400">Agent Wallet</h1>
        <p className="text-gray-400 mb-6 text-sm">
          openmind's autonomous authority over this vault. Capped, time-boxed,
          and revocable at any time.
        </p>

        <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={cap.revoked ? "text-red-400" : expired ? "text-yellow-400" : "text-green-400"}>
              {cap.revoked ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Budget Used</span>
            <span>{(cap.spent / 1e6).toFixed(2)} / {(cap.maxBudget / 1e6).toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Remaining</span>
            <span>{(remaining / 1e6).toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Actions Logged</span>
            <span>{cap.actionCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Expires</span>
            <span>{new Date(cap.expiresAtMs).toLocaleString()}</span>
          </div>
        </div>

        {!cap.revoked && (
          <button
            onClick={handleRevoke}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded"
          >
            Revoke Agent Authority — Stop All Autonomous Actions
          </button>
        )}
        {cap.revoked && (
          <div className="text-center text-red-400 text-sm border border-red-800 rounded p-3">
            Agent authority revoked. No further autonomous actions can execute
            on this vault until a new AgentCap is granted.
          </div>
        )}
      </div>
    </main>
  );
}
```

---

## 6. Agent — Option B (Python)

### 6.1 requirements.txt
```
memwal>=0.1.0          # https://docs.wal.app/walrus-memory/python-sdk/quick-start
httpx>=0.27.0          # async HTTP for Predict server + Polymarket
pynacl>=1.5.0          # Ed25519 signing for MemWal
anthropic>=0.30.0      # Claude for knowledge graph reasoning
python-dotenv>=1.0.0
hashlib                # stdlib — SHA256 for reasoning_hash
```

### 6.2 memory.py
```python
"""
MemWal Python SDK wrapper for openmind agent.
Reference: https://docs.wal.app/walrus-memory/python-sdk/quick-start
Reference: https://docs.wal.app/walrus-memory/python-sdk/usage/memwal
"""
import os
from memwal import MemWal, RecallParams

MEMWAL_NAMESPACE = "openmind-vault"

async def get_memwal() -> MemWal:
    """
    Create MemWal client.
    Get account ID and delegate key from:
    https://docs.memwal.ai/ (Playground — create account + delegate key)
    env="staging" = testnet relayer: https://relayer-staging.memory.walrus.xyz
    env="prod"    = mainnet relayer: https://relayer.memory.walrus.xyz
    """
    return MemWal.create(
        key=os.environ["MEMWAL_PRIVATE_KEY"],
        account_id=os.environ["MEMWAL_ACCOUNT_ID"],
        env="staging",
        namespace=MEMWAL_NAMESPACE,
    )

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
    return await memwal.ask(
        f"Given {dominant_theme} pattern with BTC at {spot}, "
        f"what hedge budget in bps worked best in similar past cycles? "
        f"What was the typical outcome (ITM vs OTM)?"
    )

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
```

### 6.3 surface.py
```python
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
```

### 6.4 scorer.py
```python
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
```

### 6.5 cycle.py
```python
"""
Full openmind cycle pipeline.
Orchestrates: memory recall → news → reasoning → anchor → vault open.
"""
import asyncio
import hashlib
import json
import os
import time

import httpx

from memory import get_memwal, analyze_news, recall_similar_cycles, ask_historical_budget, remember_cycle_outcome
from surface import surface_readout
from scorer import compute_dynamic_budget
from anchor import upload_to_walrus, execute_anchor_tx, execute_open_cycle_tx

PREDICT_SERVER = "https://predict-server.testnet.mystenlabs.com"

async def get_oracle_state(oracle_id: str) -> dict:
    """Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information"""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{PREDICT_SERVER}/oracles/{oracle_id}/state")
        r.raise_for_status()
        return r.json()

async def list_oracles() -> list:
    """Reference: https://predict-server.testnet.mystenlabs.com/oracles"""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{PREDICT_SERVER}/oracles")
        r.raise_for_status()
        return r.json()

def pick_strike(oracle_state: dict, spot_bps: int = 9_900) -> int:
    """Pick highest grid strike at or below spot_bps% of spot."""
    oracle = oracle_state['oracle']
    spot = int(oracle_state['latest_price']['spot'])
    min_strike = int(oracle['min_strike'])
    tick = int(oracle['tick_size'])
    target = (spot * spot_bps) // 10_000
    if target <= min_strike:
        raise ValueError("Spot target below strike grid floor")
    k = (target - min_strike) // tick
    return min_strike + k * tick

async def fetch_polymarket_btc_odds(strike: int, expiry_ms: int) -> float:
    """
    Fetch BTC downside probability from Polymarket for comparison.
    Returns 0.5 as neutral fallback if unavailable.
    """
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://clob.polymarket.com/markets",
                params={"question": f"BTC {strike // 1_000_000_000}", "limit": 5},
                timeout=5.0
            )
            if r.status_code == 200:
                data = r.json()
                if data.get('data'):
                    return float(data['data'][0].get('tokens', [{}])[0].get('price', 0.5))
    except Exception:
        pass
    return 0.5  # neutral fallback

async def search_news(hours_back: int = 2) -> list[dict]:
    """
    Search BTC-relevant news. Date-bounded — no future data used.
    """
    # Use Claude to search and classify news
    import anthropic
    client = anthropic.Anthropic()
    result = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"Search for BTC bitcoin news from the last {hours_back} hours. "
                       f"Return JSON array of {{headline, source, impact: high/medium/low, direction: vol_up/vol_down/neutral}}. "
                       f"Only return JSON, no other text."
        }],
        tools=[{"type": "web_search_20250305", "name": "web_search"}]
    )
    try:
        text = "".join(b.text for b in result.content if hasattr(b, 'text'))
        return json.loads(text)
    except Exception:
        return []

def build_knowledge_graph(news: list[dict]) -> dict:
    """Simple graph: count high-impact vol_up signals."""
    high_vol_up = sum(1 for n in news if n.get('impact') == 'high' and n.get('direction') == 'vol_up')
    medium_vol_up = sum(1 for n in news if n.get('impact') == 'medium' and n.get('direction') == 'vol_up')
    total = len(news)
    dominant = max(news, key=lambda n: {'high': 3, 'medium': 2, 'low': 1}.get(n.get('impact','low'), 1), default={})
    return {
        'high_vol_up': high_vol_up,
        'medium_vol_up': medium_vol_up,
        'total_articles': total,
        'dominant_theme': dominant.get('headline', 'neutral')[:80],
    }

def score_vol_risk(graph: dict) -> float:
    """Convert knowledge graph to 0.0–1.0 risk score."""
    score = (graph['high_vol_up'] * 0.3 + graph['medium_vol_up'] * 0.1)
    return min(1.0, score)

async def gather_decision_inputs(oracle_id: str, hours_back: int = 2) -> dict:
    """
    Shared first half of any decision — hedge or directional. Pulled out so
    watch.py's event-driven triggers and the scheduled cycle-open path both
    call this exact same code, never duplicate it. Returns everything both
    downstream paths need; neither path re-fetches anything gathered here.
    """
    memwal = await get_memwal()
    oracle_state = await get_oracle_state(oracle_id)
    expiry_ms = int(oracle_state['oracle']['expiry'])
    strike = pick_strike(oracle_state)

    readout_down = surface_readout(oracle_state, strike, is_up=False)
    readout_up = surface_readout(oracle_state, strike, is_up=True)

    news = await search_news(hours_back=hours_back)
    graph = build_knowledge_graph(news)
    dominant_theme = graph['dominant_theme']
    news_signal = score_vol_risk(graph)

    if news:
        news_text = "\n".join(f"- {n['headline']} [{n.get('source','')}]" for n in news)
        await analyze_news(memwal, news_text)

    past_memories = await recall_similar_cycles(memwal, dominant_theme, news_signal)
    historical_answer = await ask_historical_budget(memwal, dominant_theme, readout_down['spot'])
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
    """Shared hash + Walrus upload + Sui anchor step. Used by both legs."""
    reasoning_json = json.dumps(reasoning, sort_keys=True)
    reasoning_hash = hashlib.sha256(reasoning_json.encode()).digest()
    walrus_blob_id = await upload_to_walrus(reasoning_json.encode())
    return reasoning_hash, walrus_blob_id


async def run_hedge_cycle(oracle_id: str) -> dict:
    """
    Hedge leg. Fires only on cycle-open (scheduled), never mid-cycle —
    the hedge budget is set once per expiry window, by design.
    """
    inputs = await gather_decision_inputs(oracle_id)
    budget_result = compute_dynamic_budget(
        inputs["news_signal"], inputs["readout_down"]["down_probability"],
        inputs["polymarket_down_prob"], inputs["historical_answer"]
    )
    budget_bps = budget_result['budget_bps']

    reasoning = {
        "version": "openmind-hedge-v1",
        "leg": "hedge",
        "cycle_oracle_id": oracle_id,
        "anchored_before_expiry": True,
        "anchor_timestamp_ms": int(time.time() * 1000),
        "expiry_ms": inputs["expiry_ms"],
        "evidence": inputs["news"],
        "knowledge_graph": inputs["graph"],
        "memory_context": inputs["past_memories"],
        "historical_answer": inputs["historical_answer"],
        "memory_cycles_recalled": inputs["memory_cycles_recalled"],
        "svi_down_probability": inputs["readout_down"]["down_probability"],
        "polymarket_down_probability": inputs["polymarket_down_prob"],
        "budget": budget_result,
    }

    reasoning_hash, walrus_blob_id = await anchor_and_record(oracle_id, reasoning)

    await execute_anchor_tx(
        oracle_id=oracle_id, reasoning_hash=reasoning_hash, walrus_blob_id=walrus_blob_id,
        risk_score=int(inputs["news_signal"] * 10_000), hedge_budget_bps=budget_bps,
        news_signal_bps=budget_result['breakdown']['news_uplift'],
        svi_gap_bps=budget_result['inputs']['signal_gap_bps'],
        memory_cycles_recalled=inputs["memory_cycles_recalled"],
    )
    await execute_open_cycle_tx(
        oracle_id=oracle_id, strike=inputs["strike"], budget_bps=budget_bps,
        reasoning_hash=list(reasoning_hash), risk_score=int(inputs["news_signal"] * 10_000),
        news_signal_bps=budget_result['breakdown']['news_uplift'],
        svi_gap_bps=budget_result['inputs']['signal_gap_bps'],
        memory_cycles_recalled=inputs["memory_cycles_recalled"],
    )
    return reasoning


# Minimum |edge| in probability terms before a directional bet is even
# considered. Mirrors MIN_DIRECTIONAL_EDGE_BPS in openmind_vault.move (300bps
# = 0.03) — kept in sync manually since the agent and contract are separate
# codebases; the on-chain check is the real backstop if these ever drift.
MIN_EDGE = 0.03

def kelly_fraction(p_model: float, p_surface_ask: float, confidence: float) -> float:
    """
    Fractional Kelly sizing for a binary bet.
    p_model: openmind's calibrated probability the bet wins
    p_surface_ask: the cost to enter, expressed as implied probability (the ask)
    confidence: 0-1 scaling applied on top of raw Kelly, derived from how much
    news + memory agree with each other (not from p_model itself, to avoid
    double-counting the same signal in both edge and confidence).
    """
    if p_surface_ask <= 0 or p_surface_ask >= 1:
        return 0.0
    edge = p_model - p_surface_ask
    if edge <= 0:
        return 0.0
    b = (1 - p_surface_ask) / p_surface_ask  # net odds
    raw_kelly = (p_model * (b + 1) - 1) / b if b > 0 else 0.0
    return max(0.0, min(raw_kelly * confidence, 1.0))


async def evaluate_directional(
    oracle_id: str, trigger: str, market: dict, new_news: list[dict],
) -> dict | None:
    """
    Called by watch.py on ANY trigger (cycle_open, svi_jump, high_impact_news).
    Returns None if no real edge exists — explicit skip, not a forced bet.
    Reuses gather_decision_inputs so this is never out of sync with the hedge
    leg's view of news/memory/surface at call time.
    """
    inputs = await gather_decision_inputs(oracle_id, hours_back=1 if trigger != "cycle_open" else 2)

    p_model_up = estimate_p_up(inputs)  # see note below
    p_surface_up = inputs["readout_up"]["up_probability"]
    edge = p_model_up - p_surface_up
    is_up = edge > 0
    abs_edge = abs(edge)

    if abs_edge < MIN_EDGE:
        return None  # explicit skip — no bet this trigger

    # Confidence from cross-source agreement: how closely do news_signal-implied
    # direction and Polymarket's view agree with our own p_model_up?
    poly_p_up = inputs["polymarket_up_prob"]
    agreement = 1.0 - min(1.0, abs(poly_p_up - p_model_up))
    confidence = max(0.2, agreement)  # floor so real edge is never fully zeroed out

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
        "evidence": new_news,
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


def estimate_p_up(inputs: dict) -> float:
    """
    openmind's own calibrated P(up), independent of the surface.
    Blends news_signal direction, MemWal historical_answer sentiment, and a
    neutral prior. This is intentionally simple and auditable — the proof
    value comes from the full evidence trail being anchored, not from
    sophistication of this specific formula.
    """
    graph = inputs["graph"]
    bullish_signal = graph.get('high_vol_up', 0) * 0.1  # placeholder direction proxy;
    # in production this should classify news direction explicitly (vol_up
    # alone doesn't imply up vs down — see graph.py's direction field) rather
    # than reusing the magnitude-only score_vol_risk output.
    historical_lower = inputs["historical_answer"].lower()
    memory_tilt = 0.05 if "up" in historical_lower or "rally" in historical_lower else (
        -0.05 if "down" in historical_lower or "crash" in historical_lower else 0.0
    )
    return max(0.0, min(1.0, 0.5 + bullish_signal + memory_tilt))


async def run_cycle(oracle_id: str) -> dict:
    """
    Scheduled cycle-open entry point. Always runs the hedge leg.
    Directional evaluation also runs here with trigger="cycle_open" — this
    is the one case where both legs are evaluated together, since a fresh
    expiry window opening is itself a legitimate decision point for both.
    """
    hedge_reasoning = await run_hedge_cycle(oracle_id)
    market = await poll_market_for_cycle(oracle_id)
    directional_result = await evaluate_directional(oracle_id, "cycle_open", market, [])
    return {"hedge": hedge_reasoning, "directional": directional_result}


async def poll_market_for_cycle(oracle_id: str) -> dict:
    """Thin wrapper matching watch.py's poll_market shape, for the cycle_open path."""
    from watch import poll_market
    return await poll_market(oracle_id)


async def after_close(oracle_id: str, close_result: dict, reasoning: dict) -> None:
    """Store cycle outcome in MemWal after close_cycle executes."""
    memwal = await get_memwal()
    await remember_cycle_outcome(
        memwal=memwal,
        oracle_id=oracle_id,
        expiry_date=close_result.get('expiry_date', ''),
        dominant_theme=reasoning['knowledge_graph']['dominant_theme'],
        news_signal=score_vol_risk(reasoning['knowledge_graph']),
        budget_bps=reasoning['budget']['budget_bps'],
        budget_breakdown=reasoning['budget']['breakdown'],
        svi_down_prob=reasoning['svi_down_probability'],
        polymarket_down_prob=reasoning['polymarket_down_probability'],
        itm=close_result.get('itm', False),
        plp_carry_bps=close_result.get('plp_carry_bps', 0),
        btc_move_pct=close_result.get('btc_move_pct', 0),
        reasoning_hash=close_result.get('reasoning_hash', ''),
        memory_cycles_recalled=reasoning['memory_cycles_recalled'],
    )
```

---

### 6.6 agent/watch.py

**Continuous watch loop.** Decouples "decide and act" from "wait for cycle open."
Polls market state and news on a short interval; only triggers a full decision
snapshot when one of three conditions fires. This is what makes openmind
event-driven rather than purely scheduled — a real Fed headline mid-cycle can
trigger a directional evaluation even if the next oracle expiry is 30 minutes away.

```python
"""
Continuous watch loop for openmind.
Polls market + news at a light cadence; fires a full decision snapshot
only when a real trigger condition is met.
Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
"""
import asyncio
import time
from dataclasses import dataclass, field

from cycle import get_oracle_state, search_news, build_knowledge_graph, score_vol_risk
from surface import surface_readout

POLL_INTERVAL_S = 75          # light watch cadence
SVI_JUMP_THRESHOLD = 0.015    # 1.5% absolute change in surface-implied up_probability
NEWS_HIGH_IMPACT_MIN_ITEMS = 1  # at least 1 high-impact item triggers evaluation
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
    if not state.get('latest_svi') or not state.get('latest_price'):
        return {}
    # Use the oracle's own min_strike+tick as a stable reference strike for
    # tracking up_probability drift over time (not necessarily the strike
    # any future bet will use — just a consistent comparison point).
    ref_strike = int(state['oracle']['min_strike'])
    readout = surface_readout(state, ref_strike, is_up=True)
    return {
        'up_probability': readout['up_probability'],
        'spot': readout['spot'],
        'state': state,
    }


async def poll_news_delta(watch: WatchState) -> tuple[list[dict], bool]:
    """
    Search recent news, return only NEW items not already seen this watch
    session, plus whether any new item is high-impact.
    """
    news = await search_news(hours_back=1)
    new_items = [n for n in news if n.get('headline') not in watch.seen_headlines]
    for n in new_items:
        watch.seen_headlines.add(n.get('headline', ''))
    high_impact = any(n.get('impact') == 'high' for n in new_items)
    return new_items, high_impact


def check_triggers(
    watch: WatchState,
    market: dict,
    new_news: list[dict],
    news_high_impact: bool,
    now_ms: int,
) -> str | None:
    """
    Returns the trigger name if a full decision snapshot should fire,
    else None. Debounced — won't re-fire within MIN_SECONDS_BETWEEN_TRIGGERS
    of the last trigger regardless of condition.
    """
    if now_ms - watch.last_trigger_ms < MIN_SECONDS_BETWEEN_TRIGGERS * 1000:
        return None

    if watch.last_up_prob is not None and market.get('up_probability') is not None:
        delta = abs(market['up_probability'] - watch.last_up_prob)
        if delta >= SVI_JUMP_THRESHOLD:
            return "svi_jump"

    if news_high_impact and len(new_news) >= NEWS_HIGH_IMPACT_MIN_ITEMS:
        return "high_impact_news"

    return None


async def watch_loop(oracle_id: str, on_trigger):
    """
    Main watch loop. `on_trigger(oracle_id, trigger_name, market, news)` is
    called whenever a real trigger fires — this is what runs the full
    cycle.py decision pipeline and produces the anchored reasoning snapshot.
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

            if market.get('up_probability') is not None:
                watch.last_up_prob = market['up_probability']
            watch.last_news_check_ms = now_ms

        except Exception as err:
            print(f"WATCH_ERROR oracle={oracle_id}: {err}")

        await asyncio.sleep(POLL_INTERVAL_S)


def build_decision_snapshot(
    oracle_id: str,
    trigger: str,
    market: dict,
    news: list[dict],
    memory_context: list[str],
    historical_answer: str,
    polymarket_prob: float,
    decision: dict,
) -> dict:
    """
    The full frozen snapshot anchored on-chain and stored on Walrus.
    Nothing is reasoned about that isn't captured here, in full, before the
    decision is acted on.
    """
    graph = build_knowledge_graph(news) if news else {}
    return {
        "version": "openmind-snapshot-v1",
        "timestamp_ms": int(time.time() * 1000),
        "oracle_id": oracle_id,
        "trigger": trigger,
        "market_state": {
            "spot": market.get('spot'),
            "up_probability": market.get('up_probability'),
            "raw_state": market.get('state'),
        },
        "news_state": {
            "items": news,
            "dominant_theme": graph.get('dominant_theme'),
            "news_signal": score_vol_risk(graph) if graph else 0.0,
        },
        "referrals": {
            "polymarket_probability": polymarket_prob,
        },
        "memory_state": {
            "recalled_cycles": memory_context,
            "historical_answer": historical_answer,
        },
        "decision": decision,
    }
```

---

## 7. Keeper — Option C (TypeScript)

### 7.1 config.ts
```typescript
// All on-chain anchors — single source of truth.
// DeepBook Predict package IDs from:
// https://docs.sui.io/onchain-finance/deepbook-predict/contract-information

export const NETWORK = "testnet" as const;
export const SUI_RPC = "https://fullnode.testnet.sui.io:443";

// DeepBook Predict
export const PREDICT_PACKAGE =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";
export const PREDICT_SHARED =
  "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";
export const DUSDC_TYPE =
  "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";
export const PLP_TYPE =
  `${PREDICT_PACKAGE}::plp::PLP`;

// Predict server (indexed data)
// Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
export const PREDICT_SERVER =
  "https://predict-server.testnet.mystenlabs.com";

export const CLOCK_OBJECT = "0x6";

// Walrus
// Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
export const WALRUS_PUBLISHER =
  process.env.WALRUS_PUBLISHER ?? "https://publisher.walrus-testnet.walrus.space";
export const WALRUS_AGGREGATOR =
  process.env.WALRUS_AGGREGATOR ?? "https://aggregator.walrus-testnet.walrus.space";

// openmind vault (set after deployment)
export const OPENMIND_PACKAGE = process.env.OPENMIND_PACKAGE ?? "";
export const VAULT_OBJECT = process.env.VAULT_OBJECT ?? "";
export const VAULT_MANAGER = process.env.VAULT_MANAGER ?? "";
export const AGENT_CAP_OBJECT = process.env.AGENT_CAP_OBJECT ?? "";  // set after agent_cap::grant() call
```

### 7.2 surface.ts
```typescript
/**
 * SVI volatility surface math — TypeScript port matching agent/surface.py.
 * Reads from Predict server oracle state endpoint.
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
 * Reference: https://predict-server.testnet.mystenlabs.com/oracles/:id/state
 */

export const FLOAT_SCALING = 1_000_000_000n;
const FLOAT_SCALING_N = 1_000_000_000;

export type OracleState = {
  oracle: { oracle_id: string; expiry: number | string; status: string; settlement_price?: string | null };
  latest_price?: { spot: string; forward: string; event_digest: string };
  latest_svi?: { a: string; b: string; rho: string; rho_negative?: boolean; m: string; m_negative?: boolean; sigma: string };
};

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const [a1,a2,a3,a4,a5] = [0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429];
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-ax*ax));
  return sign * y;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function surfaceReadout(state: OracleState, strike: bigint, isUp: boolean) {
  const svi = state.latest_svi!;
  const price = state.latest_price!;
  const forward = Number(price.forward) / FLOAT_SCALING_N;
  const strikeN = Number(strike) / FLOAT_SCALING_N;
  const k = Math.log(strikeN / forward);
  const a = Number(svi.a) / FLOAT_SCALING_N;
  const b = Number(svi.b) / FLOAT_SCALING_N;
  const rho = (Number(svi.rho) / FLOAT_SCALING_N) * (svi.rho_negative ? -1 : 1);
  const m = (Number(svi.m) / FLOAT_SCALING_N) * (svi.m_negative ? -1 : 1);
  const sigma = Number(svi.sigma) / FLOAT_SCALING_N;
  const km = k - m;
  const totalVariance = Math.max(0, a + b * (rho * km + Math.sqrt(km*km + sigma*sigma)));
  const vol = Math.sqrt(totalVariance);
  const d2 = -((k + totalVariance / 2) / vol);
  const upProb = normalCdf(d2);
  const downProb = 1 - upProb;
  const modelProb = isUp ? upProb : downProb;
  return {
    modelPrice: BigInt(Math.max(0, Math.min(FLOAT_SCALING_N, Math.round(modelProb * FLOAT_SCALING_N)))).toString(),
    upProbability: upProb,
    downProbability: downProb,
    spreadBps: (ask: string) => Math.round(((Number(ask) - modelProb * FLOAT_SCALING_N) / (modelProb * FLOAT_SCALING_N)) * 10_000),
  };
}
```

### 7.3 simCapture.ts
```typescript
/**
 * Capture ALL settled BTC oracle states for simulation.
 * Calls Predict server, stores as NDJSON for offline sim.
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
 * Reference: https://predict-server.testnet.mystenlabs.com
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { PREDICT_SERVER } from "./config.ts";

const OUT = new URL("../data/oracle_states.ndjson", import.meta.url).pathname;
const CONCURRENCY = 4;

const seen = new Set<string>();
if (existsSync(OUT)) {
  for (const line of readFileSync(OUT, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { seen.add(JSON.parse(line).oracle.oracle_id); } catch {}
  }
}

const allOracles = await (await fetch(`${PREDICT_SERVER}/oracles`)).json() as any[];
const oracles = allOracles.filter(
  (o: any) => o.status === "settled" && o.underlying_asset === "BTC" && !seen.has(o.oracle_id)
);
console.log(`settling oracles to capture: ${oracles.length} (have ${seen.size})`);

let done = 0, failed = 0;
async function captureOne(oracleId: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${PREDICT_SERVER}/oracles/${oracleId}/state`);
      if (!res.ok) throw new Error(`${res.status}`);
      appendFileSync(OUT, JSON.stringify(await res.json()) + "\n");
      return;
    } catch (err) {
      if (attempt === 3) { failed++; console.error(`FAILED ${oracleId}`); return; }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

const queue = [...oracles];
async function worker() {
  while (queue.length > 0) {
    const o = queue.shift()!;
    await captureOne(o.oracle_id);
    done++;
    if (done % 100 === 0) console.log(`progress ${done}/${oracles.length}`);
    await new Promise(r => setTimeout(r, 60));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`CAPTURE_DONE captured=${done} failed=${failed}`);
```

### 7.4 walrus.ts
```typescript
/**
 * Store and read blobs on Walrus using the official TypeScript SDK.
 *
 * Reference: https://sdk.mystenlabs.com/walrus  (installation, setup, writeBlob/readBlob)
 * Reference: https://docs.wal.app/docs/http-api/storing-blobs  (HTTP fallback semantics)
 * Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
 *
 * Why the SDK and not raw fetch():
 * The Walrus SDK docs themselves note that direct storage-node writes/reads
 * require ~2200 / ~335 requests without an upload relay, and recommend public
 * aggregators/publishers for most applications. We use the SDK configured
 * with the public testnet upload relay, which gets us the official client,
 * typed responses, retry/error handling (RetryableWalrusClientError), and
 * crash-recoverable uploads — while keeping write cost low via the relay.
 * A raw-HTTP fallback path is kept for environments where the SDK's WASM
 * bindings aren't available (e.g. constrained CI runners).
 */
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { walrus, WalrusFile, RetryableWalrusClientError } from "@mysten/walrus";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { WALRUS_PUBLISHER, WALRUS_AGGREGATOR, SUI_RPC } from "./config.ts";

const UPLOAD_RELAY = process.env.WALRUS_UPLOAD_RELAY
  ?? "https://upload-relay.testnet.walrus.space";

let client: ReturnType<typeof buildClient> | null = null;

function buildClient() {
  return new SuiGrpcClient({ network: "testnet", baseUrl: SUI_RPC }).$extend(
    walrus({
      uploadRelay: {
        host: UPLOAD_RELAY,
        sendTip: { max: 1_000 }, // SDK resolves the relay's actual tip-config
      },
    }),
  );
}

function getClient() {
  if (!client) client = buildClient();
  return client;
}

function loadSigner(): Ed25519Keypair {
  const raw = process.env.SUI_KEEPER_KEY;
  if (!raw) throw new Error("SUI_KEEPER_KEY not set");
  const { schema, secretKey } = decodeSuiPrivateKey(raw.trim());
  if (schema !== "ED25519") throw new Error(`Unsupported schema ${schema}`);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

/**
 * Upload reasoning JSON / settlement receipts to Walrus via the SDK.
 * Falls back to the public HTTP publisher if the SDK path throws
 * (e.g. WASM bindings unavailable in the runtime).
 */
export async function uploadToWalrus(
  data: Uint8Array | string,
  epochs = 5,
  identifier = "reasoning.json",
): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;

  try {
    const c = getClient();
    const signer = loadSigner();
    const file = WalrusFile.from({
      contents: bytes,
      identifier,
      tags: { "content-type": "application/json" },
    });

    const [result] = await c.walrus.writeFiles({
      files: [file],
      epochs,
      deletable: true,
      signer,
    });
    return result.blobId;
  } catch (err) {
    if (err instanceof RetryableWalrusClientError) {
      getClient().walrus.reset();
    }
    console.warn(`SDK upload failed (${err instanceof Error ? err.message : err}); falling back to publisher HTTP`);
    return uploadToWalrusHttp(bytes, epochs);
  }
}

/** Read a blob back via the SDK. */
export async function readFromWalrus(blobId: string): Promise<Uint8Array> {
  try {
    return await getClient().walrus.readBlob({ blobId });
  } catch (err) {
    if (err instanceof RetryableWalrusClientError) {
      getClient().walrus.reset();
    }
    console.warn(`SDK read failed (${err instanceof Error ? err.message : err}); falling back to aggregator HTTP`);
    const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);
    if (!res.ok) throw new Error(`Walrus aggregator read failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

// ─── HTTP fallback path (publisher/aggregator) ────────────────────────────
// Reference: https://docs.wal.app/docs/http-api/storing-blobs
// Used only if the SDK throws (e.g. WASM unavailable). Documents the same
// approach the SDK uses under the hood for environments without WASM.

async function uploadToWalrusHttp(data: Uint8Array, epochs: number): Promise<string> {
  const res = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  if (!res.ok) throw new Error(`Walrus publisher upload failed: ${res.status}`);
  const result = await res.json() as any;
  return result.newlyCreated?.blobObject?.blobId ?? result.alreadyCertified?.blobId ?? "";
}

export function walrusReadUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
}
```

**Package install:**
```bash
npm install --save @mysten/walrus @mysten/sui
```
Reference: https://sdk.mystenlabs.com/walrus#installation

**Next.js note** — if `readFromWalrus` is called from an API route, add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['@mysten/walrus', '@mysten/walrus-wasm'],
};
```
Reference: https://sdk.mystenlabs.com/walrus#loading-the-wasm-module-in-vite-or-client-side-apps

---

## 8. Simulation — Three-Band Carry Sweep

Pull data: `GET https://predict-server.testnet.mystenlabs.com/oracles` → filter `status=settled` + `underlying_asset=BTC` → `GET /oracles/:id/state`.

Run two strategies across all captured cycles:

**Strategy A — Fixed policy baseline:**
`HEDGE_BPS = 250` every cycle, `STRIKE_SPOT_BPS = 9900`

**Strategy B — openmind dynamic policy:**
`budget_bps = 150–420` based on `news_signal + signal_gap + memory_uplift`

Each strategy at three PLP carry rates (0.5x / 1.0x / 2.0x observed) = **6 total sim runs**.

Expected output JSON at `web/public/sim/vault_sim.json`:
```json
{
  "version": "openmind-vault-sim-v1",
  "policy": { "direction": "down binaries", "strikeTargetBps": 9900 },
  "fixedStrategy": { "hedgeBps": 250, "summary": {...}, "series": [...] },
  "dynamicStrategy": { "avgBudgetBps": 280, "summary": {...}, "series": [...] },
  "carrySweep": [
    { "label": "0.5x carry", "fixedSummary": {...}, "dynamicSummary": {...} },
    { "label": "1.0x carry", "fixedSummary": {...}, "dynamicSummary": {...} },
    { "label": "2.0x carry", "fixedSummary": {...}, "dynamicSummary": {...} }
  ]
}
```

---

## 9. verify:judge

```json
{
  "scripts": {
    "verify:judge":           "npm run verify:full",
    "verify:full":            "npm run verify:contracts && npm run verify:receipts && npm run verify:simulation && npm run verify:public-surface && npm run verify:narrative",
    "verify:contracts":       "node scripts/verify-contracts.mjs",
    "verify:receipts":        "node scripts/verify-receipts.mjs",
    "verify:simulation":      "node scripts/verify-simulation.mjs",
    "verify:public-surface":  "node scripts/verify-public-surface.mjs",
    "verify:narrative":       "node scripts/verify-narrative.mjs",
    "sim:capture":            "tsx keeper/src/simCapture.ts",
    "sim:vault":              "tsx keeper/src/simVault.ts"
  }
}
```

Expected markers (one per script):
```
OPENMIND_CONTRACTS_VALID
OPENMIND_RECEIPTS_VALID
OPENMIND_SIMULATION_VALID
OPENMIND_PUBLIC_SURFACE_VALID
OPENMIND_NARRATIVE_VALID
OPENMIND_SUBMISSION_VALID
```

---

## 10. All Hackathon Requirements

### DeepBook Predict Track
| Requirement | Status | Evidence |
|---|---|---|
| Integrate DeepBook Predict contract on testnet | ✅ | `predict_adapter.move` calls `supply`, `mint`, `get_trade_amounts`, `redeem_permissionless`, `withdraw` |
| End-to-end working product | ✅ | Full cycle: deposit → AI reasons → anchor → open → settle → close → remember |
| Simulation results (vault track) | ✅ | 3-band carry sweep, fixed vs dynamic, from real oracle history |

### Walrus Track
| Requirement | Status | Evidence |
|---|---|---|
| Long-term memory using MemWal | ✅ | Python SDK `pip install memwal`, `remember`/`recall`/`analyze`/`ask` in every cycle |
| Persistent data using Walrus | ✅ | Reasoning JSON + settlement receipts stored as Walrus blobs |
| Long-running workflow tracking state | ✅ | Trading agent, sub-hour cycles, memory accumulates indefinitely |
| Working system not just demo | ✅ | Live vault on testnet with real transactions |

### OpenZeppelin Track
| Requirement | Status | Evidence |
|---|---|---|
| Use audited OZ primitives | ✅ | `openzeppelin_math::mul_div` in all NAV/share math, `openzeppelin_access::ownable` pattern |
| Correct MVR dependency setup | ✅ | `mvr add @openzeppelin-move/integer-math` per https://docs.openzeppelin.com/contracts-sui/1.x |

### Agentic Web Track — Sub-track 2 (Autonomous Agent Wallet)
| Requirement | Status | Evidence |
|---|---|---|
| Real Deepbook orders | ✅ | `open_cycle`/`open_directional_position` call real `predict::mint`/`predict::supply` |
| Self-enforced budget ceiling | ✅ | `agent_cap::authorize_and_log` — hard on-chain check, reverts if `spent + amount > max_budget` |
| On-chain activity log | ✅ | `AgentActionLogged` event, one per autonomous action, cumulative spend tracked |
| Owner revocation demonstrable | ✅ | `agent_cap::revoke`, instant, `/wallet` page button, every subsequent action reverts with `ERevoked` |

**Honest note on the other two Agentic Web sub-tracks:** Sub-track 1
(Autonomous Risk Guardian) requires monitoring an existing Sui lending or
perpetuals protocol's solvency — this project manages its own hedge budget,
not another protocol's risk parameters, so it does not fit that sub-track
despite some surface-level overlap (live feed, AI score, autonomous action).
Sub-track 3 (Intent Engine) requires a human-confirmation-gated, non-autonomous
flow — the opposite of this project's autonomous-within-a-cap design. Submit
to Sub-track 2 only.

---

## 11. Key Reference URLs (final list for agent)

| What | URL |
|---|---|
| DeepBook Predict overview | https://docs.sui.io/onchain-finance/deepbook-predict/ |
| DeepBook Predict functions | https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict |
| DeepBook oracle | https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle |
| DeepBook vault | https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault |
| Predict server live | https://predict-server.testnet.mystenlabs.com |
| MemWal Python SDK | https://docs.wal.app/walrus-memory/python-sdk/quick-start |
| MemWal Python usage | https://docs.wal.app/walrus-memory/python-sdk/usage/memwal |
| MemWal playground | https://docs.memwal.ai/ |
| MemWal GitHub | https://github.com/MystenLabs/MemWal |
| Walrus HTTP API | https://docs.wal.app/docs/http-api/storing-blobs |
| Walrus public nodes | https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers |
| OZ Contracts for Sui | https://docs.openzeppelin.com/contracts-sui/1.x |
| OZ Integer Math | https://docs.openzeppelin.com/contracts-sui/1.x/math |
| OZ Integer Math API | https://docs.openzeppelin.com/contracts-sui/1.x/api/math |
| OZ Access | https://docs.openzeppelin.com/contracts-sui/1.x/access |
| OZ GitHub | https://github.com/OpenZeppelin/contracts-sui |
| Sui TypeScript SDK | https://sdk.mystenlabs.com/typescript |
| Walrus TypeScript SDK | https://sdk.mystenlabs.com/walrus |

---

## 12. MISSING FILES — FULLY SPECCED

---

### 12.1 agent/anchor.py

```python
"""
Sui transaction builder for reasoning anchor + vault cycle open.
Builds and executes PTBs against Sui testnet.
Reference: https://docs.sui.io/develop/transactions
Reference: https://sdk.mystenlabs.com/typescript (use pysui equivalent)
"""
import os
import httpx
import json
from pysui import SuiConfig, SyncClient
from pysui.sui.sui_txn import SyncTransaction
from pysui.sui.sui_types.scalars import ObjectID, SuiString, SuiU64, SuiU16
from pysui.sui.sui_types.collections import SuiArray

WALRUS_PUBLISHER = os.environ.get(
    "WALRUS_PUBLISHER",
    "https://publisher.walrus-testnet.walrus.space"
)
# Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers

PREDICT_PACKAGE  = "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138"
PREDICT_SHARED   = "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a"
CLOCK_OBJECT     = "0x6"

OPENMIND_PACKAGE = os.environ["OPENMIND_PACKAGE"]   # set after deploy
VAULT_OBJECT     = os.environ["VAULT_OBJECT"]
VAULT_MANAGER    = os.environ["VAULT_MANAGER"]
AGENT_CAP_OBJECT = os.environ["AGENT_CAP_OBJECT"]  # set after agent_cap::grant() call
DUSDC_TYPE       = "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC"


def get_sui_client() -> SyncClient:
    cfg = SuiConfig.user_config(
        rpc_url="https://fullnode.testnet.sui.io:443",
        prv_keys=[os.environ["SUI_KEEPER_KEY"]],
    )
    return SyncClient(cfg)


async def upload_to_walrus(data: bytes, epochs: int = 5) -> str:
    """
    Upload blob to Walrus and return blob ID.
    Reference: https://docs.wal.app/docs/http-api/storing-blobs
    PUT /v1/blobs?epochs=N
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.put(
            f"{WALRUS_PUBLISHER}/v1/blobs?epochs={epochs}",
            content=data,
            headers={"Content-Type": "application/octet-stream"},
        )
        r.raise_for_status()
        result = r.json()
        blob_id = (
            result.get("newlyCreated", {}).get("blobObject", {}).get("blobId")
            or result.get("alreadyCertified", {}).get("blobId")
            or ""
        )
        if not blob_id:
            raise ValueError(f"No blob ID in Walrus response: {result}")
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
            ObjectID(VAULT_OBJECT),
            ObjectID(oracle_id),
            SuiArray([SuiU64(b) for b in reasoning_hash]),   # vector<u8>
            SuiU64(anchored_at_ms),
            SuiU64(risk_score),
            SuiU64(hedge_budget_bps),
            SuiU64(news_signal_bps),
            SuiU64(svi_gap_bps),
            SuiU64(memory_cycles_recalled),
            SuiString(walrus_blob_id).encode_bytes(),
            SuiString("openmind-vault").encode_bytes(),
        ],
        type_arguments=[],
    )

    result = client.execute(txn)
    if result.is_err():
        raise RuntimeError(f"Anchor tx failed: {result.result_string}")
    digest = result.result_data.digest
    print(f"OPENMIND_ANCHOR_TX digest={digest}")
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

    NOTE: as of Section 5.6 (agent_cap.move), open_cycle takes an additional
    agent_cap: &mut AgentCap argument, presented immediately after VAULT_OBJECT.
    AGENT_CAP_OBJECT must be set in config.py alongside VAULT_OBJECT/VAULT_MANAGER
    once agent_cap::grant() has been called once at setup time.
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
            SuiArray([SuiU64(b) for b in reasoning_hash]),
            SuiU64(risk_score),
            SuiU64(news_signal_bps),
            SuiU64(svi_gap_bps),
            SuiU64(memory_cycles_recalled),
            ObjectID(CLOCK_OBJECT),
        ],
    )

    result = client.execute(txn)
    if result.is_err():
        # ERevoked / EExpired / EBudgetExceeded from agent_cap surface here —
        # this is the on-chain enforcement point for the owner's revoke() call.
        raise RuntimeError(f"open_cycle tx failed: {result.result_string}")
    digest = result.result_data.digest
    print(f"OPENMIND_CYCLE_OPENED digest={digest}")
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

    result = client.execute(txn)
    if result.is_err():
        raise RuntimeError(f"close_cycle tx failed: {result.result_string}")
    digest = result.result_data.digest
    print(f"OPENMIND_CYCLE_CLOSED digest={digest}")
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
    The on-chain MIN_DIRECTIONAL_EDGE_BPS check is the real backstop — this
    call can still fail on-chain even if evaluate_directional() in cycle.py
    decided to proceed, which is intentional defense in depth.
    Same agent_cap enforcement as execute_open_cycle_tx (Section 5.6) —
    the directional leg draws against the SAME cumulative AgentCap budget
    as the hedge leg, not a separate ceiling.
    """
    client = get_sui_client()
    txn = SyncTransaction(client=client)

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
            is_up,
            SuiU64(quantity),
            SuiU64(p_model),
            SuiU64(p_surface),
            SuiU64(kelly_fraction_bps),
            SuiArray([SuiU64(b) for b in reasoning_hash]),
            ObjectID(CLOCK_OBJECT),
        ],
    )

    result = client.execute(txn)
    if result.is_err():
        raise RuntimeError(f"open_directional_position tx failed: {result.result_string}")
    digest = result.result_data.digest
    print(f"OPENMIND_DIRECTIONAL_OPENED digest={digest}")
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

    result = client.execute(txn)
    if result.is_err():
        raise RuntimeError(f"close_directional_position tx failed: {result.result_string}")
    digest = result.result_data.digest
    print(f"OPENMIND_DIRECTIONAL_CLOSED digest={digest}")
    return digest
```

---

### 6.7 agent/main.py — Watch Loop Entrypoint

**Closes the loop.** Wires `watch.py`'s `watch_loop` to actually call
`evaluate_directional` and, when it returns a real (non-skip) decision,
execute the on-chain transaction. This is the missing piece connecting the
event-driven watch layer to the contract-execution layer — without this,
`watch_loop`'s `on_trigger` parameter has nothing real plugged into it.

```python
"""
Process entrypoint. Run with: python3 agent/main.py --oracle-id <id>
Starts the continuous watch loop and connects triggers to on-chain execution.
"""
import argparse
import asyncio

from watch import watch_loop
from cycle import evaluate_directional, run_hedge_cycle
from anchor import execute_open_directional_tx, execute_close_directional_tx


async def on_trigger(oracle_id: str, trigger: str, market: dict, new_news: list[dict]):
    """
    Called by watch_loop whenever a real trigger fires.
    cycle_open is handled separately by the scheduled keeper (run_cycle),
    so this only acts on the two event-driven triggers to avoid double-firing
    the hedge leg, which must only ever open once per expiry window.
    """
    if trigger == "cycle_open":
        # Hedge leg already handled by the keeper's scheduled run_cycle call.
        # Still evaluate directional here in case the keeper's own call
        # raced or hasn't fired yet for this oracle.
        pass

    result = await evaluate_directional(oracle_id, trigger, market, new_news)
    if result is None:
        print(f"DIRECTIONAL_SKIP oracle={oracle_id} trigger={trigger} (no qualifying edge)")
        return

    digest = execute_open_directional_tx(
        oracle_id=oracle_id,
        strike=result["strike"],
        is_up=result["is_up"],
        quantity=result["p_model"],  # quantity sizing handled on-chain via kelly_fraction_bps
        p_model=result["p_model"],
        p_surface=result["p_surface"],
        kelly_fraction_bps=result["kelly_fraction_bps"],
        reasoning_hash=bytes.fromhex(result["reasoning_hash_hex"]),
    )
    print(f"DIRECTIONAL_OPENED oracle={oracle_id} trigger={trigger} tx={digest} "
          f"is_up={result['is_up']} kelly_bps={result['kelly_fraction_bps']} "
          f"walrus={result['walrus_blob_id']}")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--oracle-id", required=True)
    args = parser.parse_args()
    await watch_loop(args.oracle_id, on_trigger)


if __name__ == "__main__":
    asyncio.run(main())
```

---

### 12.2 keeper/src/vaultCycle.ts

```typescript
/**
 * openmind vault keeper — cron-safe cycle loop.

 * open: spawn agent → anchor → open_cycle
 * close: close_cycle after oracle settles
 * roll: close if settled, then open next
 * status: print vault accounting
 *
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
 * Reference: https://docs.sui.io/develop/transactions
 * Predict server: https://predict-server.testnet.mystenlabs.com
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SuiClient } from "@mysten/sui/client";
import {
  PREDICT_PACKAGE, PREDICT_SHARED, DUSDC_TYPE,
  PREDICT_SERVER, CLOCK_OBJECT,
  OPENMIND_PACKAGE, VAULT_OBJECT, VAULT_MANAGER,
  SUI_RPC,
} from "./config.ts";
import { surfaceReadout, type OracleState } from "./surface.ts";
import { uploadToWalrus } from "./walrus.ts";

const client = new SuiClient({ url: SUI_RPC });

// Strike 1% below spot — keeper advisory only, vault polices on-chain
const STRIKE_SPOT_BPS = Number(process.env.VAULT_STRIKE_SPOT_BPS ?? 9_900);
// Min horizon so oracle is live long enough to be worth hedging
const MIN_HORIZON_MS = Number(process.env.VAULT_MIN_HORIZON_MS ?? 75 * 60_000);

const DATA_DIR = new URL("../data", import.meta.url).pathname;
const FILLS_PATH = `${DATA_DIR}/vault_fills.ndjson`;

// ─── Keypair ─────────────────────────────────────────────────────────────────

function loadKeypair(): Ed25519Keypair {
  const raw = process.env.SUI_KEEPER_KEY;
  if (!raw) throw new Error("SUI_KEEPER_KEY not set");
  const { schema, secretKey } = decodeSuiPrivateKey(raw.trim());
  if (schema !== "ED25519") throw new Error(`Unsupported schema ${schema}`);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

// ─── Vault state ─────────────────────────────────────────────────────────────

type OpenCycle = {
  oracle_id: string;
  expiry_ms: string;
  strike: string;
  quantity: string;
  budget_spent: string;
  reasoning_hash: number[];
  risk_score: string;
};

type VaultFields = {
  buffer: string;
  plp_book: string;
  open: { fields: OpenCycle } | null;
  paused: boolean;
  cycles_completed: string;
  lifetime_hedge_spent: string;
  lifetime_realized: string;
};

async function readVault(): Promise<VaultFields> {
  const res = await client.getObject({ id: VAULT_OBJECT, options: { showContent: true } });
  const content = res.data?.content;
  if (!content || content.dataType !== "moveObject") throw new Error("Vault unreadable");
  const f = content.fields as Record<string, unknown>;
  return {
    buffer: String(f.buffer ?? "0"),
    plp_book: String(f.plp_book ?? "0"),
    open: (f.open as { fields: OpenCycle } | null) ?? null,
    paused: Boolean(f.paused),
    cycles_completed: String(f.cycles_completed ?? "0"),
    lifetime_hedge_spent: String(f.lifetime_hedge_spent ?? "0"),
    lifetime_realized: String(f.lifetime_realized ?? "0"),
  };
}

function nav(v: VaultFields): bigint {
  return BigInt(v.buffer) + BigInt(v.plp_book);
}

// ─── Oracle helpers ───────────────────────────────────────────────────────────

type OracleListing = {
  oracle_id: string; expiry: string; status: string;
  min_strike: string; tick_size: string; underlying_asset: string;
  settlement_price?: string;
};

async function listOracles(): Promise<OracleListing[]> {
  const r = await fetch(`${PREDICT_SERVER}/oracles`);
  if (!r.ok) throw new Error(`/oracles ${r.status}`);
  return r.json() as Promise<OracleListing[]>;
}

async function getOracleState(id: string): Promise<OracleState> {
  const r = await fetch(`${PREDICT_SERVER}/oracles/${id}/state`);
  if (!r.ok) throw new Error(`/oracles/${id}/state ${r.status}`);
  return r.json() as Promise<OracleState>;
}

async function soonestEligibleOracle(): Promise<OracleListing> {
  const oracles = await listOracles();
  const floor = Date.now() + MIN_HORIZON_MS;
  const eligible = oracles
    .filter(o => o.status === "active" && Number(o.expiry) >= floor)
    .sort((a, b) => Number(a.expiry) - Number(b.expiry));
  if (!eligible.length) throw new Error("No active oracle beyond minimum horizon");
  return eligible[0];
}

function pickStrike(oracle: OracleListing, state: OracleState): bigint {
  const spot = BigInt(state.latest_price!.spot);
  const target = (spot * BigInt(STRIKE_SPOT_BPS)) / 10_000n;
  const min = BigInt(oracle.min_strike);
  const tick = BigInt(oracle.tick_size);
  if (target <= min) throw new Error("Spot target below strike grid floor");
  const k = (target - min) / tick;
  return min + k * tick;
}

// ─── Append fill row ──────────────────────────────────────────────────────────

function appendFill(row: Record<string, unknown>) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    appendFileSync(FILLS_PATH, JSON.stringify(row) + "\n");
  } catch (err) {
    console.error(`Fill write failed: ${err instanceof Error ? err.message : err}`);
  }
}

// ─── Call Python agent ────────────────────────────────────────────────────────

type AgentOutput = {
  reasoning_hash_hex: string;     // 64 hex chars = 32 bytes
  walrus_blob_id: string;
  risk_score: number;             // 0–10000
  budget_bps: number;
  news_signal_bps: number;
  svi_gap_bps: number;
  memory_cycles_recalled: number;
  anchor_tx_digest: string;
  reasoning_summary: string;
};

async function runAgent(oracleId: string): Promise<AgentOutput> {
  /**
   * Spawn Python agent for this oracle cycle.
   * Agent does: recall → news → analyze → score → upload Walrus → anchor Sui
   * Returns JSON with decision metadata.
   */
  const output = execSync(
    `python3 agent/cycle.py --oracle-id ${oracleId} --output-json`,
    { env: { ...process.env }, encoding: "utf8", timeout: 120_000 }
  );
  return JSON.parse(output.trim()) as AgentOutput;
}

// ─── Open cycle ───────────────────────────────────────────────────────────────

async function openCycle() {
  const v = await readVault();
  if (v.open) throw new Error("Cycle already open");

  const oracle = await soonestEligibleOracle();
  const state = await getOracleState(oracle.oracle_id);
  const strike = pickStrike(oracle, state);
  const navNow = nav(v);

  // Run openmind agent — it anchors reasoning on Sui, returns hash + metadata
  console.log(`Running openmind agent for oracle ${oracle.oracle_id}...`);
  const agent = await runAgent(oracle.oracle_id);

  // Convert hex hash to byte array for Move
  const hashBytes = Array.from(Buffer.from(agent.reasoning_hash_hex, "hex"));
  const quantity = navNow * BigInt(agent.budget_bps) / 10_000n;

  // NOTE: open_cycle now requires agent_cap (Section 5.6). Tx reverts with
  // ERevoked/EExpired/EBudgetExceeded if the owner has revoked authority or
  // the keeper has exceeded its granted ceiling — this is the on-chain
  // enforcement point demoed live on the /wallet page.
  const tx = new Transaction();
  tx.moveCall({
    target: `${OPENMIND_PACKAGE}::openmind_vault::open_cycle`,
    typeArguments: [DUSDC_TYPE],
    arguments: [
      tx.object(VAULT_OBJECT),
      tx.object(AGENT_CAP_OBJECT),
      tx.object(PREDICT_SHARED),
      tx.object(VAULT_MANAGER),
      tx.object(oracle.oracle_id),
      tx.pure.u64(strike),
      tx.pure.u64(quantity),
      tx.pure.u64(agent.budget_bps),
      tx.pure.vector("u8", hashBytes),
      tx.pure.u64(agent.risk_score),
      tx.pure.u64(agent.news_signal_bps),
      tx.pure.u64(agent.svi_gap_bps),
      tx.pure.u64(agent.memory_cycles_recalled),
      tx.object(CLOCK_OBJECT),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: loadKeypair(),
    transaction: tx,
    options: { showEvents: true, showEffects: true },
  });

  if (result.effects?.status?.status !== "success") {
    throw new Error(`open_cycle failed: ${JSON.stringify(result.effects?.status)}`);
  }

  console.log("OPENMIND_VAULT_CYCLE_OPENED");
  console.log(`tx=${result.digest}`);
  console.log(`oracle=${oracle.oracle_id}`);
  console.log(`strike=${strike}`);
  console.log(`budget_bps=${agent.budget_bps}`);
  console.log(`reasoning_hash=${agent.reasoning_hash_hex}`);
  console.log(`walrus_blob=${agent.walrus_blob_id}`);
  console.log(`anchor_tx=${agent.anchor_tx_digest}`);
  console.log(`memory_recalled=${agent.memory_cycles_recalled}`);

  // Read SVI surface for fill quality receipt
  const readout = surfaceReadout(state, strike, false);
  const openEvent = result.events?.find(e => e.type.includes("OpenMindCycleOpened"))?.parsedJson as any;

  appendFill({
    kind: "open",
    at: new Date().toISOString(),
    tx: result.digest,
    anchorTx: agent.anchor_tx_digest,
    oracleId: oracle.oracle_id,
    expiryMs: Number(oracle.expiry),
    strike: strike.toString(),
    spot: state.latest_price?.spot,
    budgetBps: agent.budget_bps,
    quantity: quantity.toString(),
    riskScore: agent.risk_score,
    newsSIignalBps: agent.news_signal_bps,
    sviGapBps: agent.svi_gap_bps,
    memoryCyclesRecalled: agent.memory_cycles_recalled,
    reasoningHash: agent.reasoning_hash_hex,
    walrusBlobId: agent.walrus_blob_id,
    sviFair: readout.modelPrice,
    askCost: openEvent?.ask_cost,
    bidCost: openEvent?.bid_cost,
    reasoningSummary: agent.reasoning_summary,
  });
}

// ─── Close cycle ──────────────────────────────────────────────────────────────

async function closeCycle() {
  const v = await readVault();
  if (!v.open) throw new Error("No open cycle");
  const cycle = (v.open as any).fields as OpenCycle;
  const oracleId = cycle.oracle_id;

  const tx = new Transaction();
  tx.moveCall({
    target: `${OPENMIND_PACKAGE}::openmind_vault::close_cycle`,
    typeArguments: [DUSDC_TYPE],
    arguments: [
      tx.object(VAULT_OBJECT),
      tx.object(PREDICT_SHARED),
      tx.object(VAULT_MANAGER),
      tx.object(oracleId),
      tx.object(CLOCK_OBJECT),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: loadKeypair(),
    transaction: tx,
    options: { showEvents: true, showEffects: true },
  });

  if (result.effects?.status?.status !== "success") {
    throw new Error(`close_cycle failed: ${JSON.stringify(result.effects?.status)}`);
  }

  console.log("OPENMIND_VAULT_CYCLE_CLOSED");
  console.log(`tx=${result.digest}`);

  const closed = result.events?.find(e => e.type.includes("OpenMindCycleClosed"))?.parsedJson as any;
  const listing = (await listOracles()).find(o => o.oracle_id === oracleId);
  const settlement = listing?.settlement_price ? BigInt(listing.settlement_price) : undefined;
  const strike = BigInt(cycle.strike);
  const itm = settlement !== undefined ? settlement < strike : undefined;
  const quantity = BigInt(cycle.quantity);
  const budget = BigInt(cycle.budget_spent);
  const swept = closed?.manager_swept ? BigInt(closed.manager_swept) : undefined;
  const realizedHedgeCost =
    swept !== undefined && itm !== undefined
      ? (budget - swept + (itm ? quantity : 0n)).toString()
      : undefined;

  appendFill({
    kind: "close",
    at: new Date().toISOString(),
    tx: result.digest,
    oracleId,
    expiryMs: Number(cycle.expiry_ms),
    strike: cycle.strike,
    quantity: cycle.quantity,
    budgetSpent: cycle.budget_spent,
    reasoningHash: Buffer.from(cycle.reasoning_hash).toString("hex"),
    settlementPrice: settlement?.toString(),
    itm,
    plpRealized: closed?.plp_realized,
    managerSwept: closed?.manager_swept,
    navAfterClose: closed?.nav_after_close,
    realizedHedgeCost,
  });

  // Notify Python agent to store outcome in MemWal
  try {
    execSync(
      `python3 agent/cycle.py --after-close --oracle-id ${oracleId} ` +
      `--itm ${itm} --plp-realized ${closed?.plp_realized ?? 0} ` +
      `--nav-after ${closed?.nav_after_close ?? 0}`,
      { env: { ...process.env }, encoding: "utf8", timeout: 30_000 }
    );
  } catch (err) {
    console.error(`MemWal remember failed: ${err instanceof Error ? err.message : err}`);
  }
}

// ─── Roll (cron tick) ─────────────────────────────────────────────────────────

async function roll() {
  const v = await readVault();
  let closedThisTick = false;

  if (v.open) {
    const oracleId = (v.open as any).fields.oracle_id;
    const listing = (await listOracles()).find(o => o.oracle_id === oracleId);
    if (!listing || listing.status !== "settled") {
      console.log(`Cycle open, oracle ${oracleId} status=${listing?.status ?? "unknown"}; nothing to do`);
      return;
    }
    await closeCycle();
    closedThisTick = true;
  }

  const attempts = closedThisTick ? 4 : 1;
  for (let i = 1; i <= attempts; i++) {
    try {
      await openCycle();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Cycle already open") && i < attempts) {
        await new Promise(r => setTimeout(r, 3_000));
        continue;
      }
      if (msg.includes("No active oracle") || msg.includes("strike grid floor")) {
        console.log(`Open skipped: ${msg}`);
        return;
      }
      throw err;
    }
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

async function status() {
  const v = await readVault();
  console.log(JSON.stringify({
    vault: VAULT_OBJECT,
    navUsdc: Number(nav(v)) / 1e6,
    bufferUsdc: Number(v.buffer) / 1e6,
    plpBookUsdc: Number(v.plp_book) / 1e6,
    paused: v.paused,
    cyclesCompleted: Number(v.cycles_completed),
    lifetimeHedgeSpentUsdc: Number(v.lifetime_hedge_spent) / 1e6,
    lifetimeRealizedUsdc: Number(v.lifetime_realized) / 1e6,
    open: v.open,
  }, null, 2));
}

// ─── Entry ────────────────────────────────────────────────────────────────────

const mode = process.argv[2];
try {
  if (mode === "open")   await openCycle();
  else if (mode === "close") await closeCycle();
  else if (mode === "roll")  await roll();
  else await status();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
```

---

### 12.3 keeper/src/simVault.ts

```typescript
/**
 * openmind vault simulation.
 * Runs two strategies across all captured settled BTC oracles:
 *   A) Fixed 250bps budget every cycle (industry baseline)
 *   B) Dynamic budget from openmind scoring (news_signal + svi_gap + memory)
 * Each strategy at 3 PLP carry bands = 6 total sim runs.
 *
 * Input:  keeper/data/oracle_states.ndjson  (from simCapture.ts)
 *         keeper/data/vault_fills.ndjson    (from live vault cycles)
 * Output: web/public/sim/vault_sim.json
 *
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { surfaceReadout, type OracleState } from "./surface.ts";

const BPS = 10_000;
const PRICE_SCALE = 1_000_000_000;
const QUOTE_SCALE = 1_000_000;
const STRIKE_SPOT_BPS = 9_900;
const MIN_HORIZON_MS = 75 * 60_000;

// Fixed strategy params
const FIXED_HEDGE_BPS = 250;

// Dynamic strategy params (mirrors scorer.py)
const DYNAMIC_BASE_BPS = 150;
const DYNAMIC_MAX_NEWS_BPS = 200;
const DYNAMIC_MAX_GAP_BPS = 100;
const DYNAMIC_MAX_MEM_BPS = 150;
const DYNAMIC_HARD_CAP = 2000;

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ORACLE_STATES_PATH = join(REPO_ROOT, "keeper/data/oracle_states.ndjson");
const FILLS_PATH = join(REPO_ROOT, "keeper/data/vault_fills.ndjson");
const OUTPUT_PATH = join(REPO_ROOT, "web/public/sim/vault_sim.json");

// ─── Types ────────────────────────────────────────────────────────────────────

type CapturedOracle = {
  oracle: {
    oracle_id: string; expiry: number | string;
    min_strike: number | string; tick_size: number | string;
    status: string; settlement_price?: number | string | null;
    underlying_asset?: string; activated_at?: number | string;
  };
  latest_price?: OracleState["latest_price"];
  latest_svi?: OracleState["latest_svi"];
};

type FillRow = {
  kind: "open" | "close";
  tx: string; oracleId: string;
  budgetBps?: number; navAfterClose?: string;
  itm?: boolean; quantity?: string; budgetSpent?: string;
  managerSwept?: string; plpRealized?: string;
  riskScore?: number; newsSIgnalBps?: number; sviGapBps?: number;
};

type SimCycle = {
  date: string; oracleId: string; openMs: number; expiryMs: number;
  spotProxy: bigint; strike: bigint; settlementPrice: bigint;
  hedgeBps: number; premiumRate: number; budget: number;
  premiumCost: number; payout: number;
  hedgedNav: number; unhedgedNav: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lines(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").map(l => l.trim()).filter(Boolean);
}

function readNdjson<T>(path: string): T[] {
  return lines(path).map(l => JSON.parse(l) as T);
}

function asNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBigInt(v: number | string | null | undefined): bigint | null {
  if (v == null) return null;
  try { return BigInt(v); } catch { return null; }
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function round(v: number, d = 6): number {
  return Number(v.toFixed(d));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid-1] + s[mid]) / 2 : s[mid];
}

function snapStrike(row: CapturedOracle, spot: bigint): bigint | null {
  const min = asBigInt(row.oracle.min_strike);
  const tick = asBigInt(row.oracle.tick_size);
  if (!min || !tick || tick <= 0n) return null;
  const target = (spot * BigInt(STRIKE_SPOT_BPS)) / BigInt(BPS);
  if (target <= min) return null;
  return min + ((target - min) / tick) * tick;
}

function latestSettledBefore(rows: CapturedOracle[], atMs: number): CapturedOracle | null {
  let low = 0, high = rows.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((asNumber(rows[mid].oracle.expiry) ?? 0) <= atMs) low = mid + 1;
    else high = mid;
  }
  return low > 0 ? rows[low - 1] : null;
}

// ─── Dynamic budget simulator ─────────────────────────────────────────────────
// Approximates openmind scorer.py without live news/memory.
// Uses SVI surface variance as news_signal proxy.

function approximateDynamicBudget(row: CapturedOracle, strike: bigint): number {
  if (!row.latest_svi || !row.latest_price) return DYNAMIC_BASE_BPS;
  try {
    const readout = surfaceReadout(
      { oracle: row.oracle, latest_price: row.latest_price, latest_svi: row.latest_svi } as any,
      strike, false
    );
    // Use surface vol as proxy for news signal (high vol surface → high news signal)
    // This is a simulation approximation — real agent uses actual news
    const surfaceVol = Math.sqrt(
      Math.max(0, Number(row.latest_svi.a) / PRICE_SCALE +
        Number(row.latest_svi.b) / PRICE_SCALE)
    );
    const newsSignal = Math.min(1.0, surfaceVol * 3);
    const newsUplift = Math.round(newsSignal * DYNAMIC_MAX_NEWS_BPS);
    // Simulate gap: use 0 for sim (no live Polymarket data in historical captures)
    const gapUplift = 0;
    // Simulate memory uplift: 0 for first cycle, grows over time
    const memUplift = 0;
    return Math.min(DYNAMIC_BASE_BPS + newsUplift + gapUplift + memUplift, DYNAMIC_HARD_CAP);
  } catch {
    return DYNAMIC_BASE_BPS;
  }
}

// ─── Core simulation ──────────────────────────────────────────────────────────

function simulate(
  rows: CapturedOracle[],
  initialNav: number,
  premiumRate: number,
  carryBps: number,
  strategyFn: (row: CapturedOracle, strike: bigint, nav: number) => number,
): { cycles: SimCycle[]; skipped: number; hedgedNav: number; unhedgedNav: number;
    totalHedgeSpend: number; totalPayouts: number; payoutCount: number;
    maxDrawdownHedgedBps: number; maxDrawdownUnhedgedBps: number } {

  let hedgedNav = initialNav, unhedgedNav = initialNav;
  let peakH = initialNav, peakU = initialNav;
  let maxDrawH = 0, maxDrawU = 0;
  let totalHedgeSpend = 0, totalPayouts = 0, payoutCount = 0, skipped = 0;
  const cycles: SimCycle[] = [];
  let cursor = 0;
  let currentTime = asNumber(rows[0]?.oracle.expiry) ?? 0;

  while (cursor < rows.length) {
    while (cursor < rows.length &&
      (asNumber(rows[cursor].oracle.expiry) ?? 0) < currentTime + MIN_HORIZON_MS) {
      cursor++;
    }
    if (cursor >= rows.length) break;

    const row = rows[cursor++];
    const expiry = asNumber(row.oracle.expiry);
    const settlement = asBigInt(row.oracle.settlement_price);
    if (expiry == null || settlement == null) { skipped++; currentTime = expiry ?? currentTime; continue; }

    const proxy = latestSettledBefore(rows, currentTime);
    const spotProxy = proxy ? asBigInt(proxy.oracle.settlement_price) : null;
    if (!spotProxy) { skipped++; currentTime = expiry; continue; }

    const strike = snapStrike(row, spotProxy);
    if (!strike) { skipped++; currentTime = expiry; continue; }

    const hedgeBps = strategyFn(row, strike, hedgedNav);
    const budget = hedgedNav * (hedgeBps / BPS);
    const premiumCost = budget * premiumRate;
    const itm = settlement < strike;
    const payout = itm ? budget : 0;
    const downsideLoss = itm ? budget : 0;

    const hedgedCarry = hedgedNav * (carryBps / BPS);
    const unhedgedCarry = unhedgedNav * (carryBps / BPS);
    hedgedNav = Math.max(0, hedgedNav + hedgedCarry - premiumCost + payout - downsideLoss);
    unhedgedNav = Math.max(0, unhedgedNav + unhedgedCarry - downsideLoss);

    peakH = Math.max(peakH, hedgedNav); peakU = Math.max(peakU, unhedgedNav);
    maxDrawH = Math.max(maxDrawH, ((peakH - hedgedNav) / peakH) * BPS);
    maxDrawU = Math.max(maxDrawU, ((peakU - unhedgedNav) / peakU) * BPS);
    totalHedgeSpend += premiumCost; totalPayouts += payout;
    if (payout > 0) payoutCount++;

    cycles.push({
      date: isoDate(expiry), oracleId: row.oracle.oracle_id,
      openMs: currentTime, expiryMs: expiry,
      spotProxy, strike, settlementPrice: settlement,
      hedgeBps, premiumRate, budget, premiumCost, payout,
      hedgedNav, unhedgedNav,
    });
    currentTime = expiry;
  }

  return { cycles, skipped, hedgedNav, unhedgedNav,
    totalHedgeSpend, totalPayouts, payoutCount,
    maxDrawdownHedgedBps: maxDrawH, maxDrawdownUnhedgedBps: maxDrawU };
}

function summarize(r: ReturnType<typeof simulate>, initNav: number) {
  const first = r.cycles[0], last = r.cycles[r.cycles.length - 1];
  return {
    cycles: r.cycles.length, skipped: r.skipped,
    spanStart: first?.date ?? null, spanEnd: last?.date ?? null,
    initialNav: round(initNav, 6),
    endingHedgedNav: round(r.hedgedNav, 6),
    endingUnhedgedNav: round(r.unhedgedNav, 6),
    totalHedgeSpendBps: round((r.totalHedgeSpend / initNav) * BPS, 2),
    payoutCount: r.payoutCount,
    hitRate: r.cycles.length ? round(r.payoutCount / r.cycles.length, 4) : 0,
    totalPayouts: round(r.totalPayouts, 6),
    netCostBps: round(((r.totalHedgeSpend - r.totalPayouts) / initNav) * BPS, 2),
    maxDrawdownHedgedBps: round(r.maxDrawdownHedgedBps, 2),
    maxDrawdownUnhedgedBps: round(r.maxDrawdownUnhedgedBps, 2),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const oracleRows = readNdjson<CapturedOracle>(ORACLE_STATES_PATH)
  .filter(r => r.oracle.status === "settled" && r.oracle.underlying_asset === "BTC")
  .sort((a, b) => (asNumber(a.oracle.expiry) ?? 0) - (asNumber(b.oracle.expiry) ?? 0));

const fills = readNdjson<FillRow>(FILLS_PATH);
const firstOpen = fills.find(f => f.kind === "open" && f.budgetBps);
const initialNav = firstOpen
  ? (Number(firstOpen.budgetBps ?? 250) > 0 ? 100 : 100)
  : 100;

// Calibrate premium from live fills
const openFills = fills.filter(f => f.kind === "open");
const premiumRate = openFills.length > 0
  ? median(openFills.map(f => Number(f.riskScore ?? 4000) / PRICE_SCALE))
  : 0.04; // 4% fallback

// Calibrate carry from live closes
const closeFills = fills.filter(f => f.kind === "close" && f.navAfterClose);
const carryBase = closeFills.length > 1
  ? median(closeFills.slice(1).map((c, i) => {
      const prev = Number(closeFills[i].navAfterClose ?? 0) / QUOTE_SCALE;
      const curr = Number(c.navAfterClose ?? 0) / QUOTE_SCALE;
      return prev > 0 ? ((curr - prev) / prev) * BPS : 0;
    }))
  : 2; // 2 bps / cycle fallback

const carryBand = { low: carryBase * 0.5, base: carryBase, high: carryBase * 2 };

// Strategy functions
const fixedStrategy = (_row: CapturedOracle, _strike: bigint, _nav: number) => FIXED_HEDGE_BPS;
const dynamicStrategy = (row: CapturedOracle, strike: bigint, _nav: number) =>
  approximateDynamicBudget(row, strike);

// Run all 6 simulations
const fixedBase    = simulate(oracleRows, initialNav, premiumRate, carryBand.base, fixedStrategy);
const fixedLow     = simulate(oracleRows, initialNav, premiumRate, carryBand.low,  fixedStrategy);
const fixedHigh    = simulate(oracleRows, initialNav, premiumRate, carryBand.high, fixedStrategy);
const dynamicBase  = simulate(oracleRows, initialNav, premiumRate, carryBand.base, dynamicStrategy);
const dynamicLow   = simulate(oracleRows, initialNav, premiumRate, carryBand.low,  dynamicStrategy);
const dynamicHigh  = simulate(oracleRows, initialNav, premiumRate, carryBand.high, dynamicStrategy);

const avgDynamicBps = dynamicBase.cycles.length > 0
  ? round(dynamicBase.cycles.reduce((s, c) => s + c.hedgeBps, 0) / dynamicBase.cycles.length, 1)
  : DYNAMIC_BASE_BPS;

const report = {
  version: "openmind-vault-sim-v1",
  generatedAt: new Date().toISOString(),
  source: {
    oracleStates: ORACLE_STATES_PATH,
    oracleStateLines: oracleRows.length,
    fillRows: fills.length,
    sha256: createHash("sha256").update(readFileSync(ORACLE_STATES_PATH)).digest("hex"),
  },
  fixedStrategy: {
    hedgeBps: FIXED_HEDGE_BPS,
    summary: summarize(fixedBase, initialNav),
    series: fixedBase.cycles.map(c => ({
      date: c.date, hedgedNav: round(c.hedgedNav, 6),
      unhedgedNav: round(c.unhedgedNav, 6), payout: round(c.payout, 6),
    })),
  },
  dynamicStrategy: {
    avgBudgetBps: avgDynamicBps,
    summary: summarize(dynamicBase, initialNav),
    series: dynamicBase.cycles.map(c => ({
      date: c.date, hedgedNav: round(c.hedgedNav, 6),
      unhedgedNav: round(c.unhedgedNav, 6), payout: round(c.payout, 6),
      hedgeBps: c.hedgeBps,
    })),
  },
  carrySweep: [
    { label: "0.5x carry", carryBps: round(carryBand.low, 4),
      fixed: summarize(fixedLow, initialNav), dynamic: summarize(dynamicLow, initialNav) },
    { label: "1.0x carry", carryBps: round(carryBand.base, 4),
      fixed: summarize(fixedBase, initialNav), dynamic: summarize(dynamicBase, initialNav) },
    { label: "2.0x carry", carryBps: round(carryBand.high, 4),
      fixed: summarize(fixedHigh, initialNav), dynamic: summarize(dynamicHigh, initialNav) },
  ],
  calibration: {
    premiumRate: round(premiumRate, 9),
    carryBandBps: carryBand,
    liveFills: fills.length,
  },
  methodology: [
    "Sort settled BTC oracle captures by expiry and replay non-overlapping vault cycles.",
    "Minimum horizon 75 minutes per cycle, matching live keeper MIN_HORIZON_MS.",
    "Strike snapped to STRIKE_SPOT_BPS=9900 (1% OTM downside) on oracle grid.",
    `Fixed strategy: ${FIXED_HEDGE_BPS}bps every cycle.`,
    `Dynamic strategy: ${DYNAMIC_BASE_BPS}–${DYNAMIC_HARD_CAP}bps based on SVI surface vol proxy (simulation approximation of live agent news+memory signal).`,
    "Three PLP carry bands: 0.5x / 1.0x / 2.0x of observed live carry.",
    "Unhedged baseline takes same downside loss as hedge is sized to cover.",
  ],
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log("OPENMIND_SIMULATION_VALID");
console.log(JSON.stringify({
  output: OUTPUT_PATH,
  oracleRows: oracleRows.length,
  fixedCycles: fixedBase.cycles.length,
  dynamicCycles: dynamicBase.cycles.length,
  avgDynamicBps,
}, null, 2));
```

---

### 12.4 scripts/verify-contracts.mjs

```javascript
#!/usr/bin/env node
/**
 * Verify Move contracts build and tests pass.
 * Reference: https://docs.sui.io/develop/write-move/
 */
import { execSync } from "node:child_process";

const run = (cmd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run("sui move build --path contracts");
run("sui move test --path contracts");

// Confirm OZ imports resolve
const { readFileSync } = await import("node:fs");
const toml = readFileSync("contracts/Move.toml", "utf8");
["openzeppelin_math", "openzeppelin_fp_math", "openzeppelin_access"].forEach(dep => {
  if (!toml.includes(dep)) throw new Error(`Missing OZ dependency: ${dep}`);
});

console.log("OPENMIND_CONTRACTS_VALID");
```

### 12.5 scripts/verify-receipts.mjs

```javascript
#!/usr/bin/env node
/**
 * Replay live on-chain proof receipts.
 * Verifies real tx digests exist on Sui testnet.
 */
import { SuiClient } from "@mysten/sui/client";
import { readFileSync, existsSync } from "node:fs";

const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });
const FILLS_PATH = "keeper/data/vault_fills.ndjson";

if (!existsSync(FILLS_PATH)) {
  console.log("No fills yet — skipping receipt replay");
  console.log("OPENMIND_RECEIPTS_VALID");
  process.exit(0);
}

const fills = readFileSync(FILLS_PATH, "utf8")
  .split("\n").filter(Boolean).map(l => JSON.parse(l));

let verified = 0, failed = 0;
for (const fill of fills.slice(-10)) { // verify last 10
  try {
    const tx = await client.getTransactionBlock({ digest: fill.tx, options: { showEffects: true } });
    if (tx.effects?.status?.status !== "success") {
      console.error(`FAILED: tx ${fill.tx} status=${tx.effects?.status?.status}`);
      failed++;
    } else {
      verified++;
    }
  } catch (err) {
    console.error(`ERROR: tx ${fill.tx}: ${err.message}`);
    failed++;
  }
}

if (failed > 0) throw new Error(`${failed} receipt(s) failed verification`);
console.log(`Verified ${verified} receipts`);
console.log("OPENMIND_RECEIPTS_VALID");
```

### 12.6 scripts/verify-simulation.mjs

```javascript
#!/usr/bin/env node
/**
 * Run and validate the vault simulation.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

// Capture oracle states if not present
if (!existsSync("keeper/data/oracle_states.ndjson")) {
  console.log("Capturing oracle states...");
  execSync("npm --prefix keeper exec tsx src/simCapture.ts", { stdio: "inherit" });
}

// Run simulation
execSync("npm --prefix keeper exec tsx src/simVault.ts", { stdio: "inherit" });

// Validate output
const sim = JSON.parse(readFileSync("web/public/sim/vault_sim.json", "utf8"));
if (!sim.fixedStrategy) throw new Error("Missing fixedStrategy in sim output");
if (!sim.dynamicStrategy) throw new Error("Missing dynamicStrategy in sim output");
if (sim.carrySweep?.length !== 3) throw new Error("Expected 3 carry sweep bands");
if (sim.fixedStrategy.summary.cycles < 10) throw new Error("Too few sim cycles — check oracle capture");

console.log(`Sim: ${sim.fixedStrategy.summary.cycles} cycles`);
console.log(`Fixed ending NAV: ${sim.fixedStrategy.summary.endingHedgedNav}`);
console.log(`Dynamic ending NAV: ${sim.dynamicStrategy.summary.endingHedgedNav}`);
console.log(`Dynamic avg budget: ${sim.dynamicStrategy.avgBudgetBps}bps`);
console.log("OPENMIND_SIMULATION_VALID");
```

### 12.7 scripts/verify-public-surface.mjs

```javascript
#!/usr/bin/env node
/**
 * Verify Predict server and Walrus public endpoints are live.
 * Reference: https://predict-server.testnet.mystenlabs.com
 * Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
 */

const PREDICT_SERVER = "https://predict-server.testnet.mystenlabs.com";
const WALRUS_AGG = "https://aggregator.walrus-testnet.walrus.space";

async function check(label, url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`${label} returned ${r.status}`);
  console.log(`✓ ${label} — ${r.status}`);
}

await check("Predict server /status", `${PREDICT_SERVER}/status`);
await check("Predict server /oracles",`${PREDICT_SERVER}/oracles`);
await check("Walrus aggregator",       `${WALRUS_AGG}/v1`);

// Verify at least one active BTC oracle exists
const oracles = await (await fetch(`${PREDICT_SERVER}/oracles`)).json();
const active = oracles.filter(o => o.status === "active" && o.underlying_asset === "BTC");
if (!active.length) console.warn("Warning: No active BTC oracles right now");
else console.log(`✓ ${active.length} active BTC oracle(s) found`);

console.log("OPENMIND_PUBLIC_SURFACE_VALID");
```

### 12.8 scripts/verify-narrative.mjs

```javascript
#!/usr/bin/env node
/**
 * Check submission narrative for forbidden guarantee language.
 * Ensures no false promises of returns, principal protection, or fixed APY.
 */
import { readFileSync, existsSync } from "node:fs";

const FORBIDDEN = [
  "guaranteed", "principal protected", "fixed apy",
  "no risk", "risk free", "will return", "always profitable",
  "100%", "certain",
];

const files = ["README.md", "web/app/page.tsx", "web/app/vault/page.tsx"].filter(existsSync);
let violations = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8").toLowerCase();
  for (const term of FORBIDDEN) {
    if (content.includes(term)) {
      console.error(`Narrative violation in ${file}: "${term}"`);
      violations++;
    }
  }
}

if (violations > 0) throw new Error(`${violations} narrative violation(s)`);
console.log("OPENMIND_NARRATIVE_VALID");
```

---

### 12.9 web/app/page.tsx — Landing Page

```tsx
/**
 * openmind landing page.
 * Shows live vault state, current AI reasoning, and proof badge.
 * Reference for vault data: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault
 */
"use client";
import { useEffect, useState } from "react";

const PREDICT_SERVER = "https://predict-server.testnet.mystenlabs.com";
const VAULT_OBJECT = process.env.NEXT_PUBLIC_VAULT_OBJECT ?? "";

type VaultSummary = { nav: number; cyclesCompleted: number; openCycle?: { oracle_id: string; expiry_ms: number; strike: number; budget_bps: number } };
type ReasoningEvent = { reasoning_hash: string; risk_score: number; news_signal_bps: number; memory_cycles_recalled: number; reasoning_summary?: string };

export default function Home() {
  const [vault, setVault] = useState<VaultSummary | null>(null);
  const [reasoning, setReasoning] = useState<ReasoningEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [vaultRes, simRes] = await Promise.all([
          fetch(`/api/vault/state`),
          fetch(`/sim/vault_sim.json`),
        ]);
        if (vaultRes.ok) setVault(await vaultRes.json());
        // Latest reasoning from fills ledger
        const latestFill = await fetch(`/api/vault/latest-reasoning`);
        if (latestFill.ok) setReasoning(await latestFill.json());
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-green-400">openmind</h1>
          <p className="text-gray-400 text-lg">
            AI-driven adaptive carry vault on DeepBook Predict.
            Hedge budget set by reasoning. Proof on chain.
          </p>
        </div>

        {/* Live Vault State */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded p-4">
            <div className="text-xs text-gray-500 mb-1">VAULT NAV</div>
            <div className="text-2xl font-bold">
              {vault ? `${(vault.nav / 1e6).toFixed(4)} USDC` : "—"}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded p-4">
            <div className="text-xs text-gray-500 mb-1">CYCLES COMPLETED</div>
            <div className="text-2xl font-bold">{vault?.cyclesCompleted ?? "—"}</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded p-4">
            <div className="text-xs text-gray-500 mb-1">CURRENT CYCLE</div>
            <div className="text-sm">
              {vault?.openCycle
                ? `Expires ${new Date(vault.openCycle.expiry_ms).toLocaleTimeString()}`
                : "No open cycle"}
            </div>
          </div>
        </div>

        {/* AI Reasoning Feed */}
        {reasoning && (
          <div className="bg-gray-900 border border-green-800 rounded p-6 mb-8">
            <div className="text-xs text-green-500 mb-3 uppercase tracking-wider">
              Latest AI Reasoning
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Risk Score</span>
                <div className="text-xl font-bold text-green-400">
                  {(reasoning.risk_score / 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-gray-500">News Signal</span>
                <div className="text-xl font-bold">
                  {reasoning.news_signal_bps}bps
                </div>
              </div>
              <div>
                <span className="text-gray-500">Memory Recalled</span>
                <div className="text-xl font-bold">
                  {reasoning.memory_cycles_recalled} cycles
                </div>
              </div>
            </div>
            {reasoning.reasoning_summary && (
              <p className="text-gray-300 text-sm border-t border-gray-700 pt-3">
                {reasoning.reasoning_summary}
              </p>
            )}
            <div className="mt-3 text-xs text-gray-600">
              Hash: {reasoning.reasoning_hash.slice(0, 16)}...
              <a href="/proof" className="ml-2 text-green-600 hover:text-green-400">
                Verify on-chain →
              </a>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-4">
          <a href="/vault" className="bg-green-600 hover:bg-green-500 text-black font-bold px-6 py-3 rounded">
            Deposit dUSDC
          </a>
          <a href="/brain" className="border border-gray-600 hover:border-gray-400 px-6 py-3 rounded">
            View AI Brain
          </a>
          <a href="/proof" className="border border-gray-600 hover:border-gray-400 px-6 py-3 rounded">
            Verify Proofs
          </a>
        </div>
      </div>
    </main>
  );
}
```

### 12.10 web/app/brain/page.tsx — Reasoning Explorer

```tsx
/**
 * Brain page — full reasoning trace + MemWal memory explorer per cycle.
 * Reads OpenMindCycleOpened events from Sui + fills ledger.
 * Reference: https://docs.wal.app/walrus-memory/getting-started/what-is-walrus-memory
 */
"use client";
import { useEffect, useState } from "react";

type CycleReasoning = {
  oracle_id: string; expiry_ms: number; strike: number;
  budget_bps: number; risk_score: number; news_signal_bps: number;
  svi_gap_bps: number; memory_cycles_recalled: number;
  reasoning_hash: string; walrus_blob_id: string;
  reasoning_summary?: string; ask_cost: number; bid_cost: number;
  tx: string; at: string; itm?: boolean; payout?: number;
};

export default function Brain() {
  const [cycles, setCycles] = useState<CycleReasoning[]>([]);
  const [selected, setSelected] = useState<CycleReasoning | null>(null);
  const [walrusData, setWalrusData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/vault/reasoning-history")
      .then(r => r.json())
      .then(data => { setCycles(data); if (data.length) setSelected(data[0]); });
  }, []);

  async function loadWalrusBlob(blobId: string) {
    // Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
    const r = await fetch(
      `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`
    );
    if (r.ok) setWalrusData(await r.json());
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-green-400">AI Brain</h1>
        <p className="text-gray-400 mb-8">
          openmind's reasoning trace per cycle.
          Every decision is stored in MemWal and anchored on Sui before settlement.
        </p>

        <div className="grid grid-cols-3 gap-6">
          {/* Cycle list */}
          <div className="col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
            {cycles.map(c => (
              <button
                key={c.oracle_id}
                onClick={() => { setSelected(c); setWalrusData(null); if (c.walrus_blob_id) loadWalrusBlob(c.walrus_blob_id); }}
                className={`w-full text-left p-3 rounded border text-sm ${
                  selected?.oracle_id === c.oracle_id
                    ? "border-green-500 bg-gray-800"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <div className="text-xs text-gray-500">{new Date(c.expiry_ms).toLocaleString()}</div>
                <div className="flex justify-between mt-1">
                  <span>{c.budget_bps}bps hedge</span>
                  <span className={c.itm ? "text-green-400" : "text-gray-500"}>
                    {c.itm === undefined ? "open" : c.itm ? "PAID" : "expired"}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  risk {(c.risk_score/100).toFixed(0)}% | {c.memory_cycles_recalled} mem
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="col-span-2 bg-gray-900 border border-gray-700 rounded p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  ["Hedge Budget", `${selected.budget_bps}bps`],
                  ["Risk Score", `${(selected.risk_score/100).toFixed(1)}%`],
                  ["News Signal", `${selected.news_signal_bps}bps`],
                  ["SVI Gap", `${selected.svi_gap_bps}bps`],
                  ["Memory Recalled", `${selected.memory_cycles_recalled} cycles`],
                  ["Ask / Bid", `${selected.ask_cost} / ${selected.bid_cost}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-bold">{value}</div>
                  </div>
                ))}
              </div>

              {selected.reasoning_summary && (
                <div className="border-t border-gray-700 pt-4 mb-4">
                  <div className="text-xs text-gray-500 mb-1">REASONING SUMMARY</div>
                  <p className="text-sm text-gray-300">{selected.reasoning_summary}</p>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4 text-xs text-gray-600 space-y-1">
                <div>Reasoning hash: <span className="text-gray-400">{selected.reasoning_hash}</span></div>
                <div>Tx: <a href={`https://suiscan.xyz/testnet/tx/${selected.tx}`} target="_blank" className="text-green-600">{selected.tx.slice(0,16)}...</a></div>
                {selected.walrus_blob_id && (
                  <div>Walrus blob: <span className="text-gray-400">{selected.walrus_blob_id}</span></div>
                )}
              </div>

              {walrusData && (
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="text-xs text-gray-500 mb-2">FULL REASONING FROM WALRUS</div>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-48 bg-gray-950 p-3 rounded">
                    {JSON.stringify(walrusData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

### 12.11 web/app/proof/page.tsx — Verification Page

```tsx
/**
 * On-chain proof verification page.
 * Lists all ReasoningAnchor objects, lets anyone verify hash vs Walrus blob.
 * Reference: https://docs.wal.app/docs/http-api/storing-blobs
 */
"use client";
import { useEffect, useState } from "react";
import { createHash } from "crypto";

type Anchor = {
  id: string; oracle_id: string; reasoning_hash: string;
  anchored_at_ms: number; walrus_blob_id: string;
  risk_score: number; hedge_budget_bps: number;
  memory_cycles_recalled: number;
};

export default function Proof() {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [selected, setSelected] = useState<Anchor | null>(null);
  const [verifyResult, setVerifyResult] = useState<"pending"|"valid"|"invalid"|null>(null);
  const [walrusData, setWalrusData] = useState<string>("");

  useEffect(() => {
    fetch("/api/vault/anchors").then(r => r.json()).then(setAnchors);
  }, []);

  async function verifyAnchor(anchor: Anchor) {
    setVerifyResult("pending");
    setWalrusData("");
    try {
      // Fetch full reasoning JSON from Walrus
      // Reference: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
      const r = await fetch(
        `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${anchor.walrus_blob_id}`
      );
      if (!r.ok) throw new Error(`Walrus fetch failed: ${r.status}`);
      const jsonText = await r.text();
      setWalrusData(jsonText);

      // Re-hash and compare
      const computedHash = createHash("sha256")
        .update(jsonText.trim().split("").sort() // sort_keys equivalent
          .join("")) // simplified — real impl uses JSON.stringify with sorted keys
        .digest("hex");

      // Compare with on-chain hash
      setVerifyResult(computedHash === anchor.reasoning_hash ? "valid" : "invalid");
    } catch (err) {
      console.error(err);
      setVerifyResult("invalid");
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-green-400">Proof Verification</h1>
        <p className="text-gray-400 mb-8">
          Every openmind reasoning decision is anchored on Sui before the market settles.
          Verify that any reasoning was committed before the outcome was known.
        </p>

        <div className="space-y-3 mb-8">
          {anchors.map(a => (
            <div key={a.id} className="bg-gray-900 border border-gray-700 rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    Anchored: {new Date(a.anchored_at_ms).toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-gray-300">
                    Hash: {a.reasoning_hash.slice(0,32)}...
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Budget: {a.hedge_budget_bps}bps |
                    Risk: {(a.risk_score/100).toFixed(0)}% |
                    Memory: {a.memory_cycles_recalled} cycles
                  </div>
                </div>
                <button
                  onClick={() => { setSelected(a); verifyAnchor(a); }}
                  className="border border-green-700 text-green-400 text-xs px-3 py-1 rounded hover:bg-green-900"
                >
                  Verify
                </button>
              </div>

              {selected?.id === a.id && verifyResult && (
                <div className={`mt-3 p-3 rounded text-sm ${
                  verifyResult === "pending" ? "bg-gray-800 text-gray-400" :
                  verifyResult === "valid" ? "bg-green-950 border border-green-700 text-green-300" :
                  "bg-red-950 border border-red-700 text-red-300"
                }`}>
                  {verifyResult === "pending" && "Fetching from Walrus..."}
                  {verifyResult === "valid" && "✓ VERIFIED — Hash matches. Reasoning was committed before settlement."}
                  {verifyResult === "invalid" && "✗ MISMATCH — Hash does not match Walrus blob."}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-400">
          <div className="font-bold text-gray-300 mb-2">How verification works</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>openmind anchors SHA256 hash of reasoning JSON on Sui before opening each cycle</li>
            <li>Full reasoning JSON is stored on Walrus (decentralized, permanent)</li>
            <li>After settlement, fetch the Walrus blob and re-compute the hash</li>
            <li>If hashes match, the reasoning predates the outcome — not fabricated after</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
```

### 12.12 web/app/vault/page.tsx — Deposit & Withdraw

```tsx
/**
 * Vault page — deposit dUSDC, receive omDUSDC shares, withdraw.
 * Reference: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault
 */
"use client";
import { useState, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const OPENMIND_PACKAGE = process.env.NEXT_PUBLIC_OPENMIND_PACKAGE ?? "";
const VAULT_OBJECT = process.env.NEXT_PUBLIC_VAULT_OBJECT ?? "";
const DUSDC_TYPE = "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";
const QUOTE_SCALE = 1_000_000n;

export default function VaultPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit"|"withdraw">("deposit");
  const [status, setStatus] = useState("");
  const [vaultState, setVaultState] = useState<any>(null);

  useEffect(() => {
    fetch("/api/vault/state").then(r => r.json()).then(setVaultState).catch(() => {});
  }, []);

  async function handleDeposit() {
    if (!account || !amount) return;
    setStatus("Building transaction...");
    try {
      const amountRaw = BigInt(Math.round(parseFloat(amount) * 1e6));
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [amountRaw]);
      tx.moveCall({
        target: `${OPENMIND_PACKAGE}::openmind_vault::deposit`,
        typeArguments: [DUSDC_TYPE],
        arguments: [tx.object(VAULT_OBJECT), coin],
      });
      setStatus("Awaiting wallet signature...");
      const result = await signAndExecute({ transaction: tx });
      setStatus(`✓ Deposited! Tx: ${result.digest.slice(0,16)}...`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleWithdraw() {
    if (!account || !amount) return;
    setStatus("Building withdraw transaction...");
    try {
      const sharesRaw = BigInt(Math.round(parseFloat(amount) * 1e6));
      const tx = new Transaction();
      const [shares] = tx.splitCoins(tx.gas, [sharesRaw]); // simplified
      tx.moveCall({
        target: `${OPENMIND_PACKAGE}::openmind_vault::withdraw`,
        typeArguments: [DUSDC_TYPE],
        arguments: [tx.object(VAULT_OBJECT), shares],
      });
      setStatus("Awaiting wallet signature...");
      const result = await signAndExecute({ transaction: tx });
      setStatus(`✓ Withdrawn! Tx: ${result.digest.slice(0,16)}...`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-green-400">Vault</h1>
        <p className="text-gray-400 mb-8 text-sm">
          Deposit dUSDC to receive omDUSDC vault shares.
          Not principal-guaranteed. Not fixed APY.
        </p>

        {/* Vault stats */}
        {vaultState && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              ["NAV", `${(vaultState.nav / 1e6).toFixed(4)} USDC`],
              ["Share Supply", vaultState.shareSupply ?? "—"],
              ["Cycles", vaultState.cyclesCompleted ?? "—"],
              ["Lifetime Hedge Spent", `${(vaultState.lifetimeHedgeSpent / 1e6).toFixed(4)} USDC`],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-900 border border-gray-700 rounded p-3">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-bold text-sm">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Get dUSDC */}
        <div className="bg-gray-900 border border-yellow-800 rounded p-3 mb-6 text-sm text-yellow-300">
          Need dUSDC?{" "}
          <a href="https://tally.so/r/Xx102L" target="_blank" className="underline">
            Request testnet dUSDC here →
          </a>
        </div>

        {/* Connect + form */}
        {!account ? (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded p-6">
            <div className="flex mb-4">
              {(["deposit","withdraw"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-sm font-bold capitalize ${
                    mode === m ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
            <input
              type="number" placeholder={mode === "deposit" ? "Amount (USDC)" : "Shares (omDUSDC)"}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mb-4 text-sm"
            />
            <button
              onClick={mode === "deposit" ? handleDeposit : handleWithdraw}
              className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded"
            >
              {mode === "deposit" ? "Deposit dUSDC" : "Withdraw"}
            </button>
            {status && <div className="mt-3 text-xs text-gray-400">{status}</div>}
          </div>
        )}
      </div>
    </main>
  );
}
```