import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  FileClock,
  MessagesSquare,
  ShieldAlert,
} from "lucide-react";

export interface ActivitySummaryRow {
  id: "docs" | "approvals" | "payments" | "updates" | "servicing";
  label: string;
  count: number;
  detail: string;
  href: string;
}

const ROW_ICON: Record<ActivitySummaryRow["id"], typeof FileClock> = {
  docs: FileClock,
  approvals: CheckCircle2,
  payments: CircleDollarSign,
  updates: MessagesSquare,
  servicing: ShieldAlert,
};

interface ActivityFeedProps {
  mode: "empty" | "demo" | "live";
  rows: ActivitySummaryRow[];
}

export function ActivityFeed({ mode, rows }: ActivityFeedProps) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[78px] items-center justify-between border-b px-6 py-4.5">
        <div>
          <div className="text-[19px] font-semibold tracking-[-0.02em]">Borrower activity</div>
          <div className="mt-1 text-[13.5px] text-muted-foreground">Recent updates and servicing events</div>
        </div>
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          Audit log
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-7 py-8">
          <div className="rounded-2xl border border-dashed bg-muted/30 px-4 py-4">
            <div className="text-[15px] font-medium">No borrower activity yet</div>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              Borrower events will appear once loans and servicing activity are active.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <ul className="divide-y">
            {rows.map((row) => {
              const Icon = ROW_ICON[row.id] || BellRing;
              return (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/30"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold">{row.label}</div>
                    <div className="text-[13.5px] text-muted-foreground">{row.detail}</div>
                  </div>
                  <span className="tabular rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
                    {row.count}
                  </span>
                </Link>
              </li>
            )})}
          </ul>
          {mode === "empty" && (
            <div className="border-t px-7 py-3 text-[12px] text-muted-foreground">
              Onboarding mode shows setup-oriented activity placeholders.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
