import { put as putBlob } from "@vercel/blob";
import { blobConfigured, publicBlobPutAttempts } from "@/lib/blob-auth";
import { storageErrorCodeFromBlob } from "@/lib/storage-errors";

const LITTERBOX = "https://litterbox.catbox.moe/resources/internals/api.php";
const CATBOX = "https://catbox.moe/user/api.php";
const UA = "HallowHood/1.0 (neighborhood candy map)";

export type PhotoUploadContext = {
  houseId?: string;
};

export type PhotoUploadHost = "blob" | "cloudinary" | "catbox" | "litterbox";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function logPhoto(
  level: "info" | "warn" | "error",
  step: string,
  detail: Record<string, unknown>,
) {
  const payload = { step, ...detail };
  if (level === "warn") console.warn("[photo-upload]", payload);
  else if (level === "error") console.error("[photo-upload]", payload);
  else console.info("[photo-upload]", payload);
}

function asBlob(buf: Buffer) {
  const bytes = new Uint8Array(buf);
  return new Blob([bytes], { type: "image/jpeg" });
}

async function postFile(url: string, fields: Record<string, string>, file: Blob) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  body.append("fileToUpload", file, "house.jpg");
  const res = await fetch(url, {
    method: "POST",
    headers: { "User-Agent": UA },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    throw new Error(text || `upload ${res.status}`);
  }
  return text.split(/\s+/)[0];
}

function catboxUploadFields() {
  const fields: Record<string, string> = { reqtype: "fileupload" };
  const userhash = process.env.CATBOX_USERHASH?.trim();
  if (userhash) fields.userhash = userhash;
  return fields;
}

async function uploadToBlob(buf: Buffer): Promise<{ url: string; host: PhotoUploadHost } | null> {
  if (!blobConfigured()) return null;
  const path = `halloween-houses/photos/${Date.now()}.jpg`;
  let lastError: unknown;
  for (const putOptions of publicBlobPutAttempts("image/jpeg")) {
    try {
      const blob = await putBlob(path, buf, putOptions);
      if (blob.url) return { url: blob.url, host: "blob" };
    } catch (error) {
      lastError = error;
      const reason = storageErrorCodeFromBlob(error);
      logPhoto("warn", "blob-attempt-failed", {
        auth: putOptions.token ? "token" : putOptions.storeId ? "oidc" : "auto",
        reason,
        error: errorMessage(error),
        note:
          reason === "BLOB_QUOTA_EXCEEDED"
            ? "Blob is configured — monthly quota full; will succeed automatically after reset"
            : undefined,
      });
    }
  }
  if (lastError) throw lastError;
  return null;
}

/**
 * Durable first: Vercel Blob (same token as the house list), then Cloudinary,
 * then Catbox (permanent, no account). Litterbox 72h is last resort only.
 */
export async function uploadPublicPhoto(
  buf: Buffer,
  context: PhotoUploadContext = {},
): Promise<{ url: string; host: PhotoUploadHost }> {
  const base = {
    houseId: context.houseId ?? null,
    bytes: buf.length,
  };

  if (!blobConfigured()) {
    logPhoto("info", "blob-skipped", { ...base, reason: "BLOB_NOT_CONFIGURED" });
  } else {
    try {
      const fromBlob = await uploadToBlob(buf);
      if (fromBlob) {
        logPhoto("info", "blob-ok", { ...base, host: fromBlob.host, url: fromBlob.url });
        return fromBlob;
      }
      logPhoto("warn", "blob-empty", { ...base, reason: "putBlob returned no url" });
    } catch (error) {
      const reason = storageErrorCodeFromBlob(error);
      logPhoto("warn", "blob-failed", {
        ...base,
        reason,
        error: errorMessage(error),
        note:
          reason === "BLOB_QUOTA_EXCEEDED"
            ? "Blob is configured — monthly quota full; will succeed automatically after reset"
            : undefined,
      });
    }
  }

  const file = asBlob(buf);
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET ?? process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    logPhoto("info", "cloudinary-skipped", {
      ...base,
      reason: "CLOUDINARY_NOT_CONFIGURED",
      hasCloudName: Boolean(cloud),
      hasPreset: Boolean(preset),
    });
  } else {
    try {
      const body = new FormData();
      body.append("file", file, "house.jpg");
      body.append("upload_preset", preset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
      if (json.secure_url) {
        logPhoto("info", "cloudinary-ok", { ...base, host: "cloudinary", url: json.secure_url });
        return { url: json.secure_url, host: "cloudinary" };
      }
      logPhoto("warn", "cloudinary-failed", {
        ...base,
        status: res.status,
        error: json.error?.message ?? "no secure_url in response",
      });
    } catch (error) {
      logPhoto("warn", "cloudinary-failed", { ...base, error: errorMessage(error) });
    }
  }

  const catboxFields = catboxUploadFields();
  try {
    const url = await postFile(CATBOX, catboxFields, file);
    logPhoto("info", "catbox-ok", {
      ...base,
      host: "catbox",
      url,
      authenticated: Boolean(catboxFields.userhash),
    });
    return { url, host: "catbox" };
  } catch (error) {
    logPhoto("warn", "catbox-failed", {
      ...base,
      error: errorMessage(error),
      authenticated: Boolean(catboxFields.userhash),
      hint: catboxFields.userhash
        ? undefined
        : "Catbox now rejects anonymous uploads — set CATBOX_USERHASH or BLOB_READ_WRITE_TOKEN",
    });
  }

  const url = await postFile(LITTERBOX, { reqtype: "fileupload", time: "72h" }, file);
  logPhoto("warn", "litterbox-ok", {
    ...base,
    host: "litterbox",
    url,
    note: "temporary ~72h hosting — Blob/Cloudinary/Catbox all failed or skipped",
  });
  return { url, host: "litterbox" };
}
