Registry
The Registry shared object
 tracks the Predict object ID and the oracle IDs created by each OracleSVICap. The registry module
 also exposes admin entry points for setup, quote asset management, oracle creation, pricing configuration, risk configuration, and the withdrawal limiter.

Most app integrations do not call these functions directly. They are operator and governance surfaces for deploying and maintaining the protocol.

API
Use these functions to read the active Predict object ID and the oracle IDs associated with an oracle cap.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun predict_id(registry: &Registry): Option<ID> {
    registry.predict_id
}

public fun oracle_ids(registry: &Registry, cap_id: ID): vector<ID> {
    if (registry.oracle_ids.contains(cap_id)) {
        registry.oracle_ids[cap_id]
    } else {
        vector[]
    }
}

Copy

Use an Agent
The create_predict() function creates the shared Predict object once for a quote asset and records its ID in the registry.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun create_predict<Quote>(
    registry: &mut Registry,
    _admin_cap: &AdminCap,
    currency: &Currency<Quote>,
    treasury_cap: TreasuryCap<PLP>,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(registry.predict_id.is_none(), EPredictAlreadyCreated);

    let predict_id = predict::create<Quote>(currency, treasury_cap, clock, ctx);
    registry.predict_id = option::some(predict_id);

    event::emit(PredictCreated { predict_id });

    predict_id
}

Copy

Use an Agent
Oracle caps authorize oracle operators to update oracles and tighten per-oracle ask bounds.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun create_oracle_cap(_admin_cap: &AdminCap, ctx: &mut TxContext): OracleSVICap {
    oracle::create_oracle_cap(ctx)
}

public fun register_oracle_cap(oracle: &mut OracleSVI, _admin_cap: &AdminCap, cap: &OracleSVICap) {
    oracle::register_cap(oracle, cap);
}

Copy

Use an Agent
The create_oracle() function creates an OracleSVI, associates it with the calling cap, and initializes the Predict vault's strike grid for that oracle.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun create_oracle(
    registry: &mut Registry,
    predict: &mut Predict,
    _admin_cap: &AdminCap,
    cap: &OracleSVICap,
    underlying_asset: String,
    expiry: u64,
    min_strike: u64,
    tick_size: u64,
    ctx: &mut TxContext,
): ID {
    assert_valid_strike_grid(min_strike, tick_size);
    let oracle_id = oracle::create_oracle(underlying_asset, expiry, ctx);
    let cap_id = object::id(cap);

    if (!registry.oracle_ids.contains(cap_id)) {
        registry.oracle_ids.add(cap_id, vector[]);
    };
    registry.oracle_ids[cap_id].push_back(oracle_id);
    predict.add_oracle_grid(oracle_id, min_strike, tick_size, ctx);
    event::emit(OracleCreated {
        oracle_id,
        oracle_cap_id: cap_id,
        underlying_asset,
        expiry,
        min_strike,
        tick_size,
    });

    oracle_id
}

Copy

Use an Agent
Admins can enable or disable quote assets for new supply and mint inflows.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun enable_quote_asset<Quote>(
    predict: &mut Predict,
    _admin_cap: &AdminCap,
    currency: &Currency<Quote>,
) {
    predict.enable_quote_asset<Quote>(currency);
}

public fun disable_quote_asset<Quote>(predict: &mut Predict, _admin_cap: &AdminCap) {
    predict.disable_quote_asset<Quote>();
}

Copy

Use an Agent
These functions control global spread, minimum spread, utilization multiplier, and global ask price bounds.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun set_base_spread(predict: &mut Predict, _admin_cap: &AdminCap, spread: u64) {
    predict.set_base_spread(spread);
}

public fun set_min_spread(predict: &mut Predict, _admin_cap: &AdminCap, spread: u64) {
    predict.set_min_spread(spread);
}

public fun set_utilization_multiplier(
    predict: &mut Predict,
    _admin_cap: &AdminCap,
    multiplier: u64,
) {
    predict.set_utilization_multiplier(multiplier);
}

public fun set_min_ask_price(predict: &mut Predict, _admin_cap: &AdminCap, value: u64) {
    predict.set_min_ask_price(value);
}

public fun set_max_ask_price(predict: &mut Predict, _admin_cap: &AdminCap, value: u64) {
    predict.set_max_ask_price(value);
}

Copy

Use an Agent
Oracle ask-bound overrides are authorized by the oracle's cap and can only tighten the global bounds.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun set_oracle_ask_bounds(
    predict: &mut Predict,
    oracle: &OracleSVI,
    cap: &OracleSVICap,
    min: u64,
    max: u64,
) {
    predict.set_oracle_ask_bounds(oracle, cap, min, max);
}

public fun clear_oracle_ask_bounds(predict: &mut Predict, oracle: &OracleSVI, cap: &OracleSVICap) {
    predict.clear_oracle_ask_bounds(oracle, cap);
}

Copy

Use an Agent
These functions control the trading pause, max total exposure percentage, and LP withdrawal limiter.

github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
public fun set_trading_paused(predict: &mut Predict, _admin_cap: &AdminCap, paused: bool) {
    predict.set_trading_paused(paused);
}

public fun set_max_total_exposure_pct(predict: &mut Predict, _admin_cap: &AdminCap, pct: u64) {
    predict.set_max_total_exposure_pct(pct);
}

public fun update_withdrawal_limiter(
    predict: &mut Predict,
    _admin_cap: &AdminCap,
    capacity: u64,
    refill_rate_per_ms: u64,
    clock: &Clock,
) {
    predict.update_withdrawal_limiter(capacity, refill_rate_per_ms, clock);
}

public fun enable_withdrawal_limiter(predict: &mut Predict, _admin_cap: &AdminCap, clock: &Clock) {
    predict.enable_withdrawal_limiter(clock);
}

public fun disable_withdrawal_limiter(predict: &mut Predict, _admin_cap: &AdminCap) {
    predict.disable_withdrawal_limiter();
}

Copy

Use an Agent
Structs and events
github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
/// Shared object tracking global state.
public struct Registry has key {
    id: UID,
    /// ID of the Predict object (None if not yet created)
    predict_id: Option<ID>,
    /// OracleSVICap ID -> vector of oracle IDs created by that cap
    oracle_ids: Table<ID, vector<ID>>,
}

// === Structs ===

/// Capability for admin operations.
/// Created during package init, transferred to deployer (multisig).
public struct AdminCap has key, store {
    id: UID,
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/registry.move
// === Events ===
public struct PredictCreated has copy, drop, store {
    predict_id: ID,
}
public struct OracleCreated has copy, drop, store {
    oracle_id: ID,
    oracle_cap_id: ID,
    underlying_asset: String,
    expiry: u64,
    min_strike: u64,
    tick_size: u64,
}
