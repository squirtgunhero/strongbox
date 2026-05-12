import { cn } from "@/lib/utils";

interface PipelineStageCardProps {
  label: string;
  count: number;
  amount?: string;
  /** Subtle red tint when this stage has items needing attention. */
  attention?: boolean;
}

export function PipelineStageCard({
  label,
  count,
  amount,
  attention,
}: PipelineStageCardProps) {
  const empty = count === 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 flex flex-col gap-1.5 bg-card transition-colors",
        attention && !empty && "border-primary/30 bg-primary/[0.03]",
        empty && "bg-muted/50"
      )}
    >
      <div className="text-[10.5px] uppercase tracking-[0.07em] font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "tabular text-[22px] font-semibold tracking-[-0.025em] leading-none",
          empty ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {count}
      </div>
      <div className="text-[11px] text-muted-foreground mono">
        {amount || "—"}
      </div>
    </div>
  );
}
