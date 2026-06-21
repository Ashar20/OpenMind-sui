#[test_only]
module openmind::reasoning_anchor_tests;

use std::hash::sha2_256;
use sui::test_scenario::{Self as ts, Scenario};

use openmind::reasoning_anchor::{Self, ReasoningAnchor};

#[test]
fun verify_anchor_matches_sha256() {
    let mut scenario = ts::begin(@0xA);
    let json = b"{\"version\":\"openmind-v1\"}";
    let hash = sha2_256(json);

    ts::next_tx(&mut scenario, @0xA);
    {
        reasoning_anchor::create_anchor(
            object::id_from_address(@0xB),
            object::id_from_address(@0xC),
            hash,
            1_700_000_000_000,
            5000,
            250,
            100,
            50,
            3,
            b"walrus-blob-id",
            b"openmind-vault",
            ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, @0xD);
    {
        let anchor = ts::take_shared<ReasoningAnchor>(&scenario);
        let verified = reasoning_anchor::verify_anchor(&anchor, json, ts::ctx(&mut scenario));
        assert!(verified, 0);
        ts::return_shared(anchor);
    };

    ts::end(scenario);
}
