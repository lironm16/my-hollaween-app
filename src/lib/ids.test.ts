import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseShareSlug, resolveHouseIdFromPath } from "@/lib/ids";

describe("houseShareSlug", () => {
  it("returns the numeric suffix for standard house ids", () => {
    assert.equal(houseShareSlug("בית-4948"), "4948");
  });

  it("decodes percent-encoded ids before extracting the suffix", () => {
    assert.equal(houseShareSlug("%D7%91%D7%99%D7%AA-4948"), "4948");
  });
});

describe("resolveHouseIdFromPath", () => {
  it("maps numeric path segments to catalog ids", () => {
    assert.equal(resolveHouseIdFromPath("4948"), "בית-4948");
  });

  it("keeps full ids from legacy share links", () => {
    assert.equal(resolveHouseIdFromPath("%D7%91%D7%99%D7%AA-4948"), "בית-4948");
  });
});
