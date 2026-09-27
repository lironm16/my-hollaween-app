import type { PublicHouse } from "@/lib/types";
import { config } from "@/lib/config";

export const GEM_LAB_STUBS_KEY = "hw-gem-lab-stubs";
export const GEM_LAB_STUBS_EVENT = "hw-gem-lab-stubs-changed";

/** Rehearsal ids eligible for on-device gem lab pins (see house-set STUB_ID). */
const GEM_LAB_ID_POOL = [
  "בית-9316",
  "נק-9313",
  "נק-9314",
  "נק-9315",
  "נק-9316",
  "נק-9317",
  "נק-9318",
  "נק-9319",
] as const;

const GEM_LAB_DESCRIPTION = "סטאב לחזרה — יהלום בדיקה (מעבדת מנהל)";

export function isGemLabStub(house: { id?: string; description?: string }) {
  if (house.description?.includes("יהלום בדיקה")) return true;
  return GEM_LAB_ID_POOL.includes(house.id as (typeof GEM_LAB_ID_POOL)[number]);
}

export function loadGemLabStubs(): PublicHouse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GEM_LAB_STUBS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is PublicHouse =>
        Boolean(h && typeof h === "object" && typeof (h as PublicHouse).id === "string"),
    );
  } catch {
    return [];
  }
}

function saveGemLabStubs(stubs: PublicHouse[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GEM_LAB_STUBS_KEY, JSON.stringify(stubs));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(GEM_LAB_STUBS_EVENT));
}

function usedGemLabIds(existingIds: ReadonlySet<string>) {
  const used = new Set(existingIds);
  for (const stub of loadGemLabStubs()) used.add(stub.id);
  return used;
}

export function nextGemLabStubId(existingHouseIds: Iterable<string>): string | null {
  const used = usedGemLabIds(new Set(existingHouseIds));
  for (const id of GEM_LAB_ID_POOL) {
    if (!used.has(id)) return id;
  }
  return null;
}

const THEMES = ["ghost", "pumpkin", "vampire", "monster", "blackCat"] as const;

function themeForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * 17) % THEMES.length;
  return THEMES[h]!;
}

export function buildGemLabStub(input: {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}): PublicHouse {
  const now = new Date().toISOString();
  const theme = themeForId(input.id);
  return {
    id: input.id,
    kind: "house",
    name: input.name?.trim() || `יהלום בדיקה ${input.id.replace(/^.*-/, "")}`,
    theme,
    address: "מעבדת יהלומים — מיקום GPS",
    arrival: "עמדו ליד הסיכה",
    description: GEM_LAB_DESCRIPTION,
    lat: input.lat,
    lng: input.lng,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "00:00",
    openTo: "23:59",
    openHours: [{ from: "00:00", to: "23:59" }],
    openFrom2: "",
    openTo2: "",
    notes: "נוצר במעבדת יהלומים — סטאבים בלבד",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "/images/stubs/candy-bowl.jpg",
    createdAt: now,
    updatedAt: now,
    neighborhood: "נחלת גנים",
  };
}

export function addGemLabStub(
  coords: { lat: number; lng: number },
  options: { name?: string; existingHouseIds?: Iterable<string> } = {},
): PublicHouse | null {
  const id = nextGemLabStubId(options.existingHouseIds ?? []);
  if (!id) return null;
  const house = buildGemLabStub({ id, ...coords, name: options.name });
  const stubs = loadGemLabStubs().filter((s) => s.id !== house.id);
  stubs.unshift(house);
  saveGemLabStubs(stubs);
  return house;
}

export function removeGemLabStub(id: string) {
  const stubs = loadGemLabStubs().filter((s) => s.id !== id);
  saveGemLabStubs(stubs);
}

/** Default pin for the lab map before GPS / tap. */
export function gemLabDefaultCenter() {
  return { lat: config.map.center.lat, lng: config.map.center.lng };
}
