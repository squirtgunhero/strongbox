import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function DashboardHero({
  title,
  subtitle,
  chips,
  scopeToggle,
}: DashboardHeroProps) {
  return (
    <div className="rounded-3xl border bg-card px-7 py-7 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[920px]">
          <h1 className="text-[40px] font-semibold tracking-[-0.035em] leading-[0.98] text-foreground">
            {title}
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground">{subtitle}</p>
          {chips && chips.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <StatusChip key={chip.label} tone={chip.tone ?? "neutral"}>
                  {chip.label}
                </StatusChip>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          {scopeToggle}
          <Button
            nativeButton={false}
            variant="outline"
            size="default"
            className="h-10 rounded-xl px-3.5"
            render={<Link href="/api/reports/loans.csv" target="_blank" />}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            nativeButton={false}
            size="default"
            className="h-10 rounded-xl px-3.5 font-semibold"
            render={<Link href="/admin/loans/new" />}
          >
            <Plus className="h-4 w-4" />
            New loan
          </Button>
        </div>
      </div>
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
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
        tone === "ok" &&
          "border-[color:var(--status-success)]/30 bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]",
        tone === "warn" &&
          "border-[color:var(--status-warning)]/30 bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
        tone === "danger" && "border-primary/30 bg-primary/10 text-primary",
        tone === "neutral" && "border-border bg-muted/60 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
