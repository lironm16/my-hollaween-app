import { parseStreetAndNumber } from "@/lib/address-text";
import type { AppLocale } from "@/lib/i18n/locale";
import { STREET_NAME_EN } from "@/lib/i18n/event-street-labels-data";

function normalizeStreetLookupKey(road: string): string {
  let norm = road.replace(/\s+/g, " ").trim();
  norm = norm.replace(/^רח(?:וב|\.)?\s+/u, "").trim();
  norm = norm.replace(/^אבא\s+/u, "").replace(/\s+אבא\s*$/u, "").trim();
  if (norm.endsWith(" אבא")) {
    norm = `אבא ${norm.slice(0, -4).trim()}`;
  }
  return norm;
}

export function streetLookupKeys(road: string): string[] {
  const trimmed = road.trim();
  const keys = new Set<string>([trimmed, normalizeStreetLookupKey(trimmed)]);
  const withoutSderot = trimmed.replace(/^(שדרות|שדרת)\s+/u, "").trim();
  if (withoutSderot !== trimmed) {
    keys.add(withoutSderot);
    keys.add(normalizeStreetLookupKey(withoutSderot));
  }
  return [...keys];
}

export function hasEnglishStreetMapping(road: string): boolean {
  const trimmed = road.trim();
  if (!trimmed) return true;
  return streetLookupKeys(trimmed).some((key) => STREET_NAME_EN[key] != null);
}

export function englishStreetLabelForRoad(road: string): string | null {
  for (const key of streetLookupKeys(road.trim())) {
    const hit = STREET_NAME_EN[key];
    if (hit) return hit;
  }
  return null;
}

export function localizedStreetName(locale: AppLocale, road: string): string {
  const trimmed = road.trim();
  if (!trimmed || locale === "he") return trimmed;
  return englishStreetLabelForRoad(trimmed) ?? trimmed;
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
