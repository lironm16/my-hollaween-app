const DELETED_HOUSES_KEY = "hw-deleted-houses";

export function loadDeletedHouseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_HOUSES_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function tombstoneHouse(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const ids = loadDeletedHouseIds().filter((item) => item !== id);
    ids.unshift(id);
    localStorage.setItem(DELETED_HOUSES_KEY, JSON.stringify(ids.slice(0, 120)));
  } catch {
    /* private mode */
  }
}
