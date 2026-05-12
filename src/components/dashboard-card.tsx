import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Removes inner content padding (so content can manage its own spacing,
   * e.g. tables and lists with row-level dividers). */
  noContentPadding?: boolean;
}

/**
 * Modern dashboard panel: white card, soft shadow, rounded-2xl, header with
 * title + subtitle + optional right-aligned action.
 */
export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className,
  noContentPadding,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-3xl border bg-card",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      <div className="flex min-h-[84px] items-start justify-between gap-4 border-b px-7 py-5">
        <div>
          <div className="text-[21px] font-semibold tracking-[-0.02em]">
            {title}
          </div>
          {subtitle && (
            <div className="mt-1.5 text-[14px] text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      <div className={cn(noContentPadding ? "" : "p-7")}>{children}</div>
    </div>
  );
}
