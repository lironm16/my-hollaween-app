"use client";

import { useSyncExternalStore } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LIST_SORT_EVENT,
  LIST_SORT_LABELS,
  LIST_SORTS,
  readListSort,
  writeListSort,
  type ListSort,
} from "@/lib/list-sort";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LIST_SORT_EVENT, onStoreChange);
  return () => window.removeEventListener(LIST_SORT_EVENT, onStoreChange);
}

export function ListSortSelect() {
  const sort = useSyncExternalStore(subscribe, readListSort, (): ListSort => "nearby");

  return (
    <div className="flex items-center justify-end gap-2 pb-1" dir="rtl">
      <span className="text-sm text-violet-300">מיון</span>
      <Select value={sort} onValueChange={(next) => writeListSort(next as ListSort)}>
        <SelectTrigger
          className="h-10 min-w-[9.5rem] border-orange-500/25 bg-[#1d1028] text-base text-orange-100 shadow-none"
          size="default"
          aria-label="מיון רשימה"
        >
          <SelectValue>{LIST_SORT_LABELS[sort]}</SelectValue>
        </SelectTrigger>
        <SelectContent
          className="border-orange-500/30 bg-[#1d1028] text-base text-orange-50 shadow-xl ring-orange-500/20"
          align="end"
        >
          {LIST_SORTS.map((mode) => (
            <SelectItem
              key={mode}
              value={mode}
              className="py-2.5 focus:bg-orange-500/15 focus:text-orange-50"
            >
              {LIST_SORT_LABELS[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
