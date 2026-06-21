Predict Manager
The PredictManager is a per-user shared account object
. It wraps a DeepBook
 BalanceManager, stores quote balances, and tracks Predict positions internally.

Each user should create one manager and reuse it. Binary positions and vertical ranges are not separate onchain objects; they are quantities stored inside the manager.

API
Use these functions to read the manager owner, deposited asset balances, binary position quantities, and range quantities.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict_manager.move
public fun owner(self: &PredictManager): address {
    self.owner
}

public fun balance<T>(self: &PredictManager): u64 {
    self.balance_manager.balance<T>()
}

public fun position(self: &PredictManager, key: MarketKey): u64 {
    if (self.positions.contains(key)) {
        self.positions[key]
    } else {
        0
    }
}

public fun range_position(self: &PredictManager, key: RangeKey): u64 {
    if (self.range_positions.contains(key)) {
        self.range_positions[key]
    } else {
        0
    }
}

Copy

Use an Agent
The manager owner deposits quote assets before minting positions or ranges.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict_manager.move
public fun deposit<T>(self: &mut PredictManager, coin: Coin<T>, ctx: &TxContext) {
    assert!(ctx.sender() == self.owner, EInvalidOwner);
    self.balance_manager.deposit_with_cap(&self.deposit_cap, coin, ctx);
}

Copy

Use an Agent
The manager owner can withdraw quote assets from the manager.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict_manager.move
public fun withdraw<T>(self: &mut PredictManager, amount: u64, ctx: &mut TxContext): Coin<T> {
    assert!(ctx.sender() == self.owner, EInvalidOwner);
    self.balance_manager.withdraw_with_cap(&self.withdraw_cap, amount, ctx)
}

Copy

Use an Agent
Events
Emitted when a new PredictManager is created.

github.com/MystenLabs/deepbookv3/packages/predict/sources/predict_manager.move
// === Events ===
public struct PredictManagerCreated has copy, drop, store {
    manager_id: ID,
    owner: address,
}

Copy

Use an Agent
