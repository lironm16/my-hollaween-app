"use client";

import Image from "next/image";
import { GemMysteryTeaser3D } from "@/components/gem-hunt/gem-mystery-teaser-3d";
import { gemLabelHe, gemMonsterForHouse, gemMonsterMeta } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** House sheet — compact gem teaser; poster + name after collect (no WebGL loop). */
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
  const meta = gemMonsterMeta(monsterId);

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
          <div className="gem-house-found-hero__poster-wrap" aria-hidden>
            <Image
              src={meta.posterPath}
              alt=""
              width={96}
              height={96}
              className="gem-house-found-hero__pet-art"
              sizes="96px"
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
