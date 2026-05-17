import { describe, it, expect } from "vitest";
import {
  dualApprovalDecisionAmount,
  approvalsRequired,
  assertApproverEligible,
  isDrawFullyApproved,
  assertDisburserEligible,
} from "./draw-approval";

const T = 10_000; // default dual-approval threshold

describe("dualApprovalDecisionAmount", () => {
  it("uses the approved amount when it is the larger one", () => {
    // Scope grew within holdback: requested 5k, approved 8k → decide on 8k
    expect(dualApprovalDecisionAmount(5_000, 8_000)).toBe(8_000);
  });

  it("uses the requested amount when approver lowers it (bypass attempt)", () => {
    // The exploit: request $50k, approve at $9,999 to dodge the threshold.
    // Decision amount must remain $50k.
    expect(dualApprovalDecisionAmount(50_000, 9_999)).toBe(50_000);
  });

  it("equal requested and approved → that amount", () => {
    expect(dualApprovalDecisionAmount(20_000, 20_000)).toBe(20_000);
  });

  it("rejects negative or non-finite inputs", () => {
    expect(() => dualApprovalDecisionAmount(-1, 100)).toThrow();
    expect(() => dualApprovalDecisionAmount(100, NaN)).toThrow();
  });
});

describe("approvalsRequired", () => {
  it("amount > threshold → 2 approvers", () => {
    expect(approvalsRequired(10_000.01, T)).toBe(2);
    expect(approvalsRequired(50_000, T)).toBe(2);
  });

  it("amount ≤ threshold → 1 approver", () => {
    expect(approvalsRequired(10_000, T)).toBe(1);
    expect(approvalsRequired(2_500, T)).toBe(1);
  });

  it("closes the bypass end-to-end: $50k requested, $9,999 approved still needs 2", () => {
    const decision = dualApprovalDecisionAmount(50_000, 9_999);
    expect(approvalsRequired(decision, T)).toBe(2);
  });

  it("honors a compliance-lowered threshold", () => {
    expect(approvalsRequired(7_500, 5_000)).toBe(2);
    expect(approvalsRequired(5_000, 5_000)).toBe(1);
  });
});

describe("assertApproverEligible", () => {
  it("requester cannot approve their own draw", () => {
    expect(() =>
      assertApproverEligible({
        approverId: "u1",
        requesterId: "u1",
        existingApproverIds: [],
      })
    ).toThrow(/cannot approve/i);
  });

  it("cannot approve the same draw twice", () => {
    expect(() =>
      assertApproverEligible({
        approverId: "u2",
        requesterId: "u1",
        existingApproverIds: ["u2"],
      })
    ).toThrow(/already approved/i);
  });

  it("a distinct, non-requester staff member may approve", () => {
    expect(() =>
      assertApproverEligible({
        approverId: "u2",
        requesterId: "u1",
        existingApproverIds: ["u3"],
      })
    ).not.toThrow();
  });
});

describe("isDrawFullyApproved", () => {
  it("above threshold needs 2 distinct approvers", () => {
    expect(
      isDrawFullyApproved({
        decisionAmount: 50_000,
        threshold: T,
        distinctApproverCount: 1,
      })
    ).toBe(false);
    expect(
      isDrawFullyApproved({
        decisionAmount: 50_000,
        threshold: T,
        distinctApproverCount: 2,
      })
    ).toBe(true);
  });

  it("at/below threshold a single approval is enough", () => {
    expect(
      isDrawFullyApproved({
        decisionAmount: 8_000,
        threshold: T,
        distinctApproverCount: 1,
      })
    ).toBe(true);
  });
});

describe("assertDisburserEligible", () => {
  const base = { requesterId: "req", decisionAmount: 50_000, threshold: T };

  it("above threshold: an approver cannot disburse", () => {
    expect(() =>
      assertDisburserEligible({
        ...base,
        disburserId: "a1",
        approverIds: ["a1", "a2"],
      })
    ).toThrow(/cannot also disburse/i);
  });

  it("above threshold: the requester cannot disburse", () => {
    expect(() =>
      assertDisburserEligible({
        ...base,
        disburserId: "req",
        approverIds: ["a1", "a2"],
      })
    ).toThrow(/requested this draw cannot disburse/i);
  });

  it("above threshold: a distinct third person may disburse", () => {
    expect(() =>
      assertDisburserEligible({
        ...base,
        disburserId: "a3",
        approverIds: ["a1", "a2"],
      })
    ).not.toThrow();
  });

  it("at/below threshold: no extra separation on disbursement", () => {
    expect(() =>
      assertDisburserEligible({
        disburserId: "a1",
        requesterId: "req",
        approverIds: ["a1"],
        decisionAmount: 8_000,
        threshold: T,
      })
    ).not.toThrow();
  });
});
