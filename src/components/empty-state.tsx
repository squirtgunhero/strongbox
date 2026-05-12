import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?:
    | { label: string; href: string; variant?: "default" | "outline" | "ghost" }
    | { label: string; onClick: () => void; variant?: "default" | "outline" | "ghost" };
  size?: "default" | "compact";
}

/**
 * Intentional empty state for cards and panels. Renders an iconography
 * affordance, a clear title, optional copy, and an optional CTA so the
 * surface doesn't read as broken when there's no data yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        size === "compact" ? "py-6 px-4 gap-2" : "py-10 px-6 gap-3"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-xl bg-muted text-muted-foreground grid place-items-center",
            size === "compact" ? "h-9 w-9" : "h-11 w-11"
          )}
        >
          <Icon className={size === "compact" ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      )}
      <div className="space-y-1 max-w-[320px]">
        <div className="text-[13.5px] font-medium text-foreground">{title}</div>
        {description && (
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="pt-1">
          {"href" in action ? (
            <Button
              nativeButton={false}
              variant={action.variant || "ghost"}
              size="sm"
              render={<Link href={action.href} />}
            >
              {action.label}
            </Button>
          ) : (
            <Button
              variant={action.variant || "ghost"}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
