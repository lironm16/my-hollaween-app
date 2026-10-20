import type { EventBoundaryKind } from "@/lib/event-boundary";
import { cn } from "@/lib/utils";

export const BOUNDARY_KIND_LABEL: Record<EventBoundaryKind, string> = {
  city: "עיר",
  neighborhood: "שכונה",
  street: "רחוב",
};

const BOUNDARY_KIND_PILL: Record<EventBoundaryKind, string> = {
  city: "bg-sky-500/25 text-sky-100",
  neighborhood: "bg-emerald-500/25 text-emerald-100",
  street: "bg-orange-500/25 text-orange-100",
};

export function EventBoundaryKindBadge({
  kind,
  className,
  size = "sm",
}: {
  kind: EventBoundaryKind;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md font-medium",
        size === "lg" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-[11px]",
        BOUNDARY_KIND_PILL[kind],
        className,
      )}
    >
      {BOUNDARY_KIND_LABEL[kind]}
    </span>
  );
}
