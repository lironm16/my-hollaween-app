"use client";

import type { GemVariantId } from "@/lib/gem-variants";
import { cn } from "@/lib/utils";

export function GemSprite({
  variantId,
  collected = false,
  className,
  size = "lg",
}: {
  variantId: GemVariantId | string;
  collected?: boolean;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={cn(
        "gem-sprite",
        collected && "is-collected",
        size === "sm" && "gem-sprite--sm",
        className,
      )}
      aria-hidden
    >
      <div className="gem-sprite__glow" />
      <div className="gem-sprite__stage">
        <div className={cn("gem-figure", `gem-figure--${variantId}`)} />
      </div>
      <div className="gem-sprite__sparkles" />
    </div>
  );
}
