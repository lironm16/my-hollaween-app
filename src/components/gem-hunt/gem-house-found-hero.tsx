"use client";

import { GemMysteryTeaser3D } from "@/components/gem-hunt/gem-mystery-teaser-3d";
import { GemModel3D } from "@/components/gem-hunt/gem-model-3d";
import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** House sheet — compact gem teaser; 3D pet + name after collect. */
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
      <div className="gem-house-found-hero__visual">
        {collected ? (
          <div className="gem-house-found-hero__model" aria-hidden>
            <GemModel3D
              houseId={house.id}
              monsterId={monsterId}
              size="sm"
              collected
              motion="celebrate"
              spin
              interactive={false}
              spinRate={0.55}
            />
          </div>
        ) : (
          <div className="gem-house-found-hero__model gem-house-found-hero__model--teaser" aria-hidden>
            <GemMysteryTeaser3D />
          </div>
        )}
      </div>
      {collected ? (
        <p className="gem-house-found-hero__name">{petName}</p>
      ) : (
        <p className="gem-house-found-hero__kicker">יהלום נסתר · גלו במצלמה</p>
      )}
    </div>
  );
}
