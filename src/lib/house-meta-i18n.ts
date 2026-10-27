import { formatMessage } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { formatHouseAddedAt } from "@/lib/house-meta";
import type { PublicHouse } from "@/lib/types";

export function houseAddedMetaLineLocalized(
  locale: AppLocale,
  house: Pick<PublicHouse, "createdAt"> & { addedBy?: string | null },
  options?: { showSubmitterName?: boolean },
): string | null {
  const when = house.createdAt ? formatHouseAddedAt(house.createdAt, locale) : "";
  const who = options?.showSubmitterName ? house.addedBy?.trim() : "";
  if (who && when) {
    return formatMessage(translate(locale, "houseMeta.addedByWhoWhen"), { who, when });
  }
  if (who) {
    return formatMessage(translate(locale, "houseMeta.addedByWho"), { who });
  }
  if (when) {
    return formatMessage(translate(locale, "houseMeta.added"), { when });
  }
  return null;
}
