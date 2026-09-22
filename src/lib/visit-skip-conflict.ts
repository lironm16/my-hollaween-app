const VISIT_SKIP_CONFLICT_DISMISS_KEY = "hw-visit-skip-conflict-dismissed";

export function shouldAskVisitSkipConflict(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(VISIT_SKIP_CONFLICT_DISMISS_KEY) !== "1";
  } catch {
    return true;
  }
}

export function dismissVisitSkipConflictPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VISIT_SKIP_CONFLICT_DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
}
