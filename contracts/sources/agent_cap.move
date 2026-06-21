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
public struct OwnerCap has key, store { id: UID, agent_cap_id: ID, vault_id: ID }

/// Shared object so both the keeper (presenting it on every autonomous
/// mint) and the owner (revoking it) can reference it from separate
/// transactions. Mirrors the brief's own example shape: "max 500 USDC,
/// Deepbook only, expires 24h" — here scoped to this one vault's hedge +
/// directional spend.
public struct AgentCap has key, store {
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

public fun remaining_budget(cap: &AgentCap): u64 { cap.max_budget - cap.spent }
public fun is_active(cap: &AgentCap, clock: &Clock): bool {
    !cap.revoked && sui::clock::timestamp_ms(clock) <= cap.expires_at_ms
}

public fun vault_id(cap: &AgentCap): ID { cap.vault_id }
public fun owner(cap: &AgentCap): address { cap.owner }
public fun max_budget(cap: &AgentCap): u64 { cap.max_budget }
public fun spent(cap: &AgentCap): u64 { cap.spent }
public fun expires_at_ms(cap: &AgentCap): u64 { cap.expires_at_ms }
public fun revoked(cap: &AgentCap): bool { cap.revoked }
public fun action_count(cap: &AgentCap): u64 { cap.action_count }
