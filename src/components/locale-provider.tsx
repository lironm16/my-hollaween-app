"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  APP_LOCALE_STORAGE_KEY,
  applyDocumentLocale,
  defaultAppLocale,
  readStoredAppLocale,
  writeStoredAppLocale,
  type AppLocale,
  localeDirection,
} from "@/lib/i18n/locale";
import {
  readTranslateUserContent,
  writeTranslateUserContent,
} from "@/lib/i18n/user-content-prefs";
import { translate } from "@/lib/i18n/translate";

export const LOCALE_CHANGED_EVENT = "hw-locale-changed";
export const USER_CONTENT_PREFS_CHANGED_EVENT = "hw-user-content-prefs-changed";

type LocaleContextValue = {
  locale: AppLocale;
  dir: "ltr" | "rtl";
  setLocale: (next: AppLocale) => void;
  /** When true and interface is English, neighbor-submitted text may be machine-translated. */
  translateUserContent: boolean;
  setTranslateUserContent: (on: boolean) => void;
  t: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readBootLocale(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const lang = document.documentElement.lang;
  if (lang === "en" || lang === "he") return lang;
  return null;
}

function initialClientLocale(): AppLocale {
  return readStoredAppLocale() ?? readBootLocale() ?? defaultAppLocale();
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    typeof window === "undefined" ? defaultAppLocale() : initialClientLocale(),
  );
  const [translateUserContent, setTranslateUserContentState] = useState(() =>
    typeof window === "undefined" ? false : readTranslateUserContent(),
  );

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    writeStoredAppLocale(next);
    applyDocumentLocale(next);
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGED_EVENT, { detail: next }));
  }, []);

  const setTranslateUserContent = useCallback((on: boolean) => {
    setTranslateUserContentState(on);
    writeTranslateUserContent(on);
    window.dispatchEvent(new CustomEvent(USER_CONTENT_PREFS_CHANGED_EVENT, { detail: on }));
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDirection(locale),
      setLocale,
      translateUserContent,
      setTranslateUserContent,
      t: (path: string) => translate(locale, path),
    }),
    [locale, setLocale, translateUserContent, setTranslateUserContent],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }
  return ctx;
}

export { APP_LOCALE_STORAGE_KEY };
