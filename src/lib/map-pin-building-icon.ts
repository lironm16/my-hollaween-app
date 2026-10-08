import { PIN_BACKGROUND } from "@/lib/pin-colors";
import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

/** Building cluster center art — twin ghosts, twin pumpkins, or one of each. */
export type BuildingClusterIconKind = "houses" | "businesses" | "mixed";

export const BUILDING_CLUSTER_FILL = {
  houses: PIN_BACKGROUND.house.decorated,
  businesses: PIN_BACKGROUND.poi.decorated,
  mixedLeft: PIN_BACKGROUND.house.decorated,
  mixedRight: PIN_BACKGROUND.poi.decorated,
} as const;

/** Leaflet divIcon footprint — larger than a single-house pin (PIN_BOX 62). */
export function buildingClusterLeafletBox(kind: BuildingClusterIconKind): {
  width: number;
  height: number;
  anchorTail: number;
  extraH: number;
} {
  if (kind === "mixed") {
    return { width: 94, height: 66, anchorTail: 18, extraH: 22 };
  }
  return { width: 76, height: 76, anchorTail: 18, extraH: 20 };
}

function svgGhost(x: number, y: number, scale: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="#fff7ed" stroke="#1c1917" stroke-width="1.35" stroke-linejoin="round">
    <path d="M12 1.5C6.8 1.5 3 5.8 3 11v10.5c0 .9.7 1.6 1.5 1.9-1 .7-1.6 1.7-1.6 3 0 .3.2.6.5.6h2.2c.4-1 1.2-1.7 2.3-1.7s1.9.7 2.3 1.7h2.2c.3 0 .5-.3.5-.6 0-1.3-.6-2.3-1.6-3 .8-.3 1.5-1 1.5-1.9V11c0-5.2-3.8-9.5-9-9.5z"/>
    <circle cx="9.2" cy="10.5" r="1.35" fill="#1c1917" stroke="none"/>
    <circle cx="14.8" cy="10.5" r="1.35" fill="#1c1917" stroke="none"/>
    <path d="M9.5 14.2c1.2 1.4 2.8 1.4 4 0" fill="none" stroke="#1c1917" stroke-width="1.15" stroke-linecap="round"/>
  </g>`;
}

function svgPumpkin(x: number, y: number, scale: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" stroke="#1c1917" stroke-width="1.35" stroke-linejoin="round">
    <path d="M12 2.5c-1.1 0-2 .8-2.2 1.9-.6-.3-1.3-.4-2-.4-2 0-3.5 1.5-3.5 3.4 0 .8.3 1.5.8 2.1C4.2 10.8 3 12.8 3 15c0 4.6 3.8 8.5 9 8.5s9-3.9 9-8.5c0-2.2-1.2-4.2-2.1-5.5.5-.6.8-1.3.8-2.1 0-1.9-1.5-3.4-3.5-3.4-.7 0-1.4.1-2 .4C14 3.3 13.1 2.5 12 2.5z" fill="#f97316"/>
    <path d="M12 2.5V1" stroke="#166534" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8.5 11.5 9.5 14 10.8 11.5z" fill="#1c1917" stroke="none"/>
    <path d="M13.2 11.5 14.2 14 15.5 11.5z" fill="#1c1917" stroke="none"/>
    <path d="M8.5 16.5h7" fill="none" stroke="#1c1917" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M9 18.5h6" fill="none" stroke="#1c1917" stroke-width="1.1" stroke-linecap="round"/>
  </g>`;
}

function clusterSvg(kind: BuildingClusterIconKind) {
  if (kind === "houses") {
    return `<svg class="pin-cluster-svg" viewBox="0 0 48 34" width="48" height="34" aria-hidden="true">${svgGhost(0, 5, 0.78)}${svgGhost(13, 1, 0.92)}</svg>`;
  }
  if (kind === "businesses") {
    return `<svg class="pin-cluster-svg" viewBox="0 0 48 34" width="48" height="34" aria-hidden="true">${svgPumpkin(0, 4, 0.76)}${svgPumpkin(12, 0, 0.94)}</svg>`;
  }
  return `<svg class="pin-cluster-svg is-mixed" viewBox="0 0 54 36" width="54" height="36" aria-hidden="true">${svgGhost(0, 4, 0.88)}${svgPumpkin(20, 0, 1.02)}</svg>`;
}

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

export function buildingClusterPinClass(kind: BuildingClusterIconKind) {
  return `is-cluster-${kind}`;
}

export function pinBuildingClusterIconHtml(houses: PublicHouse[]) {
  const kind = buildingClusterIconKind(houses);
  if (!kind) return "";
  return `<span class="pin-cluster-icon pin-cluster-duo pin-cluster-${kind}" aria-hidden="true">${clusterSvg(kind)}</span>`;
}
