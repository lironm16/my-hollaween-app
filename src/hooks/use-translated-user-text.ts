"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import type { UserContentTranslatePurpose } from "@/lib/user-content-translate-purpose";
import { requestUserContentTranslation } from "@/lib/user-content-translate-client";

/** Community-submitted string, optionally machine-translated when settings allow. */
export function useTranslatedUserText(
  source: string,
  options?: { purpose?: UserContentTranslatePurpose },
): string {
  const { translateUserContent } = useLocale();
  const purpose = options?.purpose ?? "prose";
  const [display, setDisplay] = useState(source);

  useEffect(() => {
    if (!translateUserContent) {
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
    void requestUserContentTranslation(trimmed, "en", purpose).then((translated) => {
      if (!cancelled) setDisplay(translated);
    });
    return () => {
      cancelled = true;
    };
  }, [source, translateUserContent, purpose]);

  return display;
}
