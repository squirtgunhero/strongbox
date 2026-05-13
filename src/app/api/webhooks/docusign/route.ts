import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getSupabaseUrl } from "@/lib/supabase/env";

/**
 * DocuSign Connect webhook handler. Configure in the DocuSign admin:
 *   1. Go to Settings → Connect → Add Configuration
 *   2. URL = https://<your-app>/api/webhooks/docusign
 *   3. Select events: Envelope Sent, Delivered, Signed/Complete, Declined,
 *      Voided
 *   4. Under Security, enable HMAC signing with the secret you put in
 *      DOCUSIGN_WEBHOOK_HMAC_KEY
 *
 * DocuSign posts JSON with `event` + `data.envelopeSummary.envelopeId`. We
 * look up the corresponding signature_requests row by provider_envelope_id
 * and translate to our internal status enum.
 *
 * HMAC verification: DocuSign computes HMAC-SHA256 over the raw body with
 * the configured key and sends it as `X-DocuSign-Signature-1`. We
 * timing-safe-compare.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signatureHeader = request.headers.get("x-docusign-signature-1");
  const hmacKey = process.env.DOCUSIGN_WEBHOOK_HMAC_KEY;

  if (hmacKey) {
    if (!signatureHeader) {
      return new Response("Missing signature header", { status: 400 });
    }
    const expected = crypto
      .createHmac("sha256", hmacKey)
      .update(body)
      .digest("base64");
    const expectedBuf = Buffer.from(expected, "base64");
    const sigBuf = Buffer.from(signatureHeader, "base64");
    if (
      expectedBuf.length !== sigBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, sigBuf)
    ) {
      return new Response("Invalid signature", { status: 401 });
    }
  } else {
    console.warn(
      "[docusign-webhook] DOCUSIGN_WEBHOOK_HMAC_KEY not set — accepting unsigned events. Set it before production."
    );
  }

  let payload: {
    event?: string;
    data?: { envelopeId?: string; envelopeSummary?: { status?: string } };
  };
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const envelopeId =
    payload.data?.envelopeId || payload.data?.envelopeSummary?.status
      ? payload.data?.envelopeId
      : undefined;
  if (!envelopeId) {
    return new Response("OK (no envelope id)", { status: 200 });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[docusign-webhook] missing service role key");
    return new Response("Server misconfiguration", { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const event = (payload.event || "").toLowerCase();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {};

  if (event.includes("sent") || event.includes("delivered")) {
    update.status = "sent";
    update.sent_at = now;
  } else if (event.includes("completed") || event.includes("signed")) {
    update.status = "signed";
    update.signed_at = now;
  } else if (event.includes("declined")) {
    update.status = "declined";
    update.declined_at = now;
  } else if (event.includes("voided")) {
    update.status = "declined";
    update.declined_at = now;
    update.declined_reason = "voided";
  } else {
    return new Response("OK (unhandled event)", { status: 200 });
  }

  const { data: rows, error } = await supabase
    .from("signature_requests")
    .update(update)
    .eq("provider_envelope_id", envelopeId)
    .select("id, loan_id")
    .single();
  if (error) {
    console.error("[docusign-webhook] update failed", error);
    return new Response("Update failed", { status: 500 });
  }

  if (rows) {
    await supabase.from("audit_log").insert({
      table_name: "signature_requests",
      record_id: rows.id,
      action: "status_change",
      new_values: { status: update.status, source: "docusign_webhook", event },
    });
  }

  return new Response("OK", { status: 200 });
}
