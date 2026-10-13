"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared chrome for admin «תצוגת משתמש» and registered night-pass on map/menu. */
export function adminStyleStripClass(className?: string) {
  return cn(
    "flex items-center justify-between gap-3 rounded-xl bg-[#12081a] px-3 py-2.5 ring-1 ring-orange-500/20",
    className,
  );
}

export function AdminStyleStrip({
  className,
  title,
  subtitle,
  trailing,
}: {
  className?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className={adminStyleStripClass(className)}>
      <div className="min-w-0 text-start">
        <p className="text-base font-medium text-orange-100">{title}</p>
        {subtitle ? (
          typeof subtitle === "string" ? (
            <p className="truncate text-sm text-violet-400">{subtitle}</p>
          ) : (
            <div className="min-w-0">{subtitle}</div>
          )
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}
