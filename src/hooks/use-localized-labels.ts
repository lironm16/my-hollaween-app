"use client";

import { useMemo } from "react";
import type { CandyTone } from "@/lib/types";
import type { DecorLevel, HouseKind, ScareLevel } from "@/lib/types";
import { useLocale } from "@/hooks/use-locale";

export function useLocalizedLabels() {
  const { t } = useLocale();

  return useMemo(() => {
    const scareShort: Record<ScareLevel, string> = {
      mild: t("labels.scareMild"),
      medium: t("labels.scareMedium"),
      spicy: t("labels.scareSpicy"),
    };
    const decorShort: Record<DecorLevel, string> = {
      none: t("labels.decorNone"),
      mild: scareShort.mild,
      medium: scareShort.medium,
      heavy: scareShort.spicy,
    };
    const houseKindLabels: Record<HouseKind, string> = {
      house: t("labels.houseKindHouse"),
      poi: t("labels.houseKindPoi"),
    };
    const candyToneLabels: Record<CandyTone, string> = {
      none: t("labels.candyNone"),
      plenty: t("labels.candyPlenty"),
      low: t("labels.candyLow"),
      out: t("labels.candyOut"),
    };
    const candyTones = (["none", "plenty", "low", "out"] as CandyTone[]).map((id) => ({
      id,
      label: candyToneLabels[id],
    }));
    return { scareShort, decorShort, houseKindLabels, candyTones, candyToneLabels };
  }, [t]);
}
