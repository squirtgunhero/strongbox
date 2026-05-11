import { describe, it, expect } from "vitest";
import {
  dailyInterest,
  accruedInterest,
  perDiem,
} from "./interest";

/**
 * Hand-calculated test cases for interest accrual.
 *
 * These cases are the source of truth. Functions under test must match.
 * Banker's interest: daily = principal × rate / 360
 * 365 convention:   daily = principal × rate / 365
 */
describe("dailyInterest", () => {
  // Spec example: $500,000 @ 12% actual/360 → $166.67/day
  it("$500k @ 12% actual/360 = $166.6667/day", () => {
    expect(dailyInterest(500_000, 0.12, "actual_360")).toBeCloseTo(166.6667, 4);
  });

  // $100,000 @ 10% actual/360
  // 100000 × 0.10 / 360 = 27.7777...
  it("$100k @ 10% actual/360 = $27.7778/day", () => {
    expect(dailyInterest(100_000, 0.10, "actual_360")).toBeCloseTo(27.7778, 4);
  });

  // $250,000 @ 11.5% actual/365
  // 250000 × 0.115 / 365 = 78.7671...
  it("$250k @ 11.5% actual/365 = $78.7671/day", () => {
    expect(dailyInterest(250_000, 0.115, "actual_365")).toBeCloseTo(78.7671, 4);
  });

  it("zero principal returns zero", () => {
    expect(dailyInterest(0, 0.12, "actual_360")).toBe(0);
  });
});

describe("accruedInterest", () => {
  // $500,000 @ 12% actual/360 for 30 days
  // 166.6667 × 30 = 5000.00
  it("$500k @ 12% actual/360 for 30 days = $5,000", () => {
    expect(
      accruedInterest(500_000, 0.12, "actual_360", "2025-01-01", "2025-01-31")
    ).toBeCloseTo(5000.0, 2);
  });

  // $100,000 @ 10% actual/365 for 365 days = exactly $10,000
  it("$100k @ 10% actual/365 for a full year = $10,000", () => {
    expect(
      accruedInterest(100_000, 0.10, "actual_365", "2024-01-01", "2024-12-31")
    ).toBeCloseTo(10_000, 2);
  });

  // Same dates = zero days = zero interest
  it("same from and to = zero", () => {
    expect(
      accruedInterest(500_000, 0.12, "actual_360", "2025-01-01", "2025-01-01")
    ).toBe(0);
  });

  // Spanning a leap day on actual/360 still uses actual days
  // 2024-02-28 to 2024-03-01 = 2 days (Feb 29 + Mar 1) → 333.33
  it("actual/360 counts actual days across leap day", () => {
    expect(
      accruedInterest(500_000, 0.12, "actual_360", "2024-02-28", "2024-03-01")
    ).toBeCloseTo(333.3333, 2);
  });

  // Going backwards is not allowed
  it("throws if to is before from", () => {
    expect(() =>
      accruedInterest(500_000, 0.12, "actual_360", "2025-02-01", "2025-01-01")
    ).toThrow();
  });
});

describe("perDiem", () => {
  // Per-diem on a $500k @ 12% actual/360 loan = $166.67
  it("returns daily interest amount", () => {
    expect(perDiem(500_000, 0.12, "actual_360")).toBeCloseTo(166.6667, 4);
  });

  it("uses default rate when loan is in default", () => {
    // $500k at default rate 18%, actual/360
    // 500000 × 0.18 / 360 = 250.00
    expect(perDiem(500_000, 0.12, "actual_360", { defaultRate: 0.18, isDefaulted: true })).toBeCloseTo(
      250,
      2
    );
  });

  it("ignores default rate when not defaulted", () => {
    expect(perDiem(500_000, 0.12, "actual_360", { defaultRate: 0.18, isDefaulted: false })).toBeCloseTo(
      166.6667,
      4
    );
  });
});
