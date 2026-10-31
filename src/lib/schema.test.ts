import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { housePatchValidationErrorHe, ownerPatchSchema } from "@/lib/schema";

describe("housePatchValidationErrorHe", () => {
  it("maps empty address to a helpful Hebrew message", () => {
    const parsed = ownerPatchSchema.safeParse({
      address: "",
      editCode: "123456",
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    assert.match(housePatchValidationErrorHe(parsed.error), /כתובת/);
  });

  it("falls back to generic copy for unknown issues", () => {
    const parsed = ownerPatchSchema.safeParse({ lat: "not-a-number" });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    assert.equal(housePatchValidationErrorHe(parsed.error), "נתונים לא תקינים.");
  });
});
