/// openmind pooled vault.
/// Supplies PLP carry + downside binary hedge each cycle.
/// Uses OpenZeppelin integer math (mul_div) + fixed-point (UD30x9) + access_control.
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
use deepbook_predict::predict::Predict;
use deepbook_predict::predict_manager::PredictManager;

use openzeppelin_math::u64::mul_div;
use openzeppelin_math::rounding;
use openzeppelin_fp_math::ud30x9::{Self, UD30x9};
use openzeppelin_fp_math::ud30x9_convert;
use openzeppelin_access::access_control::AccessControl;

use openmind::openmind_access::{Self, OPENMIND_ACCESS};
use openmind::agent_cap::{Self, AgentCap};
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
const QUOTE_TO_UD30X9_SCALE: u128 = 1_000; // dUSDC 6-dec → UD30x9 9-dec
const MAX_HEDGE_BPS: u16 = 2_000;
const MAX_STRIKE_BAND_BPS: u16 = 3_000;

/// 50% of hedge ITM payout swept into directional_pool on close_cycle.
const DIRECTIONAL_SWEEP_OF_PAYOUT_BPS: u64 = 5_000;
/// Hard ceiling on a single directional bet: 50% of directional_pool.
const MAX_DIRECTIONAL_BET_BPS_OF_POOL: u64 = 5_000;
/// Minimum |edge| in bps before a directional bet is allowed.
const MIN_DIRECTIONAL_EDGE_BPS: u64 = 300;

public struct OPENMIND_VAULT has drop {}

public struct OpenCycle has copy, drop, store {
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    quantity: u64,
    budget_spent: u64,
    reasoning_hash: vector<u8>,
    risk_score: u64,
    memory_cycles_recalled: u64,
}

/// Directional leg position, tracked separately from the hedge leg.
/// Funded only from directional_pool — never from carry buffer or hedge budget.
public struct OpenDirectional has copy, drop, store {
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    stake_spent: u64,
    p_model: u64,           // openmind's calibrated P(win), 1e9-scaled
    p_surface: u64,         // SVI surface's implied P(win), 1e9-scaled
    edge_bps: u64,          // |p_model - p_surface| in bps
    kelly_fraction_bps: u64,
}

public struct VaultPolicy has copy, drop, store {
    hedge_bps: u16,
    strike_band_bps: u16,
    reserve_bps: u16,
}

public struct OpenMindVault<phantom Quote> has key {
    id: UID,
    treasury: TreasuryCap<OPENMIND_VAULT>,
    buffer: Balance<Quote>,
    plp: Balance<PLP>,
    plp_book: u64,
    manager_id: ID,
    open: Option<OpenCycle>,
    open_directional: Option<OpenDirectional>,
    /// Funded ONLY by sweeping a fraction of realized hedge ITM payouts.
    directional_pool: Balance<Quote>,
    policy: VaultPolicy,
    paused: bool,
    cycles_completed: u64,
    lifetime_hedge_spent: u64,
    lifetime_realized: u64,
    lifetime_directional_staked: u64,
    lifetime_directional_pnl: u64,
    lifetime_directional_losses: u64,
}

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
    reasoning_hash: vector<u8>,
    risk_score: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    ask_cost: u64,
    bid_cost: u64,
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
    directional_sweep_amount: u64,
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

#[allow(deprecated_usage)]
fun init(witness: OPENMIND_VAULT, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6,
        b"omDUSDC",
        b"openmind Vault Share",
        b"Tokenized share of the openmind AI-driven adaptive carry vault on DeepBook Predict.",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, tx_context::sender(ctx));
}

fun assert_valid_policy(hedge_bps: u16, strike_band_bps: u16, reserve_bps: u16) {
    assert!(hedge_bps > 0 && hedge_bps <= MAX_HEDGE_BPS, EBadPolicy);
    assert!(strike_band_bps > 0 && strike_band_bps <= MAX_STRIKE_BAND_BPS, EBadPolicy);
    assert!(reserve_bps < BPS as u16, EBadPolicy);
}

/// Scale raw 6-decimal quote amounts into UD30x9 (9-decimal fixed point).
public fun quote_amount_to_ud30x9(amount: u64): UD30x9 {
    ud30x9::wrap((amount as u128) * QUOTE_TO_UD30X9_SCALE)
}

