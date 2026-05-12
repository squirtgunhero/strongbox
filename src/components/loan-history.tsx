import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoryEntry {
  created_at: string;
  action: string;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
}

/**
 * Simplified loan history for borrower/investor portals. Reads via the
 * loan_history Postgres function which enforces RLS-equivalent access checks.
 */
export function LoanHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Loan History</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 text-sm">
          {entries.map((entry, idx) => {
            const summary = summarize(entry);
            return (
              <li key={idx} className="flex gap-3">
                <div className="flex flex-col items-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-foreground" />
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="flex-1 pb-1">
                  <div className="font-medium">{summary}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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

function summarize(entry: HistoryEntry): string {
  if (entry.action === "insert") return "Loan opened";
  if (entry.action === "disbursement") {
    const amount = (entry.new_values as { amount?: number } | null)?.amount;
    return amount
      ? `Disbursement of $${amount.toLocaleString()}`
      : "Disbursement";
  }
  if (entry.action === "status_change") {
    const s = (entry.new_values as { status?: string } | null)?.status;
    if (s) {
      const labels: Record<string, string> = {
        application: "Application started",
        underwriting: "Moved to underwriting",
        approved: "Loan approved",
        funded: "Loan funded",
        active: "Active servicing",
        paid_off: "Paid off",
        defaulted: "Default declared",
        foreclosure: "Foreclosure initiated",
      };
      return labels[s] || `Status changed to ${s.replace(/_/g, " ")}`;
    }
  }
  return entry.action;
}
