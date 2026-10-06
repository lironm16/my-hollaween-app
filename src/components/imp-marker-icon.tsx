import { GEM_DIAMOND_FILL } from "@/lib/gem-diamond-visual";
import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { cn } from "@/lib/utils";

/** Imp marker — outline-style when idle (full silhouette), white on orange when active. */
export function GemDiamondIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
  /** @deprecated Idle toolbar uses full silhouette, not a yellow fill. */
  filled?: boolean;
}) {
  return (
    <ImpMarkerGlyph
      variant={active ? "solid" : "eyes"}
      className={cn(
        "inline-flex size-8 max-h-8 max-w-8 shrink-0 items-center justify-center overflow-hidden",
        active ? "text-white" : "text-orange-100",
        className,
      )}
    />
  );
}

export function GemDiamondSvg({
  className,
  fill = GEM_DIAMOND_FILL,
  variant = "solid",
}: {
  className?: string;
  fill?: string;
  variant?: "solid" | "eyes";
}) {
  return (
    <ImpMarkerGlyph
      variant={variant}
      className={cn(
        "inline-flex size-8 max-h-8 max-w-8 shrink-0 items-center justify-center overflow-hidden align-middle",
        className,
      )}
      style={{ color: fill }}
    />
  );
}
