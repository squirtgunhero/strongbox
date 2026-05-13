import { StripeAdapter } from "./stripe";
import { StubPaymentsAdapter } from "./stub";
import type { PaymentsAdapter } from "./types";

let cached: PaymentsAdapter | null = null;

export function getPaymentsAdapter(): PaymentsAdapter {
  if (cached) return cached;
  const stripe = new StripeAdapter();
  if (stripe.isConfigured) {
    console.info("[payments] using Stripe adapter");
    cached = stripe;
  } else {
    console.info("[payments] STRIPE_SECRET_KEY not set — using stub adapter");
    cached = new StubPaymentsAdapter();
  }
  return cached;
}

export type { PaymentsAdapter } from "./types";
