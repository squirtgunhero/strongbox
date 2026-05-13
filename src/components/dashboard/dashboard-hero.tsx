import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  title: string;
  subtitle: string;
  chips?: {
    label: string;
    tone?: "neutral" | "ok" | "warn" | "danger";
  }[];
  scopeToggle?: React.ReactNode;
}

/**
 * Compact greeting strip. NOT a hero in the marketing sense — just enough
 * orientation for the operator: who they are, what's happening, and the
 * scope/view they're looking at. No oversized typography, no duplicate
 * primary buttons (the global header already has "New loan").
 */
export function DashboardHero({
  title,
  subtitle,
  chips,
  scopeToggle,
}: DashboardHeroProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-[-0.022em] leading-[1.15] text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-[720px]">
          {subtitle}
        </p>
        {chips && chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <StatusChip key={chip.label} tone={chip.tone ?? "neutral"}>
                {chip.label}
              </StatusChip>
            ))}
          </div>
        )}
      </div>

      {scopeToggle && <div className="flex items-center gap-2">{scopeToggle}</div>}
    </div>
  );
}

function StatusChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "ok" | "warn" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium tracking-tight",
        tone === "ok" &&
          "border-[color:var(--status-success)]/25 bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]",
        tone === "warn" &&
          "border-[color:var(--status-warning)]/25 bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
        tone === "danger" && "border-primary/25 bg-primary/10 text-primary",
        tone === "neutral" && "border-border bg-muted/50 text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "ok" && "bg-[color:var(--status-success)]",
          tone === "warn" && "bg-[color:var(--status-warning)]",
          tone === "danger" && "bg-primary",
          tone === "neutral" && "bg-muted-foreground/60"
        )}
      />
      {children}
    </span>
  );
}
