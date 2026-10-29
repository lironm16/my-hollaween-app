import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localizedCustomOriginLabel,
  localizedReversePinOriginLabel,
  localizedRouteOriginLabel,
} from "@/lib/i18n/origin-copy";
import type { AddressHit } from "@/lib/types";

describe("origin-copy localization", () => {
  it("English map pin shows localized street while Hebrew keeps geocoder label", () => {
    const hit: AddressHit = {
      id: "x",
      label: "יהודית 15, רמת גן",
      road: "יהודית",
      houseNumber: "15",
      lat: 32.082,
      lng: 34.814,
      city: "רמת גן",
      precise: true,
    };
    assert.equal(localizedReversePinOriginLabel("he", hit), "יהודית 15, רמת גן");
    assert.equal(localizedReversePinOriginLabel("en", hit), "Yehudit St 15");
  });

  it("localizedRouteOriginLabel maps stored Hebrew custom addresses in English", () => {
    assert.equal(
      localizedRouteOriginLabel("en", "custom", "יהודית 15, חרוזים"),
      "Yehudit St 15, Charuzim",
    );
    assert.equal(
      localizedCustomOriginLabel("en", "יהודית 15, חרוזים"),
      "Yehudit St 15, Charuzim",
    );
  });
});
