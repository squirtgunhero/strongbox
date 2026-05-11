import { createClient } from "@/lib/supabase/server";
import { NotificationsInbox } from "@/components/notifications-inbox";

export default async function InvestorNotifications() {
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <NotificationsInbox
      notifications={notifications || []}
      loanBasePath="/investor/loans"
    />
  );
}
