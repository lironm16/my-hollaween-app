"use client";

import { useAppNow } from "@/hooks/use-app-clock";
import { cn } from "@/lib/utils";
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
import type { TreatStock, TreatId, VisitState } from "@/lib/types";

const BANNER = "rounded-lg px-3 py-2 text-sm font-medium leading-snug break-words";
const CLOSED_TONE = "bg-red-900/80 text-red-50";

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
}) {
  const rehearsed = useAppNow();
  const clock = now ?? rehearsed;

  if (effectiveVisit(house) === "closed" || isHoursNightOver(house, clock)) {
    return (
      <p className={cn(BANNER, CLOSED_TONE, className)}>הבית סגור</p>
    );
  }

  if (isOwnerFrozen(house, clock.getTime())) {
    return (
      <p className={cn(BANNER, "bg-slate-900/70 text-slate-100", className)}>
        הפסקה עכשיו
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
      <p className={cn(BANNER, CLOSED_TONE, className)}>נגמר המלאי</p>
    );
  }

  const closesAt = closingSoonAt(house, clock);
  if (closesAt) {
    return (
      <p className={cn(BANNER, "bg-orange-950/55 text-orange-200", className)}>
        נסגר בקרוב ב־{closesAt}
      </p>
    );
  }
  const opensSoonAt = openingSoonAt(house, clock);
  if (opensSoonAt) {
    return (
      <p className={cn(BANNER, "bg-cyan-950/55 text-cyan-100", className)}>
        נפתח בקרוב ב־{opensSoonAt}
      </p>
    );
  }
  const breakOpens = onBreakAt(house, clock);
  if (breakOpens) {
    return (
      <p className={cn(BANNER, "bg-slate-900/70 text-slate-100", className)}>
        הפסקה עכשיו — נפתח שוב ב־{breakOpens}
      </p>
    );
  }

  const status = hoursStatus(house, clock);
  if (
    status.kind === "unknown" ||
    status.kind === "open" ||
    status.kind === "closedVisit" ||
    status.kind === "opensSoon" ||
    status.kind === "closingSoon"
  ) {
    return null;
  }
  if (status.kind === "beforeEvent") {
    return (
      <p className={cn(BANNER, "bg-sky-950/50 text-sky-100", className)}>
        עדיין סגור — נפתח ב־{status.dateLabel} בשעה {status.opensAt}
      </p>
    );
  }
  if (status.kind === "before") {
    return (
      <p className={cn(BANNER, "bg-sky-950/50 text-sky-100", className)}>
        עדיין סגור — נפתח ב־{status.opensAt}
      </p>
    );
  }
  if (status.kind === "between") {
    return (
      <p className={cn(BANNER, "bg-sky-950/50 text-sky-100", className)}>
        הפסקה עכשיו — נפתח שוב ב־{status.opensAt}
      </p>
    );
  }
  return (
    <p className={cn(BANNER, CLOSED_TONE, className)}>הבית סגור</p>
  );
}
