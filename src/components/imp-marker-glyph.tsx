import type { CSSProperties } from "react";
import { IMP_MARKER_MASK_URL } from "@/lib/gem-diamond-visual";
import { cn } from "@/lib/utils";

const maskStyle = {
  maskImage: `url(${IMP_MARKER_MASK_URL})`,
  WebkitMaskImage: `url(${IMP_MARKER_MASK_URL})`,
} as const;

/** Imp silhouette (mask PNG) — tint via `color` / `currentColor`. */
export function ImpMarkerGlyph({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("imp-marker-glyph bg-current", className)}
      style={{ ...maskStyle, ...style }}
      aria-hidden
    />
  );
}
