"use client";

import dynamic from "next/dynamic";

export const GemHuntPanelLazy = dynamic(
  () => import("@/components/gem-hunt/gem-hunt-panel").then((m) => m.GemHuntPanel),
  { ssr: false, loading: () => null },
);

export const GemHuntOverlayLazy = dynamic(
  () => import("@/components/gem-hunt/gem-hunt-overlay").then((m) => m.GemHuntOverlay),
  { ssr: false, loading: () => null },
);

/** Preload after idle so first hunt open feels instant without blocking map boot. */
export function preloadGemHuntChunks() {
  if (typeof window === "undefined") return;
  const run = () => {
    void import("@/components/gem-hunt/gem-hunt-overlay");
    void import("@/components/gem-hunt/gem-model-3d");
  };
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") {
    idle(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
