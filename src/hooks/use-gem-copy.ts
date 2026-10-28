"use client";

import { useMemo } from "react";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import { gemPetLabel } from "@/lib/gem-monsters";
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
      petLabel(monsterId: string) {
        return gemPetLabel(monsterId, locale);
      },
      clusterSessionTitle(total: number, newCount: number) {
        if (total === 1) {
          return newCount > 0 ? g.clusterSummarySingleNew : g.clusterSummarySingleRepeat;
        }
        if (newCount > 0) {
          return fmt(g.clusterSummaryNew, { total: String(total), newCount: String(newCount) });
        }
        return fmt(g.clusterSummaryRepeat, { total: String(total) });
      },
    };
  }, [locale]);
}
