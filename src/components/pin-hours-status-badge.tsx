import { cn } from "@/lib/utils";

function ClockHandsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12 6.8v5.4l3.6 2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
    >
      <ClockHandsGlyph className="pin-hours-badge-clock" />
    </b>
  );
}
