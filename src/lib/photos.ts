export function isLocalPhotoUrl(raw?: string | null) {
  if (!raw) return false;
  const value = raw.trim();
  return value.startsWith("/house-photos/") || value.startsWith("/images/");
}

export function parsePhotoUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (isLocalPhotoUrl(value)) {
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

/** Skip remote house photos on cache/snapshot/constrained networks; local files always load. */
export function shouldLoadHousePhoto(source?: string | null, photoUrl?: string | null) {
  if (isLocalPhotoUrl(photoUrl)) return true;
  if (source === "snapshot" || source === "cache") return false;
  return !isLitePhotoMode();
}

/** Phone → free image host. We only keep the URL in the catalog. */
export async function hostJpegFromBrowser(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (cloud && preset) {
    const body = new FormData();
    body.append("file", blob, "house.jpg");
    body.append("upload_preset", preset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { secure_url?: string };
    if (json.secure_url) return json.secure_url;
  }

  const catbox = new FormData();
  catbox.append("reqtype", "fileupload");
  catbox.append("fileToUpload", blob, "house.jpg");
  const catboxRes = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: catbox,
    signal: AbortSignal.timeout(20_000),
  });
  const catboxText = (await catboxRes.text()).trim();
  if (/^https?:\/\//i.test(catboxText)) return catboxText.split(/\s+/)[0];

  const body = new FormData();
  body.append("reqtype", "fileupload");
  body.append("time", "72h");
  body.append("fileToUpload", blob, "house.jpg");
  const res = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const text = (await res.text()).trim();
  if (!/^https?:\/\//i.test(text)) {
    throw new Error("host");
  }
  return text.split(/\s+/)[0];
}
