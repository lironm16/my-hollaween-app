import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginMapListOverlayCapture,
  endMapListOverlayCapture,
  isMapListOverlayCapture,
  isMapListSuspended,
  setMapListSuspended,
} from "@/lib/map-list-suspend";

describe("map-list-suspend", () => {
  it("toggles suspended flag", () => {
    setMapListSuspended(false);
    endMapListOverlayCapture();
    assert.equal(isMapListSuspended(), false);
    setMapListSuspended(true);
    assert.equal(isMapListSuspended(), true);
    setMapListSuspended(false);
    assert.equal(isMapListSuspended(), false);
  });

  it("overlay capture stacks", () => {
    setMapListSuspended(false);
    beginMapListOverlayCapture();
    assert.equal(isMapListOverlayCapture(), true);
    assert.equal(isMapListSuspended(), true);
    endMapListOverlayCapture();
    assert.equal(isMapListSuspended(), false);
  });
});
