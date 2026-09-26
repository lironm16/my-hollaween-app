import {
  gemAlbumStickerPool,
  gemHuntMapHouses,
  isGemAlbumMonsterCollected,
  type GemCollectionStamp,
} from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

/** Milestone shown on the bag page after the collect fly-in. */
export type GemBagCelebrateKind = "map" | "album" | "map-album";

export function gemBagCelebrateAfterCollect(
  mapHouses: PublicHouse[],
  collectedBefore: GemCollectionStamp[],
  houseId: string,
  gemType: string,
): GemBagCelebrateKind | null {
  const huntHouses = gemHuntMapHouses(mapHouses, "real");
  const collectedIdsBefore = new Set(collectedBefore.map((e) => e.houseId));
  const mapCompleteAfter =
    huntHouses.length > 0 &&
    huntHouses.every((h) => h.id === houseId || collectedIdsBefore.has(h.id));

  const collectedAfter: GemCollectionStamp[] = [
    { houseId, gemType, collectedAt: Date.now() },
    ...collectedBefore.filter((e) => e.houseId !== houseId),
  ];
  const housesById = new Map(mapHouses.map((h) => [h.id, h]));
  const slots = gemAlbumStickerPool();
  const albumCompleteAfter =
    slots.length > 0 &&
    slots.every((monster) =>
      isGemAlbumMonsterCollected(monster.id, collectedAfter, housesById),
    );

  if (mapCompleteAfter && albumCompleteAfter) return "map-album";
  if (albumCompleteAfter) return "album";
  if (mapCompleteAfter) return "map";
  return null;
}

export function parseGemBagCelebrate(raw: string | null): GemBagCelebrateKind | null {
  if (raw === "map" || raw === "album" || raw === "map-album") return raw;
  return null;
}

export function gemBagCollectHref(monsterId: string, celebrate: GemBagCelebrateKind | null) {
  const params = new URLSearchParams({ fly: monsterId });
  if (celebrate) params.set("celebrate", celebrate);
  return `/gem-bag?${params.toString()}`;
}
