"use client";

import { useSyncExternalStore } from "react";
import {
  gemBagMenuVisible,
  gemHuntFabVisible,
  gemHuntVisible,
} from "@/lib/gem-hunt-enabled";
import { readGemPreviewAsUser, subscribeGemPreviewAsUser } from "@/lib/gem-preview-as-user";

/** Re-renders when בדיקות → «תצוגת משתמש (יהלומים)» toggles. */
export function useGemHuntAdminUi(isAdmin: boolean, now = new Date()) {
  const previewAsUser = useSyncExternalStore(
    subscribeGemPreviewAsUser,
    readGemPreviewAsUser,
    () => false,
  );
  const gemAdminToolsVisible = isAdmin && !previewAsUser;
  const fabOn = gemHuntFabVisible(isAdmin, now);
  return {
    previewAsUser,
    gemHuntVisible: gemHuntVisible(isAdmin),
    gemFabVisible: fabOn,
    gemBagMenuVisible: gemBagMenuVisible(isAdmin, now),
    /** Admin-only QA (anchors, reset, simulate in range) — off in user preview. */
    gemAdminToolsVisible,
  };
}
