"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { ListSelectCheck } from "@/components/list-select-check";
import { Button } from "@/components/ui/button";
import { ListSortSelect } from "@/components/list-sort-select";
import { LIST_SORT_EVENT, readListSort, sortHousesForList } from "@/lib/list-sort";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseList({
  houses,
  origin,
  now = new Date(),
  actionContext,
  emptyKind = "default",
  focusId,
  showSort = true,
  onRemoveFromDevice,
  emptyAction,
  selection,
}: {
  houses: PublicHouse[];
  origin?: { lat: number; lng: number } | null;
  now?: Date;
  actionContext: HouseCardActionContext;
  emptyKind?: "default" | "skipped" | "visited" | "saved" | "collected" | "mine";
  focusId?: string | null;
  showSort?: boolean;
  onRemoveFromDevice?: (id: string) => void;
  emptyAction?: ReactNode;
  /** Bulk select + «הסר מהרשימה» (e.g. /my tabs). */
  selection?: {
    selectedIds: ReadonlySet<string>;
    onToggleId: (id: string) => void;
    allSelected: boolean;
    someSelected: boolean;
    onToggleAll: () => void;
    onRemoveSelected: () => void;
    removeLabel?: string;
  };
}) {
  const focusRef = useRef<HTMLDivElement | null>(null);
  const sort = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(LIST_SORT_EVENT, onStoreChange);
      return () => window.removeEventListener(LIST_SORT_EVENT, onStoreChange);
    },
    readListSort,
    () => "nearby" as const,
  );
  const filtered = useMemo(
    () => sortHousesForList(houses, sort, origin, now),
    [houses, sort, origin, now],
  );

  useEffect(() => {
    if (!focusId) return;
    focusRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusId]);

  if (houses.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-violet-200">
        {emptyKind === "skipped" ? (
          <>
            <p className="font-display text-2xl text-orange-300">אין בתים שדילגתם עליהם</p>
            <p className="mt-2 text-base">בתים שתדלגו עליהם במסלול יופיעו כאן.</p>
          </>
        ) : emptyKind === "visited" ? (
          <>
            <p className="font-display text-2xl text-orange-300">עדיין לא ביקרתם</p>
            <p className="mt-2 text-base">בתים שתסמנו כביקור יופיעו כאן.</p>
          </>
        ) : emptyKind === "saved" ? (
          <>
            <p className="font-display text-2xl text-orange-300">עדיין לא אהבתם בתים</p>
            <p className="mt-2 text-base">לחצו על הלב במפה או ברשימה כדי לסמן אהבתי.</p>
          </>
        ) : emptyKind === "collected" ? (
          <>
            <p className="font-display text-2xl text-orange-300">עדיין לא אספתם מדבקות</p>
            <p className="mt-2 text-base">מדבקות שתאספו במסע יופיעו כאן.</p>
          </>
        ) : emptyKind === "mine" ? (
          <>
            <p className="text-base">אין בתים שהוספתם מהמכשיר הזה.</p>
            {emptyAction}
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-orange-300">אין בתים שמתאימים לסינון</p>
            <p className="mt-2 text-base">נסו לבטל סינון בתפריטי שכונה, רמת פחד, עוד או רגישויות.</p>
          </>
        )}
      </div>
    );
  }

  const showPerCardRemove = onRemoveFromDevice && !selection;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 py-3">
      {selection ? (
        <div className="house-list-bulk flex flex-wrap items-center gap-2.5 px-1 py-1" dir="rtl">
          <ListSelectCheck
            selected={selection.allSelected}
            aria-label={selection.allSelected ? "בטל סימון הכל" : "סמן הכל"}
            onClick={selection.onToggleAll}
          />
          <span className="pointer-events-none text-sm font-medium text-violet-200">סמן הכל</span>
          <span className="min-w-2 flex-1" aria-hidden />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selection.someSelected}
            className="min-h-10 shrink-0 border-orange-500/45 bg-[#1d1028] px-3 text-sm font-semibold text-orange-100 hover:bg-orange-500/15 disabled:opacity-35"
            onClick={selection.onRemoveSelected}
          >
            {selection.someSelected
              ? (selection.removeLabel ?? "הסר מהרשימה").replace(
                  /^הסר /,
                  `הסר ${selection.selectedIds.size} `,
                )
              : (selection.removeLabel ?? "הסר מהרשימה")}
          </Button>
        </div>
      ) : null}
      {showSort ? <ListSortSelect /> : null}
      {filtered.map(({ house: h, distanceM: d }, i) => (
        <div
          key={h.id}
          ref={h.id === focusId ? focusRef : undefined}
          dir={selection ? "rtl" : undefined}
          className={cn(
            h.id === focusId && "house-list-focus",
            selection
              ? "house-list-row-select flex w-full flex-col items-start gap-1.5"
              : "flex items-start gap-2",
          )}
        >
          {selection ? (
            <ListSelectCheck
              selected={selection.selectedIds.has(h.id)}
              aria-label={
                selection.selectedIds.has(h.id) ? `בטל בחירה — ${h.name}` : `בחר — ${h.name}`
              }
              className="house-list-row-select__check"
              onClick={() => selection.onToggleId(h.id)}
            />
          ) : null}
          <div className={cn("min-w-0 space-y-2", selection ? "w-full" : "flex-1")}>
            <HouseCard
              {...houseCardPropsFor(h, actionContext, {
                index: i + 1,
                distanceM: d,
              })}
            />
            {showPerCardRemove ? (
              <div className="px-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-full border-violet-500/35 bg-[#1d1028]/80 text-base text-violet-100 hover:bg-violet-500/10"
                  onClick={() => onRemoveFromDevice!(h.id)}
                >
                  הסר מהמכשיר
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
