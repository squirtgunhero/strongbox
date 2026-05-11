import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  performer?: { full_name: string } | null;
}

export function StatusTimeline({ entries }: { entries: AuditEntry[] }) {
  // Only show status changes + key events
  const filtered = entries.filter((e) =>
    ["status_change", "insert", "disbursement"].includes(e.action)
  );

  if (filtered.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 text-sm">
          {filtered.map((entry) => {
            const summary = summarize(entry);
            return (
              <li key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-foreground" />
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium">{summary.label}</span>
                    {summary.detail && (
                      <Badge variant="outline" className="text-xs">
                        {summary.detail}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {entry.performer?.full_name || "System"} ·{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function summarize(entry: AuditEntry): { label: string; detail: string | null } {
  if (entry.action === "insert") {
    return { label: "Loan created", detail: null };
  }
  if (entry.action === "disbursement") {
    const amount = (entry.new_values as { amount?: number } | null)?.amount;
    return {
      label: "Disbursement",
      detail: amount
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        : null,
    };
  }
  if (entry.action === "status_change") {
    const newStatus = (entry.new_values as { status?: string } | null)?.status;
    const oldStatus = (entry.old_values as { status?: string } | null)?.status;
    if (newStatus) {
      return {
        label: `Status → ${newStatus.replace(/_/g, " ")}`,
        detail: oldStatus ? `from ${oldStatus.replace(/_/g, " ")}` : null,
      };
    }
  }
  return { label: entry.action, detail: null };
}
