"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown on the map when every gem on the set has been collected. */
export function GemMapCompleteBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "gem-map-complete pointer-events-auto absolute inset-x-3 top-[4.5rem] z-[600] mx-auto max-w-md",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="gem-map-complete__card">
        <Sparkles className="gem-map-complete__icon size-6 text-amber-300" aria-hidden />
        <div className="min-w-0 flex-1 text-right">
          <p className="gem-map-complete__title">כל היהלומים באוסף!</p>
          <p className="gem-map-complete__sub">השכונה מלאה קסם — פתחו את התיק לראות את החבר&apos;ה.</p>
        </div>
        <Link href="/gem-bag" className="gem-map-complete__link shrink-0">
          לתיק
        </Link>
      </div>
    </div>
  );
}
