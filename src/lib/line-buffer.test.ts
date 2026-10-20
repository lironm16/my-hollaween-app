import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bufferPolylineLngLat } from "@/lib/line-buffer";

describe("bufferPolylineLngLat", () => {
  it("returns a closed ring for a short segment", () => {
    const ring = bufferPolylineLngLat(
      [
        [34.81, 32.089],
        [34.812, 32.089],
      ],
      30,
    );
    assert.ok(ring);
    assert.equal(ring![0][0], ring!.at(-1)![0]);
    assert.equal(ring![0][1], ring!.at(-1)![1]);
    assert.ok(ring!.length >= 5);
  });
});
