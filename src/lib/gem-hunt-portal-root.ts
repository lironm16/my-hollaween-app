/** Isolated DOM root for hunt UI + WebXR dom-overlay (must not include the map). */

const PORTAL_ID = "gem-hunt-portal-root";

export function getGemHuntPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("getGemHuntPortalRoot: document missing");
  }
  let el = document.getElementById(PORTAL_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PORTAL_ID;
    el.className = "gem-hunt-portal-root";
    document.body.appendChild(el);
  }
  return el;
}

/** Same element — Chrome dom-overlay may only show this subtree over the AR camera. */
export function getGemHuntDomOverlayRoot(): HTMLElement {
  return getGemHuntPortalRoot();
}
