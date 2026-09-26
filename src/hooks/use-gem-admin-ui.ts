"use client";

import { useSyncExternalStore } from "react";
import { isAddHouseOpen } from "@/lib/hours";
import { readGemPreviewAsUser, subscribeGemPreviewAsUser } from "@/lib/gem-preview-as-user";

/** Re-renders when בדיקות → «תצוגת משתמש (יהלומים)» toggles. */
export function useGemHuntAdminUi(isAdmin: boolean, now = new Date()) {
  const previewAsUser = useSyncExternalStore(
    subscribeGemPreviewAsUser,
    readGemPreviewAsUser,
    () => false,
  );
  const gemToolsOn = isAdmin && !previewAsUser;
  const fabOn = gemToolsOn && !isAddHouseOpen(now);
  return {
    previewAsUser,
    gemHuntVisible: gemToolsOn,
    gemFabVisible: fabOn,
    gemBagMenuVisible: fabOn,
  };
}
