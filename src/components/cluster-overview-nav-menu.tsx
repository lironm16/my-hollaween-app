"use client";

import { useMemo } from "react";
import { HouseCardActionMenu } from "@/components/house-card-action-menu";
import type { HouseCardActionContext } from "@/components/house-card-actions";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { clusterMapsNavigationHouse } from "@/lib/cluster-navigation";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Cluster overview ⋮ — navigation when the building address is visible. */
export function ClusterOverviewNavMenu({
  houses,
  actionContext,
  className,
}: {
  houses: PublicHouse[];
  actionContext: HouseCardActionContext;
  className?: string;
}) {
  const addressReveal = useAddressReveal();
  const navHouse = useMemo(
    () => clusterMapsNavigationHouse(houses, addressReveal.mapsAllowed),
    [houses, addressReveal.mapsAllowed],
  );
  if (!navHouse) return null;
  return (
    <HouseCardActionMenu
      house={navHouse}
      actionContext={actionContext}
      navOnly
      menuPlacement="bottom"
      className={cn("shrink-0", className)}
    />
  );
}
