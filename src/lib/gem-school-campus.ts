import { boothNumberForHouse } from "@/lib/cluster-booth";
import { isSchoolCampusAddress } from "@/lib/school-campus";
import { gemHuntResidentialHousesEnabled } from "@/lib/gem-hunt-enabled";
import { houseMatchesSet, isStubHouse } from "@/lib/house-set";
import { isPracticeHouse } from "@/lib/practice-house";
import type { PublicHouse } from "@/lib/types";

/** Emissive strength for hunt gems (school booths + future house gems). */
export const GEM_HUNT_GLOW_INTENSITY = 0.38;

export type GemMonsterTint = {
  hue: number;
  saturation: number;
  lightness: number;
  glow: number;
};

/** Distinct dragon hues — one stable variant per booth index within a campus. */
const SCHOOL_BOOTH_DRAGON_TINTS: readonly Omit<GemMonsterTint, "glow">[] = [
  { hue: 0.02, saturation: 0.52, lightness: 0.06 },
  { hue: 0.08, saturation: 0.5, lightness: 0.07 },
  { hue: 0.14, saturation: 0.48, lightness: 0.06 },
  { hue: 0.22, saturation: 0.5, lightness: 0.07 },
  { hue: 0.3, saturation: 0.48, lightness: 0.06 },
  { hue: 0.38, saturation: 0.52, lightness: 0.06 },
  { hue: 0.46, saturation: 0.5, lightness: 0.07 },
  { hue: 0.54, saturation: 0.48, lightness: 0.06 },
  { hue: 0.62, saturation: 0.5, lightness: 0.07 },
  { hue: 0.7, saturation: 0.48, lightness: 0.06 },
  { hue: 0.78, saturation: 0.46, lightness: 0.08 },
  { hue: 0.84, saturation: 0.5, lightness: 0.06 },
  { hue: 0.9, saturation: 0.48, lightness: 0.07 },
  { hue: 0.96, saturation: 0.52, lightness: 0.06 },
  { hue: 0.58, saturation: 0.55, lightness: 0.05 },
  { hue: 0.42, saturation: 0.55, lightness: 0.05 },
];

/** Rows at curated school campuses (house or POI דוכן) — pre-event gem hunt anchors. */
export function isGemSchoolCampusBooth(
  house: { address?: string | null; kind?: PublicHouse["kind"] },
): boolean {
  const address = house.address?.trim();
  if (!address) return false;
  return isSchoolCampusAddress(address);
}

function schoolBoothPaletteIndex(
  house: Pick<PublicHouse, "id" | "boothNumber">,
): number {
  const booth = boothNumberForHouse(house);
  if (booth != null) return Math.max(0, booth - 1);
  return 0;
}

export function schoolCampusDragonTint(
  house: Pick<PublicHouse, "id" | "boothNumber"> & {
    address?: string | null;
    kind?: PublicHouse["kind"];
  },
): GemMonsterTint | null {
  if (!isGemSchoolCampusBooth(house)) return null;
  const palette = SCHOOL_BOOTH_DRAGON_TINTS;
  const base = palette[schoolBoothPaletteIndex(house) % palette.length]!;
  return { ...base, glow: GEM_HUNT_GLOW_INTENSITY };
}

function hashPracticePaletteIndex(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Admin practice houses — dragon only, distinct stable color per row. */
export function practiceDragonTint(house: Pick<PublicHouse, "id">): GemMonsterTint {
  const base = SCHOOL_BOOTH_DRAGON_TINTS[hashPracticePaletteIndex(house.id) % SCHOOL_BOOTH_DRAGON_TINTS.length]!;
  return { ...base, glow: GEM_HUNT_GLOW_INTENSITY };
}

export type GemHuntSetOptions = {
  /** Admin / demon map mode — every house in the set gets a gem (not only schools). */
  includeAllHouses?: boolean;
};

/** Gem-eligible rows — practice pre-event; all in-set houses after residential hunt opens. */
export function houseMatchesGemHuntSet(
  house: Pick<PublicHouse, "address" | "kind" | "isStub" | "isPractice"> & {
    deviceCacheStub?: boolean;
  },
  houseSet: import("@/lib/house-set").HouseSet,
  options?: GemHuntSetOptions,
): boolean {
  if (isPracticeHouse(house)) {
    if (houseSet === "stubs" || isStubHouse(house)) return false;
    return true;
  }
  if (!houseMatchesSet(house, houseSet)) return false;
  if (options?.includeAllHouses || gemHuntResidentialHousesEnabled()) return true;
  return false;
}
