import type { AddressRevealSchedule, PublicHouse } from "@/lib/types";

export type MapGemPinRingVariant = "sparkle" | "diamond";

export type MapGemPinRingContext = {
  showGemRings: boolean;
  /** Uncollected gems within hunt range — yellow sparkle even when {@link showGemRings} is off. */
  nearGemHouseIds?: ReadonlySet<string>;
  gemHouseIds: ReadonlySet<string>;
  isCollected: (houseId: string) => boolean;
  addressReveal?: AddressRevealSchedule;
};

export function houseHasUncollectedMapGem(
  houseId: string,
  ctx: Pick<MapGemPinRingContext, "gemHouseIds" | "isCollected">,
): boolean {
  return ctx.gemHouseIds.has(houseId) && !ctx.isCollected(houseId);
}

export function clusterHasUncollectedMapGem(
  houses: PublicHouse[],
  ctx: Pick<MapGemPinRingContext, "gemHouseIds" | "isCollected">,
): boolean {
  return houses.some((house) => houseHasUncollectedMapGem(house.id, ctx));
}

export function resolveMapGemPinRingVariant(
  hasUncollectedGem: boolean,
  showGemRings: boolean,
  isNearGem = false,
): MapGemPinRingVariant | null {
  if (!hasUncollectedGem) return null;
  if (showGemRings || isNearGem) return "sparkle";
  return null;
}

export type MapPinRingDecor = {
  hoursSoonClass: string;
  ringHtml: string;
};

const GEM_SPARKLE_MARKUP =
  '<span class="pin-gem-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';

function gemRingMarkup(_variant: MapGemPinRingVariant): string {
  return `<i class="pin-gem-ring is-sparkle" aria-hidden="true"></i>${GEM_SPARKLE_MARKUP}`;
}

export function mapPinRingDecorForHouse(
  house: PublicHouse,
  _now: Date,
  ctx: MapGemPinRingContext,
): MapPinRingDecor {
  const uncollected = houseHasUncollectedMapGem(house.id, ctx);
  const isNear = Boolean(ctx.nearGemHouseIds?.has(house.id));
  const gemVariant = resolveMapGemPinRingVariant(uncollected, ctx.showGemRings, isNear);

  if (gemVariant) {
    return {
      hoursSoonClass: " is-gem-ring-sparkle",
      ringHtml: gemRingMarkup(gemVariant),
    };
  }

  return { hoursSoonClass: "", ringHtml: "" };
}

export function mapPinRingDecorForCluster(
  houses: PublicHouse[],
  _now: Date,
  ctx: MapGemPinRingContext,
): MapPinRingDecor {
  const uncollected = clusterHasUncollectedMapGem(houses, ctx);
  const isNear = houses.some(
    (house) =>
      houseHasUncollectedMapGem(house.id, ctx) && Boolean(ctx.nearGemHouseIds?.has(house.id)),
  );
  const gemVariant = resolveMapGemPinRingVariant(uncollected, ctx.showGemRings, isNear);

  if (gemVariant) {
    return {
      hoursSoonClass: " is-gem-ring-sparkle",
      ringHtml: gemRingMarkup(gemVariant),
    };
  }

  return { hoursSoonClass: "", ringHtml: "" };
}

export function gemMapHouseIdSet(houses: PublicHouse[]): ReadonlySet<string> {
  return new Set(houses.map((house) => house.id));
}

export function clusterGemRingCacheKey(
  houses: PublicHouse[],
  ctx: MapGemPinRingContext,
): string {
  if (!ctx.showGemRings && !ctx.nearGemHouseIds?.size) return "off";
  return houses
    .map((house) => {
      if (!ctx.gemHouseIds.has(house.id)) return "0";
      const collected = ctx.isCollected(house.id) ? "c" : "o";
      const near = ctx.nearGemHouseIds?.has(house.id) ? "n" : "-";
      return collected + near;
    })
    .join("");
}
