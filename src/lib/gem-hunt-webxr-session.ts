/** Start/end immersive AR in the same user gesture as «התחילו מפגש» / map diamond. */

import { getGemHuntDomOverlayRoot } from "@/lib/gem-hunt-portal-root";

export async function requestGemHuntWebXrSession(): Promise<XRSession | null> {
  if (typeof navigator === "undefined" || !navigator.xr) return null;
  const domOverlayRoot = getGemHuntDomOverlayRoot();
  try {
    return await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "local-floor"],
      domOverlay: { root: domOverlayRoot },
    });
  } catch {
    return null;
  }
}

export async function endGemHuntWebXrSession(session: XRSession | null | undefined) {
  if (!session) return;
  try {
    await session.end();
  } catch {
    /* ignore */
  }
}
