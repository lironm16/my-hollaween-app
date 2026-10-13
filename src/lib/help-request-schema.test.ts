import assert from "node:assert/strict";
import { test } from "node:test";
import { helpRequestSubmitSchema } from "./help-request-schema";

test("helpRequestSubmitSchema accepts a minimal valid payload", () => {
  const parsed = helpRequestSubmitSchema.safeParse({
    name: "דנה",
    role: "visitor",
    platform: "iphone",
    message: "המפה לא נטענת לי בכלל",
  });
  assert.equal(parsed.success, true);
});

test("helpRequestSubmitSchema rejects honeypot", () => {
  const parsed = helpRequestSubmitSchema.safeParse({
    name: "דנה",
    role: "visitor",
    platform: "android",
    message: "בדיקה ארוכה מספיק",
    company: "spam",
  });
  assert.equal(parsed.success, false);
});

test("helpRequestSubmitSchema accepts any phone text", () => {
  const parsed = helpRequestSubmitSchema.safeParse({
    name: "דנה",
    role: "owner",
    platform: "android",
    message: "לא מצליח להוסיף בית",
    phone: "call me anytime",
  });
  assert.equal(parsed.success, true);
});
