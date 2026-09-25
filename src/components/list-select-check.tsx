"use client";

import type { ComponentProps } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bulk-list selection control — outline when off, green ✓ when on. */
export function ListSelectCheck({
  selected,
  indeterminate = false,
  className,
  size = "md",
  ...props
}: {
  selected: boolean;
  indeterminate?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
} & Omit<ComponentProps<"button">, "children">) {
  const box = size === "lg" ? "size-10" : size === "sm" ? "size-8" : "size-9";
  const mark = size === "lg" ? "size-5" : "size-4";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : selected}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        box,
        selected || indeterminate
          ? "bg-emerald-600 text-white ring-2 ring-emerald-500/40"
          : "bg-[#1d1028]/90 text-violet-300 ring-2 ring-violet-500/35 hover:bg-violet-500/10",
        className,
      )}
      {...props}
    >
      {selected ? (
        <Check className={mark} strokeWidth={3} aria-hidden />
      ) : indeterminate ? (
        <span className={cn("rounded-sm bg-white/90", size === "lg" ? "h-1 w-5" : "h-0.5 w-4")} />
      ) : (
        <Circle className={cn(mark, "opacity-40")} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}
