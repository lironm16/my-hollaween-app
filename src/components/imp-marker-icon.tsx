import { GEM_DIAMOND_FILL } from "@/lib/gem-diamond-visual";
import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { cn } from "@/lib/utils";

/** Imp marker — toolbar uses white tint when active on orange. */
export function GemDiamondIcon({
  className,
  active = false,
  filled = true,
}: {
  className?: string;
  active?: boolean;
  filled?: boolean;
}) {
  const emphasize = active || filled;
  return (
    <ImpMarkerGlyph
      variant="solid"
      className={cn(
        "aspect-square",
        emphasize ? "opacity-100" : "opacity-85",
        active ? "text-white" : filled ? "text-[#fbbf24]" : "text-orange-100",
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
