import Link from "next/link";
import { CircleCheckBig, TriangleAlert } from "lucide-react";
import { DashboardCard } from "@/components/dashboard-card";
import { formatCurrency } from "@/lib/format";

interface MaturityWatchCardProps {
  active: boolean;
  inside30Count: number;
  inside30Exposure: number;
  inside90Count: number;
  inside90Exposure: number;
}

export function MaturityWatchCard({
  active,
  inside30Count,
  inside30Exposure,
  inside90Count,
  inside90Exposure,
}: MaturityWatchCardProps) {
  return (
    <DashboardCard
      title="Maturity watch"
      subtitle="Maturity exposure across the next 90 days"
      action={
        <span
          className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
            active
              ? "bg-primary/10 text-primary"
              : "bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]"
          }`}
        >
          {active ? "Risk watch active" : "Not active yet"}
        </span>
      }
      noContentPadding
    >
      <div className="p-7">
        {active ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <MetricBlock
                label="Inside 30 days"
                value={`${inside30Count} loans`}
                detail={formatCurrency(inside30Exposure)}
              />
              <MetricBlock
                label="Inside 90 days"
                value={`${inside90Count} loans`}
                detail={formatCurrency(inside90Exposure)}
              />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, inside30Count * 10)}%` }} />
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border bg-muted/25 px-4 py-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="text-[14px] font-semibold">
                  {inside30Count} maturities require attention
                </div>
                <p className="text-[13.5px] text-muted-foreground">
                  Start extension or payoff outreach this week.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2.5 rounded-2xl border bg-muted/25 px-4 py-4">
            <CircleCheckBig className="mt-0.5 h-4 w-4 text-[color:var(--status-success)]" />
            <div>
              <div className="text-[14px] font-semibold">No maturity risk to monitor</div>
              <p className="text-[13.5px] text-muted-foreground">
                Maturity watch starts once active loans are added.
              </p>
              <Link
                href="/admin/loans/new"
                className="mt-2 inline-flex text-[13px] font-medium text-foreground underline underline-offset-4"
              >
                Add first loan
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

function MetricBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-background px-4 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="tabular mt-1 text-[24px] font-semibold tracking-[-0.02em]">{value}</div>
      <div className="text-[13.5px] text-muted-foreground">{detail} exposure</div>
    </div>
  );
}
