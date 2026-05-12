import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral";

const TONE_STYLES: Record<StatusTone, string> = {
  success:
    "bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]",
  warning:
    "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
  info: "bg-[color:var(--status-info-bg)] text-[color:var(--status-info)]",
  danger:
    "bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger)]",
  neutral: "bg-muted text-muted-foreground",
};

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-[color:var(--status-success)]",
  warning: "bg-[color:var(--status-warning)]",
  info: "bg-[color:var(--status-info)]",
  danger: "bg-[color:var(--status-danger)]",
  neutral: "bg-muted-foreground",
};

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-medium tracking-tight",
        TONE_STYLES[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} />}
      {children}
    </span>
  );
}

// Map loan status string → tone for consistent usage
export function loanStatusTone(status: string): StatusTone {
  switch (status) {
    case "funded":
    case "active":
    case "paid_off":
      return "success";
    case "approved":
    case "underwriting":
      return "info";
    case "lead":
    case "application":
      return "neutral";
    case "defaulted":
    case "foreclosure":
      return "danger";
    default:
      return "neutral";
  }
}
