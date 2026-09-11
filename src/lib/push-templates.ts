import { formatDisplayAddress } from "@/lib/config";
import {
  candyLevel,
  effectiveVisit,
  isOwnerFrozen,
  isPubliclyListed,
  markedCandy,
} from "@/lib/house-state";
import { isOnBreak } from "@/lib/hours";
import type { House, NightPatch } from "@/lib/types";

/** Fields from an owner save that can trigger a neighborhood push offer. */
export type OwnerNotifyPatch = Pick<
  NightPatch,
  "visit" | "treatStock" | "treats" | "soldOut" | "ownerFrozenUntil"
>;

export const PUSH_KINDS = [
  "onBreak",
  "backFromBreak",
  "houseAdded",
  "closed",
  "decorOnly",
  "candyLow",
  "candyOut",
  "candyOutClosed",
  "candyRestock",
  "backActive",
] as const;

export type PushKind = (typeof PUSH_KINDS)[number];

export type PushTemplateFields = {
  enabled: boolean;
  title: string;
  body: string;
};

export type PushTemplateMeta = PushTemplateFields & {
  id: PushKind;
  label: string;
  hint: string;
  /** Sent as soon as the state changes — owner is not asked. */
  auto: boolean;
};

export const AUTO_PUSH_KINDS: ReadonlySet<PushKind> = new Set(["houseAdded"]);

export const DEFAULT_PUSH_TEMPLATES: Record<PushKind, PushTemplateMeta> = {
  onBreak: {
    id: "onBreak",
    auto: false,
    enabled: true,
    label: "הפסקה",
    hint: "אחרי שמירה — כשבעל הבית מקפיא מהמפה. כותרת = כינוי; {backLine} = «נחזור ב־20:00» רק אם נקבעה שעה.",
    title: "{nickname}",
    body: "⏸️ הפסקה\n{backLine}\n{place}",
  },
  backFromBreak: {
    id: "backFromBreak",
    auto: false,
    enabled: true,
    label: "חזרה מההפסקה",
    hint: "אחרי שמירה — כשמבטלים הקפאה והבית שוב פתוח.",
    title: "{nickname}",
    body: "▶️ חזרה לפתוח\nמוזמנים להגיע 👋\n{place}",
  },
  houseAdded: {
    id: "houseAdded",
    auto: true,
    enabled: true,
    label: "בית חדש במפה",
    hint: "נשלח אוטומטית אחרי הוספת בית. כותרת קבועה — הכינוי בגוף ההודעה.",
    title: "🏠בית אימה נוסף למפה!",
    body: "{nickname}\n{place}",
  },
  closed: {
    id: "closed",
    auto: false,
    enabled: true,
    label: "נסגר לביקור",
    hint: "אחרי שמירה בעל הבית יכול לשלוח — כשבוחרים «סגור» או «נגמר — סגור».",
    title: "{nickname}",
    body: "⛔️ נסגר לערב\nמקווים שנהניתם! 👋\n{place}",
  },
  decorOnly: {
    id: "decorOnly",
    auto: false,
    enabled: true,
    label: "מקושט בלי ממתקים",
    hint: "אחרי שמירה — כשבוחרים «בלי ממתקים» והבית מקושט.",
    title: "{nickname}",
    body: "🎨 מקושט בלי ממתקים\nמוזמנים להסתכל ✨\n{place}",
  },
  candyLow: {
    id: "candyLow",
    auto: false,
    enabled: true,
    label: "מעט ממתקים",
    hint: "אחרי שמירה כשמלאי הממתקים יורד ל«מעט».",
    title: "{nickname}",
    body: "🟠🍬 נשאר מעט\n{place}",
  },
  candyOut: {
    id: "candyOut",
    auto: false,
    enabled: true,
    label: "נגמרו הממתקים",
    hint: "אחרי שמירה כשהממתקים נגמרו והבית עדיין פתוח לביקור.",
    title: "{nickname}",
    body: "🔴🍬 נגמרו הממתקים\n{place}",
  },
  candyOutClosed: {
    id: "candyOutClosed",
    auto: false,
    enabled: true,
    label: "נגמרו (סגור)",
    hint: "אחרי שמירה כשהממתקים נגמרו והבית סגור לביקורים.",
    title: "{nickname}",
    body: "🔴🍬 נגמרו הממתקים\n⛔️ הבית סגור לביקורים\n{place}",
  },
  candyRestock: {
    id: "candyRestock",
    auto: false,
    enabled: true,
    label: "חזרו למלאי",
    hint: "אחרי שמירה כשהבית פתוח והממתקים חוזרים.",
    title: "{nickname}",
    body: "🟢🍬 חזרו למלאי\n{place}",
  },
  backActive: {
    id: "backActive",
    auto: false,
    enabled: true,
    label: "חזרה לפעילות",
    hint: "אחרי שמירה כשחוזרים מ«סגור», «הפסקה» או «מקושט» לפתוח.",
    title: "{nickname}",
    body: "✅ שוב פתוח\nמוזמנים להגיע 👋\n{place}",
  },
};

