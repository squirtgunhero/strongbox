import type {
  AchDebitInput,
  AchDebitResult,
  PaymentsAdapter,
} from "./types";

/**
 * Stripe ACH adapter using the PaymentIntents API with `us_bank_account`
 * payment method. The borrower first verifies their bank via Stripe Financial
 * Connections (Plaid under the hood, or Stripe-hosted micro-deposits) which
 * produces a `pm_…` token. We attach it to a Customer keyed by borrower id,
 * then create a PaymentIntent in `confirm + automatic` mode.
 *
 * Required env:
 *   - STRIPE_SECRET_KEY (sk_test_… or sk_live_…)
 *   - STRIPE_WEBHOOK_SECRET (whsec_… from Dashboard → Developers → Webhooks)
 *
 * Without these, `isConfigured` is false and the adapter resolves to the
 * stub — payment_intents still record manually, but no Stripe call happens.
 *
 * NOTE: ACH debits clear over 3–5 business days. We rely on the
 * `payment_intent.succeeded` and `.payment_failed` webhooks (see
 * api/webhooks/stripe) to flip `payment_intents.status` to cleared/rejected.
 */
export class StripeAdapter implements PaymentsAdapter {
  readonly providerName = "stripe" as const;
  readonly isConfigured: boolean;

  constructor(
    private readonly env = {
      secretKey: process.env.STRIPE_SECRET_KEY,
    }
  ) {
    this.isConfigured = Boolean(env.secretKey);
  }

  async createAchDebit(input: AchDebitInput): Promise<AchDebitResult> {
    if (!this.isConfigured) {
      throw new Error("Stripe not configured");
    }
    const body = new URLSearchParams({
      amount: String(Math.round(input.amount * 100)),
      currency: "usd",
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      "payment_method_types[]": "us_bank_account",
      confirm: "true",
      description: input.description,
      "metadata[strongbox_intent_id]": input.intentRowId,
    });

    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stripe PaymentIntent create failed: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { id: string; status: string };
    return { providerIntentId: data.id, providerStatus: data.status };
  }
}
