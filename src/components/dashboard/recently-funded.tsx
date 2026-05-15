import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatRate, formatDate } from "@/lib/format";

interface FundedRow {
  id: string;
  address: string;
  borrower: string;
  balance: number;
  rate: number;
  fundedDate: string | null;
  performance?: "current" | "late-30" | "late-60" | "default";
}

/**
 * Recently funded — a tight Mercury-style table of the active book. Status
 * pill on the right encodes performance.
 */
export function RecentlyFunded({ rows }: { rows: FundedRow[] }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-card ring-1 ring-border/60 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.01em]">
            Active book
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {rows.length === 0
              ? "No active loans yet"
              : `${rows.length} loans · most recent first`}
          </div>
        </div>
        <Link
          href="/admin/servicing"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Servicing <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-[13px] font-medium">No active loans</div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Once a loan is funded it'll appear here.
          </p>
        </div>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                <th className="border-b px-4 py-2 font-medium">Loan</th>
                <th className="border-b px-3 py-2 font-medium">Borrower</th>
                <th className="border-b px-3 py-2 text-right font-medium">
                  Balance
                </th>
                <th className="border-b px-3 py-2 text-right font-medium">Rate</th>
                <th className="border-b px-4 py-2 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5 text-[12.5px] font-medium">
                    <Link
                      href={`/admin/loans/${row.id}`}
                      className="hover:underline"
                    >
                      {row.address}
                    </Link>
                    <div className="mono text-[10.5px] text-muted-foreground">
                      {row.id.slice(0, 12)} · funded {formatDate(row.fundedDate)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-muted-foreground">
                    {row.borrower}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[12.5px] font-medium">
                    {formatCurrency(row.balance)}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[12.5px] text-muted-foreground">
                    {formatRate(row.rate)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[11.5px]">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        (!row.performance || row.performance === "current") &&
                          "text-[color:var(--status-success)]",
                        row.performance === "late-30" &&
                          "text-[color:var(--status-warning)]",
                        (row.performance === "late-60" ||
                          row.performance === "default") &&
                          "text-primary"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          (!row.performance || row.performance === "current") &&
                            "bg-[color:var(--status-success)]",
                          row.performance === "late-30" &&
                            "bg-[color:var(--status-warning)]",
                          (row.performance === "late-60" ||
                            row.performance === "default") &&
                            "bg-primary"
                        )}
                      />
                      {row.performance === "late-30"
                        ? "Late 30"
                        : row.performance === "late-60"
                          ? "Late 60"
                          : row.performance === "default"
                            ? "Default"
                            : "Current"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
