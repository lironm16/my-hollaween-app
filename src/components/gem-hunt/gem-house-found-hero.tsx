"use client";

import { Gem } from "lucide-react";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { gemLabelHe, gemMonsterForHouse, gemSpeciesLabelHe } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Diamond strip on the house sheet — mystery before collect, poster reveal after. */
export function GemHouseFoundHero({
  house,
  collected,
  className,
}: {
  house: Pick<PublicHouse, "id" | "theme" | "kind">;
  collected: boolean;
  className?: string;
}) {
  const monsterId = gemMonsterForHouse(house);
  const petName = gemLabelHe(monsterId);
  const species = gemSpeciesLabelHe(monsterId);

  if (!collected) {
    return (
      <div className={cn("gem-house-found-hero gem-house-found-hero--hidden", className)} dir="rtl">
        <div className="gem-house-found-hero__row">
          <div className="gem-house-found-hero__diamond" aria-hidden>
            <Gem className="size-8 text-amber-300/90 drop-shadow-[0_0_14px_rgb(251_191_36/0.45)]" />
          </div>
          <div className="gem-house-found-hero__mystery-slot" aria-hidden>
            <span className="gem-house-found-hero__question">?</span>
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="gem-house-found-hero__kicker">יהלום נסתר</p>
            <p className="gem-house-found-hero__hint">
              חבר חבוי בבית הזה — גלו במצלמה מי מסתתר כאן
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("gem-house-found-hero gem-house-found-hero--found is-revealed", className)}
      dir="rtl"
    >
      <div className="gem-house-found-hero__row">
        <div className="gem-house-found-hero__diamond gem-house-found-hero__diamond--found" aria-hidden>
          <Gem className="size-8 text-amber-300 drop-shadow-[0_0_16px_rgb(251_191_36/0.55)]" />
        </div>
        <div className="gem-house-found-hero__reveal">
          <GemSprite
            house={house}
            mode="poster"
            className="gem-house-found-hero__poster gem-sprite--sm"
          />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="gem-house-found-hero__badge">נמצא!</p>
          <p className="gem-house-found-hero__name">{petName}</p>
          <p className="gem-house-found-hero__species">{species}</p>
        </div>
      </div>
    </div>
  );
}
