export const HOME_VIEW_KEY = "hw-home-view";
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
