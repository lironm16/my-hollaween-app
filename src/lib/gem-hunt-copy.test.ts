import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemFoundOnScreenBannerHe } from "@/lib/gem-hunt-copy";

describe("gemFoundOnScreenBannerHe", () => {
  it("includes pet name for new and repeat", () => {
    assert.equal(gemFoundOnScreenBannerHe(false, "לבי השועל", true), "מצאתם שדון חדש — לבי השועל!");
    assert.equal(gemFoundOnScreenBannerHe(true, "לבי השועל", false), "מצאת שוב את לבי השועל!");
  });
});
