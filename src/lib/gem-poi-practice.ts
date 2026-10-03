import { resolveNeighborhood, type NeighborhoodId } from "@/lib/config";
import { isGemLabStub } from "@/lib/gem-lab-stubs";
import { isPoiHouse } from "@/lib/house-kind";
import { isStubHouse } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

/** Curated dragon hues — one per neighborhood POI (album still one dragon). */
const POI_DRAGON_TINT_BY_NEIGHBORHOOD: Record<
  NeighborhoodId,
  { hue: number; saturation: number; lightness: number }
> = {
  חרוזים: { hue: 0.02, saturation: 0.52, lightness: 0.06 },
  "שיכון ותיקים": { hue: 0.58, saturation: 0.5, lightness: 0.06 },
  "נחלת גנים": { hue: 0.38, saturation: 0.52, lightness: 0.06 },
  הגפן: { hue: 0.78, saturation: 0.46, lightness: 0.08 },
};

/** Emissive strength for all hunt gems (POI + future house gems). */
export const GEM_HUNT_GLOW_INTENSITY = 0.38;

export type GemMonsterTint = {
  hue: number;
  saturation: number;
  lightness: number;
  glow: number;
};

/** Manager POI rows in the catalog — practice gems, not rehearsal stubs or gem lab. */
export function isGemPracticePoi(
  house: Pick<PublicHouse, "id" | "kind" | "description">,
): boolean {
  if (!isPoiHouse(house)) return false;
  if (isStubHouse(house)) return false;
  if (isGemLabStub(house)) return false;
  return true;
}

/** POI pumpkin pins stay on the map during «פתוחים עכשיו» / custom outing filters. */
export function poiExemptFromOutingHourFilters(house: Pick<PublicHouse, "kind">) {
  return isPoiHouse(house);
}

export function practicePoiDragonTint(
  house: Pick<PublicHouse, "id" | "kind" | "description" | "neighborhood" | "address" | "lat" | "lng">,
): GemMonsterTint | null {
  if (!isGemPracticePoi(house)) return null;
  const area = resolveNeighborhood(house);
  const curated = area ? POI_DRAGON_TINT_BY_NEIGHBORHOOD[area] : null;
  const base = curated ?? { hue: 0.12, saturation: 0.45, lightness: 0.06 };
  return { ...base, glow: GEM_HUNT_GLOW_INTENSITY };
}
