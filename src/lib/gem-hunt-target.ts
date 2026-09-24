import { gemProximity, type GemProximity } from "@/lib/gem-hunt";
import { distanceMeters } from "@/lib/geo";
import type { PublicHouse } from "@/lib/types";

export type GemHuntTarget = {
  house: PublicHouse;
  proximity: GemProximity;
  distanceM: number | null;
};

function distanceToHouse(
  user: { lat: number; lng: number } | null,
  house: PublicHouse,
): number | null {
  if (!user) return null;
  return distanceMeters(user, house);
}

/** House to use for map FAB / quick hunt (prefer selected, then nearest unc collected). */
export function pickGemHuntTarget(
  houses: PublicHouse[],
  user: { lat: number; lng: number } | null,
  isCollected: (houseId: string) => boolean,
  preferredHouseId?: string | null,
): GemHuntTarget | null {
  const open = houses.filter((h) => !isCollected(h.id));
  if (open.length === 0) return null;

  if (preferredHouseId) {
    const preferred = open.find((h) => h.id === preferredHouseId);
    if (preferred) {
      return {
        house: preferred,
        proximity: gemProximity(user, preferred, false),
        distanceM: distanceToHouse(user, preferred),
      };
    }
  }

  let best: GemHuntTarget | null = null;
  for (const house of open) {
    const proximity = gemProximity(user, house, false);
    const distanceM = distanceToHouse(user, house);
    const rank =
      proximity === "hunt" ? 0 : proximity === "approach" ? 1 : proximity === "far" ? 2 : 3;
    if (!best || rank < rankFor(best.proximity) || (rank === rankFor(best.proximity) && (distanceM ?? 1e9) < (best.distanceM ?? 1e9))) {
      best = { house, proximity, distanceM };
    }
  }
  return best;
}

function rankFor(p: GemProximity) {
  if (p === "hunt") return 0;
  if (p === "approach") return 1;
  if (p === "far") return 2;
  return 3;
}

/** True when user is within approach range of any unc collected gem. */
export function isNearAnyGem(
  houses: PublicHouse[],
  user: { lat: number; lng: number } | null,
  isCollected: (houseId: string) => boolean,
): boolean {
  return gemFabGlowLevel(houses, user, isCollected) !== "off";
}

/** Strongest proximity among open gems — drives map diamond pulse. */
export type GemFabGlow = "off" | "approach" | "hunt";

export function gemFabGlowLevel(
  houses: PublicHouse[],
  user: { lat: number; lng: number } | null,
  isCollected: (houseId: string) => boolean,
): GemFabGlow {
  let best: GemProximity = "far";
  for (const h of houses) {
    if (isCollected(h.id)) continue;
    const p = gemProximity(user, h, false);
    if (rankFor(p) < rankFor(best)) best = p;
    if (best === "hunt") break;
  }
  if (best === "hunt") return "hunt";
  if (best === "approach") return "approach";
  return "off";
}
