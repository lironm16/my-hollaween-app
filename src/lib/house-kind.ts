import type { HouseKind, PoiCategory, PublicHouse } from "@/lib/types";

export function effectiveHouseKind(house: { kind?: HouseKind | null }): HouseKind {
  return house.kind === "poi" ? "poi" : "house";
}

export function isPoiHouse(house: { kind?: HouseKind | null }) {
  return effectiveHouseKind(house) === "poi";
}

export function isHouseKind(house: { kind?: HouseKind | null }) {
  return effectiveHouseKind(house) === "house";
}

export function houseMatchesLocationKind(
  house: PublicHouse,
  filter: "all" | "house" | "poi",
) {
  if (filter === "all") return true;
  return effectiveHouseKind(house) === filter;
}

export function normalizePoiCategory(
  kind: HouseKind,
  category: PoiCategory | null | undefined,
): PoiCategory | null {
  if (kind !== "poi") return null;
  return category ?? "other";
}
