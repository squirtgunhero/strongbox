import { describe, it, expect } from "vitest";
import { applyWaterfall } from "./waterfall";

/**
 * Payment waterfall: late fees → default interest → regular interest → escrow → principal
 *
 * Test cases use hand-calculated balances.
 */
describe("applyWaterfall", () => {
  it("applies in correct order, fully covers all buckets", () => {
    const result = applyWaterfall({
      amount: 10_000,
      lateFeesDue: 200,
      defaultInterestDue: 0,
      interestDue: 5_000,
      escrowDue: 0,
      principalBalance: 100_000,
    });
    expect(result.applied_to_late_fees).toBe(200);
    expect(result.applied_to_default_interest).toBe(0);
    expect(result.applied_to_interest).toBe(5_000);
    expect(result.applied_to_escrow).toBe(0);
    expect(result.applied_to_principal).toBe(4_800);
    expect(result.remaining).toBe(0);
  });

  it("partial payment satisfies late fees first", () => {
    const result = applyWaterfall({
      amount: 150,
      lateFeesDue: 200,
      defaultInterestDue: 0,
      interestDue: 5_000,
      escrowDue: 0,
      principalBalance: 100_000,
    });
    expect(result.applied_to_late_fees).toBe(150);
    expect(result.applied_to_default_interest).toBe(0);
    expect(result.applied_to_interest).toBe(0);
    expect(result.applied_to_principal).toBe(0);
    expect(result.remaining).toBe(0);
  });

  it("default interest takes priority over regular interest", () => {
    const result = applyWaterfall({
      amount: 3_000,
      lateFeesDue: 0,
      defaultInterestDue: 1_200,
      interestDue: 2_500,
      escrowDue: 0,
      principalBalance: 100_000,
    });
    expect(result.applied_to_default_interest).toBe(1_200);
    expect(result.applied_to_interest).toBe(1_800);
    expect(result.applied_to_principal).toBe(0);
  });

  it("over-payment beyond all dues and principal becomes remaining", () => {
    const result = applyWaterfall({
      amount: 200_000,
      lateFeesDue: 0,
      defaultInterestDue: 0,
      interestDue: 5_000,
      escrowDue: 0,
      principalBalance: 100_000,
    });
    expect(result.applied_to_interest).toBe(5_000);
    expect(result.applied_to_principal).toBe(100_000);
    expect(result.remaining).toBe(95_000);
  });

  it("escrow comes before principal", () => {
    const result = applyWaterfall({
      amount: 7_000,
      lateFeesDue: 0,
      defaultInterestDue: 0,
      interestDue: 5_000,
      escrowDue: 1_500,
      principalBalance: 100_000,
    });
    expect(result.applied_to_interest).toBe(5_000);
    expect(result.applied_to_escrow).toBe(1_500);
    expect(result.applied_to_principal).toBe(500);
  });

  it("zero amount applies nothing", () => {
    const result = applyWaterfall({
      amount: 0,
      lateFeesDue: 200,
      defaultInterestDue: 0,
      interestDue: 5_000,
      escrowDue: 0,
      principalBalance: 100_000,
    });
    expect(result.applied_to_late_fees).toBe(0);
    expect(result.applied_to_interest).toBe(0);
    expect(result.applied_to_principal).toBe(0);
    expect(result.remaining).toBe(0);
  });

  it("rejects negative amount", () => {
    expect(() =>
      applyWaterfall({
        amount: -100,
        lateFeesDue: 0,
        defaultInterestDue: 0,
        interestDue: 5_000,
        escrowDue: 0,
        principalBalance: 100_000,
      })
    ).toThrow();
  });
});
