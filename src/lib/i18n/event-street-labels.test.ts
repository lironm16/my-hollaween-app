import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizedStreetLine, localizedStreetName } from "@/lib/i18n/event-street-labels";

describe("localizedStreetLine", () => {
  it("maps Hebrew street + number to English when locale is en", () => {
    assert.equal(localizedStreetLine("en", "יהודית 15"), "Yehudit St 15");
    assert.equal(localizedStreetLine("en", "חרוזים 8"), "Charuzim St 8");
  });

  it("keeps Hebrew when locale is he", () => {
    assert.equal(localizedStreetLine("he", "יהודית 15"), "יהודית 15");
  });

  it("maps Shoshanim and OSM footprint variants", () => {
    assert.equal(localizedStreetLine("en", "שדרות השושנים 8"), "Sderot HaShoshanim 8");
    assert.equal(localizedStreetName("en", "השקדיה"), "HaShkediya St");
    assert.equal(localizedStreetName("en", "זבוטינסקי"), "Jabotinsky St");
  });
});
