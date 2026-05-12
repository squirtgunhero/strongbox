import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

/**
 * Resend webhook events.
 *
 * Resend sends events with a Svix-Id, Svix-Timestamp, and Svix-Signature
 * header. Signature is base64-encoded HMAC-SHA256 of `{id}.{timestamp}.{body}`
 * using the secret from your Resend webhook config (prefixed with `whsec_`).
 *
 * Set the secret in RESEND_WEBHOOK_SECRET and point Resend at
 * https://yourapp.com/api/webhooks/resend.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing signature headers", { status: 400 });
  }

  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // Svix sends multiple signatures separated by spaces, each prefixed with `v1,`
  const validSignatures = svixSignature
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);
  const matches = validSignatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(sig)
      );
    } catch {
      return false;
    }
  });
  if (!matches) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { type: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messageId = event.data?.email_id;
  if (!messageId) {
    return new Response("Acknowledged (no message id)", { status: 200 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};

  switch (event.type) {
    case "email.delivered":
      update.delivered_at = now;
      break;
    case "email.opened":
      update.opened_at = now;
      break;
    case "email.bounced":
      update.bounced_at = now;
      update.status = "failed";
      update.failure_reason = "bounced";
      break;
    case "email.complained":
      update.status = "failed";
      update.failure_reason = "complained";
      break;
    case "email.sent":
      // already marked sent on outbound; no-op
      return new Response("OK", { status: 200 });
    default:
      // Unknown event — acknowledge silently so Resend doesn't retry forever
      return new Response("OK", { status: 200 });
  }

  await supabase
    .from("notifications")
    .update(update)
    .eq("provider_message_id", messageId);

  return new Response("OK", { status: 200 });
}
