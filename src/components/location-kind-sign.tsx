import { PoiPinFaceGlyph, ScareGhost } from "@/components/scare-glyphs";
import { houseKindLabels } from "@/lib/labels";
import { PIN_GLYPH_SCALE } from "@/lib/pin-faces";
import { PIN_BACKGROUND } from "@/lib/pin-colors";
import { cn } from "@/lib/utils";

/** Map pin colors — purple house, orange POI (filter / legend / admin kind toggle). */
export function LocationKindSign({
  kind,
  className,
  glyphClassName,
}: {
  kind: "house" | "poi";
  className?: string;
  /** Inner glyph scale — defaults to map pin % (house 92%, poi 88%). */
  glyphClassName?: string;
}) {
  const isPoi = kind === "poi";
  const label = houseKindLabels[kind];
  const glyphScale = glyphClassName ?? (isPoi ? PIN_GLYPH_SCALE.poi : PIN_GLYPH_SCALE.house);
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={{
        background: isPoi ? PIN_BACKGROUND.poi.decorated : PIN_BACKGROUND.house.decorated,
      }}
      title={label}
      aria-label={label}
    >
      <span className={cn("flex items-center justify-center", glyphScale)}>
        {isPoi ? <PoiPinFaceGlyph /> : <ScareGhost level="mild" />}
      </span>
    </span>
  );
}
