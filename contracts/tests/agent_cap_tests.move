#[test_only]
module openmind::agent_cap_tests;

use sui::clock;
use sui::test_scenario as ts;

use openmind::agent_cap::{Self, AgentCap, OwnerCap};

const VAULT_ADDR: address = @0xB;

#[test]
fun grant_then_authorize_spends_budget_and_logs_action() {
    let mut scenario = ts::begin(@0xA);
    let vault_id = object::id_from_address(VAULT_ADDR);

    ts::next_tx(&mut scenario, @0xA);
    {
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let (owner_cap, agent_cap) = agent_cap::grant(
            vault_id, 1_000_000, 86_400_000, &clock, ts::ctx(&mut scenario),
        );
        transfer::public_transfer(owner_cap, @0xA);
        transfer::public_share_object(agent_cap);
        clock::destroy_for_testing(clock);
    };

    ts::next_tx(&mut scenario, @0xA);
    {
        let mut cap = ts::take_shared<AgentCap>(&scenario);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        agent_cap::authorize_and_log(&mut cap, 400_000, b"open_cycle_hedge", &clock);
        assert!(agent_cap::spent(&cap) == 400_000, 0);
        assert!(agent_cap::action_count(&cap) == 1, 1);
        assert!(agent_cap::remaining_budget(&cap) == 600_000, 2);
        clock::destroy_for_testing(clock);
        ts::return_shared(cap);
    };

    ts::end(scenario);
}

// Abort code 1 == agent_cap::EBudgetExceeded (module-private const).
#[test, expected_failure(abort_code = 1)]
fun authorize_aborts_when_amount_exceeds_remaining_budget() {
    let mut scenario = ts::begin(@0xA);
    let vault_id = object::id_from_address(VAULT_ADDR);

    ts::next_tx(&mut scenario, @0xA);
    {
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let (owner_cap, agent_cap) = agent_cap::grant(
            vault_id, 1_000_000, 86_400_000, &clock, ts::ctx(&mut scenario),
        );
        transfer::public_transfer(owner_cap, @0xA);
        transfer::public_share_object(agent_cap);
        clock::destroy_for_testing(clock);
    };

    ts::next_tx(&mut scenario, @0xA);
    {
        let mut cap = ts::take_shared<AgentCap>(&scenario);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        agent_cap::authorize_and_log(&mut cap, 1_000_001, b"open_cycle_hedge", &clock);
        clock::destroy_for_testing(clock);
        ts::return_shared(cap);
    };

    ts::end(scenario);
}

// Abort code 2 == agent_cap::ERevoked (module-private const).
#[test, expected_failure(abort_code = 2)]
fun authorize_aborts_after_owner_revokes() {
    let mut scenario = ts::begin(@0xA);
    let vault_id = object::id_from_address(VAULT_ADDR);

    ts::next_tx(&mut scenario, @0xA);
    {
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let (owner_cap, agent_cap) = agent_cap::grant(
            vault_id, 1_000_000, 86_400_000, &clock, ts::ctx(&mut scenario),
        );
        transfer::public_transfer(owner_cap, @0xA);
        transfer::public_share_object(agent_cap);
        clock::destroy_for_testing(clock);
    };

    ts::next_tx(&mut scenario, @0xA);
    {
        let owner_cap = ts::take_from_sender<OwnerCap>(&scenario);
        let mut cap = ts::take_shared<AgentCap>(&scenario);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        agent_cap::revoke(&owner_cap, &mut cap, &clock, ts::ctx(&mut scenario));
        assert!(agent_cap::revoked(&cap), 0);
        agent_cap::authorize_and_log(&mut cap, 1, b"open_cycle_hedge", &clock);
        clock::destroy_for_testing(clock);
        ts::return_shared(cap);
        ts::return_to_sender(&scenario, owner_cap);
    };

    ts::end(scenario);
}

// Abort code 3 == agent_cap::EExpired (module-private const).
#[test, expected_failure(abort_code = 3)]
fun authorize_aborts_once_expired() {
    let mut scenario = ts::begin(@0xA);
    let vault_id = object::id_from_address(VAULT_ADDR);

    ts::next_tx(&mut scenario, @0xA);
    {
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let (owner_cap, agent_cap) = agent_cap::grant(
            vault_id, 1_000_000, 1_000, &clock, ts::ctx(&mut scenario),
        );
        transfer::public_transfer(owner_cap, @0xA);
        transfer::public_share_object(agent_cap);
        clock::destroy_for_testing(clock);
    };

    ts::next_tx(&mut scenario, @0xA);
    {
        let mut cap = ts::take_shared<AgentCap>(&scenario);
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::increment_for_testing(&mut clock, 1_001);
        agent_cap::authorize_and_log(&mut cap, 1, b"open_cycle_hedge", &clock);
        clock::destroy_for_testing(clock);
        ts::return_shared(cap);
    };

    ts::end(scenario);
}