/// Convert basis points to a UD30x9 rate in [0, 1].
public fun bps_to_rate(bps: u64): UD30x9 {
    ud30x9_convert::from_u64(bps).div(ud30x9_convert::from_u64(BPS))
}

/// Apply a bps rate to a raw quote amount using UD30x9 (floor, 6-decimal output).
fun bps_fraction_of(amount: u64, bps: u64): u64 {
    let product = quote_amount_to_ud30x9(amount).mul(bps_to_rate(bps)).unwrap();
    (product / QUOTE_TO_UD30X9_SCALE) as u64
}

public fun nav_ud30x9<Quote>(vault: &OpenMindVault<Quote>): UD30x9 {
    quote_amount_to_ud30x9(nav(vault))
}

public fun policy_hedge_rate(policy: &VaultPolicy): UD30x9 {
    bps_to_rate(policy.hedge_bps as u64)
}

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
        open_directional: option::none(),
        directional_pool: balance::zero<Quote>(),
        policy: VaultPolicy {
            hedge_bps,
            strike_band_bps,
            reserve_bps,
        },
        paused: false,
        cycles_completed: 0,
        lifetime_hedge_spent: 0,
        lifetime_realized: 0,
        lifetime_directional_staked: 0,
        lifetime_directional_pnl: 0,
        lifetime_directional_losses: 0,
    };
    let vault_id = object::id(&vault);
    event::emit(VaultCreated {
        vault_id,
        manager_id,
        creator: tx_context::sender(ctx),
    });
    transfer::share_object(vault);
}

public fun nav<Quote>(vault: &OpenMindVault<Quote>): u64 {
    balance::value(&vault.buffer) + vault.plp_book
}

public fun share_supply<Quote>(vault: &OpenMindVault<Quote>): u64 {
    coin::total_supply(&vault.treasury)
}

public fun shares_for_deposit(nav_before: u64, supply: u64, amount: u64): u64 {
    if (supply == 0 || nav_before == 0) {
        amount
    } else {
        mul_div(amount, supply, nav_before, rounding::down()).destroy_some()
    }
}

public fun amount_for_shares(nav_now: u64, supply: u64, shares: u64): u64 {
    assert!(supply > 0, EZeroShares);
    mul_div(shares, nav_now, supply, rounding::down()).destroy_some()
}

public fun set_paused<Quote>(
    vault: &mut OpenMindVault<Quote>,
    paused: bool,
) {
    vault.paused = paused;
}

public fun update_policy<Quote>(
    vault: &mut OpenMindVault<Quote>,
    hedge_bps: u16,
    strike_band_bps: u16,
    reserve_bps: u16,
) {
    assert_valid_policy(hedge_bps, strike_band_bps, reserve_bps);
    vault.policy = VaultPolicy {
        hedge_bps,
        strike_band_bps,
        reserve_bps,
    };
}

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
        amount,
        shares_minted: shares,
        nav_before,
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
        shares_burned: share_amount,
        amount_out,
    });
    out
}

public fun open_cycle<Quote>(
    vault: &mut OpenMindVault<Quote>,
    agent_cap_obj: &mut AgentCap,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    next_oracle: &OracleSVI,
    strike: u64,
    quantity: u64,
    budget_bps: u64,
    reasoning_hash: vector<u8>,
    risk_score: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    open_cycle_impl(
        vault,
        agent_cap_obj,
        predict_obj,
        manager,
        next_oracle,
        strike,
        quantity,
        budget_bps,
        reasoning_hash,
        risk_score,
        news_signal_bps,
        svi_gap_bps,
        memory_cycles_recalled,
        clock,
        ctx,
    );
}

