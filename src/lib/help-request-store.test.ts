import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHelpRequestPlain } from "./help-request-store";
import type { StoredHelpRequest } from "./help-request-schema";

test("formatHelpRequestPlain includes message and context", () => {
  const record: StoredHelpRequest = {
    id: "abc",
    createdAt: "2026-10-31T12:00:00.000Z",
    name: "לירון",
    phone: "0501234567",
    role: "owner",
    platform: "iphone",
    topic: "edit_code",
    message: "קוד עריכה לא נשמר",
    context: { appVersion: "5.4.71", path: "/edit" },
  };
  const text = formatHelpRequestPlain(record);
  assert.match(text, /לירון/);
  assert.match(text, /קוד עריכה לא נשמר/);
  assert.match(text, /0501234567/);
  assert.match(text, /5\.4\.71/);
});
