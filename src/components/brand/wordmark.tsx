import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Height in px. Width auto-scales to the wordmark aspect ratio. */
  height?: number;
  /** `aria-label` for the rendered image. */
  title?: string;
}

// The source PNG is a 1254×1254 square with the wordmark centered inside,
// surrounded by whitespace. The actual mark occupies ~980×330 in the middle.
// We crop to the mark's bounding box at render time with object-fit so the
// rendered wordmark sits flush in tight UI without dead space around it.
const SRC_W = 1254;
const SRC_H = 1254;
const MARK_W = 980;
const MARK_H = 330;
const ASPECT = MARK_W / MARK_H; // ≈ 2.97

export function Wordmark({
  className,
  height = 24,
  title = "StrongBox",
}: WordmarkProps) {
  const width = Math.round(height * ASPECT);
  // Scale factor from rendered height to source pixel height.
  const scale = height / MARK_H;
  const renderedSrcW = SRC_W * scale;
  const renderedSrcH = SRC_H * scale;

  return (
    <span
      className={cn("relative inline-block overflow-hidden align-middle", className)}
      style={{ width, height }}
      role="img"
      aria-label={title}
    >
      <Image
        src="/brand/wordmark.png"
        alt={title}
        width={SRC_W}
        height={SRC_H}
        priority
        className="absolute max-w-none"
        style={{
          width: renderedSrcW,
          height: renderedSrcH,
          left: (width - renderedSrcW) / 2,
          top: (height - renderedSrcH) / 2,
        }}
      />
    </span>
  );
}
