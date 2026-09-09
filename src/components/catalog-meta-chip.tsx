"use client";

import { cn } from "@/lib/utils";

export function CatalogMetaChip({
  hidden = false,
  houseSetLabel,
}: {
  hidden?: boolean;
  houseSetLabel?: string | null;
}) {
  if (!houseSetLabel) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 start-2 z-10 max-w-[min(calc(100%-1rem),12rem)] transition-[opacity,transform] duration-[220ms] ease-out motion-reduce:transition-none",
        hidden ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100",
      )}
      aria-hidden={hidden}
    >
      <span className="inline-block max-w-full rounded-lg bg-[#12081a]/90 px-2 py-1 text-base text-violet-200 ring-1 ring-orange-500/25 backdrop-blur-sm">
        {houseSetLabel}
      </span>
    </div>
  );
}
