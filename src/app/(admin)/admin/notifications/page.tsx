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

  // Counts for the last 30 days for delivery metrics.
  const thirtyDaysAgo = new Date(
    // eslint-disable-next-line react-hooks/purity -- server component; window is relative to request-time
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [{ data: notifications }, { data: recentSent }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications")
      .select("status, delivered_at, opened_at, bounced_at, channel")
      .gte("created_at", thirtyDaysAgo)
      .eq("channel", "email"),
  ]);

  const all = notifications || [];
  const pending = all.filter((n) => n.status === "pending");
  const failed = all.filter((n) => n.status === "failed");

  // Delivery metrics (last 30 days, email only)
  const emails = recentSent || [];
  const sent30 = emails.filter((n) => n.status === "sent").length;
  const delivered30 = emails.filter((n) => n.delivered_at).length;
  const opened30 = emails.filter((n) => n.opened_at).length;
  const bounced30 = emails.filter((n) => n.bounced_at).length;
  const total30 = emails.length;
  const deliveryRate = total30 > 0 ? delivered30 / total30 : 0;
  const openRate = delivered30 > 0 ? opened30 / delivered30 : 0;
  const bounceRate = total30 > 0 ? bounced30 / total30 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Outgoing notification queue and delivery metrics.
          </p>
        </div>
        <FlushButton pendingCount={pending.length} />
      </div>

      {total30 > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Email Delivery (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <Stat label="Sent" value={String(sent30)} />
              <Stat
                label="Delivered"
                value={`${(deliveryRate * 100).toFixed(1)}%`}
                sub={`${delivered30} of ${total30}`}
              />
              <Stat
                label="Opened"
                value={`${(openRate * 100).toFixed(1)}%`}
                sub={`${opened30} of ${delivered30 || 0}`}
              />
              <Stat
                label="Bounced"
                value={`${(bounceRate * 100).toFixed(1)}%`}
                sub={`${bounced30}`}
                highlight={bounceRate > 0.05}
              />
              <Stat label="Pending" value={String(pending.length)} />
            </div>
          </CardContent>
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
                        {n.opened_at && (
                          <span className="text-xs text-muted-foreground">
                            opened
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

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-lg font-semibold ${highlight ? "text-destructive" : ""}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
