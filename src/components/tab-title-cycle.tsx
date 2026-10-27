"use client";

import { useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";
import { config } from "@/lib/config";
import { translate } from "@/lib/i18n/translate";

const INTERVAL_MS = 2200;

export function TabTitleCycle() {
  const { locale } = useLocale();

  useEffect(() => {
    const localizedTitle = translate(locale, "brand.tabTitle");
    const words =
      locale === "he"
        ? config.titleWords
        : ([localizedTitle] as readonly string[]);

    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.title = localizedTitle;
      return;
    }

    let index = 0;
    document.title = words[0] ?? localizedTitle;
    const timer = window.setInterval(() => {
      index = (index + 1) % words.length;
      document.title = words[index] ?? localizedTitle;
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      document.title = localizedTitle;
    };
  }, [locale]);

  return null;
}
