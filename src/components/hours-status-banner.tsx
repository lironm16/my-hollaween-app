import { cn } from "@/lib/utils";
import {
  closingSoonAt,
  formatHoursLabel,
  hoursStatus,
  onBreakAt,
  openingSoonAt,
} from "@/lib/hours";
import type { VisitState } from "@/lib/types";

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
  };
  className?: string;
  /** Override clock for previews / tests. */
  now?: Date;
}) {
  const clock = now ?? new Date();
  const closesAt = closingSoonAt(house, clock);
  if (closesAt) {
    return (
      <p className={cn("rounded-lg bg-orange-950/55 px-3 py-2 text-sm font-medium text-orange-200", className)}>
        נסגר בקרוב ב־{closesAt}
      </p>
    );
  }
  const opensSoonAt = openingSoonAt(house, clock);
  if (opensSoonAt) {
    return (
      <p className={cn("rounded-lg bg-cyan-950/55 px-3 py-2 text-sm font-medium text-cyan-100", className)}>
        נפתח בקרוב ב־{opensSoonAt}
      </p>
    );
  }
  const breakOpens = onBreakAt(house, clock);
  if (breakOpens) {
    return (
      <p className={cn("rounded-lg bg-slate-900/70 px-3 py-2 text-sm font-medium text-slate-100", className)}>
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
      <p className={cn("rounded-lg bg-sky-950/50 px-3 py-2 text-sm text-sky-100", className)}>
        עדיין סגור — נפתח ב־{status.dateLabel} בשעה {status.opensAt}
      </p>
    );
  }
  if (status.kind === "before") {
    return (
      <p className={cn("rounded-lg bg-sky-950/50 px-3 py-2 text-sm text-sky-100", className)}>
        עדיין סגור — נפתח ב־{status.opensAt}
      </p>
    );
  }
  if (status.kind === "between") {
    return (
      <p className={cn("rounded-lg bg-sky-950/50 px-3 py-2 text-sm text-sky-100", className)}>
        הפסקה עכשיו — נפתח שוב ב־{status.opensAt}
      </p>
    );
  }
  return (
    <p className={cn("rounded-lg bg-violet-950/50 px-3 py-2 text-sm text-violet-200", className)}>
      כבר סגור ({formatHoursLabel(house) || "שעות הפעילות עברו"})
    </p>
  );
}
