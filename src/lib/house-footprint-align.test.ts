import assert from "node:assert/strict";
import test from "node:test";
import {
  alignPublicHouseCoords,
  osmFootprintForAddress,
} from "@/lib/house-footprint-align";

test("osmFootprintForAddress resolves יהודית 7", () => {
  const fp = osmFootprintForAddress("יהודית 7");
  assert.ok(fp);
  assert.ok(Math.abs(fp.lat - 32.0899146) < 0.000_01);
});

test("alignPublicHouseCoords snaps Esri-biased יהודית 7 to OSM building", () => {
  const aligned = alignPublicHouseCoords({
    address: "יהודית 7",
    lat: 32.090242,
    lng: 34.804782,
  });
  assert.ok(Math.abs(aligned.lat - 32.0899146) < 0.000_01);
  assert.ok(Math.abs(aligned.lng - 34.8047034) < 0.000_01);
});

test("alignPublicHouseCoords leaves pins already on the footprint", () => {
  const house = { address: "יהודית 15", lat: 32.089223, lng: 34.804374 };
  const aligned = alignPublicHouseCoords(house);
  assert.equal(aligned.lat, house.lat);
  assert.equal(aligned.lng, house.lng);
});
