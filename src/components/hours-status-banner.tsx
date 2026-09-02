import { cn } from "@/lib/utils";
import { formatHoursLabel, hoursStatus } from "@/lib/hours";
import type { VisitState } from "@/lib/types";

export function HoursStatusBanner({
  house,
  className,
}: {
  house: {
    openFrom?: string;
    openTo?: string;
    openFrom2?: string;
    openTo2?: string;
    openHours?: { from: string; to: string }[];
    visit?: VisitState;
    soldOut?: boolean;
  };
  className?: string;
}) {
  const status = hoursStatus(house);
  if (status.kind === "unknown" || status.kind === "open" || status.kind === "closedVisit") {
    return null;
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
  if (status.kind === "closingSoon") {
    return (
      <p className={cn("rounded-lg bg-orange-950/55 px-3 py-2 text-sm font-medium text-orange-200", className)}>
        נסגר בקרוב — עד {status.closesAt}
      </p>
    );
  }
  return (
    <p className={cn("rounded-lg bg-violet-950/50 px-3 py-2 text-sm text-violet-200", className)}>
      כבר סגור להיום ({formatHoursLabel(house) || "שעות הפעילות עברו"})
    </p>
  );
}
