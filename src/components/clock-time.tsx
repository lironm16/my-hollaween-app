import type { HoursSource } from "@/lib/hours";
import { formatHoursLabel } from "@/lib/hours";
import { cn } from "@/lib/utils";

/** Clock strings and ranges must stay LTR inside the RTL app shell. */
export function ClockTime({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-block [unicode-bidi:isolate]", className)}>
      {children}
    </span>
  );
}

export function HoursLabel({
  house,
  className,
}: {
  house: HoursSource;
  className?: string;
}) {
  const label = formatHoursLabel(house);
  if (!label) return null;
  return <ClockTime className={className}>{label}</ClockTime>;
}
