"use client";

import { useMemo } from "react";
import { useLocale } from "@/hooks/use-locale";
import { formatHelp, helpVars } from "@/lib/i18n/help-format";
import { messagesForLocale } from "@/lib/i18n/translate";

export function useHelpMessages() {
  const { locale } = useLocale();
  return useMemo(() => {
    const help = messagesForLocale(locale).help;
    const vars = helpVars(locale);
    const fh = (template: string, extra?: Record<string, string>) => formatHelp(locale, template, extra);
    return { help, locale, vars, fh };
  }, [locale]);
}
