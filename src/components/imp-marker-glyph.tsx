import type { CSSProperties } from "react";
import {
  ImpDemonFilledIcon,
  ImpDemonOutlineIcon,
} from "@/components/imp-demon-reference-icon";
import { cn } from "@/lib/utils";

/** Collected demon in ⋮ menu — yellow fill, no ring (matches outline scale). */
export function ImpMenuActiveGlyph({ className }: { className?: string }) {
  return (
    <ImpDemonFilledIcon
      className={cn("size-7 shrink-0 text-amber-300", className)}
    />
  );
}

/**
 * Universal demon vector glyph.
 * Uses exact vector curves from reference:
 * - variant "solid" -> ImpDemonFilledIcon
 * - variant "eyes" -> ImpDemonOutlineIcon
 */
export function ImpMarkerGlyph({
  className,
  style,
  variant = "solid",
}: {
  className?: string;
  style?: CSSProperties;
  /** `eyes` = outline stroke; `solid` = full filled demon. */
  variant?: "solid" | "eyes";
}) {
  if (variant === "eyes") {
    return (
      <span
        className={cn("inline-flex aspect-square shrink-0 items-center justify-center", className)}
        style={style}
        aria-hidden
      >
        <ImpDemonOutlineIcon className="size-full" />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex aspect-square shrink-0 items-center justify-center", className)}
      style={style}
      aria-hidden
    >
      <ImpDemonFilledIcon className="size-full" />
    </span>
  );
}
