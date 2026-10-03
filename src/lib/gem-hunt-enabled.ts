import { isAddHouseOpen } from "@/lib/hours";

/** Gem hunt is admin-only until we intentionally open it for everyone. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin;
}

/** Map FAB, details hunt block, filter «לא מצאתי», stats «מצאתי», title diamonds — one gate. */
export function gemHuntFabVisible(isAdmin: boolean, now = new Date()) {
  return gemHuntVisible(isAdmin) && !isAddHouseOpen(now);
}

/** Side menu gem album — same evening gate as hunt (respects rehearsal / sim clock via `now`). */
export function gemBagMenuVisible(isAdmin: boolean, now = new Date()) {
  return gemHuntFabVisible(isAdmin, now);
}

/** @deprecated alias — use gemHuntFabVisible for all gem UI visibility */
export const gemHuntUiVisible = gemHuntFabVisible;

/** Map legend «יהלומים» row — not tied 1:1 to drawing markers on the map. */
export function gemMapLegendVisible(
  isAdmin: boolean,
  opts: {
    now?: Date;
    previewAsUser: boolean;
    mapDiamondsVisible: boolean;
    mapAdminCharactersVisible: boolean;
  },
) {
  if (!gemHuntVisible(isAdmin)) return false;
  const now = opts.now ?? new Date();
  if (isAdmin && !opts.previewAsUser) return true;
  if (gemHuntFabVisible(isAdmin, now)) return true;
  return opts.mapDiamondsVisible || opts.mapAdminCharactersVisible;
}
