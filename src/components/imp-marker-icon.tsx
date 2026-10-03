import { GEM_DIAMOND_FILL } from "@/lib/gem-diamond-visual";
import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { cn } from "@/lib/utils";

/** Imp marker — toolbar uses black on orange when active, eye slits when idle. */
export function GemDiamondIcon({
  className,
  active = false,
  filled = true,
}: {
  className?: string;
  active?: boolean;
  filled?: boolean;
}) {
  if (active) {
    return (
      <ImpMarkerGlyph
        variant="solid"
        className={cn("aspect-square text-black", className)}
      />
    );
  }
  if (filled) {
    return (
      <ImpMarkerGlyph
        variant="solid"
        className={cn("aspect-square text-[#fbbf24]", className)}
      />
    );
  }
  return (
    <ImpMarkerGlyph
      variant="eyes"
      className={cn("aspect-square text-orange-100", className)}
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
