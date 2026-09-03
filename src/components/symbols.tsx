import { cn } from "@/lib/utils";

/** International Symbol of Access — readable at badge and map-pin size. */
export function AccessibleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="14" cy="4" r="2.05" fill="currentColor" />
      <path
        fill="currentColor"
        d="M9.1 7.55h5.35c.55 0 1.02.38 1.15.91L16.5 12h2.6a1 1 0 0 1 0 2h-3.05l-.7-2.35h-2.2l.85 3.05A5.2 5.2 0 1 1 8.15 16.4V8.7c0-.64.52-1.15 1.15-1.15Z"
      />
    </svg>
  );
}

/** Inline SVG for Leaflet pin HTML (same glyph as AccessibleGlyph). */
export const ACCESSIBLE_GLYPH_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="14" cy="4" r="2.05" fill="currentColor"/><path fill="currentColor" d="M9.1 7.55h5.35c.55 0 1.02.38 1.15.91L16.5 12h2.6a1 1 0 0 1 0 2h-3.05l-.7-2.35h-2.2l.85 3.05A5.2 5.2 0 1 1 8.15 16.4V8.7c0-.64.52-1.15 1.15-1.15Z"/></svg>';

export function AccessibleMark({
  labeled = false,
  className,
}: {
  labeled?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <AccessibleGlyph className="size-5 shrink-0" />
      {labeled ? <span>נגיש</span> : <span className="sr-only">נגיש</span>}
    </span>
  );
}
