import type { GemMonsterId } from "@/lib/gem-monsters";

const DANCE_COUNT = 8;

function hashDanceSeed(houseId: string, monsterId: string) {
  const s = `${houseId}\0${monsterId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable per-house dance (varies when monster pool expands). */
export function gemCollectDanceIndex(houseId: string, monsterId: GemMonsterId | string) {
  return (hashDanceSeed(houseId, monsterId) % DANCE_COUNT) + 1;
}

export function gemCollectDanceClass(houseId: string, monsterId: GemMonsterId | string) {
  return `gem-collect-dance-${gemCollectDanceIndex(houseId, monsterId)}`;
}

export const GEM_COLLECT_DANCE_MS = 5000;
