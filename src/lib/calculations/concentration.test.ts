import { describe, it, expect } from "vitest";
import { analyzeConcentration } from "./concentration";

describe("analyzeConcentration", () => {
  const T = { maxBorrower: 0.2, maxState: 0.4 };

  it("empty book → zero totals, no breaches", () => {
    const r = analyzeConcentration([], T);
    expect(r.totalDeployed).toBe(0);
    expect(r.byBorrower).toEqual([]);
    expect(r.byState).toEqual([]);
    expect(r.breaches).toEqual([]);
  });

  it("aggregates by borrower and state and computes shares", () => {
    const r = analyzeConcentration(
      [
        { current_principal: 100_000, borrower_id: "b1", borrower_label: "Acme", state: "NJ" },
        { current_principal: 100_000, borrower_id: "b1", borrower_label: "Acme", state: "NY" },
        { current_principal: 300_000, borrower_id: "b2", borrower_label: "Bravo", state: "NJ" },
      ],
      T
    );
    expect(r.totalDeployed).toBe(500_000);
    expect(r.byBorrower[0]).toMatchObject({ key: "b2", exposure: 300_000, share: 0.6 });
    expect(r.byBorrower[1]).toMatchObject({ key: "b1", exposure: 200_000, share: 0.4 });
    expect(r.byState[0]).toMatchObject({ key: "NJ", exposure: 400_000, share: 0.8 });
  });

  it("flags borrower above max_borrower threshold", () => {
    const r = analyzeConcentration(
      [
        { current_principal: 800_000, borrower_id: "b1", borrower_label: "Whale", state: "NJ" },
        { current_principal: 200_000, borrower_id: "b2", borrower_label: "Minnow", state: "NY" },
      ],
      { maxBorrower: 0.5, maxState: 0.9 }
    );
    // Whale = 80% → breaches 50% threshold
    expect(r.breaches).toHaveLength(1);
    expect(r.breaches[0]).toMatchObject({ kind: "borrower", key: "b1", share: 0.8 });
  });

  it("flags state above max_state threshold", () => {
    const r = analyzeConcentration(
      [
        { current_principal: 600_000, borrower_id: "b1", borrower_label: "A", state: "NJ" },
        { current_principal: 100_000, borrower_id: "b2", borrower_label: "B", state: "NJ" },
        { current_principal: 300_000, borrower_id: "b3", borrower_label: "C", state: "PA" },
      ],
      { maxBorrower: 0.99, maxState: 0.5 }
    );
    expect(r.breaches.find((b) => b.kind === "state")?.key).toBe("NJ");
  });

  it("does not flag at exactly the threshold (strict greater-than)", () => {
    const r = analyzeConcentration(
      [
        { current_principal: 200_000, borrower_id: "b1", borrower_label: "X", state: "NJ" },
        { current_principal: 800_000, borrower_id: "b2", borrower_label: "Y", state: "NY" },
      ],
      { maxBorrower: 0.2, maxState: 0.9 }
    );
    // b1 sits exactly at 20% — should NOT breach (lender treats threshold as inclusive)
    expect(r.breaches.find((b) => b.key === "b1")).toBeUndefined();
  });
});
