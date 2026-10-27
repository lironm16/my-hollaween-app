import type { LocationStatus } from "@/hooks/use-user-location";
import type { AppLocale } from "@/lib/i18n/locale";
import { messagesForLocale } from "@/lib/i18n/translate";

/** User can still tap **My location** — only hard blocks are denied API / no geolocation. */
export function geoCanPromptLocation(status: LocationStatus): boolean {
  return status !== "denied" && status !== "unavailable";
}

export function geoLocationHint(locale: AppLocale, status: LocationStatus): string {
  const g = messagesForLocale(locale).geoAccess;
  if (status === "denied") return g.hintDenied;
  if (status === "error") return g.hintError;
  return g.hintGps;
}

export function geoLocationFailureToast(
  locale: AppLocale,
  status: LocationStatus,
  options?: { installedApp?: boolean },
): string | null {
  const g = messagesForLocale(locale).geoAccess;
  if (status === "denied") {
    return options?.installedApp ? g.toastDeniedApp : g.toastDeniedBrowser;
  }
  if (status === "unavailable") return g.toastUnavailable;
  if (status === "error") return g.toastError;
  return null;
}

export function geoLocationHintHe(status: LocationStatus): string {
  return geoLocationHint("he", status);
}

export function geoLocationFailureToastHe(
  status: LocationStatus,
  options?: { installedApp?: boolean },
): string | null {
  return geoLocationFailureToast("he", status, options);
}
