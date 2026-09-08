import { cn } from "@/lib/utils";

function ClockGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2.1" />
      <path
        d="M12 7.2v5.1l3.4 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HoursSign({
  className,
  label,
  tone,
}: {
  className?: string;
  label: string;
  tone: "open" | "closing" | "opening";
}) {
  const toneClass =
    tone === "closing"
      ? "bg-[#f97316] text-[#fff7ed]"
      : tone === "opening"
        ? "bg-[#22d3ee] text-[#1c0e24]"
        : "bg-[#fbbf24] text-[#1c0e24]";
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        toneClass,
        className,
      )}
      title={label}
      aria-label={label}
    >
      <span className="size-[68%]">
        <ClockGlyph />
      </span>
    </span>
  );
}

function HoursMark({
  labeled = false,
  className,
  label,
  tone,
}: {
  labeled?: boolean;
  className?: string;
  label: string;
  tone: "open" | "closing" | "opening";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <HoursSign label={label} tone={tone} />
      {labeled ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Gold disc + clock — open houses right now. */
export function OpenNowSign({ className }: { className?: string }) {
  return <HoursSign className={className} label="פתוח עכשיו" tone="open" />;
}

export function OpenNowMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return <HoursMark labeled={labeled} className={className} label="פתוח עכשיו" tone="open" />;
}

export function ClosingSoonSign({ className }: { className?: string }) {
  return <HoursSign className={className} label="נסגר בקרוב" tone="closing" />;
}

export function ClosingSoonMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return <HoursMark labeled={labeled} className={className} label="נסגר בקרוב" tone="closing" />;
}

export function OpeningSoonSign({ className }: { className?: string }) {
  return <HoursSign className={className} label="נפתח בקרוב" tone="opening" />;
}

export function OpeningSoonMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return <HoursMark labeled={labeled} className={className} label="נפתח בקרוב" tone="opening" />;
}
