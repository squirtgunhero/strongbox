import { formatCurrency } from "@/lib/format";

interface CapitalSnapshotProps {
  totalDeployed: number;
  avgLtv: number;
  avgRate: number;
  activeLoans: number;
  upcomingMaturities: number;
}

/**
 * Compact finance-specific metrics panel. Two columns of label/value
 * rows on top, a sparkline-style allocation bar at the bottom.
 */
export function CapitalSnapshot({
  totalDeployed,
  avgLtv,
  avgRate,
  activeLoans,
  upcomingMaturities,
}: CapitalSnapshotProps) {
  const isEmpty = activeLoans === 0;
  return (
    <div className="rounded-2xl border bg-card shadow-[0_1px_0_rgba(15,17,21,0.04),0_2px_8px_-4px_rgba(15,17,21,0.06)] overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <div>
          <div className="text-[13.5px] font-semibold tracking-tight">
            Capital snapshot
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">
            Loan book overview
          </div>
        </div>
        {!isEmpty && (
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-[color:var(--status-success-bg)] text-[color:var(--status-success)] text-[10.5px] font-medium border border-[color:var(--status-success)]/20">
            <span className="h-1 w-1 rounded-full bg-[color:var(--status-success)]" />
            healthy
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <Row label="Total deployed" value={formatCurrency(totalDeployed)} dim={isEmpty} />
        <Row label="Active loans" value={String(activeLoans)} dim={isEmpty} />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t">
        <Row
          label="Weighted avg rate"
          value={`${(avgRate * 100).toFixed(2)}%`}
          dim={isEmpty}
        />
        <Row
          label="Average LTV"
          value={`${(avgLtv * 100).toFixed(1)}%`}
          dim={isEmpty}
        />
      </div>
      <div className="grid grid-cols-1 border-t">
        <Row
          label="Maturing in 90 days"
          value={String(upcomingMaturities)}
          dim={isEmpty}
        />
      </div>

      {/* Allocation rail (placeholder when empty, structured when populated) */}
      <div className="px-5 pt-4 pb-5 border-t bg-muted/30">
        <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2">
          <span>Allocation</span>
          <span className="text-muted-foreground/70">by status</span>
        </div>
        {isEmpty ? (
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1/3 rounded-full bg-foreground/15" />
            <div className="absolute left-[33%] top-0 bottom-0 w-1/4 rounded-full bg-foreground/10" />
          </div>
        ) : (
          <div className="relative h-2 rounded-full overflow-hidden flex">
            <div className="bg-[color:var(--status-success)] h-full" style={{ flex: 1 }} />
            <div className="bg-[color:var(--status-info)] h-full" style={{ flex: 0.4 }} />
            <div className="bg-[color:var(--status-warning)] h-full" style={{ flex: 0.2 }} />
            <div className="bg-muted h-full" style={{ flex: 0.6 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  dim,
}: {
  label: string;
  value: string;
  dim?: boolean;
}) {
  return (
    <div className="px-5 py-3">
      <div className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-1">
        {label}
      </div>
      <div
        className={`tabular text-[20px] font-semibold tracking-[-0.02em] leading-none ${dim ? "text-muted-foreground/70" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
