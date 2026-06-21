Oracle
OracleSVI is the market state for one underlying asset and one expiry. It stores spot and forward prices, SVI volatility surface parameters, activation state, the last update timestamp, and the settlement price after expiry.

Lifecycle
An oracle starts inactive, becomes active after activate(), accepts live price and SVI updates before expiry, enters pending settlement at expiry, and becomes settled when the first post-expiry price update freezes the settlement price.

Mints require a live oracle. Redeems can use quoteable live or settled oracle state. After settlement, price and SVI updates are rejected.

API
The activate() function moves an oracle into the active state before expiry.

github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
public fun activate(oracle: &mut OracleSVI, cap: &OracleSVICap, clock: &Clock) {
    assert_authorized_cap(oracle, cap);
    assert!(!oracle.active, EOracleAlreadyActive);

    let now = clock.timestamp_ms();
    assert!(now < oracle.expiry, EOracleExpired);

    oracle.active = true;

    event::emit(OracleActivated {
        oracle_id: oracle.id.to_inner(),
        expiry: oracle.expiry,
        timestamp: now,
    });
}

Copy

Use an Agent
The update_prices() function pushes high-frequency spot and forward prices. If the oracle is past expiry and not yet settled, this call freezes the settlement price instead of recording another live update.

github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
public fun update_prices(
    oracle: &mut OracleSVI,
    cap: &OracleSVICap,
    prices: PriceData,
    clock: &Clock,
) {
    assert_authorized_cap(oracle, cap);
    let oracle_status = oracle.status(clock);
    assert!(oracle_status != status_settled(), EOracleSettled);

    let now = clock.timestamp_ms();
    let oracle_id = oracle.id.to_inner();

    if (oracle_status == status_pending_settlement()) {
        oracle.settlement_price = option::some(prices.spot);
        oracle.active = false;

        event::emit(OracleSettled {
            oracle_id,
            expiry: oracle.expiry,
            settlement_price: prices.spot,
            timestamp: now,
        });
        return
    };

    oracle.prices = prices;
    oracle.timestamp = now;

    event::emit(OraclePricesUpdated {
        oracle_id,
        spot: prices.spot,
        forward: prices.forward,
        timestamp: now,
    });
}

Copy

Use an Agent
The update_svi() function pushes lower-frequency SVI volatility surface parameters before expiry.

github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
public fun update_svi(oracle: &mut OracleSVI, cap: &OracleSVICap, svi: SVIParams, clock: &Clock) {
    assert_authorized_cap(oracle, cap);
    let oracle_status = oracle.status(clock);
    assert!(oracle_status != status_settled(), EOracleSettled);
    assert!(oracle_status != status_pending_settlement(), EOracleExpired);

    let now = clock.timestamp_ms();

    oracle.svi = svi;

    event::emit(OracleSVIUpdated {
        oracle_id: oracle.id.to_inner(),
        a: svi.a,
        b: svi.b,
        rho: svi.rho,
        m: svi.m,
        sigma: svi.sigma,
        timestamp: now,
    });
}

Copy

Use an Agent
Use these functions to read oracle identifiers, underlying asset, prices, SVI parameters, expiry, timestamp, settlement, and lifecycle status.

github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
public fun id(oracle: &OracleSVI): ID {
    oracle.id.to_inner()
}

public fun underlying_asset(oracle: &OracleSVI): String {
    oracle.underlying_asset
}

public fun spot_price(oracle: &OracleSVI): u64 {
    oracle.prices.spot
}

public fun forward_price(oracle: &OracleSVI): u64 {
    oracle.prices.forward
}

public fun prices(oracle: &OracleSVI): PriceData {
    oracle.prices
}

public fun svi(oracle: &OracleSVI): SVIParams {
    oracle.svi
}

public fun expiry(oracle: &OracleSVI): u64 {
    oracle.expiry
}

public fun timestamp(oracle: &OracleSVI): u64 {
    oracle.timestamp
}

