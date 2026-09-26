const PREFIX = "hw-menu-section-";

export type MenuSectionId = "route" | "houses";

function key(id: MenuSectionId) {
  return `${PREFIX}${id}`;
}

export function readMenuSectionOpen(id: MenuSectionId, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  try {
    const raw = localStorage.getItem(key(id));
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* ignore */
  }
  return defaultOpen;
}

export function writeMenuSectionOpen(id: MenuSectionId, open: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(id), open ? "1" : "0");
  } catch {
    /* ignore */
  }
}
