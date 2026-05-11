import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Queue a notification. Stub for real provider integration (Resend / Twilio).
 * Today this just inserts a row with status='pending'. A future cron/edge
 * function would pull pending rows and actually send.
 */
export async function queueNotification(
  supabase: SupabaseClient,
  args: QueueArgs
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    channel: args.channel || "email",
    status: "pending",
    recipient_email: args.recipientEmail || null,
    recipient_phone: args.recipientPhone || null,
    recipient_user_id: args.recipientUserId || null,
    subject: args.subject,
    body: args.body,
    event_type: args.eventType,
    related_loan_id: args.relatedLoanId || null,
  });
  if (error) {
    // Don't break the parent action over a notification failure.
    console.error("queueNotification failed", error);
  }
}
