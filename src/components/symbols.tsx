import { cn } from "@/lib/utils";

/** Picker option 1 — classic bassinet pram with a segmented hood. */
export function StrollerGlyph({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/stroller-classic.png"
      alt=""
      aria-hidden
      className={cn("h-full w-full object-contain", className)}
    />
  );
}

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
        "inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff7ed] text-[#1c0e24] ring-2 ring-[#1c0e24]",
        className,
      )}
    >
      <StrollerGlyph className={cn("h-[88%] w-[88%]", glyphClassName)} />
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
