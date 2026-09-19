let safeAreaProbe: HTMLDivElement | null = null;

function readSafeAreaInset(edge: "top" | "bottom") {
  if (typeof document === "undefined") return 0;
  if (!safeAreaProbe) {
    safeAreaProbe = document.createElement("div");
    safeAreaProbe.style.cssText =
      "position:fixed;inset:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);pointer-events:none;visibility:hidden;";
    document.body.appendChild(safeAreaProbe);
  }
  const rect = safeAreaProbe.getBoundingClientRect();
  return edge === "top" ? rect.top : window.innerHeight - rect.bottom;
}

export function safeAreaInsetTop() {
  return readSafeAreaInset("top");
}

/** Bottom edge of the fixed app header — keep floating menus below it. */
export function appHeaderBottom() {
  if (typeof document === "undefined") return safeAreaInsetTop() + 56;
  const header = document.querySelector(".app-header");
  if (header instanceof HTMLElement) {
    const bottom = header.getBoundingClientRect().bottom;
    if (bottom > 0) return bottom;
  }
  return safeAreaInsetTop() + 56;
}

export function safeAreaInsetBottom() {
  return readSafeAreaInset("bottom");
}

export function visualViewportHeight() {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

export function visualViewportBottomInset() {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export function syncAppViewportVars() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--app-h", `${Math.round(visualViewportHeight())}px`);
  root.style.setProperty("--vv-bottom-inset", `${Math.round(visualViewportBottomInset())}px`);
}

export function subscribeAppViewport(onChange?: () => void) {
  const sync = () => {
    syncAppViewportVars();
    onChange?.();
  };
  sync();
  window.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
  return () => {
    window.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
  };
}
