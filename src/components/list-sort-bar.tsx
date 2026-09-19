"use client";

import { useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  cycleListSort,
  LIST_SORT_EVENT,
  LIST_SORT_LABELS,
  readListSort,
  writeListSort,
  type ListSort,
} from "@/lib/list-sort";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LIST_SORT_EVENT, onStoreChange);
  return () => window.removeEventListener(LIST_SORT_EVENT, onStoreChange);
}

export function ListSortBar() {
  const sort = useSyncExternalStore(subscribe, readListSort, (): ListSort => "nearby");

  function shift(delta: 1 | -1) {
    writeListSort(cycleListSort(sort, delta));
  }

  return (
    <div
      className="relative z-40 border-b border-orange-500/15 bg-[#12081a]/95 px-3 py-2"
      dir="rtl"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-3xl items-center justify-between gap-2">
        <button
          type="button"
          aria-label="מיון הבא"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-orange-500/10"
          onClick={() => shift(1)}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm text-violet-300">מיון</p>
          <p className="truncate text-lg font-medium text-orange-100">{LIST_SORT_LABELS[sort]}</p>
        </div>
        <button
          type="button"
          aria-label="מיון קודם"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-orange-500/10"
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
