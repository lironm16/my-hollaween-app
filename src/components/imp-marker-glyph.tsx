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

const MENU_PANEL_BG = "#1d1028";

/** Hollow imp silhouette for ⋮ menu (matches outline lucide icons). */
export function ImpMenuOutlineGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-7 shrink-0", className)} aria-hidden>
      <ImpMarkerGlyph variant="solid" className="absolute inset-0 size-full text-current" />
      <ImpMarkerGlyph
        variant="solid"
        className="absolute inset-[12%] size-[76%]"
        style={{ color: MENU_PANEL_BG }}
      />
    </span>
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
