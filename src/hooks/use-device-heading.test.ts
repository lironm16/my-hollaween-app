import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDeviceCompassHeading } from "@/hooks/use-device-heading";

describe("readDeviceCompassHeading", () => {
  it("prefers iOS webkitCompassHeading", () => {
    const heading = readDeviceCompassHeading({
      webkitCompassHeading: 90,
    } as DeviceOrientationEvent & { webkitCompassHeading: number });
    assert.equal(heading, 90);
  });

  it("uses absolute alpha like Android compass (360 - alpha)", () => {
    const heading = readDeviceCompassHeading({
      absolute: true,
      alpha: 270,
    } as DeviceOrientationEvent);
    assert.equal(heading, 90);
  });

  it("ignores relative alpha without absolute flag", () => {
    const heading = readDeviceCompassHeading({
      absolute: false,
      alpha: 270,
    } as DeviceOrientationEvent);
    assert.equal(heading, null);
  });
});
