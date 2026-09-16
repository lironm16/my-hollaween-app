import type { PinHoursTimeKind } from "@/lib/pin-hours-time";
import { cn } from "@/lib/utils";

export function PinHoursTimeLabel({
  kind,
  time,
  className,
}: {
  kind: PinHoursTimeKind;
  time: string;
  className?: string;
}) {
  const ariaLabel = kind === "closing" ? `נסגר ב־${time}` : `נפתח ב־${time}`;
  return (
    <time
      className={cn("pin-hours-time", `is-${kind}`, className)}
      dir="ltr"
      dateTime={time}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {time}
    </time>
  );
}
