import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DiscStrike } from "@/components/disc-strike";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-full w-full">
      {children}
    </svg>
  );
}

/** String of hanging decorations. */
export function DecorGlyph() {
  return (
    <Icon>
      <path
        d="M3.2 6.4c2.8 3.6 4.6 3.6 7.4 0 2.8 3.6 4.6 3.6 7.4 0 1.4 1.8 2.2 1.8 3 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="12.4" r="2.35" fill="currentColor" />
      <circle cx="12" cy="13.6" r="2.35" fill="currentColor" />
      <circle cx="17" cy="12.4" r="2.35" fill="currentColor" />
    </Icon>
  );
}

export function DecorSign({
  on,
  className,
}: {
  on: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        on ? "bg-[#c2410c] text-[#fff7ed]" : "bg-[#94a3b8] text-[#fff7ed]",
        className,
      )}
      title={on ? "מקושט" : "לא מקושט"}
      aria-label={on ? "מקושט" : "לא מקושט"}
    >
      <span className="size-[70%]">
        <DecorGlyph />
      </span>
      {on ? null : <DiscStrike />}
    </span>
  );
}

export function DecorMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DecorSign on />
      {labeled ? <span>מקושט</span> : <span className="sr-only">מקושט</span>}
    </span>
  );
}
