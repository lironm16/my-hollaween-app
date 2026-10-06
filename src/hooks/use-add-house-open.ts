"use client";

import { useCatalog } from "@/hooks/use-catalog";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemPreviewAsUser } from "@/hooks/use-gem-preview-as-user";
import { adminBypassesAddHouseCutoff } from "@/lib/gem-preview-as-user";
import { isAddHouseOpenForCatalog } from "@/lib/hours";

export function useAddHouseOpen() {
  const { admin } = useAdminSession();
  const { previewAsUser } = useGemPreviewAsUser();
  const now = useAppNow();
  const { catalog } = useCatalog();
  const isAdminForCutoff = adminBypassesAddHouseCutoff(Boolean(admin), previewAsUser);
  return isAddHouseOpenForCatalog(now, catalog?.eventSettings, isAdminForCutoff);
}
