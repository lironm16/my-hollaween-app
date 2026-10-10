const PREVIEW_AS_USER_KEY = "hw-admin-preview-as-user";
const LEGACY_GEM_PREVIEW_KEY = "hw-gem-preview-as-user";
const CHANGED = "hw-admin-preview-as-user-changed";

export function readAdminPreviewAsUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(PREVIEW_AS_USER_KEY) === "1") return true;
    if (localStorage.getItem(LEGACY_GEM_PREVIEW_KEY) === "1") return true;
  } catch {
    return false;
  }
  return false;
}

export function writeAdminPreviewAsUser(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) {
      localStorage.setItem(PREVIEW_AS_USER_KEY, "1");
    } else {
      localStorage.removeItem(PREVIEW_AS_USER_KEY);
      localStorage.removeItem(LEGACY_GEM_PREVIEW_KEY);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function subscribeAdminPreviewAsUser(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(CHANGED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGED, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Admin-only fields (phone, submitter name) — hidden in תצוגת משתמש. */
export function adminShowsPrivateHouseFields(admin: boolean, previewAsUser: boolean) {
  return admin && !previewAsUser;
}

/** Add-house cutoff bypass — off in תצוגת משתמש so QA matches visitors. */
export function adminBypassesAddHouseCutoff(admin: boolean, previewAsUser: boolean) {
  return admin && !previewAsUser;
}

/** Owner/edit flows on this device — catalog admin without תצוגת משתמש only. */
export function adminDeviceOwnerPowers(admin: boolean, previewAsUser: boolean) {
  return admin && !previewAsUser;
}
