/** Gem hunt is admin-only until we intentionally open it for everyone. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin;
}

/** @deprecated Visibility uses address reveal ({@link canViewHouseLocationDetails}). */
export function gemHuntResidentialHousesEnabled() {
  return false;
}

export function gemBagMenuVisible(isAdmin: boolean) {
  return gemHuntVisible(isAdmin);
}

/** Map legend «שדונים» section — whenever gem hunt UI is enabled (independent of the pin-ring toggle). */
export function gemMapLegendVisible(isAdmin: boolean) {
  return gemHuntVisible(isAdmin);
}
