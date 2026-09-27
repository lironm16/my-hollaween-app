import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHouseDeleted, isPubliclyListed, offersSensitivity, offersVegan } from "@/lib/house-state";
import type { TreatId } from "@/lib/types";

function house(treats: TreatId[]) {
  return { treats, treatStock: { candy: "plenty" as const } };
}

describe("soft delete listing", () => {
  it("treats deletedAt as off the public catalog", () => {
    const active = { id: "בית-1234", deletedAt: null };
    const removed = { id: "בית-5678", deletedAt: "2026-10-31T12:00:00.000Z" };
    assert.equal(isHouseDeleted(active), false);
    assert.equal(isPubliclyListed(active), true);
    assert.equal(isHouseDeleted(removed), true);
    assert.equal(isPubliclyListed(removed), false);
  });
});

describe("offersVegan", () => {
  it("is true when vegan is marked and candy is offered", () => {
    assert.equal(offersVegan(house(["candy", "vegan"])), true);
    assert.equal(offersSensitivity(house(["candy", "vegan"]), "vegan"), true);
  });

  it("is false when vegan is not marked", () => {
    assert.equal(offersVegan(house(["candy"])), false);
  });
});
