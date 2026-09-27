/** WebXR session options shared by the Android AR hunt. */
export const GEM_HUNT_WEBXR_SESSION_INIT: XRSessionInit = {
  requiredFeatures: ["hit-test"],
  optionalFeatures: ["dom-overlay", "local-floor"],
};

export async function requestGemHuntWebXrSession(
  domOverlayRoot: HTMLElement,
): Promise<XRSession | null> {
  if (typeof navigator === "undefined" || !navigator.xr) return null;
  try {
    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!supported) return null;
    return await navigator.xr.requestSession("immersive-ar", {
      ...GEM_HUNT_WEBXR_SESSION_INIT,
      domOverlay: { root: domOverlayRoot },
    });
  } catch {
    return null;
  }
}
