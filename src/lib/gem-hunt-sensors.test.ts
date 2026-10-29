import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  prepareGemHuntSensors,
  revokeGemHuntCameraAcquire,
  stopGemHuntCameraStream,
} from "@/lib/gem-hunt-sensors";

describe("gem-hunt-sensors camera acquire", () => {
  it("prepareGemHuntSensors returns no camera after revoke during async gap", async () => {
    const original = globalThis.navigator;
    let resolveMedia!: (stream: MediaStream) => void;
    const pending = new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve;
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: () => pending,
        },
      },
    });

    try {
      const prepared = prepareGemHuntSensors({ requestCamera: true, requestOrientation: false });
      revokeGemHuntCameraAcquire();
      resolveMedia({
        getVideoTracks: () => [{ stop() {} }],
      } as unknown as MediaStream);
      const result = await prepared;
      assert.equal(result.camera, false);
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: original,
      });
      stopGemHuntCameraStream();
    }
  });
});
