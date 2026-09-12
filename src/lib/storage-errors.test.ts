import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  storageErrorCodeFromBlob,
  storageHttpError,
} from "@/lib/storage-errors";

describe("storage-errors", () => {
  it("maps missing blob store credentials", () => {
    assert.equal(
      storageErrorCodeFromBlob({ name: "BlobStoreNotFoundError", message: "store missing" }),
      "BLOB_NOT_CONFIGURED",
    );
  });

  it("maps rate limits to retryable storage failures", () => {
    assert.equal(
      storageErrorCodeFromBlob({ name: "BlobServiceRateLimited", message: "slow down" }),
      "BLOB_WRITE_FAILED",
    );
  });

  it("returns Hebrew API errors for storage codes", () => {
    const mapped = storageHttpError(new Error("BLOB_NOT_CONFIGURED"));
    assert.ok(mapped);
    assert.equal(mapped.code, "BLOB_NOT_CONFIGURED");
    assert.match(mapped.error, /אחסון השרת/);
  });
});
