"use client";

import { useAppNow } from "@/hooks/use-app-clock";
import { cn } from "@/lib/utils";
import { ClockTime } from "@/components/clock-time";
import {
  closingSoonAt,
  hoursStatus,
  isHoursNightOver,
  onBreakAt,
  openingSoonAt,
} from "@/lib/hours";
import {
  candyLevel,
  effectiveVisit,
  isOwnerFrozen,
  markedCandy,
} from "@/lib/house-state";
import { useCatalogRemoved } from "@/hooks/use-catalog-removed";
import { useLocale } from "@/hooks/use-locale";
import type { TreatStock, TreatId, VisitState } from "@/lib/types";

const BANNER = "rounded-lg px-3 py-2 text-base font-medium leading-snug break-words";
const CLOSED_TONE = "bg-red-900/80 text-red-50";
const CATALOG_REMOVED_TONE = "w-fit max-w-full bg-red-950/85 text-red-50";

export function HoursStatusBanner({
  house,
  className,
  now,
}: {
  house: {
    id?: string;
    openFrom?: string;
    openTo?: string;
    openFrom2?: string;
    openTo2?: string;
    openHours?: { from: string; to: string }[];
    visit?: VisitState;
    soldOut?: boolean;
    adminFrozen?: boolean;
    ownerFrozenUntil?: string | null;
    treats?: TreatId[];
    treatStock?: TreatStock;
  };
  className?: string;
  /** Override clock for previews / tests. */
  now?: Date;
  /** List cards: skip pre-event banners when hours already appear in the card meta. */
  compact?: boolean;
}) {
  const rehearsed = useAppNow();
  const clock = now ?? rehearsed;
  const catalogRemoved = useCatalogRemoved(house.id);
  const { t } = useLocale();

  if (catalogRemoved) {
    return (
      <p className={cn(BANNER, CATALOG_REMOVED_TONE, className)} role="status">
        {t("banners.removedFromMap")}
      </p>
    );
  }

  if (effectiveVisit(house) === "closed" || isHoursNightOver(house, clock)) {
    return (
      <p className={cn(BANNER, CLOSED_TONE, className)}>{t("banners.houseClosed")}</p>
    );
  }

  if (isOwnerFrozen(house, clock.getTime())) {
    return (
      <p className={cn(BANNER, "bg-red-950/85 text-red-50", className)}>
        {t("banners.onBreakNow")}
      </p>
    );
  }

  const withTreats = { treats: house.treats ?? [], treatStock: house.treatStock };
  if (
    effectiveVisit(house) === "come" &&
    markedCandy(withTreats) &&
    candyLevel(withTreats) === "out"
  ) {
    return (
      <p className={cn(BANNER, CLOSED_TONE, className)}>{t("banners.outOfStock")}</p>
    );
  }

  const closesAt = closingSoonAt(house, clock);
  if (closesAt) {
    return (
      <p className={cn(BANNER, "bg-orange-950/55 text-orange-200", className)}>
        {t("banners.closingSoonBefore")}
        <ClockTime>{closesAt}</ClockTime>
      </p>
    );
  }
  const opensSoonAt = openingSoonAt(house, clock);
  if (opensSoonAt) {
    return (
      <p className={cn(BANNER, "bg-cyan-950/55 text-cyan-100", className)}>
        {t("banners.openingSoonBefore")}
        <ClockTime>{opensSoonAt}</ClockTime>
      </p>
    );
  }
  const breakOpens = onBreakAt(house, clock);
  if (breakOpens) {
    return (
      <p className={cn(BANNER, "bg-red-950/85 text-red-50", className)}>
        {t("banners.breakUntilBefore")}
        <ClockTime>{breakOpens}</ClockTime>
      </p>
    );
  }

  const status = hoursStatus(house, clock);
  if (
    status.kind === "unknown" ||
    status.kind === "open" ||
    status.kind === "closedVisit" ||
    status.kind === "opensSoon" ||
    status.kind === "closingSoon" ||
    status.kind === "beforeEvent" ||
    status.kind === "before"
  ) {
    return null;
  }
  if (status.kind === "between") {
    return (
      <p className={cn(BANNER, "bg-red-950/85 text-red-50", className)}>
        {t("banners.breakUntilBefore")}
        <ClockTime>{status.opensAt}</ClockTime>
      </p>
    );
  }
  return (
    <p className={cn(BANNER, CLOSED_TONE, className)}>{t("banners.houseClosed")}</p>
  );
}
