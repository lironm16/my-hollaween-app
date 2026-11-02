import { resolveAddressLanguagePair } from "@/lib/address-translate.server";
import {
  googleTranslateApiKey,
  googleTranslateConfigured,
  googleTranslateTexts,
} from "@/lib/google-translate.server";
import type { House, HouseI18n } from "@/lib/types";

/** Address only — visitor text stays user-authored (client translate optional). Forward-only on save. */
export async function syncHouseBilingualContent(house: House): Promise<House> {
  if (!googleTranslateConfigured()) return house;

  let addressEn: string | undefined;
  const addressPair = await resolveAddressLanguagePair(house.address);
  if (addressPair) {
    house = { ...house, address: addressPair.he };
    addressEn = addressPair.en;
  } else {
    try {
      const [en] = await googleTranslateTexts([house.address.trim()], "en", googleTranslateApiKey());
      addressEn = en?.trim() || undefined;
    } catch {
      addressEn = undefined;
    }
  }

  if (!addressEn) return house;

  const i18n: HouseI18n = {
    en: { address: addressEn },
    updatedAt: new Date().toISOString(),
  };
  return { ...house, i18n };
}
