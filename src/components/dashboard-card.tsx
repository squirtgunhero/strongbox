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
        "flex min-w-0 flex-col rounded-xl border bg-card",
        className
      )}
    >
      <div className="flex min-h-[58px] items-start justify-between gap-4 border-b px-4 py-3.5">
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">
            {title}
          </div>
          {subtitle && (
            <div className="mt-1 text-[12px] text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      <div className={cn(noContentPadding ? "" : "p-4")}>{children}</div>
    </div>
  );
}
