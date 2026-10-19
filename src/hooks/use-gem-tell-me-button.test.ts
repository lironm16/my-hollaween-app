import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemTellMeReadyHighlight } from "@/hooks/use-gem-tell-me-button";

describe("gemTellMeReadyHighlight", () => {
  it("suppresses green during natural discover", () => {
    assert.equal(
      gemTellMeReadyHighlight({
        inRange: true,
        centerReveal: false,
        naturalDiscoverActive: true,
      }),
      false,
    );
  });

  it("allows green when in range and not discovering on camera", () => {
    assert.equal(
      gemTellMeReadyHighlight({
        inRange: true,
        centerReveal: false,
        naturalDiscoverActive: false,
      }),
      true,
    );
  });
});
