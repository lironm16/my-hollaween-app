"use client";

import { HouseActionBar } from "@/components/house-action-bar";
import {
  houseActionBarPropsFor,
  type HouseCardActionContext,
} from "@/components/house-card-actions";
import { useCatalogRemoved } from "@/hooks/use-catalog-removed";
import { deviceHouseEditAllowed } from "@/lib/catalog-removed";
import type { PublicHouse } from "@/lib/types";
import type { ComponentProps } from "react";

/** ⋮ menu for house cards — omits edit rows entirely when the house was removed from the catalog. */
export function HouseCardActionMenu({
  house,
  actionContext,
  menuPlacement = "bottom",
  className,
}: {
  house: PublicHouse;
  actionContext: HouseCardActionContext;
  menuPlacement?: ComponentProps<typeof HouseActionBar>["menuPlacement"];
  className?: string;
}) {
  void useCatalogRemoved(house.id);
  const props = houseActionBarPropsFor(house, actionContext);
  if (!deviceHouseEditAllowed(house.id)) {
    return (
      <HouseActionBar
        {...props}
        onToggleEdit={undefined}
        editCode={undefined}
        editing={false}
        menuPlacement={menuPlacement}
        className={className}
      />
    );
  }
  return (
    <HouseActionBar
      {...props}
      menuPlacement={menuPlacement}
      className={className}
    />
  );
}
