import type { PublicHouse } from "@/lib/types";

/** Akochan Halloween Spooky Pet Pack (18) — one pet GLB per file after split. */
export const GEM_MONSTER_MODELS = [
  { id: "black-cat", glbPath: "/gem-monsters/black-cat.glb", posterPath: "/gem-monsters/black-cat-poster.png", labelHe: "חתול שחור" },
  { id: "candy-corn", glbPath: "/gem-monsters/candy-corn.glb", posterPath: "/gem-monsters/candy-corn-poster.png", labelHe: "תירס ממתק" },
  { id: "eyeball", glbPath: "/gem-monsters/eyeball.glb", posterPath: "/gem-monsters/eyeball-poster.png", labelHe: "עין מפחידה" },
  { id: "frankie", glbPath: "/gem-monsters/frankie.glb", posterPath: "/gem-monsters/frankie-poster.png", labelHe: "פרנקי" },
  { id: "ghost", glbPath: "/gem-monsters/ghost.glb", posterPath: "/gem-monsters/ghost-poster.png", labelHe: "רוח" },
  { id: "ghost-hound", glbPath: "/gem-monsters/ghost-hound.glb", posterPath: "/gem-monsters/ghost-hound-poster.png", labelHe: "רוח כלב" },
  { id: "imp", glbPath: "/gem-monsters/imp.glb", posterPath: "/gem-monsters/imp-poster.png", labelHe: "שדון" },
  { id: "mummy", glbPath: "/gem-monsters/mummy.glb", posterPath: "/gem-monsters/mummy-poster.png", labelHe: "מומיה" },
  { id: "mushroom", glbPath: "/gem-monsters/mushroom.glb", posterPath: "/gem-monsters/mushroom-poster.png", labelHe: "פטרייה" },
  { id: "potion-slime", glbPath: "/gem-monsters/potion-slime.glb", posterPath: "/gem-monsters/potion-slime-poster.png", labelHe: "סליים" },
  { id: "pumpkin", glbPath: "/gem-monsters/pumpkin.glb", posterPath: "/gem-monsters/pumpkin-poster.png", labelHe: "דלעת" },
  { id: "raven", glbPath: "/gem-monsters/raven.glb", posterPath: "/gem-monsters/raven-poster.png", labelHe: "עורב" },
  { id: "reaper", glbPath: "/gem-monsters/reaper.glb", posterPath: "/gem-monsters/reaper-poster.png", labelHe: "קוצר" },
  { id: "skeleton", glbPath: "/gem-monsters/skeleton.glb", posterPath: "/gem-monsters/skeleton-poster.png", labelHe: "שלד" },
  { id: "spider", glbPath: "/gem-monsters/spider.glb", posterPath: "/gem-monsters/spider-poster.png", labelHe: "עכביש" },
  { id: "vampire-bat", glbPath: "/gem-monsters/vampire-bat.glb", posterPath: "/gem-monsters/vampire-bat-poster.png", labelHe: "עטלף" },
  { id: "werewolf", glbPath: "/gem-monsters/werewolf.glb", posterPath: "/gem-monsters/werewolf-poster.png", labelHe: "איש זאב" },
  { id: "zombie", glbPath: "/gem-monsters/zombie.glb", posterPath: "/gem-monsters/zombie-poster.png", labelHe: "זומבי" },
] as const;

export type GemMonsterId = (typeof GEM_MONSTER_MODELS)[number]["id"];

const DEFAULT_MONSTER = GEM_MONSTER_MODELS[0]!;

function hashHouseId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable pet per house (18 Akochan variants). */
export function gemMonsterForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">): GemMonsterId {
  void house.theme;
  void house.kind;
  const idx = hashHouseId(house.id) % GEM_MONSTER_MODELS.length;
  return GEM_MONSTER_MODELS[idx]!.id;
}

export function gemMonsterMeta(monsterId: GemMonsterId) {
  return GEM_MONSTER_MODELS.find((m) => m.id === monsterId) ?? DEFAULT_MONSTER;
}

/** Slight per-house hue so repeats feel a bit different on the bag map. */
export function gemMonsterTint(houseId: string) {
  const hue = (hashHouseId(houseId) % 360) / 360;
  return { hue, saturation: 0.35, lightness: 0.08 };
}

export function gemLabelHe(variantOrMonsterId: string) {
  const meta = GEM_MONSTER_MODELS.find((m) => m.id === variantOrMonsterId);
  return meta?.labelHe ?? DEFAULT_MONSTER.labelHe;
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
  const meta = gemMonsterMeta(id as GemMonsterId);
  return { id: meta.id, family: "monster" as const, labelHe: meta.labelHe };
}
