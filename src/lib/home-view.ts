export const HOME_VIEW_KEY = "hw-home-view";
export const HOUSE_SEARCH_FOCUS_KEY = "hw-focus-house-search";
export type HomeView = "map" | "list";

export function readHomeView(): HomeView {
  if (typeof window === "undefined") return "map";
  try {
    return sessionStorage.getItem(HOME_VIEW_KEY) === "list" ? "list" : "map";
  } catch {
    return "map";
  }
}

export function writeHomeView(view: HomeView) {
  try {
    sessionStorage.setItem(HOME_VIEW_KEY, view);
    window.dispatchEvent(new Event("hw-home-view"));
  } catch {
    /* private mode */
  }
}

export function requestHouseSearchFocus() {
  try {
    sessionStorage.setItem(HOUSE_SEARCH_FOCUS_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumeHouseSearchFocus(): boolean {
  try {
    if (sessionStorage.getItem(HOUSE_SEARCH_FOCUS_KEY) !== "1") return false;
    sessionStorage.removeItem(HOUSE_SEARCH_FOCUS_KEY);
    return true;
  } catch {
    return false;
  }
}
