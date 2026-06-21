Market Keys
MarketKey and RangeKey identify the internal position quantities stored in a PredictManager.

Use MarketKey for binary positions keyed by oracle ID, expiry, strike, and direction. Use RangeKey for vertical ranges keyed by oracle ID, expiry, lower strike, and higher strike.

Binary position keys
Use up(), down(), or new() to create keys for binary positions.

github.com/MystenLabs/deepbookv3/packages/predict/sources/market_key/market_key.move
public fun up(oracle_id: ID, expiry: u64, strike: u64): MarketKey {
    MarketKey { oracle_id, expiry, strike, direction: DIRECTION_UP }
}

public fun down(oracle_id: ID, expiry: u64, strike: u64): MarketKey {
    MarketKey { oracle_id, expiry, strike, direction: DIRECTION_DOWN }
}

public fun new(oracle_id: ID, expiry: u64, strike: u64, is_up: bool): MarketKey {
    let direction = if (is_up) { DIRECTION_UP } else { DIRECTION_DOWN };
    MarketKey { oracle_id, expiry, strike, direction }
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/market_key/market_key.move
public fun oracle_id(key: &MarketKey): ID {
    key.oracle_id
}

public fun expiry(key: &MarketKey): u64 {
    key.expiry
}

public fun strike(key: &MarketKey): u64 {
    key.strike
}

public fun is_up(key: &MarketKey): bool {
    key.direction == DIRECTION_UP
}

public fun is_down(key: &MarketKey): bool {
    key.direction == DIRECTION_DOWN
}

Copy

Use an Agent
Range keys
Use new() to create a vertical range key. It aborts if lower_strike is not less than higher_strike.

github.com/MystenLabs/deepbookv3/packages/predict/sources/market_key/range_key.move
public fun new(oracle_id: ID, expiry: u64, lower_strike: u64, higher_strike: u64): RangeKey {
    assert!(lower_strike < higher_strike, EInvalidStrikes);
    RangeKey { oracle_id, expiry, lower_strike, higher_strike }
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/market_key/range_key.move
public fun oracle_id(key: &RangeKey): ID {
    key.oracle_id
}

public fun expiry(key: &RangeKey): u64 {
    key.expiry
}

public fun lower_strike(key: &RangeKey): u64 {
    key.lower_strike
}

public fun higher_strike(key: &RangeKey): u64 {
    key.higher_strike
}

Copy

Use an Agent
Structs
github.com/MystenLabs/deepbookv3/packages/predict/sources/market_key/market_key.move
// === Structs ===

/// Key for a market position used to identify positions in PredictManager and Vault.
public struct MarketKey has copy, drop, store {
    oracle_id: ID,
    expiry: u64,
    strike: u64,
    direction: u8,
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/market_key/range_key.move
// === Structs ===

/// Key for a vertical range position used in PredictManager and Vault.
public struct RangeKey has copy, drop, store {
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
}

