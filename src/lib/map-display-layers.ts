import { isStubHouse, type HouseSet, type StubFlagHouse } from "@/lib/house-set";
import { isPracticeHouse, type PracticeFlagHouse } from "@/lib/practice-house";

export type MapDisplayLayer = "real" | "stubs" | "practice";

export type MapDisplayLayers = Record<MapDisplayLayer, boolean>;

export const MAP_DISPLAY_LAYERS_KEY = "hw-map-layers";
export const MAP_DISPLAY_LAYERS_EVENT = "hw-house-set";

export const DEFAULT_MAP_DISPLAY_LAYERS: MapDisplayLayers = {
  real: true,
  stubs: false,
  practice: false,
};

export const MAP_LAYER_LABELS: Record<MapDisplayLayer, string> = {
  real: "אמיתיים",
  stubs: "סטאבים",
  practice: "בתי תרגול",
};

const LAYER_ORDER: MapDisplayLayer[] = ["real", "stubs", "practice"];

/** Stable reference for `useSyncExternalStore` — new objects every read cause React #185. */
let cachedLayersSnapshot: MapDisplayLayers = { ...DEFAULT_MAP_DISPLAY_LAYERS };
let cachedLayersKey = layersSnapshotKey(cachedLayersSnapshot);

function layersSnapshotKey(layers: MapDisplayLayers): string {
  return `${layers.real ? 1 : 0}${layers.stubs ? 1 : 0}${layers.practice ? 1 : 0}`;
}

function commitLayersSnapshot(layers: MapDisplayLayers): MapDisplayLayers {
  const key = layersSnapshotKey(layers);
  if (key === cachedLayersKey) return cachedLayersSnapshot;
  cachedLayersSnapshot = {
    real: layers.real,
    stubs: layers.stubs,
    practice: layers.practice,
  };
  cachedLayersKey = key;
  return cachedLayersSnapshot;
}

function isLayerRecord(value: unknown): value is MapDisplayLayers {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.real === "boolean" &&
    typeof o.stubs === "boolean" &&
    typeof o.practice === "boolean"
  );
}

/** Migrate legacy single-select `hw-house-set`. */
export function layersFromLegacyHouseSet(set: HouseSet): MapDisplayLayers {
  if (set === "stubs") return { real: false, stubs: true, practice: false };
  if (set === "all") return { real: true, stubs: true, practice: false };
  return { ...DEFAULT_MAP_DISPLAY_LAYERS };
}

function readMapDisplayLayersFromStorage(): MapDisplayLayers {
  if (typeof window === "undefined") return DEFAULT_MAP_DISPLAY_LAYERS;
  try {
    const raw = localStorage.getItem(MAP_DISPLAY_LAYERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isLayerRecord(parsed)) {
        return {
          real: parsed.real,
          stubs: parsed.stubs,
          practice: parsed.practice,
        };
      }
    }
    const legacy = localStorage.getItem("hw-house-set");
    if (legacy === "real" || legacy === "stubs" || legacy === "all") {
      return layersFromLegacyHouseSet(legacy);
    }
  } catch {
    /* private mode */
  }
  return DEFAULT_MAP_DISPLAY_LAYERS;
}

/** Cached snapshot — safe for `useSyncExternalStore` getSnapshot. */
export function readMapDisplayLayers(): MapDisplayLayers {
  return commitLayersSnapshot(readMapDisplayLayersFromStorage());
}

export function writeMapDisplayLayers(next: MapDisplayLayers) {
  if (typeof window === "undefined") return;
  const current = readMapDisplayLayers();
  if (
    current.real === next.real &&
    current.stubs === next.stubs &&
    current.practice === next.practice
  ) {
    return;
  }
  try {
    localStorage.setItem(MAP_DISPLAY_LAYERS_KEY, JSON.stringify(next));
    localStorage.setItem("hw-house-set", layersToLegacyHouseSet(next));
  } catch {
    /* private mode */
  }
  commitLayersSnapshot(next);
  window.dispatchEvent(new Event(MAP_DISPLAY_LAYERS_EVENT));
}

export function toggleMapDisplayLayer(
  layers: MapDisplayLayers,
  layer: MapDisplayLayer,
): MapDisplayLayers {
  const next = { ...layers, [layer]: !layers[layer] };
  if (!next.real && !next.stubs && !next.practice) {
    return { ...layers, [layer]: true };
  }
  return next;
}

/** Backward compat for stats helpers that still take `HouseSet`. */
export function layersToLegacyHouseSet(layers: MapDisplayLayers): HouseSet {
  if (layers.real && layers.stubs) return "all";
  if (layers.stubs && !layers.real) return "stubs";
  return "real";
}

export function formatMapDisplayLayersStatus(layers: MapDisplayLayers): string {
  const active = LAYER_ORDER.filter((key) => layers[key]).map((key) => MAP_LAYER_LABELS[key]);
  if (!active.length) return MAP_LAYER_LABELS.real;
  if (active.length === 1) return active[0]!;
  if (active.length === LAYER_ORDER.length) return "הכל";
  return active.join(" + ");
}

export function houseMatchesMapLayers(
  house: StubFlagHouse & PracticeFlagHouse,
  layers: MapDisplayLayers,
): boolean {
  if (isPracticeHouse(house)) return layers.practice && !isStubHouse(house);
  if (isStubHouse(house)) return layers.stubs;
  return layers.real;
}

export function houseVisibleOnMainMap(
  house: StubFlagHouse & PracticeFlagHouse,
  layers: MapDisplayLayers,
  opts: { admin: boolean; practicePublic: boolean },
): boolean {
  if (isPracticeHouse(house)) {
    if (!layers.practice || isStubHouse(house)) return false;
    return opts.admin || opts.practicePublic;
  }
  return houseMatchesMapLayers(house, layers);
}
