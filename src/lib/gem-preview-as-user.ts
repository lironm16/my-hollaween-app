const GEM_PREVIEW_AS_USER_KEY = "hw-gem-preview-as-user";
const CHANGED = "hw-gem-preview-as-user-changed";

export function readGemPreviewAsUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(GEM_PREVIEW_AS_USER_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGemPreviewAsUser(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(GEM_PREVIEW_AS_USER_KEY, "1");
    else localStorage.removeItem(GEM_PREVIEW_AS_USER_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function subscribeGemPreviewAsUser(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(CHANGED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGED, handler);
    window.removeEventListener("storage", handler);
  };
}
