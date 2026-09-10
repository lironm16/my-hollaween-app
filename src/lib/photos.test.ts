import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLitePhotoMode, isLocalPhotoUrl, parsePhotoUrl, shouldLoadHousePhoto } from "@/lib/photos";

describe("parsePhotoUrl", () => {
  it("accepts local stub and house photo paths", () => {
    assert.equal(parsePhotoUrl("/images/stubs/pumpkin-porch.jpg"), "/images/stubs/pumpkin-porch.jpg");
    assert.equal(parsePhotoUrl("/house-photos/abc.jpg"), "/house-photos/abc.jpg");
  });

  it("accepts https urls", () => {
    assert.equal(parsePhotoUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
  });

  it("rejects invalid urls", () => {
    assert.equal(parsePhotoUrl("not-a-url"), null);
  });
});

describe("shouldLoadHousePhoto", () => {
  it("always loads local photos", () => {
    assert.equal(shouldLoadHousePhoto("cache", "/images/stubs/pumpkin-porch.jpg"), true);
    assert.equal(shouldLoadHousePhoto("network", "/house-photos/abc.jpg?v=1"), true);
  });

  it("loads remote photos when not in lite mode", () => {
    assert.equal(
      shouldLoadHousePhoto("cache", "https://example.com/a.jpg"),
      !isLitePhotoMode(),
    );
  });
});

describe("isLocalPhotoUrl", () => {
  it("detects bundled image paths", () => {
    assert.equal(isLocalPhotoUrl("/images/banner.jpg"), true);
    assert.equal(isLocalPhotoUrl("https://example.com/a.jpg"), false);
  });
});
