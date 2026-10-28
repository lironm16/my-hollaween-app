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
  המרגנית: "HaMarganit St",
  "העם הצרפתי": "HaAm HaTzarfati St",
  "שדרות העם הצרפתי": "Sderot HaAm HaTzarfati",
  העמל: "HaAmal St",
  הערמונים: "HaArmonim St",
  הצלע: "HaTsela St",
  "ז'בוטינסקי": "Jabotinsky St",
  "חביבה רייק": "Haviva Reik St",
  חרוזים: "Charuzim St",
  יהודית: "Yehudit St",
  יואב: "Yoav St",
  יוהנה: "Yohanna St",
  יעלים: "Ya'alim St",
  סוקולוב: "Sokolov St",
  "פרנק אנה": "Anna Frank St",
  רוקח: "Rokach St",
  רות: "Ruth St",
  "רחובות הנהר": "Rehovot HaNahar",
  רמבה: "Rambam St",
  רננים: "Rananim St",
  'רש"י': "Rashi St",
  מוזס: "Mozes St",
  Mozes: "Mozes St",
  קריניצי: "Krinitsi Blvd",
  "שדרת קריניצי": "Krinitsi Blvd",
  נרקיסים: "Narkisim St",
  "שדרת הנרקיסים": "Narkisim Blvd",
};

function normalizeStreetLookupKey(road: string): string {
  let norm = road.replace(/\s+/g, " ").trim();
  norm = norm.replace(/^אבא\s+/u, "").replace(/\s+אבא\s*$/u, "").trim();
  if (norm.endsWith(" אבא")) {
    norm = `אבא ${norm.slice(0, -4).trim()}`;
  }
  return norm;
}

export function localizedStreetName(locale: AppLocale, road: string): string {
  const trimmed = road.trim();
  if (!trimmed || locale === "he") return trimmed;
  const direct = STREET_NAME_EN[trimmed];
  if (direct) return direct;
  const norm = normalizeStreetLookupKey(trimmed);
  return STREET_NAME_EN[norm] ?? trimmed;
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
