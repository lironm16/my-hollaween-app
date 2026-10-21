/** Full-screen countdown intro — auto-open once per browser profile. */
export const EVENT_COUNTDOWN_INTRO_SEEN_KEY = "hw-event-countdown-intro-v1";

export function readEventCountdownIntroSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(EVENT_COUNTDOWN_INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markEventCountdownIntroSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EVENT_COUNTDOWN_INTRO_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}
