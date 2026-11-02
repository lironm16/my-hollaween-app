import { resolveAddressLanguagePair } from "@/lib/address-translate.server";
import {
  googleTranslateApiKey,
  googleTranslateConfigured,
  googleTranslateTexts,
} from "@/lib/google-translate.server";
import type { House, HouseI18n, HouseLocaleSnapshot } from "@/lib/types";

function nonEmpty(value: string | undefined | null) {
  const t = value?.trim();
  return t ? t : undefined;
}

async function translateFieldToEn(text: string): Promise<string | undefined> {
  if (!googleTranslateConfigured()) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    const [en] = await googleTranslateTexts([trimmed], "en", googleTranslateApiKey());
    return nonEmpty(en);
  } catch {
    return undefined;
  }
}

/** Generate English snapshot + canonical Hebrew address (forward-only on save). */
export async function syncHouseBilingualContent(house: House): Promise<House> {
  if (!googleTranslateConfigured()) return house;

  const en: HouseLocaleSnapshot = { ...(house.i18n?.en ?? {}) };
  const addressPair = await resolveAddressLanguagePair(house.address);
  if (addressPair) {
    house = { ...house, address: addressPair.he };
    en.address = addressPair.en;
  } else {
    en.address = (await translateFieldToEn(house.address)) ?? en.address;
  }

  en.name = (await translateFieldToEn(house.name)) ?? en.name;
  en.description = (await translateFieldToEn(house.description)) ?? en.description;
  en.arrival = (await translateFieldToEn(house.arrival)) ?? en.arrival;
  en.notes = (await translateFieldToEn(house.notes)) ?? en.notes;

  const hasAny = Object.values(en).some(Boolean);
  if (!hasAny) return house;

  const i18n: HouseI18n = {
    en,
    updatedAt: new Date().toISOString(),
  };
  return { ...house, i18n };
}
