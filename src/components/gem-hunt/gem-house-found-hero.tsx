"use client";

import Image from "next/image";
import { Gem } from "lucide-react";
import { gemLabelHe, gemMonsterForHouse, gemMonsterMeta } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** House sheet — large yellow gem; name only after collect (no species / «נמצא» strip). */
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
        <div className="gem-house-found-hero__gem-wrap" aria-hidden>
          <Gem className="gem-house-found-hero__gem-icon" strokeWidth={1.75} />
        </div>
        {collected ? (
          <Image
            src={meta.posterPath}
            alt=""
            width={120}
            height={120}
            className="gem-house-found-hero__pet-art"
            sizes="120px"
          />
        ) : null}
      </div>
      {collected ? (
        <p className="gem-house-found-hero__name">{petName}</p>
      ) : (
        <>
          <p className="gem-house-found-hero__kicker">יהלום נסתר</p>
          <p className="gem-house-found-hero__hint">
            חבר חבוי בבית הזה — גלו במצלמה מי מסתתר כאן
          </p>
        </>
      )}
    </div>
  );
}
