/// AI-risk-capped borrowing against an open, winning vault position.
/// The maximum borrowable amount is set by openmind's live AI risk score:
/// the riskier the agent judges the current cycle, the lower the ceiling.
/// This does NOT eliminate liquidation risk — it only sizes the ceiling
/// more conservatively when the agent expects danger.
///
/// Reference: https://docs.openzeppelin.com/contracts-sui/1.x/api/math
module openmind::risk_capped_borrow;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::tx_context::TxContext;

use openzeppelin_math::u64::mul_div;
use openzeppelin_math::rounding;

use openmind::openmind_vault::OpenMindVault;

const EPositionNotOpen: u64 = 1;
const ENotInProfit: u64 = 2;
const EExceedsRiskCap: u64 = 3;
#[allow(unused_const)]
const ELoanNotOutstanding: u64 = 4;
#[allow(unused_const)]
const EUnderwater: u64 = 5;

const BPS: u64 = 10_000;
/// Base LTV at risk_score = 0: 50% of unrealized profit.
const BASE_LTV_BPS: u64 = 5_000;

/// Outstanding loan against one vault's currently open position.
public struct RiskCappedLoan<phantom Quote> has key {
    id: UID,
    vault_id: ID,
    borrower: address,
    principal: Balance<Quote>,
    collateral_value_at_open: u64,
    risk_score_at_open: u64,
    max_borrow_at_open: u64,
}

public struct LoanOpened has copy, drop {
    loan_id: ID,
    vault_id: ID,
    borrower: address,
    principal: u64,
    risk_score: u64,
    max_borrow_bps_applied: u64,
}

public struct LoanRepaid has copy, drop {
    loan_id: ID,
    vault_id: ID,
    amount_repaid: u64,
}

public struct LoanLiquidated has copy, drop {
    loan_id: ID,
    vault_id: ID,
    collateral_value_at_liquidation: u64,
    shortfall: u64,
}

/// Compute the max borrowable amount given the current AI risk score.
/// risk_score = 0      → BASE_LTV_BPS (50%) of unrealized profit
/// risk_score = 10_000 → 0% (agent sees maximum danger)
public fun max_borrow_bps(risk_score: u64): u64 {
    let discount = mul_div(BASE_LTV_BPS, risk_score, BPS, rounding::down()).destroy_some();
    if (discount >= BASE_LTV_BPS) { 0 } else { BASE_LTV_BPS - discount }
}

/// Open a loan against the vault's currently open, in-profit position.
/// `unrealized_value` and `risk_score` are passed by the keeper from the
/// live OpenCycle state and the most recent ReasoningAnchor.
public fun open_loan<Quote>(
    vault: &OpenMindVault<Quote>,
    unrealized_value: u64,
    cost_basis: u64,
    risk_score: u64,
    requested_amount: Coin<Quote>,
    ctx: &mut TxContext,
): RiskCappedLoan<Quote> {
    assert!(openmind::openmind_vault::has_open_cycle(vault), EPositionNotOpen);
    assert!(unrealized_value > cost_basis, ENotInProfit);

    let profit = unrealized_value - cost_basis;
    let cap_bps = max_borrow_bps(risk_score);
    let max_borrow = mul_div(profit, cap_bps, BPS, rounding::down()).destroy_some();

    let requested = coin::value(&requested_amount);
    assert!(requested <= max_borrow, EExceedsRiskCap);

    let vault_id = object::id(vault);
    let loan = RiskCappedLoan<Quote> {
        id: object::new(ctx),
        vault_id,
        borrower: tx_context::sender(ctx),
        principal: coin::into_balance(requested_amount),
        collateral_value_at_open: unrealized_value,
        risk_score_at_open: risk_score,
        max_borrow_at_open: max_borrow,
    };

    event::emit(LoanOpened {
        loan_id: object::id(&loan),
        vault_id,
        borrower: tx_context::sender(ctx),
        principal: requested,
        risk_score,
        max_borrow_bps_applied: cap_bps,
    });

    loan
}

/// Repay an outstanding loan (full or partial).
public fun repay<Quote>(
    loan: &mut RiskCappedLoan<Quote>,
    payment: Coin<Quote>,
) {
    let amount = coin::value(&payment);
    balance::join(&mut loan.principal, coin::into_balance(payment));
    event::emit(LoanRepaid {
        loan_id: object::id(loan),
        vault_id: loan.vault_id,
        amount_repaid: amount,
    });
}

/// Permissionless liquidation check. Returns true if position is underwater.
/// Emits LoanLiquidated so force-settlement can be coordinated off-chain.
public fun check_liquidation<Quote>(
    loan: &RiskCappedLoan<Quote>,
    current_unrealized_value: u64,
    outstanding_principal: u64,
    ctx: &mut TxContext,
): bool {
    let underwater = current_unrealized_value < outstanding_principal;
    if (underwater) {
        let shortfall = if (outstanding_principal > current_unrealized_value) {
            outstanding_principal - current_unrealized_value
        } else { 0 };
        event::emit(LoanLiquidated {
            loan_id: object::id(loan),
            vault_id: loan.vault_id,
            collateral_value_at_liquidation: current_unrealized_value,
            shortfall,
        });
    };
    let _ = ctx;
    underwater
}

public fun risk_score_at_open<Quote>(loan: &RiskCappedLoan<Quote>): u64 { loan.risk_score_at_open }
public fun max_borrow_at_open<Quote>(loan: &RiskCappedLoan<Quote>): u64 { loan.max_borrow_at_open }
public fun outstanding<Quote>(loan: &RiskCappedLoan<Quote>): u64 { balance::value(&loan.principal) }
