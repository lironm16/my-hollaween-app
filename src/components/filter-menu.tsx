"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Same corner chip as the filter count — a digit, or a small icon of the same weight. */
export function ToolbarBadge({ children }: { children?: ReactNode }) {
  return (
    <span className="absolute -top-1 -start-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-base font-bold leading-none text-orange-300 [&_svg]:size-2.5">
      {children}
    </span>
  );
}

export function FilterTrigger({
  activeCount,
  onClick,
}: {
  activeCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={activeCount > 0 ? `סינון (${activeCount})` : "סינון"}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
        activeCount > 0
          ? "bg-orange-500 text-black"
          : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
      )}
    >
      <Filter className="size-4" />
      {activeCount > 0 ? <ToolbarBadge>{activeCount}</ToolbarBadge> : null}
    </button>
  );
}

export function FiltersSheet({
  open,
  onOpenChange,
  activeCount,
  resultCount,
  onClear,
  onSave,
  saveDisabled = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  resultCount?: number;
  onClear: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="filters-sheet-panel flex flex-col gap-0 overflow-hidden rounded-t-2xl border-orange-500/25 bg-[#160b1f] p-0 sm:max-w-none"
      >
        <OverlayCloseBar compact onClose={() => onOpenChange(false)} className="border-b border-orange-500/15 pb-2" />
        <SheetHeader className="shrink-0 px-4 py-3">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-semibold text-orange-50">סינון</SheetTitle>
            {activeCount > 0 ? (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-base font-medium text-orange-200">
                {activeCount} פעילים
              </span>
            ) : null}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-6">{children}</div>
        </div>

        <SheetFooter className="shrink-0 flex-row gap-2 border-t border-orange-500/15 bg-[#12081a] p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={activeCount === 0}
            onClick={onClear}
          >
            איפוס
          </Button>
          <Button
            type="button"
            className="flex-1 bg-orange-500 text-black hover:bg-orange-400"
            disabled={saveDisabled}
            onClick={onSave}
          >
            {resultCount !== undefined ? `הצג תוצאות (${resultCount})` : "הצג תוצאות"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-violet-200">{title}</h3>
      <div className="flex flex-col gap-1 rounded-xl bg-[#1d1028] p-1.5 ring-1 ring-orange-500/20">
        {children}
      </div>
    </section>
  );
}

export function FilterOption({
  checked,
  onChange,
  disabled = false,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base transition",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "cursor-pointer",
        !disabled && (checked ? "bg-orange-500/15 text-orange-50" : "text-orange-50 hover:bg-orange-500/10"),
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-orange-500"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="min-w-0 flex-1 text-start">{children}</span>
    </label>
  );
}
