"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LIST_SORT_EVENT,
  LIST_SORTS,
  readListSort,
  writeListSort,
  type ListSort,
} from "@/lib/list-sort";
import { useLocale } from "@/hooks/use-locale";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LIST_SORT_EVENT, onStoreChange);
  return () => window.removeEventListener(LIST_SORT_EVENT, onStoreChange);
}

const SORT_KEYS: Record<ListSort, string> = {
  nearby: "listSort.nearby",
  added: "listSort.added",
  name: "listSort.name",
};

export function ListSortSelect() {
  const { t, dir } = useLocale();
  const sort = useSyncExternalStore(subscribe, readListSort, (): ListSort => "nearby");
  const labels = useMemo(
    () =>
      Object.fromEntries(LIST_SORTS.map((mode) => [mode, t(SORT_KEYS[mode])])) as Record<
        ListSort,
        string
      >,
    [t],
  );

  return (
    <div className="flex w-full items-center justify-start gap-2 pb-1" dir={dir}>
      <span className="text-sm text-violet-300">{t("listSort.label")}</span>
      <Select value={sort} onValueChange={(next) => writeListSort(next as ListSort)}>
        <SelectTrigger
          className="h-10 min-w-[9.5rem] border-orange-500/25 bg-[#1d1028] text-base text-orange-100 shadow-none"
          size="default"
          aria-label={t("listSort.aria")}
        >
          <SelectValue>{labels[sort]}</SelectValue>
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
              {labels[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
