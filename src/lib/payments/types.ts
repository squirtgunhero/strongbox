// Provider-agnostic ACH/payments interface.
//
// The borrower portal calls createAchDebit() with a PaymentMethod token
// (Stripe collects the bank info via their hosted UI / Plaid integration,
// returning us a `pm_…` id). The provider then debits the borrower's
// account and posts a webhook to update payment_intents.status.

export interface AchDebitInput {
  /** payment_intents.id — used as the provider client reference. */
  intentRowId: string;
  /** Amount in dollars; we convert to cents at the boundary. */
  amount: number;
  /** Stripe payment method id from the Stripe Elements / Plaid flow. */
  paymentMethodId: string;
  /** ID of the connected Stripe Customer (we attach pm_… to a customer). */
  customerId: string;
  /** Human-readable description on the borrower's bank statement. */
  description: string;
}

export interface AchDebitResult {
  providerIntentId: string;
  /** Provider-native status (e.g. "processing", "requires_action"). */
  providerStatus: string;
}

export interface PaymentsAdapter {
  readonly providerName: "stripe" | "stub";
  readonly isConfigured: boolean;
  createAchDebit(input: AchDebitInput): Promise<AchDebitResult>;
}
