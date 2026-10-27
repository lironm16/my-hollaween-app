import { formatMessage } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { clusterIsSchoolCampus } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

function t(locale: AppLocale, path: string) {
  return translate(locale, path);
}

export function localizedClusterOverviewSubtitle(
  locale: AppLocale,
  houses: readonly Pick<PublicHouse, "address">[],
): string {
  const count = houses.length;
  if (clusterIsSchoolCampus(houses)) {
    return count === 1
      ? t(locale, "cluster.overviewSchoolOne")
      : formatMessage(t(locale, "cluster.overviewSchoolMany"), { count: String(count) });
  }
  return count === 1
    ? t(locale, "cluster.overviewAddressOne")
    : formatMessage(t(locale, "cluster.overviewAddressMany"), { count: String(count) });
}

export function localizedClusterPinAriaLabel(
  locale: AppLocale,
  houses: readonly Pick<PublicHouse, "address">[],
): string {
  const count = houses.length;
  if (clusterIsSchoolCampus(houses)) {
    return count === 1
      ? t(locale, "cluster.pinSchoolOne")
      : formatMessage(t(locale, "cluster.pinSchoolMany"), { count: String(count) });
  }
  return count === 1
    ? t(locale, "cluster.pinOne")
    : formatMessage(t(locale, "cluster.pinMany"), { count: String(count) });
}
