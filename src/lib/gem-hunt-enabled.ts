/** Gem hunt UI — admin always; visitors when catalog {@link Catalog.eventSettings.gemHuntPublic}. */
export function gemHuntVisible(isAdmin: boolean, gemHuntPublic = false) {
  return isAdmin || gemHuntPublic;
}

/** @deprecated Visibility uses address reveal ({@link canViewHouseLocationDetails}). */
export function gemHuntResidentialHousesEnabled() {
  return false;
}

export function gemBagMenuVisible(isAdmin: boolean, gemHuntPublic = false) {
  return gemHuntVisible(isAdmin, gemHuntPublic);
}

/** Map legend «שדונים» section — whenever gem hunt UI is enabled (independent of the pin-ring toggle). */
export function gemMapLegendVisible(isAdmin: boolean, gemHuntPublic = false) {
  return gemHuntVisible(isAdmin, gemHuntPublic);
}
