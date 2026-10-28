import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pinHoursBadgeHtml } from "@/lib/pin-hours-badge";

describe("pinHoursBadgeHtml", () => {
  it("renders clock badge in pin-status slot", () => {
    const html = pinHoursBadgeHtml("opening", "Opening soon");
    assert.match(html, /pin-status pin-hours-badge is-opening/);
    assert.doesNotMatch(html, /pin-hours-ring/);
    assert.doesNotMatch(html, /<svg/);
  });
});
