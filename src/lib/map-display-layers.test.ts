import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseMatchesMapLayers,
  houseVisibleOnMainMap,
  layersFromLegacyHouseSet,
  layersToLegacyHouseSet,
  readMapDisplayLayers,
  toggleMapDisplayLayer,
} from "@/lib/map-display-layers";

describe("map display layers", () => {
  it("migrates legacy house-set values", () => {
    assert.deepEqual(layersFromLegacyHouseSet("stubs"), {
      real: false,
      stubs: true,
      practice: false,
    });
    assert.deepEqual(layersFromLegacyHouseSet("all"), {
      real: true,
      stubs: true,
      practice: false,
    });
    assert.equal(layersToLegacyHouseSet({ real: true, stubs: true, practice: false }), "all");
  });

  it("matches houses to selected layers", () => {
    const real = { isStub: false, isPractice: false };
    const stub = { isStub: true, isPractice: false };
    const practice = { isStub: false, isPractice: true };
    const layers = { real: true, stubs: false, practice: true };
    assert.equal(houseMatchesMapLayers(real, layers), true);
    assert.equal(houseMatchesMapLayers(stub, layers), false);
    assert.equal(houseMatchesMapLayers(practice, layers), true);
  });

  it("keeps practice admin-only until public flag is on", () => {
    const practice = { isStub: false, isPractice: true };
    const layers = { real: false, stubs: false, practice: true };
    assert.equal(
      houseVisibleOnMainMap(practice, layers, { admin: false, practicePublic: false }),
      false,
    );
    assert.equal(
      houseVisibleOnMainMap(practice, layers, { admin: true, practicePublic: false }),
      true,
    );
  });

  it("never leaves all layers off when toggling", () => {
    const onlyReal = { real: true, stubs: false, practice: false };
    assert.deepEqual(toggleMapDisplayLayer(onlyReal, "real"), onlyReal);
  });

  it("returns a stable snapshot reference for useSyncExternalStore", () => {
    const a = readMapDisplayLayers();
    const b = readMapDisplayLayers();
    assert.equal(a, b);
  });
});
