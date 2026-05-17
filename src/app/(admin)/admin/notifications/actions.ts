"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendPendingNotifications } from "@/lib/notifications";

export async function flushPending() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "loan_officer"].includes(profile.role)) {
    throw new Error("Not authorized");
  }

  const result = await sendPendingNotifications();
  revalidatePath("/admin/notifications");
  return result;
}
