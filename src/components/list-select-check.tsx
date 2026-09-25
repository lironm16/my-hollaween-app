"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SharedProps = {
  selected: boolean;
  indeterminate?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/** Bulk-list selection — square checkbox, green ✓ when on. */
export function ListSelectCheck({
  selected,
  indeterminate = false,
  className,
  size = "md",
  as = "button",
  ...props
}: SharedProps &
  (
    | ({ as?: "button" } & ComponentPropsWithoutRef<"button">)
    | ({ as: "div" } & ComponentPropsWithoutRef<"div">)
  )) {
  const box = size === "lg" ? "size-10" : size === "sm" ? "size-8" : "size-9";
  const mark = size === "lg" ? "size-5" : "size-4";
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center rounded-md border-2 transition-colors",
    box,
    selected || indeterminate
      ? "border-emerald-500 bg-emerald-600 text-white"
      : "border-violet-400/55 bg-[#1d1028]/90 text-transparent hover:border-violet-300/70 hover:bg-violet-500/10",
    className,
  );
  const child = selected ? (
    <Check className={mark} strokeWidth={3} aria-hidden />
  ) : indeterminate ? (
    <span className={cn("rounded-sm bg-violet-200", size === "lg" ? "h-1 w-5" : "h-0.5 w-4")} />
  ) : null;

  if (as === "div") {
    const divProps = props as ComponentPropsWithoutRef<"div">;
    return (
      <div role="checkbox" aria-checked={indeterminate ? "mixed" : selected} className={classes} {...divProps}>
        {child}
      </div>
    );
  }

  const buttonProps = props as ComponentPropsWithoutRef<"button">;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : selected}
      className={classes}
      {...buttonProps}
    >
      {child}
    </button>
  );
}
