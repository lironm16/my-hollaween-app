import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHomeUrlParams } from "@/hooks/use-home-url-params";

describe("parseHomeUrlParams", () => {
  it("reads a door QR visit link", () => {
    assert.deepEqual(parseHomeUrlParams("?focus=%D7%91%D7%99%D7%AA-1847&visit=1"), {
      focusId: "בית-1847",
      routeShareParam: null,
      gemHuntFromUrl: false,
      visitFromUrl: true,
    });
  });

  it("returns empty params for a bare home URL", () => {
    assert.deepEqual(parseHomeUrlParams(""), {
      focusId: null,
      routeShareParam: null,
      gemHuntFromUrl: false,
      visitFromUrl: false,
    });
  });
});
