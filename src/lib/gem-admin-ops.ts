import { gemAnchorForHouse } from "@/lib/gem-hunt";
import { distanceMeters } from "@/lib/geo";
import {
  gemHuntMapHouses,
  gemLabelHe,
  gemMonsterForHouse,
  gemSpeciesLabelHe,
  syncGemMonsterAssignment,
  type GemMonsterId,
} from "@/lib/gem-monsters";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

export type GemMapHouseRow = {
  house: PublicHouse;
  monsterId: GemMonsterId;
  petNameHe: string;
  speciesHe: string;
};

export function buildGemMapHouseRows(
  houses: PublicHouse[],
  houseSet: HouseSet = "real",
): GemMapHouseRow[] {
  const eligible = gemHuntMapHouses(houses, houseSet);
  syncGemMonsterAssignment(eligible);
  return eligible.map((house) => {
    const monsterId = gemMonsterForHouse(house);
    return {
      house,
      monsterId,
      petNameHe: gemLabelHe(monsterId),
      speciesHe: gemSpeciesLabelHe(monsterId),
    };
  });
}

export function countGemsOnMapByMonster(rows: GemMapHouseRow[]) {
  const counts = new Map<GemMonsterId, number>();
  for (const row of rows) {
    counts.set(row.monsterId, (counts.get(row.monsterId) ?? 0) + 1);
  }
  return counts;
}

export function filterGemMapRows(
  rows: GemMapHouseRow[],
  options: {
    query?: string;
    monsterId?: GemMonsterId | "all";
  },
) {
  const q = options.query?.trim().toLowerCase() ?? "";
  const monster = options.monsterId ?? "all";
  return rows.filter((row) => {
    if (monster !== "all" && row.monsterId !== monster) return false;
    if (!q) return true;
    const hay = [
      row.house.name,
      row.house.address,
      row.house.id,
      row.petNameHe,
      row.monsterId,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function closestGemMapRow(
  origin: { lat: number; lng: number },
  rows: GemMapHouseRow[],
  monsterId: GemMonsterId | "all" = "all",
): (GemMapHouseRow & { distanceM: number }) | null {
  const pool = monsterId === "all" ? rows : rows.filter((row) => row.monsterId === monsterId);
  let best: (GemMapHouseRow & { distanceM: number }) | null = null;
  for (const row of pool) {
    const anchor = gemAnchorForHouse(row.house);
    const distanceM = Math.min(
      distanceMeters(origin, row.house),
      distanceMeters(origin, anchor),
    );
    if (!best || distanceM < best.distanceM) {
      best = { ...row, distanceM };
    }
  }
  return best;
}
