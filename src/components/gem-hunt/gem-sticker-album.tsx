"use client";

import Image from "next/image";
import { useMemo } from "react";
import { GemBagDiamondHero } from "@/components/gem-hunt/gem-bag-diamond-hero";
import {
  gemAlbumStickerPool,
  gemLabelHe,
  isGemAlbumMonsterCollected,
  syncGemMonsterAssignment,
  type GemCollectionStamp,
  type GemMonsterId,
} from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GemStickerAlbum({
  mapHouses,
  collected,
}: {
  mapHouses: PublicHouse[];
  collected: GemCollectionStamp[];
}) {
  const housesById = useMemo(
    () => new Map(mapHouses.map((house) => [house.id, house])),
    [mapHouses],
  );
  const slots = useMemo(() => {
    syncGemMonsterAssignment(mapHouses);
    return gemAlbumStickerPool();
  }, [mapHouses]);
  const filledCount = useMemo(
    () =>
      slots.filter((monster) =>
        isGemAlbumMonsterCollected(monster.id, collected, housesById),
      ).length,
    [slots, collected, housesById],
  );
  const complete = slots.length > 0 && filledCount >= slots.length;

  return (
    <div className={cn("gem-sticker-album", complete && "gem-sticker-album--complete")}>
      <GemBagDiamondHero filledCount={filledCount} totalSlots={slots.length} complete={complete} />

      <div className="gem-sticker-album__book" role="list" aria-label="חברי יהלום">
        {slots.map((monster, index) => {
          const isFound = isGemAlbumMonsterCollected(monster.id, collected, housesById);
          return (
            <GemStickerSlot
              key={monster.id}
              monsterId={monster.id}
              posterPath={monster.posterPath}
              collected={isFound}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}

function GemStickerSlot({
  monsterId,
  posterPath,
  collected,
  index,
}: {
  monsterId: GemMonsterId;
  posterPath: string;
  collected: boolean;
  index: number;
}) {
  const label = gemLabelHe(monsterId);
  return (
    <div
      role="listitem"
      data-gem-sticker-slot={monsterId}
      className={cn("gem-sticker-slot", collected && "is-found")}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="gem-sticker-slot__frame">
        {collected ? (
          <>
            <Image
              src={posterPath}
              alt=""
              width={160}
              height={160}
              className="gem-sticker-slot__art"
              sizes="(max-width: 640px) 42vw, 140px"
            />
            <span className="gem-sticker-slot__shine" aria-hidden />
          </>
        ) : (
          <div className="gem-sticker-slot__mystery" aria-label="חבר חסר">
            <span className="gem-sticker-slot__question" aria-hidden>
              ?
            </span>
            <span className="gem-sticker-slot__foil" aria-hidden />
          </div>
        )}
      </div>
      <p className="gem-sticker-slot__caption">{collected ? label : "מסתתר במפה…"}</p>
    </div>
  );
}
