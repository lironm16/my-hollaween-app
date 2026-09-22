import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offersSensitivity, offersVegan } from "@/lib/house-state";
import type { TreatId } from "@/lib/types";

function house(treats: TreatId[]) {
  return { treats, treatStock: { candy: "plenty" as const } };
}

describe("offersVegan", () => {
  it("is true when vegan is marked and candy is offered", () => {
    assert.equal(offersVegan(house(["candy", "vegan"])), true);
    assert.equal(offersSensitivity(house(["candy", "vegan"]), "vegan"), true);
  });

  it("is false when vegan is not marked", () => {
    assert.equal(offersVegan(house(["candy"])), false);
  });
});
