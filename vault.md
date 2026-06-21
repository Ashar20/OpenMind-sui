Vault
The Predict vault holds accepted quote assets and takes the opposite side of every trade. predict.move owns pricing and trading orchestration; vault.move is the state machine for balances, exposure, mark-to-market liability, max payout, and settled-oracle compaction.

LPs interact with the vault through predict::supply and predict::withdraw, which mint and burn PLP shares. See Predict for those public liquidity entry points.

Read functions
Use these functions to read total vault balance, concrete asset balances, total mark-to-market liability, vault value, and total max payout.

github.com/MystenLabs/deepbookv3/packages/predict/sources/vault/vault.move
public fun balance(vault: &Vault): u64 {
    vault.balance
}
public fun asset_balance<T>(vault: &Vault): u64 {
    let key = BalanceKey<T> {};
    if (vault.balances.contains(key)) {
        let balance: &Balance<T> = &vault.balances[key];
        balance.value()
    } else {
        0
    }
}
public fun total_mtm(vault: &Vault): u64 {
    vault.total_mtm
}
public fun vault_value(vault: &Vault): u64 {
    assert!(vault.balance >= vault.total_mtm, EMtmExceedsBalance);
    vault.balance - vault.total_mtm
}
public fun total_max_payout(vault: &Vault): u64 {
    vault.total_max_payout
}

Copy

Use an Agent
Structs
github.com/MystenLabs/deepbookv3/packages/predict/sources/vault/vault.move
public struct Vault has store {
    /// Concrete balances stored per accepted quote asset type.
    balances: Bag,
    /// Shared treasury balance tracked in quote units.
    balance: u64,
    /// Per-oracle matrix for strike-level position tracking.
    oracle_matrices: Table<ID, StrikeMatrix>,
    /// Per-oracle compact state used after settlement compaction.
    settled_oracles: Table<ID, SettledOracleState>,
    /// Sum of all oracle matrix MTM values.
    total_mtm: u64,
    /// Sum of all oracle matrix max payout values.
    total_max_payout: u64,
}

Copy

Use an Agent
After settlement compaction, the vault stores compact per-oracle remaining quantity and liability.

github.com/MystenLabs/deepbookv3/packages/predict/sources/vault/vault.move
public struct SettledOracleState has copy, drop, store {
    remaining_quantity: u64,
    remaining_liability: u64,
}

Copy

Use an Agent
PLP is the LP share coin minted when users supply vault liquidity.

github.com/MystenLabs/deepbookv3/packages/predict/sources/vault/plp.move
public struct PLP has drop {}

Copy

Use an Agent
Related topics
Predict
Learn about the Predict shared object, public trading functions, liquidity functions, configuration reads, and emitted events.