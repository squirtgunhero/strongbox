import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Height in px. Width auto-scales by viewBox. */
  height?: number;
  /** Hide the red shadow (e.g. when nesting in tight UI). */
  flat?: boolean;
  /** Override the displayed text — defaults to "StrongBox". */
  label?: string;
  /** `aria-label` for the rendered svg. */
  title?: string;
}

/**
 * StrongBox wordmark — black serif "StrongBox" with a red offset shadow.
 * Renders as inline SVG so it scales crisply and inherits currentColor for the
 * primary glyphs. The red accent is fixed to the brand red (#E30613).
 */
export function Wordmark({
  className,
  height = 28,
  flat = false,
  label = "StrongBox",
  title = "StrongBox",
}: WordmarkProps) {
  // viewBox sized for the default label. Width is generous to avoid clipping
  // the red shadow on the right edge.
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 520 96"
      height={height}
      width={(height * 520) / 96}
      className={cn("select-none", className)}
    >
      <title>{title}</title>
      {!flat && (
        <text
          x="6"
          y="72"
          fill="#E30613"
          fontFamily='"Times New Roman", "Times", "Cormorant Garamond", "Georgia", serif'
          fontWeight={700}
          fontSize="72"
          letterSpacing="-1.5"
        >
          {label}
        </text>
      )}
      <text
        x="0"
        y="68"
        fill="currentColor"
        fontFamily='"Times New Roman", "Times", "Cormorant Garamond", "Georgia", serif'
        fontWeight={700}
        fontSize="72"
        letterSpacing="-1.5"
      >
        {label}
      </text>
    </svg>
  );
}
