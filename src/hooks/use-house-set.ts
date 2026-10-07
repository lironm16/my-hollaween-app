"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HouseSet } from "@/lib/house-set";
import {
  DEFAULT_MAP_DISPLAY_LAYERS,
  MAP_DISPLAY_LAYERS_EVENT,
  layersFromLegacyHouseSet,
  readMapDisplayLayers,
  toggleMapDisplayLayer,
  writeMapDisplayLayers,
  layersToLegacyHouseSet,
  type MapDisplayLayer,
  type MapDisplayLayers,
} from "@/lib/map-display-layers";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(MAP_DISPLAY_LAYERS_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(MAP_DISPLAY_LAYERS_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useHouseSet() {
  const layers = useSyncExternalStore(
    subscribe,
    readMapDisplayLayers,
    () => DEFAULT_MAP_DISPLAY_LAYERS,
  );
  const houseSet = layersToLegacyHouseSet(layers);

  const setLayers = useCallback((next: MapDisplayLayers) => {
    writeMapDisplayLayers(next);
  }, []);

  const toggleLayer = useCallback((layer: MapDisplayLayer) => {
    writeMapDisplayLayers(toggleMapDisplayLayer(readMapDisplayLayers(), layer));
  }, []);

  /** @deprecated Prefer {@link setLayers} / {@link toggleLayer}. */
  const setHouseSet = useCallback((next: HouseSet) => {
    writeMapDisplayLayers(layersFromLegacyHouseSet(next));
  }, []);

  return { houseSet, setHouseSet, layers, setLayers, toggleLayer };
}
