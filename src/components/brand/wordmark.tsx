import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Height in px. Width auto-scales to the wordmark aspect ratio. */
  height?: number;
  /** `aria-label` for the rendered image. */
  title?: string;
}

// Source PNG is tightly cropped to the wordmark bounding box.
const SRC_W = 1016;
const SRC_H = 256;
const ASPECT = SRC_W / SRC_H; // ≈ 3.97

export function Wordmark({
  className,
  height = 28,
  title = "StrongBox",
}: WordmarkProps) {
  const width = Math.round(height * ASPECT);
  return (
    <Image
      src="/brand/wordmark.png"
      alt={title}
      width={SRC_W}
      height={SRC_H}
      priority
      className={cn("block h-auto w-auto select-none", className)}
      style={{ height, width }}
    />
  );
}
