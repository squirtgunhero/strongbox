// Fallback dual-approval threshold used only if `org_settings.dual_approval_threshold`
// cannot be loaded. The configured value in org_settings is the source of truth
// and is enforced server-side in src/lib/draws.ts before promoting a draw to approved.
export const DEFAULT_DUAL_APPROVAL_THRESHOLD = 10_000;

interface DrawForHoldback {
  status: string;
  approved_amount: number | null;
}

export function remainingHoldback(
  rehabBudget: number,
  draws: DrawForHoldback[]
): number {
  const disbursed = draws
    .filter((d) => d.status === "funded")
    .reduce((sum, d) => sum + (Number(d.approved_amount) || 0), 0);
  return rehabBudget - disbursed;
}

export function validateDrawAmount(amount: number, remaining: number): void {
  if (amount <= 0) {
    throw new Error("Draw amount must be greater than zero");
  }
  if (amount > remaining) {
    throw new Error(
      `Draw amount ($${amount.toLocaleString()}) exceeds remaining rehab holdback ($${remaining.toLocaleString()})`
    );
  }
}

/**
 * Pure check: does the draw amount exceed the dual-approval threshold?
 * Use `requiresDualApprovalFromOrg` instead in server actions so the
 * configured threshold takes effect.
 */
export function requiresDualApproval(amount: number, threshold: number): boolean {
  return amount > threshold;
}
