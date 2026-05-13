import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface PipelineBoardProps {
  mode: "empty" | "demo" | "live";
  stages: {
    id: string;
    label: string;
    count: number;
    amount: number;
    attention?: boolean;
  }[];
  rows: {
    id: string;
    deal: string;
    borrower: string;
    property: string;
    stage: string;
    amount: number;
    ltv: string;
    updated: string;
  }[];
  totalRequested: number;
}

/**
 * Deal flow panel — a row of stage tiles on top and the recent in-flight deals
 * below. Stage counts use a single visual weight so they don't compete with
 * the KPI row above.
 */
export function PipelineBoard({
  mode,
  stages,
  rows,
  totalRequested,
}: PipelineBoardProps) {
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.01em]">Deal flow</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {totalDeals === 0
              ? "No deals in flight"
              : `${totalDeals} in flight · ${formatCurrency(totalRequested)} requested`}
          </div>
        </div>
        <Link
          href="/admin/pipeline"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open pipeline
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden border-b bg-border/60 md:grid-cols-6">
        {stages.slice(0, 6).map((stage) => (
          <Link
            key={stage.id}
            href={`/admin/loans?status=${stage.id}`}
            className={cn(
              "group flex flex-col gap-1 bg-card px-4 py-3.5 transition-colors hover:bg-muted/30",
              stage.attention && "bg-primary/[0.03]"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {stage.label}
              </div>
              {stage.attention && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <div
                className={cn(
                  "tabular text-[22px] font-semibold leading-none tracking-[-0.02em]",
                  stage.count === 0 ? "text-muted-foreground/55" : "text-foreground"
                )}
              >
                {stage.count}
              </div>
              <div className="tabular text-[11.5px] text-muted-foreground">
                {stage.amount
                  ? `$${(stage.amount / 1_000_000).toFixed(1)}M`
                  : "—"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Deal</th>
              <th className="px-3 py-2.5 font-medium">Borrower</th>
              <th className="px-3 py-2.5 font-medium">Property</th>
              <th className="px-3 py-2.5 font-medium">Stage</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-right font-medium">LTV</th>
              <th className="px-5 py-2.5 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center">
                  <div className="mx-auto max-w-[420px]">
                    <div className="text-[13.5px] font-medium">
                      {mode === "empty"
                        ? "No deals in your pipeline"
                        : "No in-flight deals"}
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      {mode === "empty"
                        ? "New loans land here as soon as they're created."
                        : "Pipeline is clear. New opportunities will show up here."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-3 text-[13px] font-medium">{row.deal}</td>
                  <td className="px-3 py-3 text-[13px] text-muted-foreground">
                    {row.borrower}
                  </td>
                  <td className="px-3 py-3 text-[13px] text-muted-foreground">
                    {row.property}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-foreground/80">
                      {row.stage}
                    </span>
                  </td>
                  <td className="tabular px-3 py-3 text-right text-[13px] font-medium">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-muted-foreground">
                    {row.ltv}
                  </td>
                  <td className="px-5 py-3 text-right text-[12px] text-muted-foreground">
                    {row.updated}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
