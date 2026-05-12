import Link from "next/link";
import { ArrowRight, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineBoardProps {
  stages: {
    id: string;
    label: string;
    description: string;
    count: number;
    amount: number;
    attention?: boolean;
  }[];
  totalRequested: number;
}

export function PipelineBoard({ stages, totalRequested }: PipelineBoardProps) {
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[84px] items-center justify-between gap-3 border-b px-7 py-5">
        <div>
          <div className="text-[21px] font-semibold tracking-[-0.02em]">Deal flow</div>
          <div className="mt-1 text-[13px] text-muted-foreground">
            {totalDeals === 0
              ? "0 deals in flight"
              : `${totalDeals} deals in flight · $${(totalRequested / 1_000_000).toFixed(2)}M requested`}
          </div>
        </div>
        <Link
          href="/admin/pipeline"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open pipeline
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto px-5 py-5 sm:px-6 lg:px-7">
        <div className="grid min-w-[980px] grid-cols-5 gap-3">
          {stages.map((stage) => {
            return (
              <Link
                key={stage.id}
                href={`/admin/loans?status=${stage.id}`}
                className={cn(
                  "group block min-w-0 rounded-2xl border bg-background px-4 py-4.5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
                  stage.attention && "border-primary/35 bg-primary/[0.03]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Stage
                  </div>
                  {stage.attention && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                      <CircleDot className="h-3.5 w-3.5" />
                      action
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[17px] font-semibold tracking-[-0.015em]">
                  {stage.label}
                </div>
                <div className="mt-4 tabular text-[46px] font-semibold leading-none tracking-[-0.035em]">
                  {stage.count}
                </div>
                <div className="mt-2 tabular text-[16px] font-semibold text-foreground/85">
                  {stage.amount ? `$${(stage.amount / 1_000_000).toFixed(1)}M` : "$0.0M"}
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {stage.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
