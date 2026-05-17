import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Cap/visual height in px. Maps to font-size; width is intrinsic. */
  height?: number;
  /** Accessible label. */
  title?: string;
}

/**
 * Typographic wordmark. Renders live text in the brand serif
 * (var(--font-brand)) and inherits `currentColor`, so it recolors cleanly
 * on any background (no image, no filter hacks). Replaces the former PNG.
 */
export function Wordmark({
  className,
  height = 28,
  title = "StrongBox",
}: WordmarkProps) {
  return (
    <span
      aria-label={title}
      className={cn("inline-block select-none", className)}
      style={{
        fontFamily: "var(--font-brand)",
        fontWeight: 700,
        fontSize: `${height}px`,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
    >
      StrongBox
    </span>
  );
}
