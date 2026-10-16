import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseMatchesMapLayers,
  houseVisibleOnMainMap,
  layersFromLegacyHouseSet,
  layersToLegacyHouseSet,
  mapDisplayLayersForSession,
  readMapDisplayLayers,
  toggleMapDisplayLayer,
} from "@/lib/map-display-layers";

describe("map display layers", () => {
  it("migrates legacy house-set values", () => {
    assert.deepEqual(layersFromLegacyHouseSet("stubs"), {
      real: false,
      stubs: true,
    });
    assert.deepEqual(layersFromLegacyHouseSet("all"), {
      real: true,
      stubs: true,
    });
    assert.equal(layersToLegacyHouseSet({ real: true, stubs: true }), "all");
  });

  it("matches houses to selected layers", () => {
    const real = { isStub: false, isPractice: false };
    const stub = { isStub: true, isPractice: false };
    const practice = { isStub: false, isPractice: true };
    const layers = { real: true, stubs: false };
    assert.equal(houseMatchesMapLayers(real, layers), true);
    assert.equal(houseMatchesMapLayers(stub, layers), false);
    assert.equal(houseMatchesMapLayers(practice, layers), false);
  });

  it("never shows legacy practice houses on the map", () => {
    const practice = { isStub: false, isPractice: true };
    const layers = { real: true, stubs: false };
    assert.equal(houseVisibleOnMainMap(practice, layers), false);
  });

  it("never leaves all layers off when toggling", () => {
    const onlyReal = { real: true, stubs: false };
    assert.deepEqual(toggleMapDisplayLayer(onlyReal, "real"), onlyReal);
  });

  it("enables stub pins on preview when session filter includes stubs", () => {
    const layers = { real: true, stubs: false };
    const stubOnly = { houses: [{ id: "בית-1", isStub: true }] };
    assert.deepEqual(
      mapDisplayLayersForSession(layers, {
        previewDeployment: true,
        activeHouseSet: "all",
        catalog: stubOnly,
      }),
      { real: true, stubs: true },
    );
    assert.equal(
      mapDisplayLayersForSession(layers, {
        previewDeployment: false,
        activeHouseSet: "all",
        catalog: stubOnly,
      }),
      layers,
    );
  });

  it("keeps real-only map layers for visitors on stub-only preview catalog", () => {
    const layers = { real: true, stubs: false };
    const stubOnly = { houses: [{ id: "בית-1", isStub: true }] };
    assert.equal(
      mapDisplayLayersForSession(layers, {
        previewDeployment: true,
        activeHouseSet: "real",
        catalog: stubOnly,
      }),
      layers,
    );
  });

  it("returns a stable snapshot reference for useSyncExternalStore", () => {
    const a = readMapDisplayLayers();
    const b = readMapDisplayLayers();
    assert.equal(a, b);
  });
});
