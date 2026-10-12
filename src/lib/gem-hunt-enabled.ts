/** Non-admin gem hunt UI when `NEXT_PUBLIC_GEM_HUNT=1` (local + preview testing). Default off in production. */
export function gemHuntPublicEnvEnabled() {
  return process.env.NEXT_PUBLIC_GEM_HUNT === "1";
}

/** Gem hunt UI — admin always; visitors when {@link gemHuntPublicEnvEnabled}. */
export function gemHuntVisible(isAdmin: boolean) {
  return isAdmin || gemHuntPublicEnvEnabled();
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
