const PREFIX = "hw-route-skip-";

export type RoutePromptKind =
  | "enter-route"
  | "filter-change"
  | "add-houses"
  | "remove-houses";

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
}
