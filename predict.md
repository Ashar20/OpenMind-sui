Predict
The Predict shared object
 is the main protocol entry point. It coordinates user actions across manager balances, oracle state, pricing config, risk config, and vault accounting.

API
Following are the public functions that applications use most often.

The create_manager() function creates a new shared PredictManager for the caller and returns its object ID.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun create_manager(ctx: &mut TxContext): ID {
    let manager_id = predict_manager::new(ctx);
    manager_id
}

Copy

Use an Agent
The get_trade_amounts() function returns the mint cost and redeem payout for a binary position at the requested quantity.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun get_trade_amounts(
    predict: &Predict,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
): (u64, u64) {
    let (ask, bid) = predict.trade_prices(oracle, key, clock);
    (math::mul(ask, quantity), math::mul(bid, quantity))
}

Copy

Use an Agent
The mint() function buys a binary position using an enabled quote asset deposited in the caller's PredictManager.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun mint<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.owner(), ENotOwner);
    assert!(!predict.trading_paused, ETradingPaused);
    assert!(quantity > 0, EZeroQuantity);
    predict.treasury_config.assert_quote_asset<Quote>();

    predict.oracle_config.assert_key_matches(oracle, &key);
    oracle_config::assert_live_oracle(oracle, clock);

    let strike = key.strike();
    let is_up = key.is_up();

    predict.vault.insert_position(oracle.id(), is_up, strike, quantity);
    predict.refresh_oracle_risk(oracle);

    let (ask, _) = predict.trade_prices(oracle, key, clock);
    predict.assert_mintable_ask(oracle.id(), ask);
    let cost = math::mul(ask, quantity);

    let payment = manager.withdraw<Quote>(cost, ctx).into_balance();
    predict.vault.accept_payment(payment);
    predict.vault.assert_total_exposure(predict.risk_config.max_total_exposure_pct());
    manager.increase_position(key, quantity);

    event::emit(PositionMinted {
        predict_id: object::id(predict),
        manager_id: object::id(manager),
        trader: manager.owner(),
        quote_asset: type_name::with_defining_ids<Quote>(),
        oracle_id: key.oracle_id(),
        expiry: key.expiry(),
        strike,
        is_up,
        quantity,
        cost,
        ask_price: ask,
    });
}

Copy

Use an Agent
The redeem() function sells a binary position and deposits the payout back into the owner's PredictManager.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun redeem<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.owner(), ENotOwner);
    let payout_coin = redeem_internal<Quote>(predict, manager, oracle, key, quantity, clock, ctx);
    manager.deposit(payout_coin, ctx);
}

Copy

Use an Agent
The redeem_permissionless() function lets anyone redeem a settled position into the owner's PredictManager.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun redeem_permissionless<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(oracle.is_settled(), EOracleNotSettled);
    let payout_coin = redeem_internal<Quote>(predict, manager, oracle, key, quantity, clock, ctx);
    manager.deposit_permissionless(payout_coin, ctx);
}

Copy

Use an Agent
The get_range_trade_amounts() function returns the mint cost and redeem payout for a vertical range at the requested quantity.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun get_range_trade_amounts(
    predict: &Predict,
    oracle: &OracleSVI,
    key: RangeKey,
    quantity: u64,
    clock: &Clock,
): (u64, u64) {
    let (ask, bid) = predict.range_trade_prices(oracle, key, clock);
    (math::mul(ask, quantity), math::mul(bid, quantity))
}

Copy

Use an Agent
The mint_range() function buys a bounded range position. The range is keyed by oracle ID, expiry, lower strike, and higher strike.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun mint_range<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: RangeKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.owner(), ENotOwner);
    assert!(!predict.trading_paused, ETradingPaused);
    assert!(quantity > 0, EZeroQuantity);
    predict.treasury_config.assert_quote_asset<Quote>();
    predict.oracle_config.assert_range_key_matches(oracle, &key);
    oracle_config::assert_live_oracle(oracle, clock);

    let lower = key.lower_strike();
    let higher = key.higher_strike();
    predict.vault.insert_range(oracle.id(), lower, higher, quantity);
    predict.refresh_oracle_risk(oracle);

    let (ask, _) = predict.range_trade_prices(oracle, key, clock);
    predict.assert_mintable_ask(oracle.id(), ask);
    let cost = math::mul(ask, quantity);

    let payment = manager.withdraw<Quote>(cost, ctx).into_balance();
    predict.vault.accept_payment(payment);
    predict.vault.assert_total_exposure(predict.risk_config.max_total_exposure_pct());
    manager.increase_range(key, quantity);

    event::emit(RangeMinted {
        predict_id: object::id(predict),
        manager_id: object::id(manager),
        trader: manager.owner(),
        quote_asset: type_name::with_defining_ids<Quote>(),
        oracle_id: key.oracle_id(),
        expiry: key.expiry(),
        lower_strike: lower,
        higher_strike: higher,
        quantity,
        cost,
        ask_price: ask,
    });
}

