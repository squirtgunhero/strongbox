import { describe, it, expect } from "vitest";
import {
  investorShareOfInterest,
  validatePositionAgainstLoan,
  ytdReturn,
} from "./distributions";

describe("investorShareOfInterest", () => {
  // Spec: investor with 25% position on a loan that just received $5,000 of
  // interest → investor gets $1,250
  it("25% position on $5k interest payment = $1,250", () => {
    expect(investorShareOfInterest(5_000, 0.25)).toBe(1_250);
  });

  it("100% position passes through full amount", () => {
    expect(investorShareOfInterest(5_000, 1)).toBe(5_000);
  });

  it("rounds to cents", () => {
    // $3,333.33 × 0.3333 = 1110.99889... → 1111.00
    expect(investorShareOfInterest(3_333.33, 0.3333)).toBeCloseTo(1111.0, 2);
  });

  it("zero interest yields zero distribution", () => {
    expect(investorShareOfInterest(0, 0.5)).toBe(0);
  });

  it("rejects negative interest", () => {
    expect(() => investorShareOfInterest(-100, 0.5)).toThrow();
  });

  it("rejects percentage > 1", () => {
    expect(() => investorShareOfInterest(100, 1.5)).toThrow();
  });

  it("rejects percentage < 0", () => {
    expect(() => investorShareOfInterest(100, -0.1)).toThrow();
  });
});

describe("validatePositionAgainstLoan", () => {
  // Sum of all positions cannot exceed the loan amount
  it("accepts new position when sum stays at/below loan amount", () => {
    // 30k + 20k existing + 50k new = 100k = loan amount → fits exactly
    expect(() =>
      validatePositionAgainstLoan(50_000, [
        { amount: 30_000 },
        { amount: 20_000 },
      ], 100_000)
    ).not.toThrow();
  });

  it("rejects new position that pushes over loan amount", () => {
    // 30k + 25k existing + 50k new = 105k > 100k → rejected
    expect(() =>
      validatePositionAgainstLoan(50_000, [
        { amount: 30_000 },
        { amount: 25_000 },
      ], 100_000)
    ).toThrow();
  });

  it("rejects zero or negative position", () => {
    expect(() => validatePositionAgainstLoan(0, [], 100_000)).toThrow();
    expect(() => validatePositionAgainstLoan(-1, [], 100_000)).toThrow();
  });
});

describe("ytdReturn", () => {
  // $100k committed, $12k distributed across a full year
  // asOf = Dec 31 (day 365 of a non-leap year)
  // annualized = ($12k / $100k) × (365/365) = 12%
  it("$12k on $100k across full year = 12% annualized", () => {
    const dists = [
      { amount: 6_000, distribution_date: "2025-06-15" },
      { amount: 6_000, distribution_date: "2025-12-15" },
    ];
    const result = ytdReturn(dists, 100_000, "2025-12-31");
    expect(result.totalDistributed).toBe(12_000);
    expect(result.annualizedReturn).toBeCloseTo(0.12, 4);
  });

  it("zero committed capital returns zero rates", () => {
    const result = ytdReturn([], 0, "2025-12-31");
    expect(result.annualizedReturn).toBe(0);
  });

  it("filters distributions before the start of the year", () => {
    const dists = [
      { amount: 5_000, distribution_date: "2024-12-31" }, // prior year
      { amount: 2_000, distribution_date: "2025-03-15" },
    ];
    const result = ytdReturn(dists, 100_000, "2025-12-31");
    expect(result.totalDistributed).toBe(2_000);
  });
});
