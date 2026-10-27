export const USER_CONTENT_TRANSLATE_STORAGE_KEY = "hw-translate-user-content";

export function readTranslateUserContent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(USER_CONTENT_TRANSLATE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTranslateUserContent(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_CONTENT_TRANSLATE_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* quota / private mode */
  }
}
