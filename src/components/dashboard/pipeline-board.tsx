import Link from "next/link";
import { ArrowRight, FileSearch, FileCheck2, Sparkles, BadgeCheck, Wallet } from "lucide-react";
import type { ComponentType } from "react";

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

const STAGE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  lead: Sparkles,
  application: FileSearch,
  underwriting: FileCheck2,
  approved: BadgeCheck,
  funded: Wallet,
};

/** Always-on 5-column pipeline board — renders the stage structure even
 * when every stage is empty. Each stage has its own icon, count, mini
 * progress rail, and either an empty slot or a teaser. */
export function PipelineBoard({ stages, totalRequested }: PipelineBoardProps) {
  const totalDeals = stages.reduce((s, st) => s + st.count, 0);
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="rounded-2xl border bg-card shadow-[0_1px_0_rgba(15,17,21,0.04),0_2px_8px_-4px_rgba(15,17,21,0.06)] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="text-[13.5px] font-semibold tracking-tight">
              Pipeline
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              {totalDeals === 0
                ? "0 deals in flight"
                : `${totalDeals} deals in flight · $${(totalRequested / 1_000_000).toFixed(2)}M requested`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <PipelineTab active>All</PipelineTab>
          <PipelineTab>Needs review</PipelineTab>
          <PipelineTab>Closing soon</PipelineTab>
          <Link
            href="/admin/pipeline"
            className="ml-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            Open pipeline
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 divide-x divide-border">
        {stages.map((stage) => {
          const Icon = STAGE_ICON[stage.id];
          const empty = stage.count === 0;
          const pct = empty ? 0 : Math.min(1, stage.count / maxCount);
          return (
            <Link
              key={stage.id}
              href={`/admin/loans?status=${stage.id}`}
              className="group block px-4 py-4 hover:bg-muted/40 transition-colors min-w-0"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground grid place-items-center group-hover:bg-foreground group-hover:text-background transition-colors">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                </div>
                {stage.attention && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-primary">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    action
                  </span>
                )}
              </div>
              <div className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                {stage.label}
              </div>
              <div
                className={`tabular text-[24px] font-semibold tracking-[-0.025em] leading-none mt-1 ${empty ? "text-muted-foreground/70" : "text-foreground"}`}
              >
                {stage.count}
              </div>
              <div className="text-[11px] text-muted-foreground mono mt-1">
                {stage.amount
                  ? `$${(stage.amount / 1_000_000).toFixed(2)}M`
                  : empty
                    ? "—"
                    : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-2 line-clamp-2">
                {stage.description}
              </p>

              {/* Mini progress rail */}
              <div className="relative h-[3px] rounded-full bg-muted mt-3 overflow-hidden">
                <div
                  className={`absolute left-0 top-0 bottom-0 rounded-full transition-all ${
                    stage.attention ? "bg-primary" : "bg-foreground/35"
                  }`}
                  style={{ width: `${Math.max(empty ? 0 : 12, pct * 100)}%` }}
                />
              </div>

              {/* Empty slot placeholder */}
              {empty && (
                <div className="mt-3 rounded-md border border-dashed border-border bg-background/50 px-2 py-2 text-center">
                  <div className="text-[10.5px] text-muted-foreground/70 mono">
                    no deals
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PipelineTab({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}
