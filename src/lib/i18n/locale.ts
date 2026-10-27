export const APP_LOCALE_STORAGE_KEY = "hw-app-locale";

export const APP_LOCALES = ["en", "he"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "en" || value === "he";
}

/** Default when the user has not chosen a language (not persisted). */
export function resolveDefaultAppLocale(input?: {
  nodeEnv?: string;
  defaultLocaleEnv?: string;
}): AppLocale {
  const nodeEnv = input?.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "development") return "en";
  const fromEnv = input?.defaultLocaleEnv ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  if (fromEnv === "en" || fromEnv === "he") return fromEnv;
  return "he";
}

export function defaultAppLocale(): AppLocale {
  return resolveDefaultAppLocale();
}

export function localeDirection(locale: AppLocale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}

export function readStoredAppLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
    return isAppLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredAppLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* quota / private mode */
  }
}

export function applyDocumentLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = localeDirection(locale);
}
