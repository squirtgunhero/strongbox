"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// These helpers call SECURITY DEFINER RPCs (migration 026) rather than running
// raw UPDATE statements against the notifications table. Direct UPDATE is
// revoked from the authenticated role to prevent recipients from rewriting
// their own notification body / status / provider_message_id.

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("mark_notification_read", {
    notification_id: notificationId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
  revalidatePath("/investor/notifications");
  revalidatePath("/investor");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw new Error(error.message);

  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
  revalidatePath("/investor/notifications");
  revalidatePath("/investor");
}
