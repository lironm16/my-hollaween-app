import { cn } from "@/lib/utils";

/** Line-art imp — matches ⋮ menu skip outline (no PNG mask box). */
export function ImpOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-7 shrink-0", className)}
      aria-hidden
    >
      <path d="M8 9.5 6.5 5.5 9 8" />
      <path d="M16 9.5 17.5 5.5 15 8" />
      <path d="M9 8.5c0-2 1.35-3.5 3-3.5s3 1.5 3 3.5" />
      <path d="M8.5 10c.65 4 1.75 7.5 3.5 7.5S17.35 14 18 10" />
      <path d="M10.25 12.25c.45.35.85.35 1.25 0" />
      <path d="M13.5 12.25c.45.35.85.35 1.25 0" />
    </svg>
  );
}
