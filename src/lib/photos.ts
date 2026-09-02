export function parsePhotoUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("/house-photos/")) {
    return value.length > 500 ? null : value;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.href.length > 500) return null;
    return url.href;
  } catch {
    return null;
  }
}

type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

function connection(): NetworkConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkConnection }).connection;
}

export function isLitePhotoMode() {
  if (process.env.NEXT_PUBLIC_SKIP_HOUSE_PHOTOS === "1") return true;
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const c = connection();
  if (c?.saveData) return true;
  if (c?.effectiveType === "2g" || c?.effectiveType === "slow-2g") return true;
  return false;
}

/** Skip fetching house photos on the frozen night catalog, cache, or a constrained network. */
export function shouldLoadHousePhoto(source?: string | null) {
  if (source === "snapshot" || source === "cache") return false;
  return !isLitePhotoMode();
}
