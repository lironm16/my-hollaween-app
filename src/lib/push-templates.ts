import { formatDisplayAddress } from "@/lib/config";
import { candyLevel, effectiveVisit, isOwnerFrozen, isPubliclyListed } from "@/lib/house-state";
import type { House } from "@/lib/types";

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

export const AUTO_PUSH_KINDS: ReadonlySet<PushKind> = new Set([
  "onBreak",
  "backFromBreak",
  "houseAdded",
]);

export const DEFAULT_PUSH_TEMPLATES: Record<PushKind, PushTemplateMeta> = {
  onBreak: {
    id: "onBreak",
    auto: true,
    enabled: true,
    label: "הפסקה",
    hint: "נשלח אוטומטית כשבעל הבית מקפיא מהמפה. {backLine} = «נחזור ב־20:00» או «נחזור בקרוב».",
    title: "{nickname} יוצא להפסקה",
    body: "{backLine}\n{place}",
  },
  backFromBreak: {
    id: "backFromBreak",
    auto: true,
    enabled: true,
    label: "חזרה מההפסקה",
    hint: "נשלח אוטומטית כשמבטלים את ההקפאה והבית שוב פתוח.",
    title: "{nickname} חזרת לפעילות!",
    body: "מוזמנים להגיע\n{place}",
  },
  houseAdded: {
    id: "houseAdded",
    auto: true,
    enabled: true,
    label: "בית חדש במפה",
    hint: "נשלח אוטומטית אחרי הוספת בית.",
    title: "{nickname} הצטרף למפה!",
    body: "מוזמנים להגיע\n{place}",
  },
  closed: {
    id: "closed",
    auto: false,
    enabled: true,
    label: "נסגר לביקור",
    hint: "אחרי שמירה בעל הבית יכול לשלוח. כשבוחרים «נגמר».",
    title: "{nickname} נסגר לביקור",
    body: "מקווים שנהניתם!\n{place}",
  },
  decorOnly: {
    id: "decorOnly",
    auto: false,
    enabled: true,
    label: "מקושט בלי ממתקים",
    hint: "אחרי שמירה — כשבוחרים «מקושט».",
    title: "{nickname} - כל הממתקים אזלו...",
    body: "מוזמנים עדיין לבוא לראות את הבית המקושט\n{place}",
  },
  candyLow: {
    id: "candyLow",
    auto: false,
    enabled: true,
    label: "מעט ממתקים",
    hint: "אחרי שמירה כשמלאי הממתקים יורד ל«מעט».",
    title: "{nickname} — נשאר מעט!",
    body: "{place}",
  },
  candyOut: {
    id: "candyOut",
    auto: false,
    enabled: true,
    label: "נגמרו הממתקים",
    hint: "כשהמלאי נגמר והבית עדיין מסומן «בואו» (בלי סגירה).",
    title: "{nickname} — נגמרו הממתקים",
    body: "{place}",
  },
  candyRestock: {
    id: "candyRestock",
    auto: false,
    enabled: true,
    label: "חזרו למלאי",
    hint: "אחרי שמירה כשהבית פתוח והממתקים חוזרים.",
    title: "{nickname} — חזרו למלאי!",
    body: "{place}",
  },
  backActive: {
    id: "backActive",
    auto: false,
    enabled: true,
    label: "חזרה לפעילות",
    hint: "אחרי שמירה כשחוזרים מ«נסגר» או «מקושט» ל«בואו». הקפאה חוזרת אוטומטית.",
    title: "{nickname} חזרת לפעילות!",
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

function nicknameOf(house: House) {
  return house.name.trim() || "בית בשכונה";
}

function placeOf(house: House) {
  return formatDisplayAddress(house);
}

function freezeBackClock(house: House) {
  const raw = house.ownerFrozenUntil;
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  if (t - Date.now() > 36 * 60 * 60 * 1000) return null;
  return new Date(t).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function fillPushTemplate(
  template: { title: string; body: string },
  house: House,
): { title: string; body: string } {
  const clock = freezeBackClock(house);
  const vars: Record<string, string> = {
    nickname: nicknameOf(house),
    place: placeOf(house),
    backAt: clock || "בקרוב",
    backLine: clock ? `נחזור ב־${clock}` : "נחזור בקרוב",
  };
  const apply = (text: string) =>
    text.replace(/\{(nickname|place|backAt|backLine)\}/g, (_, key: string) => vars[key] ?? "");
  return { title: apply(template.title), body: apply(template.body) };
}

export function housePushUrl(house: { id: string }) {
  return `/?focus=${encodeURIComponent(house.id)}`;
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

  if (prevVisit !== "closed" && nextVisit === "closed") return "closed";
  if (prevVisit !== "decorOnly" && nextVisit === "decorOnly") return "decorOnly";
  if ((prevVisit === "closed" || prevVisit === "decorOnly") && nextVisit === "come") {
    return "backActive";
  }

  if (nextVisit === "come") {
    const prevCandy = candyLevel(prev);
    const nextCandy = candyLevel(next);
    if (prevCandy !== "out" && nextCandy === "out") return "candyOut";
    if (prevCandy === "plenty" && nextCandy === "low") return "candyLow";
    if (prevCandy === "out" && nextCandy !== "out") return "candyRestock";
  }

  return null;
}

export function houseMatchesNotifyKind(house: House, kind: PushKind): boolean {
  const visit = effectiveVisit(house);
  const paused = isOwnerFrozen(house);
  if (kind === "onBreak") return paused;
  if (kind === "backFromBreak" || kind === "backActive" || kind === "houseAdded" || kind === "candyRestock") {
    return isPubliclyListed(house) && !paused && visit === "come";
  }
  if (kind === "closed") return visit === "closed";
  if (kind === "decorOnly") return visit === "decorOnly" && isPubliclyListed(house);
  if (kind === "candyLow") {
    return isPubliclyListed(house) && !paused && visit === "come" && candyLevel(house) === "low";
  }
  if (kind === "candyOut") {
    return isPubliclyListed(house) && !paused && visit === "come" && candyLevel(house) === "out";
  }
  return false;
}

/** Re-saving the same visit/stock still offers a send (owner clicked the same chip again). */
export function ownerOfferKindFromPatch(
  patch: { visit?: House["visit"]; treatStock?: House["treatStock"]; treats?: House["treats"]; soldOut?: boolean } | undefined,
  next: House,
): PushKind | null {
  if (!patch) return null;
  const keys = Object.keys(patch).filter((key) => (patch as Record<string, unknown>)[key] !== undefined);
  const allowed = new Set(["visit", "treatStock", "treats", "soldOut"]);
  if (keys.length === 0 || keys.some((key) => !allowed.has(key))) return null;
  if (patch.visit === "closed" && houseMatchesNotifyKind(next, "closed")) return "closed";
  if (patch.visit === "decorOnly" && houseMatchesNotifyKind(next, "decorOnly")) return "decorOnly";
  const candy = patch.treatStock?.candy;
  if (candy === "low" && houseMatchesNotifyKind(next, "candyLow")) return "candyLow";
  if (candy === "out" && houseMatchesNotifyKind(next, "candyOut")) return "candyOut";
  return null;
}
