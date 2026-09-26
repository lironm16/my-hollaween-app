"use client";

import { GemMysteryTeaser3D } from "@/components/gem-hunt/gem-mystery-teaser-3d";
import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** House sheet — teaser before collect; name-only on found card (no gem art in yellow popup). */
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

  return (
    <div
      className={cn(
        "gem-house-found-hero",
        collected && "gem-house-found-hero--found",
        className,
      )}
      dir="rtl"
    >
      {collected ? (
        <p className="gem-house-found-hero__name gem-house-found-hero__name--solo">{petName}</p>
      ) : (
        <>
          <div className="gem-house-found-hero__visual" aria-hidden>
            <div className="gem-house-found-hero__model gem-house-found-hero__model--teaser">
              <GemMysteryTeaser3D />
            </div>
          </div>
          <p className="gem-house-found-hero__kicker">יהלום נסתר · גלו במצלמה</p>
        </>
      )}
    </div>
  );
}
