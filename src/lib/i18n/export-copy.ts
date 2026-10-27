import { formatMessage } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

function t(locale: AppLocale, path: string) {
  return translate(locale, path);
}

export function localizedExportHouseCountMessage(
  locale: AppLocale,
  exportCount: number,
  totalInSet: number,
  activeFilterCount: number,
) {
  if (exportCount === 0) {
    return t(locale, "houseExport.countNone");
  }
  if (exportCount === totalInSet && activeFilterCount === 0) {
    return formatMessage(t(locale, "houseExport.countAll"), { count: String(exportCount) });
  }
  return formatMessage(t(locale, "houseExport.countPartial"), {
    exportCount: String(exportCount),
    totalInSet: String(totalInSet),
  });
}

export function exportFormatLabel(locale: AppLocale, format: "xlsx" | "txt") {
  return format === "xlsx" ? t(locale, "houseExport.formatXlsx") : t(locale, "houseExport.formatTxt");
}