Copy

Use an Agent
The redeem_range() function sells a range position and deposits the payout into the owner's PredictManager.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun redeem_range<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: RangeKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == manager.owner(), ENotOwner);
    assert!(quantity > 0, EZeroQuantity);
    predict.oracle_config.assert_range_key_matches(oracle, &key);
    oracle_config::assert_quoteable_oracle(oracle, clock);

    manager.decrease_range(key, quantity);

    let lower = key.lower_strike();
    let higher = key.higher_strike();
    let payout;
    if (oracle.is_settled() && predict.vault.has_settled_oracle(oracle.id())) {
        let (_, settled_payout) = predict.get_range_trade_amounts(oracle, key, quantity, clock);
        predict.vault.redeem_settled_position(oracle.id(), quantity, settled_payout);
        payout = settled_payout;
    } else {
        predict.vault.remove_range(oracle.id(), lower, higher, quantity);
        predict.refresh_oracle_risk(oracle);

        let (_, live_payout) = predict.get_range_trade_amounts(oracle, key, quantity, clock);
        payout = live_payout;
    };

    let payout_balance = predict.vault.dispense_payout<Quote>(payout);
    let payout_coin = payout_balance.into_coin(ctx);
    manager.deposit(payout_coin, ctx);

    event::emit(RangeRedeemed {
        predict_id: object::id(predict),
        manager_id: object::id(manager),
        trader: manager.owner(),
        quote_asset: type_name::with_defining_ids<Quote>(),
        oracle_id: key.oracle_id(),
        expiry: key.expiry(),
        lower_strike: lower,
        higher_strike: higher,
        quantity,
        payout,
        bid_price: math::div(payout, quantity),
        is_settled: oracle.is_settled(),
    });
}

Copy

