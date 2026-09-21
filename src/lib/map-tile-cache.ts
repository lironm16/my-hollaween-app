import { config } from "@/lib/config";

export type MapTileBounds = {
  north: number;
  south: number;
  west: number;
  east: number;
};

/** Tell the service worker which tiles belong to this neighborhood. */
export function postMapTileCacheConfig() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const payload = {
    type: "MAP_TILE_BOUNDS" as const,
    bounds: config.map.bounds,
    minZoom: config.map.minZoom,
    maxZoom: config.map.maxZoom,
  };

  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage(payload);
    return;
  }

  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage(payload);
  });
}
