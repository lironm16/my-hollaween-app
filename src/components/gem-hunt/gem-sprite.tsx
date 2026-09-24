"use client";

import type { GemType } from "@/lib/gem-hunt";
import { cn } from "@/lib/utils";

export function GemSprite({
  type,
  collected = false,
  className,
  size = "lg",
}: {
  type: GemType;
  collected?: boolean;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={cn(
        "gem-sprite",
        `gem-sprite--${type}`,
        collected && "is-collected",
        size === "sm" && "gem-sprite--sm",
        className,
      )}
      aria-hidden
    >
      <div className="gem-sprite__glow" />
      <div className="gem-sprite__body">
        {type === "ghost" ? <span className="gem-sprite__face">👻</span> : null}
        {type === "pumpkin" ? <span className="gem-sprite__face">🎃</span> : null}
        {type === "witch" ? <span className="gem-sprite__face">🧙</span> : null}
        {type === "crystal" ? <span className="gem-sprite__crystal" /> : null}
      </div>
      <div className="gem-sprite__sparkles" />
    </div>
  );
}
