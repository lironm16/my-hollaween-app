"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  adminHouseByIdMap,
  mergePublicHouseWithAdminRow,
} from "@/lib/admin-house-overlay";
import type { EditorHouse, House, PublicHouse } from "@/lib/types";

type AdminHouseFieldsContextValue = {
  enabled: boolean;
  byId: Map<string, House>;
};

const AdminHouseFieldsContext = createContext<AdminHouseFieldsContextValue>({
  enabled: false,
  byId: new Map(),
});

export function AdminHouseFieldsProvider({
  adminHouses,
  enabled,
  children,
}: {
  adminHouses: readonly House[];
  enabled: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      enabled,
      byId: enabled ? adminHouseByIdMap(adminHouses) : new Map<string, House>(),
    }),
    [adminHouses, enabled],
  );
  return (
    <AdminHouseFieldsContext.Provider value={value}>{children}</AdminHouseFieldsContext.Provider>
  );
}

export function useAdminHouseFields(house: PublicHouse | null | undefined): EditorHouse | null {
  const { enabled, byId } = useContext(AdminHouseFieldsContext);
  if (!house) return null;
  if (!enabled) return house as EditorHouse;
  return mergePublicHouseWithAdminRow(house, byId.get(house.id));
}
