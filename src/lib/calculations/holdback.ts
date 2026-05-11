// Dual-approval threshold for disbursements per CLAUDE.md.
// Configurable per-tenant later; hardcoded $10,000 for now.
export const DUAL_APPROVAL_THRESHOLD = 10_000;

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

export function requiresDualApproval(amount: number): boolean {
  return amount > DUAL_APPROVAL_THRESHOLD;
}
