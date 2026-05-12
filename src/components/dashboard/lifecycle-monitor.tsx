import { DashboardCard } from "@/components/dashboard-card";
import { StatusBadge, loanStatusTone } from "@/components/status-badge";
import { type LoanStatus, LOAN_STATUS_LABELS } from "@/lib/types";

export function LifecycleMonitor({
  counts,
}: {
  counts: Record<LoanStatus, number>;
}) {
  return (
    <DashboardCard
      title="Lifecycle monitor"
      subtitle="Loan counts across origination to resolution"
      noContentPadding
    >
      <div className="grid gap-2 p-4 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((status) => {
          const count = counts[status] || 0;
          return (
            <div key={status} className="rounded-2xl border bg-background px-4 py-4">
              <div
                className={`tabular text-[34px] font-semibold tracking-[-0.03em] leading-none ${
                  count > 0 ? "text-foreground" : "text-muted-foreground/60"
                }`}
              >
                {count}
              </div>
              <div className="mt-3">
                <StatusBadge tone={loanStatusTone(status)} dot>
                  {LOAN_STATUS_LABELS[status]}
                </StatusBadge>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
