import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

describe("gem anchor overrides", () => {
  const house = { id: "cal-house", lat: 32.0919, lng: 34.8112 };

  beforeEach(() => {
    const g = globalThis as typeof globalThis & {
      window?: typeof globalThis;
      localStorage?: Storage;
      dispatchEvent?: (e: Event) => boolean;
    };
    g.dispatchEvent = () => true;
    g.window = g as unknown as Window & typeof globalThis;
    g.localStorage = {
      store: {} as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
      removeItem(k: string) {
        delete this.store[k];
      },
      clear() {
        this.store = {};
      },
      key: () => null,
      length: 0,
    } as Storage;
  });

  afterEach(() => {
    const g = globalThis as { localStorage?: Storage; window?: unknown; dispatchEvent?: unknown };
    delete g.localStorage;
    delete g.window;
    delete g.dispatchEvent;
  });

  it("uses calibrated GPS when set", async () => {
    const { clearGemAnchorOverride, getGemAnchorOverride, setGemAnchorOverride } = await import(
      "@/lib/gem-anchor-overrides"
    );
    const { gemAnchorForHouse } = await import("@/lib/gem-hunt");

    setGemAnchorOverride(house.id, { lat: 32.0921, lng: 34.8115, accuracy: 6 });
    assert.ok(getGemAnchorOverride(house.id));
    const anchor = gemAnchorForHouse(house);
    assert.equal(anchor.calibrated, true);
    assert.equal(anchor.lat, 32.0921);

    clearGemAnchorOverride(house.id);
    assert.equal(getGemAnchorOverride(house.id), null);
    assert.equal(gemAnchorForHouse(house).calibrated, false);
  });

  it("clears all overrides at once", async () => {
    const {
      clearAllGemAnchorOverrides,
      countGemAnchorOverrides,
      setGemAnchorOverride,
    } = await import("@/lib/gem-anchor-overrides");

    setGemAnchorOverride("a", { lat: 1, lng: 2, accuracy: 5 });
    setGemAnchorOverride("b", { lat: 3, lng: 4, accuracy: 5 });
    assert.equal(countGemAnchorOverrides(), 2);
    clearAllGemAnchorOverrides();
    assert.equal(countGemAnchorOverrides(), 0);
  });
});
