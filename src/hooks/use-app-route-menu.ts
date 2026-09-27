"use client";

import { useMemo } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { resolveCatalogHouses } from "@/lib/catalog-houses";
import { houseMatchesSet } from "@/lib/house-set";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";

/** Route export/share menu props for AppHeader on any page with the main catalog. */
export function useAppRouteMenu(activeRoute: WalkingRoute | null = null) {
  const { catalog } = useCatalog();
  return useMemo(() => {
    const all = resolveCatalogHouses(catalog);
    const houses = all.filter((house): house is PublicHouse => houseMatchesSet(house, "real"));
    return {
      houses,
      totalInSet: houses.length,
      activeFilterCount: 0,
      activeRoute,
      kind: "list" as const,
    };
  }, [catalog, activeRoute]);
}
