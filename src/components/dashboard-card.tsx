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
        "rounded-2xl border bg-card flex flex-col min-w-0",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b">
        <div>
          <div className="text-[13.5px] font-semibold tracking-tight">
            {title}
          </div>
          {subtitle && (
            <div className="text-[12px] text-muted-foreground mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      <div className={cn(noContentPadding ? "" : "p-5")}>{children}</div>
    </div>
  );
}
