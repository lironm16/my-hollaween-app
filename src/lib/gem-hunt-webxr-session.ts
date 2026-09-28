/** Start/end immersive AR in the same user gesture as «התחילו מפגש» / map diamond. */

export async function requestGemHuntWebXrSession(): Promise<XRSession | null> {
  if (typeof navigator === "undefined" || !navigator.xr) return null;
  try {
    return await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "local-floor"],
      domOverlay: { root: document.body },
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