Use an Agent
The supply() function deposits an accepted quote asset into the vault and returns PLP shares.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun supply<Quote>(
    predict: &mut Predict,
    coin: Coin<Quote>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<PLP> {
    let amount = coin.value();
    assert!(amount > 0, EZeroAmount);
    predict.treasury_config.assert_quote_asset<Quote>();

    let vault_value = predict.vault.vault_value();
    predict.vault.accept_payment(coin.into_balance());
    predict.withdrawal_limiter.record_deposit(amount, clock);

    let total = predict.treasury_cap.total_supply();
    let shares = if (total == 0) {
        amount
    } else {
        assert!(vault_value > 0, EZeroVaultValue);
        mul_div_round_down(amount, total, vault_value)
    };
    assert!(shares > 0, EZeroSharesMinted);

    event::emit(Supplied {
        predict_id: object::id(predict),
        supplier: ctx.sender(),
        quote_asset: type_name::with_defining_ids<Quote>(),
        amount,
        shares_minted: shares,
    });
    coin::mint(&mut predict.treasury_cap, shares, ctx)
}

Copy

Use an Agent
The withdraw() function burns PLP shares and returns the selected quote asset when the requested amount is available after max payout coverage.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun withdraw<Quote>(
    predict: &mut Predict,
    lp_coin: Coin<PLP>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<Quote> {
    let vault_value = predict.vault.vault_value();
    let shares_burned = lp_coin.value();
    assert!(shares_burned > 0, EZeroAmount);
    let amount = predict.shares_to_amount(shares_burned, vault_value);
    let balance = predict.vault.balance();
    let max_payout = predict.vault.total_max_payout();
    let available = if (balance > max_payout) {
        balance - max_payout
    } else {
        0
    };
    assert!(amount <= available, EWithdrawExceedsAvailable);
    predict.withdrawal_limiter.consume(amount, clock);
    predict.treasury_cap.burn(lp_coin);
    event::emit(Withdrawn {
        predict_id: object::id(predict),
        withdrawer: ctx.sender(),
        quote_asset: type_name::with_defining_ids<Quote>(),
        amount,
        shares_burned,
    });
    predict.vault.dispense_payout<Quote>(amount).into_coin(ctx)
}

Copy

Use an Agent
The compact_settled_oracle() function lets an authorized oracle operator compact settled strike-matrix exposure into constant-size settled state.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun compact_settled_oracle(
    predict: &mut Predict,
    oracle: &OracleSVI,
    oracle_cap: &OracleSVICap,
) {
    oracle::assert_authorized_cap(oracle, oracle_cap);
    assert!(oracle.is_settled(), EOracleNotSettled);
    let settlement = oracle.settlement_price().destroy_some();
    predict.vault.compact_settled_oracle_if_needed(oracle.id(), settlement);
}

Copy

Use an Agent
These read functions expose trading pause state, accepted quote assets, pricing parameters, risk limits, ask bounds, and currently available withdrawal amount.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public fun ask_bounds(predict: &Predict, oracle_id: ID): (u64, u64) {
    predict.resolve_ask_bounds(oracle_id)
}

public fun trading_paused(predict: &Predict): bool {
    predict.trading_paused
}

public fun accepted_quotes(predict: &Predict): &VecSet<TypeName> {
    predict.treasury_config.accepted_quotes()
}

public fun base_spread(predict: &Predict): u64 {
    predict.pricing_config.base_spread()
}

public fun min_spread(predict: &Predict): u64 {
    predict.pricing_config.min_spread()
}

public fun utilization_multiplier(predict: &Predict): u64 {
    predict.pricing_config.utilization_multiplier()
}

public fun max_total_exposure_pct(predict: &Predict): u64 {
    predict.risk_config.max_total_exposure_pct()
}

public fun available_withdrawal(predict: &Predict, clock: &Clock): u64 {
    predict.withdrawal_limiter.available_withdrawal(clock)
}

Copy

Use an Agent
Events
github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
// === Events ===
public struct PositionMinted has copy, drop, store {
    predict_id: ID,
    manager_id: ID,
    trader: address,
    quote_asset: TypeName,
    oracle_id: ID,
    expiry: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    cost: u64,
    ask_price: u64,
}
public struct PositionRedeemed has copy, drop, store {
    predict_id: ID,
    manager_id: ID,
    owner: address,
    executor: address,
    quote_asset: TypeName,
    oracle_id: ID,
    expiry: u64,
    strike: u64,
    is_up: bool,
    quantity: u64,
    payout: u64,
    bid_price: u64,
    is_settled: bool,
}
public struct RangeMinted has copy, drop, store {
    predict_id: ID,
    manager_id: ID,
    trader: address,
    quote_asset: TypeName,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    quantity: u64,
    cost: u64,
    ask_price: u64,
}
public struct RangeRedeemed has copy, drop, store {
    predict_id: ID,
    manager_id: ID,
    trader: address,
    quote_asset: TypeName,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    quantity: u64,
    payout: u64,
    bid_price: u64,
    is_settled: bool,
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public struct Supplied has copy, drop, store {
    predict_id: ID,
    supplier: address,
    quote_asset: TypeName,
    amount: u64,
    shares_minted: u64,
}
public struct Withdrawn has copy, drop, store {
    predict_id: ID,
    withdrawer: address,
    quote_asset: TypeName,
    amount: u64,
    shares_burned: u64,
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/predict.move
public struct TradingPauseUpdated has copy, drop, store {
    predict_id: ID,
    paused: bool,
}
public struct PricingConfigUpdated has copy, drop, store {
    predict_id: ID,
    base_spread: u64,
    min_spread: u64,
    utilization_multiplier: u64,
    min_ask_price: u64,
    max_ask_price: u64,
}
public struct OracleAskBoundsSet has copy, drop, store {
    predict_id: ID,
    oracle_id: ID,
    min_ask_price: u64,
    max_ask_price: u64,
}
public struct OracleAskBoundsCleared has copy, drop, store {
    predict_id: ID,
    oracle_id: ID,
}
public struct RiskConfigUpdated has copy, drop, store {
    predict_id: ID,
    max_total_exposure_pct: u64,
}
public struct QuoteAssetEnabled has copy, drop, store {
    predict_id: ID,
    quote_asset: TypeName,
}
public struct QuoteAssetDisabled has copy, drop, store {
    predict_id: ID,
    quote_asset: TypeName,
}

Copy

Use an Agent
