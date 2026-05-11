export interface WaterfallInput {
  amount: number;
  lateFeesDue: number;
  defaultInterestDue: number;
  interestDue: number;
  escrowDue: number;
  principalBalance: number;
}

export interface WaterfallResult {
  applied_to_late_fees: number;
  applied_to_default_interest: number;
  applied_to_interest: number;
  applied_to_escrow: number;
  applied_to_principal: number;
  remaining: number;
}

/**
 * Apply a payment to a loan in the standard hard money waterfall order:
 *   1. Late fees
 *   2. Default interest
 *   3. Regular interest
 *   4. Escrow
 *   5. Principal
 *
 * Anything left over after principal is `remaining` (e.g. overpayment).
 */
export function applyWaterfall(input: WaterfallInput): WaterfallResult {
  if (input.amount < 0) {
    throw new Error("Payment amount cannot be negative");
  }

  let remaining = input.amount;

  const take = (due: number) => {
    const applied = Math.min(remaining, Math.max(0, due));
    remaining -= applied;
    return applied;
  };

  const applied_to_late_fees = take(input.lateFeesDue);
  const applied_to_default_interest = take(input.defaultInterestDue);
  const applied_to_interest = take(input.interestDue);
  const applied_to_escrow = take(input.escrowDue);
  const applied_to_principal = take(input.principalBalance);

  return {
    applied_to_late_fees,
    applied_to_default_interest,
    applied_to_interest,
    applied_to_escrow,
    applied_to_principal,
    remaining,
  };
}
