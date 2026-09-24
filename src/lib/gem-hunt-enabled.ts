/** Gem hunt AR feature gate (NEXT_PUBLIC_GEM_HUNT). Default off. */
export type GemHuntMode = "off" | "admin" | "on";

export function gemHuntMode(): GemHuntMode {
  const v = process.env.NEXT_PUBLIC_GEM_HUNT?.trim();
  if (v === "1") return "on";
  if (v === "admin") return "admin";
  return "off";
}

export function gemHuntVisible(isAdmin: boolean) {
  const mode = gemHuntMode();
  if (mode === "on") return true;
  if (mode === "admin") return isAdmin;
  return false;
}
