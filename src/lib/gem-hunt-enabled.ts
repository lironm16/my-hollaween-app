/** Gem hunt is admin-only until we intentionally open it for everyone. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin;
}

export function gemBagMenuVisible(isAdmin: boolean) {
  return gemHuntVisible(isAdmin);
}

/** Map legend «יהלומים» row when hunt is on for this admin session. */
export function gemMapLegendVisible(
  isAdmin: boolean,
  opts: {
    previewAsUser: boolean;
    mapDiamondsVisible: boolean;
  },
) {
  if (!gemHuntVisible(isAdmin)) return false;
  if (isAdmin && !opts.previewAsUser) return true;
  return opts.mapDiamondsVisible;
}
