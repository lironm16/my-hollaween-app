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
    hint: "אחרי שמירה — כשבעל הבית מקפיא מהמפה. {backLine} = «נחזור ב־20:00» רק אם נקבעה שעה.",
    title: "הפסקה: {nickname}",
    body: "{backLine}\n{place}",
  },
  backFromBreak: {
    id: "backFromBreak",
    auto: false,
    enabled: true,
    label: "חזרה מההפסקה",
    hint: "אחרי שמירה — כשמבטלים הקפאה והבית שוב פתוח.",
    title: "חזרה לפתוח: {nickname}",
    body: "מוזמנים להגיע\n{place}",
  },
  houseAdded: {
    id: "houseAdded",
    auto: true,
    enabled: true,
    label: "בית חדש במפה",
    hint: "נשלח אוטומטית אחרי הוספת בית.",
    title: "בית חדש: {nickname}",
    body: "מוזמנים להגיע\n{place}",
  },
  closed: {
    id: "closed",
    auto: false,
    enabled: true,
    label: "נסגר לביקור",
    hint: "אחרי שמירה בעל הבית יכול לשלוח — כשבוחרים «סגור» או «נגמר — סגור».",
    title: "נסגר לערב: {nickname}",
    body: "מקווים שנהניתם!\n{place}",
  },
  decorOnly: {
    id: "decorOnly",
    auto: false,
    enabled: true,
    label: "מקושט בלי ממתקים",
    hint: "אחרי שמירה — כשבוחרים «בלי ממתקים» והבית מקושט.",
    title: "מקושט בלי ממתקים: {nickname}",
    body: "מוזמנים להסתכל\n{place}",
  },
  candyLow: {
    id: "candyLow",
    auto: false,
    enabled: true,
    label: "מעט ממתקים",
    hint: "אחרי שמירה כשמלאי הממתקים יורד ל«מעט».",
    title: "נשאר מעט: {nickname}",
    body: "{place}",
  },
  candyOut: {
    id: "candyOut",
    auto: false,
    enabled: true,
    label: "נגמרו הממתקים",
    hint: "אחרי שמירה כשהממתקים נגמרו והבית עדיין פתוח לביקור.",
    title: "נגמרו הממתקים: {nickname}",
    body: "{place}",
  },
  candyRestock: {
    id: "candyRestock",
    auto: false,
    enabled: true,
    label: "חזרו למלאי",
    hint: "אחרי שמירה כשהבית פתוח והממתקים חוזרים.",
    title: "חזרו למלאי: {nickname}",
    body: "{place}",
  },
  backActive: {
    id: "backActive",
    auto: false,
    enabled: true,
    label: "חזרה לפעילות",
    hint: "אחרי שמירה כשחוזרים מ«סגור» או «מקושט» לפתוח.",
    title: "שוב פתוח: {nickname}",
    body: "מוזמנים להגיע\n{place}",
  },
};

export type StoredPushSettings = {
  updatedAt?: string;
  templates?: Partial<Record<PushKind, PushTemplateFields>>;
};

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

  if (!wasPaused && nowPaused) return "onBreak";
  if (wasPaused && !nowPaused && isPubliclyListed(next) && nextVisit === "come") {
    return "backFromBreak";
  }
  if (!isPubliclyListed(next) || nowPaused) return null;
  if (wasPaused && nowPaused) return null;
  if (prevVisit === "closed" && nextVisit === "closed") return null;

  if (prevVisit !== "closed" && nextVisit === "closed") return "closed";
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
  return false;
}

/** Re-saving the same visit/stock still offers a send (owner clicked the same chip again). */
export function ownerOfferKindFromPatch(
  patch: OwnerNotifyPatch | undefined,
  next: House,
): PushKind | null {
  if (!patch) return null;
  const keys = Object.keys(patch).filter((key) => (patch as Record<string, unknown>)[key] !== undefined);
  const allowed = new Set(["visit", "treatStock", "treats", "soldOut", "ownerFrozenUntil"]);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) return null;
  if (patch.ownerFrozenUntil !== undefined) {
    if (isOwnerFrozen(next) && houseMatchesNotifyKind(next, "onBreak")) return "onBreak";
    if (!isOwnerFrozen(next) && houseMatchesNotifyKind(next, "backFromBreak")) return "backFromBreak";
  }
  if (stockAlertsBlocked(next) && patch.visit !== "closed") return null;
  if (patch.visit === "closed" && houseMatchesNotifyKind(next, "closed")) return "closed";
  if (patch.visit === "decorOnly" && houseMatchesNotifyKind(next, "decorOnly")) return "decorOnly";
  if (patch.visit === "come" && houseMatchesNotifyKind(next, "backActive")) return "backActive";
  const candy = patch.treatStock?.candy;
  if (candy === "low" && markedCandy(next) && houseMatchesNotifyKind(next, "candyLow")) return "candyLow";
  if (candy === "out" && markedCandy(next) && houseMatchesNotifyKind(next, "candyOut")) return "candyOut";
  return null;
}
