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
