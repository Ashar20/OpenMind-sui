/// On-chain proof that openmind's reasoning was committed BEFORE settlement.
module openmind::reasoning_anchor;

use std::hash::sha2_256;
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::TxContext;

const EInvalidHash: u64 = 2;

public struct ReasoningAnchor has key {
    id: UID,
    vault_id: ID,
    cycle_oracle_id: ID,
    reasoning_hash: vector<u8>,
    anchored_at_ms: u64,
    risk_score: u64,
    hedge_budget_bps: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    walrus_blob_id: vector<u8>,
    memwal_namespace: vector<u8>,
}

public struct AnchorCreated has copy, drop {
    anchor_id: ID,
    vault_id: ID,
    oracle_id: ID,
    reasoning_hash: vector<u8>,
    anchored_at_ms: u64,
    walrus_blob_id: vector<u8>,
}

public struct AnchorVerified has copy, drop {
    anchor_id: ID,
    verified: bool,
    verifier: address,
}

public fun create_anchor(
    vault_id: ID,
    oracle_id: ID,
    reasoning_hash: vector<u8>,
    anchored_at_ms: u64,
    risk_score: u64,
    hedge_budget_bps: u64,
    news_signal_bps: u64,
    svi_gap_bps: u64,
    memory_cycles_recalled: u64,
    walrus_blob_id: vector<u8>,
    memwal_namespace: vector<u8>,
    ctx: &mut TxContext,
): ID {
    assert!(reasoning_hash.length() == 32, EInvalidHash);
    let anchor = ReasoningAnchor {
        id: object::new(ctx),
        vault_id,
        cycle_oracle_id: oracle_id,
        reasoning_hash,
        anchored_at_ms,
        risk_score,
        hedge_budget_bps,
        news_signal_bps,
        svi_gap_bps,
        memory_cycles_recalled,
        walrus_blob_id,
        memwal_namespace,
    };
    let anchor_id = object::id(&anchor);
    event::emit(AnchorCreated {
        anchor_id,
        vault_id,
        oracle_id,
        reasoning_hash,
        anchored_at_ms,
        walrus_blob_id,
    });
    transfer::share_object(anchor);
    anchor_id
}

public fun verify_anchor(
    anchor: &ReasoningAnchor,
    reasoning_json: vector<u8>,
    ctx: &mut TxContext,
): bool {
    let computed = sha2_256(reasoning_json);
    let verified = computed == anchor.reasoning_hash;
    event::emit(AnchorVerified {
        anchor_id: object::id(anchor),
        verified,
        verifier: tx_context::sender(ctx),
    });
    verified
}

public fun reasoning_hash(anchor: &ReasoningAnchor): vector<u8> {
    anchor.reasoning_hash
}

public fun anchored_at_ms(anchor: &ReasoningAnchor): u64 {
    anchor.anchored_at_ms
}

public fun walrus_blob_id(anchor: &ReasoningAnchor): vector<u8> {
    anchor.walrus_blob_id
}

public fun risk_score(anchor: &ReasoningAnchor): u64 {
    anchor.risk_score
}

public fun hedge_budget_bps(anchor: &ReasoningAnchor): u64 {
    anchor.hedge_budget_bps
}

public fun memory_cycles_recalled(anchor: &ReasoningAnchor): u64 {
    anchor.memory_cycles_recalled
}