export type StoredPushSettings = {
  updatedAt?: string;
  /** Bump PUSH_TEMPLATES_STORAGE_GENERATION to reset stored title/body to defaults. */
  generation?: number;
  templates?: Partial<Record<PushKind, PushTemplateFields>>;
};

/** Bump to reset stored template text back to DEFAULT_PUSH_TEMPLATES (enabled flags kept). */
export const PUSH_TEMPLATES_STORAGE_GENERATION = 3;

export function buildDefaultPushSettings(): StoredPushSettings {
  const templates: Partial<Record<PushKind, PushTemplateFields>> = {};
  for (const id of PUSH_KINDS) {
    const base = DEFAULT_PUSH_TEMPLATES[id];
    templates[id] = { enabled: base.enabled, title: base.title, body: base.body };
  }
  return {
    updatedAt: new Date().toISOString(),
    generation: PUSH_TEMPLATES_STORAGE_GENERATION,
    templates,
  };
}

export function migratePushSettings(stored?: StoredPushSettings | null): {
  settings: StoredPushSettings;
  changed: boolean;
} {
  const generation = stored?.generation ?? 0;
  if (generation >= PUSH_TEMPLATES_STORAGE_GENERATION && stored?.templates) {
    return { settings: stored, changed: false };
  }
  const templates: Partial<Record<PushKind, PushTemplateFields>> = {};
  for (const id of PUSH_KINDS) {
    const base = DEFAULT_PUSH_TEMPLATES[id];
    const overlay = stored?.templates?.[id];
    templates[id] = {
      enabled: overlay?.enabled ?? base.enabled,
      title: base.title,
      body: base.body,
    };
  }
  return {
    settings: {
      updatedAt: new Date().toISOString(),
      generation: PUSH_TEMPLATES_STORAGE_GENERATION,
      templates,
    },
    changed: true,
  };
}

export function mergePushTemplates(
  stored?: StoredPushSettings | null,
): Record<PushKind, PushTemplateMeta> {
  const out = {} as Record<PushKind, PushTemplateMeta>;
  for (const id of PUSH_KINDS) {
    const base = DEFAULT_PUSH_TEMPLATES[id];
    const overlay = stored?.templates?.[id];
    out[id] = {
      ...base,
      enabled: overlay?.enabled ?? base.enabled,
      title: overlay?.title?.trim() || base.title,
      body: overlay?.body?.trim() || base.body,
    };
  }
  return out;
}

function nicknameOf(house: { name: string }) {
  return house.name.trim() || "בית בשכונה";
}

function placeOf(house: { address: string; lat?: number; lng?: number }) {
  return formatDisplayAddress(house);
}

