import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "neutral";

interface DashboardStripProps {
  eyebrow: string;
  stats: { label: string; value: string | number; tone?: Tone }[];
  scopeToggle?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Compact context strip. NOT a hero. Single line of operational context
 * (date, who, what's happening), with the scope toggle and primary actions
 * on the right. Replaces the 50px headline approach.
 */
export function DashboardStrip({
  eyebrow,
  stats,
  scopeToggle,
  actions,
}: DashboardStripProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground tracking-[0.01em]">
          {eyebrow}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[15px] font-medium tracking-[-0.01em] text-foreground">
          {stats.map((s, i) => (
            <span key={s.label} className="inline-flex items-baseline gap-1.5">
              {i > 0 && <span className="text-muted-foreground">·</span>}
              <span
                className={cn(
                  "tabular font-semibold",
                  s.tone === "danger" && "text-primary",
                  s.tone === "warn" &&
                    "text-[color:var(--status-warning)]"
                )}
              >
                {s.value}
              </span>
              <span className="font-normal text-foreground/85">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {scopeToggle}
        {actions}
      </div>
    </div>
  );
}
