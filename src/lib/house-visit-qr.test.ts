import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOUSE_VISIT_QUERY,
  houseVisitQrUrl,
  houseVisitSearchParams,
  parseVisitFromSearchParams,
} from "@/lib/house-visit-qr";
import type { PublicHouse } from "@/lib/types";

const house = { id: "בית-1234" } as PublicHouse;

describe("houseVisitQrUrl", () => {
  it("builds focus + visit query", () => {
    assert.deepEqual(houseVisitSearchParams(house.id), {
      focus: "בית-1234",
      [HOUSE_VISIT_QUERY]: "1",
    });
    const url = houseVisitQrUrl(house, "https://example.com");
    assert.equal(url, "https://example.com/?focus=%D7%91%D7%99%D7%AA-1234&visit=1");
  });
});

describe("parseVisitFromSearchParams", () => {
  it("accepts visit=1 and visit=true", () => {
    assert.equal(parseVisitFromSearchParams(new URLSearchParams("visit=1")), true);
    assert.equal(parseVisitFromSearchParams(new URLSearchParams("visit=true")), true);
    assert.equal(parseVisitFromSearchParams({ visit: "1" }), true);
    assert.equal(parseVisitFromSearchParams(new URLSearchParams("visit=0")), false);
    assert.equal(parseVisitFromSearchParams({}), false);
  });
});
