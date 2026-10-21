import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  readAndroidGeoFix,
  resetAndroidGeoWatchForTests,
  subscribeAndroidGeo,
  type AndroidGeoFix,
} from "@/lib/android-geo-watch";

type Watch = {
  id: number;
  success: PositionCallback;
  error?: PositionErrorCallback | null;
  options?: PositionOptions;
};

class FakeGeolocation {
  watches = new Map<number, Watch>();
  watchCalls: PositionOptions[] = [];
  clearCalls = 0;
  getCurrentPositionCalls = 0;
  private nextId = 1;

  watchPosition(success: PositionCallback, error?: PositionErrorCallback | null, options?: PositionOptions) {
    const id = this.nextId++;
    this.watches.set(id, { id, success, error, options });
    this.watchCalls.push(options ?? {});
    return id;
  }

  clearWatch(id: number) {
    this.clearCalls += 1;
    this.watches.delete(id);
  }

  getCurrentPosition() {
    this.getCurrentPositionCalls += 1;
  }

  emit(lat: number, lng: number, timestamp = Date.now(), accuracy = 5) {
    for (const w of this.watches.values()) {
      w.success({
        timestamp,
        coords: { latitude: lat, longitude: lng, accuracy },
      } as GeolocationPosition);
    }
  }

  fail(code: number) {
    for (const w of this.watches.values()) {
      w.error?.({ code } as GeolocationPositionError);
    }
  }
}

let fake: FakeGeolocation;
const realNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

beforeEach(() => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"], now: 1_700_000_000_000 });
  fake = new FakeGeolocation();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130", geolocation: fake },
  });
  resetAndroidGeoWatchForTests();
});

afterEach(() => {
  resetAndroidGeoWatchForTests();
  mock.timers.reset();
  if (realNavigator) Object.defineProperty(globalThis, "navigator", realNavigator);
});

describe("android shared geo watch", () => {
  it("map + gem hunt share one high-accuracy watch and never poll", () => {
    const map: AndroidGeoFix[] = [];
    const hunt: AndroidGeoFix[] = [];
    subscribeAndroidGeo((f) => map.push(f));
    subscribeAndroidGeo((f) => hunt.push(f));
    assert.equal(fake.watches.size, 1);
    assert.equal(fake.getCurrentPositionCalls, 0);
    assert.equal(fake.watchCalls[0]?.enableHighAccuracy, true);
    assert.equal(fake.watchCalls[0]?.maximumAge, 0);
    assert.equal(fake.watchCalls[0]?.timeout, undefined);

    fake.emit(32.1, 34.8);
    mock.timers.tick(1_000);
    fake.emit(32.10002, 34.8);
    assert.deepEqual(
      map.map((f) => f.lat),
      [32.1, 32.10002],
    );
    assert.equal(hunt.length, 2);
  });

  it("standing still does not tear down or restart the watch", () => {
    subscribeAndroidGeo(() => {});
    for (let i = 0; i < 120; i += 1) {
      fake.emit(32.1, 34.8);
      mock.timers.tick(1_000);
    }
    assert.equal(fake.watchCalls.length, 1);
    assert.equal(fake.clearCalls, 0);
  });

  it("map → gem hunt hand-off keeps the same watch alive", () => {
    const unsubMap = subscribeAndroidGeo(() => {});
    unsubMap();
    mock.timers.tick(500);
    subscribeAndroidGeo(() => {});
    mock.timers.tick(10_000);
    assert.equal(fake.watchCalls.length, 1);
    assert.equal(fake.clearCalls, 0);
  });

  it("stops the watch after the last subscriber leaves", () => {
    const unsub = subscribeAndroidGeo(() => {});
    unsub();
    mock.timers.tick(10_000);
    assert.equal(fake.watches.size, 0);
  });

  it("restarts after a position-unavailable error", () => {
    subscribeAndroidGeo(() => {});
    fake.fail(2);
    mock.timers.tick(2_500);
    assert.equal(fake.watchCalls.length, 2);
    assert.equal(fake.watches.size, 1);
  });

  it("reports permission denied to subscribers", () => {
    let denied = false;
    subscribeAndroidGeo(
      () => {},
      () => {
        denied = true;
      },
    );
    fake.fail(1);
    assert.equal(denied, true);
    assert.equal(fake.watches.size, 0);
  });

  it("restarts only after a long silence", () => {
    subscribeAndroidGeo(() => {});
    mock.timers.tick(25_000);
    assert.equal(fake.watchCalls.length, 1);
    mock.timers.tick(15_000);
    assert.equal(fake.watchCalls.length, 2);
  });

  it("readAndroidGeoFix resolves on the next callback even if coords are unchanged", async () => {
    subscribeAndroidGeo(() => {});
    fake.emit(32.1, 34.8);
    mock.timers.tick(10_000);
    const pending = readAndroidGeoFix(15_000);
    fake.emit(32.1, 34.8);
    const fix = await pending;
    assert.ok(fix && fix !== "denied");
    assert.equal(fix.lat, 32.1);
    assert.equal(fake.getCurrentPositionCalls, 0);
  });
});