/// Keeper-gated cycle open. Uses OpenZeppelin access_control (PRD ownable equivalent).
public fun open_cycle_authorized<Quote>(
    vault: &mut OpenMindVault<Quote>,
    ac: &AccessControl<OPENMIND_ACCESS>,
    agent_cap_obj: &mut AgentCap,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    next_oracle: &OracleSVI,
    strike: u64,
    quantity: u64,
    budget_bps: u64,
    reasoning_hash: vector<u8>,
    risk_score: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    openmind_access::assert_keeper(ac, ctx);
    open_cycle_impl(
        vault,
        agent_cap_obj,
        predict_obj,
        manager,
        next_oracle,
        strike,
        quantity,
        budget_bps,
        reasoning_hash,
        risk_score,
        news_signal_bps,
        svi_gap_bps,
        memory_cycles_recalled,
        clock,
        ctx,
    );
}

fun open_cycle_impl<Quote>(
    vault: &mut OpenMindVault<Quote>,
    agent_cap_obj: &mut AgentCap,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    next_oracle: &OracleSVI,
    strike: u64,
    quantity: u64,
    budget_bps: u64,
    reasoning_hash: vector<u8>,
    risk_score: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
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
    assert!(strike < spot, EWrongOracle);

    let band_floor =
        spot - mul_div(spot, (vault.policy.strike_band_bps as u64), BPS, rounding::down())
            .destroy_some();
    assert!(strike >= band_floor, EBadPolicy);

    let nav_now = nav(vault);
    let max_budget = bps_fraction_of(nav_now, budget_bps);
    let policy_cap = bps_fraction_of(nav_now, vault.policy.hedge_bps as u64);
    assert!(max_budget <= policy_cap, EBadPolicy);
    assert!(balance::value(&vault.buffer) >= max_budget, EBufferLow);

    // Hard on-chain budget/expiry/revocation gate — before any Coin is split
    // from the buffer or any DeepBook Predict call is made.
    agent_cap::authorize_and_log(agent_cap_obj, max_budget, b"open_cycle_hedge", clock);

    let oracle_id = object::id(next_oracle);
    let (ask_cost, bid_cost) = predict_adapter::read_trade_amounts(
        predict_obj,
        next_oracle,
        oracle_id,
        expiry_ms,
        strike,
        quantity,
        clock,
    );

    let hedge_coin = coin::from_balance(balance::split(&mut vault.buffer, max_budget), ctx);
    predict_adapter::mint_hedge<Quote>(
        predict_obj,
        manager,
        next_oracle,
        oracle_id,
        expiry_ms,
        strike,
        quantity,
        hedge_coin,
        nav_now,
        budget_bps,
        clock,
        ctx,
    );

    let reserve = bps_fraction_of(nav(vault), vault.policy.reserve_bps as u64);
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
        oracle_id,
        expiry_ms,
        strike,
        quantity,
        budget_spent: max_budget,
        plp_supplied,
        nav_at_open: nav(vault),
        spot_at_open: spot,
        reasoning_hash,
        risk_score,
        news_signal_bps,
        svi_gap_bps,
        memory_cycles_recalled,
        ask_cost,
        bid_cost,
        keeper: tx_context::sender(ctx),
    });
}

public fun close_cycle<Quote>(
    vault: &mut OpenMindVault<Quote>,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    settled_oracle: &OracleSVI,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    close_cycle_impl(vault, predict_obj, manager, settled_oracle, clock, ctx);
}

/// Keeper-gated cycle close. Uses OpenZeppelin access_control (PRD ownable equivalent).
public fun close_cycle_authorized<Quote>(
    vault: &mut OpenMindVault<Quote>,
    ac: &AccessControl<OPENMIND_ACCESS>,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    settled_oracle: &OracleSVI,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    openmind_access::assert_keeper(ac, ctx);
    close_cycle_impl(vault, predict_obj, manager, settled_oracle, clock, ctx);
}

