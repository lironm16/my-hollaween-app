/** Map durable-storage failures to stable API error codes. */

export type StorageErrorCode =
  | "BLOB_NOT_CONFIGURED"
  | "BLOB_QUOTA_EXCEEDED"
  | "BLOB_WRITE_FAILED"
  | "PERSIST_FAILED";

function blobErrorName(error: unknown) {
  if (!error || typeof error !== "object" || !("name" in error)) return "";
  return String((error as { name?: string }).name ?? "");
}

function blobErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return "";
  return String((error as { message?: string }).message ?? "");
}

function blobBody(error: unknown) {
  const message = blobErrorMessage(error);
  return message.replace(/^Vercel Blob:\s*/i, "");
}

export function isRetryableBlobError(error: unknown) {
  const name = blobErrorName(error);
  return (
    name === "BlobServiceRateLimited" ||
    name === "BlobServiceNotAvailable" ||
    name === "BlobRequestAbortedError" ||
    name === "BlobUnknownError"
  );
}

export function storageErrorCodeFromBlob(error: unknown): StorageErrorCode {
  const name = blobErrorName(error);
  const message = blobErrorMessage(error);
  const body = blobBody(error);
  if (
    name === "BlobStoreSuspendedError" ||
    /this store has been suspended/i.test(body) ||
    /usage limits/i.test(body) ||
    /reached your usage/i.test(body)
  ) {
    return "BLOB_QUOTA_EXCEEDED";
  }
  if (
    name === "BlobStoreNotFoundError" ||
    name === "BlobClientTokenExpiredError" ||
    name === "BlobAccessError" ||
    name === "BlobOidcEnvironmentNotAllowedError" ||
    /no blob credentials found/i.test(message) ||
    /no read-write token found/i.test(message) ||
    /access denied/i.test(body) ||
    /valid token/i.test(body) ||
    /this store does not exist/i.test(body) ||
    /client token has expired/i.test(body) ||
    /oidc is enabled/i.test(body) ||
    (/client token/i.test(body) && /not available/i.test(body))
  ) {
    return "BLOB_NOT_CONFIGURED";
  }
  if (isRetryableBlobError(error)) return "BLOB_WRITE_FAILED";
  if (/blob service is currently not available/i.test(body)) return "BLOB_WRITE_FAILED";
  if (/too many requests/i.test(body)) return "BLOB_WRITE_FAILED";
  return "PERSIST_FAILED";
}

export function storageErrorFromCode(code: StorageErrorCode, cause?: unknown) {
  const error = new Error(code);
  if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

export function storageHttpError(error: unknown): { error: string; status: number; code: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "BLOB_NOT_CONFIGURED") {
    return {
      code: "BLOB_NOT_CONFIGURED",
      error:
        "אחסון השרת לא מוגדר. מנהל האפליקציה צריך לחבר Vercel Blob לפרויקט (Storage → Blob) ולפרוס מחדש.",
      status: 503,
    };
  }
  if (error.message === "BLOB_QUOTA_EXCEEDED") {
    return {
      code: "BLOB_QUOTA_EXCEEDED",
      error:
        "אחסון השרת מלא (מגבלת Vercel Hobby — 10,000 פעולות). שדרוג ל-Pro ב-Vercel או המתנה עד איפוס המכסה. בינתיים לא ניתן לשמור בתים חדשים.",
      status: 503,
    };
  }
  if (error.message === "BLOB_WRITE_FAILED") {
    return {
      code: "BLOB_WRITE_FAILED",
      error: "השרת עמוס כרגע. נסו לשמור שוב בעוד כמה שניות.",
      status: 503,
    };
  }
  if (error.message === "PERSIST_FAILED") {
    return {
      code: "PERSIST_FAILED",
      error: "לא הצלחנו לשמור את הבית בשרת. נסו שוב.",
      status: 503,
    };
  }
  return null;
}

export function productionRequiresBlob() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}
