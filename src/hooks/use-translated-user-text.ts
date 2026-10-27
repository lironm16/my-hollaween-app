"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { requestUserContentTranslation } from "@/lib/user-content-translate-client";

/** Community-submitted string, optionally machine-translated when settings allow. */
export function useTranslatedUserText(source: string): string {
  const { locale, translateUserContent } = useLocale();
  const [display, setDisplay] = useState(source);

  useEffect(() => {
    if (!translateUserContent || locale !== "en") {
      setDisplay(source);
      return;
    }
    const trimmed = source.trim();
    if (!trimmed) {
      setDisplay(source);
      return;
    }
    let cancelled = false;
    setDisplay(source);
    void requestUserContentTranslation(trimmed, "en").then((translated) => {
      if (!cancelled) setDisplay(translated);
    });
    return () => {
      cancelled = true;
    };
  }, [source, translateUserContent, locale]);

  return display;
}
