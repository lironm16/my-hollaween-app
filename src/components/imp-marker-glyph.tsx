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
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  } as const;
}

/** Imp for ⋮ menu — size-7, same slot as skip outline. */
export function ImpMenuOutlineGlyph({ className }: { className?: string }) {
  return (
    <ImpMarkerGlyph
      variant="solid"
      className={cn("size-7 shrink-0 text-current", className)}
      aria-hidden
    />
  );
}

/** Imp silhouette (mask PNG) — tint via `color` / `currentColor`. */
export function ImpMarkerGlyph({
  className,
  style,
  variant = "solid",
}: {
  className?: string;
  style?: CSSProperties;
  /** `eyes` = slits only (small controls); `solid` = full imp. */
  variant?: "solid" | "eyes";
}) {
  const url = variant === "eyes" ? IMP_MARKER_EYES_MASK_URL : IMP_MARKER_MASK_URL;
  return (
    <span
      className={cn("imp-marker-glyph aspect-square shrink-0 bg-current", className)}
      style={{ ...maskStyleFor(url), ...style }}
      aria-hidden
    />
  );
}
