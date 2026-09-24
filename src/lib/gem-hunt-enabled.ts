import { isAddHouseOpen } from "@/lib/hours";

/** Gem hunt is admin-only until we intentionally open it for everyone. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin;
}

/** Map diamond FAB + house-detail treasure block (hidden during add-house hours). */
export function gemHuntFabVisible(isAdmin: boolean, now = new Date()) {
  return gemHuntVisible(isAdmin) && !isAddHouseOpen(now);
}
