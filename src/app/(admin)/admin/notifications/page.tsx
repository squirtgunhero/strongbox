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
import { FlushButton } from "./flush-button";

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

  const all = notifications || [];
  const pending = all.filter((n) => n.status === "pending");
  const failed = all.filter((n) => n.status === "failed");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Outgoing notification queue. Email is delivered via Resend; SMS via
            Twilio is not yet wired.
          </p>
        </div>
        <FlushButton pendingCount={pending.length} />
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

      {failed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="destructive">Failed</Badge>
              <span>{failed.length} need attention</span>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent (last 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {!all.length ? (
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
                {all.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          variant={STATUS_VARIANT[n.status] || "outline"}
                          className="w-fit"
                        >
                          {n.status}
                        </Badge>
                        {n.failure_reason && (
                          <span className="text-xs text-destructive max-w-[200px] truncate">
                            {n.failure_reason}
                          </span>
                        )}
                      </div>
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
