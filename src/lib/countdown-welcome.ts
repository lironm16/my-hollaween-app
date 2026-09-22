export const COUNTDOWN_WELCOME_KEY = "hw-countdown-welcome-seen";
export const COUNTDOWN_WELCOME_EVENT = "hw-countdown-welcome-changed";

export function readCountdownWelcomeSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COUNTDOWN_WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCountdownWelcomeSeen() {
  try {
    localStorage.setItem(COUNTDOWN_WELCOME_KEY, "1");
    window.dispatchEvent(new Event(COUNTDOWN_WELCOME_EVENT));
  } catch {
    /* private mode */
  }
}
