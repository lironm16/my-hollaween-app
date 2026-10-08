import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

/** Building cluster center art — twin ghosts, twin pumpkins, or one of each. */
export type BuildingClusterIconKind = "houses" | "businesses" | "mixed";

export const PIN_CLUSTER_GHOSTS_SRC = "/icons/pin-cluster-ghosts.png";
export const PIN_CLUSTER_GHOSTS_SRC_2X = "/icons/pin-cluster-ghosts@2x.png";
export const PIN_CLUSTER_PUMPKINS_SRC = "/icons/pin-cluster-pumpkins.png";
export const PIN_CLUSTER_PUMPKINS_SRC_2X = "/icons/pin-cluster-pumpkins@2x.png";
export const PIN_CLUSTER_MIXED_SRC = "/icons/pin-cluster-mixed.png";
export const PIN_CLUSTER_MIXED_SRC_2X = "/icons/pin-cluster-mixed@2x.png";

const CLUSTER_ICON: Record<
  BuildingClusterIconKind,
  { src: string; src2x: string; width: number; height: number }
> = {
  houses: {
    src: PIN_CLUSTER_GHOSTS_SRC,
    src2x: PIN_CLUSTER_GHOSTS_SRC_2X,
    width: 72,
    height: 56,
  },
  businesses: {
    src: PIN_CLUSTER_PUMPKINS_SRC,
    src2x: PIN_CLUSTER_PUMPKINS_SRC_2X,
    width: 72,
    height: 56,
  },
  mixed: {
    src: PIN_CLUSTER_MIXED_SRC,
    src2x: PIN_CLUSTER_MIXED_SRC_2X,
    width: 72,
    height: 56,
  },
};

/** Pick cluster art from house vs business counts at one address. */
export function buildingClusterIconKind(houses: PublicHouse[]): BuildingClusterIconKind | null {
  if (houses.length <= 1) return null;
  let houseCount = 0;
  let poiCount = 0;
  for (const house of houses) {
    if (effectiveHouseKind(house) === "poi") poiCount += 1;
    else houseCount += 1;
  }
  if (houseCount >= 1 && poiCount >= 1) return "mixed";
  if (poiCount > 1) return "businesses";
  if (houseCount > 1) return "houses";
  return null;
}

export function pinBuildingClusterIconHtml(houses: PublicHouse[]) {
  const kind = buildingClusterIconKind(houses);
  if (!kind) return "";
  const { src, src2x, width, height } = CLUSTER_ICON[kind];
  return `<span class="pin-cluster-icon pin-cluster-duo" aria-hidden="true"><img class="pin-cluster-art" src="${src}" srcset="${src} 1x, ${src2x} 2x" width="${width}" height="${height}" alt="" decoding="async" /></span>`;
}
