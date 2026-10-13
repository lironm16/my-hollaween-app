/** Bump when gem ring toggle changes — Leaflet divIcon HTML is cached by key. */
let gemRingPinIconEpoch = 0;

export function mapPinIconCacheGemRingEpoch() {
  return gemRingPinIconEpoch;
}

export function invalidateMapPinIconCacheForGemRings() {
  gemRingPinIconEpoch += 1;
}
