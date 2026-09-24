import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

describe("gem progress reset", () => {
  const key = "hw-gem-collected";

  beforeEach(() => {
    const stub = globalThis as {
      window?: typeof globalThis & { dispatchEvent?: (e: Event) => boolean };
      localStorage?: Storage;
    };
    stub.window = Object.assign(stub, {
      dispatchEvent: () => true,
    });
    stub.localStorage = {
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
    delete (globalThis as { localStorage?: Storage; window?: unknown }).localStorage;
    delete (globalThis as { window?: unknown }).window;
  });

  it("clears one house so it can be collected again", async () => {
    const { collectGem, resetGemProgress, isGemCollected } = await import("@/lib/gem-progress");
    collectGem({ houseId: "h1", gemType: "dragon" });
    collectGem({ houseId: "h2", gemType: "dragon" });
    assert.equal(isGemCollected("h1"), true);
    resetGemProgress({ houseId: "h1" });
    assert.equal(isGemCollected("h1"), false);
    assert.equal(isGemCollected("h2"), true);
  });

  it("clears all entries", async () => {
    const { collectGem, resetGemProgress, loadGemCollected } = await import("@/lib/gem-progress");
    collectGem({ houseId: "h1", gemType: "dragon" });
    resetGemProgress();
    assert.equal(loadGemCollected().length, 0);
    assert.equal(localStorage.getItem(key), null);
  });
});
