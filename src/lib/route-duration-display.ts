import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { translate } from "@/lib/i18n/translate";

export type RouteDurationChip = { value: string; label: string };

/** Map summary clock chip — minutes only under 1 hour, otherwise hours + remainder minutes. */
export function formatRouteDurationChip(
  totalMinutes: number,
  locale: AppLocale = "he",
): RouteDurationChip {
  const approx = translate(locale, "mapStats.approx");
  const minutesLabel = translate(locale, "mapStats.minutes");
  const hoursLabel = translate(locale, "mapStats.hours");
  const m = Math.max(0, Math.round(totalMinutes));

  if (m < 60) {
    return { value: `${approx}${m}`, label: minutesLabel };
  }

  const hours = Math.floor(m / 60);
  const remainder = m % 60;
  if (remainder === 0) {
    return { value: `${approx}${hours}`, label: hoursLabel };
  }

  return {
    value: `${approx}${hours}`,
    label: formatMessage(translate(locale, "mapStats.hoursAndMinutes"), {
      minutes: String(remainder),
    }),
  };
}

/** Inline phrase for route share / summary lines (e.g. כ־9 שע׳ 16 דק׳). */
export function formatRouteDurationPhrase(totalMinutes: number, locale: AppLocale = "he"): string {
  const { value, label } = formatRouteDurationChip(totalMinutes, locale);
  return `${value} ${label}`.replace(/\s+/g, " ").trim();
}
