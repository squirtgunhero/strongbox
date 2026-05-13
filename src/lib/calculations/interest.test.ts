import { describe, it, expect } from "vitest";
import {
  dailyInterest,
  accruedInterest,
  perDiem,
  accruedInterestWithDefault,
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

describe("accruedInterestWithDefault", () => {
  // Hand-calc base: $500k × 12% / 360 = $166.6667/day (normal)
  //                 $500k × 24% / 360 = $333.3333/day (default)
  const P = 500_000;
  const R = 0.12;
  const DR = 0.24;

  it("no default date → behaves like single-rate accruedInterest", () => {
    // 30 days × $166.6667 = $5,000.00
    expect(
      accruedInterestWithDefault(P, R, "actual_360", "2026-03-01", "2026-03-31")
    ).toBeCloseTo(5000, 2);
  });

  it("default date null → ignores defaultRate", () => {
    expect(
      accruedInterestWithDefault(P, R, "actual_360", "2026-03-01", "2026-03-31", {
        defaultDate: null,
        defaultRate: DR,
      })
    ).toBeCloseTo(5000, 2);
  });

  it("default rate null/zero → falls back to normal rate even with a default date", () => {
    expect(
      accruedInterestWithDefault(P, R, "actual_360", "2026-03-01", "2026-03-31", {
        defaultDate: "2026-03-15",
        defaultRate: null,
      })
    ).toBeCloseTo(5000, 2);
  });

  it("default precedes the window → entire period at default rate", () => {
    // 30 days × $333.3333 = $10,000.00
    expect(
      accruedInterestWithDefault(P, R, "actual_360", "2026-03-01", "2026-03-31", {
        defaultDate: "2026-01-15",
        defaultRate: DR,
      })
    ).toBeCloseTo(10_000, 2);
  });

  it("default date is exactly fromDate → all days at default rate", () => {
    expect(
      accruedInterestWithDefault(P, R, "actual_360", "2026-03-01", "2026-03-31", {
        defaultDate: "2026-03-01",
        defaultRate: DR,
      })
    ).toBeCloseTo(10_000, 2);
  });

  it("default after the window ends → all days at normal rate", () => {
    expect(
      accruedInterestWithDefault(P, R, "actual_360", "2026-03-01", "2026-03-31", {
        defaultDate: "2026-04-15",
        defaultRate: DR,
      })
    ).toBeCloseTo(5000, 2);
  });

  it("splits at default date mid-period", () => {
    // Default 2026-03-15 → first 14 days normal ($166.6667 × 14 = $2,333.33),
    // remaining 16 days at default ($333.3333 × 16 = $5,333.33). Total ≈ $7,666.67
    const got = accruedInterestWithDefault(
      P,
      R,
      "actual_360",
      "2026-03-01",
      "2026-03-31",
      { defaultDate: "2026-03-15", defaultRate: DR }
    );
    expect(got).toBeCloseTo(7666.6667, 2);
  });

  it("split-period math handles actual/365 too", () => {
    // $1M × 10% / 365 = $273.97/day normal
    // $1M × 24% / 365 = $657.53/day default
    // Period 2026-06-01 → 2026-07-01 (30 days), default 2026-06-21
    // 20 days × $273.973 + 10 days × $657.534 = $5,479.45 + $6,575.34 = $12,054.79
    const got = accruedInterestWithDefault(
      1_000_000,
      0.10,
      "actual_365",
      "2026-06-01",
      "2026-07-01",
      { defaultDate: "2026-06-21", defaultRate: 0.24 }
    );
    expect(got).toBeCloseTo(12_054.79, 1);
  });
});
