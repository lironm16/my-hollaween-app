"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { GemBagDiamondHero } from "@/components/gem-hunt/gem-bag-diamond-hero";
import { GemStickerSpotlight } from "@/components/gem-hunt/gem-sticker-spotlight";
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
  const [spotlightId, setSpotlightId] = useState<GemMonsterId | null>(null);

  return (
    <div className={cn("gem-sticker-album", complete && "gem-sticker-album--complete")}>
      <GemBagDiamondHero filledCount={filledCount} totalSlots={slots.length} complete={complete} />
      <header className="gem-sticker-album__head gem-sticker-album__head--sub">
        <p className="gem-sticker-album__sub">
          {complete ? (
            <>
              <Sparkles className="inline size-4 text-amber-300" aria-hidden /> גלו את כל
              המדבקות למטה
            </>
          ) : (
            <>מה עדיין חבוי על המפה?</>
          )}
        </p>
      </header>

      <div className="gem-sticker-album__book" role="list" aria-label="מדבקות יהלום">
        {slots.map((monster, index) => {
          const isFound = isGemAlbumMonsterCollected(monster.id, collected, housesById);
          return (
            <GemStickerSlot
              key={monster.id}
              monsterId={monster.id}
              posterPath={monster.posterPath}
              collected={isFound}
              index={index}
              onOpen={isFound ? () => setSpotlightId(monster.id) : undefined}
            />
          );
        })}
      </div>

      {spotlightId ? (
        <GemStickerSpotlight monsterId={spotlightId} onClose={() => setSpotlightId(null)} />
      ) : null}

      {!complete ? (
        <p className="gem-sticker-album__tease">
          מקומות ריקים = עדיין לא מצאתם. צאו למפה — כל בית מסתיר יהלום אחר.
        </p>
      ) : null}
    </div>
  );
}

function GemStickerSlot({
  monsterId,
  posterPath,
  collected,
  index,
  onOpen,
}: {
  monsterId: GemMonsterId;
  posterPath: string;
  collected: boolean;
  index: number;
  onOpen?: () => void;
}) {
  const label = gemLabelHe(monsterId);
  const interactive = collected && onOpen;
  return (
    <div
      role="listitem"
      data-gem-sticker-slot={monsterId}
      className={cn("gem-sticker-slot", collected && "is-found", interactive && "is-tappable")}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <button
        type="button"
        disabled={!interactive}
        className="gem-sticker-slot__hit"
        aria-label={interactive ? `הציגו את ${label} בגדול` : undefined}
        onClick={onOpen}
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
          <div className="gem-sticker-slot__mystery" aria-label="מדבקה חסרה">
            <span className="gem-sticker-slot__question" aria-hidden>
              ?
            </span>
            <span className="gem-sticker-slot__foil" aria-hidden />
          </div>
        )}
      </div>
      <p className="gem-sticker-slot__caption">
        {collected ? label : "מסתתר במפה…"}
      </p>
      </button>
    </div>
  );
}
