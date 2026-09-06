export type HouseTraffic = {
  saved: number;
  routed: number;
  visited: number;
};

export type TrafficKind = keyof HouseTraffic;

export type TrafficFile = {
  updatedAt: string;
  houses: Record<string, HouseTraffic>;
};

export const EMPTY_TRAFFIC: HouseTraffic = { saved: 0, routed: 0, visited: 0 };

export function clampTraffic(value: HouseTraffic): HouseTraffic {
  return {
    saved: Math.max(0, Math.floor(value.saved) || 0),
    routed: Math.max(0, Math.floor(value.routed) || 0),
    visited: Math.max(0, Math.floor(value.visited) || 0),
  };
}

export function emptyTrafficFile(): TrafficFile {
  return { updatedAt: new Date(0).toISOString(), houses: {} };
}
