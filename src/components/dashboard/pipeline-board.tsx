import Link from "next/link";
import { ArrowRight, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";

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

export function PipelineBoard({
  mode,
  stages,
  rows,
  totalRequested,
}: PipelineBoardProps) {
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);
  const stageCols = stages.slice(0, 6);

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[78px] items-center justify-between gap-3 border-b px-6 py-4.5">
        <div>
          <div className="text-[19px] font-semibold tracking-[-0.02em]">Deal flow</div>
          <div className="mt-1 text-[13.5px] text-muted-foreground">
            {totalDeals === 0
              ? "0 deals in flight"
              : `${totalDeals} deals in flight · $${(totalRequested / 1_000_000).toFixed(2)}M requested`}
          </div>
        </div>
        <Link
          href="/admin/pipeline"
          className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open pipeline
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto px-5 py-4.5 sm:px-6">
        <div className="grid min-w-[980px] grid-cols-6 gap-3">
          {stageCols.map((stage) => {
            return (
              <Link
                key={stage.id}
                href={`/admin/loans?status=${stage.id}`}
                className={cn(
                  "group block min-w-0 rounded-2xl border bg-background px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
                  stage.attention && "border-primary/35 bg-primary/[0.03]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Stage
                  </div>
                  {stage.attention && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
                      <CircleDot className="h-3.5 w-3.5" />
                      action
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[14px] font-semibold tracking-[-0.01em]">
                  {stage.label}
                </div>
                <div className="mt-3.5 tabular text-[38px] font-semibold leading-none tracking-[-0.03em]">
                  {stage.count}
                </div>
                <div className="mt-1.5 tabular text-[13.5px] font-semibold text-foreground/85">
                  {stage.amount ? `$${(stage.amount / 1_000_000).toFixed(1)}M` : "$0.0M"}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t px-5 pb-5 sm:px-6 lg:px-7">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Deal</th>
                <th className="px-3 py-2 font-semibold">Borrower</th>
                <th className="px-3 py-2 font-semibold">Property</th>
                <th className="px-3 py-2 font-semibold">Stage</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-3 py-2 text-right font-semibold">LTV</th>
                <th className="px-3 py-2 text-right font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center">
                    {mode === "empty" ? (
                      <div className="mx-auto max-w-[520px]">
                        <div className="text-[18px] font-semibold tracking-[-0.02em]">
                          No deals in your pipeline
                        </div>
                        <p className="mt-1 text-[13.5px] text-muted-foreground">
                          Add a new loan or import opportunities to start tracking your
                          lending book.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Button
                            nativeButton={false}
                            size="sm"
                            render={<Link href="/admin/loans/new" />}
                          >
                            New loan
                          </Button>
                          <Button
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            render={<Link href="/admin/loans?import=1" />}
                          >
                            Import loan tape
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-[520px]">
                        <div className="text-[18px] font-semibold tracking-[-0.02em]">
                          No in-flight deals
                        </div>
                        <p className="mt-1 text-[13.5px] text-muted-foreground">
                          Active loan book is stable. Pipeline is currently clear.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 text-[13.5px] font-medium">{row.deal}</td>
                    <td className="px-3 py-3 text-[13.5px] text-muted-foreground">
                      {row.borrower}
                    </td>
                    <td className="px-3 py-3 text-[13.5px] text-muted-foreground">
                      {row.property}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]">
                        {row.stage}
                      </span>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-[13.5px] font-medium">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-[13.5px]">{row.ltv}</td>
                    <td className="px-3 py-3 text-right text-[12px] text-muted-foreground">
                      {row.updated}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