fun close_cycle_impl<Quote>(
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

    predict_adapter::redeem_settled_position<Quote>(
        predict_obj,
        manager,
        settled_oracle,
        cycle.oracle_id,
        cycle.expiry_ms,
        cycle.strike,
        clock,
        ctx,
    );

    let swept_coin = predict_adapter::sweep_manager_balance<Quote>(manager, ctx);
    let swept = coin::value(&swept_coin);
    if (swept > 0) {
        balance::join(&mut vault.buffer, coin::into_balance(swept_coin));
    } else {
        coin::destroy_zero(swept_coin);
    };

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

    // Idea A: sweep a fraction of hedge ITM payout into directional_pool.
    let settlement_price_opt = oracle::settlement_price(settled_oracle);
    let hedge_itm = if (option::is_some(&settlement_price_opt)) {
        *option::borrow(&settlement_price_opt) < cycle.strike
    } else { false };
    let hedge_payout = if (hedge_itm) { cycle.quantity } else { 0 };
    let mut directional_sweep_amount = 0u64;
    if (hedge_itm && hedge_payout > 0 && balance::value(&vault.buffer) >= hedge_payout) {
        directional_sweep_amount = mul_div(
            hedge_payout, DIRECTIONAL_SWEEP_OF_PAYOUT_BPS, BPS, rounding::down()
        ).destroy_some();
        let sweep = balance::split(&mut vault.buffer, directional_sweep_amount);
        balance::join(&mut vault.directional_pool, sweep);
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
/// On-chain edge check is the real backstop; the keeper-layer MIN_EDGE check
/// in cycle.py mirrors this but must not be relied on as the sole guard.
public fun open_directional_position<Quote>(
    vault: &mut OpenMindVault<Quote>,
    agent_cap_obj: &mut AgentCap,
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    oracle_obj: &OracleSVI,
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

    // Hard on-chain budget/expiry/revocation gate — before any Coin is split
    // from directional_pool or any DeepBook Predict call is made.
    agent_cap::authorize_and_log(agent_cap_obj, stake_amount, b"open_directional", clock);

    let oracle_id = object::id(oracle_obj);
    let expiry_ms = oracle::expiry(oracle_obj);
    let stake_coin = coin::from_balance(
        balance::split(&mut vault.directional_pool, stake_amount), ctx
    );

    predict_adapter::mint_directional<Quote>(
        predict_obj, manager, oracle_obj, oracle_id, expiry_ms, strike, is_up,
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

/// Close (settle) the directional position. Permissionless.
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
        vault.lifetime_directional_pnl =
            vault.lifetime_directional_pnl + (payout - pos.stake_spent);
    } else {
        vault.lifetime_directional_losses =
            vault.lifetime_directional_losses + pos.stake_spent;
    };

    event::emit(OpenMindDirectionalClosed {
        vault_id: object::id(vault),
        oracle_id: pos.oracle_id,
        won, stake_spent: pos.stake_spent, payout,
        directional_pool_after: balance::value(&vault.directional_pool),
        settler: tx_context::sender(ctx),
    });
}

/// Returns true if the vault has an open hedge cycle. Used by risk_capped_borrow.
public fun has_open_cycle<Quote>(vault: &OpenMindVault<Quote>): bool {
    option::is_some(&vault.open)
}

/// Admin pause toggle. Caller must mint `Auth<AdminRole>` in the same PTB.
public fun admin_set_paused<Quote>(
    vault: &mut OpenMindVault<Quote>,
    auth: &openzeppelin_access::access_control::Auth<openmind::openmind_access::AdminRole>,
    paused: bool,
) {
    let _ = auth;
    set_paused(vault, paused);
}

/// Admin policy update. Caller must mint `Auth<AdminRole>` in the same PTB.
public fun admin_update_policy<Quote>(
    vault: &mut OpenMindVault<Quote>,
    auth: &openzeppelin_access::access_control::Auth<openmind::openmind_access::AdminRole>,
    hedge_bps: u16,
    strike_band_bps: u16,
    reserve_bps: u16,
) {
    let _ = auth;
    update_policy(vault, hedge_bps, strike_band_bps, reserve_bps);
}

#[test_only]
public fun shares_for_deposit_for_test(nav_before: u64, supply: u64, amount: u64): u64 {
    shares_for_deposit(nav_before, supply, amount)
}

#[test_only]
public fun amount_for_shares_for_test(nav_now: u64, supply: u64, shares: u64): u64 {
    amount_for_shares(nav_now, supply, shares)
}

#[test_only]
public fun bps_fraction_of_for_test(amount: u64, bps: u64): u64 {
    bps_fraction_of(amount, bps)
}

#[test_only]
public fun quote_amount_to_ud30x9_for_test(amount: u64): UD30x9 {
    quote_amount_to_ud30x9(amount)
}
