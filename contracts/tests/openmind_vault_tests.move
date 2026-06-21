#[test_only]
module openmind::openmind_vault_tests;

use openzeppelin_fp_math::ud30x9;
use openmind::openmind_vault;

#[test]
fun shares_for_deposit_first_depositor_gets_one_to_one() {
    assert!(openmind_vault::shares_for_deposit_for_test(0, 0, 1_000_000) == 1_000_000, 0);
}

#[test]
fun shares_for_deposit_scales_with_nav() {
    assert!(openmind_vault::shares_for_deposit_for_test(2_000_000, 1_000_000, 500_000) == 250_000, 0);
}

#[test]
fun amount_for_shares_pro_rata() {
    assert!(openmind_vault::amount_for_shares_for_test(2_000_000, 1_000_000, 250_000) == 500_000, 0);
}

#[test]
fun bps_fraction_matches_mul_div() {
    let amount = 10_000_000u64;
    let bps = 500u64;
    assert!(
        openmind_vault::bps_fraction_of_for_test(amount, bps)
            == 500_000,
        0,
    );
}

#[test]
fun quote_amount_scales_to_ud30x9() {
    let fp = openmind_vault::quote_amount_to_ud30x9_for_test(1_000_000);
    assert!(ud30x9::unwrap(fp) == 1_000_000_000, 0);
}
