/// OpenZeppelin access-control boundary for the openmind vault.
/// PRD references `ownable`; on Sui shared objects use `access_control`
/// (the audited OZ access primitive for protocol admin + keeper roles).
///
/// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/access
module openmind::openmind_access;

use sui::object::{Self, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;

use openzeppelin_access::access_control::{Self, AccessControl, Auth};

/// OTW for the access-control registry (separate from share-token OTW).
public struct OPENMIND_ACCESS has drop {}

/// Keeper may open/close vault cycles.
public struct KeeperRole has drop {}

/// Admin may pause vault and grant keeper roles.
public struct AdminRole has drop {}

const EUnauthorized: u64 = 1;

/// Shared role registry. Created once at package publish.
fun init(otw: OPENMIND_ACCESS, ctx: &mut TxContext) {
    let mut registry = access_control::new(otw, 0, ctx);
    let deployer = tx_context::sender(ctx);
    registry.grant_role<OPENMIND_ACCESS, AdminRole>(deployer, ctx);
    registry.set_role_admin<OPENMIND_ACCESS, KeeperRole, AdminRole>(ctx);
    registry.grant_role<OPENMIND_ACCESS, KeeperRole>(deployer, ctx);
    transfer::public_share_object(registry);
}

/// Mint keeper auth for the transaction sender (for PTB open_cycle).
public fun new_keeper_auth(
    ac: &AccessControl<OPENMIND_ACCESS>,
    ctx: &mut TxContext,
): Auth<KeeperRole> {
    ac.new_auth<OPENMIND_ACCESS, KeeperRole>(ctx)
}

/// Mint admin auth for the transaction sender.
public fun new_admin_auth(
    ac: &AccessControl<OPENMIND_ACCESS>,
    ctx: &mut TxContext,
): Auth<AdminRole> {
    ac.new_auth<OPENMIND_ACCESS, AdminRole>(ctx)
}

/// Grant keeper role to an address. Caller must hold AdminRole.
public fun grant_keeper(
    ac: &mut AccessControl<OPENMIND_ACCESS>,
    _auth: &Auth<AdminRole>,
    keeper: address,
    ctx: &mut TxContext,
) {
    ac.grant_role<OPENMIND_ACCESS, KeeperRole>(keeper, ctx);
}

/// Assert caller holds KeeperRole before cycle execution.
public fun assert_keeper(ac: &AccessControl<OPENMIND_ACCESS>, ctx: &TxContext) {
    assert!(
        ac.has_role<OPENMIND_ACCESS, KeeperRole>(tx_context::sender(ctx)),
        EUnauthorized,
    );
}

public fun access_control_id(ac: &AccessControl<OPENMIND_ACCESS>): ID {
    object::id(ac)
}
