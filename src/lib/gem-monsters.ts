import type { PublicHouse } from "@/lib/types";

/** Molotov Kittens pack — MVP uses the included dragon for every house. */
export const GEM_MONSTER_MODELS = [
  {
    id: "dragon",
    glbPath: "/gem-monsters/dragon.glb",
    posterPath: "/gem-monsters/dragon-poster.png",
    labelHe: "דרקון חמוד",
  },
] as const;

export type GemMonsterId = (typeof GEM_MONSTER_MODELS)[number]["id"];

const MODEL = GEM_MONSTER_MODELS[0]!;

function hashHouseId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Which GLB to show (only dragon for now). */
export function gemMonsterForHouse(_house: Pick<PublicHouse, "id" | "theme" | "kind">): GemMonsterId {
  return MODEL.id;
}

export function gemMonsterMeta(monsterId: GemMonsterId = "dragon") {
  return GEM_MONSTER_MODELS.find((m) => m.id === monsterId) ?? MODEL;
}

/** Slight per-house hue so repeats feel a bit different on the bag map. */
export function gemMonsterTint(houseId: string) {
  const hue = (hashHouseId(houseId) % 360) / 360;
  return { hue, saturation: 0.35, lightness: 0.08 };
}

export function gemLabelHe(_variantOrMonsterId: string) {
  return MODEL.labelHe;
}

export function countGemEligibleHouses(houses: PublicHouse[]) {
  return houses.length;
}

export type GemFamily = "monster";

export function gemFamilyForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">): GemFamily {
  void house;
  return "monster";
}

/** @deprecated Use gemMonsterForHouse */
export function gemVariantForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">) {
  return gemMonsterForHouse(house);
}

export function gemVariantMeta(id: string) {
  const meta = gemMonsterMeta(id === "dragon" ? "dragon" : "dragon");
  return { id: meta.id, family: "monster" as const, labelHe: meta.labelHe };
}
