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
  return (
    <ImpMarkerGlyph
      className={cn(
        "size-5",
        active ? "text-white" : filled ? "text-[#fbbf24]" : "text-current",
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
  return <ImpMarkerGlyph className={cn("block", className)} style={{ color: fill }} />;
}
