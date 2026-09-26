import { Gem } from "lucide-react";
import { GEM_DIAMOND_FILL } from "@/lib/gem-diamond-visual";
import { cn } from "@/lib/utils";

/** Lucide gem — toolbar uses `active` for outline on orange; menus use filled yellow. */
export function GemDiamondIcon({
  className,
  active = false,
  filled = true,
}: {
  className?: string;
  /** Orange toolbar “on” — white outline with facet strokes visible. */
  active?: boolean;
  /** Filled map-yellow when inactive in menus/titles. */
  filled?: boolean;
}) {
  if (active) {
    return (
      <Gem className={cn("size-5 fill-none text-white", className)} strokeWidth={2.1} />
    );
  }
  if (filled) {
    return (
      <Gem
        className={cn("size-5 fill-current", className)}
        style={{ color: GEM_DIAMOND_FILL }}
        strokeWidth={2.1}
      />
    );
  }
  return (
    <Gem
      className={cn("size-5 fill-none", className)}
      style={{ color: GEM_DIAMOND_FILL }}
      strokeWidth={2.1}
    />
  );
}

export function GemDiamondSvg({
  className,
  fill = GEM_DIAMOND_FILL,
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M6 3h12l4 7-10 13L2 10l4-7z" fill={fill} />
    </svg>
  );
}
