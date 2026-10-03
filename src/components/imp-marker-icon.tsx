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
      variant="solid"
      className={cn(
        "aspect-square",
        active ? "text-white" : "text-orange-100",
        className,
      )}
    />
  );
}

export function GemDiamondSvg({
  className,
  fill = GEM_DIAMOND_FILL,
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <ImpMarkerGlyph
      className={cn("inline-block aspect-square align-middle", className)}
      style={{ color: fill }}
    />
  );
}
