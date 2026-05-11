import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

  // SMS not wired yet; in-app is read directly from the table
  if (channel !== "email") return;
  if (!args.recipientEmail) return;
  if (!resend) {
    // No API key — leave pending for later batch send
    return;
  }

  try {
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: args.recipientEmail,
      subject: args.subject,
      text: args.body,
    });

    if (sendError) {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          failure_reason: sendError.message || String(sendError),
        })
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
  if (!resend) return { sent: 0, failed: 0 };

  const { data: pending } = await supabase
    .from("notifications")
    .select("id, channel, recipient_email, subject, body")
    .eq("status", "pending")
    .eq("channel", "email")
    .order("created_at", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;

  for (const n of pending || []) {
    if (!n.recipient_email) {
      await supabase
        .from("notifications")
        .update({ status: "skipped", failure_reason: "no recipient email" })
        .eq("id", n.id);
      continue;
    }
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: n.recipient_email,
        subject: n.subject,
        text: n.body,
      });
      if (error) {
        await supabase
          .from("notifications")
          .update({
            status: "failed",
            failure_reason: error.message || String(error),
          })
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
