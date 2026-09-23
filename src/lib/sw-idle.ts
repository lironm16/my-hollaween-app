const FORM_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** True when a silent reload would interrupt an open form or modal. */
export function isUserMidInteraction(): boolean {
  if (typeof document === "undefined") return false;

  const active = document.activeElement;
  if (active && active !== document.body && active !== document.documentElement) {
    const tag = active.tagName;
    if (FORM_TAGS.has(tag)) return true;
    if (active.getAttribute("contenteditable") === "true") return true;
  }

  if (document.querySelector(".house-edit-overlay, [data-hw-mid-form='true']")) return true;

  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  for (const dialog of dialogs) {
    if (!dialog.classList.contains("event-countdown-screen")) return true;
  }

  return false;
}
