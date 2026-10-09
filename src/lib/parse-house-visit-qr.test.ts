import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseVisitPathFromQrPayload, parseHouseVisitQrPayload } from "@/lib/parse-house-visit-qr";

const ORIGIN = "https://my-hollaween-app.vercel.app";

describe("parseHouseVisitQrPayload", () => {
  it("accepts a full visit URL", () => {
    assert.deepEqual(
      parseHouseVisitQrPayload(`${ORIGIN}/?focus=%D7%91%D7%99%D7%AA-1847&visit=1`, ORIGIN),
      { focusId: "בית-1847" },
    );
  });

  it("accepts a relative visit path", () => {
    assert.deepEqual(parseHouseVisitQrPayload("/?focus=בית-1848&visit=1", ORIGIN), { focusId: "בית-1848" });
  });

  it("rejects links without visit=1", () => {
    assert.equal(parseHouseVisitQrPayload(`${ORIGIN}/?focus=בית-1847`, ORIGIN), null);
  });

  it("rejects non-home paths", () => {
    assert.equal(parseHouseVisitQrPayload(`${ORIGIN}/house/בית-1847?visit=1`, ORIGIN), null);
  });

  it("builds an in-app navigation path", () => {
    assert.equal(
      houseVisitPathFromQrPayload(`${ORIGIN}/?focus=בית-1849&visit=1`, ORIGIN),
      "/?focus=%D7%91%D7%99%D7%AA-1849&visit=1",
    );
  });
});
