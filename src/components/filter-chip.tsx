import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs",
        active
          ? "bg-orange-500 font-medium text-black"
          : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
      )}
    >
      {children}
    </button>
  );
}
