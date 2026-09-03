import { cn } from "@/lib/utils";

/** Side-view stroller — chunky so it reads at pin and badge size. */
export function StrollerGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.2 14.2V7.6C3.2 4.55 5.7 2.2 8.8 2.2h3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      <path
        fill="currentColor"
        d="M6.5 7.6h12.8c.85 0 1.5.8 1.35 1.62L19.4 15.4H8.05L6.5 7.6Z"
      />
      <circle cx="8.35" cy="19.05" r="3.2" fill="currentColor" />
      <circle cx="17.15" cy="19.05" r="2.65" fill="currentColor" />
    </svg>
  );
}

/** Cream disc + black stroller for Leaflet pin HTML. */
export const STROLLER_GLYPH_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.2 14.2V7.6C3.2 4.55 5.7 2.2 8.8 2.2h3.4" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path fill="currentColor" d="M6.5 7.6h12.8c.85 0 1.5.8 1.35 1.62L19.4 15.4H8.05L6.5 7.6Z"/><circle cx="8.35" cy="19.05" r="3.2" fill="currentColor"/><circle cx="17.15" cy="19.05" r="2.65" fill="currentColor"/></svg>';

/** High-contrast sign: cream circle, dark stroller — never green. */
export function StrollerSign({
  className,
  glyphClassName,
}: {
  className?: string;
  glyphClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[#1c0e24] ring-2 ring-[#1c0e24]",
        className,
      )}
    >
      <StrollerGlyph className={cn("size-5", glyphClassName)} />
    </span>
  );
}

export function AccessibleMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <StrollerSign />
      {labeled ? <span>נגיש</span> : <span className="sr-only">נגיש</span>}
    </span>
  );
}
