import { parseStreetAndNumber } from "@/lib/address-text";
import type { AppLocale } from "@/lib/i18n/locale";

/** Curated English street names for event neighborhoods (stored Hebrew in house.address). */
const STREET_NAME_EN: Record<string, string> = {
  "אבא הלל סילבר": "Abba Hillel Silver St",
  אביגיל: "Avigael St",
  "אחימאיר אבא": "Abba Ahimeir St",
  "אבא אחימאיר": "Abba Ahimeir St",
  אחימאיר: "Ahimeir St",
  איתמר: "Itamar St",
  אסף: "Asaf St",
  ארניה: "Arnia St",
  "האלוף אלברט מנדלר": "Gen. Albert Mendler St",
  ביאליק: "Bialik St",
  'ביל"ו': "Bilu St",
  "זבוטינסקי": "Jabotinsky St",
  "זאב זבוטינסקי": "Jabotinsky St",
  "זאב ז'בוטינסקי": "Jabotinsky St",
  "ז'בוטינסקי": "Jabotinsky St",
  הברוש: "HaBrosh St",
  הגליל: "HaGalil St",
  הדולב: "HaDolev St",
  הדקל: "HaDekel St",
  הזית: "HaZayit St",
  המרגנית: "HaMarganit St",
  מרגנית: "HaMarganit St",
  הנרקיס: "HaNarkis St",
  "העם הצרפתי": "HaAm HaTzarfati St",
  "שדרות העם הצרפתי": "Sderot HaAm HaTzarfati",
  העמל: "HaAmal St",
  הערמונים: "HaArmonim St",
  השושנים: "Sderot HaShoshanim",
  "שדרות השושנים": "Sderot HaShoshanim",
  "שדרת השושנים": "Sderot HaShoshanim",
  השקדיה: "HaShkediya St",
  שקדיה: "HaShkediya St",
  הצלע: "HaTsela St",
  התקווה: "HaTikva St",
  "חביבה רייק": "Haviva Reik St",
  חרוזים: "Charuzim St",
  יהודית: "Yehudit St",
  יואב: "Yoav St",
  יוהנה: "Yohanna St",
  יעלים: "Ya'alim St",
  מוזס: "Mozes St",
  Mozes: "Mozes St",
  נחליאלי: "Nachlieli St",
  ניצנים: "Nitsanim St",
  נרקיסים: "Narkisim St",
  "שדרת הנרקיסים": "Narkisim Blvd",
  סוקולוב: "Sokolov St",
  "פרנק אנה": "Anna Frank St",
  קריניצי: "Krinitsi Blvd",
  "שדרת קריניצי": "Krinitsi Blvd",
  "שדרות קריניצי": "Krinitsi Blvd",
  רוקח: "Rokach St",
  רות: "Ruth St",
  "רחובות הנהר": "Rehovot HaNahar",
  רמבה: "Rambam St",
  רננים: "Rananim St",
  'רש"י': "Rashi St",
};

function normalizeStreetLookupKey(road: string): string {
  let norm = road.replace(/\s+/g, " ").trim();
  norm = norm.replace(/^רח(?:וב|\.)?\s+/u, "").trim();
  norm = norm.replace(/^אבא\s+/u, "").replace(/\s+אבא\s*$/u, "").trim();
  if (norm.endsWith(" אבא")) {
    norm = `אבא ${norm.slice(0, -4).trim()}`;
  }
  return norm;
}

function streetLookupKeys(road: string): string[] {
  const trimmed = road.trim();
  const keys = new Set<string>([trimmed, normalizeStreetLookupKey(trimmed)]);
  const withoutSderot = trimmed.replace(/^(שדרות|שדרת)\s+/u, "").trim();
  if (withoutSderot !== trimmed) {
    keys.add(withoutSderot);
    keys.add(normalizeStreetLookupKey(withoutSderot));
  }
  return [...keys];
}

export function localizedStreetName(locale: AppLocale, road: string): string {
  const trimmed = road.trim();
  if (!trimmed || locale === "he") return trimmed;
  for (const key of streetLookupKeys(trimmed)) {
    const hit = STREET_NAME_EN[key];
    if (hit) return hit;
  }
  return trimmed;
}

/** Street line from house.address (may include number / campus name). */
export function localizedStreetLine(locale: AppLocale, streetLine: string): string {
  const trimmed = streetLine.trim();
  if (!trimmed || locale === "he") return trimmed;
  const parsed = parseStreetAndNumber(trimmed);
  const road = parsed.road.trim();
  if (!road) return trimmed;
  const enRoad = localizedStreetName(locale, road);
  if (parsed.num) return `${enRoad} ${parsed.num}`;
  return enRoad;
}
