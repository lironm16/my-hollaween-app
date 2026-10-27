"use client";

import { useMemo } from "react";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";

export function useGemCopy() {
  const { locale } = useLocale();
  return useMemo(() => {
    const g = messagesForLocale(locale).gem;
    const fmt = (template: string, vars: Record<string, string>) => formatMessage(template, vars);
    return {
      g,
      foundOnScreenBanner(repeatVisit: boolean, petName: string, isNewGemType: boolean): string {
        if (isNewGemType && !repeatVisit) return fmt(g.foundOnScreenNew, { name: petName });
        return fmt(g.foundOnScreenRepeat, { name: petName });
      },
      panelApproach(m: number) {
        return fmt(g.panelApproach, { m: String(m) });
      },
      panelOpenCamera(m: number) {
        return fmt(g.panelOpenCamera, { m: String(m) });
      },
      anchorResetAll(n: number) {
        return fmt(g.anchorResetAll, { n: String(n) });
      },
      bearingAria(label: string, distance?: string) {
        return fmt(g.bearingAria, { label, distance: distance ?? "" });
      },
      adminDistFromSaved(m: number) {
        return fmt(g.adminDistFromSaved, { m: String(m) });
      },
    };
  }, [locale]);
}
