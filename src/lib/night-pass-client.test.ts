import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminSeesAllHouses,
  catalogScopeMismatchesResponse,
  catalogUrls,
} from "@/lib/night-pass-client";

describe("catalogUrls", () => {
  it("never uses static catalog.json (live API respects night-pass toggle)", () => {
    const urls = catalogUrls({ enabled: false, viewer: "legacy", registered: false });
    assert.equal(urls.snapshot, "/api/catalog");
    assert.equal(urls.api, "/api/catalog");
  });
});

describe("catalogScopeMismatchesResponse", () => {
  it("flags when the server scoped catalog for public but this device still thinks pass", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: true, viewer: "pass", registered: true },
        "public",
      ),
      true,
    );
  });

  it("flags when night passes were turned on server-side but client is still legacy", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: false, viewer: "legacy", registered: false },
        "public",
      ),
      true,
    );
  });

  it("flags when night passes were turned off server-side but client still has pass mode", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: true, viewer: "public", registered: false },
        undefined,
      ),
      true,
    );
  });

  it("allows matching legacy mode (no scope on payload)", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: false, viewer: "legacy", registered: false },
        undefined,
      ),
      false,
    );
  });

  it("allows matching pass scope", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: true, viewer: "pass", registered: true },
        "pass",
      ),
      false,
    );
  });
});

describe("adminSeesAllHouses", () => {
  it("keeps the admin house list with night passes off", () => {
    assert.equal(adminSeesAllHouses(true, { enabled: false, viewer: "legacy" }), true);
  });

  it("keeps the admin house list for the admin viewer", () => {
    assert.equal(adminSeesAllHouses(true, { enabled: true, viewer: "admin" }), true);
  });

  it("drops it in תצוגת משתמש once night passes are on", () => {
    assert.equal(adminSeesAllHouses(true, { enabled: true, viewer: "public" }), false);
    assert.equal(adminSeesAllHouses(true, { enabled: true, viewer: "pass" }), false);
  });

  it("is never true for visitors", () => {
    assert.equal(adminSeesAllHouses(false, { enabled: false, viewer: "legacy" }), false);
  });
});
