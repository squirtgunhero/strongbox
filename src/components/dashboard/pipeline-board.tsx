import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface Stage {
  id: string;
  label: string;
  count: number;
  amount: number;
  attention?: boolean;
}

interface Row {
  id: string;
  deal: string;
  borrower: string;
  property: string;
  stage: string;
  amount: number;
  ltv: string;
  updated: string;
}

interface PipelineBoardProps {
  mode: "empty" | "demo" | "live";
  stages: Stage[];
  rows: Row[];
  totalRequested: number;
}

/**
 * Deal flow — stage strip on top (6 hairline-divided cells), recent in-flight
 * table below. Mercury-style: thin borders, small dense type, mono numerals.
 */
export function PipelineBoard({
  mode,
  stages,
  rows,
  totalRequested,
}: PipelineBoardProps) {
  const total = stages.reduce((s, x) => s + x.count, 0);

  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-card ring-1 ring-border/60 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.01em]">Deal flow</div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {total === 0
              ? "No deals in flight"
              : `${total} in flight · ${formatCurrency(totalRequested)} requested`}
          </div>
        </div>
        <Link
          href="/admin/pipeline"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open pipeline <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Stage strip — hairline columns */}
      <div className="grid grid-cols-3 border-b md:grid-cols-6">
        {stages.slice(0, 6).map((stage, i) => (
          <Link
            key={stage.id}
            href={`/admin/loans?status=${stage.id}`}
            className={cn(
              "relative flex min-w-0 flex-col gap-1 px-3.5 py-3 transition-colors hover:bg-muted/40",
              i > 0 && "border-l",
              i === 3 && "md:border-l",
              "md:border-b-0",
              i < 3 && "border-b md:border-b-0"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {stage.label}
              </div>
              {stage.attention && (
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--status-warning)]" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <div
                className={cn(
                  "tabular text-[20px] font-semibold leading-none tracking-[-0.02em]",
                  stage.count === 0 ? "text-muted-foreground/50" : "text-foreground"
                )}
              >
                {stage.count}
              </div>
              <div className="tabular text-[11px] text-muted-foreground">
                {stage.amount
                  ? `$${(stage.amount / 1_000_000).toFixed(1)}M`
                  : "—"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* In-flight table */}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="border-b px-4 py-2 font-medium">Deal</th>
              <th className="border-b px-3 py-2 font-medium">Borrower</th>
              <th className="border-b px-3 py-2 font-medium">Stage</th>
              <th className="border-b px-3 py-2 text-right font-medium">Amount</th>
              <th className="border-b px-3 py-2 text-right font-medium">LTV</th>
              <th className="border-b px-4 py-2 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <div className="mx-auto max-w-[380px]">
                    <div className="text-[13px] font-medium">
                      {mode === "empty" ? "No deals in your pipeline" : "No in-flight deals"}
                    </div>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">
                      New loans land here as soon as they're created.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5 text-[12.5px] font-medium">
                    {row.deal}
                    <div className="text-[11px] text-muted-foreground">
                      {row.property}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-muted-foreground">
                    {row.borrower}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                      {row.stage}
                    </span>
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[12.5px] font-medium">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[12.5px] text-muted-foreground">
                    {row.ltv}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">
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
