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

test("helpRequestSubmitSchema validates optional phone", () => {
  const bad = helpRequestSubmitSchema.safeParse({
    name: "דנה",
    role: "owner",
    platform: "android",
    message: "לא מצליח להוסיף בית",
    phone: "123",
  });
  assert.equal(bad.success, false);

  const good = helpRequestSubmitSchema.safeParse({
    name: "דנה",
    role: "owner",
    platform: "android",
    message: "לא מצליח להוסיף בית",
    phone: "050-1234567",
  });
  assert.equal(good.success, true);
  if (good.success) assert.equal(good.data.phone, "0501234567");
});
