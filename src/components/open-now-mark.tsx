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

/** Gold disc + clock — open houses right now. */
export function OpenNowSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fbbf24] text-[#1c0e24]",
        className,
      )}
      title="פתוח עכשיו"
      aria-label="פתוח עכשיו"
    >
      <span className="size-[68%]">
        <ClockGlyph />
      </span>
    </span>
  );
}

export function OpenNowMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <OpenNowSign />
      {labeled ? <span>פתוח עכשיו</span> : <span className="sr-only">פתוח עכשיו</span>}
    </span>
  );
}
