import { GEM_MONSTER_CATALOG, type GemMonsterId } from "@/lib/gem-monsters";

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

/** Stable per house + monster type (each catalog gem gets a different baseline). */
export function gemCollectDanceIndex(houseId: string, monsterId: GemMonsterId | string) {
  const monsterIdx = GEM_MONSTER_CATALOG.findIndex((m) => m.id === monsterId);
  const monsterPart = monsterIdx >= 0 ? monsterIdx : 0;
  const housePart = hashDanceSeed(houseId, monsterId);
  return ((housePart + monsterPart * 9973) % DANCE_COUNT) + 1;
}

export const GEM_COLLECT_DANCE_MS = 5000;
