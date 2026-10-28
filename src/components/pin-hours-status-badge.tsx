import { cn } from "@/lib/utils";

export function PinHoursStatusBadge({
  kind,
  className,
  label,
}: {
  kind: "opening" | "closing";
  className?: string;
  label: string;
}) {
  return (
    <b
      className={cn("pin-status pin-hours-badge", kind === "opening" ? "is-opening" : "is-closing", className)}
      aria-label={label}
    />
  );
}
