import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGemLabStub, nextGemLabStubId } from "@/lib/gem-lab-stubs";

describe("gem-lab-stubs", () => {
  it("allocates free rehearsal ids", () => {
    assert.equal(nextGemLabStubId(["בית-9316", "נק-9313"]), "נק-9314");
    assert.equal(nextGemLabStubId([]), "בית-9316");
  });

  it("builds stub houses with gem lab marker", () => {
    const house = buildGemLabStub({ id: "נק-9315", lat: 32.09, lng: 34.81 });
    assert.ok(house.description?.includes("שדון בדיקה"));
    assert.equal(house.visit, "come");
  });
});
