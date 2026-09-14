const PREFIX = "hw-route-skip-";

export const ROUTE_PROMPT_EVENT = "hw-route-prompt";

export type RoutePromptKind = "enter-route" | "filter-change" | "status-change";

export const ROUTE_PROMPT_KINDS: RoutePromptKind[] = [
  "filter-change",
  "status-change",
  "enter-route",
];

export const ROUTE_PROMPT_LABELS: Record<
  RoutePromptKind,
  { title: string; hint: string }
> = {
  "filter-change": {
    title: "אישור לפני שינוי סינון",
    hint: "«לעדכן את הסינון?», «להחזיר למסלול?» ודומים",
  },
  "status-change": {
    title: "אישור כשסטטוס בית משתנה",
    hint: "כשבית נפתח, נסגר או חוזר למסלול",
  },
  "enter-route": {
    title: "אישור לפני כניסה למסלול",
    hint: "לפני הצגת מסלול הליכה",
  },
};

function key(kind: RoutePromptKind) {
  return `${PREFIX}${kind}`;
}

export function shouldSkipRoutePrompt(kind: RoutePromptKind) {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key(kind)) === "1";
  } catch {
    return false;
  }
}

export function setSkipRoutePrompt(kind: RoutePromptKind, skip: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (skip) localStorage.setItem(key(kind), "1");
    else localStorage.removeItem(key(kind));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(ROUTE_PROMPT_EVENT));
}
