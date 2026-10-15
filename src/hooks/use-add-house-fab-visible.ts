"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { useAppNow } from "@/hooks/use-app-clock";
import { isAddHouseOpenForCatalog } from "@/lib/hours";

/** Map FAB only — cutoff applies to everyone (including admin). */
export function useAddHouseFabVisible() {
  const now = useAppNow();
  const { catalog } = useCatalog();
  return isAddHouseOpenForCatalog(now, catalog?.eventSettings, false);
}
