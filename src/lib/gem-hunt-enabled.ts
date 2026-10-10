/** Gem hunt is admin-only until we intentionally open it for everyone. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin;
}

/**
 * When false (pre-event), only admin practice houses carry gems — residential houses join at event time.
 * Map pin rings use the same eligibility list; ring styling works on every pin shape once a row has a gem.
 */
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
