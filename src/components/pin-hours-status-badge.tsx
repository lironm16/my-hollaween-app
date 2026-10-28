import { cn } from "@/lib/utils";

function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.35" />
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
      <ClockGlyph className="pin-hours-badge-clock" />
    </b>
  );
}
