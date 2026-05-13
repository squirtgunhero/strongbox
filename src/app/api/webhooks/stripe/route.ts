import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Stripe webhook handler. Configure at Dashboard → Developers → Webhooks
 * with URL https://<your-app>/api/webhooks/stripe and these events:
 *   - payment_intent.succeeded     → mark intent cleared
 *   - payment_intent.payment_failed→ mark intent rejected with failure_code
 *   - payment_intent.processing    → no-op (intent stays submitted/verified)
 *
 * The Stripe-Signature header is `t=…,v1=…`. We verify by recomputing
 * HMAC-SHA256 over `${timestamp}.${rawBody}` with the webhook secret and
 * timing-safe compare.
 *
 * Required env:
 *   - STRIPE_WEBHOOK_SECRET (whsec_…)
 *   - SUPABASE_SERVICE_ROLE_KEY (to bypass RLS on payment_intents update)
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing");
    return new Response("Webhook secret not configured", { status: 500 });
  }
  if (!signature) {
    return new Response("Missing signature header", { status: 400 });
  }

  // Parse t=… and v1=… fields from the signature header.
  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) {
    return new Response("Malformed signature", { status: 400 });
  }

  // Reject events older than 5 minutes (replay protection).
  const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(skew) || skew > 300) {
    return new Response("Stale signature", { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf = Buffer.from(v1, "hex");
  if (
    expectedBuf.length !== sigBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, sigBuf)
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    type: string;
    data: {
      object: {
        id: string;
        status?: string;
        last_payment_error?: { code?: string; message?: string };
        metadata?: { strongbox_intent_id?: string };
      };
    };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new Response("Service role not configured", { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const intent = event.data.object;
  const strongboxIntentId = intent.metadata?.strongbox_intent_id;
  if (!strongboxIntentId) {
    // Event not originated by StrongBox — acknowledge silently.
    return new Response("OK", { status: 200 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    provider: "stripe",
    provider_intent_id: intent.id,
    provider_status: intent.status,
  };
  if (event.type === "payment_intent.succeeded") {
    update.status = "cleared";
    update.confirmed_at = now;
  } else if (event.type === "payment_intent.payment_failed") {
    update.status = "rejected";
    update.provider_failure_code = intent.last_payment_error?.code || "failed";
    update.rejected_reason =
      intent.last_payment_error?.message || "Stripe payment failed";
  } else if (event.type === "payment_intent.processing") {
    update.status = "verified";
  } else {
    return new Response("OK (unhandled)", { status: 200 });
  }

  const { data, error } = await supabase
    .from("payment_intents")
    .update(update)
    .eq("id", strongboxIntentId)
    .select("id, loan_id")
    .single();
  if (error) {
    console.error("[stripe-webhook] update failed", error);
    return new Response("Update failed", { status: 500 });
  }

  if (data) {
    await supabase.from("audit_log").insert({
      table_name: "payment_intents",
      record_id: data.id,
      action: "status_change",
      new_values: {
        loan_id: data.loan_id,
        event: event.type,
        provider_intent_id: intent.id,
      },
    });
  }
  return new Response("OK", { status: 200 });
}
