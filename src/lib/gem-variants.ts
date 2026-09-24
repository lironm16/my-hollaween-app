import type { HouseTheme, PublicHouse } from "@/lib/types";

export const GEM_FAMILIES = [
  "pumpkin",
  "ghost",
  "witch",
  "bat",
  "spider",
  "skull",
  "cauldron",
  "candy",
  "cat",
  "vampire",
  "skeleton",
  "monster",
] as const;

export type GemFamily = (typeof GEM_FAMILIES)[number];

/** @deprecated Use GemVariantId — kept for achievement filters. */
export type GemType = GemFamily;

export const GEM_VARIANTS = [
  { id: "pumpkin-classic", family: "pumpkin", labelHe: "דלעת מוארת" },
  { id: "pumpkin-tall", family: "pumpkin", labelHe: "דלעת גבוהה" },
  { id: "pumpkin-grin", family: "pumpkin", labelHe: "דלעת חייכנית" },
  { id: "ghost-sheet", family: "ghost", labelHe: "רוח לבנה" },
  { id: "ghost-wisp", family: "ghost", labelHe: "רוח זוהרת" },
  { id: "ghost-boo", family: "ghost", labelHe: "רוח בooo" },
  { id: "witch-hat", family: "witch", labelHe: "כובע מכשפה" },
  { id: "witch-broom", family: "witch", labelHe: "מטאטא מכשפה" },
  { id: "bat-wing", family: "bat", labelHe: "עטלף" },
  { id: "bat-moon", family: "bat", labelHe: "עטלף לילי" },
  { id: "spider-web", family: "spider", labelHe: "עכביש ברשת" },
  { id: "spider-crawl", family: "spider", labelHe: "עכביש זוחל" },
  { id: "skull-glow", family: "skull", labelHe: "גולגולת" },
  { id: "skull-bone", family: "skull", labelHe: "גולגולת עצמות" },
  { id: "cauldron-bubble", family: "cauldron", labelHe: "קדרה" },
  { id: "candy-corn", family: "candy", labelHe: "ממתקים" },
  { id: "candy-lollipop", family: "candy", labelHe: "סוכריה על מקל" },
  { id: "cat-sneak", family: "cat", labelHe: "חתול שחור" },
  { id: "cat-arched", family: "cat", labelHe: "חתול זוחל" },
  { id: "vampire-cape", family: "vampire", labelHe: "ערפד" },
  { id: "skeleton-rib", family: "skeleton", labelHe: "שלד" },
  { id: "monster-eye", family: "monster", labelHe: "מפלצת" },
] as const;

export type GemVariantId = (typeof GEM_VARIANTS)[number]["id"];

const VARIANT_BY_ID = new Map(GEM_VARIANTS.map((v) => [v.id, v]));

const THEME_FAMILIES: Record<HouseTheme, GemFamily[]> = {
  pumpkin: ["pumpkin", "candy"],
  ghost: ["ghost", "bat"],
  witch: ["witch", "cauldron", "cat"],
  vampire: ["vampire", "bat", "skull"],
  skeleton: ["skeleton", "skull"],
  monster: ["monster", "spider"],
  haunted: ["ghost", "bat", "skull"],
  candy: ["candy", "pumpkin"],
  spider: ["spider", "monster"],
  blackCat: ["cat", "bat", "witch"],
};

const POI_FAMILIES: GemFamily[] = ["candy", "cauldron", "pumpkin", "cat"];

const ALL_FAMILIES: GemFamily[] = [...GEM_FAMILIES];

function hashHouseId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function familiesForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">): GemFamily[] {
  if (house.kind === "poi") return POI_FAMILIES;
  return THEME_FAMILIES[house.theme] ?? ALL_FAMILIES;
}

export function gemVariantForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">): GemVariantId {
  const families = new Set(familiesForHouse(house));
  const pool = GEM_VARIANTS.filter((v) => families.has(v.family));
  const list = pool.length > 0 ? pool : GEM_VARIANTS;
  const idx = hashHouseId(house.id) % list.length;
  return list[idx]!.id;
}

export function gemVariantMeta(variantId: string) {
  return VARIANT_BY_ID.get(variantId as GemVariantId) ?? GEM_VARIANTS[0]!;
}

export function gemLabelHe(variantId: string) {
  return gemVariantMeta(variantId).labelHe;
}

export function gemFamilyForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">): GemFamily {
  return gemVariantMeta(gemVariantForHouse(house)).family;
}

/** @deprecated Use gemVariantForHouse / gemFamilyForHouse. */
export function gemTypeForHouse(house: Pick<PublicHouse, "id" | "theme" | "kind">): GemFamily {
  return gemFamilyForHouse(house);
}

export function countGemEligibleHouses(houses: PublicHouse[]) {
  return houses.length;
}
