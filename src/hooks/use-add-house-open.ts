"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { isAddHouseOpenForCatalog } from "@/lib/hours";

export function useAddHouseOpen() {
  const { admin } = useAdminSession();
  const now = useAppNow();
  const { catalog } = useCatalog();
  return isAddHouseOpenForCatalog(now, catalog?.eventSettings, Boolean(admin));
}
