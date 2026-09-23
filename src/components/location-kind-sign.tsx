import { ScareGhost, ScarePumpkin } from "@/components/scare-glyphs";
import { PIN_BACKGROUND } from "@/lib/pin-colors";
import { cn } from "@/lib/utils";

/** Map pin colors — purple house, orange POI (filter / legend / admin kind toggle). */
export function LocationKindSign({
  kind,
  className,
}: {
  kind: "house" | "poi";
  className?: string;
}) {
  const isPoi = kind === "poi";
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
        isPoi ? "text-[#1c0e24]" : "text-[#fff7ed]",
        className,
      )}
      style={{
        background: isPoi ? PIN_BACKGROUND.poi.decorated : PIN_BACKGROUND.house.decorated,
      }}
      aria-hidden
    >
      <span className="flex size-[122%] items-center justify-center">
        {isPoi ? (
          <ScarePumpkin level="medium" featureFill={PIN_BACKGROUND.poi.decorated} />
        ) : (
          <ScareGhost level="mild" />
        )}
      </span>
    </span>
  );
}
