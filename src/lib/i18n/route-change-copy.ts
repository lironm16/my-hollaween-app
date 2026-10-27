import type { RouteStatusChangeEntry } from "@/lib/route-changes";
import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { translate } from "@/lib/i18n/translate";

function t(locale: AppLocale, path: string) {
  return translate(locale, path);
}

export function localizedWhyRemovedFromRoute(
  locale: AppLocale,
  code:
    | "skipped"
    | "visited"
    | "closed"
    | "onBreak"
    | "notYetOpen"
    | "betweenWindows"
    | "afterHours"
    | "closedTonight"
    | "notOpenNow"
    | "notFitRoute"
    | "notInFilter"
    | "filterMismatch",
  filterDetail?: string,
): string {
  if (code === "filterMismatch" && filterDetail) {
    return formatMessage(t(locale, "routeChange.removed.filterMismatch"), { detail: filterDetail });
  }
  return t(locale, `routeChange.removed.${code}`);
}

export function localizedWhyAddedToRoute(
  locale: AppLocale,
  code: "reopened" | "backFromBreak" | "backActive" | "openNow",
): string {
  return t(locale, `routeChange.added.${code}`);
}

export function localizedRouteChangeBannerMessage(
  locale: AppLocale,
  changes: RouteStatusChangeEntry[],
  fromBackground = false,
): string {
  const prefix = fromBackground ? t(locale, "routeChanges.bannerFromBackground") : "";
  if (changes.length === 1) {
    const only = changes[0]!;
    return `${prefix}${only.name} — ${only.reason}`;
  }
  return `${prefix}${formatMessage(t(locale, "routeChanges.bannerMany"), {
    count: String(changes.length),
  })}`;
}
