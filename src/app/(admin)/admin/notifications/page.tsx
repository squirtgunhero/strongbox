import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  sent: "default",
  failed: "destructive",
  skipped: "secondary",
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const pending = (notifications || []).filter((n) => n.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Queue of notifications that would be sent via email/SMS. Real provider
          integration (Resend / Twilio) is pending — these are currently logged
          but not delivered.
        </p>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline">Pending</Badge>
              <span>{pending.length} awaiting delivery</span>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent (last 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {!notifications?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notifications yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[n.status] || "outline"}>
                        {n.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{n.channel}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {n.event_type || "--"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {n.recipient_email || n.recipient_phone || "--"}
                    </TableCell>
                    <TableCell className="text-sm max-w-md truncate">
                      {n.subject}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
