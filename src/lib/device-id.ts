const KEY = "hw-device-id";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable anonymous device id for engagement sessions (localStorage). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(KEY)?.trim();
    if (existing && existing.length >= 8 && existing.length <= 64) return existing;
    const next = randomId();
    localStorage.setItem(KEY, next);
    return next;
  } catch {
    return "";
  }
}

export function normalizeDeviceId(raw: string | null | undefined): string | null {
  const id = raw?.trim() ?? "";
  if (id.length < 8 || id.length > 64) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) return null;
  return id;
}
