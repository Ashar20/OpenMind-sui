/// Predict adapter boundary. All DeepBook Predict interactions go through
/// this module so the upstream protocol surface stays isolated to one file.
module openmind::predict_adapter;

use sui::clock::Clock;
use sui::coin::{Self as coin, Coin};
use sui::object::ID;

use deepbook_predict::market_key;
use deepbook_predict::oracle::{Self as oracle, OracleSVI};
use deepbook_predict::plp::PLP;
use deepbook_predict::predict::{Self as predict, Predict};
use deepbook_predict::predict_manager::{Self as predict_manager, PredictManager};

use openzeppelin_math::u64::mul_div;
use openzeppelin_math::rounding;

const ENotDownside: u64 = 2;
const EOracleNotActive: u64 = 3;
const EBudgetExceedsPolicy: u64 = 4;
const EAskAboveCeiling: u64 = 5;
const EBudgetMismatch: u64 = 6;

const BPS: u64 = 10_000;
const MAX_HEDGE_BPS: u64 = 2_000;
const MAX_HEDGE_ASK_BPS: u64 = 2_500;

public fun supply_to_vault<Quote>(
    predict_obj: &mut Predict,
    funds: Coin<Quote>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<PLP> {
    predict::supply<Quote>(predict_obj, funds, clock, ctx)
}

public fun withdraw_from_vault<Quote>(
    predict_obj: &mut Predict,
    plp: Coin<PLP>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<Quote> {
    predict::withdraw<Quote>(predict_obj, plp, clock, ctx)
}

public fun read_trade_amounts(
    predict_obj: &mut Predict,
    oracle_obj: &OracleSVI,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    quantity: u64,
    clock: &Clock,
): (u64, u64) {
    let key = market_key::new(oracle_id, expiry_ms, strike, false);
    predict::get_trade_amounts(predict_obj, oracle_obj, key, quantity, clock)
}

public fun mint_hedge<Quote>(
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    oracle_obj: &OracleSVI,
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
    assert!(oracle::status(oracle_obj, clock) == oracle::status_active(), EOracleNotActive);
    assert!(strike < oracle::spot_price(oracle_obj), ENotDownside);
    assert!(budget_bps > 0 && budget_bps <= MAX_HEDGE_BPS, EBudgetExceedsPolicy);

    let max_budget = mul_div(nav, budget_bps, BPS, rounding::down()).destroy_some();
    assert!(coin::value(&budget) == max_budget, EBudgetMismatch);

    let key = market_key::new(oracle_id, expiry_ms, strike, false);
    let (ask_cost, _bid_cost) =
        predict::get_trade_amounts(predict_obj, oracle_obj, key, quantity, clock);
    let ceiling = mul_div(quantity, MAX_HEDGE_ASK_BPS, BPS, rounding::down()).destroy_some();
    assert!(ask_cost <= ceiling, EAskAboveCeiling);

    predict_manager::deposit<Quote>(manager, budget, ctx);
    predict::mint<Quote>(predict_obj, manager, oracle_obj, key, quantity, clock, ctx);
}

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
            predict_obj,
            manager,
            settled_oracle,
            key,
            remaining,
            clock,
            ctx,
        );
    }
}

/// Mint a directional (up or down) binary position, Kelly-sized.
/// Funded only from the directional capital pool — never from hedge budget.
/// No MAX_HEDGE_ASK_BPS ceiling: directional sizing discipline is enforced
/// by kelly_fraction upstream; paying a fair ask for real edge is correct.
public fun mint_directional<Quote>(
    predict_obj: &mut Predict,
    manager: &mut PredictManager,
    oracle_obj: &OracleSVI,
    oracle_id: ID,
    expiry_ms: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    stake: Coin<Quote>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oracle::status(oracle_obj, clock) == oracle::status_active(), EOracleNotActive);
    let key = market_key::new(oracle_id, expiry_ms, strike, is_up);
    predict_manager::deposit<Quote>(manager, stake, ctx);
    predict::mint<Quote>(predict_obj, manager, oracle_obj, key, quantity, clock, ctx);
}

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
