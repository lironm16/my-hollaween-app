import {
  gemAlbumStickerPool,
  gemHousesForMap,
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
  /** Callers pass the same gem-eligible map rows as pin rings (already filtered). */
  const huntHouses = gemHousesForMap(mapHouses);
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

/** Sticker album — no collect fly-in (e.g. cluster session summary). */
export function gemBagPlainHref() {
  return "/gem-bag";
}

export function gemBagCollectHref(
  monsterId: string,
  celebrate: GemBagCelebrateKind | null,
  options?: { animate?: boolean },
) {
  if (options?.animate === false) return gemBagPlainHref();
  const params = new URLSearchParams({ fly: monsterId });
  if (celebrate) params.set("celebrate", celebrate);
  return `/gem-bag?${params.toString()}`;
}
