import { describe, it, expect } from "vitest";
import {
  groupByMonth,
  agingBucket,
  weightedAverageRate,
} from "./reports";

describe("groupByMonth", () => {
  it("groups records by YYYY-MM and sums values", () => {
    const records = [
      { date: "2025-01-15", value: 100 },
      { date: "2025-01-20", value: 200 },
      { date: "2025-02-10", value: 300 },
      { date: "2025-03-01", value: 400 },
    ];
    const result = groupByMonth(records, (r) => r.date, (r) => r.value);
    expect(result).toEqual([
      { month: "2025-01", total: 300, count: 2 },
      { month: "2025-02", total: 300, count: 1 },
      { month: "2025-03", total: 400, count: 1 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(groupByMonth([], (r: { date: string }) => r.date, () => 1)).toEqual([]);
  });

  it("skips records with null date", () => {
    const records = [
      { date: null, value: 100 },
      { date: "2025-01-15", value: 200 },
    ];
    const result = groupByMonth(records, (r) => r.date, (r) => r.value);
    expect(result).toEqual([{ month: "2025-01", total: 200, count: 1 }]);
  });
});

describe("agingBucket", () => {
  // asOf = 2025-06-01
  it("loan maturing today is current", () => {
    expect(agingBucket("2025-06-01", "2025-06-01")).toBe("current");
  });

  it("loan maturing in future is current", () => {
    expect(agingBucket("2025-07-01", "2025-06-01")).toBe("current");
  });

  it("1-30 days overdue", () => {
    expect(agingBucket("2025-05-15", "2025-06-01")).toBe("30");
    expect(agingBucket("2025-05-02", "2025-06-01")).toBe("30");
  });

  it("31-60 days overdue", () => {
    expect(agingBucket("2025-04-15", "2025-06-01")).toBe("60");
  });

  it("61-90 days overdue", () => {
    expect(agingBucket("2025-03-15", "2025-06-01")).toBe("90");
  });

  it("90+ days overdue", () => {
    expect(agingBucket("2024-12-01", "2025-06-01")).toBe("90+");
  });

  it("null maturity returns null bucket", () => {
    expect(agingBucket(null, "2025-06-01")).toBe(null);
  });
});

describe("weightedAverageRate", () => {
  it("returns weighted average across loans", () => {
    // ($100k @ 10%) + ($200k @ 14%) = ($10k + $28k) / $300k = 12.667%
    const result = weightedAverageRate([
      { current_principal: 100_000, interest_rate: 0.1 },
      { current_principal: 200_000, interest_rate: 0.14 },
    ]);
    expect(result).toBeCloseTo(0.12667, 4);
  });

  it("zero principal returns zero", () => {
    expect(
      weightedAverageRate([{ current_principal: 0, interest_rate: 0.12 }])
    ).toBe(0);
  });

  it("empty array returns zero", () => {
    expect(weightedAverageRate([])).toBe(0);
  });
});
