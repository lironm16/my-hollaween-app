"use client";

import { EMPTY_TRAFFIC, type HouseTraffic } from "@/lib/traffic";
import { cn } from "@/lib/utils";

export function HouseTrafficLine({
  traffic,
  variant = "public",
  compact = false,
  className,
}: {
  traffic?: HouseTraffic | null;
  variant?: "public" | "owner";
  compact?: boolean;
  className?: string;
}) {
  const counts = traffic ?? EMPTY_TRAFFIC;
  const bits = `${counts.saved} שמרו · ${counts.visited} ביקרו`;

  if (variant === "owner") {
    return (
      <p
        className={cn(
          "rounded-lg bg-emerald-950/50 px-2.5 py-1 text-base font-medium text-emerald-100 ring-1 ring-emerald-500/25",
          className,
        )}
      >
        {compact ? `תנועה · ${bits}` : `תנועה לבית · ${bits}`}
      </p>
    );
  }

  if (counts.saved <= 0 && counts.visited <= 0) return null;
  return <p className={cn("text-base text-violet-200", className)}>{bits}</p>;
}
