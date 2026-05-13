import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface LadderRow {
  id: string;
  address: string;
  maturity: string;
  balance: number;
  daysOut: number;
}

interface MaturityLadderProps {
  rows: LadderRow[];
  totalExposure: number;
}

/**
 * Maturity ladder. Each row: meta on the left, a progress bar showing
 * proximity to maturity in the middle (high=red, med=amber, low=neutral),
 * balance + days on the right.
 */
export function MaturityLadder({
  rows,
  totalExposure,
}: MaturityLadderProps) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.01em]">
            Maturity ladder
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {rows.length === 0
              ? "No maturities inside 90 days"
              : `Next 90 days · ${formatCurrency(totalExposure)} exposure`}
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-[13px] font-medium">No maturity risk</div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Maturity watch starts once active loans are added.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => {
            const tone =
              row.daysOut <= 30 ? "high" : row.daysOut <= 60 ? "med" : "low";
            const pct = Math.max(6, Math.min(100, 100 - (row.daysOut / 90) * 100));
            return (
              <li
                key={row.id}
                className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
              >
                <Link
                  href={`/admin/loans/${row.id}`}
                  className="min-w-0"
                >
                  <div className="truncate text-[12.5px] font-medium text-foreground">
                    {row.address}
                  </div>
                  <div className="mono text-[11px] text-muted-foreground">
                    {row.id.slice(0, 12)} · {row.maturity}
                  </div>
                </Link>
                <div className="relative h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      tone === "high" && "bg-primary",
                      tone === "med" && "bg-[color:var(--status-warning)]",
                      tone === "low" && "bg-[color:var(--status-success)]/70"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-right text-[12px]">
                  <div className="tabular font-medium">{formatCurrency(row.balance)}</div>
                  <div className="mono text-[10.5px] text-muted-foreground">
                    {row.daysOut}d
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
