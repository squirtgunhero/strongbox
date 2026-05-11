import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InvestorNotifications() {
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {!notifications?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{n.subject}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {n.event_type || "notice"}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{n.body}</p>
                {n.related_loan_id && (
                  <Link
                    href={`/investor/loans/${n.related_loan_id}`}
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    View loan →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
