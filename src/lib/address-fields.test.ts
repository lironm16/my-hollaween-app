import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayAddressFromHit,
  addressAutocompleteLabel,
  footprintAddressHit,
  normalizeAddressFields,
  prepareAddressHit,
  prepareAddressHits,
  splitLegacyAddress,
  streetFromLegacyAddress,
} from "@/lib/address-fields";
import type { AddressHit } from "@/lib/types";
import { formatDisplayAddress, formatMapsAddress } from "@/lib/config";

describe("address fields", () => {
  it("splits legacy combined addresses", () => {
    const split = splitLegacyAddress("יהודית 15, חרוזים", 32.089223, 34.804374);
    assert.equal(split.street, "יהודית 15");
    assert.equal(split.neighborhood, "חרוזים");
  });

  it("keeps stored neighborhood on normalize", () => {
    const fields = normalizeAddressFields({
      address: "יהודית 15",
      neighborhood: "חרוזים",
      lat: 32.089223,
      lng: 34.804374,
    });
    assert.equal(fields.address, "יהודית 15");
    assert.equal(fields.neighborhood, "חרוזים");
  });

  it("does not override stored hood from pin zones", () => {
    const fields = normalizeAddressFields({
      address: "הזמיר 8",
      neighborhood: "נחלת גנים",
      lat: 32.0945618,
      lng: 34.816518,
    });
    assert.equal(fields.neighborhood, "נחלת גנים");
  });

  it("keeps stored hood outside zone polygons (איתמר 2)", () => {
    const fields = normalizeAddressFields({
      address: "איתמר 2",
      neighborhood: "חרוזים",
      lat: 32.09090420608,
      lng: 34.806805706959,
    });
    assert.equal(fields.neighborhood, "חרוזים");
  });

  it("keeps explicit אחר (null) on normalize", () => {
    const fields = normalizeAddressFields({
      address: "הדר 11",
      neighborhood: null,
      lat: 32.087930013467,
      lng: 34.812298032833,
    });
    assert.equal(fields.neighborhood, null);
  });

  it("joins street and neighborhood only for display", () => {
    const house = { address: "יהודית 15", neighborhood: "חרוזים" as const };
    assert.equal(formatDisplayAddress(house), "יהודית 15, חרוזים");
    assert.equal(formatMapsAddress(house), "יהודית 15, רמת גן");
  });

  it("formats pin/autocomplete as street only for the input field", () => {
    const hit: AddressHit = {
      id: "test-1",
      label: "יהודית 15, חרוזים",
      lat: 32.089223,
      lng: 34.804374,
      road: "יהודית",
      houseNumber: "15",
      suburb: "חרוזים",
      city: "רמת גן",
      precise: true,
    };
    assert.equal(displayAddressFromHit(hit), "יהודית 15");
  });

  it("strips neighborhood suffix from legacy street field on normalize", () => {
    const fields = normalizeAddressFields({
      address: "חרוזים 8, חרוזים",
      lat: 32.0916477,
      lng: 34.8028691,
    });
    assert.equal(fields.address, "חרוזים 8");
    assert.equal(fields.neighborhood, "חרוזים");
    assert.equal(streetFromLegacyAddress("חרוזים 8, חרוזים"), "חרוזים 8");
  });

  it("labels Bialik 37 with Ramat Gan when outside event neighborhoods", () => {
    const hit: AddressHit = {
      id: "way-bialik",
      label: "ביאליק, הגפן",
      lat: 32.0849863,
      lng: 34.8122928,
      road: "ביאליק",
      city: "רמת גן",
      precise: false,
    };
    assert.equal(addressAutocompleteLabel(hit, "ביאליק 37"), "ביאליק 37, רמת גן");
    assert.equal(prepareAddressHit(hit, "ביאליק 37")?.label, "ביאליק 37, רמת גן");
  });

  it("builds Jabotinsky 105 from footprint when geocoders miss", () => {
    for (const query of ["Zabutinsky 105", "ז'בוטינסקי 105", "זבוטינסקי 105"]) {
      const hit = footprintAddressHit(query);
      assert.ok(hit, query);
      assert.match(hit!.label, /105, רמת גן$/u);
    }
  });

  it("surfaces curated school names in address search", async () => {
    const { searchPreparedAddresses } = await import("@/lib/address-fields");
    const hits = await searchPreparedAddresses("ניצנים");
    assert.ok(hits.some((h) => h.label.includes("ביה״ס ניצנים")));
    assert.ok(hits[0]!.lat > 32 && hits[0]!.lng > 34);
  });

  it("snaps Jabotinsky 105 to footprint and dedupes autocomplete hits", () => {
    const wrongSide: AddressHit = {
      id: "p-1",
      label: "זאב ז'בוטינסקי 105, נחלת גנים",
      lat: 32.08918,
      lng: 34.8182,
      road: "זאב ז'בוטינסקי",
      houseNumber: "105",
      suburb: "נחלת גנים",
      city: "רמת גן",
      precise: true,
    };
    const plain: AddressHit = {
      id: "p-2",
      label: "ז'בוטינסקי 105",
      lat: 32.08918,
      lng: 34.8182,
      road: "ז'בוטינסקי",
      houseNumber: "105",
      city: "רמת גן",
      precise: true,
    };
    const prepared = prepareAddressHits([wrongSide, plain]);
    assert.equal(prepared.length, 1);
    assert.match(prepared[0]!.label, /105, רמת גן$/u);
    const single = prepareAddressHit(wrongSide);
    assert.ok(single);
    assert.equal(single!.lat, 32.08925);
    assert.equal(single!.lng, 34.81205);
  });
});