public fun settlement_price(oracle: &OracleSVI): Option<u64> {
    oracle.settlement_price
}

public fun is_settled(oracle: &OracleSVI): bool {
    oracle.settlement_price.is_some()
}

public fun is_active(oracle: &OracleSVI): bool {
    oracle.active
}

public fun status(oracle: &OracleSVI, clock: &Clock): u8 {
    if (oracle.is_settled()) {
        STATUS_SETTLED
    } else if (clock.timestamp_ms() >= oracle.expiry) {
        STATUS_PENDING_SETTLEMENT
    } else if (!oracle.active) {
        STATUS_INACTIVE
    } else {
        STATUS_ACTIVE
    }
}

Copy

Use an Agent
These helper constructors build PriceData and SVIParams values for oracle updates.

github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
public fun new_price_data(spot: u64, forward: u64): PriceData {
    PriceData { spot, forward }
}

public fun new_svi_params(a: u64, b: u64, rho: i64::I64, m: i64::I64, sigma: u64): SVIParams {
    SVIParams { a, b, rho, m, sigma }
}

Copy

Use an Agent
These functions return the numeric status values used by status().

github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
public fun status_inactive(): u8 {
    STATUS_INACTIVE
}
public fun status_active(): u8 {
    STATUS_ACTIVE
}
public fun status_pending_settlement(): u8 {
    STATUS_PENDING_SETTLEMENT
}
public fun status_settled(): u8 {
    STATUS_SETTLED
}

Copy

Use an Agent
Structs
github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
/// Shared oracle object storing SVI volatility surface data.
/// One oracle per underlying + expiry combination.
public struct OracleSVI has key {
    id: UID,
    /// IDs of oracle caps authorized to update this oracle
    authorized_caps: VecSet<ID>,
    /// The underlying asset this oracle tracks (e.g., "BTC", "ETH")
    underlying_asset: String,
    /// Expiration timestamp in milliseconds
    expiry: u64,
    /// Whether the oracle is active
    active: bool,
    /// Spot and forward prices (high frequency updates)
    prices: PriceData,
    /// SVI volatility surface parameters (low frequency updates)
    svi: SVIParams,
    /// Timestamp of last update in milliseconds
    timestamp: u64,
    /// Settlement price, frozen on first update after expiry
    settlement_price: Option<u64>,
}

Copy

Use an Agent
github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
/// Price data updated at high frequency (~1s).
/// All values scaled by FLOAT_SCALING (1e9).
public struct PriceData has copy, drop, store {
    /// Current spot price of the underlying
    spot: u64,
    /// Forward price for this expiry
    forward: u64,
}

// === Structs ===

/// SVI volatility surface parameters.
/// All values scaled by FLOAT_SCALING (1e9).
public struct SVIParams has copy, drop, store {
    /// Overall variance level (always >= 0)
    a: u64,
    /// Slope of the smile wings (always >= 0)
    b: u64,
    /// Signed skew parameter (typically negative - puts more expensive)
    rho: i64::I64,
    /// Signed horizontal shift parameter
    m: i64::I64,
    /// ATM curvature / smoothness (always >= 0)
    sigma: u64,
}

Copy

Use an Agent
Events
github.com/MystenLabs/deepbookv3/packages/predict/sources/oracle.move
// === Events ===
public struct OracleActivated has copy, drop, store {
    oracle_id: ID,
    expiry: u64,
    timestamp: u64,
}
public struct OraclePricesUpdated has copy, drop, store {
    oracle_id: ID,
    spot: u64,
    forward: u64,
    timestamp: u64,
}
public struct OracleSVIUpdated has copy, drop, store {
    oracle_id: ID,
    a: u64,
    b: u64,
    rho: i64::I64,
    m: i64::I64,
    sigma: u64,
    timestamp: u64,
}
public struct OracleSettled has copy, drop, store {
    oracle_id: ID,
    expiry: u64,
    settlement_price: u64,
    timestamp: u64,
}