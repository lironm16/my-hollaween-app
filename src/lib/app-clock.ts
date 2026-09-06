import { config } from "@/lib/config";

export const REHEARSAL_SCENES = [
  "off",
  "today",
  "morning",
  "opensSoon",
  "open",
  "closing",
  "between",
  "after",
] as const;

export type RehearsalScene = (typeof REHEARSAL_SCENES)[number];

export const REHEARSAL_LABELS: Record<RehearsalScene, string> = {
  off: "שעון אמיתי",
  today: "הלילה הזה — השעה הנוכחית",
  morning: "31 באוקטובר · 10:00 (עדיין סגור)",
  opensSoon: "31 באוקטובר · 16:40 (נפתח בקרוב)",
  open: "31 באוקטובר · 18:00 (פתוח)",
  closing: "31 באוקטובר · 20:40 (נסגר בקרוב)",
  between: "31 באוקטובר · 18:30 (הפסקה בין חלונות)",
  after: "31 באוקטובר · 21:30 (אחרי הסגירה)",
};

const CLOCK_KEY = "hw-rehearsal-scene";
const SERVER_KEY = "hw-sim-server";
export const CLOCK_EVENT = "hw-clock-changed";
export const SERVER_SIM_EVENT = "hw-server-sim-changed";
const TICK_MS = 15_000;

function isScene(value: string | null | undefined): value is RehearsalScene {
  return Boolean(value && (REHEARSAL_SCENES as readonly string[]).includes(value));
}

function eventNightAt(hours: number, minutes: number) {
  const { year, month, day } = config.eventNight;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function dateForRehearsalScene(scene: RehearsalScene, wall = new Date()): Date | null {
  switch (scene) {
    case "off":
      return null;
    case "today": {
      const { year, month, day } = config.eventNight;
      return new Date(
        year,
        month - 1,
        day,
        wall.getHours(),
        wall.getMinutes(),
        wall.getSeconds(),
        wall.getMilliseconds(),
      );
    }
    case "morning":
      return eventNightAt(10, 0);
    case "opensSoon":
      return eventNightAt(16, 40);
    case "open":
      return eventNightAt(18, 0);
    case "closing":
      return eventNightAt(20, 40);
    case "between":
      return eventNightAt(18, 30);
    case "after":
      return eventNightAt(21, 30);
    default:
      return null;
  }
}

export function readRehearsalScene(): RehearsalScene {
  if (typeof window === "undefined") return "off";
  try {
    const stored = localStorage.getItem(CLOCK_KEY);
    if (isScene(stored)) return stored;
  } catch {
    /* private mode */
  }
  return "off";
}

export function writeRehearsalScene(scene: RehearsalScene) {
  if (typeof window === "undefined") return;
  if (readRehearsalScene() === scene) return;
  try {
    if (scene === "off") localStorage.removeItem(CLOCK_KEY);
    else localStorage.setItem(CLOCK_KEY, scene);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(CLOCK_EVENT));
}

export function isRehearsalOn(scene = readRehearsalScene()) {
  return scene !== "off";
}

export function readServerSimDown() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SERVER_KEY) === "down";
  } catch {
    return false;
  }
}

export function writeServerSimDown(down: boolean) {
  if (typeof window === "undefined") return;
  if (readServerSimDown() === down) return;
  try {
    if (down) localStorage.setItem(SERVER_KEY, "down");
    else localStorage.removeItem(SERVER_KEY);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(SERVER_SIM_EVENT));
}

/** Wall clock, or the rehearsal Halloween instant when a dry-run scene is on. */
export function appNow(): Date {
  return dateFromSnapshot(clockSnapshot());
}

/**
 * Stable clock id for React: same value until the 15s tick or the rehearsal scene
 * changes. Frozen Halloween scenes return a constant timestamp.
 */
export function clockSnapshot(wall = new Date(), scene: RehearsalScene = readRehearsalScene()): number {
  if (scene !== "off" && scene !== "today") {
    return dateForRehearsalScene(scene, wall)?.getTime() ?? 0;
  }
  const tick = Math.floor(wall.getTime() / TICK_MS) * TICK_MS;
  if (scene === "today") {
    return dateForRehearsalScene("today", new Date(tick))?.getTime() ?? tick;
  }
  return tick;
}

const snapshotDates = new Map<number, Date>();

export function dateFromSnapshot(stamp: number) {
  const cached = snapshotDates.get(stamp);
  if (cached) return cached;
  const date = new Date(stamp || Date.now());
  snapshotDates.set(stamp, date);
  if (snapshotDates.size > 8) {
    const first = snapshotDates.keys().next().value;
    if (first !== undefined) snapshotDates.delete(first);
  }
  return date;
}

export function applyClockSearchParams(search: string | URLSearchParams) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const rehearsal = params.get("rehearsal") ?? params.get("night");
  if (rehearsal === "1" || rehearsal === "true") writeRehearsalScene("open");
  else if (isScene(rehearsal)) writeRehearsalScene(rehearsal);
  const server = params.get("server");
  if (server === "down" || server === "fail") writeServerSimDown(true);
  if (server === "ok" || server === "up") writeServerSimDown(false);
}
