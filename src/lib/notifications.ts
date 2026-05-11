import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import twilio from "twilio";

interface QueueArgs {
  channel?: "email" | "sms" | "in_app";
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientUserId?: string | null;
  subject: string;
  body: string;
  eventType: string;
  relatedLoanId?: string | null;
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE || "";

async function sendSms(
  to: string,
  body: string
): Promise<{ error?: string }> {
  if (!twilioClient || !TWILIO_FROM_PHONE) return { error: "Twilio not configured" };
  try {
    await twilioClient.messages.create({
      from: TWILIO_FROM_PHONE,
      to,
      body,
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Queue a notification and attempt immediate delivery.
 *
 * Email is delivered via Resend if RESEND_API_KEY is set; otherwise the row
 * stays `pending` for later retry. Failures are recorded but never thrown —
 * we don't want a flaky provider to break the parent action.
 */
export async function queueNotification(
  supabase: SupabaseClient,
  args: QueueArgs
): Promise<void> {
  const channel = args.channel || "email";

  const { data: row, error: insertError } = await supabase
    .from("notifications")
    .insert({
      channel,
      status: "pending",
      recipient_email: args.recipientEmail || null,
      recipient_phone: args.recipientPhone || null,
      recipient_user_id: args.recipientUserId || null,
      subject: args.subject,
      body: args.body,
      event_type: args.eventType,
      related_loan_id: args.relatedLoanId || null,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("queueNotification insert failed", insertError);
    return;
  }

  // in_app is read directly from the table — no external delivery
  if (channel === "in_app") return;

  let sendError: string | null = null;

  try {
    if (channel === "email") {
      if (!args.recipientEmail) return;
      if (!resend) return; // no provider configured — leave pending
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: args.recipientEmail,
        subject: args.subject,
        text: args.body,
      });
      sendError = error ? error.message || String(error) : null;
    } else if (channel === "sms") {
      if (!args.recipientPhone) return;
      const result = await sendSms(args.recipientPhone, args.body);
      sendError = result.error || null;
    }

    if (sendError) {
      await supabase
        .from("notifications")
        .update({ status: "failed", failure_reason: sendError })
        .eq("id", row.id);
    } else {
      await supabase
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  } catch (e) {
    await supabase
      .from("notifications")
      .update({
        status: "failed",
        failure_reason: e instanceof Error ? e.message : String(e),
      })
      .eq("id", row.id);
  }
}

/**
 * Retry pending notifications. Called by cron or an admin "Resend pending"
 * button to push anything left over (e.g. queued while API key was missing).
 */
export async function sendPendingNotifications(
  supabase: SupabaseClient,
  limit = 50
): Promise<{ sent: number; failed: number }> {
  const { data: pending } = await supabase
    .from("notifications")
    .select("id, channel, recipient_email, recipient_phone, subject, body")
    .eq("status", "pending")
    .in("channel", ["email", "sms"])
    .order("created_at", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;

  for (const n of pending || []) {
    // Skip if provider not configured for this channel
    if (n.channel === "email" && !resend) continue;
    if (n.channel === "sms" && !twilioClient) continue;

    const missingRecipient =
      (n.channel === "email" && !n.recipient_email) ||
      (n.channel === "sms" && !n.recipient_phone);
    if (missingRecipient) {
      await supabase
        .from("notifications")
        .update({
          status: "skipped",
          failure_reason: `no recipient ${n.channel === "email" ? "email" : "phone"}`,
        })
        .eq("id", n.id);
      continue;
    }

    let errorMsg: string | null = null;
    try {
      if (n.channel === "email") {
        const { error } = await resend!.emails.send({
          from: FROM_EMAIL,
          to: n.recipient_email!,
          subject: n.subject,
          text: n.body,
        });
        errorMsg = error ? error.message || String(error) : null;
      } else {
        const result = await sendSms(n.recipient_phone!, n.body);
        errorMsg = result.error || null;
      }

      if (errorMsg) {
        await supabase
          .from("notifications")
          .update({ status: "failed", failure_reason: errorMsg })
          .eq("id", n.id);
        failed++;
      } else {
        await supabase
          .from("notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", n.id);
        sent++;
      }
    } catch (e) {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          failure_reason: e instanceof Error ? e.message : String(e),
        })
        .eq("id", n.id);
      failed++;
    }
  }

  return { sent, failed };
}