function freezeBackClock(house: { ownerFrozenUntil?: string | null }) {
  const raw = house.ownerFrozenUntil;
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  if (t - Date.now() > 36 * 60 * 60 * 1000) return null;
  return new Date(t).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function collapsePushText(text: string) {
  return text
    .replace(/\n{2,}/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}

export function fillPushTemplate(
  template: { title: string; body: string },
  house: { name: string; address: string; lat?: number; lng?: number; ownerFrozenUntil?: string | null },
): { title: string; body: string } {
  const clock = freezeBackClock(house);
  const vars: Record<string, string> = {
    nickname: nicknameOf(house),
    place: placeOf(house),
    backAt: clock ?? "",
    backLine: clock ? `נחזור ב־${clock}` : "",
  };
  const apply = (text: string) =>
    text.replace(/\{(nickname|place|backAt|backLine)\}/g, (_, key: string) => vars[key] ?? "");
  return {
    title: collapsePushText(apply(template.title)),
    body: collapsePushText(apply(template.body)),
  };
}

export function housePushUrl(house: { id: string }) {
  return `/?focus=${encodeURIComponent(house.id)}`;
}

/** Same kind resolution as the server after an owner save. */
export function resolveHouseNotifyKind(
  prev: House,
  next: House,
  patch?: OwnerNotifyPatch,
): PushKind | null {
  return classifyHouseAlert(prev, next) ?? (patch ? ownerOfferKindFromPatch(patch, next, prev) : null);
}

/** Filled owner-alert copy from the active templates (defaults or stored). */
export function filledPushForKind(
  kind: PushKind,
  house: House,
  stored?: StoredPushSettings | null,
): { title: string; body: string; url: string } | null {
  const templates = mergePushTemplates(stored);
  const template = templates[kind];
  if (!template.enabled) return null;
  const filled = fillPushTemplate(template, house);
  return {
    title: filled.title.trim() || "HallowHood",
    body: filled.body.trim(),
    url: housePushUrl(house),
  };
}

/** Quick-edit / owner view: house is not open for visits (closed or owner pause). */
export function isHouseOffAir(house: House): boolean {
  if (effectiveVisit(house) === "closed") return true;
  if (isOwnerFrozen(house)) return true;
  return false;
}

/** Candy / stock alerts stay silent while the house is still paused or closed. */
export function stockAlertsBlocked(house: House): boolean {
  if (isOwnerFrozen(house)) return true;
  if (effectiveVisit(house) === "closed") return true;
  if (isOnBreak(house)) return true;
  return false;
}

/** Which alert this save would produce. Freeze wins over visit/stock. */
export function classifyHouseAlert(prev: House, next: House): PushKind | null {
  const prevVisit = effectiveVisit(prev);
  const nextVisit = effectiveVisit(next);
  const wasPaused = isOwnerFrozen(prev);
  const nowPaused = isOwnerFrozen(next);

  if (!wasPaused && nowPaused && !isHouseOffAir(prev)) return "onBreak";
  if (wasPaused && !nowPaused && isPubliclyListed(next) && nextVisit === "come") {
    return "backFromBreak";
  }
  if (!isPubliclyListed(next) || nowPaused) return null;
  if (wasPaused && nowPaused) return null;
  if (prevVisit === "closed" && nextVisit === "closed") {
    if (markedCandy(next)) {
      const prevCandy = markedCandy(prev) ? candyLevel(prev) : null;
      const nextCandy = candyLevel(next);
      if (prevCandy && prevCandy !== "out" && nextCandy === "out") return "candyOutClosed";
    }
    return null;
  }

  if (prevVisit !== "closed" && nextVisit === "closed" && !isHouseOffAir(prev)) return "closed";
  if (prevVisit !== "decorOnly" && nextVisit === "decorOnly") return "decorOnly";
  if ((prevVisit === "closed" || prevVisit === "decorOnly") && nextVisit === "come") {
    return "backActive";
  }

  if (nextVisit === "come" && markedCandy(next)) {
    if (stockAlertsBlocked(next)) return null;
    const prevCandy = markedCandy(prev) ? candyLevel(prev) : null;
    const nextCandy = candyLevel(next);
    if (prevCandy && prevCandy !== "out" && nextCandy === "out") return "candyOut";
    if (prevCandy === "plenty" && nextCandy === "low") return "candyLow";
    if (prevCandy === "out" && nextCandy !== "out") return "candyRestock";
  }

  return null;
}

export function houseMatchesNotifyKind(house: House, kind: PushKind): boolean {
  const visit = effectiveVisit(house);
  const paused = isOwnerFrozen(house);
  if (kind === "onBreak") return paused;
  if (kind === "candyRestock") {
    return isPubliclyListed(house) && !paused && visit === "come" && !isOnBreak(house);
  }
  if (kind === "backFromBreak" || kind === "backActive" || kind === "houseAdded") {
    return isPubliclyListed(house) && !paused && visit === "come";
  }
  if (kind === "closed") return visit === "closed";
  if (kind === "decorOnly") return visit === "decorOnly" && isPubliclyListed(house);
  if (kind === "candyLow") {
    return (
      isPubliclyListed(house) &&
      !paused &&
      visit === "come" &&
      !isOnBreak(house) &&
      candyLevel(house) === "low"
    );
  }
  if (kind === "candyOut") {
    return (
      isPubliclyListed(house) &&
      !paused &&
      visit === "come" &&
      !isOnBreak(house) &&
      candyLevel(house) === "out"
    );
  }
  if (kind === "candyOutClosed") {
    return (
      isPubliclyListed(house) &&
      !paused &&
      visit === "closed" &&
      candyLevel(house) === "out"
    );
  }
  return false;
}

/** Re-saving the same visit/stock still offers a send (owner clicked the same chip again). */
export function ownerOfferKindFromPatch(
  patch: OwnerNotifyPatch | undefined,
  next: House,
  prev?: House,
): PushKind | null {
  if (!patch) return null;
  const keys = Object.keys(patch).filter((key) => (patch as Record<string, unknown>)[key] !== undefined);
  const allowed = new Set(["visit", "treatStock", "treats", "soldOut", "ownerFrozenUntil"]);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) return null;
  if (patch.ownerFrozenUntil !== undefined) {
    if (
      isOwnerFrozen(next) &&
      houseMatchesNotifyKind(next, "onBreak") &&
      !(prev && isHouseOffAir(prev) && isHouseOffAir(next))
    ) {
      return "onBreak";
    }
    if (!isOwnerFrozen(next) && houseMatchesNotifyKind(next, "backFromBreak")) return "backFromBreak";
  }
  if (
    patch.visit === "closed" &&
    houseMatchesNotifyKind(next, "closed") &&
    !(prev && isHouseOffAir(prev))
  ) {
    return "closed";
  }
  if (patch.visit === "decorOnly" && houseMatchesNotifyKind(next, "decorOnly")) return "decorOnly";
  if (patch.visit === "come" && houseMatchesNotifyKind(next, "backActive")) return "backActive";
  const candy = patch.treatStock?.candy;
  if (
    candy === "out" &&
    markedCandy(next) &&
    houseMatchesNotifyKind(next, "candyOutClosed")
  ) {
    return "candyOutClosed";
  }
  if (stockAlertsBlocked(next)) return null;
  if (candy === "low" && markedCandy(next) && houseMatchesNotifyKind(next, "candyLow")) return "candyLow";
  if (candy === "out" && markedCandy(next) && houseMatchesNotifyKind(next, "candyOut")) return "candyOut";
  return null;
}
