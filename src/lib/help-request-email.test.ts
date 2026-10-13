import assert from "node:assert/strict";
import { test } from "node:test";
import { helpRequestNotifyEmails } from "./help-request-email";

test("helpRequestNotifyEmails parses comma-separated inboxes", () => {
  const prev = process.env.HELP_REQUEST_NOTIFY_EMAIL;
  process.env.HELP_REQUEST_NOTIFY_EMAIL = "a@x.com, b@y.com;";
  assert.deepEqual(helpRequestNotifyEmails(), ["a@x.com", "b@y.com"]);
  if (prev === undefined) delete process.env.HELP_REQUEST_NOTIFY_EMAIL;
  else process.env.HELP_REQUEST_NOTIFY_EMAIL = prev;
});
