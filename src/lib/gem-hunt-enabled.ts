import { isAddHouseOpen } from "@/lib/hours";

/** Gem hunt is admin-only until we intentionally open it for everyone. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin;
}

/** Map FAB, details hunt block, filter «לא אספתי», stats «אספתי», title diamonds — one gate. */
export function gemHuntFabVisible(isAdmin: boolean, now = new Date()) {
  return gemHuntVisible(isAdmin) && !isAddHouseOpen(now);
}

/** @deprecated alias — use gemHuntFabVisible for all gem UI visibility */
export const gemHuntUiVisible = gemHuntFabVisible;
