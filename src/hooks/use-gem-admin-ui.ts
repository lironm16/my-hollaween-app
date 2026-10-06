"use client";

import { useSyncExternalStore } from "react";
import { gemBagMenuVisible, gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { readAdminPreviewAsUser, subscribeAdminPreviewAsUser } from "@/lib/admin-preview-as-user";

/** Re-renders when תפריט → «תצוגת משתמש» toggles. */
export function useGemHuntAdminUi(isAdmin: boolean) {
  const previewAsUser = useSyncExternalStore(
    subscribeAdminPreviewAsUser,
    readAdminPreviewAsUser,
    () => false,
  );
  const gemAdminToolsVisible = isAdmin && !previewAsUser;
  const huntOn = gemHuntVisible(isAdmin);
  return {
    previewAsUser,
    gemHuntVisible: huntOn,
    /** Admin gem hunt UI (map markers, filters, panels) — same as {@link gemHuntVisible}. */
    gemUiVisible: huntOn,
    gemBagMenuVisible: gemBagMenuVisible(isAdmin),
    gemAdminToolsVisible,
  };
}
