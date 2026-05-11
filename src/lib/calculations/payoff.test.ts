import { describe, it, expect } from "vitest";
import { calculatePayoff } from "./payoff";

/**
 * Payoff = current principal + accrued interest (from last paid-through date)
 *         + outstanding late fees + extension fees (if applicable).
 */
describe("calculatePayoff", () => {
  // Simple: $500k principal @ 12% actual/360, paid through 2025-01-01, payoff 2025-01-31
  // Days = 30, per diem = 166.6667, accrued = 5000.00
  // Total = 500000 + 5000 = 505,000
  it("$500k @ 12% actual/360, 30 days unpaid → $505,000", () => {
    const result = calculatePayoff({
      currentPrincipal: 500_000,
      interestRate: 0.12,
      dayCount: "actual_360",
      paidThroughDate: "2025-01-01",
      payoffDate: "2025-01-31",
      outstandingLateFees: 0,
      isDefaulted: false,
    });
    expect(result.principal).toBe(500_000);
    expect(result.accruedInterest).toBeCloseTo(5_000, 2);
    expect(result.lateFees).toBe(0);
    expect(result.total).toBeCloseTo(505_000, 2);
    expect(result.perDiem).toBeCloseTo(166.6667, 4);
  });

  // Default rate kicks in when defaulted
  // $500k @ 18% (default) actual/360 × 10 days = 2500.00
  it("uses default rate when defaulted", () => {
    const result = calculatePayoff({
      currentPrincipal: 500_000,
      interestRate: 0.12,
      defaultRate: 0.18,
      dayCount: "actual_360",
      paidThroughDate: "2025-01-01",
      payoffDate: "2025-01-11",
      outstandingLateFees: 0,
      isDefaulted: true,
    });
    expect(result.accruedInterest).toBeCloseTo(2_500, 2);
    expect(result.perDiem).toBeCloseTo(250, 2);
  });

  // Late fees added on top
  it("adds outstanding late fees", () => {
    const result = calculatePayoff({
      currentPrincipal: 100_000,
      interestRate: 0.10,
      dayCount: "actual_360",
      paidThroughDate: "2025-01-01",
      payoffDate: "2025-01-31",
      outstandingLateFees: 500,
      isDefaulted: false,
    });
    // 100k × 0.10 / 360 = 27.7778/day × 30 = 833.33
    expect(result.accruedInterest).toBeCloseTo(833.33, 2);
    expect(result.lateFees).toBe(500);
    expect(result.total).toBeCloseTo(101_333.33, 2);
  });

  // Extension fees added when supplied
  it("adds extension fees", () => {
    const result = calculatePayoff({
      currentPrincipal: 100_000,
      interestRate: 0.10,
      dayCount: "actual_360",
      paidThroughDate: "2025-01-01",
      payoffDate: "2025-01-01", // same day, no interest
      outstandingLateFees: 0,
      isDefaulted: false,
      extensionFees: 1_000,
    });
    expect(result.accruedInterest).toBe(0);
    expect(result.extensionFees).toBe(1_000);
    expect(result.total).toBe(101_000);
  });

  it("rejects payoff date before paid-through date", () => {
    expect(() =>
      calculatePayoff({
        currentPrincipal: 100_000,
        interestRate: 0.10,
        dayCount: "actual_360",
        paidThroughDate: "2025-02-01",
        payoffDate: "2025-01-01",
        outstandingLateFees: 0,
        isDefaulted: false,
      })
    ).toThrow();
  });
});
