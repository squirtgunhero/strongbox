import { describe, it, expect } from "vitest";
import {
  remainingHoldback,
  validateDrawAmount,
  requiresDualApproval,
  DEFAULT_DUAL_APPROVAL_THRESHOLD,
} from "./holdback";

describe("remainingHoldback", () => {
  it("$100k budget, no draws funded → $100k remaining", () => {
    expect(remainingHoldback(100_000, [])).toBe(100_000);
  });

  it("$100k budget, one funded $30k draw → $70k remaining", () => {
    expect(
      remainingHoldback(100_000, [
        { status: "funded", approved_amount: 30_000 },
      ])
    ).toBe(70_000);
  });

  it("ignores requested/approved/inspected/rejected — only funded counts", () => {
    expect(
      remainingHoldback(100_000, [
        { status: "funded", approved_amount: 25_000 },
        { status: "approved", approved_amount: 10_000 }, // not funded yet
        { status: "requested", approved_amount: null },
        { status: "rejected", approved_amount: 50_000 },
        { status: "inspected", approved_amount: 20_000 },
      ])
    ).toBe(75_000);
  });

  it("handles null approved_amount", () => {
    expect(
      remainingHoldback(50_000, [
        { status: "funded", approved_amount: null },
      ])
    ).toBe(50_000);
  });

  it("zero budget → zero remaining", () => {
    expect(remainingHoldback(0, [])).toBe(0);
  });

  it("cannot go negative even with funded over-budget (shouldn't happen but defensive)", () => {
    expect(
      remainingHoldback(50_000, [
        { status: "funded", approved_amount: 60_000 },
      ])
    ).toBe(-10_000); // surfaces the bug, not hides it
  });
});

describe("validateDrawAmount", () => {
  it("accepts amount within remaining holdback", () => {
    expect(() => validateDrawAmount(20_000, 50_000)).not.toThrow();
  });

  it("accepts amount exactly equal to remaining", () => {
    expect(() => validateDrawAmount(50_000, 50_000)).not.toThrow();
  });

  it("rejects amount over remaining holdback", () => {
    expect(() => validateDrawAmount(50_001, 50_000)).toThrow();
  });

  it("rejects negative", () => {
    expect(() => validateDrawAmount(-1, 50_000)).toThrow();
  });

  it("rejects zero", () => {
    expect(() => validateDrawAmount(0, 50_000)).toThrow();
  });
});

describe("requiresDualApproval", () => {
  const T = DEFAULT_DUAL_APPROVAL_THRESHOLD;

  it(`amounts > threshold require dual approval`, () => {
    expect(requiresDualApproval(T + 0.01, T)).toBe(true);
    expect(requiresDualApproval(50_000, T)).toBe(true);
  });

  it(`amounts ≤ threshold do not`, () => {
    expect(requiresDualApproval(T, T)).toBe(false);
    expect(requiresDualApproval(5_000, T)).toBe(false);
  });

  it("honors a custom threshold from org_settings", () => {
    // A compliance-driven lowering of the threshold to $5k must take effect.
    expect(requiresDualApproval(7_500, 5_000)).toBe(true);
    expect(requiresDualApproval(5_000, 5_000)).toBe(false);
    // And raising it should also be respected.
    expect(requiresDualApproval(20_000, 25_000)).toBe(false);
  });
});
