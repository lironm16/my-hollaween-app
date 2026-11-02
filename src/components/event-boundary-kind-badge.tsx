import type { EventBoundaryKind } from "@/lib/event-boundary";
import { cn } from "@/lib/utils";

export const BOUNDARY_KIND_LABEL: Record<EventBoundaryKind, string> = {
  point: "נקודה",
  city: "עיר",
  neighborhood: "שכונה",
  street: "רחוב",
};

const BOUNDARY_KIND_PILL: Record<EventBoundaryKind, string> = {
  point: "bg-violet-500/25 text-violet-100",
  city: "bg-sky-500/25 text-sky-100",
  neighborhood: "bg-emerald-500/25 text-emerald-100",
  street: "bg-orange-500/25 text-orange-100",
};

export function EventBoundaryKindBadge({
  kind,
  typeLabel,
  className,
  size = "sm",
}: {
  kind: EventBoundaryKind;
  /** Overrides kind pill text (e.g. raw Google place type). */
  typeLabel?: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const text = typeLabel?.trim() || BOUNDARY_KIND_LABEL[kind];
  return (
    <span
      className={cn(
        "shrink-0 rounded-md font-medium",
        size === "lg" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-[11px]",
        BOUNDARY_KIND_PILL[kind],
        typeLabel && "max-w-[7.5rem] truncate font-mono normal-case",
        className,
      )}
      title={typeLabel?.trim() || undefined}
    >
      {text}
    </span>
  );
}
