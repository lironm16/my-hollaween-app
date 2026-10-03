import type { CSSProperties } from "react";
import {
  IMP_MARKER_EYES_MASK_URL,
  IMP_MARKER_MASK_URL,
} from "@/lib/gem-diamond-visual";
import { cn } from "@/lib/utils";

function maskStyleFor(url: string) {
  return {
    maskImage: `url(${url})`,
    WebkitMaskImage: `url(${url})`,
  } as const;
}

/** Imp silhouette (mask PNG) — tint via `color` / `currentColor`. */
export function ImpMarkerGlyph({
  className,
  style,
  variant = "solid",
}: {
  className?: string;
  style?: CSSProperties;
  /** `eyes` = slits only (inactive toolbar); `solid` = full imp. */
  variant?: "solid" | "eyes";
}) {
  const url = variant === "eyes" ? IMP_MARKER_EYES_MASK_URL : IMP_MARKER_MASK_URL;
  return (
    <span
      className={cn("imp-marker-glyph bg-current", className)}
      style={{ ...maskStyleFor(url), ...style }}
      aria-hidden
    />
  );
}
