import { requiresDualApproval } from "./holdback";

// Dual-control rules for draw money movement. These are pure decision
// functions — no DB, no auth — so the rules can be hand-verified in tests.
// They are enforced server-side (atomic SQL function + server actions);
// this module is the single source of truth for the policy.

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

/**
 * The amount the dual-approval threshold is evaluated against.
 *
 * It is the GREATER of the requested and approved amounts. Keying off the
 * approved amount alone is a bypass: an approver could request $50k, approve
 * it at "$9,999" to drop under the threshold, and single-handedly fund a
 * large draw. Using max() closes that hole.
 */
export function dualApprovalDecisionAmount(
  requestedAmount: number,
  approvedAmount: number
): number {
  assertFiniteNonNegative(requestedAmount, "requestedAmount");
  assertFiniteNonNegative(approvedAmount, "approvedAmount");
  return Math.max(requestedAmount, approvedAmount);
}

/** Number of distinct approvers required for a draw of this size. */
export function approvalsRequired(
  decisionAmount: number,
  threshold: number
): 1 | 2 {
  return requiresDualApproval(decisionAmount, threshold) ? 2 : 1;
}

/**
 * Whether `approverId` is allowed to add an approval to this draw.
 * Throws with a human-readable reason if not.
 *
 * - The requester cannot approve their own draw (separation of duties).
 * - Nobody can approve the same draw twice.
 */
export function assertApproverEligible(params: {
  approverId: string;
  requesterId: string;
  existingApproverIds: string[];
}): void {
  const { approverId, requesterId, existingApproverIds } = params;
  if (approverId === requesterId) {
    throw new Error(
      "The person who requested a draw cannot approve it. A different staff member must approve."
    );
  }
  if (existingApproverIds.includes(approverId)) {
    throw new Error("You have already approved this draw");
  }
}

/**
 * Whether the draw has enough distinct approvals to be promoted to `approved`.
 * `distinctApproverCount` must already exclude the requester (the requester
 * is never allowed to be an approver — see assertApproverEligible).
 */
export function isDrawFullyApproved(params: {
  decisionAmount: number;
  threshold: number;
  distinctApproverCount: number;
}): boolean {
  const { decisionAmount, threshold, distinctApproverCount } = params;
  return (
    distinctApproverCount >= approvalsRequired(decisionAmount, threshold)
  );
}

/**
 * Whether `disburserId` may release the cash for this draw.
 * Throws with a reason if not.
 *
 * For draws ABOVE the dual-approval threshold, the person moving the money
 * out must be distinct from every approver and from the requester — a third
 * pair of hands on the actual disbursement. At or below threshold there is
 * no extra separation requirement on the disbursement step.
 */
export function assertDisburserEligible(params: {
  disburserId: string;
  requesterId: string;
  approverIds: string[];
  decisionAmount: number;
  threshold: number;
}): void {
  const { disburserId, requesterId, approverIds, decisionAmount, threshold } =
    params;
  const aboveThreshold =
    approvalsRequired(decisionAmount, threshold) === 2;
  if (!aboveThreshold) return;

  if (approverIds.includes(disburserId)) {
    throw new Error(
      "An approver of this draw cannot also disburse it. A different staff member must release the funds."
    );
  }
  if (disburserId === requesterId) {
    throw new Error(
      "The person who requested this draw cannot disburse it."
    );
  }
}
